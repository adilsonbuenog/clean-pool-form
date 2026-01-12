# Clean Pool - Sistema de Registro de Serviços

Aplicação web responsiva para registro de serviços prestados pela Clean Pool, com envio automático de relatórios via WhatsApp.

## Funcionalidades

- Formulário responsivo (mobile-first) para registro de serviços
- Validação completa de campos obrigatórios
- Normalização automática de números de telefone para formato E.164
- Formatação de valores monetários em BRL
- Envio simultâneo para cliente e empresa via webhook
- Estados de loading, sucesso e erro com opção de retry
- Interface clean e moderna seguindo a identidade visual da Clean Pool

## Campos do Formulário

1. **Serviço prestado** (obrigatório) - Select com opções predefinidas + campo "Outro"
2. **Nome do profissional** (obrigatório) - Texto
3. **Telefone do cliente** (obrigatório) - Telefone com validação, aceita formato brasileiro
4. **Valor cobrado** (obrigatório) - Valor em BRL, aceita "199,90" ou "199.90"
5. **Observações** (opcional) - Textarea para informações adicionais

## Configuração

Antes de usar, configure as variáveis de ambiente no arquivo `.env`:

```env
AVISA_API_BASE_URL=https://www.avisaapi.com.br/api
AVISA_API_TOKEN=seu-token-aqui

# Supabase (login)
SUPABASE_URL=seu-project-url
SUPABASE_SERVICE_ROLE_KEY=sua-service-role
SUPABASE_USERS_TABLE=usuarios

# Sessão do app
AUTH_SESSION_SECRET=um-segredo-grande

VITE_S3_PRESIGN_URL=/api/s3/presign
```

- `AVISA_API_BASE_URL`: Base URL da Avisa API
- `AVISA_API_TOKEN`: Token usado no backend para chamar a Avisa API (recomendado para não expor o token no frontend)
- `SUPABASE_URL`: Project URL do Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key do Supabase (somente backend)
- `SUPABASE_USERS_TABLE`: Tabela onde estão `email`, `senha`, `uuid`, `role` (padrão: `usuarios`)
- `SUPABASE_REPORTS_TABLE`: Tabela onde ficam os relatórios enviados (padrão: `relatorios`)
- `AUTH_SESSION_SECRET`: Segredo usado para assinar o token de sessão do login
- `VITE_S3_PRESIGN_URL`: Endpoint do backend que gera URLs assinadas (presign) para upload

Obs.: o frontend chama `/api/actions/sendMessage` e `/api/actions/sendMedia` no seu backend, que faz o proxy para a Avisa API.

## Painel Admin (Kanban)

Usuários com role `admin` veem um painel em tempo real com os relatórios em 3 etapas: `received` → `approved` → `rejected`.

### Tabela de relatórios (Supabase)

Crie uma tabela (padrão: `relatorios`) com as colunas abaixo:

- `id` (uuid, PK)
- `status` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `payload` (jsonb) — contém todos os dados do envio + mídias

## Payload da API (Avisa API)

### Texto (`/actions/sendMessage`)

```json
{
  "number": "5551999999999",
  "message": "Sua mensagem aqui"
}
```

### Mídia (`/actions/sendMedia`)

```json
{
  "number": "5551999999999",
  "fileUrl": "https://www.avisaapp.com.br/site/oficial/logo.png",
  "message": "Legenda da mensagem",
  "type": "image",
  "fileName": "name.jpg"
}
```

## Tecnologias

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Lucide React (ícones)
- Google Fonts (Inter)

## Desenvolvimento

```bash
npm install
npm run api
npm run dev
```

## Produção

```bash
npm run build
npm run preview
```

## Docker (VPS)

1. Crie `.env` baseado em `.env.example` e preencha `AVISA_API_TOKEN` e as variáveis do S3.
2. Suba os containers:

```bash
docker compose up -d --build
```

3. Acesse `http://IP_DA_VPS/`.

## Design

A interface segue a identidade visual da Clean Pool:

- Cores principais: #60A9DC (azul), #B5D6ED (azul claro)
- Cores de texto: #6D7689, #838B9B
- Fundo: #F6F8FB
- Tipografia: Inter
- Design clean e moderno com bastante espaço em branco
