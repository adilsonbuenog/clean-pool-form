export type YesNo = '' | 'Sim' | 'Não';
export type MotorStatus = '' | 'Ligado' | 'Desligado';

export interface ServiceFormData {
  servico: string;
  profissional: string;
  cliente_nome: string;
  data_servico: string;
  telefone_cliente: string;
  ph_agua: string;
  alcalinidade: string;
  cloro: YesNo;
  qtd_cloro_g: string;
  hidrocalcio: YesNo;
  aspiracao: YesNo;
  limp_bordas: YesNo;
  escovacao: YesNo;
  limp_pre_filtro: YesNo;
  limp_areia: YesNo;
  casa_maquina_problema: YesNo;
  casa_maquina_problema_descricao: string;
  conf_registros: YesNo;
  conf_encher_pisc: YesNo;
  conf_timer: YesNo;
  conf_capa_termica: YesNo;
  conf_cerca_piscina: YesNo;
  foi_aspirador_drenando: YesNo;
  foi_adicionado_algicida_choque: YesNo;
  foi_retrolavado: YesNo;
  temperatura_aquecimento_c: string;
  tampa_casa_maquina_fechada: YesNo;
  torneira_agua_fechada: YesNo;
  motor: MotorStatus;
  produtos_usados: string;
  observacoes: string;
  valor_cobrado: string;
}

export interface WebhookPayload {
  number: string;
  message: string;
  id?: string;
  contextInfo?: {
    StanzaId: string;
    Participant: string;
  };
}

export interface MediaWebhookPayload {
  number: string;
  fileUrl: string;
  message: string;
  type: 'image' | 'video' | 'audio' | 'document';
  fileName: string;
}

export type FormStatus = 'idle' | 'loading' | 'success' | 'error';
