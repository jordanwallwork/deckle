import { componentsApi, dataSourcesApi, ApiError } from '$lib/api';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { hasDataSource, isEditableComponent } from '$lib/utils/componentTypes';
import { parseDataRows } from '$lib/utils/mergeFields';

export const load: PageServerLoad = async ({ parent, fetch }) => {
  try {
    const { project } = await parent();

    const components = await componentsApi.listByProject(project.id, fetch);

    // For each component with a linked data source, fetch the rows.
    const componentRows: Record<string, Record<string, string>[]> = {};
    await Promise.all(
      components.map(async (component) => {
        if (hasDataSource(component) && component.dataSource) {
          try {
            const result = await dataSourcesApi.getData(component.dataSource.id, fetch);
            if (result.data && result.data.length > 0) {
              componentRows[component.id] = parseDataRows(result.data);
            }
          } catch (err) {
            console.error(
              `Failed to load data source for component ${component.id}:`,
              err
            );
          }
        }
      })
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
