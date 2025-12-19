# Exemplo de Implementação do Webhook

Este documento descreve como implementar o endpoint webhook que receberá os dados do formulário Clean Pool e enviará as mensagens para WhatsApp.

## Payload Recebido

O formulário envia um POST request com o seguinte payload:

```json
{
  "recipients": ["+5544991122406", "+5544999999999"],
  "message": "🧾 *Relatório de Serviço — Clean Pool*\n• *Serviço:* Limpeza de piscina\n• *Profissional:* João Silva\n• *Cliente (WhatsApp):* +55 (44) 99112-2406\n• *Valor cobrado:* R$ 199,90\n• *Observações:* Cliente solicitou limpeza profunda\n\n⏱️ *Data/Hora:* 19/12/2025 14:30",
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

## Integração com WhatsApp

Você pode integrar com diferentes provedores de API do WhatsApp:

### 1. WhatsApp Business API Oficial
### 2. Twilio API para WhatsApp
### 3. MessageBird
### 4. Outras plataformas de mensageria

## Exemplo de Implementação (Node.js + Express)

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/send', async (req, res) => {
  try {
    const { recipients, message, data, source } = req.body;

    // Validar source
    if (source !== 'cleanpool-form') {
      return res.status(403).json({ error: 'Invalid source' });
    }

    // Enviar para cada destinatário
    for (const recipient of recipients) {
      await sendWhatsAppMessage(recipient, message);
    }

    // Opcional: Salvar registro no banco de dados
    await saveServiceRecord(data);

    res.json({ success: true, message: 'Mensagens enviadas com sucesso' });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagens' });
  }
});

async function sendWhatsAppMessage(phone, message) {
  // Implementar integração com sua API de WhatsApp escolhida
  // Exemplo com Twilio:
  /*
  const client = require('twilio')(accountSid, authToken);

  await client.messages.create({
    from: 'whatsapp:+14155238886',
    body: message,
    to: `whatsapp:${phone}`
  });
  */
}

async function saveServiceRecord(data) {
  // Opcional: Salvar no banco de dados para histórico
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
```

## Segurança

1. **CORS**: Configure CORS adequadamente para aceitar apenas requisições do seu domínio
2. **Validação**: Sempre valide o campo `source` para garantir que a requisição vem do formulário Clean Pool
3. **Rate Limiting**: Implemente rate limiting para evitar abuso
4. **Autenticação**: Considere adicionar um token de autenticação nas requisições
5. **HTTPS**: Use sempre HTTPS em produção

## Testando o Webhook

Você pode testar o webhook usando curl:

```bash
curl -X POST https://seu-webhook-endpoint.com/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": ["+5544991122406", "+5544999999999"],
    "message": "🧾 *Relatório de Serviço — Clean Pool*\n• *Serviço:* Teste\n• *Profissional:* João\n• *Cliente (WhatsApp):* +55 (44) 99112-2406\n• *Valor cobrado:* R$ 100,00\n• *Observações:* Teste\n\n⏱️ *Data/Hora:* 19/12/2025 14:30",
    "data": {
      "servico": "Teste",
      "profissional": "João",
      "telefone_cliente": "+5544991122406",
      "observacoes": "Teste",
      "valor_cobrado": 100.00
    },
    "source": "cleanpool-form"
  }'
```

## Próximos Passos

1. Escolha um provedor de API do WhatsApp
2. Configure as credenciais do provedor
3. Implemente o endpoint webhook seguindo o exemplo acima
4. Configure a URL do webhook no arquivo `.env` do frontend
5. Teste o fluxo completo
