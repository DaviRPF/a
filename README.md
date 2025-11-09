# 📋 Organizador de Prospects

Aplicação web simples para organizar e gerenciar prospects com diferentes status de contato.

## 🚀 Como Usar

### 1. Instalar Dependências

Primeiro, instale as dependências do Node.js:

```bash
npm install
```

### 2. Iniciar o Servidor

Execute o servidor com o comando:

```bash
npm start
```

O servidor irá iniciar na porta 3000. Você verá a mensagem:
```
🚀 Servidor rodando em http://localhost:3000
📁 Dados salvos em: /caminho/para/prospects.json
```

### 3. Acessar a Aplicação

Abra seu navegador e acesse:
```
http://localhost:3000
```

## 📝 Funcionalidades

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
├── server.js           # Servidor backend Node.js
├── package.json        # Dependências do projeto
├── prospects.json      # Arquivo de dados (criado automaticamente)
└── public/
    ├── index.html     # Interface HTML
    ├── style.css      # Estilos CSS
    └── app.js         # Lógica JavaScript
```

## 🎨 Recursos

- Interface moderna e responsiva
- Persistência de dados em arquivo JSON
- Filtros por status
- Notificações de sucesso/erro
- Design intuitivo e fácil de usar
