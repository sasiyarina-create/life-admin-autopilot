import { request } from './api';

export type AuthUser = { email: string; name: string; picture: string | null };
export type AuthStatus = { authenticated: boolean; user: AuthUser | null; onboardingCompleted: boolean };

export function getAuthStatus() {
  return request<AuthStatus>('/api/auth/status');
}

export function logout() {
  return request<void>('/api/auth/logout', { method: 'POST' });
}

export function completeOnboarding() {
  return request<void>('/api/auth/onboarding/complete', { method: 'POST' });
}
