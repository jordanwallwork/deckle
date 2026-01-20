import { api } from './client';
import type {
  CurrentUser,
  UsernameAvailabilityResponse,
  SetUsernameRequest,
  SetUsernameResponse
} from '$lib/types';

/**
 * Authentication API
 */
export const authApi = {
  /**
   * Get current user information
   */
  me: (fetchFn?: typeof fetch) => api.get<CurrentUser>('/auth/me', undefined, fetchFn),

  /**
   * Check if a username is available
   */
  checkUsername: (username: string, fetchFn?: typeof fetch) =>
    api.get<UsernameAvailabilityResponse>(`/auth/username/check/${encodeURIComponent(username)}`, undefined, fetchFn),

  /**
   * Set the current user's username
   */
  setUsername: (request: SetUsernameRequest, fetchFn?: typeof fetch) =>
    api.post<SetUsernameResponse>('/auth/username', request, undefined, fetchFn)
};
