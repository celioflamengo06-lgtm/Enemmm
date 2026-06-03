# Instruções para Deploy na Netlify

## Passo 1: Criar conta na Netlify
1. Acesse https://app.netlify.com
2. Faça login com GitHub, GitLab, ou email

## Passo 2: Conectar repositório
1. Clique em "Add new site" → "Import an existing project"
2. Conecte com seu provedor Git (GitHub, GitLab, etc.)
3. Selecione o repositório deste projeto

## Passo 3: Configurar variáveis de ambiente
No painel da Netlify, vá para:
**Site settings** → **Build & deploy** → **Environment**

Adicione as seguintes variáveis:

```
CPF_API_TOKEN=seu_token_aqui
GOTHAM_CLIENT_ID=seu_client_id_aqui
GOTHAM_CLIENT_SECRET=seu_client_secret_aqui
SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_KEY=sua_service_key_supabase
```

## Passo 4: Configurações de build
A Netlify já detectará automaticamente:
- **Build command:** `npm run build`
- **Publish directory:** `public`

## Passo 5: Fazer deploy
1. Clique em "Deploy site"
2. Aguarde o build completar
3. Seu site estará disponível em `https://seu-site.netlify.app`

## Estrutura configurada

### Arquivos criados:
1. **netlify.toml** - Configuração do Netlify
2. **netlify/functions/cpf.js** - Função para consulta de CPF
3. **netlify/functions/pix.js** - Função para gerar PIX

### Endpoints da API:
- `GET /api/cpf?cpf=12345678901` - Consulta CPF
- `POST /api/pix` - Gera PIX (body: {nome, cpf})

### Frontend:
- O frontend estático (React) será servido do diretório `public`
- Todas as rotas redirecionam para `index.html` (SPA)

## Testando localmente (opcional)
Para testar as funções localmente:

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Iniciar servidor local
netlify dev
```

## Observações importantes:
1. O projeto usa **Netlify Functions** em vez de servidor Express tradicional
2. As funções são serverless e escalam automaticamente
3. Certifique-se de que todas as variáveis de ambiente estão configuradas corretamente
4. O frontend já está compilado na pasta `public/`

## Suporte:
- Documentação Netlify: https://docs.netlify.com/
- Netlify Functions: https://docs.netlify.com/functions/overview/
- Problemas com build: Verifique os logs no painel da Netlify