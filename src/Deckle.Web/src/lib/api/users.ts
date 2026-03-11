import { api } from './client';
import type { PublicUserProfile } from '$lib/types';

export const usersApi = {
  /**
   * Get a user's public profile (no authentication required)
   */
  getPublicProfile: (username: string, fetchFn?: typeof fetch) =>
    api.get<PublicUserProfile>(`/users/${encodeURIComponent(username)}`, undefined, fetchFn)
};
