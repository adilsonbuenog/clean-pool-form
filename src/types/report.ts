import type { SessionUser } from './auth';

export type ReportStatus = 'received' | 'approved' | 'rejected';

export interface ReportPayload {
  number?: string;
  message?: string;
  textPayload?: unknown;
  formData?: Record<string, unknown>;
  medias?: Array<Record<string, unknown>>;
  created_by?: SessionUser;
}

export interface ReportRow {
  id: string;
  status: ReportStatus;
  created_at?: string;
  updated_at?: string;
  payload: ReportPayload;
}

