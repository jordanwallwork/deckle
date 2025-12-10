import { config } from '$lib/config';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch }) => {
  try {
    // Fetch components and configuration options in parallel
    const [componentsResponse, configResponse] = await Promise.all([
      fetch(`${config.apiUrl}/projects/${params.projectId}/components`, {
        credentials: 'include'
      }),
      fetch(`${config.apiUrl}/configuration/component-options`)
    ]);

    if (!componentsResponse.ok) {
      if (componentsResponse.status === 404) {
        return { components: [], configOptions: null };
      }
      throw error(componentsResponse.status, 'Failed to load components');
    }

    const components = await componentsResponse.json();
    const configOptions = configResponse.ok ? await configResponse.json() : null;

    return { components, configOptions };
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Failed to load components:', err);
    throw error(500, 'Failed to load components');
  }
};
