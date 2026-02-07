<script lang="ts">
	import type { PageData } from './$types';
	import type { AdminUser } from '$lib/types';
	import { adminApi, ApiError } from '$lib/api';
	import { Avatar } from '$lib/components';
	import { goto, invalidateAll } from '$app/navigation';
	import { setBreadcrumbs } from '$lib/stores/breadcrumb';
	import { buildAdminUsersBreadcrumbs } from '$lib/utils/breadcrumbs';

	let { data }: { data: PageData } = $props();

	let searchInput = $state(data.currentSearch);
	let isUpdating = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);

	function formatDate(dateString: string | undefined): string {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatStorage(bytes: number, quotaMb: number): string {
		const usedMb = bytes / (1024 * 1024);
		if (usedMb < 1) {
			const usedKb = bytes / 1024;
			return `${usedKb.toFixed(1)} KB / ${quotaMb} MB`;
		}
		return `${usedMb.toFixed(1)} MB / ${quotaMb} MB`;
	}

	function getStoragePercentage(bytes: number, quotaMb: number): number {
		const quotaBytes = quotaMb * 1024 * 1024;
		if (quotaBytes === 0) return 0;
		return Math.min(100, (bytes / quotaBytes) * 100);
	}

	async function handleSearch() {
		const params = new URLSearchParams();
		if (searchInput) params.set('search', searchInput);
		params.set('page', '1');
		params.set('pageSize', data.currentPageSize.toString());
		await goto(`/admin/users?${params.toString()}`);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSearch();
		}
	}

	async function goToPage(page: number) {
		const params = new URLSearchParams();
		if (data.currentSearch) params.set('search', data.currentSearch);
		params.set('page', page.toString());
		params.set('pageSize', data.currentPageSize.toString());
		await goto(`/admin/users?${params.toString()}`);
	}

	async function toggleRole(user: AdminUser) {
		if (isUpdating) return;
		isUpdating = user.id;
		errorMessage = null;

		const newRole = user.role === 'Administrator' ? 'User' : 'Administrator';

		try {
			await adminApi.updateUserRole(user.id, newRole);
			await invalidateAll();
		} catch (err) {
			if (err instanceof ApiError) {
				errorMessage = err.message;
			} else {
				errorMessage = 'Failed to update user role';
			}
		} finally {
			isUpdating = null;
		}
	}

	const totalPages = $derived(Math.ceil(data.usersResponse.totalCount / data.currentPageSize));

	$effect(() => {
		setBreadcrumbs(buildAdminUsersBreadcrumbs());
	});
</script>

<svelte:head>
	<title>User Management - Admin - Deckle</title>
</svelte:head>

<div class="users-container">
	<div class="users-header">
		<div class="header-left">
			<h1>User Management</h1>
			<p class="users-count">{data.usersResponse.totalCount} total users</p>
		</div>
	</div>

	{#if errorMessage}
		<div class="error-banner">
			<span>{errorMessage}</span>
			<button onclick={() => (errorMessage = null)} class="dismiss-btn">Dismiss</button>
		</div>
	{/if}

	<div class="search-bar">
		<input
			type="text"
			placeholder="Search by name or email..."
			bind:value={searchInput}
			onkeydown={handleKeydown}
		/>
		<button onclick={handleSearch} class="search-btn">Search</button>
	</div>

	<div class="users-table-container">
		<table class="users-table">
			<thead>
				<tr>
					<th>User</th>
					<th>Sign-up Date</th>
					<th>Last Login</th>
					<th>Storage</th>
					<th>Projects</th>
					<th>Role</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.usersResponse.users as user}
					<tr>
						<td class="user-cell">
							<div class="user-info">
								<Avatar src={user.pictureUrl} name={user.name || user.email} size="md" class="user-avatar" />
								<div class="user-details">
									<span class="user-name">{user.name || 'No name'}</span>
									<span class="user-email">{user.email}</span>
								</div>
							</div>
						</td>
						<td>{formatDate(user.createdAt)}</td>
						<td>{formatDate(user.lastLoginAt)}</td>
						<td class="storage-cell">
							<div class="storage-info">
								<span class="storage-text"
									>{formatStorage(user.storageUsedBytes, user.storageQuotaMb)}</span
								>
								<div class="storage-bar">
									<div
										class="storage-fill"
										class:warning={getStoragePercentage(user.storageUsedBytes, user.storageQuotaMb) >
											80}
										style="width: {getStoragePercentage(user.storageUsedBytes, user.storageQuotaMb)}%"
									></div>
								</div>
							</div>
						</td>
						<td class="projects-cell">{user.projectCount}</td>
						<td>
							<span class="role-badge" class:admin={user.role === 'Administrator'}>
								{user.role}
							</span>
						</td>
						<td class="actions-cell">
							<button
								class="action-btn"
								class:loading={isUpdating === user.id}
								onclick={() => toggleRole(user)}
								disabled={isUpdating !== null}
							>
								{#if isUpdating === user.id}
									...
								{:else if user.role === 'Administrator'}
									Demote
								{:else}
									Promote
								{/if}
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if totalPages > 1}
		<div class="pagination">
			<button
				class="page-btn"
				disabled={data.currentPage <= 1}
				onclick={() => goToPage(data.currentPage - 1)}
			>
				Previous
			</button>
			<span class="page-info">
				Page {data.currentPage} of {totalPages}
			</span>
			<button
				class="page-btn"
				disabled={data.currentPage >= totalPages}
				onclick={() => goToPage(data.currentPage + 1)}
			>
				Next
			</button>
		</div>
	{/if}
</div>

<style>
	.users-header {
		margin-bottom: 2rem;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.users-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #1a1a1a;
		margin: 0;
	}

	.users-count {
		color: #666;
		font-size: 0.875rem;
		margin: 0;
	}

	.error-banner {
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.5rem;
		padding: 1rem;
		margin-bottom: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: #dc2626;
	}

	.dismiss-btn {
		background: transparent;
		border: none;
		color: #dc2626;
		cursor: pointer;
		font-weight: 600;
	}

	.search-bar {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.search-bar input {
		flex: 1;
		max-width: 400px;
		padding: 0.75rem 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		font-size: 0.875rem;
	}

	.search-bar input:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	.search-btn {
		padding: 0.75rem 1.5rem;
		background: #667eea;
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.search-btn:hover {
		background: #5a67d8;
	}

	.users-table-container {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.users-table {
		width: 100%;
		border-collapse: collapse;
	}

	.users-table th {
		background: #f9fafb;
		padding: 1rem;
		text-align: left;
		font-weight: 600;
		color: #374151;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid #e5e7eb;
	}

	.users-table td {
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
		font-size: 0.875rem;
		color: #374151;
	}

	.users-table tbody tr:hover {
		background: #f9fafb;
	}

	.users-table tbody tr:last-child td {
		border-bottom: none;
	}

	.user-cell {
		min-width: 250px;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.user-info :global(.user-avatar) {
		--avatar-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.user-details {
		display: flex;
		flex-direction: column;
	}

	.user-name {
		font-weight: 600;
		color: #1a1a1a;
	}

	.user-email {
		font-size: 0.8125rem;
		color: #6b7280;
	}

	.storage-cell {
		min-width: 160px;
	}

	.storage-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.storage-text {
		font-size: 0.8125rem;
	}

	.storage-bar {
		width: 100%;
		height: 6px;
		background: #e5e7eb;
		border-radius: 3px;
		overflow: hidden;
	}

	.storage-fill {
		height: 100%;
		background: #667eea;
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.storage-fill.warning {
		background: #f59e0b;
	}

	.projects-cell {
		text-align: center;
		font-weight: 600;
	}

	.role-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		background: #e5e7eb;
		color: #374151;
	}

	.role-badge.admin {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.actions-cell {
		text-align: center;
	}

	.action-btn {
		padding: 0.5rem 1rem;
		border: 1px solid #e5e7eb;
		background: white;
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 80px;
	}

	.action-btn:hover:not(:disabled) {
		border-color: #667eea;
		color: #667eea;
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-btn.loading {
		color: #9ca3af;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.page-btn {
		padding: 0.5rem 1rem;
		border: 1px solid #e5e7eb;
		background: white;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.page-btn:hover:not(:disabled) {
		border-color: #667eea;
		color: #667eea;
	}

	.page-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-info {
		font-size: 0.875rem;
		color: #6b7280;
	}

	@media (max-width: 1024px) {
		.users-table-container {
			overflow-x: auto;
		}

		.users-table {
			min-width: 900px;
		}
	}

	@media (max-width: 640px) {
		.search-bar {
			flex-direction: column;
		}

		.search-bar input {
			max-width: none;
		}
	}
</style>
