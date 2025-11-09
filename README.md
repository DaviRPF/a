# 📋 Organizador de Prospects

Aplicação web profissional construída com **React** e **Node.js** para organizar e gerenciar prospects com diferentes status de contato.

## ✨ Tecnologias

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Estilização**: CSS3 com animações e gradientes
- **HTTP Client**: Axios
- **Persistência**: Arquivo JSON no servidor

## 🚀 Como Usar

### 1. Instalar Dependências

Primeiro, instale as dependências do projeto:

```bash
npm install
```

### 2. Modo Desenvolvimento

Para desenvolvimento, rode o frontend e backend simultaneamente:

```bash
npm run dev
```

Isso irá:
- Iniciar o servidor backend na porta **3000**
- Iniciar o Vite dev server na porta **5173**
- Abrir automaticamente o navegador em `http://localhost:5173`

### 3. Modo Produção

Para usar em produção:

**Passo 1:** Fazer o build do React:
```bash
npm run build
```

**Passo 2:** Iniciar o servidor:
```bash
npm start
```

**Passo 3:** Acessar em `http://localhost:3000`

### 4. Configurar IA (Opcional - mas recomendado!)

Para usar o recurso de **preenchimento automático com IA**, configure a API do Google Gemini:

**Passo 1:** Obtenha sua chave de API gratuita:
- Acesse: https://makersuite.google.com/app/apikey
- Faça login com sua conta Google
- Clique em "Create API Key"
- Copie a chave gerada

**Passo 2:** Crie um arquivo `.env` na raiz do projeto:
```bash
cp .env.example .env
```

**Passo 3:** Edite o arquivo `.env` e adicione sua chave:
```
GEMINI_API_KEY=sua_chave_api_aqui
```

**Passo 4:** Reinicie o servidor para aplicar as mudanças

## 📝 Funcionalidades

### 🤖 Preencher com IA (NOVO!)

O recurso mais poderoso da aplicação! Permite preencher automaticamente os campos do prospect usando inteligência artificial:

1. Clique no botão **"🤖 Preencher com IA"** acima do formulário
2. Cole ou digite qualquer texto com informações do prospect (pode ser uma mensagem, anotações, conversa do WhatsApp, etc.)
3. Clique em **"Processar com IA"**
4. A IA do Gemini irá extrair automaticamente as informações e preencher os campos!

**Exemplo de texto que você pode colar:**
```
Pizzaria do João
Tel: (11) 98765-4321
Instagram: @pizzariadojoao
Eles têm presença nas redes sociais e querem aumentar as vendas
```

A IA entende contexto e extrai informações mesmo de textos não estruturados! ✨

### Adicionar Prospect
1. Preencha o formulário com as informações do prospect:
   - Nome do Estabelecimento (obrigatório)
   - Telefone (obrigatório)
   - Instagram (opcional)
   - Google Meu Negócio (opcional)
   - Presença na Rede Social (obrigatório: Sim/Não)

2. Clique em "Adicionar Prospect"

### Gerenciar Status
Cada prospect pode ter um dos seguintes status:
- Não contatado ainda (status inicial)
- Contato com atendente
- Contato com decisor
- Continuidade do whatsapp
- Reunião marcada
- Objeção da atendente
- Objeção do decisor

Para alterar o status, basta selecionar a nova opção no dropdown de cada prospect.

### Filtrar Prospects
Use o filtro na seção "Filtrar por Status" para visualizar apenas prospects com um status específico.

### Remover Prospect
Clique no botão "Remover" em qualquer prospect para deletá-lo permanentemente.

## 💾 Armazenamento de Dados

Os dados são salvos automaticamente no arquivo `prospects.json` na raiz do projeto. Este arquivo é criado automaticamente na primeira execução.

**IMPORTANTE**: Os dados são persistidos em arquivo, não no localStorage do navegador, então seus dados estarão seguros mesmo após fechar o navegador.

## 🛑 Parar o Servidor

Para parar o servidor, pressione `Ctrl + C` no terminal onde ele está rodando.

## 📋 Requisitos

- Node.js versão 12 ou superior
- npm (geralmente vem com Node.js)

## 🔧 Estrutura do Projeto

```
prospect-organizer/
├── server.js                  # Servidor backend Node.js + Express
├── package.json               # Dependências e scripts
├── vite.config.js            # Configuração do Vite
├── index.html                # Template HTML
├── prospects.json            # Arquivo de dados (criado automaticamente)
├── src/
│   ├── main.jsx              # Entry point do React
│   ├── App.jsx               # Componente principal
│   ├── components/           # Componentes React
│   │   ├── ProspectForm.jsx
│   │   ├── ProspectCard.jsx
│   │   ├── ProspectList.jsx
│   │   ├── StatusFilter.jsx
│   │   └── Toast.jsx
│   ├── services/             # Serviços de API
│   │   └── api.js
│   └── styles/               # Arquivos CSS
│       ├── index.css
│       ├── App.css
│       ├── ProspectForm.css
│       ├── ProspectCard.css
│       ├── ProspectList.css
│       ├── StatusFilter.css
│       └── Toast.css
└── dist/                     # Build de produção (gerado)
```

## 🎨 Recursos

- ⚛️ Interface moderna construída com React
- 🎨 Design responsivo com gradientes e animações
- 💾 Persistência de dados em arquivo JSON no servidor
- 🔍 Filtros por status em tempo real
- 🔔 Notificações toast de sucesso/erro
- ⚡ Performance otimizada com Vite
- 📱 Totalmente responsivo para mobile
- 🎯 Gerenciamento de estado com React Hooks
- 🔄 Hot Module Replacement (HMR) em desenvolvimento
