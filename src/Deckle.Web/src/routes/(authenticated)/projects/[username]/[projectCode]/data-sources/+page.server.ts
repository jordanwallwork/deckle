import { dataSourcesApi, ApiError } from '$lib/api';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, parent, fetch }) => {
  try {
    // Get parent data (project is already loaded in layout)
    const { project } = await parent();

    // Load data sources for the project
    const dataSources = await dataSourcesApi.getAll(project.id, fetch);

    return {
      project,
      dataSources
    };
  } catch (err) {
    if (err instanceof ApiError) {
      throw error(err.status, err.message);
    }
    console.error('Failed to load data sources:', err);
    throw error(500, 'Failed to load data sources');
  }
};
