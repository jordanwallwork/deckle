import { authApi } from '$lib/api';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const user = await authApi.me(fetch);
    return { user };
  } catch (err) {
    console.error('Failed to load user data:', err);
    throw error(500, 'Failed to load user data');
  }
};
