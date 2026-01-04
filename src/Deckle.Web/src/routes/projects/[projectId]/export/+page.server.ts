import { componentsApi, dataSourcesApi } from '$lib/api';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, fetch, parent }) => {
	try {
		const parentData = await parent();

		// Get component IDs from query parameter (can be single ID or comma-separated list)
		const componentsParam = url.searchParams.get('components');
		if (!componentsParam) {
			throw error(400, 'Missing components parameter');
		}

		// Parse component IDs
		const componentIds = componentsParam.split(',').map(id => id.trim()).filter(id => id.length > 0);
		if (componentIds.length === 0) {
			throw error(400, 'No valid component IDs provided');
		}

		// Load all components in parallel
		const componentPromises = componentIds.map(componentId =>
			componentsApi.getById(params.projectId, componentId, fetch)
		);

		const components = await Promise.all(componentPromises);

		// Load data sources for each component that has one
		const componentsWithData = await Promise.all(
			components.map(async (component) => {
				let dataSource = null;
				let dataSourceRows: Record<string, string>[] = [];

				if (component.type === 'Card' && component.dataSource) {
					try {
						dataSource = await dataSourcesApi.getById(component.dataSource.id, fetch);

						// Fetch the actual data rows
						const dataResult = await dataSourcesApi.getData(component.dataSource.id, fetch);
						if (dataResult.data && dataResult.data.length > 0) {
							const headers = dataResult.data[0]; // First row is headers
							const rows = dataResult.data.slice(1); // Remaining rows are data

							// Convert 2D array to array of objects
							dataSourceRows = rows.map((row) => {
								const rowObj: Record<string, string> = {};
								headers.forEach((header, index) => {
									rowObj[header] = row[index] || '';
								});
								return rowObj;
							});
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
