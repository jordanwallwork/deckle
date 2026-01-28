import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	// Check if user has administrator role
	if (user.role !== 'Administrator') {
		throw error(403, 'Access denied. Administrator privileges required.');
	}

	return {
		user
	};
};
