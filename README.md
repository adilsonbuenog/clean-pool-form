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
VITE_WEBHOOK_URL=https://seu-webhook-endpoint.com/api/send
VITE_CLEANPOOL_WHATSAPP=+5544999999999
```

- `VITE_WEBHOOK_URL`: URL do endpoint que receberá os dados e fará o envio para WhatsApp
- `VITE_CLEANPOOL_WHATSAPP`: Número fixo da empresa Clean Pool no formato E.164

## Payload do Webhook

O sistema envia um POST com o seguinte formato:

```json
{
  "recipients": ["+5544991122406", "+5544999999999"],
  "message": "🧾 *Relatório de Serviço — Clean Pool*\n...",
  "data": {
    "servico": "Limpeza de piscina",
    "profissional": "João Silva",
    "telefone_cliente": "+5544991122406",
    "observacoes": "Cliente solicitou limpeza profunda",
    "valor_cobrado": 199.90
  },
  "source": "cleanpool-form"
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
npm run dev
```

## Produção

```bash
npm run build
npm run preview
```

## Design

A interface segue a identidade visual da Clean Pool:

- Cores principais: #60A9DC (azul), #B5D6ED (azul claro)
- Cores de texto: #6D7689, #838B9B
- Fundo: #F6F8FB
- Tipografia: Inter
- Design clean e moderno com bastante espaço em branco
