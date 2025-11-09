# Configuração da Google Custom Search API

Para usar o sistema de aperfeiçoamento de prospects com Tool Calling, você precisa configurar a Google Custom Search API.

## Passo a Passo

### 1. Criar API Key

1. Acesse o [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto ou selecione um existente
3. Vá em **APIs & Services** > **Library**
4. Procure por **Custom Search API** e clique em **Enable**
5. Vá em **APIs & Services** > **Credentials**
6. Clique em **Create Credentials** > **API Key**
7. Copie a API Key gerada

### 2. Criar Custom Search Engine

1. Acesse [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Clique em **Add** para criar um novo search engine
3. Configure:
   - **Nome**: Prospect Search (ou qualquer nome)
   - **What to search**: Search the entire web
   - **Search settings**: Ative "Search the entire web"
4. Clique em **Create**
5. Após criar, clique em **Control Panel**
6. Copie o **Search engine ID** (cx)

### 3. Configurar no .env

Adicione as seguintes variáveis no arquivo `.env`:

```env
GOOGLE_SEARCH_API_KEY=sua_api_key_aqui
GOOGLE_SEARCH_ENGINE_ID=seu_search_engine_id_aqui
```

### 4. Limites e Custos

- **Gratuito**: 100 consultas/dia
- **Pago**: $5 por 1000 consultas adicionais

Para aumentar o limite:
1. Vá em [Google Cloud Console](https://console.cloud.google.com)
2. Acesse **APIs & Services** > **Custom Search API**
3. Configure billing e aumente o quota

## Como Funciona

O sistema agora usa **Tool Calling do Gemini** ao invés do Puppeteer para aperfeiçoamento:

1. **Gemini decide** quando fazer buscas no Google
2. **Sua aplicação executa** a busca via Google Custom Search API
3. **Gemini analisa** os resultados e extrai dados estruturados
4. **Mais rápido e confiável** que web scraping

### Vantagens

- ✅ Sem necessidade de Puppeteer para aperfeiçoamento
- ✅ Mais rápido (sem renderizar páginas)
- ✅ Mais confiável (sem problemas de captcha)
- ✅ Melhor qualidade de dados (Gemini escolhe as melhores fontes)
- ✅ Funciona 100% via API

## Troubleshooting

### "Google Custom Search não configurado"

Verifique se você configurou corretamente as variáveis:
```bash
echo $GOOGLE_SEARCH_API_KEY
echo $GOOGLE_SEARCH_ENGINE_ID
```

### "Quota exceeded"

Você atingiu o limite de 100 consultas/dia gratuitas. Configure billing ou aguarde até o próximo dia.

### "API key not valid"

Verifique se:
1. A API Key está correta
2. A Custom Search API está habilitada no projeto
3. Não há restrições de IP/domínio na API Key
