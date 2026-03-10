import { api } from './client';
import type {
  CurrentUser,
  UsernameAvailabilityResponse,
  SetUsernameRequest,
  SetUsernameResponse,
  UpdateProfileRequest
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
    api.post<SetUsernameResponse>('/auth/username', request, undefined, fetchFn),

  /**
   * Get current user's full profile (including bio and external links)
   */
  getProfile: (fetchFn?: typeof fetch) => api.get<CurrentUser>('/auth/profile', undefined, fetchFn),

  /**
   * Update current user's profile (bio and external links)
   */
  updateProfile: (request: UpdateProfileRequest, fetchFn?: typeof fetch) =>
    api.put<void>('/auth/profile', request, undefined, fetchFn)
};
