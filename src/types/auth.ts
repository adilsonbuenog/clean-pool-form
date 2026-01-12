export type UserRole = 'admin' | 'user';

export interface SessionUser {
  uuid: string;
  email: string;
  role: UserRole;
}

