import { useState, FormEvent } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { FormInput } from './FormInput';
import { FormTextarea } from './FormTextarea';
import { FormSelect } from './FormSelect';
import { ServiceFormData, WebhookPayload, FormStatus } from '../types/form';
import { normalizePhoneNumber, validatePhone, validateMoney, parseMoneyValue } from '../utils/validators';
import { formatWhatsAppMessage } from '../utils/messageFormatter';

const SERVICE_OPTIONS = [
  { value: 'Limpeza de piscina', label: 'Limpeza de piscina' },
  { value: 'Tratamento químico', label: 'Tratamento químico' },
  { value: 'Manutenção de filtro', label: 'Manutenção de filtro' },
  { value: 'Manutenção de bomba', label: 'Manutenção de bomba' },
  { value: 'Aspiração', label: 'Aspiração' },
  { value: 'Análise de água', label: 'Análise de água' },
  { value: 'Outro', label: 'Outro' },
];

export const ServiceForm = () => {
  const [formData, setFormData] = useState<ServiceFormData>({
    servico: '',
    profissional: '',
    telefone_cliente: '',
    observacoes: '',
    valor_cobrado: '',
  });

  const [servicoOutro, setServicoOutro] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceFormData, string>>>({});
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (field: keyof ServiceFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ServiceFormData, string>> = {};

    const servicoFinal = formData.servico === 'Outro' ? servicoOutro : formData.servico;
    if (!servicoFinal.trim()) {
      newErrors.servico = 'Campo obrigatório';
    }

    if (!formData.profissional.trim()) {
      newErrors.profissional = 'Campo obrigatório';
    }

    if (!formData.telefone_cliente.trim()) {
      newErrors.telefone_cliente = 'Campo obrigatório';
    } else if (!validatePhone(formData.telefone_cliente)) {
      newErrors.telefone_cliente = 'Telefone inválido';
    }

    if (!formData.valor_cobrado.trim()) {
      newErrors.valor_cobrado = 'Campo obrigatório';
    } else if (!validateMoney(formData.valor_cobrado)) {
      newErrors.valor_cobrado = 'Valor deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sendWebhook = async (payload: WebhookPayload): Promise<void> => {
    const webhookUrl = import.meta.env.VITE_WEBHOOK_URL;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Falha ao enviar dados');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const servicoFinal = formData.servico === 'Outro' ? servicoOutro : formData.servico;
      const telefoneNormalizado = normalizePhoneNumber(formData.telefone_cliente);
      const cleanpoolWhatsApp = import.meta.env.VITE_CLEANPOOL_WHATSAPP;

      const formDataWithService = {
        ...formData,
        servico: servicoFinal,
      };

      const message = formatWhatsAppMessage(formDataWithService);

      const payload: WebhookPayload = {
        recipients: [telefoneNormalizado, cleanpoolWhatsApp],
        message,
        data: {
          servico: servicoFinal,
          profissional: formData.profissional,
          telefone_cliente: telefoneNormalizado,
          observacoes: formData.observacoes,
          valor_cobrado: parseMoneyValue(formData.valor_cobrado),
        },
        source: 'cleanpool-form',
      };

      await sendWebhook(payload);

      setStatus('success');
      setFormData({
        servico: '',
        profissional: '',
        telefone_cliente: '',
        observacoes: '',
        valor_cobrado: '',
      });
      setServicoOutro('');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao enviar formulário');
    }
  };

  const handleRetry = () => {
    setStatus('idle');
    setErrorMessage('');
  };

  if (status === 'success') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg mx-auto text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-[#6D7689] mb-2">Enviado com sucesso!</h2>
        <p className="text-[#838B9B] mb-6">
          O relatório foi enviado para o cliente e para a Clean Pool.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="px-6 py-3 bg-[#60A9DC] text-white rounded-xl font-medium hover:bg-[#4E96C9] transition-colors"
        >
          Novo registro
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 md:p-8 max-w-2xl mx-auto">
      <div className="space-y-5">
        <div className="grid md:grid-cols-2 gap-5">
          <FormSelect
            label="Serviço prestado"
            options={SERVICE_OPTIONS}
            value={formData.servico}
            onChange={(e) => handleChange('servico', e.target.value)}
            error={errors.servico}
            required
          />

          <FormInput
            label="Nome do profissional"
            type="text"
            value={formData.profissional}
            onChange={(e) => handleChange('profissional', e.target.value)}
            error={errors.profissional}
            placeholder="Ex: João Silva"
            required
          />
        </div>

        {formData.servico === 'Outro' && (
          <FormInput
            label="Descreva o serviço"
            type="text"
            value={servicoOutro}
            onChange={(e) => setServicoOutro(e.target.value)}
            placeholder="Ex: Instalação de aquecedor"
            required
          />
        )}

        <div className="grid md:grid-cols-2 gap-5">
          <FormInput
            label="Telefone do cliente"
            type="tel"
            value={formData.telefone_cliente}
            onChange={(e) => handleChange('telefone_cliente', e.target.value)}
            error={errors.telefone_cliente}
            placeholder="(44) 99112-2406"
            required
          />

          <FormInput
            label="Valor cobrado"
            type="text"
            value={formData.valor_cobrado}
            onChange={(e) => handleChange('valor_cobrado', e.target.value)}
            error={errors.valor_cobrado}
            placeholder="199,90"
            required
          />
        </div>

        <FormTextarea
          label="Observações"
          value={formData.observacoes}
          onChange={(e) => handleChange('observacoes', e.target.value)}
          placeholder="Informações adicionais (opcional)"
        />

        {status === 'error' && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700">{errorMessage}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="text-sm text-red-600 hover:text-red-700 font-medium mt-1 underline"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-6 py-3.5 bg-[#60A9DC] text-white rounded-xl font-medium hover:bg-[#4E96C9] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar'
          )}
        </button>
      </div>
    </form>
  );
};
