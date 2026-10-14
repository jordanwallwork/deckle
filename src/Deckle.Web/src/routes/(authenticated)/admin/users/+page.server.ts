import { error, redirect } from '@sveltejs/kit';
import { adminApi, ApiError } from '$lib/api';
import { parseUserFilters, toUserQueryParams } from '$lib/utils/adminUserFilters';
import type { PageServerLoad } from './$types';

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed;
}

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

  const page = parsePositiveInt(url.searchParams.get('page'), 1);
  const pageSize = Math.min(100, parsePositiveInt(url.searchParams.get('pageSize'), 20));
  const filters = parseUserFilters(url.searchParams);

  try {
    const usersResponse = await adminApi.getUsers(
      { page, pageSize, ...toUserQueryParams(filters) },
      fetch
    );
    return {
      user,
      usersResponse,
      currentPage: page,
      currentPageSize: pageSize,
      currentFilters: filters
    };
  } catch (err) {
    if (err instanceof ApiError) {
      throw error(err.status, err.message);
    }
    throw error(500, 'Failed to load users');
  }
};
