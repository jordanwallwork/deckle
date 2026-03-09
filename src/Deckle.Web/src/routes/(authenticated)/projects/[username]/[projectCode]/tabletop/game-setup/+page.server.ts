import { componentsApi, ApiError } from '$lib/api';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent, fetch }) => {
  try {
    const { project } = await parent();
    const components = await componentsApi.listByProject(project.id, fetch);
    return { components };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) return { components: [] };
      throw error(err.status, err.message);
    }
    if (err && typeof err === 'object' && 'status' in err) throw err;
    throw error(500, 'Failed to load components');
  }
};
