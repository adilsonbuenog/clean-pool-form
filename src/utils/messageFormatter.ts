import { formatPhoneForDisplay, formatMoney, parseMoneyValue } from './validators';

export const formatWhatsAppMessage = (data: {
  servico: string;
  profissional: string;
  telefone_cliente: string;
  observacoes: string;
  valor_cobrado: string;
}): string => {
  const now = new Date();
  const dateTime = now.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const valorFormatado = formatMoney(parseMoneyValue(data.valor_cobrado));
  const telefoneFormatado = formatPhoneForDisplay(data.telefone_cliente);
  const observacoes = data.observacoes.trim() || '—';

  return `🧾 *Relatório de Serviço — Clean Pool*
• *Serviço:* ${data.servico}
• *Profissional:* ${data.profissional}
• *Cliente (WhatsApp):* ${telefoneFormatado}
• *Valor cobrado:* R$ ${valorFormatado}
• *Observações:* ${observacoes}

⏱️ *Data/Hora:* ${dateTime}`;
};
