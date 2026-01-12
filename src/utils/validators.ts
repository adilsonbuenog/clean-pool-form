export const normalizePhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('55')) {
    return `+${cleaned}`;
  }

  return `+55${cleaned}`;
};

export const formatPhoneForDisplay = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  const numbers = normalized.replace('+55', '');

  if (numbers.length === 11) {
    return `+55 (${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
  }

  return normalized;
};

export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 13;
};

export const parseNumberValue = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
};

export const validateNumber = (
  value: string,
  options: { min?: number; max?: number } = {},
): boolean => {
  const parsed = parseNumberValue(value);
  if (parsed === null) {
    return false;
  }

  if (options.min !== undefined && parsed < options.min) {
    return false;
  }

  if (options.max !== undefined && parsed > options.max) {
    return false;
  }

  return true;
};

export const parseMoneyValue = (value: string): number => {
  const cleaned = value.replace(/[^\d,\.]/g, '');
  const normalized = cleaned.replace(',', '.');
  return parseFloat(normalized) || 0;
};

export const formatMoney = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const validateMoney = (value: string): boolean => {
  const parsed = parseMoneyValue(value);
  return parsed > 0;
};
