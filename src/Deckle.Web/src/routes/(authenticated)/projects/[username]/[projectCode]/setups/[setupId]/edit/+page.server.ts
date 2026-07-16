import { gameSetupsApi, componentsApi, ApiError } from '$lib/api';
import type { ProjectComponentRef } from '$lib/gamerunner';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

/**
 * Load the setup being edited plus the project's components. The components feed
 * the validator's `projectContext` (referential-integrity checks) and the
 * component dropdown slots. The full DSL `document` comes back verbatim from the
 * server (typed `unknown`) and is narrowed client-side.
 */
export const load: PageServerLoad = async ({ params, parent, fetch }) => {
	const { project } = await parent();

	try {
		const [setup, components] = await Promise.all([
			gameSetupsApi.get(project.id, params.setupId, fetch),
			componentsApi.listByProject(project.id, fetch)
		]);

		const componentRefs: ProjectComponentRef[] = components.map((c) => ({
			id: c.id,
			name: c.name,
			type: c.type
		}));

		return { project, setup, componentRefs };
	} catch (err) {
		if (err instanceof ApiError) {
			throw error(err.status, err.message);
		}
		console.error('Failed to load game setup:', err);
		throw error(500, 'Failed to load game setup');
	}
};
