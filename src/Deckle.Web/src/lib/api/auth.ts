import { api } from './client';
import type {
  CurrentUser,
  RegistrationPendingResponse,
  UsernameAvailabilityResponse,
  SetUsernameRequest,
  SetUsernameResponse,
  UpdateProfileRequest
} from '$lib/types';

export interface PasswordAuthRequest {
  email: string;
  password: string;
}

export const authApi = {
  me: (fetchFn?: typeof fetch) => api.get<CurrentUser>('/auth/me', undefined, fetchFn),

  /** Signs the user in, or returns `{ requiresConfirmation: true }` when the email must be confirmed first */
  register: (request: PasswordAuthRequest, fetchFn?: typeof fetch) =>
    api.post<CurrentUser | RegistrationPendingResponse>('/auth/register', request, undefined, fetchFn),

  loginWithPassword: (request: PasswordAuthRequest, fetchFn?: typeof fetch) =>
    api.post<CurrentUser>('/auth/login/password', request, undefined, fetchFn),

  /** Confirms the email address for the token from the confirmation link and signs the user in */
  confirmEmail: (token: string, fetchFn?: typeof fetch) =>
    api.post<CurrentUser>('/auth/confirm-email', { token }, undefined, fetchFn),

  /** Always succeeds (unless rate limited) so it can't be used to discover accounts */
  resendConfirmation: (email: string, fetchFn?: typeof fetch) =>
    api.post<void>('/auth/confirm-email/resend', { email }, undefined, fetchFn),

  checkUsername: (username: string, fetchFn?: typeof fetch) =>
    api.get<UsernameAvailabilityResponse>(`/auth/username/check/${encodeURIComponent(username)}`, undefined, fetchFn),

  setUsername: (request: SetUsernameRequest, fetchFn?: typeof fetch) =>
    api.post<SetUsernameResponse>('/auth/username', request, undefined, fetchFn),

  getProfile: (fetchFn?: typeof fetch) => api.get<CurrentUser>('/auth/profile', undefined, fetchFn),

  updateProfile: (request: UpdateProfileRequest, fetchFn?: typeof fetch) =>
    api.put<void>('/auth/profile', request, undefined, fetchFn)
};
