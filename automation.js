import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

const COOKIES_FILE = path.join(__dirname, 'instagram-cookies.json');

let browser = null;
let page = null;

// Helper para substituir waitForTimeout (que foi depreciado)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para inicializar o navegador
export async function initBrowser() {
    if (browser) return browser;

    browser = await puppeteer.launch({
        headless: false, // Visível para fazer login
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,720'
        ]
    });

    return browser;
}

// Função para fazer login no Instagram
export async function loginInstagram(username, password) {
    try {
        const browser = await initBrowser();
        page = await browser.newPage();

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
        if (!page) {
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

// Função para buscar no Google
export async function searchGoogleForInstagram(businessType, city) {
    try {
        if (!page) {
            const browser = await initBrowser();
            page = await browser.newPage();
        }

        const searchQuery = `${businessType} ${city} instagram`;
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

        await page.goto(googleUrl, { waitUntil: 'networkidle2' });

        // Extrair links do Instagram dos resultados
        const instagramLinks = await page.evaluate(() => {
            const links = [];
            const anchors = document.querySelectorAll('a[href*="instagram.com"]');

            anchors.forEach(anchor => {
                const href = anchor.href;
                // Filtrar apenas perfis do Instagram
                const match = href.match(/instagram\.com\/([^\/\?]+)/);
                if (match && match[1] && !['p', 'reel', 'stories', 'explore'].includes(match[1])) {
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

        return instagramLinks.slice(0, 10); // Limitar a 10 resultados
    } catch (error) {
        console.error('Erro na busca:', error);
        return [];
    }
}

// Função para extrair dados de um perfil do Instagram
export async function extractInstagramData(username) {
    try {
        if (!page) {
            throw new Error('Navegador não inicializado');
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
        page = await browser.newPage();

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
