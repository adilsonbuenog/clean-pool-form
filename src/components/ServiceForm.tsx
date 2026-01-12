import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { FormInput } from './FormInput';
import { FormTextarea } from './FormTextarea';
import { FormSelect } from './FormSelect';
import { ServiceFormData, WebhookPayload, MediaWebhookPayload, FormStatus } from '../types/form';
import { normalizePhoneNumber, validatePhone, validateMoney, validateNumber } from '../utils/validators';
import { formatWhatsAppMessage } from '../utils/messageFormatter';
import { getSessionToken } from '../auth/session';

const SERVICE_OPTIONS = [
  { value: 'Limpeza de piscina', label: 'Limpeza de piscina' },
  { value: 'Tratamento químico', label: 'Tratamento químico' },
  { value: 'Manutenção de filtro', label: 'Manutenção de filtro' },
  { value: 'Manutenção de bomba', label: 'Manutenção de bomba' },
  { value: 'Aspiração', label: 'Aspiração' },
  { value: 'Análise de água', label: 'Análise de água' },
  { value: 'Outro', label: 'Outro' },
];

const YES_NO_OPTIONS = [
  { value: 'Sim', label: 'Sim' },
  { value: 'Não', label: 'Não' },
];

const MOTOR_OPTIONS = [
  { value: 'Ligado', label: 'Ligado' },
  { value: 'Desligado', label: 'Desligado' },
];

export const ServiceForm = () => {
  const [formData, setFormData] = useState<ServiceFormData>({
    servico: '',
    profissional: '',
    cliente_nome: '',
    data_servico: '',
    telefone_cliente: '',
    ph_agua: '',
    alcalinidade: '',
    cloro: '',
    qtd_cloro_g: '',
    hidrocalcio: '',
    aspiracao: '',
    limp_bordas: '',
    escovacao: '',
    limp_pre_filtro: '',
    limp_areia: '',
    casa_maquina_problema: '',
    casa_maquina_problema_descricao: '',
    conf_registros: '',
    conf_encher_pisc: '',
    conf_timer: '',
    conf_capa_termica: '',
    conf_cerca_piscina: '',
    foi_aspirador_drenando: '',
    foi_adicionado_algicida_choque: '',
    foi_retrolavado: '',
    temperatura_aquecimento_c: '',
    tampa_casa_maquina_fechada: '',
    torneira_agua_fechada: '',
    motor: '',
    produtos_usados: '',
    observacoes: '',
    valor_cobrado: '',
  });

  const [servicoOutro, setServicoOutro] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceFormData, string>>>({});
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [comprovatoriosFiles, setComprovatoriosFiles] = useState<File[]>([]);
  const [comprovatoriosError, setComprovatoriosError] = useState('');
  const comprovatoriosInputRef = useRef<HTMLInputElement | null>(null);
  const MAX_MEDIA_BYTES = 2 * 1024 * 1024 * 1024;

  const getResponseErrorMessage = async (response: Response): Promise<string> => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const data = (await response.json()) as { error?: string; message?: string };
        if (typeof data?.error === 'string' && data.error.trim()) {
          return data.error.trim();
        }
        if (typeof data?.message === 'string' && data.message.trim()) {
          return data.message.trim();
        }
      } catch {
        // ignore
      }
    }

    try {
      const text = (await response.text()).trim();
      return text || `HTTP ${response.status}`;
    } catch {
      return `HTTP ${response.status}`;
    }
  };

  const mapFetchError = (error: unknown, hint: string): Error => {
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      return new Error(`Falha de rede ("Failed to fetch"). ${hint}`);
    }
    return error instanceof Error ? error : new Error(hint);
  };

  const resolveAvisaApiUrl = (actionPath: '/actions/sendMessage' | '/actions/sendMedia'): string => {
    const baseUrl = import.meta.env.VITE_UAZAPI_BASE_URL as string | undefined;
    if (baseUrl && baseUrl.trim()) {
      return `${baseUrl.replace(/\/+$/, '')}${actionPath}`;
    }

    const explicitUrl = actionPath === '/actions/sendMessage'
      ? (import.meta.env.VITE_UAZAPI_TEXT_URL as string | undefined)
      : (import.meta.env.VITE_UAZAPI_MEDIA_URL as string | undefined);
    if (explicitUrl && explicitUrl.trim()) {
      return explicitUrl.trim();
    }

    return actionPath === '/actions/sendMessage'
      ? '/api/actions/sendMessage'
      : '/api/actions/sendMedia';
  };

  const buildApiHeaders = (webhookUrl: string): Record<string, string> => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const isAbsoluteHttp = /^https?:\/\//i.test(webhookUrl);
    const useAvisaToken = (() => {
      if (!isAbsoluteHttp) {
        return false;
      }
      try {
        const host = new URL(webhookUrl).hostname.toLowerCase();
        return host.includes('avisaapi.com.br');
      } catch {
        return false;
      }
    })();

    if (!useAvisaToken) {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        throw new Error('Você precisa estar logado para enviar.');
      }
      headers.Authorization = `Bearer ${sessionToken}`;
      return headers;
    }

    const token = import.meta.env.VITE_UAZAPI_TOKEN as string | undefined;
    if (!token || !token.trim()) {
      throw new Error('Token da API não configurado (VITE_UAZAPI_TOKEN)');
    }

    headers.Authorization = `Bearer ${token.trim()}`;
    return headers;
  };

  const handleChange = (field: keyof ServiceFormData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'cloro' && value !== 'Sim') {
        next.qtd_cloro_g = '';
      }

      if (field === 'casa_maquina_problema' && value !== 'Sim') {
        next.casa_maquina_problema_descricao = '';
      }

      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ServiceFormData, string>> = {};

    if (comprovatoriosFiles.length === 0) {
      setComprovatoriosError(comprovatoriosError || 'Selecione pelo menos 1 arquivo.');
    } else {
      setComprovatoriosError(comprovatoriosError ? comprovatoriosError : '');
    }

    const servicoFinal = formData.servico === 'Outro' ? servicoOutro : formData.servico;
    if (!servicoFinal.trim()) {
      newErrors.servico = 'Campo obrigatório';
    }

    if (!formData.profissional.trim()) {
      newErrors.profissional = 'Campo obrigatório';
    }

    if (!formData.cliente_nome.trim()) {
      newErrors.cliente_nome = 'Campo obrigatório';
    }

    if (!formData.data_servico.trim()) {
      newErrors.data_servico = 'Campo obrigatório';
    }

    if (!formData.telefone_cliente.trim()) {
      newErrors.telefone_cliente = 'Campo obrigatório';
    } else if (!validatePhone(formData.telefone_cliente)) {
      newErrors.telefone_cliente = 'Telefone inválido';
    }

    if (!formData.ph_agua.trim()) {
      newErrors.ph_agua = 'Campo obrigatório';
    } else if (!validateNumber(formData.ph_agua, { min: 0, max: 14 })) {
      newErrors.ph_agua = 'Informe um número válido (0 a 14)';
    }

    if (!formData.alcalinidade.trim()) {
      newErrors.alcalinidade = 'Campo obrigatório';
    } else if (!validateNumber(formData.alcalinidade, { min: 0 })) {
      newErrors.alcalinidade = 'Informe um número válido';
    }

    if (!formData.cloro.trim()) {
      newErrors.cloro = 'Campo obrigatório';
    }

    if (formData.cloro === 'Sim') {
      if (!formData.qtd_cloro_g.trim()) {
        newErrors.qtd_cloro_g = 'Campo obrigatório';
      } else if (!validateNumber(formData.qtd_cloro_g, { min: 0 })) {
        newErrors.qtd_cloro_g = 'Informe um número válido';
      }
    }

    if (!formData.hidrocalcio.trim()) {
      newErrors.hidrocalcio = 'Campo obrigatório';
    }

    if (!formData.aspiracao.trim()) {
      newErrors.aspiracao = 'Campo obrigatório';
    }

    const requiredChecks: Array<keyof ServiceFormData> = [
      'limp_bordas',
      'escovacao',
      'limp_pre_filtro',
      'limp_areia',
      'casa_maquina_problema',
      'conf_registros',
      'conf_encher_pisc',
      'conf_timer',
      'conf_capa_termica',
      'conf_cerca_piscina',
      'foi_aspirador_drenando',
      'foi_adicionado_algicida_choque',
      'foi_retrolavado',
      'tampa_casa_maquina_fechada',
      'torneira_agua_fechada',
      'motor',
    ];

    for (const field of requiredChecks) {
      if (!String(formData[field]).trim()) {
        newErrors[field] = 'Campo obrigatório';
      }
    }

    if (formData.casa_maquina_problema === 'Sim') {
      if (!formData.casa_maquina_problema_descricao.trim()) {
        newErrors.casa_maquina_problema_descricao = 'Descreva o problema';
      } else if (formData.casa_maquina_problema_descricao.trim().length > 100) {
        newErrors.casa_maquina_problema_descricao = 'Máximo 100 caracteres';
      }
    }

    if (formData.produtos_usados.trim().length > 100) {
      newErrors.produtos_usados = 'Máximo 100 caracteres';
    }

    if (formData.observacoes.trim().length > 250) {
      newErrors.observacoes = 'Máximo 250 caracteres';
    }

    if (formData.temperatura_aquecimento_c.trim() && !validateNumber(formData.temperatura_aquecimento_c)) {
      newErrors.temperatura_aquecimento_c = 'Informe um número válido';
    }

    if (!formData.valor_cobrado.trim()) {
      newErrors.valor_cobrado = 'Campo obrigatório';
    } else if (!validateMoney(formData.valor_cobrado)) {
      newErrors.valor_cobrado = 'Valor deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && comprovatoriosFiles.length > 0 && !comprovatoriosError;
  };

  const handleComprovatoriosChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      setComprovatoriosFiles([]);
      setComprovatoriosError('Selecione pelo menos 1 arquivo.');
      return;
    }

    const invalid = files.find((file) => !file.type.startsWith('video/') && !file.type.startsWith('image/'));
    if (invalid) {
      setComprovatoriosFiles([]);
      setComprovatoriosError('Selecione apenas imagens ou vídeos.');
      if (comprovatoriosInputRef.current) {
        comprovatoriosInputRef.current.value = '';
      }
      return;
    }

    const tooLarge = files.find((file) => file.size > MAX_MEDIA_BYTES);
    if (tooLarge) {
      setComprovatoriosFiles([]);
      setComprovatoriosError('Arquivo muito grande. Máximo 2GB por arquivo.');
      if (comprovatoriosInputRef.current) {
        comprovatoriosInputRef.current.value = '';
      }
      return;
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_MEDIA_BYTES) {
      setComprovatoriosFiles([]);
      setComprovatoriosError('Mídias muito grandes. Máximo 2GB no total.');
      if (comprovatoriosInputRef.current) {
        comprovatoriosInputRef.current.value = '';
      }
      return;
    }

    setComprovatoriosFiles(files);
    setComprovatoriosError('');
  };

  const sendTextWebhook = async (payload: WebhookPayload): Promise<void> => {
    const webhookUrl = resolveAvisaApiUrl('/actions/sendMessage');

    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: buildApiHeaders(webhookUrl),
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw mapFetchError(error, 'Verifique a URL da API e sua conexão.');
    }

    if (!response.ok) {
      const apiError = await getResponseErrorMessage(response);
      throw new Error(`Falha ao enviar mensagem (${response.status}): ${apiError}`);
    }
  };

  const sendMediaWebhook = async (payload: MediaWebhookPayload): Promise<void> => {
    const webhookUrl = resolveAvisaApiUrl('/actions/sendMedia');

    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: buildApiHeaders(webhookUrl),
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw mapFetchError(error, 'Verifique a URL da API e sua conexão.');
    }

    if (!response.ok) {
      const apiError = await getResponseErrorMessage(response);
      throw new Error(`Falha ao enviar mídia (${response.status}): ${apiError}`);
    }
  };

  const requestPresignedUpload = async (file: File): Promise<{ uploadUrl: string; fileUrl: string }> => {
    const presignUrl = (import.meta.env.VITE_S3_PRESIGN_URL as string | undefined) || '/api/s3/presign';

    let response: Response;
    try {
      response = await fetch(presignUrl, {
        method: 'POST',
        headers: buildApiHeaders(presignUrl),
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        }),
      });
    } catch (error) {
      throw mapFetchError(error, 'Se você está em dev, rode também `npm run api` para habilitar `/api/s3/presign`.');
    }

    if (!response.ok) {
      const apiError = await getResponseErrorMessage(response);
      throw new Error(`Falha ao obter URL de upload (${response.status}): ${apiError}`);
    }

    const data = (await response.json()) as { uploadUrl?: string; fileUrl?: string };
    if (!data.uploadUrl || !data.fileUrl) {
      throw new Error('Resposta de presign inválida');
    }

    return { uploadUrl: data.uploadUrl, fileUrl: data.fileUrl };
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
      const apiNumber = telefoneNormalizado.replace(/\D/g, '');
      const formDataWithService = {
        ...formData,
        servico: servicoFinal,
      };

      const message = formatWhatsAppMessage({
        ...formDataWithService,
        midia_comprobatoria_nomes: comprovatoriosFiles.map((file) => file.name),
      });

      const uploadAndSend = async (file: File, caption: string) => {
        const { uploadUrl, fileUrl } = await requestPresignedUpload(file);
        let uploadResponse: Response;
        try {
          uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
            body: file,
          });
        } catch (error) {
          const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
          const s3Origin = (() => {
            try {
              return new URL(uploadUrl).origin;
            } catch {
              return '';
            }
          })();
          throw mapFetchError(
            error,
            `Falha ao fazer upload do arquivo. Configure o CORS do bucket para permitir PUT a partir da origem do app (${currentOrigin || 'desconhecida'}) para o host do S3 (${s3Origin || 'desconhecido'}).`,
          );
        }

        if (!uploadResponse.ok) {
          const uploadError = await getResponseErrorMessage(uploadResponse);
          throw new Error(`Falha ao enviar arquivo para o S3 (${uploadResponse.status}): ${uploadError}`);
        }

        const mediaType: MediaWebhookPayload['type'] = file.type.startsWith('video/')
          ? 'video'
          : 'image';
        const mediaPayload: MediaWebhookPayload = {
          number: apiNumber,
          type: mediaType,
          fileUrl,
          message: caption,
          fileName: file.name,
        };
        await sendMediaWebhook(mediaPayload);
        return { ...mediaPayload };
      };

      const medias: Array<MediaWebhookPayload & { slot: 'comprobatorios' }> = [];
      for (const file of comprovatoriosFiles) {
        const sent = await uploadAndSend(file, 'Mídia comprobatória');
        medias.push({ ...sent, slot: 'comprobatorios' });
      }

      const textPayload: WebhookPayload = {
        number: apiNumber,
        message,
      };

      await sendTextWebhook(textPayload);

      const logResponse = await fetch('/api/reports', {
        method: 'POST',
        headers: buildApiHeaders('/api/reports'),
        body: JSON.stringify({
          number: apiNumber,
          message,
          textPayload,
          formData: formDataWithService,
          medias,
        }),
      });
      if (!logResponse.ok) {
        const apiError = await getResponseErrorMessage(logResponse);
        throw new Error(`Relatório enviado, mas falha ao registrar no painel (${logResponse.status}): ${apiError}`);
      }

      setStatus('success');
      setFormData({
        servico: '',
        profissional: '',
        cliente_nome: '',
        data_servico: '',
        telefone_cliente: '',
        ph_agua: '',
        alcalinidade: '',
        cloro: '',
        qtd_cloro_g: '',
        hidrocalcio: '',
        aspiracao: '',
        limp_bordas: '',
        escovacao: '',
        limp_pre_filtro: '',
        limp_areia: '',
        casa_maquina_problema: '',
        casa_maquina_problema_descricao: '',
        conf_registros: '',
        conf_encher_pisc: '',
        conf_timer: '',
        conf_capa_termica: '',
        conf_cerca_piscina: '',
        foi_aspirador_drenando: '',
        foi_adicionado_algicida_choque: '',
        foi_retrolavado: '',
        temperatura_aquecimento_c: '',
        tampa_casa_maquina_fechada: '',
        torneira_agua_fechada: '',
        motor: '',
        produtos_usados: '',
        observacoes: '',
        valor_cobrado: '',
      });
      setServicoOutro('');
      setComprovatoriosFiles([]);
      setComprovatoriosError('');
      if (comprovatoriosInputRef.current) {
        comprovatoriosInputRef.current.value = '';
      }
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
          O relatório foi enviado via WhatsApp.
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
            label="Cliente"
            type="text"
            value={formData.cliente_nome}
            onChange={(e) => handleChange('cliente_nome', e.target.value)}
            error={errors.cliente_nome}
            placeholder="Nome do cliente"
            required
          />

          <FormInput
            label="Data do serviço"
            type="date"
            value={formData.data_servico}
            onChange={(e) => handleChange('data_servico', e.target.value)}
            error={errors.data_servico}
            required
          />
        </div>

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
            label="pH da água"
            type="text"
            value={formData.ph_agua}
            onChange={(e) => handleChange('ph_agua', e.target.value)}
            error={errors.ph_agua}
            placeholder="Ex: 7,2"
            inputMode="decimal"
            required
          />

          <FormInput
            label="Alcalinidade"
            type="text"
            value={formData.alcalinidade}
            onChange={(e) => handleChange('alcalinidade', e.target.value)}
            error={errors.alcalinidade}
            placeholder="Ex: 80"
            inputMode="decimal"
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

        <div className="grid md:grid-cols-2 gap-5">
          <FormSelect
            label="Cloro"
            options={YES_NO_OPTIONS}
            value={formData.cloro}
            onChange={(e) => handleChange('cloro', e.target.value)}
            error={errors.cloro}
            required
          />

          {formData.cloro === 'Sim' ? (
            <FormInput
              label="Qtd de cloro (g)"
              type="text"
              value={formData.qtd_cloro_g}
              onChange={(e) => handleChange('qtd_cloro_g', e.target.value)}
              error={errors.qtd_cloro_g}
              placeholder="Ex: 500"
              inputMode="decimal"
              required
            />
          ) : (
            <FormInput
              label="Qtd de cloro (g)"
              type="text"
              value=""
              disabled
              placeholder="Preencha após selecionar Cloro = Sim"
            />
          )}

          <FormSelect
            label="Hidrocálcio"
            options={YES_NO_OPTIONS}
            value={formData.hidrocalcio}
            onChange={(e) => handleChange('hidrocalcio', e.target.value)}
            error={errors.hidrocalcio}
            required
          />

          <FormSelect
            label="Aspiração"
            options={YES_NO_OPTIONS}
            value={formData.aspiracao}
            onChange={(e) => handleChange('aspiracao', e.target.value)}
            error={errors.aspiracao}
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <FormSelect
            label="Limp. bordas"
            options={YES_NO_OPTIONS}
            value={formData.limp_bordas}
            onChange={(e) => handleChange('limp_bordas', e.target.value)}
            error={errors.limp_bordas}
            required
          />

          <FormSelect
            label="Escovação"
            options={YES_NO_OPTIONS}
            value={formData.escovacao}
            onChange={(e) => handleChange('escovacao', e.target.value)}
            error={errors.escovacao}
            required
          />

          <FormSelect
            label="Limp. pré-filtro"
            options={YES_NO_OPTIONS}
            value={formData.limp_pre_filtro}
            onChange={(e) => handleChange('limp_pre_filtro', e.target.value)}
            error={errors.limp_pre_filtro}
            required
          />

          <FormSelect
            label="Limp. areia"
            options={YES_NO_OPTIONS}
            value={formData.limp_areia}
            onChange={(e) => handleChange('limp_areia', e.target.value)}
            error={errors.limp_areia}
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <FormSelect
            label="Casa máq apresenta algum problema?"
            options={YES_NO_OPTIONS}
            value={formData.casa_maquina_problema}
            onChange={(e) => handleChange('casa_maquina_problema', e.target.value)}
            error={errors.casa_maquina_problema}
            required
          />

          {formData.casa_maquina_problema === 'Sim' ? (
            <FormInput
              label="Qual problema?"
              type="text"
              value={formData.casa_maquina_problema_descricao}
              onChange={(e) => handleChange('casa_maquina_problema_descricao', e.target.value)}
              error={errors.casa_maquina_problema_descricao}
              placeholder="Descreva (máx. 100 caracteres)"
              maxLength={100}
              required
            />
          ) : (
            <FormInput
              label="Qual problema?"
              type="text"
              value=""
              disabled
              placeholder="Preencha após selecionar Sim"
            />
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <FormSelect
            label="Conf. registros"
            options={YES_NO_OPTIONS}
            value={formData.conf_registros}
            onChange={(e) => handleChange('conf_registros', e.target.value)}
            error={errors.conf_registros}
            required
          />

          <FormSelect
            label="Conf. encher pisc."
            options={YES_NO_OPTIONS}
            value={formData.conf_encher_pisc}
            onChange={(e) => handleChange('conf_encher_pisc', e.target.value)}
            error={errors.conf_encher_pisc}
            required
          />

          <FormSelect
            label="Conf. do timer"
            options={YES_NO_OPTIONS}
            value={formData.conf_timer}
            onChange={(e) => handleChange('conf_timer', e.target.value)}
            error={errors.conf_timer}
            required
          />

          <FormSelect
            label="Conf. capa térmica"
            options={YES_NO_OPTIONS}
            value={formData.conf_capa_termica}
            onChange={(e) => handleChange('conf_capa_termica', e.target.value)}
            error={errors.conf_capa_termica}
            required
          />

          <FormSelect
            label="Conf. cerca piscina"
            options={YES_NO_OPTIONS}
            value={formData.conf_cerca_piscina}
            onChange={(e) => handleChange('conf_cerca_piscina', e.target.value)}
            error={errors.conf_cerca_piscina}
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <FormSelect
            label="Foi aspirador drenando"
            options={YES_NO_OPTIONS}
            value={formData.foi_aspirador_drenando}
            onChange={(e) => handleChange('foi_aspirador_drenando', e.target.value)}
            error={errors.foi_aspirador_drenando}
            required
          />

          <FormSelect
            label="Foi adicionado algicida choque"
            options={YES_NO_OPTIONS}
            value={formData.foi_adicionado_algicida_choque}
            onChange={(e) => handleChange('foi_adicionado_algicida_choque', e.target.value)}
            error={errors.foi_adicionado_algicida_choque}
            required
          />

          <FormSelect
            label="Foi retrolavado"
            options={YES_NO_OPTIONS}
            value={formData.foi_retrolavado}
            onChange={(e) => handleChange('foi_retrolavado', e.target.value)}
            error={errors.foi_retrolavado}
            required
          />

          <FormInput
            label="Temperatura aquecimento (°C)"
            type="text"
            value={formData.temperatura_aquecimento_c}
            onChange={(e) => handleChange('temperatura_aquecimento_c', e.target.value)}
            error={errors.temperatura_aquecimento_c}
            placeholder="Ex: 28"
            inputMode="decimal"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <FormSelect
            label="Tampa casa máquina fechada"
            options={YES_NO_OPTIONS}
            value={formData.tampa_casa_maquina_fechada}
            onChange={(e) => handleChange('tampa_casa_maquina_fechada', e.target.value)}
            error={errors.tampa_casa_maquina_fechada}
            required
          />

          <FormSelect
            label="Torneira de água fechada"
            options={YES_NO_OPTIONS}
            value={formData.torneira_agua_fechada}
            onChange={(e) => handleChange('torneira_agua_fechada', e.target.value)}
            error={errors.torneira_agua_fechada}
            required
          />

          <FormSelect
            label="Motor"
            options={MOTOR_OPTIONS}
            value={formData.motor}
            onChange={(e) => handleChange('motor', e.target.value)}
            error={errors.motor}
            required
          />
        </div>

        <FormInput
          label="Produtos usados"
          type="text"
          value={formData.produtos_usados}
          onChange={(e) => handleChange('produtos_usados', e.target.value)}
          error={errors.produtos_usados}
          placeholder="Máx. 100 caracteres (opcional)"
          maxLength={100}
        />

        <FormTextarea
          label="Observação"
          value={formData.observacoes}
          onChange={(e) => handleChange('observacoes', e.target.value)}
          placeholder="Informações adicionais (opcional)"
          maxLength={250}
        />

        <div>
          <label className="block text-sm font-medium text-[#6D7689] mb-2">
            Vídeos e Fotos Comprobatórios
          </label>
          <input
            ref={comprovatoriosInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            required
            onChange={handleComprovatoriosChange}
            className="block w-full text-sm text-[#6D7689] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#60A9DC] file:text-white hover:file:bg-[#4E96C9]"
          />
          <p className="mt-2 text-xs text-[#9AA2B1]">
            Formatos aceitos: imagens e/ou vídeos. Máximo 2GB no total.
          </p>
          {comprovatoriosError && <p className="mt-2 text-sm text-red-600">{comprovatoriosError}</p>}
          {comprovatoriosFiles.length > 0 && !comprovatoriosError && (
            <div className="mt-2 text-sm text-[#6D7689]">
              <div className="font-medium">Arquivos selecionados:</div>
              <ul className="list-disc pl-5">
                {comprovatoriosFiles.map((file) => (
                  <li key={`${file.name}-${file.size}`}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

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
