import { dataSourcesApi, ApiError } from '$lib/api';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, parent, fetch }) => {
  const { project } = await parent();

  try {
    const dataSource = await dataSourcesApi.getSpreadsheetDetail(params.dataSourceId, fetch);
    return {
      project,
      dataSource
    };
  } catch (err) {
    if (err instanceof ApiError) {
      throw error(err.status, err.message);
    }
    console.error('Failed to load spreadsheet data source:', err);
    throw error(500, 'Failed to load spreadsheet data source');
  }
};
