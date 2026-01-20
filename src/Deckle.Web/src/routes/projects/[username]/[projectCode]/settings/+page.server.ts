import { projectsApi, ApiError } from '$lib/api';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, parent }) => {
  const { project } = await parent();

  try {
    const users = await projectsApi.getUsers(project.id, fetch);
    return {
      project,
      users
    };
  } catch (err) {
    if (err instanceof ApiError) {
      throw error(err.status, err.message);
    }
    console.error('Failed to load project users:', err);
    throw error(500, 'Failed to load project users');
  }
};
