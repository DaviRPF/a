import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import dotenv from 'dotenv';
import { GoogleSERP } from 'serp-parser';

dotenv.config();

puppeteer.use(StealthPlugin());

if (process.env.TWOCAPTCHA_TOKEN) {
    puppeteer.use(
        RecaptchaPlugin({
            provider: {
                id: '2captcha',
                token: process.env.TWOCAPTCHA_TOKEN
            },
            visualFeedback: true
        })
    );
}

let browser = null;
let page = null;

// Inicializar navegador
async function initBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });
    }
    return browser;
}

// Delay helper
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Resolver captcha se necessário
async function solveCaptchaIfNeeded() {
    try {
        const hasCaptcha = await page.$('iframe[src*="recaptcha"]');
        if (hasCaptcha) {
            console.log('🔒 Captcha detectado, resolvendo...');
            await page.solveRecaptchas();
            await delay(3000);
            console.log('✅ Captcha resolvido');
        }
    } catch (error) {
        console.log('⚠️ Não foi possível resolver captcha automaticamente');
    }
}

// Buscar no Google e clicar no link correto
async function searchAndClickLink(companyName, city, siteName, domain) {
    try {
        const searchQuery = `${companyName} ${city} ${siteName}`;
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

        console.log(`🔍 Buscando: ${searchQuery}`);
        await page.goto(googleUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(2000);

        // Resolver captcha se aparecer
        await solveCaptchaIfNeeded();

        // Procurar link com o domínio correto nos resultados usando serp-parser
        console.log(`🔎 Procurando link do domínio: ${domain}`);

        // Usar serp-parser para extrair resultados
        const html = await page.content();
        const serp = new GoogleSERP(html);
        const serpResults = serp.serp;

        let targetUrl = null;

        // Procurar nos resultados orgânicos
        if (serpResults.organic) {
            for (const result of serpResults.organic) {
                if (result.url && result.url.includes(domain)) {
                    targetUrl = result.url;
                    console.log(`✓ Link encontrado com serp-parser: ${targetUrl}`);
                    break;
                }
            }
        }

        // Se não encontrou, tentar fallback manual (caso serp-parser falhe)
        if (!targetUrl) {
            console.log('⚠️ Serp-parser não encontrou, usando fallback...');
            targetUrl = await page.evaluate((targetDomain) => {
                const allLinks = document.querySelectorAll('#search a[href], #rso a[href]');

                for (const link of allLinks) {
                    const href = link.href;

                    if (href &&
                        href.includes(targetDomain) &&
                        !href.includes('google.com') &&
                        !href.includes('youtube.com') &&
                        !href.includes('translate.google') &&
                        !href.includes('webcache.google')) {
                        console.log('✓ Link encontrado (fallback):', href);
                        return href;
                    }
                }

                return null;
            }, domain);
        }

        if (!targetUrl) {
            console.log(`❌ Nenhum link do ${siteName} encontrado`);
            return null;
        }

        console.log(`✅ Link encontrado: ${targetUrl}`);
        console.log(`🖱️ Navegando para: ${targetUrl}`);

        // NAVEGAR DIRETAMENTE para o URL encontrado
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(3000);

        console.log(`📄 Página carregada: ${page.url()}`);

        return { success: true, url: page.url() };

    } catch (error) {
        console.error(`❌ Erro ao buscar ${siteName}:`, error.message);
        return null;
    }
}

// Extrair texto da página atual
async function extractPageText() {
    try {
        const pageText = await page.evaluate(() => {
            return document.body.innerText;
        });
        return pageText;
    } catch (error) {
        console.error('❌ Erro ao extrair texto da página:', error.message);
        return '';
    }
}

// Usar IA para extrair dados estruturados do texto da página
async function extractDataWithAI(pageText, companyName, genAI, geminiModel) {
    try {
        const model = genAI.getGenerativeModel({ model: geminiModel });

        const prompt = `Você é um assistente que extrai dados empresariais de texto.

EMPRESA: ${companyName}

TEXTO DA PÁGINA:
${pageText.substring(0, 10000)}

TAREFA: Extraia as seguintes informações:
1. CNPJ (formato: XX.XXX.XXX/XXXX-XX)
2. Capital Social (valor em R$, exemplo: "R$ 50.000,00")
3. Porte (MEI, ME, EPP, Médio, Grande)
4. Sócios/Administradores (nomes completos das pessoas)

IMPORTANTE:
- Se não encontrar um dado, deixe vazio
- CNPJ deve estar no formato correto com pontuação
- Capital Social deve incluir R$ e valor formatado
- Sócios devem ser nomes de pessoas (não tipos societários)

RETORNE APENAS JSON:
{
  "cnpj": "XX.XXX.XXX/XXXX-XX ou vazio",
  "capitalSocial": "valor ou vazio",
  "porte": "tipo ou vazio",
  "socios": "nome1, nome2 ou vazio"
}`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let aiText = response.text().trim();

        // Remover markdown code blocks se houver
        aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const data = JSON.parse(aiText);
        return data;

    } catch (error) {
        console.error('❌ Erro ao extrair dados com IA:', error.message);
        return {
            cnpj: '',
            capitalSocial: '',
            porte: '',
            socios: ''
        };
    }
}

// Buscar dados no Econodata
async function searchEconodata(companyName, city, genAI, geminiModel) {
    try {
        console.log('\n📊 ETAPA 1: Buscando no Econodata...');

        const result = await searchAndClickLink(companyName, city, 'econodata', 'econodata.com.br');

        if (!result || !result.success) {
            console.log('⚠️ Não encontrou link do Econodata');
            return null;
        }

        // Extrair texto da página
        const pageText = await extractPageText();

        if (!pageText) {
            console.log('⚠️ Não conseguiu extrair texto da página');
            return null;
        }

        // Usar IA para extrair dados estruturados
        console.log('🤖 Extraindo dados com IA...');
        const data = await extractDataWithAI(pageText, companyName, genAI, geminiModel);

        if (data.cnpj) {
            console.log('✅ Dados encontrados no Econodata!');
            return {
                ...data,
                url: result.url,
                fonte: 'Econodata'
            };
        }

        console.log('⚠️ CNPJ não encontrado no Econodata');
        return null;

    } catch (error) {
        console.error('❌ Erro no Econodata:', error.message);
        return null;
    }
}

// Buscar dados no CNPJBiz
async function searchCNPJBiz(companyName, city, genAI, geminiModel) {
    try {
        console.log('\n📊 ETAPA 2: Buscando no CNPJBiz...');

        const result = await searchAndClickLink(companyName, city, 'cnpjbiz', 'cnpj.biz');

        if (!result || !result.success) {
            console.log('⚠️ Não encontrou link do CNPJBiz');
            return null;
        }

        // Extrair texto da página
        const pageText = await extractPageText();

        if (!pageText) {
            console.log('⚠️ Não conseguiu extrair texto da página');
            return null;
        }

        // Usar IA para extrair dados estruturados
        console.log('🤖 Extraindo dados com IA...');
        const data = await extractDataWithAI(pageText, companyName, genAI, geminiModel);

        if (data.cnpj || data.capitalSocial || data.porte) {
            console.log('✅ Dados encontrados no CNPJBiz!');
            return {
                ...data,
                url: result.url,
                fonte: 'CNPJBiz'
            };
        }

        console.log('⚠️ Dados não encontrados no CNPJBiz');
        return null;

    } catch (error) {
        console.error('❌ Erro no CNPJBiz:', error.message);
        return null;
    }
}

// Verificar Google Meu Negócio
async function checkGoogleMyBusiness(companyName, city, genAI, geminiModel) {
    try {
        console.log('\n📍 ETAPA 3: Verificando Google Meu Negócio...');

        const searchQuery = `${companyName} ${city}`;
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

        console.log(`🔍 Buscando: ${searchQuery}`);
        await page.goto(googleUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(3000);

        // Verificar se tem Knowledge Panel (Google Meu Negócio)
        const hasKnowledgePanel = await page.evaluate(() => {
            // Seletores específicos do Knowledge Panel / Local Pack
            const selectors = [
                // Knowledge Panel principal
                '[data-attrid="kc:/local:one box"]',
                '.kp-wholepage',
                '[data-attrid*="kc:/location"]',

                // Local Pack (card lateral direito)
                '[jsname="pubmh"]',
                '.cu-container',
                '[data-attrid="kc:/local:place"]',

                // Informações de local/negócio
                '[class*="knowledge"]',
                '[data-attrid*="kc:"]',
                '.mod[data-md]',

                // Novos seletores (estrutura atual do Google)
                '#rhs_block [data-attrid]',
                '.knowledge-panel',
                '[aria-label*="lugar"]',
                '[aria-label*="business"]'
            ];

            // Tentar cada seletor
            for (const selector of selectors) {
                try {
                    const element = document.querySelector(selector);
                    if (element && element.innerText.length > 100) {
                        console.log('✓ Knowledge Panel encontrado (seletor:', selector, ')');
                        return {
                            hasPanel: true,
                            text: element.innerText,
                            selector: selector
                        };
                    }
                } catch (e) {
                    continue;
                }
            }

            // Fallback: procurar por elementos com muito texto no lado direito
            const rhsContent = document.querySelector('#rhs, #rhs_block');
            if (rhsContent && rhsContent.innerText.length > 200) {
                console.log('✓ Conteúdo do lado direito encontrado (possível Knowledge Panel)');
                return {
                    hasPanel: true,
                    text: rhsContent.innerText,
                    selector: 'fallback-rhs'
                };
            }

            return { hasPanel: false };
        });

        if (!hasKnowledgePanel.hasPanel) {
            console.log('❌ Não encontrou Knowledge Panel');
            return { hasGMB: false };
        }

        console.log('📄 Knowledge Panel encontrado, verificando com IA...');

        // Usar IA para validar se é o estabelecimento correto
        const model = genAI.getGenerativeModel({ model: geminiModel });
        const prompt = `Determine se este Knowledge Panel é do estabelecimento correto.

ESTABELECIMENTO PROCURADO: ${companyName}
CIDADE: ${city}

CONTEÚDO DO KNOWLEDGE PANEL:
${hasKnowledgePanel.text.substring(0, 2000)}

TAREFA: Verifique se este Knowledge Panel é realmente do estabelecimento "${companyName}" em "${city}".

RETORNE APENAS JSON:
{
  "isCorrect": true ou false,
  "confidence": "alta", "média" ou "baixa",
  "reason": "breve explicação"
}`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let aiText = response.text().trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const analysis = JSON.parse(aiText);

        if (analysis.isCorrect) {
            console.log(`✅ Google Meu Negócio confirmado! (${analysis.confidence})`);
            return {
                hasGMB: true,
                gmbUrl: googleUrl,
                confidence: analysis.confidence
            };
        }

        console.log(`❌ Knowledge Panel não é do estabelecimento: ${analysis.reason}`);
        return { hasGMB: false, reason: analysis.reason };

    } catch (error) {
        console.error('❌ Erro ao verificar GMB:', error.message);
        return { hasGMB: false };
    }
}

// Função principal de aperfeiçoamento
export async function enhanceProspectData(prospect, genAI, geminiModel) {
    try {
        await initBrowser();

        if (!page || page.isClosed()) {
            page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
        }

        const companyName = prospect.data.nome || 'Estabelecimento';
        const city = prospect.data.cidade || '';

        console.log(`\n🔄 Aperfeiçoando: ${companyName} (${city})`);

        let enhancement = {
            cnpj: '',
            capitalSocial: '',
            porte: '',
            socios: '',
            fonte: 'Não encontrado',
            fonteUrl: '',
            googleMeuNegocio: 'Não',
            googleMeuNegocioUrl: ''
        };

        // ETAPA 1: Tentar Econodata
        const econodataData = await searchEconodata(companyName, city, genAI, geminiModel);

        if (econodataData && econodataData.cnpj) {
            // Encontrou no Econodata
            enhancement = {
                cnpj: econodataData.cnpj,
                capitalSocial: econodataData.capitalSocial || '',
                porte: econodataData.porte || '',
                socios: econodataData.socios || '',
                fonte: 'Econodata',
                fonteUrl: econodataData.url,
                googleMeuNegocio: 'Não',
                googleMeuNegocioUrl: ''
            };

            console.log('✅ CNPJ encontrado no Econodata');
        } else {
            // ETAPA 2: Tentar CNPJBiz
            console.log('⚠️ CNPJ não encontrado no Econodata, tentando CNPJBiz...');

            const cnpjbizData = await searchCNPJBiz(companyName, city, genAI, geminiModel);

            if (cnpjbizData && (cnpjbizData.cnpj || cnpjbizData.capitalSocial)) {
                enhancement = {
                    cnpj: cnpjbizData.cnpj || '',
                    capitalSocial: cnpjbizData.capitalSocial || '',
                    porte: cnpjbizData.porte || '',
                    socios: cnpjbizData.socios || '',
                    fonte: 'CNPJBiz',
                    fonteUrl: cnpjbizData.url,
                    googleMeuNegocio: 'Não',
                    googleMeuNegocioUrl: ''
                };

                console.log('✅ Dados encontrados no CNPJBiz');
            } else {
                console.log('❌ CNPJ não encontrado em nenhuma fonte');
            }
        }

        // ETAPA 3: Verificar Google Meu Negócio
        const gmbResult = await checkGoogleMyBusiness(companyName, city, genAI, geminiModel);

        if (gmbResult.hasGMB) {
            enhancement.googleMeuNegocio = 'Sim';
            enhancement.googleMeuNegocioUrl = gmbResult.gmbUrl;
        }

        console.log(`\n✅ Aperfeiçoamento concluído para ${companyName}`);
        console.log('Resultado:', enhancement);

        return enhancement;

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
            error: error.message
        };
    }
}

// Fechar navegador
export async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
        page = null;
    }
}
