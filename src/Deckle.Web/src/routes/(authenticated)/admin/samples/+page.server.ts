import { error, redirect } from '@sveltejs/kit';
import { adminApi, ApiError, dataSourcesApi } from '$lib/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, fetch, url }) => {
  const { user } = await parent();

  // Redirect to login if not authenticated
  if (!user) {
    throw redirect(302, '/');
  }

  // Check if user has administrator role
  if (user.role !== 'Administrator') {
    throw error(403, 'Access denied. Administrator privileges required.');
  }

  // Get pagination and filter params from URL
  const page = Number.parseInt(url.searchParams.get('page') || '1');
  const pageSize = Number.parseInt(url.searchParams.get('pageSize') || '20');
  const search = url.searchParams.get('search') || undefined;
  const type = url.searchParams.get('type') || undefined;

  try {
    const [samplesResponse, sampleDataSourcesResponse] = await Promise.all([
      adminApi.getSamples({ page, pageSize, search, type }, fetch),
      dataSourcesApi.getAll(undefined, fetch)
    ]);
    return {
      user,
      samplesResponse,
      sampleDataSources: sampleDataSourcesResponse,
      currentPage: page,
      currentPageSize: pageSize,
      currentSearch: search || '',
      currentType: type || ''
    };
  } catch (err) {
    if (err instanceof ApiError) {
      throw error(err.status, err.message);
    }
    throw error(500, 'Failed to load sample components');
  }
};
