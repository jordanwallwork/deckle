import { api } from './client';
import type {
  CurrentUser,
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

  register: (request: PasswordAuthRequest, fetchFn?: typeof fetch) =>
    api.post<CurrentUser>('/auth/register', request, undefined, fetchFn),

  loginWithPassword: (request: PasswordAuthRequest, fetchFn?: typeof fetch) =>
    api.post<CurrentUser>('/auth/login/password', request, undefined, fetchFn),

  checkUsername: (username: string, fetchFn?: typeof fetch) =>
    api.get<UsernameAvailabilityResponse>(`/auth/username/check/${encodeURIComponent(username)}`, undefined, fetchFn),

  setUsername: (request: SetUsernameRequest, fetchFn?: typeof fetch) =>
    api.post<SetUsernameResponse>('/auth/username', request, undefined, fetchFn),

  getProfile: (fetchFn?: typeof fetch) => api.get<CurrentUser>('/auth/profile', undefined, fetchFn),

  updateProfile: (request: UpdateProfileRequest, fetchFn?: typeof fetch) =>
    api.put<void>('/auth/profile', request, undefined, fetchFn)
};
