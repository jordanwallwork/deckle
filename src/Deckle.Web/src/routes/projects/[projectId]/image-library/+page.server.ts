import { filesApi, ApiError } from '$lib/api';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, parent, fetch }) => {
  const { project } = await parent();

  try {
    // Load files and quota in parallel
    const [files, quota] = await Promise.all([
      filesApi.list(params.projectId, fetch),
      filesApi.getQuota(fetch).catch(() => null) // Optional - don't fail if quota fetch fails
    ]);

    return {
      project,
      files,
      quota
    };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) {
        return { project, files: [], quota: null };
      }
      throw error(err.status, err.message);
    }
    console.error('Failed to load files:', err);
    throw error(500, 'Failed to load files');
  }
};
