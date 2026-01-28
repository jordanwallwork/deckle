import { error, redirect } from '@sveltejs/kit';
import { adminApi, ApiError } from '$lib/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, fetch, url }) => {
	const { user } = await parent();

	// Redirect to login if not authenticated
	if (!user) {
		throw redirect(302, '/');
	}

	// Check if user has administrator role
	if (user.role !== 'Administrator') {
		throw error(403, 'Access denied. Administrator privileges required.');
	}

	// Get pagination params from URL
	const page = parseInt(url.searchParams.get('page') || '1');
	const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
	const search = url.searchParams.get('search') || undefined;

	try {
		const usersResponse = await adminApi.getUsers({ page, pageSize, search }, fetch);
		return {
			user,
			usersResponse,
			currentPage: page,
			currentPageSize: pageSize,
			currentSearch: search || ''
		};
	} catch (err) {
		if (err instanceof ApiError) {
			throw error(err.status, err.message);
		}
		throw error(500, 'Failed to load users');
	}
};
