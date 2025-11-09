import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Forçar carregamento do .env com caminho explícito
const envPath = path.join(__dirname, '.env');
console.log('🔍 Debug - Tentando carregar .env de:', envPath);
console.log('🔍 Debug - Arquivo .env existe?', fs.existsSync(envPath) ? 'SIM' : 'NÃO');

const result = dotenv.config({ path: envPath });
if (result.error) {
    console.log('❌ Erro ao carregar .env:', result.error.message);
} else {
    console.log('✅ Arquivo .env carregado com sucesso');
}

// Debug: Verificar se variáveis de ambiente foram carregadas
console.log('🔍 Debug - TWOCAPTCHA_TOKEN:', process.env.TWOCAPTCHA_TOKEN ? '***CONFIGURADO***' : 'NÃO ENCONTRADO');
console.log('🔍 Debug - GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '***CONFIGURADO***' : 'NÃO ENCONTRADO');

// Configurar plugins do Puppeteer
puppeteer.use(StealthPlugin());

// Configurar plugin de recaptcha com 2captcha
if (process.env.TWOCAPTCHA_TOKEN) {
    console.log('✅ 2Captcha configurado! Token detectado.');
    puppeteer.use(
        RecaptchaPlugin({
            provider: {
                id: '2captcha',
                token: process.env.TWOCAPTCHA_TOKEN
            },
            visualFeedback: true // Mostra o processo de resolução
        })
    );
} else {
    console.log('⚠️ 2Captcha NÃO configurado. Configure TWOCAPTCHA_TOKEN no arquivo .env');
}

const COOKIES_FILE = path.join(__dirname, 'instagram-cookies.json');

let browser = null;
let page = null;

// Helper para substituir waitForTimeout (que foi depreciado)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para verificar se o browser está ativo
async function isBrowserActive() {
    if (!browser) return false;

    try {
        await browser.version();
        return true;
    } catch {
        browser = null;
        page = null;
        return false;
    }
}

// Função para inicializar o navegador
export async function initBrowser() {
    // Verificar se browser existente ainda está ativo
    if (browser && await isBrowserActive()) {
        return browser;
    }

    // Se não está ativo, resetar e criar novo
    browser = null;
    page = null;

    browser = await puppeteer.launch({
        headless: false, // Visível para fazer login
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,720'
        ]
    });

    // Adicionar listener para quando o browser for fechado
    browser.on('disconnected', () => {
        console.log('Navegador foi fechado');
        browser = null;
        page = null;
    });

    return browser;
}

// Função para fazer login no Instagram
export async function loginInstagram(username, password) {
    try {
        const browser = await initBrowser();

        // Criar nova página se não existir ou se foi fechada
        if (!page || page.isClosed()) {
            page = await browser.newPage();
        }

        // Tentar carregar cookies salvos
        if (fs.existsSync(COOKIES_FILE)) {
            const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
            await page.setCookie(...cookies);
        }

        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

        // Verificar se já está logado
        await delay(2000);
        const isLoggedIn = await page.evaluate(() => {
            return !document.querySelector('input[name="username"]');
        });

        if (isLoggedIn) {
            return { success: true, message: 'Já está logado' };
        }

        // Fazer login se necessário
        if (username && password) {
            await page.type('input[name="username"]', username, { delay: 100 });
            await page.type('input[name="password"]', password, { delay: 100 });

            await Promise.all([
                page.click('button[type="submit"]'),
                page.waitForNavigation({ waitUntil: 'networkidle2' })
            ]);

            // Salvar cookies
            const cookies = await page.cookies();
            fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));

            // Lidar com popup "Salvar informações"
            await delay(2000);
            const notNowButton = await page.$('button:has-text("Agora não")');
            if (notNowButton) {
                await notNowButton.click();
            }

            return { success: true, message: 'Login realizado com sucesso' };
        }

        // Se não tiver credenciais, é login manual
        // Retornar sucesso e deixar navegador aberto para login manual
        return { success: true, message: 'Navegador aberto para login manual. Faça login e depois clique em "Salvar Sessão".' };
    } catch (error) {
        console.error('Erro no login:', error);
        return { success: false, message: error.message };
    }
}

// Função para salvar sessão atual (após login manual)
export async function saveSession() {
    try {
        // Verificar se browser está ativo
        if (!await isBrowserActive()) {
            return { success: false, message: 'Navegador não está aberto. Faça login primeiro.' };
        }

        if (!page || page.isClosed()) {
            return { success: false, message: 'Nenhuma página ativa. Faça login primeiro.' };
        }

        // Verificar se está logado
        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
        await delay(2000);

        const isLoggedIn = await page.evaluate(() => {
            return !document.querySelector('input[name="username"]');
        });

        if (!isLoggedIn) {
            return { success: false, message: 'Você ainda não está logado. Complete o login primeiro.' };
        }

        // Salvar cookies
        const cookies = await page.cookies();
        fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));

        return { success: true, message: 'Sessão salva com sucesso!' };
    } catch (error) {
        console.error('Erro ao salvar sessão:', error);
        return { success: false, message: error.message };
    }
}

// Função auxiliar para extrair links do Instagram da página atual
async function extractInstagramLinksFromPage() {
    const retries = 3;

    for (let i = 0; i < retries; i++) {
        try {
            const links = await page.evaluate(() => {
                const linksFound = [];
                const anchors = document.querySelectorAll('a[href*="instagram.com"]');

                anchors.forEach(anchor => {
                    const href = anchor.href;
                    const match = href.match(/instagram\.com\/([^\/\?]+)/);
                    if (match && match[1] && !['p', 'reel', 'stories', 'explore', 'accounts'].includes(match[1])) {
                        const username = match[1];
                        if (!linksFound.find(l => l.username === username)) {
                            linksFound.push({
                                username: username,
                                url: `https://www.instagram.com/${username}/`
                            });
                        }
                    }
                });

                return linksFound;
            });

            console.log(`✅ Extração bem-sucedida na tentativa ${i + 1} - Encontrados ${links.length} perfis`);
            return links;

        } catch (evalError) {
            if (evalError.message.includes('Execution context was destroyed')) {
                console.log(`⚠️ Contexto destruído na tentativa ${i + 1}/${retries}. Aguardando e tentando novamente...`);
                if (i < retries - 1) {
                    await delay(5000);
                } else {
                    console.log('❌ Falhou após todas as tentativas. Retornando lista vazia.');
                    return [];
                }
            } else {
                throw evalError;
            }
        }
    }

    return [];
}

// Função para resolver captcha (extraída para reutilização)
async function solveCaptchaIfNeeded() {
    console.log('🔍 Debug - TWOCAPTCHA_TOKEN está configurado?', process.env.TWOCAPTCHA_TOKEN ? 'SIM' : 'NÃO');
    console.log('🔍 Debug - page.solveRecaptchas existe?', typeof page.solveRecaptchas === 'function' ? 'SIM' : 'NÃO');

    // Verificar se há captcha e tentar resolver automaticamente
    if (process.env.TWOCAPTCHA_TOKEN && page.solveRecaptchas) {
        try {
            console.log('🤖 Tentando resolver captcha automaticamente com 2captcha...');

            // Configurar listener para navegação antes de resolver o captcha
            const navigationPromise = page.waitForNavigation({
                waitUntil: 'domcontentloaded',
                timeout: 90000
            }).catch(() => {
                console.log('⏳ Timeout na espera de navegação (pode ser normal se não houve navegação)');
                return null;
            });

            const result = await page.solveRecaptchas();

            console.log('🔍 Debug - Resultado do solveRecaptchas:', JSON.stringify({
                captchas: result.captchas?.length || 0,
                solutions: result.solutions?.length || 0,
                solved: result.solved?.length || 0,
                error: result.error || 'nenhum'
            }));

            if (result.solved && result.solved.length > 0) {
                console.log(`✅ Captcha resolvido automaticamente! ${result.solved.length} captcha(s)`);

                // Aguardar a navegação completar após resolver o captcha
                console.log('⏳ Aguardando navegação após resolver captcha...');
                const navResult = await navigationPromise;

                if (navResult) {
                    console.log('✅ Navegação completada');
                } else {
                    console.log('⚠️ Navegação não detectada ou timeout');
                }

                // Aguardar mais tempo para estabilização
                console.log('⏳ Aguardando estabilização da página (10 segundos)...');
                await delay(10000);

                // Verificar se a página ainda está válida
                try {
                    const url = await page.url();
                    console.log('✅ Página ainda válida. URL:', url);
                } catch (e) {
                    console.log('❌ Página parece ter navegado. Aguardando mais...');
                    await delay(5000);
                }
            } else {
                console.log('ℹ️ Nenhum captcha encontrado na página ou já estava resolvido');
            }

            if (result.error) {
                console.error('❌ Erro ao resolver captcha:', result.error);
            }
        } catch (captchaError) {
            console.log('❌ Exceção ao tentar resolver captcha:', captchaError.message);
            console.log('Aguardando 30 segundos para resolução manual do captcha...');
            await delay(30000);
        }
    } else {
        console.log('⚠️ Plugin de captcha não configurado ou token não fornecido');
        console.log('Aguardando 30 segundos para resolução manual do captcha...');
        await delay(30000);
    }

    // Aguardar mais um pouco para garantir que qualquer navegação terminou
    console.log('⏳ Aguardando estabilização final...');
    await delay(5000);
}

// Função para buscar no Google com resolução automática de captcha e paginação
export async function searchGoogleForInstagram(businessType, city, limit = 10) {
    try {
        const browser = await initBrowser();

        // Criar nova página se não existir ou se foi fechada
        if (!page || page.isClosed()) {
            page = await browser.newPage();
        }

        const searchQuery = `${businessType} ${city} instagram`;
        let allProfiles = [];
        const maxPages = 5; // Máximo 5 páginas do Google (50 resultados)
        let currentPage = 0;

        console.log('Buscando no Google:', searchQuery);
        console.log(`🎯 Meta: ${limit} estabelecimentos`);

        while (allProfiles.length < limit && currentPage < maxPages) {
            const startParam = currentPage * 10;
            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&start=${startParam}`;

            console.log(`\n📄 Página ${currentPage + 1} do Google (start=${startParam})`);
            console.log('🔍 Navegando para:', googleUrl);

            // Usar 'domcontentloaded' em vez de 'networkidle2' para não travar em páginas com captcha
            await page.goto(googleUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            console.log('✅ Página carregada');

            // Aguardar um pouco para garantir que o captcha apareça se houver
            await delay(2000);

            // Resolver captcha apenas na primeira página
            if (currentPage === 0) {
                await solveCaptchaIfNeeded();
            }

            // Verificar URL atual
            const currentUrl = page.url();
            console.log('🔍 Debug - URL atual:', currentUrl);

            // Garantir que a página está pronta antes de fazer evaluate
            await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 }).catch(() => {
                console.log('⚠️ Página não alcançou readyState complete, continuando mesmo assim...');
            });

            console.log('🔍 Procurando links do Instagram na página...');

            // Extrair links do Instagram dos resultados
            const pageProfiles = await extractInstagramLinksFromPage();

            // Adicionar apenas perfis únicos
            for (const profile of pageProfiles) {
                if (!allProfiles.find(p => p.username === profile.username)) {
                    allProfiles.push(profile);
                }
            }

            console.log(`📊 Total acumulado: ${allProfiles.length} perfis únicos`);

            // Se não encontrou nenhum perfil novo nesta página, provavelmente não há mais resultados
            if (pageProfiles.length === 0) {
                console.log('⚠️ Nenhum perfil encontrado nesta página. Encerrando busca.');
                break;
            }

            // Se já temos perfis suficientes, parar
            if (allProfiles.length >= limit) {
                console.log(`✅ Meta atingida! ${allProfiles.length} perfis encontrados.`);
                break;
            }

            // Ir para próxima página
            currentPage++;

            // Aguardar um pouco antes de ir para próxima página
            if (currentPage < maxPages && allProfiles.length < limit) {
                console.log('⏳ Aguardando antes de ir para próxima página...');
                await delay(3000);
            }
        }

        if (allProfiles.length === 0) {
            console.log('⚠️ Nenhum perfil encontrado. Possíveis causas:');
            console.log('   - Captcha ainda não foi resolvido completamente');
            console.log('   - Google bloqueou a busca');
            console.log('   - Página não carregou corretamente');
        } else {
            console.log('\n📋 Perfis encontrados:', allProfiles.map(l => l.username).join(', '));
        }

        const finalCount = Math.min(limit, allProfiles.length);
        console.log(`\n📊 Resultado final: Retornando ${finalCount} de ${allProfiles.length} perfis encontrados`);
        return allProfiles.slice(0, limit);
    } catch (error) {
        console.error('Erro na busca:', error);
        return [];
    }
}

// Função para extrair dados de um perfil do Instagram
export async function extractInstagramData(username) {
    try {
        if (!await isBrowserActive() || !page || page.isClosed()) {
            throw new Error('Navegador não inicializado ou foi fechado');
        }

        const url = `https://www.instagram.com/${username}/`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Esperar um pouco para a página carregar
        await delay(3000);

        // Extrair informações da página
        const data = await page.evaluate(() => {
            const getMetaContent = (property) => {
                const meta = document.querySelector(`meta[property="${property}"]`);
                return meta ? meta.getAttribute('content') : '';
            };

            const getTextContent = (selector) => {
                const element = document.querySelector(selector);
                return element ? element.textContent.trim() : '';
            };

            // Tentar pegar o nome do negócio
            const name = getMetaContent('og:title') ||
                        getTextContent('header section h2') ||
                        getTextContent('header h1');

            // Tentar pegar a bio
            const bio = getMetaContent('og:description') ||
                       getTextContent('header section span') ||
                       '';

            // Tentar pegar informações de contato da bio
            const bioText = bio.toLowerCase();

            // Regex para telefone
            const phoneMatch = bio.match(/(\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}/);
            const phone = phoneMatch ? phoneMatch[0] : '';

            // Verificar se tem presença em redes sociais (se está no Instagram, é sim)
            const hasSocialMedia = 'Sim';

            return {
                name: name.replace(/\(@.*\)/, '').trim(),
                bio: bio,
                phone: phone,
                hasSocialMedia: hasSocialMedia,
                rawText: `${name}\n${bio}`
            };
        });

        return {
            instagram: username,
            ...data
        };
    } catch (error) {
        console.error(`Erro ao extrair dados de ${username}:`, error);
        return null;
    }
}

// Função para fechar o navegador
export async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
        page = null;
    }
}

// Função para verificar se está logado
export async function checkLoginStatus() {
    try {
        if (!fs.existsSync(COOKIES_FILE)) {
            return { loggedIn: false };
        }

        const browser = await initBrowser();

        // Criar nova página se não existir ou se foi fechada
        if (!page || page.isClosed()) {
            page = await browser.newPage();
        }

        const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
        await page.setCookie(...cookies);

        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
        await delay(2000);

        const isLoggedIn = await page.evaluate(() => {
            return !document.querySelector('input[name="username"]');
        });

        return { loggedIn: isLoggedIn };
    } catch (error) {
        return { loggedIn: false };
    }
}

// ============= FUNÇÕES DE APERFEIÇOAMENTO DE DADOS =============

// Função para buscar dados empresariais via Google + IA  
async function searchWithAI(companyName, city, searchTerm, genAI, geminiModel) {
    try {
        const browser = await initBrowser();

        if (!page || page.isClosed()) {
            page = await browser.newPage();
        }

        const searchQuery = `${companyName} ${city} ${searchTerm}`;
        const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

        console.log(`🔍 Buscando no Google: ${searchQuery}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(3000);

        // Capturar HTML dos resultados
        const resultsHTML = await page.evaluate(() => {
            const results = [];
            const searchResults = document.querySelectorAll('.g, [class*="result"]');

            searchResults.forEach((result, idx) => {
                if (idx < 10) {
                    const link = result.querySelector('a');
                    const title = result.querySelector('h3');
                    const snippet = result.querySelector('[class*="VwiC3b"], .s, [data-sncf]');

                    if (link && title) {
                        results.push({
                            index: idx,
                            url: link.href,
                            title: title.textContent,
                            snippet: snippet?.textContent || ''
                        });
                    }
                }
            });

            return results;
        });

        console.log(`📄 Encontrados ${resultsHTML.length} resultados`);

        if (resultsHTML.length === 0) {
            console.log('⚠️ Nenhum resultado encontrado');
            return null;
        }

        // Usar IA para escolher o link mais relevante
        const model = genAI.getGenerativeModel({ model: geminiModel });
        const prompt = `Você é um assistente que analisa resultados de busca do Google.

Empresa: ${companyName}
Cidade: ${city}
Termo de busca: ${searchTerm}

Resultados do Google:
${resultsHTML.map(r => `[${r.index}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`).join('\n\n')}

TAREFA: Escolha o resultado mais relevante que seja ESPECIFICAMENTE sobre a empresa "${companyName}" em "${city}".

IMPORTANTE:
- O resultado DEVE ser sobre a empresa exata, não empresas similares
- Prefira sites oficiais como Econodata, CNPJBiz, Jucesp
- Se nenhum resultado for sobre a empresa correta, retorne "NENHUM"

Retorne APENAS o número do índice [0-9] do melhor resultado, ou "NENHUM" se não encontrar.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiChoice = response.text().trim();

        console.log(`🤖 IA escolheu: ${aiChoice}`);

        if (aiChoice === 'NENHUM' || isNaN(aiChoice)) {
            console.log('⚠️ IA não encontrou resultado relevante');
            return null;
        }

        const chosenIndex = parseInt(aiChoice);
        if (chosenIndex < 0 || chosenIndex >= resultsHTML.length) {
            console.log('⚠️ Índice inválido escolhido pela IA');
            return null;
        }

        const chosenResult = resultsHTML[chosenIndex];
        console.log(`✅ Acessando: ${chosenResult.title}`);
        console.log(`🔗 URL: ${chosenResult.url}`);

        // Navegar para a página escolhida
        await page.goto(chosenResult.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(3000);

        return { url: chosenResult.url, page };
    } catch (error) {
        console.error('Erro na busca com IA:', error.message);
        return null;
    }
}

// Função para extrair informações usando IA
async function extractWithAI(pageContent, companyName, genAI, geminiModel) {
    try {
        const model = genAI.getGenerativeModel({ model: geminiModel });
        const prompt = `Você é um assistente que extrai informações empresariais de páginas web.

Empresa: ${companyName}

Conteúdo da página (texto):
${pageContent.substring(0, 8000)}

TAREFA: Extraia as seguintes informações se estiverem disponíveis:
1. CNPJ (formato: XX.XXX.XXX/XXXX-XX)
2. Capital Social (valor em reais)
3. Porte da empresa (MEI, ME, EPP, Médio, Grande, etc)
4. Sócios/Administradores (nomes)

IMPORTANTE:
- Se não encontrar alguma informação, deixe em branco
- Retorne APENAS JSON válido
- Não invente informações

Formato de resposta:
{
  "cnpj": "XX.XXX.XXX/XXXX-XX ou vazio",
  "capitalSocial": "valor ou vazio",
  "porte": "tipo ou vazio",
  "socios": "nomes separados por vírgula ou vazio"
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let aiText = response.text().trim();

        // Limpar markdown
        aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const data = JSON.parse(aiText);
        console.log('✅ Dados extraídos pela IA:', data);

        return data;
    } catch (error) {
        console.error('Erro ao extrair com IA:', error.message);
        return null;
    }
}

// Função para buscar CNPJ na Econodata usando IA
export async function searchEconodata(companyName, city, genAI, geminiModel) {
    try {
        console.log(`\n🔍 Buscando na Econodata: ${companyName}`);

        const result = await searchWithAI(companyName, city, 'econodata', genAI, geminiModel);

        if (!result) {
            console.log('⚠️ Não encontrado na Econodata');
            return null;
        }

        // Extrair conteúdo da página
        const pageContent = await page.evaluate(() => document.body.innerText);

        // Usar IA para extrair informações
        const data = await extractWithAI(pageContent, companyName, genAI, geminiModel);

        if (data && data.cnpj) {
            return { ...data, url: result.url, fonte: 'Econodata' };
        }

        return null;
    } catch (error) {
        console.error('Erro ao buscar na Econodata:', error.message);
        return null;
    }
}

// Função para buscar CNPJ no CNPJBiz usando IA
export async function searchCNPJBiz(companyName, city, cnpj, genAI, geminiModel) {
    try {
        console.log(`\n🔍 Buscando no CNPJBiz: ${companyName}`);

        const browser = await initBrowser();

        if (!page || page.isClosed()) {
            page = await browser.newPage();
        }

        let url;

        // Se já tem CNPJ, buscar diretamente
        if (cnpj) {
            const cleanCNPJ = cnpj.replace(/\D/g, '');
            url = `https://www.cnpj.biz/${cleanCNPJ}`;

            console.log(`🔗 Acessando diretamente: ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await delay(3000);
        } else {
            // Buscar no Google
            const result = await searchWithAI(companyName, city, 'cnpj.biz', genAI, geminiModel);

            if (!result) {
                console.log('⚠️ Não encontrado no CNPJBiz');
                return null;
            }

            url = result.url;
        }

        // Extrair conteúdo da página
        const pageContent = await page.evaluate(() => document.body.innerText);

        // Usar IA para extrair informações
        const data = await extractWithAI(pageContent, companyName, genAI, geminiModel);

        if (data) {
            return { ...data, url, fonte: 'CNPJBiz' };
        }

        return null;
    } catch (error) {
        console.error('Erro ao buscar no CNPJBiz:', error.message);
        return null;
    }
}

// Função para verificar se tem Google Meu Negócio
export async function checkGoogleMyBusiness(companyName, city, genAI, geminiModel) {
    try {
        const browser = await initBrowser();

        if (!page || page.isClosed()) {
            page = await browser.newPage();
        }

        const searchQuery = `${companyName} ${city}`;
        const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

        console.log(`🔍 Verificando Google Meu Negócio: ${searchQuery}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(3000);

        // Capturar texto da página
        const pageText = await page.evaluate(() => {
            // Focar na área do Knowledge Panel (card lateral)
            const knowledgePanel = document.querySelector('[data-attrid="kc:/local:one box"], [class*="knowledge"], .kp-wholepage');

            if (knowledgePanel) {
                return {
                    hasPanel: true,
                    text: knowledgePanel.innerText
                };
            }

            return { hasPanel: false };
        });

        if (!pageText.hasPanel) {
            console.log('⚠️ Nenhum Knowledge Panel encontrado');
            return { hasGMB: false };
        }

        // Usar IA para verificar se é o estabelecimento correto
        const model = genAI.getGenerativeModel({ model: geminiModel });
        const prompt = `Você é um assistente que analisa resultados do Google Meu Negócio.

Estabelecimento procurado: ${companyName}
Cidade: ${city}

Conteúdo do Knowledge Panel:
${pageText.text.substring(0, 2000)}

TAREFA: Determine se este Knowledge Panel é do estabelecimento correto.

Verifique se:
1. O nome corresponde a "${companyName}"
2. A localização é em "${city}"
3. Parece ser o mesmo tipo de negócio

Retorne APENAS um JSON:
{
  "isCorrect": true ou false,
  "confidence": "alta", "média" ou "baixa",
  "reason": "breve explicação"
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let aiText = response.text().trim();
        aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const analysis = JSON.parse(aiText);

        console.log('🤖 Análise da IA:', analysis);

        if (analysis.isCorrect) {
            console.log('✅ Tem página no Google Meu Negócio');
            return { hasGMB: true, gmbUrl: url, confidence: analysis.confidence };
        } else {
            console.log('⚠️ Knowledge Panel não corresponde ao estabelecimento');
            return { hasGMB: false, reason: analysis.reason };
        }
    } catch (error) {
        console.error('Erro ao verificar Google Meu Negócio:', error.message);
        return { hasGMB: false };
    }
}

// Função principal para aperfeiçoar dados de um prospect
export async function enhanceProspectData(prospect, genAI, geminiModel) {
    console.log(`\n🌟 Aperfeiçoando dados de: ${prospect.data.nome || 'prospect'}`);

    const enhancement = {};
    let cnpjFound = null;

    // 1. Tentar encontrar CNPJ na Econodata
    const econodataData = await searchEconodata(
        prospect.data.nome || '',
        prospect.data.cidade || '',
        genAI,
        geminiModel
    );

    if (econodataData && econodataData.cnpj) {
        cnpjFound = econodataData.cnpj;
        enhancement.cnpj = cnpjFound;
        enhancement.capitalSocial = econodataData.capitalSocial || '';
        enhancement.porte = econodataData.porte || '';
        enhancement.socios = econodataData.socios || '';
        enhancement.fonte = 'Econodata';
        enhancement.fonteUrl = econodataData.url;
    }

    // 2. Se não achou na Econodata, buscar no CNPJBiz
    if (!cnpjFound) {
        const cnpjBizData = await searchCNPJBiz(
            prospect.data.nome || '',
            prospect.data.cidade || '',
            prospect.data.cnpj || null,
            genAI,
            geminiModel
        );

        if (cnpjBizData && cnpjBizData.cnpj) {
            cnpjFound = cnpjBizData.cnpj;
            enhancement.cnpj = cnpjBizData.cnpj;
            enhancement.capitalSocial = cnpjBizData.capitalSocial || '';
            enhancement.porte = cnpjBizData.porte || '';
            enhancement.socios = cnpjBizData.socios || '';
            enhancement.fonte = 'CNPJBiz';
            enhancement.fonteUrl = cnpjBizData.url;
        } else {
            enhancement.statusCNPJ = 'CNPJ não encontrado ou empresa não possui CNPJ';
        }
    }

    // 3. Verificar Google Meu Negócio
    const gmbData = await checkGoogleMyBusiness(
        prospect.data.nome || '',
        prospect.data.cidade || '',
        genAI,
        geminiModel
    );

    enhancement.googleMeuNegocio = gmbData.hasGMB ? 'Sim' : 'Não';
    if (gmbData.gmbUrl) {
        enhancement.googleMeuNegocioUrl = gmbData.gmbUrl;
    }

    console.log('✅ Aperfeiçoamento concluído');
    console.log('📊 Dados coletados:', enhancement);

    return enhancement;
}
