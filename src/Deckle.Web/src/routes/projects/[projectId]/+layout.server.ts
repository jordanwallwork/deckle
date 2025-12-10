import { projectsApi, ApiError } from '$lib/api';
import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ params, fetch }) => {
  try {
    const project = await projectsApi.getById(params.projectId, fetch);
    return { project };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) {
        throw error(404, 'Project not found');
      }
      throw error(err.status, err.message);
    }
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Failed to load project:', err);
    throw error(500, 'Failed to load project');
  }
};
