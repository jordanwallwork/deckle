import { componentsApi, dataSourcesApi, ApiError } from '$lib/api';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { hasDataSource } from '$lib/utils/componentTypes';
import { parseDataRows } from '$lib/utils/mergeFields';

export const load: PageServerLoad = async ({ parent, fetch }) => {
  try {
    const { project } = await parent();

    const components = await componentsApi.listByProject(project.id, fetch);

    // Load data-source rows in parallel so dropping a data-sourced component
    // can spawn one entity per row.
    const rowEntries = await Promise.all(
      components.map(async (component): Promise<[string, Record<string, string>[]]> => {
        if (!hasDataSource(component) || !component.dataSource) return [component.id, []];
        try {
          const { data } = await dataSourcesApi.getData(component.dataSource.id, fetch);
          return [component.id, data?.length ? parseDataRows(data) : []];
        } catch (err) {
          console.error(`Failed to load data source rows for component ${component.id}:`, err);
          return [component.id, []];
        }
      })
    );
    const componentRows: Record<string, Record<string, string>[]> = Object.fromEntries(
      rowEntries.filter(([, rows]) => rows.length > 0)
    );

    return { components, componentRows };
  } catch (err) {
    if (err instanceof ApiError) {
      throw error(err.status, err.message);
    }
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Failed to load tabletop data:', err);
    throw error(500, 'Failed to load tabletop data');
  }
};
