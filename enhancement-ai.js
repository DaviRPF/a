import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Configurar Google Custom Search
const customsearch = google.customsearch('v1');
const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

// Definição das ferramentas (tools) para o Gemini
const searchTools = [
    {
        functionDeclarations: [
            {
                name: 'google_search',
                description: 'Busca informações no Google. Use esta ferramenta para encontrar dados sobre empresas, CNPJs, capital social, sócios, etc.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'A consulta de busca no Google. Seja específico e inclua nome da empresa, cidade e o tipo de informação que procura.'
                        },
                        numResults: {
                            type: 'integer',
                            description: 'Número de resultados a retornar (1-10)',
                            default: 5
                        }
                    },
                    required: ['query']
                }
            },
            {
                name: 'extract_company_data',
                description: 'Extrai dados estruturados de informações textuais sobre uma empresa. Use após buscar informações.',
                parameters: {
                    type: 'object',
                    properties: {
                        text: {
                            type: 'string',
                            description: 'O texto contendo informações sobre a empresa'
                        },
                        companyName: {
                            type: 'string',
                            description: 'Nome da empresa para validação'
                        }
                    },
                    required: ['text', 'companyName']
                }
            }
        ]
    }
];

// Função para executar busca no Google usando Custom Search API
async function executeGoogleSearch(query, numResults = 5) {
    if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
        console.log('⚠️ Google Custom Search não configurado. Configure GOOGLE_SEARCH_API_KEY e GOOGLE_SEARCH_ENGINE_ID no .env');
        return {
            error: 'Google Custom Search API não configurada',
            results: []
        };
    }

    try {
        console.log(`🔍 Buscando no Google: ${query}`);

        const response = await customsearch.cse.list({
            auth: GOOGLE_API_KEY,
            cx: SEARCH_ENGINE_ID,
            q: query,
            num: Math.min(numResults, 10)
        });

        const results = response.data.items || [];

        console.log(`📄 Encontrados ${results.length} resultados`);

        return {
            query: query,
            totalResults: response.data.searchInformation?.totalResults || 0,
            results: results.map(item => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet,
                displayLink: item.displayLink
            }))
        };
    } catch (error) {
        console.error('❌ Erro ao buscar no Google:', error.message);
        return {
            error: error.message,
            results: []
        };
    }
}

// Função para executar as chamadas de ferramentas
async function executeFunctionCall(functionCall) {
    const { name, args } = functionCall;

    switch (name) {
        case 'google_search':
            return await executeGoogleSearch(args.query, args.numResults || 5);

        case 'extract_company_data':
            // Esta função é apenas para o Gemini estruturar sua resposta
            // Retornamos os dados como estão para o modelo processar
            return {
                status: 'ready_to_extract',
                text: args.text,
                companyName: args.companyName
            };

        default:
            return { error: `Função desconhecida: ${name}` };
    }
}

// Função principal para aperfeiçoar dados de um prospect usando Tool Calling
export async function enhanceProspectWithAI(prospect, genAI, modelName) {
    try {
        if (!genAI) {
            throw new Error('Gemini AI não configurado');
        }

        const companyName = prospect.data.nome || 'Estabelecimento';
        const city = prospect.data.cidade || '';
        const businessType = prospect.data.tipoEstabelecimento || '';

        console.log(`\n🔄 Aperfeiçoando: ${companyName} (${city})`);

        // Configurar modelo com tools
        const model = genAI.getGenerativeModel({
            model: modelName,
            tools: searchTools
        });

        // Prompt inicial para o Gemini - MUITO ESPECÍFICO
        const prompt = `Você é um assistente que busca dados empresariais EXATAMENTE como especificado.

EMPRESA: ${companyName}
CIDADE: ${city}
TIPO: ${businessType}

PROCESSO OBRIGATÓRIO (SIGA EXATAMENTE):

ETAPA 1 - BUSCAR NO ECONODATA:
1. Use google_search com query: "${companyName} ${city} econodata"
2. Analise os resultados e procure por links do site econodata.com.br
3. Se encontrar link relevante do Econodata sobre esta empresa, pegue o snippet/descrição
4. Do snippet, extraia: CNPJ, Capital Social, Porte (MEI/ME/EPP), Sócios/Administradores

ETAPA 2 - SE NÃO ACHOU CNPJ NO ECONODATA, BUSCAR NO CNPJBIZ:
1. Se não conseguiu o CNPJ na etapa 1, use google_search com query: "${companyName} ${city} cnpjbiz"
2. Procure por links do site cnpj.biz
3. Se encontrar, pegue o snippet/descrição
4. Extraia: CNPJ, Capital Social, Porte, Sócios/Administradores

ETAPA 3 - VERIFICAR GOOGLE MEU NEGÓCIO:
1. Use google_search com query: "${companyName} ${city}"
2. Analise se nos resultados aparece um Knowledge Panel (painel lateral direito) com informações da empresa
3. Se aparecer Knowledge Panel com dados da empresa (endereço, telefone, horários), significa que TEM Google Meu Negócio
4. Guarde a URL dessa busca

DADOS A EXTRAIR:
- CNPJ: formato XX.XXX.XXX/XXXX-XX
- Capital Social: valor em R$ (exemplo: "R$ 50.000,00")
- Porte: MEI, ME, EPP, Médio, Grande
- Sócios: nomes completos das pessoas (exemplo: "João Silva, Maria Santos")

IMPORTANTE:
- Priorize Econodata > CNPJBiz
- Se não encontrar um dado, deixe vazio (não invente)
- Marque a fonte de onde tirou os dados (Econodata ou CNPJBiz)
- Para GMB, só marque "Sim" se realmente aparecer Knowledge Panel

RETORNE JSON:
{
  "cnpj": "XX.XXX.XXX/XXXX-XX ou vazio",
  "capitalSocial": "valor ou vazio",
  "porte": "MEI/ME/EPP/etc ou vazio",
  "socios": "nome1, nome2 ou vazio",
  "fonte": "Econodata ou CNPJBiz ou Não encontrado",
  "fonteUrl": "URL exata do resultado (link do Econodata/CNPJBiz) ou vazio",
  "googleMeuNegocio": "Sim ou Não",
  "googleMeuNegocioUrl": "https://www.google.com/search?q=... ou vazio",
  "confianca": "alta, média ou baixa"
}`;

        // Iniciar chat com o modelo
        const chat = model.startChat({
            history: []
        });

        let result = await chat.sendMessage(prompt);
        let response = result.response;

        // Loop de tool calling
        let iterationCount = 0;
        const maxIterations = 10;

        while (response.functionCalls && iterationCount < maxIterations) {
            iterationCount++;
            console.log(`🔧 Iteração ${iterationCount}: ${response.functionCalls.length} chamada(s) de ferramenta`);

            const functionResponses = [];

            // Executar todas as chamadas de função
            for (const functionCall of response.functionCalls) {
                console.log(`   📞 Chamando: ${functionCall.name}`);
                console.log(`   📝 Args:`, JSON.stringify(functionCall.args, null, 2));

                const functionResponse = await executeFunctionCall(functionCall);

                functionResponses.push({
                    functionResponse: {
                        name: functionCall.name,
                        response: functionResponse
                    }
                });

                console.log(`   ✅ Resposta:`, JSON.stringify(functionResponse, null, 2).substring(0, 200) + '...');
            }

            // Enviar respostas das funções de volta para o modelo
            result = await chat.sendMessage(functionResponses);
            response = result.response;
        }

        // Obter resposta final do modelo
        const finalText = response.text();
        console.log(`📝 Resposta final do Gemini:`, finalText.substring(0, 300) + '...');

        // Extrair JSON da resposta
        let enhancementData = {};

        // Tentar encontrar JSON na resposta
        const jsonMatch = finalText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                enhancementData = JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.error('❌ Erro ao parsear JSON da resposta:', e.message);

                // Fallback: criar objeto vazio
                enhancementData = {
                    cnpj: '',
                    capitalSocial: '',
                    porte: '',
                    socios: '',
                    fonte: 'Não encontrado',
                    fonteUrl: '',
                    googleMeuNegocio: 'Não',
                    googleMeuNegocioUrl: '',
                    confianca: 'baixa'
                };
            }
        } else {
            console.log('⚠️ Nenhum JSON encontrado na resposta');
            enhancementData = {
                cnpj: '',
                capitalSocial: '',
                porte: '',
                socios: '',
                fonte: 'Não encontrado',
                fonteUrl: '',
                googleMeuNegocio: 'Não',
                googleMeuNegocioUrl: '',
                confianca: 'baixa'
            };
        }

        console.log(`✅ Dados extraídos:`, enhancementData);

        return enhancementData;

    } catch (error) {
        console.error(`❌ Erro ao aperfeiçoar prospect:`, error.message);
        return {
            cnpj: '',
            capitalSocial: '',
            porte: '',
            socios: '',
            fonte: 'Erro',
            fonteUrl: '',
            googleMeuNegocio: 'Não',
            googleMeuNegocioUrl: '',
            confianca: 'baixa',
            error: error.message
        };
    }
}
