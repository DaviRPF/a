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

// Função para buscar no Google com resolução automática de captcha
export async function searchGoogleForInstagram(businessType, city, limit = 10) {
    try {
        const browser = await initBrowser();

        // Criar nova página se não existir ou se foi fechada
        if (!page || page.isClosed()) {
            page = await browser.newPage();
        }

        const searchQuery = `${businessType} ${city} instagram`;
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

        console.log('Buscando no Google:', searchQuery);
        console.log('🔍 Navegando para:', googleUrl);

        // Usar 'domcontentloaded' em vez de 'networkidle2' para não travar em páginas com captcha
        await page.goto(googleUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('✅ Página carregada');

        // Aguardar um pouco para garantir que o captcha apareça se houver
        await delay(2000);

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

        // Verificar URL atual após resolver captcha
        const currentUrl = page.url();
        console.log('🔍 Debug - URL atual após captcha:', currentUrl);

        // Se ainda estiver em página de captcha ou erro, tentar navegar novamente
        if (currentUrl.includes('sorry/index') || currentUrl.includes('recaptcha')) {
            console.log('⚠️ Ainda em página de captcha/erro. Tentando navegar para resultados novamente...');
            await page.goto(googleUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await delay(3000);
        }

        console.log('🔍 Procurando links do Instagram na página...');

        // Garantir que a página está pronta antes de fazer evaluate
        await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 }).catch(() => {
            console.log('⚠️ Página não alcançou readyState complete, continuando mesmo assim...');
        });

        // Extrair links do Instagram dos resultados com retry se contexto for destruído
        let instagramLinks = [];
        let retries = 3;

        for (let i = 0; i < retries; i++) {
            try {
                instagramLinks = await page.evaluate(() => {
                    const links = [];
                    const anchors = document.querySelectorAll('a[href*="instagram.com"]');

                    anchors.forEach(anchor => {
                        const href = anchor.href;
                        // Filtrar apenas perfis do Instagram
                        const match = href.match(/instagram\.com\/([^\/\?]+)/);
                        if (match && match[1] && !['p', 'reel', 'stories', 'explore', 'accounts'].includes(match[1])) {
                            const username = match[1];
                            if (!links.find(l => l.username === username)) {
                                links.push({
                                    username: username,
                                    url: `https://www.instagram.com/${username}/`
                                });
                            }
                        }
                    });

                    return links;
                });

                console.log(`✅ Extração bem-sucedida na tentativa ${i + 1}`);
                break; // Sucesso, sair do loop

            } catch (evalError) {
                if (evalError.message.includes('Execution context was destroyed')) {
                    console.log(`⚠️ Contexto destruído na tentativa ${i + 1}/${retries}. Aguardando e tentando novamente...`);
                    if (i < retries - 1) {
                        await delay(5000);
                    } else {
                        console.log('❌ Falhou após todas as tentativas. Retornando lista vazia.');
                        throw evalError;
                    }
                } else {
                    throw evalError; // Outro tipo de erro, propagar
                }
            }
        }

        console.log(`✅ Encontrados ${instagramLinks.length} perfis do Instagram únicos`);

        if (instagramLinks.length === 0) {
            console.log('⚠️ Nenhum perfil encontrado. Possíveis causas:');
            console.log('   - Captcha ainda não foi resolvido completamente');
            console.log('   - Google bloqueou a busca');
            console.log('   - Página não carregou corretamente');
        } else {
            console.log('📋 Perfis encontrados:', instagramLinks.map(l => l.username).join(', '));
        }

        console.log(`📊 Retornando ${Math.min(limit, instagramLinks.length)} de ${instagramLinks.length} perfis encontrados`);
        return instagramLinks.slice(0, limit);
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
