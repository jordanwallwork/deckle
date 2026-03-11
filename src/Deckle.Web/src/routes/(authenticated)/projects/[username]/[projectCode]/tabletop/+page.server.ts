import { componentsApi, projectsApi, ApiError } from '$lib/api';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent, fetch }) => {
  try {
    const { project } = await parent();
    const [components, gameSetupResult] = await Promise.all([
      componentsApi.listByProject(project.id, fetch).catch((err) => {
        if (err instanceof ApiError && err.status === 404) return [];
        throw err;
      }),
      projectsApi.getGameSetup(project.id, fetch).catch(() => ({ data: null }))
    ]);
    return { components, gameSetup: gameSetupResult.data };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) {
        return { components: [], gameSetup: null };
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
