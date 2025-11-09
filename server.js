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
const FIELDS_CONFIG_FILE = path.join(__dirname, 'fields-config.json');

// Middleware
app.use(bodyParser.json());

// Servir arquivos estáticos do build do React
app.use(express.static(path.join(__dirname, 'dist')));

// Configuração inicial de campos
const DEFAULT_FIELDS = [
    { id: 'nome', label: 'Nome do Estabelecimento', type: 'text', required: true, icon: '🏪' },
    { id: 'telefone', label: 'Telefone', type: 'tel', required: true, icon: '📞' },
    { id: 'instagram', label: 'Instagram', type: 'text', required: false, icon: '📱' },
    { id: 'googleMeuNegocio', label: 'Google Meu Negócio', type: 'text', required: false, icon: '🌐' },
    { id: 'presencaRedeSocial', label: 'Tem Presença na Rede Social?', type: 'select', required: true, icon: '👥', options: ['Sim', 'Não'] }
];

// Inicializar arquivo de dados se não existir
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Inicializar arquivo de configuração de campos se não existir
if (!fs.existsSync(FIELDS_CONFIG_FILE)) {
    fs.writeFileSync(FIELDS_CONFIG_FILE, JSON.stringify(DEFAULT_FIELDS, null, 2));
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

// Função para ler configuração de campos
function readFieldsConfig() {
    const data = fs.readFileSync(FIELDS_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
}

// Função para salvar configuração de campos
function saveFieldsConfig(fields) {
    fs.writeFileSync(FIELDS_CONFIG_FILE, JSON.stringify(fields, null, 2));
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

// POST - Adicionar novo prospect (dinâmico baseado nos campos configurados)
app.post('/api/prospects', (req, res) => {
    try {
        const prospects = readProspects();
        const fields = readFieldsConfig();

        // Construir prospect dinamicamente baseado nos campos configurados
        const newProspect = {
            id: Date.now().toString(),
            status: 'Não contatado ainda',
            criadoEm: new Date().toISOString()
        };

        // Adicionar todos os campos do body
        fields.forEach(field => {
            newProspect[field.id] = req.body[field.id] || '';
        });

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

// ============= ROTAS DE CONFIGURAÇÃO DE CAMPOS =============

// GET - Listar configuração de campos
app.get('/api/fields', (req, res) => {
    try {
        const fields = readFieldsConfig();
        res.json(fields);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao ler configuração de campos' });
    }
});

// POST - Adicionar novo campo
app.post('/api/fields', (req, res) => {
    try {
        const fields = readFieldsConfig();
        const newField = {
            id: req.body.id || Date.now().toString(),
            label: req.body.label,
            type: req.body.type || 'text',
            required: req.body.required || false,
            icon: req.body.icon || '📝',
            options: req.body.options || []
        };
        fields.push(newField);
        saveFieldsConfig(fields);
        res.status(201).json(newField);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao adicionar campo' });
    }
});

// PUT - Atualizar campo
app.put('/api/fields/:id', (req, res) => {
    try {
        const fields = readFieldsConfig();
        const index = fields.findIndex(f => f.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ error: 'Campo não encontrado' });
        }

        fields[index] = {
            ...fields[index],
            ...req.body,
            id: req.params.id // Garantir que o ID não mude
        };

        saveFieldsConfig(fields);
        res.json(fields[index]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar campo' });
    }
});

// DELETE - Remover campo
app.delete('/api/fields/:id', (req, res) => {
    try {
        const fields = readFieldsConfig();
        const filteredFields = fields.filter(f => f.id !== req.params.id);

        if (fields.length === filteredFields.length) {
            return res.status(404).json({ error: 'Campo não encontrado' });
        }

        saveFieldsConfig(filteredFields);
        res.json({ message: 'Campo removido com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover campo' });
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
