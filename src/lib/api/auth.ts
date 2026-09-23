import { apiFetch } from './client';
import type { AuthResponse, LoginPayload, User } from './types';

/** POST /api/auth/login */
export function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

/** GET /api/auth/profile */
export function getProfile(): Promise<User> {
  return apiFetch<User>('/api/auth/profile');
}
