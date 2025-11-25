import { config } from '$lib/config';
import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ params, fetch }) => {
  try {
    const response = await fetch(`${config.apiUrl}/projects/${params.projectId}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw error(404, 'Project not found');
      }
      throw error(response.status, 'Failed to load project');
    }

    const project = await response.json();
    return { project };
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Failed to load project:', err);
    throw error(500, 'Failed to load project');
  }
};
