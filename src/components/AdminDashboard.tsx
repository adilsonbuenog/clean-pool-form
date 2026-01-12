import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReportRow, ReportStatus } from '../types/report';
import type { SessionUser } from '../types/auth';

const statusLabel: Record<ReportStatus, string> = {
  received: 'Recebidos',
  approved: 'Aprovados',
  rejected: 'Rejeitados',
};

const statusColor: Record<ReportStatus, string> = {
  received: 'bg-blue-50 border-blue-200',
  approved: 'bg-green-50 border-green-200',
  rejected: 'bg-red-50 border-red-200',
};

const formatDateTime = (iso?: string) => {
  if (!iso) {
    return '';
  }
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
};

const upsertById = (items: ReportRow[], next: ReportRow): ReportRow[] => {
  const index = items.findIndex((r) => r.id === next.id);
  if (index === -1) {
    return [next, ...items];
  }
  const copy = items.slice();
  copy[index] = next;
  return copy;
};

export const AdminDashboard = ({
  token,
  user,
}: {
  token: string;
  user: SessionUser;
}) => {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const reconnectTimerRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const grouped = useMemo(() => {
    const initial: Record<ReportStatus, ReportRow[]> = { received: [], approved: [], rejected: [] };
    for (const report of reports) {
      const status: ReportStatus = report.status || 'received';
      initial[status].push(report);
    }
    return initial;
  }, [reports]);

  const fetchInitial = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/admin/reports', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json()) as { reports?: ReportRow[]; error?: string };
      if (!response.ok) {
        throw new Error(data?.error || 'Falha ao carregar relatórios');
      }
      setReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: ReportStatus) => {
    const response = await fetch('/api/admin/reports/status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, status }),
    });
    const data = (await response.json()) as { report?: ReportRow; error?: string };
    if (!response.ok) {
      throw new Error(data?.error || 'Falha ao atualizar status');
    }
    if (data.report) {
      setReports((prev) => upsertById(prev, data.report!));
    }
  };

  const connectStream = async () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await fetch('/api/admin/reports/stream', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => '');
        throw new Error(text || 'Falha ao conectar stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = 'message';
      let currentData = '';

      const flushEvent = () => {
        if (!currentData.trim()) {
          currentEvent = 'message';
          currentData = '';
          return;
        }
        try {
          const parsed = JSON.parse(currentData) as unknown;
          if (currentEvent === 'init') {
            const init = parsed as { reports?: ReportRow[] };
            if (Array.isArray(init.reports)) {
              setReports(init.reports);
              setLoading(false);
            }
          }
          if (currentEvent === 'report.created' || currentEvent === 'report.updated') {
            const report = parsed as ReportRow;
            if (report && typeof report.id === 'string') {
              setReports((prev) => upsertById(prev, report));
            }
          }
        } catch {
          // ignore
        } finally {
          currentEvent = 'message';
          currentData = '';
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() || '';

        for (const line of parts) {
          const trimmed = line.trimEnd();
          if (!trimmed) {
            flushEvent();
            continue;
          }
          if (trimmed.startsWith(':')) {
            continue;
          }
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice('event:'.length).trim() || 'message';
            continue;
          }
          if (trimmed.startsWith('data:')) {
            currentData += trimmed.slice('data:'.length).trim();
          }
        }
      }
    } catch {
      // ignore (reconnect below)
    } finally {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      reconnectTimerRef.current = window.setTimeout(() => {
        void connectStream();
      }, 1500);
    }
  };

  useEffect(() => {
    if (user.role !== 'admin') {
      setErrorMessage('Acesso restrito ao admin');
      setLoading(false);
      return;
    }
    void fetchInitial();
    void connectStream();

    return () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      controllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrop = async (targetStatus: ReportStatus, id: string) => {
    try {
      await updateStatus(id, targetStatus);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao atualizar status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#6D7689]">Painel (Admin)</h1>
          <p className="text-sm text-[#838B9B]">
            Atualização em tempo real dos relatórios enviados.
          </p>
        </div>
        <button
          onClick={() => void fetchInitial()}
          className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-[#6D7689] hover:bg-gray-50 transition-colors"
        >
          Atualizar
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-[#838B9B]">Carregando relatórios…</div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          {(['received', 'approved', 'rejected'] as ReportStatus[]).map((status) => (
            <div
              key={status}
              className={`rounded-2xl border ${statusColor[status]} p-4 min-h-[520px]`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (id) {
                  void handleDrop(status, id);
                }
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#6D7689]">
                  {statusLabel[status]}
                </h2>
                <span className="text-xs text-[#838B9B]">{grouped[status].length}</span>
              </div>

              <div className="space-y-4">
                {grouped[status].map((report) => {
                  const formData = (report.payload?.formData || {}) as Record<string, unknown>;
                  const medias = (report.payload?.medias || []) as Array<Record<string, unknown>>;
                  const service = String(formData.servico || '—');
                  const clientName = String(formData.cliente_nome || '—');
                  const professional = String(formData.profissional || '—');
                  const value = String(formData.valor_cobrado || '—');

                  return (
                    <div
                      key={report.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', report.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[#6D7689]">{service}</div>
                          <div className="text-xs text-[#838B9B]">
                            Cliente: {clientName} • Prof.: {professional}
                          </div>
                          <div className="text-xs text-[#838B9B]">
                            Valor: {value} • Enviado: {formatDateTime(report.created_at)}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => void handleDrop('approved', report.id)}
                            className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700"
                            type="button"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => void handleDrop('rejected', report.id)}
                            className="px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700"
                            type="button"
                          >
                            Rejeitar
                          </button>
                        </div>
                      </div>

                      <details className="mt-3">
                        <summary className="text-xs text-[#60A9DC] cursor-pointer">Ver detalhes</summary>
                        <div className="mt-2 text-xs text-[#6D7689] whitespace-pre-wrap">
                          {String(report.payload?.message || '')}
                        </div>

                        {medias.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-medium text-[#6D7689] mb-2">Mídias</div>
                            <div className="grid grid-cols-2 gap-2">
                              {medias.map((m, idx) => {
                                const type = String(m.type || '');
                                const fileUrl = String(m.fileUrl || '');
                                const fileName = String(m.fileName || '');
                                const caption = String(m.message || '');
                                const isImage = type === 'image';
                                return (
                                  <a
                                    key={`${report.id}-media-${idx}`}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300"
                                  >
                                    {isImage ? (
                                      <img src={fileUrl} alt={fileName} className="w-full h-28 object-cover" />
                                    ) : (
                                      <div className="w-full h-28 flex items-center justify-center text-xs text-[#838B9B] bg-gray-50">
                                        {type || 'media'}
                                      </div>
                                    )}
                                    <div className="p-2">
                                      <div className="text-[11px] text-[#6D7689] truncate">{fileName || 'arquivo'}</div>
                                      {caption && <div className="text-[11px] text-[#838B9B] truncate">{caption}</div>}
                                    </div>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="mt-3">
                          <div className="text-xs font-medium text-[#6D7689] mb-2">Dados</div>
                          <pre className="text-[11px] text-[#6D7689] bg-gray-50 border border-gray-200 rounded-xl p-3 overflow-auto max-h-56">
                            {JSON.stringify(formData, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

