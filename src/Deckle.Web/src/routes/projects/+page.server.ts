import { projectsApi } from '$lib/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const projects = await projectsApi.list(fetch);
    return { projects };
  } catch (error) {
    console.error('Failed to load projects:', error);
    return { projects: [] };
  }
};
