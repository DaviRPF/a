import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'prospects.json');

// Middleware
app.use(bodyParser.json());

// Servir arquivos estáticos do build do React
app.use(express.static(path.join(__dirname, 'dist')));

// Inicializar arquivo de dados se não existir
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Função para ler prospects
function readProspects() {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

// Função para salvar prospects
function saveProspects(prospects) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(prospects, null, 2));
}

// GET - Listar todos os prospects
app.get('/api/prospects', (req, res) => {
    try {
        const prospects = readProspects();
        res.json(prospects);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao ler prospects' });
    }
});

// POST - Adicionar novo prospect
app.post('/api/prospects', (req, res) => {
    try {
        const prospects = readProspects();
        const newProspect = {
            id: Date.now().toString(),
            nome: req.body.nome,
            telefone: req.body.telefone,
            instagram: req.body.instagram,
            googleMeuNegocio: req.body.googleMeuNegocio,
            presencaRedeSocial: req.body.presencaRedeSocial,
            status: 'Não contatado ainda',
            criadoEm: new Date().toISOString()
        };
        prospects.push(newProspect);
        saveProspects(prospects);
        res.status(201).json(newProspect);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao adicionar prospect' });
    }
});

// PUT - Atualizar prospect
app.put('/api/prospects/:id', (req, res) => {
    try {
        const prospects = readProspects();
        const index = prospects.findIndex(p => p.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ error: 'Prospect não encontrado' });
        }

        prospects[index] = {
            ...prospects[index],
            ...req.body,
            id: req.params.id // Garantir que o ID não mude
        };

        saveProspects(prospects);
        res.json(prospects[index]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar prospect' });
    }
});

// DELETE - Remover prospect
app.delete('/api/prospects/:id', (req, res) => {
    try {
        const prospects = readProspects();
        const filteredProspects = prospects.filter(p => p.id !== req.params.id);

        if (prospects.length === filteredProspects.length) {
            return res.status(404).json({ error: 'Prospect não encontrado' });
        }

        saveProspects(filteredProspects);
        res.json({ message: 'Prospect removido com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover prospect' });
    }
});

// Servir index.html para todas as outras rotas (SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📁 Dados salvos em: ${DATA_FILE}`);
});
