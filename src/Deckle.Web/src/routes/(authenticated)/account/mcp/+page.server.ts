import { apiKeysApi } from '$lib/api';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const apiKeys = await apiKeysApi.list(fetch);
		return { apiKeys };
	} catch (err) {
		console.error('Failed to load API keys:', err);
		throw error(500, 'Failed to load API keys');
	}
};
