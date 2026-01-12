import { api } from './client';
import type { CurrentUser } from '$lib/types';

/**
 * Authentication API
 */
export const authApi = {
  /**
   * Get current user information
   */
  me: (fetchFn?: typeof fetch) => api.get<CurrentUser>('/auth/me', undefined, fetchFn)
};
