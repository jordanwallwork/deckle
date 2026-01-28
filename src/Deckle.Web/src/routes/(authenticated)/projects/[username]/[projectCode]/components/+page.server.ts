import { componentsApi, dataSourcesApi, ApiError } from '$lib/api';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent, fetch }) => {
  try {
    const { project } = await parent();
    const [components, dataSources] = await Promise.all([
      componentsApi.listByProject(project.id, fetch),
      dataSourcesApi.listByProject(project.id, fetch).catch(() => [])
    ]);
    return { components, dataSources };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) {
        return { components: [], dataSources: [] };
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
