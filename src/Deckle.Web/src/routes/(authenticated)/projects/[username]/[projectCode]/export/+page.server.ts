import { componentsApi, dataSourcesApi } from '$lib/api';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { hasDataSource, isEditableComponent } from '$lib/utils/componentTypes';
import { parseDataRows } from '$lib/utils/mergeFields';

export const load: PageServerLoad = async ({ url, fetch, parent }) => {
  try {
    const parentData = await parent();

    // Load all components for the project to show in the selector
    const allComponents = await componentsApi.listByProject(parentData.project.id, fetch);

    // Filter to only exportable components (Card, GameBoard, and PlayerMat)
    const exportableComponents = allComponents.filter((c) => isEditableComponent(c));

    // Get component IDs from query parameter (can be single ID or comma-separated list)
    const componentsParam = url.searchParams.get('components');

    // If no components parameter, return all exportable components info but no loaded component data
    if (!componentsParam) {
      return {
        allExportableComponents: exportableComponents,
        components: [],
        project: parentData.project
      };
    }

    // Parse component IDs
    const componentIds = componentsParam
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    if (componentIds.length === 0) {
      return {
        allExportableComponents: exportableComponents,
        components: [],
        project: parentData.project
      };
    }

    // Load selected components in parallel
    const componentPromises = componentIds.map((componentId) =>
      componentsApi.getById(parentData.project.id, componentId, fetch)
    );

    const components = await Promise.all(componentPromises);

    // Load data sources for each component that has one
    const componentsWithData = await Promise.all(
      components.map(async (component) => {
        let dataSource = null;
        let dataSourceRows: Record<string, string>[] = [];

        // Check if component can have a data source (Card or PlayerMat)
        if (hasDataSource(component) && component.dataSource) {
          try {
            dataSource = await dataSourcesApi.getById(component.dataSource.id, fetch);

            // Fetch the actual data rows
            const dataResult = await dataSourcesApi.getData(component.dataSource.id, fetch);
            if (dataResult.data && dataResult.data.length > 0) {
              dataSourceRows = parseDataRows(dataResult.data);
            }
          } catch (err) {
            console.error(`Failed to load data source for component ${component.id}:`, err);
            // Continue without data source if it fails to load
          }
        }

        return {
          component,
          dataSource,
          dataSourceRows
        };
      })
    );

    return {
      allExportableComponents: exportableComponents,
      components: componentsWithData,
      project: parentData.project
    };
  } catch (err) {
    if (err instanceof Error && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    console.error('Failed to load components:', err);
    throw error(500, 'Failed to load export data');
  }
};
