import { error, redirect } from '@sveltejs/kit';
import { adminApi, ApiError } from '$lib/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, fetch, params }) => {
  const { user } = await parent();

  if (!user) {
    throw redirect(302, '/');
  }

  if (user.role !== 'Administrator') {
    throw error(403, 'Access denied. Administrator privileges required.');
  }

  try {
    const dataSource = await adminApi.getSampleDataSource(params.id, fetch);
    return {
      user,
      dataSource
    };
  } catch (err) {
    if (err instanceof ApiError) {
      throw error(err.status, err.message);
    }
    throw error(500, 'Failed to load sample data source');
  }
};
