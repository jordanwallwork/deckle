import { config } from '$lib/config';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch }) => {
  try {
    const response = await fetch(`${config.apiUrl}/projects/${params.projectId}/components`, {
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { components: [] };
      }
      throw error(response.status, 'Failed to load components');
    }

    const components = await response.json();
    return { components };
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Failed to load components:', err);
    throw error(500, 'Failed to load components');
  }
};
