# Como Configurar o 2Captcha para Resolução Automática

O 2Captcha é um serviço que resolve captchas automaticamente. Siga os passos abaixo para configurar:

## Passo 1: Criar Conta

1. Acesse: https://2captcha.com
2. Clique em **"Sign Up"** (Registrar)
3. Preencha:
   - Email
   - Senha
   - Confirme que não é um robô
4. Confirme seu email

## Passo 2: Adicionar Crédito

O serviço funciona por créditos pré-pagos:

1. Faça login em https://2captcha.com
2. Clique em **"Balance"** no menu superior
3. Clique em **"Add funds"**
4. Escolha quanto adicionar:
   - **$3** = ~1000 captchas resolvidos
   - **$10** = ~3333 captchas resolvidos
   - **$20** = ~6666 captchas resolvidos
5. Escolha método de pagamento:
   - Cartão de crédito
   - Criptomoeda
   - PayPal
   - PIX (via alguns intermediários)

### Custo por Captcha

- **ReCaptcha v2**: $0.003 (~R$0,015)
- **ReCaptcha v3**: $0.003 (~R$0,015)
- Extremamente barato para automação!

## Passo 3: Copiar API Key

1. Acesse: https://2captcha.com/enterpage
2. No painel principal, você verá sua **API key**
3. Ela será algo como: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
4. Clique no ícone de copiar

## Passo 4: Configurar no Projeto

1. Abra o arquivo `.env` na raiz do projeto (se não existir, crie)
2. Adicione a linha:

```
TWOCAPTCHA_TOKEN=sua_chave_aqui
```

3. Substitua `sua_chave_aqui` pela API key que você copiou
4. Salve o arquivo

Exemplo de `.env` completo:

```
GEMINI_API_KEY=AIzaSyC...
TWOCAPTCHA_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

## Passo 5: Reiniciar Servidor

1. Pare o servidor (Ctrl+C)
2. Rode novamente:

```bash
npm start
```

## Verificando se Está Funcionando

Quando você fizer uma busca que encontrar captcha, verá nos logs:

### Com 2captcha configurado:
```
Buscando no Google: Pizzaria manaus instagram
✅ Captcha resolvido automaticamente! 1 captcha(s)
Encontrados 8 perfis do Instagram
```

### Sem 2captcha configurado:
```
Buscando no Google: Pizzaria manaus instagram
⚠️ Plugin de captcha não configurado ou token não fornecido
Aguardando 30 segundos para resolução manual do captcha...
```

## Resolução Manual (Sem 2captcha)

Se você **não** configurar o 2captcha:

1. O navegador abrirá normalmente
2. Quando aparecer captcha, você terá **30 segundos** para resolver manualmente
3. Resolva o captcha marcando a caixinha
4. A busca continuará automaticamente

## Monitorar Créditos

Para ver quanto você gastou:

1. Acesse: https://2captcha.com/enterpage
2. Veja o **Balance** no topo
3. Histórico em **"Statistics"**

## Dúvidas Comuns

**Q: É seguro?**
R: Sim, 2captcha é um serviço legítimo usado por milhares de desenvolvedores.

**Q: Quanto custa em média?**
R: Se você fizer 100 buscas por dia, gastará ~$0.30/dia = $9/mês

**Q: Posso usar sem 2captcha?**
R: Sim! O sistema aguardará 30 segundos para você resolver manualmente.

**Q: Funciona em todos os captchas?**
R: Sim, funciona em ReCaptcha v2 e v3 do Google.

**Q: Demora quanto tempo?**
R: Em média 20-30 segundos por captcha.
