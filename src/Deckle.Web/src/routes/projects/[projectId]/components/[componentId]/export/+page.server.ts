import { componentsApi, dataSourcesApi } from '$lib/api';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, parent }) => {
	try {
		const parentData = await parent();
		const component = await componentsApi.getById(params.projectId, params.componentId, fetch);

		// Load data source details and data if component has one linked
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
				console.error('Failed to load data source:', err);
				// Continue without data source if it fails to load
			}
		}

		return {
			component,
			project: parentData.project,
			dataSource,
			dataSourceRows
		};
	} catch (err) {
		console.error('Failed to load component:', err);
		throw error(404, 'Component not found');
	}
};
