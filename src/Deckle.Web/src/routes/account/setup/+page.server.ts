import { authApi } from '$lib/api';
import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const user = await authApi.me(fetch);

    // If user already has a username, redirect to projects
    if (user.username) {
      throw redirect(302, '/projects');
    }

    return { user };
  } catch (err) {
    // Re-throw redirects
    if ((err as any)?.status === 302) {
      throw err;
    }
    console.error('Failed to load user data:', err);
    throw error(500, 'Failed to load user data');
  }
};
