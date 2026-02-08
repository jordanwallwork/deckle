import { error, redirect } from '@sveltejs/kit';
import { adminApi, ApiError } from '$lib/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, fetch, url }) => {
  const { user } = await parent();

  if (!user) {
    throw redirect(302, '/');
  }

  if (user.role !== 'Administrator') {
    throw error(403, 'Access denied. Administrator privileges required.');
  }

  const page = Number.parseInt(url.searchParams.get('page') || '1');
  const pageSize = Number.parseInt(url.searchParams.get('pageSize') || '20');
  const search = url.searchParams.get('search') || undefined;

  try {
    const dataSourcesResponse = await adminApi.getSampleDataSources(
      { page, pageSize, search },
      fetch
    );
    return {
      user,
      dataSourcesResponse,
      currentPage: page,
      currentPageSize: pageSize,
      currentSearch: search || ''
    };
  } catch (err) {
    if (err instanceof ApiError) {
      throw error(err.status, err.message);
    }
    throw error(500, 'Failed to load sample data sources');
  }
};
