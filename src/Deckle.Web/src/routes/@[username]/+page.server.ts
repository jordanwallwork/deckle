import { usersApi, ApiError } from '$lib/api';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  try {
    const profile = await usersApi.getPublicProfile(params.username, fetch);
    return { profile };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      throw error(404, 'Profile not found');
    }
    throw error(500, 'Failed to load profile');
  }
};
