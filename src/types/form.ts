export interface ServiceFormData {
  servico: string;
  profissional: string;
  telefone_cliente: string;
  observacoes: string;
  valor_cobrado: string;
}

export interface WebhookPayload {
  recipients: string[];
  message: string;
  data: {
    servico: string;
    profissional: string;
    telefone_cliente: string;
    observacoes: string;
    valor_cobrado: number;
  };
  source: string;
}

export type FormStatus = 'idle' | 'loading' | 'success' | 'error';
