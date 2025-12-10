import { componentsApi, ApiError } from '$lib/api';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch }) => {
  try {
    const components = await componentsApi.listByProject(params.projectId, fetch);
    return { components };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) {
        return { components: [] };
      }
      throw error(err.status, err.message);
    }
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Failed to load components:', err);
    throw error(500, 'Failed to load components');
  }
};
