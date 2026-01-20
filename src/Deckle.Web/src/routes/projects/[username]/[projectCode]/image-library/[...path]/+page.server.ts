import { filesApi, directoriesApi, ApiError } from '$lib/api';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, parent, fetch }) => {
  const { project } = await parent();
  // params.path is a string like "folder1/folder2" or undefined for root
  const path = params.path ?? '';
  const pathSegments = path ? path.split('/').filter(Boolean) : [];

  try {
    // Load directory contents (or root) and quota in parallel
    const [directoryContents, allDirectories, quota] = await Promise.all([
      directoriesApi.getByPath(project.id, path, fetch),
      directoriesApi.list(project.id, fetch),
      filesApi.getQuota(fetch).catch(() => null) // Optional - don't fail if quota fetch fails
    ]);

    // Build breadcrumb path from URL segments
    const breadcrumbs: { path: string; name: string }[] = [{ path: '', name: 'Home' }];
    let currentPath = '';
    for (const segment of pathSegments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      breadcrumbs.push({ path: currentPath, name: segment });
    }

    return {
      project,
      directoryContents,
      allDirectories,
      currentPath: path,
      breadcrumbs,
      quota
    };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) {
        // Directory not found - could be an invalid path
        throw error(404, 'Directory not found');
      }
      throw error(err.status, err.message);
    }
    console.error('Failed to load files:', err);
    throw error(500, 'Failed to load files');
  }
};
