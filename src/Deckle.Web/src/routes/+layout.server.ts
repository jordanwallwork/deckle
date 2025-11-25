import { config } from '$lib/config';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch }) => {
  try {
    const response = await fetch(`${config.apiUrl}/auth/me`, {
      credentials: 'include'
    });

    if (response.ok) {
      const user = await response.json();
      return { user };
    }

    return { user: null };
  } catch (error) {
    return { user: null };
  }
};
