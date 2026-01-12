import type { SessionUser } from '../types/auth';

const TOKEN_KEY = 'cleanpool.session.token';
const USER_KEY = 'cleanpool.session.user';

export const getSessionToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setSessionToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearSessionToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getSessionUser = (): SessionUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
};

export const setSessionUser = (user: SessionUser): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSessionUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

export const clearSession = (): void => {
  clearSessionToken();
  clearSessionUser();
};

