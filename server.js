import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as automation from './automation.js';
import { enhanceProspectData } from './enhancement-puppeteer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'prospects.json');
const FIELDS_CONFIG_FILE = path.join(__dirname, 'fields-config.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const BUSINESS_TYPES_FILE = path.join(__dirname, 'business-types.json');
const PENDING_PROSPECTS_FILE = path.join(__dirname, 'pending-prospects.json');
const CALL_HISTORY_FILE = path.join(__dirname, 'call-history.json');

// Inicializar Gemini AI
let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Middleware - Aumentar limite para aceitar áudios grandes em base64
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Servir arquivos estáticos do build do React
app.use(express.static(path.join(__dirname, 'dist')));

// Tipos de estabelecimento padrão
const DEFAULT_BUSINESS_TYPES = [
    'Restaurante',
    'Pizzaria',
    'Cafeteria',
    'Padaria',
    'Lanchonete',
    'Bar',
    'Hamburgueria',
    'Sorveteria'
];

// Configuração inicial de campos
const DEFAULT_FIELDS = [
    { id: 'tipoEstabelecimento', label: 'Tipo de Estabelecimento', type: 'select', required: true, icon: '🏢', options: DEFAULT_BUSINESS_TYPES },
    { id: 'nome', label: 'Nome do Estabelecimento', type: 'text', required: true, icon: '🏪' },
    { id: 'telefone', label: 'Telefone', type: 'tel', required: true, icon: '📞' },
    { id: 'instagram', label: 'Instagram', type: 'text', required: false, icon: '📱' },
    { id: 'cnpj', label: 'CNPJ', type: 'text', required: false, icon: '📄' },
    { id: 'capitalSocial', label: 'Capital Social', type: 'text', required: false, icon: '💰' },
    { id: 'porte', label: 'Porte da Empresa', type: 'text', required: false, icon: '📊' },
    { id: 'socios', label: 'Sócios / Administradores', type: 'textarea', required: false, icon: '👥' },
    { id: 'fonte', label: 'Fonte dos Dados', type: 'text', required: false, icon: '📌' },
    { id: 'fonteUrl', label: 'URL da Fonte', type: 'text', required: false, icon: '🔗' },
    { id: 'googleMeuNegocio', label: 'Tem Google Meu Negócio?', type: 'select', required: false, icon: '🌐', options: ['Sim', 'Não'] },
    { id: 'googleMeuNegocioUrl', label: 'URL Google Meu Negócio', type: 'text', required: false, icon: '🔗' },
    { id: 'presencaRedeSocial', label: 'Tem Presença na Rede Social?', type: 'select', required: true, icon: '👥', options: ['Sim', 'Não'] },
    { id: 'cidade', label: 'Cidade', type: 'text', required: false, icon: '🏙️' },
    { id: 'horarioDiaDecisorPresente', label: 'Horário/Dia que o Decisor Está Presente', type: 'textarea', required: false, icon: '⏰' },
    { id: 'diaHorarioReuniao', label: 'Data e Horário da Reunião', type: 'text', required: false, icon: '📅' },
    { id: 'contatoPessoalDecisor', label: 'Contato Pessoal do Decisor', type: 'tel', required: false, icon: '📱' },
    { id: 'motivoObjecaoDecisor', label: 'Motivo da Objeção do Decisor', type: 'textarea', required: false, icon: '❌' },
    { id: 'motivoObjecaoAtendente', label: 'Motivo da Objeção do Atendente', type: 'textarea', required: false, icon: '🚫' }
];

// Configuração padrão de settings
const DEFAULT_SETTINGS = {
    geminiModel: 'gemini-2.5-flash'
};

// Inicializar arquivo de dados se não existir
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Inicializar arquivo de configuração de campos se não existir
if (!fs.existsSync(FIELDS_CONFIG_FILE)) {
    fs.writeFileSync(FIELDS_CONFIG_FILE, JSON.stringify(DEFAULT_FIELDS, null, 2));
}

// Inicializar arquivo de settings se não existir
if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
}

// Inicializar arquivo de tipos de estabelecimento se não existir
if (!fs.existsSync(BUSINESS_TYPES_FILE)) {
    fs.writeFileSync(BUSINESS_TYPES_FILE, JSON.stringify(DEFAULT_BUSINESS_TYPES, null, 2));
}

// Inicializar arquivo de prospects pendentes se não existir
if (!fs.existsSync(PENDING_PROSPECTS_FILE)) {
    fs.writeFileSync(PENDING_PROSPECTS_FILE, JSON.stringify([], null, 2));
}

// Inicializar arquivo de histórico de chamadas se não existir
if (!fs.existsSync(CALL_HISTORY_FILE)) {
    fs.writeFileSync(CALL_HISTORY_FILE, JSON.stringify({}, null, 2));
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

// Função para ler settings
function readSettings() {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
}

// Função para salvar settings
function saveSettings(settings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// Função para ler tipos de estabelecimento
function readBusinessTypes() {
    const data = fs.readFileSync(BUSINESS_TYPES_FILE, 'utf8');
    return JSON.parse(data);
}

// Função para salvar tipos de estabelecimento
function saveBusinessTypes(types) {
    fs.writeFileSync(BUSINESS_TYPES_FILE, JSON.stringify(types, null, 2));
}

// Função para ler prospects pendentes
function readPendingProspects() {
    const data = fs.readFileSync(PENDING_PROSPECTS_FILE, 'utf8');
    return JSON.parse(data);
}

// Função para salvar prospects pendentes
function savePendingProspects(prospects) {
    fs.writeFileSync(PENDING_PROSPECTS_FILE, JSON.stringify(prospects, null, 2));
}

// Função para ler histórico de chamadas
function readCallHistory() {
    const data = fs.readFileSync(CALL_HISTORY_FILE, 'utf8');
    return JSON.parse(data);
}

// Função para salvar histórico de chamadas
function saveCallHistory(history) {
    fs.writeFileSync(CALL_HISTORY_FILE, JSON.stringify(history, null, 2));
}

// Função para adicionar chamada ao histórico de um prospect
function addCallToHistory(prospectId, callData) {
    const history = readCallHistory();

    if (!history[prospectId]) {
        history[prospectId] = [];
    }

    history[prospectId].push(callData);
    saveCallHistory(history);
    return callData;
}

// Função para pegar histórico de um prospect específico
function getProspectCallHistory(prospectId) {
    const history = readCallHistory();
    return history[prospectId] || [];
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

        console.log('📥 POST /api/prospects - Body recebido:', JSON.stringify(req.body, null, 2));

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

        console.log('💾 Prospect sendo salvo:', JSON.stringify(newProspect, null, 2));

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

// ============= ROTAS DE HISTÓRICO DE CHAMADAS =============

// GET - Pegar histórico de chamadas de um prospect
app.get('/api/prospects/:id/call-history', (req, res) => {
    try {
        const history = getProspectCallHistory(req.params.id);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao ler histórico de chamadas' });
    }
});


// POST - Transcrever áudio com Gemini AI (áudios separados)
app.post('/api/transcribe-audio', async (req, res) => {
    try {
        const { micAudioBase64, systemAudioBase64 } = req.body;

        if (!micAudioBase64 && !systemAudioBase64) {
            return res.status(400).json({ error: 'Nenhum áudio fornecido' });
        }

        if (!genAI) {
            return res.status(500).json({ error: 'Gemini AI não configurado' });
        }

        console.log('📝 Transcrevendo áudios SEPARADAMENTE com Gemini...');
        console.log('  - Microfone (vendedor):', micAudioBase64 ? 'SIM' : 'NÃO');
        console.log('  - Sistema (cliente):', systemAudioBase64 ? 'SIM' : 'NÃO');

        const settings = readSettings();
        const model = genAI.getGenerativeModel({ model: settings.geminiModel });

        const conversation = [];

        // Transcrever MICROFONE (vendedor)
        if (micAudioBase64) {
            try {
                const base64Audio = micAudioBase64.replace(/^data:audio\/\w+;base64,/, '');

                const prompt = `Transcreva COMPLETAMENTE este áudio de um VENDEDOR em uma ligação de vendas.

IMPORTANTE:
- Este é o áudio do MICROFONE (vendedor)
- Transcreva TODAS as falas do vendedor
- Seja o mais preciso possível
- Transcreva em português do Brasil
- Se houver múltiplas falas, separe cada uma

RETORNE APENAS a transcrição em texto simples, sem formatação especial.`;

                console.log('🎤 Transcrevendo áudio do MICROFONE (vendedor)...');

                const result = await model.generateContent([
                    {
                        inlineData: {
                            mimeType: 'audio/webm',
                            data: base64Audio
                        }
                    },
                    { text: prompt }
                ]);

                const response = await result.response;
                const vendedorText = response.text().trim();

                console.log('✅ Microfone transcrito:', vendedorText.substring(0, 100) + '...');

                // Adicionar fala do vendedor
                if (vendedorText && vendedorText.length > 0) {
                    conversation.push({
                        speaker: 'vendedor',
                        text: vendedorText
                    });
                }
            } catch (error) {
                console.error('❌ Erro ao transcrever microfone:', error.message);
            }
        }

        // Transcrever SISTEMA (cliente)
        if (systemAudioBase64) {
            try {
                const base64Audio = systemAudioBase64.replace(/^data:audio\/\w+;base64,/, '');

                const prompt = `Transcreva COMPLETAMENTE este áudio de um CLIENTE/ATENDENTE em uma ligação de vendas.

IMPORTANTE:
- Este é o áudio do SISTEMA (cliente/atendente do telefone)
- Transcreva TODAS as falas do cliente/atendente
- Seja o mais preciso possível
- Transcreva em português do Brasil
- Se houver múltiplas falas, separe cada uma

RETORNE APENAS a transcrição em texto simples, sem formatação especial.`;

                console.log('📞 Transcrevendo áudio do SISTEMA (cliente)...');

                const result = await model.generateContent([
                    {
                        inlineData: {
                            mimeType: 'audio/webm',
                            data: base64Audio
                        }
                    },
                    { text: prompt }
                ]);

                const response = await result.response;
                const clienteText = response.text().trim();

                console.log('✅ Sistema transcrito:', clienteText.substring(0, 100) + '...');

                // Adicionar fala do cliente
                if (clienteText && clienteText.length > 0) {
                    conversation.push({
                        speaker: 'cliente',
                        text: clienteText
                    });
                }
            } catch (error) {
                console.error('❌ Erro ao transcrever sistema:', error.message);
            }
        }

        // Retornar conversa estruturada
        if (conversation.length > 0) {
            console.log(`📊 ${conversation.length} participante(s) identificado(s)`);
            res.json({
                conversation: conversation,
                isStructured: true
            });
        } else {
            // Fallback
            res.json({
                transcription: 'Não foi possível transcrever os áudios.',
                isStructured: false
            });
        }
    } catch (error) {
        console.error('❌ Erro ao transcrever áudio:', error);
        res.status(500).json({ error: 'Erro ao transcrever áudio: ' + error.message });
    }
});

// POST - Analisar transcrição com IA e sugerir campos
app.post('/api/prospects/:id/analyze-call', async (req, res) => {
    try {
        const { transcript } = req.body;

        if (!transcript) {
            return res.status(400).json({ error: 'Transcrição não fornecida' });
        }

        if (!genAI) {
            return res.status(500).json({ error: 'Gemini AI não configurado' });
        }

        const settings = readSettings();
        const model = genAI.getGenerativeModel({ model: settings.geminiModel });

        const prompt = `Você é um assistente que analisa transcrições de ligações de vendas e extrai informações importantes.

TRANSCRIÇÃO DA LIGAÇÃO:
${transcript}

TAREFA: Analise a ligação e extraia as seguintes informações:

1. **Status da ligação** (escolha APENAS UMA opção):
   - "Contato com o atendente" - se falou apenas com atendente
   - "Contato com o decisor" - se falou com o decisor (dono, gerente, responsável)
   - "Objeção do atendente" - se o atendente bloqueou/não passou a ligação
   - "Objeção do decisor" - se o decisor recusou a proposta
   - "Reunião marcada" - se agendou uma reunião com o decisor
   - "Não contatado ainda" - se não conseguiu falar com ninguém

2. **Horário/Dia que o Decisor Está Presente**:
   - Descrição GERAL de quando o decisor costuma estar (ex: "Ele chega às 14h", "Vem segunda e quarta", "Tarde toda")
   - Use texto LIVRE, não é uma data específica
   - Deixe vazio se não informou

3. **Data e Horário da Reunião**:
   - ATENÇÃO: Use OBRIGATORIAMENTE formato ISO 8601: YYYY-MM-DDTHH:mm
   - Exemplos de conversão:
     * "Segunda-feira, 15/01/2025 às 14h" → "2025-01-15T14:00"
     * "Amanhã às 10h" → calcular data de amanhã e retornar "2025-01-11T10:00"
     * "Dia 20 às 15h30" → "2025-01-20T15:30"
   - Se a data exata NÃO foi mencionada, deixe VAZIO (não invente)
   - NUNCA retorne texto livre, SEMPRE formato ISO ou vazio

4. **Contato Pessoal do Decisor**:
   - Telefone/WhatsApp/celular do decisor
   - Formato OBRIGATÓRIO: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
   - Exemplos: "(11) 98765-4321" ou "(11) 3456-7890"
   - Deixe vazio se não forneceu

5. **Motivo da Objeção do Decisor**:
   - Motivo da recusa do decisor (ex: "Não tem interesse", "Já tem fornecedor", "Sem tempo")
   - Deixe vazio se não houve objeção ou não falou com decisor

6. **Motivo da Objeção do Atendente**:
   - Motivo do bloqueio do atendente (ex: "Decisor não está", "Não aceita ligações de vendas")
   - Deixe vazio se não houve objeção do atendente

REGRAS CRÍTICAS DE FORMATAÇÃO:
✓ diaHorarioReuniao: SEMPRE "YYYY-MM-DDTHH:mm" ou ""
✓ contatoPessoalDecisor: SEMPRE "(XX) XXXXX-XXXX" ou ""
✓ horarioDiaDecisorPresente: texto livre (ex: "Segunda às 14h")
✓ Se não tiver certeza, deixe VAZIO

RETORNE APENAS JSON:
{
  "status": "um dos status listados acima",
  "horarioDiaDecisorPresente": "texto livre ou vazio",
  "diaHorarioReuniao": "YYYY-MM-DDTHH:mm ou vazio",
  "contatoPessoalDecisor": "(XX) XXXXX-XXXX ou vazio",
  "motivoObjecaoDecisor": "motivo ou vazio",
  "motivoObjecaoAtendente": "motivo ou vazio"
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let aiText = response.text().trim();

        // Remover markdown code blocks se houver
        aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const analysis = JSON.parse(aiText);

        console.log('🤖 Análise da IA:', analysis);

        res.json(analysis);
    } catch (error) {
        console.error('❌ Erro ao analisar chamada:', error);
        res.status(500).json({ error: 'Erro ao analisar chamada: ' + error.message });
    }
});

// POST - Salvar chamada aprovada no histórico
app.post('/api/prospects/:id/save-call', async (req, res) => {
    try {
        const { audioBlob, transcript, analysis } = req.body;
        const prospectId = req.params.id;

        if (!transcript) {
            return res.status(400).json({ error: 'Transcrição não fornecida' });
        }

        // Criar registro da chamada
        const callData = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            audioBlob: audioBlob || null,
            transcript: transcript,
            analysis: analysis || {}
        };

        // Adicionar ao histórico
        addCallToHistory(prospectId, callData);

        // Se a análise contém campos, atualizar o prospect
        if (analysis && Object.keys(analysis).length > 0) {
            const prospects = readProspects();
            const prospectIndex = prospects.findIndex(p => p.id === prospectId);

            if (prospectIndex !== -1) {
                // Atualizar status se fornecido
                if (analysis.status) {
                    prospects[prospectIndex].status = analysis.status;
                }

                // Atualizar campos da análise
                const fieldsToUpdate = [
                    'horarioDiaDecisorPresente',
                    'diaHorarioReuniao',
                    'contatoPessoalDecisor',
                    'motivoObjecaoDecisor',
                    'motivoObjecaoAtendente'
                ];

                fieldsToUpdate.forEach(field => {
                    if (analysis[field]) {
                        prospects[prospectIndex][field] = analysis[field];
                    }
                });

                saveProspects(prospects);
                console.log(`✅ Prospect ${prospectId} atualizado com análise da chamada`);
            }
        }

        res.json({ success: true, call: callData });
    } catch (error) {
        console.error('❌ Erro ao salvar chamada:', error);
        res.status(500).json({ error: 'Erro ao salvar chamada: ' + error.message });
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

// ============= ROTAS DE CONFIGURAÇÕES =============

// GET - Obter configurações
app.get('/api/settings', (req, res) => {
    try {
        const settings = readSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao ler configurações' });
    }
});

// POST - Salvar configurações
app.post('/api/settings', (req, res) => {
    try {
        const currentSettings = readSettings();
        const newSettings = {
            ...currentSettings,
            ...req.body
        };
        saveSettings(newSettings);
        res.json(newSettings);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
});

// ============= ROTAS DE PROSPECTS PENDENTES =============

// GET - Listar prospects pendentes
app.get('/api/pending-prospects', (req, res) => {
    try {
        const pendingProspects = readPendingProspects();
        res.json(pendingProspects);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao ler prospects pendentes' });
    }
});

// POST - Salvar prospects pendentes
app.post('/api/pending-prospects', (req, res) => {
    try {
        const { prospects } = req.body;
        savePendingProspects(prospects);
        res.json({ success: true, message: 'Prospects pendentes salvos' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar prospects pendentes' });
    }
});

// DELETE - Limpar prospects pendentes
app.delete('/api/pending-prospects', (req, res) => {
    try {
        savePendingProspects([]);
        res.json({ success: true, message: 'Prospects pendentes limpos' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao limpar prospects pendentes' });
    }
});

// ============= ROTAS DE TIPOS DE ESTABELECIMENTO =============

// GET - Listar tipos de estabelecimento
app.get('/api/business-types', (req, res) => {
    try {
        const types = readBusinessTypes();
        res.json(types);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao ler tipos de estabelecimento' });
    }
});

// POST - Adicionar novo tipo de estabelecimento
app.post('/api/business-types', (req, res) => {
    try {
        const { type } = req.body;

        if (!type || typeof type !== 'string' || type.trim() === '') {
            return res.status(400).json({ error: 'Tipo inválido' });
        }

        const types = readBusinessTypes();
        const normalizedType = type.trim();

        // Verificar se já existe (case-insensitive)
        if (types.some(t => t.toLowerCase() === normalizedType.toLowerCase())) {
            return res.status(400).json({ error: 'Tipo já existe' });
        }

        types.push(normalizedType);
        saveBusinessTypes(types);

        // Atualizar as opções do campo tipoEstabelecimento
        const fields = readFieldsConfig();
        const typeField = fields.find(f => f.id === 'tipoEstabelecimento');
        if (typeField) {
            typeField.options = types;
            saveFieldsConfig(fields);
        }

        res.status(201).json({ type: normalizedType, allTypes: types });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao adicionar tipo de estabelecimento' });
    }
});

// ============= ROTA DE IA - PREENCHIMENTO AUTOMÁTICO =============

// POST - Processar texto com IA e extrair informações
app.post('/api/ai/extract', async (req, res) => {
    try {
        if (!genAI) {
            return res.status(503).json({
                error: 'API do Gemini não configurada. Configure a variável GEMINI_API_KEY no arquivo .env'
            });
        }

        const { text } = req.body;
        const fields = readFieldsConfig();

        if (!text) {
            return res.status(400).json({ error: 'Texto não fornecido' });
        }

        // Preparar prompt para o Gemini
        const fieldDescriptions = fields.map(f =>
            `- ${f.id}: ${f.label} (tipo: ${f.type}${f.options ? ', opções: ' + f.options.join(', ') : ''})`
        ).join('\n');

        const prompt = `Você é um assistente que extrai informações de prospects de texto não estruturado.

Analise o texto abaixo e extraia as informações relevantes para os seguintes campos:

${fieldDescriptions}

Texto para analisar:
"""
${text}
"""

IMPORTANTE:
- Retorne APENAS um objeto JSON válido, sem texto adicional
- Use os IDs dos campos como chaves (ex: "nome", "telefone", etc)
- Se não encontrar informação para um campo, use string vazia ""
- Para campos de seleção, use EXATAMENTE uma das opções fornecidas
- Seja preciso e extraia apenas informações que realmente existem no texto
- Normalize telefones para formato brasileiro se possível
- Normalize Instagram removendo @ se houver

Formato de resposta (JSON válido):
{
  "campo1": "valor extraído",
  "campo2": "valor extraído"
}`;

        const settings = readSettings();
        const model = genAI.getGenerativeModel({ model: settings.geminiModel });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let aiText = response.text();

        // Limpar markdown code blocks se houver
        aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Parsear resposta JSON
        const extractedData = JSON.parse(aiText);

        res.json({
            success: true,
            data: extractedData
        });

    } catch (error) {
        console.error('Erro ao processar com IA:', error);
        res.status(500).json({
            error: 'Erro ao processar texto com IA',
            details: error.message
        });
    }
});

// ============= ROTAS DE AUTOMAÇÃO =============

// Verificar status de login no Instagram
app.get('/api/automation/status', async (req, res) => {
    try {
        const status = await automation.checkLoginStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Abrir navegador para login manual
app.post('/api/automation/login', async (req, res) => {
    try {
        const result = await automation.loginInstagram();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Salvar sessão após login manual
app.post('/api/automation/save-session', async (req, res) => {
    try {
        const result = await automation.saveSession();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Buscar prospects automaticamente com SSE
app.get('/api/automation/search', async (req, res) => {
    const { businessType, city, limit } = req.query;
    const maxProfiles = parseInt(limit) || 10;

    // Configurar SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        sendEvent({ type: 'status', message: 'Iniciando busca no Google...' });

        // Carregar prospects existentes para verificar duplicatas
        const existingProspects = readProspects();
        const existingInstagramUsernames = new Set(
            existingProspects
                .map(p => p.instagram?.toLowerCase().trim())
                .filter(Boolean)
        );
        const existingPhones = new Set(
            existingProspects
                .map(p => p.telefone?.replace(/\D/g, ''))
                .filter(Boolean)
        );

        console.log(`📊 Base de dados: ${existingProspects.length} prospects existentes`);
        console.log(`   - ${existingInstagramUsernames.size} Instagram usernames únicos`);
        console.log(`   - ${existingPhones.size} telefones únicos`);

        const fields = readFieldsConfig();
        const extractedProspects = [];
        const rejectedProspects = [];
        let processedCount = 0;
        const maxIterations = 100; // Limitar para evitar loop infinito

        // Buscar mais perfis do que o necessário para compensar rejeições
        let batchSize = Math.max(20, maxProfiles * 2);

        while (extractedProspects.length < maxProfiles && processedCount < maxIterations) {
            // Buscar perfis do Google
            const instagramProfiles = await automation.searchGoogleForInstagram(businessType, city, batchSize);

            if (instagramProfiles.length === 0) {
                sendEvent({ type: 'status', message: 'Nenhum perfil encontrado no Google' });
                break;
            }

            sendEvent({
                type: 'status',
                message: `Encontrados ${instagramProfiles.length} perfis. Extraindo dados...`
            });

            // Processar cada perfil
            for (let i = 0; i < instagramProfiles.length && extractedProspects.length < maxProfiles; i++) {
                const profile = instagramProfiles[i];
                processedCount++;

                sendEvent({
                    type: 'progress',
                    current: extractedProspects.length,
                    total: maxProfiles,
                    message: `Extraindo dados de @${profile.username}... (${extractedProspects.length}/${maxProfiles})`
                });

                try {
                    // Extrair dados do perfil
                    const rawData = await automation.extractInstagramData(profile.username);

                    if (!rawData) {
                        console.log(`⚠️ Não foi possível extrair dados de @${profile.username}`);
                        continue;
                    }

                    // Verificar duplicatas por Instagram
                    const instagramLower = rawData.instagram?.toLowerCase().trim();
                    if (instagramLower && existingInstagramUsernames.has(instagramLower)) {
                        rejectedProspects.push({
                            username: profile.username,
                            reason: 'Instagram já cadastrado'
                        });
                        console.log(`❌ Rejeitado @${profile.username}: Instagram já existe na base`);
                        continue;
                    }

                    // Verificar duplicatas por telefone (se houver)
                    const phoneDigits = rawData.phone?.replace(/\D/g, '');
                    if (phoneDigits && phoneDigits.length >= 10 && existingPhones.has(phoneDigits)) {
                        rejectedProspects.push({
                            username: profile.username,
                            reason: 'Telefone já cadastrado',
                            phone: rawData.phone
                        });
                        console.log(`❌ Rejeitado @${profile.username}: Telefone ${rawData.phone} já existe na base`);
                        continue;
                    }

                    // Usar IA para estruturar os dados
                    if (genAI) {
                        const fieldDescriptions = fields.map(f =>
                            `- ${f.id}: ${f.label} (tipo: ${f.type}${f.options ? ', opções: ' + f.options.join(', ') : ''})`
                        ).join('\n');

                        const prompt = `Extraia informações deste perfil do Instagram para os seguintes campos:

${fieldDescriptions}

Dados do perfil:
Nome: ${rawData.name}
Instagram: @${rawData.instagram}
Bio: ${rawData.bio}
Telefone encontrado: ${rawData.phone}
Cidade: ${city}

IMPORTANTE:
- Retorne APENAS JSON válido
- Use os IDs dos campos como chaves
- Para "nome", use EXATAMENTE o nome fornecido acima: "${rawData.name}"
- Para "instagram", use apenas o username sem @: "${rawData.instagram}"
- Para "telefone", use: "${rawData.phone}"
- Para "presencaRedeSocial" ou similar, use "Sim" (está no Instagram)
- Para "cidade", use SEMPRE: ${city}
- Se não encontrar info para outros campos, use string vazia

JSON:`;

                        const settings = readSettings();
                        const model = genAI.getGenerativeModel({ model: settings.geminiModel });
                        const result = await model.generateContent(prompt);
                        const response = await result.response;
                        let aiText = response.text();

                        aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

                        try {
                            const structuredData = JSON.parse(aiText);

                            // GARANTIR que dados críticos estão presentes
                            structuredData.nome = rawData.name || structuredData.nome || `Estabelecimento @${rawData.instagram}`;
                            structuredData.instagram = rawData.instagram;
                            structuredData.telefone = rawData.phone || structuredData.telefone || '';
                            structuredData.cidade = city;

                            // Adicionar aos aceitos
                            existingInstagramUsernames.add(instagramLower);
                            if (phoneDigits) existingPhones.add(phoneDigits);

                            extractedProspects.push({
                                id: Date.now().toString() + '-' + Date.now() + '-' + Math.random(),
                                data: structuredData,
                                rawData: rawData,
                                approved: false
                            });

                            sendEvent({
                                type: 'prospect_found',
                                prospect: {
                                    id: Date.now().toString() + '-' + Date.now() + '-' + Math.random(),
                                    data: structuredData,
                                    approved: false
                                }
                            });

                            console.log(`✅ Aceito (${extractedProspects.length}/${maxProfiles}) @${profile.username}: ${structuredData.nome}`);
                        } catch (e) {
                            console.error('Erro ao parsear resposta da IA:', e);
                        }
                    } else {
                        // Sem IA, usar dados brutos
                        const simpleData = {};
                        fields.forEach(field => {
                            if (field.id === 'nome') simpleData[field.id] = rawData.name || `Estabelecimento @${rawData.instagram}`;
                            else if (field.id === 'instagram') simpleData[field.id] = rawData.instagram;
                            else if (field.id === 'telefone') simpleData[field.id] = rawData.phone;
                            else if (field.id === 'cidade') simpleData[field.id] = city;
                            else if (field.id.includes('rede') || field.id.includes('social')) simpleData[field.id] = 'Sim';
                            else simpleData[field.id] = '';
                        });

                        // Adicionar aos aceitos
                        existingInstagramUsernames.add(instagramLower);
                        if (phoneDigits) existingPhones.add(phoneDigits);

                        extractedProspects.push({
                            id: Date.now().toString() + '-' + Date.now() + '-' + Math.random(),
                            data: simpleData,
                            rawData: rawData,
                            approved: false
                        });

                        sendEvent({
                            type: 'prospect_found',
                            prospect: {
                                id: Date.now().toString() + '-' + Date.now() + '-' + Math.random(),
                                data: simpleData,
                                approved: false
                            }
                        });

                        console.log(`✅ Aceito (${extractedProspects.length}/${maxProfiles}) @${profile.username}: ${simpleData.nome}`);
                    }
                } catch (error) {
                    console.error(`Erro ao processar @${profile.username}:`, error);
                }

                // Delay para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            // Se não conseguimos prospects suficientes e a busca retornou poucos resultados
            if (extractedProspects.length < maxProfiles) {
                if (instagramProfiles.length < batchSize) {
                    console.log('⚠️ Não há mais perfis disponíveis no Google');
                    break;
                }
            }
        }

        // Mensagem final
        let finalMessage = `✅ Busca concluída! ${extractedProspects.length} prospects válidos encontrados`;

        if (rejectedProspects.length > 0) {
            finalMessage += `\n\n❌ ${rejectedProspects.length} prospects foram rejeitados automaticamente:`;
            rejectedProspects.slice(0, 10).forEach(r => {
                finalMessage += `\n• @${r.username}: ${r.reason}`;
            });
            if (rejectedProspects.length > 10) {
                finalMessage += `\n... e mais ${rejectedProspects.length - 10} rejeições`;
            }
        }

        sendEvent({
            type: 'complete',
            message: finalMessage,
            totalFound: extractedProspects.length,
            totalRejected: rejectedProspects.length
        });

        res.end();
    } catch (error) {
        console.error('Erro na busca:', error);
        sendEvent({
            type: 'error',
            message: `Erro na busca: ${error.message}`
        });
        res.end();
    }
});

// Aperfeiçoar prospects com dados empresariais
let enhancementClients = [];

app.post('/api/automation/enhance', async (req, res) => {
    const { prospects } = req.body;

    if (!prospects || prospects.length === 0) {
        return res.status(400).json({ error: 'Nenhum prospect fornecido' });
    }

    res.json({ success: true, message: 'Aperfeiçoamento iniciado' });

    // Processar em background
    (async () => {
        try {
            const sendToAllClients = (data) => {
                enhancementClients.forEach(client => {
                    client.write(`data: ${JSON.stringify(data)}\n\n`);
                });
            };

            for (let i = 0; i < prospects.length; i++) {
                const prospect = prospects[i];

                sendToAllClients({
                    type: 'progress',
                    current: i + 1,
                    total: prospects.length,
                    message: `Aperfeiçoando ${prospect.data.nome || 'prospect'}...`
                });

                try {
                    // Aperfeiçoar dados com Puppeteer + IA
                    if (!genAI) {
                        throw new Error('Gemini AI não configurado. Configure GEMINI_API_KEY no .env');
                    }

                    const settings = readSettings();
                    const enhancement = await enhanceProspectData(prospect, genAI, settings.geminiModel);

                    sendToAllClients({
                        type: 'prospect_enhanced',
                        tempId: prospect.tempId,
                        enhancement: enhancement
                    });
                } catch (error) {
                    console.error(`Erro ao aperfeiçoar prospect ${i}:`, error);
                    sendToAllClients({
                        type: 'error',
                        message: `Erro ao aperfeiçoar: ${error.message}`,
                        tempId: prospect.tempId
                    });
                }
            }

            sendToAllClients({
                type: 'complete',
                message: 'Aperfeiçoamento concluído!'
            });
        } catch (error) {
            console.error('Erro no aperfeiçoamento:', error);
            enhancementClients.forEach(client => {
                client.write(`data: ${JSON.stringify({
                    type: 'error',
                    message: error.message
                })}\n\n`);
            });
        }
    })();
});

// SSE para acompanhar progresso do aperfeiçoamento
app.get('/api/automation/enhance-progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    enhancementClients.push(res);

    req.on('close', () => {
        enhancementClients = enhancementClients.filter(client => client !== res);
    });
});

// Fechar navegador
app.post('/api/automation/close', async (req, res) => {
    try {
        await automation.closeBrowser();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
