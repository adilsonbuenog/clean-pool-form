import { formatPhoneForDisplay, formatMoney, parseMoneyValue } from './validators';
import { ServiceFormData } from '../types/form';

const formatIsoDateToPtBr = (iso: string): string => {
  if (!iso) {
    return '—';
  }

  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) {
    return iso;
  }

  return `${day}/${month}/${year}`;
};

const formatTextOrDash = (value: string): string => {
  const trimmed = value.trim();
  return trimmed ? trimmed : '—';
};

export const formatWhatsAppMessage = (
  data: ServiceFormData & {
    midia_comprobatoria_nomes?: string[];
  },
): string => {
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
  const observacoes = formatTextOrDash(data.observacoes);
  const produtosUsados = formatTextOrDash(data.produtos_usados);
  const casaMaquinaProblemaDesc = formatTextOrDash(data.casa_maquina_problema_descricao);
  const temperaturaAquecimento = formatTextOrDash(data.temperatura_aquecimento_c);
  const qtdCloro = formatTextOrDash(data.qtd_cloro_g);

  const midias = Array.isArray(data.midia_comprobatoria_nomes) ? data.midia_comprobatoria_nomes : [];
  const anexosLinha = midias.length > 0
    ? `\n• *Mídias comprobatórias:* ${midias.join(', ')}`
    : '';

  return `🧾 *Relatório de Serviço — Clean Pool*
• *Cliente:* ${formatTextOrDash(data.cliente_nome)}
• *Data do serviço:* ${formatIsoDateToPtBr(data.data_servico)}
• *Serviço:* ${data.servico}
• *Profissional:* ${data.profissional}
• *Cliente (WhatsApp):* ${telefoneFormatado}
• *pH:* ${formatTextOrDash(data.ph_agua)}
• *Alcalinidade:* ${formatTextOrDash(data.alcalinidade)}
• *Cloro:* ${formatTextOrDash(data.cloro)}
• *Qtd. de cloro (g):* ${qtdCloro}
• *Hidrocálcio:* ${formatTextOrDash(data.hidrocalcio)}
• *Aspiração:* ${formatTextOrDash(data.aspiracao)}
• *Limp. bordas:* ${formatTextOrDash(data.limp_bordas)}
• *Escovação:* ${formatTextOrDash(data.escovacao)}
• *Limp. pré-filtro:* ${formatTextOrDash(data.limp_pre_filtro)}
• *Limp. areia:* ${formatTextOrDash(data.limp_areia)}
• *Casa de máquina com problema?:* ${formatTextOrDash(data.casa_maquina_problema)}
• *Problema (descrição):* ${casaMaquinaProblemaDesc}
• *Conf. registros:* ${formatTextOrDash(data.conf_registros)}
• *Conf. encher pisc.:* ${formatTextOrDash(data.conf_encher_pisc)}
• *Conf. do timer:* ${formatTextOrDash(data.conf_timer)}
• *Conf. capa térmica:* ${formatTextOrDash(data.conf_capa_termica)}
• *Conf. cerca piscina:* ${formatTextOrDash(data.conf_cerca_piscina)}
• *Foi aspirador drenando:* ${formatTextOrDash(data.foi_aspirador_drenando)}
• *Algicida choque adicionado:* ${formatTextOrDash(data.foi_adicionado_algicida_choque)}
• *Foi retrolavado:* ${formatTextOrDash(data.foi_retrolavado)}
• *Temperatura aquecimento (°C):* ${temperaturaAquecimento}
• *Tampa casa máquina fechada:* ${formatTextOrDash(data.tampa_casa_maquina_fechada)}
• *Torneira de água fechada:* ${formatTextOrDash(data.torneira_agua_fechada)}
• *Motor:* ${formatTextOrDash(data.motor)}
• *Valor cobrado:* R$ ${valorFormatado}
• *Produtos usados:* ${produtosUsados}
• *Observação:* ${observacoes}${anexosLinha}

⏱️ *Data/Hora:* ${dateTime}`;
};
