<script lang="ts">
	import type { PageData } from './$types';
	import { Button, Dialog, DeleteConfirmationDialog } from '$lib/components';
	import { goto, invalidateAll } from '$app/navigation';
	import { adminApi, ApiError } from '$lib/api';
	import { setBreadcrumbs } from '$lib/stores/breadcrumb';
	import { buildAdminDataSourcesBreadcrumbs } from '$lib/utils/breadcrumbs';

	let { data }: { data: PageData } = $props();

	let searchInput = $state(data.currentSearch);

	// Create modal state
	let showCreateModal = $state(false);
	let newName = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	// Delete state
	let deleteTarget = $state<{ id: string; name: string } | null>(null);

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function openCreateModal() {
		showCreateModal = true;
		newName = '';
		errorMessage = '';
	}

	function closeCreateModal() {
		showCreateModal = false;
		newName = '';
		errorMessage = '';
	}

	async function handleCreate() {
		if (!newName.trim()) {
			errorMessage = 'Please enter a name';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			const created = await adminApi.createSampleDataSource({ name: newName.trim() });
			closeCreateModal();
			await goto(`/admin/data-sources/${created.id}`);
		} catch (err) {
			if (err instanceof ApiError) {
				errorMessage = err.message;
			} else {
				errorMessage = 'Failed to create data source';
			}
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDelete() {
		if (!deleteTarget) return;

		try {
			await adminApi.deleteSampleDataSource(deleteTarget.id);
			deleteTarget = null;
			await invalidateAll();
		} catch (err) {
			console.error('Failed to delete data source:', err);
		}
	}

	async function applyFilters() {
		const params = new URLSearchParams();
		if (searchInput) params.set('search', searchInput);
		params.set('page', '1');
		params.set('pageSize', data.currentPageSize.toString());
		await goto(`/admin/data-sources?${params.toString()}`);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			applyFilters();
		}
	}

	async function goToPage(page: number) {
		const params = new URLSearchParams();
		if (data.currentSearch) params.set('search', data.currentSearch);
		params.set('page', page.toString());
		params.set('pageSize', data.currentPageSize.toString());
		await goto(`/admin/data-sources?${params.toString()}`);
	}

	const totalPages = $derived(
		Math.ceil(data.dataSourcesResponse.totalCount / data.currentPageSize)
	);

	$effect(() => {
		setBreadcrumbs(buildAdminDataSourcesBreadcrumbs());
	});
</script>

<svelte:head>
	<title>Sample Data Sources - Admin - Deckle</title>
</svelte:head>

<div class="datasources-container">
	<div class="datasources-header">
		<div class="header-left">
			<h1>Sample Data Sources</h1>
			<p class="datasources-count">
				{data.dataSourcesResponse.totalCount} data source{data.dataSourcesResponse.totalCount !== 1
					? 's'
					: ''}
			</p>
		</div>
		<div class="header-right">
			<Button variant="primary" onclick={openCreateModal}>+ Add Data Source</Button>
		</div>
	</div>

	<div class="filters-bar">
		<input
			type="text"
			placeholder="Search by name..."
			bind:value={searchInput}
			onkeydown={handleKeydown}
			class="search-input"
		/>
		<button onclick={applyFilters} class="filter-btn">Apply</button>
	</div>

	{#if data.dataSourcesResponse.dataSources.length === 0}
		<div class="empty-state">
			<p>No sample data sources found.</p>
			{#if data.currentSearch}
				<p class="empty-hint">Try adjusting your search criteria.</p>
			{/if}
		</div>
	{:else}
		<div class="datasources-grid">
			{#each data.dataSourcesResponse.dataSources as ds}
				<div class="datasource-card">
					<div class="card-header">
						<span class="type-badge">Sample</span>
						<span class="date">{formatDate(ds.createdAt)}</span>
					</div>
					<h3 class="datasource-name">{ds.name}</h3>
					<div class="stats">
						{#if ds.headers && ds.headers.length > 0}
							<span class="stat">
								<span class="stat-label">Columns:</span>
								<span class="stat-value">{ds.headers.length}</span>
							</span>
						{/if}
						{#if ds.rowCount != null}
							<span class="stat">
								<span class="stat-label">Rows:</span>
								<span class="stat-value">{ds.rowCount}</span>
							</span>
						{/if}
					</div>
					<div class="card-actions">
						<a href="/admin/data-sources/{ds.id}" class="edit-link">Edit</a>
						<button
							class="delete-btn"
							onclick={() => (deleteTarget = { id: ds.id, name: ds.name })}
						>
							Delete
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

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

<Dialog
	bind:show={showCreateModal}
	title="New Sample Data Source"
	maxWidth="480px"
	onclose={closeCreateModal}
>
	<div class="form-field">
		<label for="ds-name" class="form-label">Name</label>
		<input
			id="ds-name"
			type="text"
			bind:value={newName}
			placeholder="e.g. Playing Cards, Monster Stats"
			class="form-input"
		/>
	</div>

	{#if errorMessage}
		<p class="error-message">{errorMessage}</p>
	{/if}

	{#snippet actions()}
		<Button variant="secondary" onclick={closeCreateModal} disabled={isSubmitting}>Cancel</Button>
		<Button variant="primary" onclick={handleCreate} disabled={isSubmitting || !newName.trim()}>
			{#if isSubmitting}
				Creating...
			{:else}
				Create
			{/if}
		</Button>
	{/snippet}
</Dialog>

<DeleteConfirmationDialog
	show={!!deleteTarget}
	itemName={deleteTarget?.name ?? ''}
	itemType="data source"
	onConfirm={handleDelete}
	onCancel={() => (deleteTarget = null)}
/>

<style>
	.datasources-header {
		margin-bottom: 2rem;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.header-right {
		flex-shrink: 0;
	}

	.datasources-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #1a1a1a;
		margin: 0;
	}

	.datasources-count {
		color: #666;
		font-size: 0.875rem;
		margin: 0;
	}

	.filters-bar {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.search-input {
		flex: 1;
		min-width: 200px;
		max-width: 400px;
		padding: 0.75rem 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		font-size: 0.875rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	.filter-btn {
		padding: 0.75rem 1.5rem;
		background: #667eea;
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.filter-btn:hover {
		background: #5a67d8;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
	}

	.empty-state p {
		color: #666;
		margin: 0;
	}

	.empty-hint {
		margin-top: 0.5rem !important;
		font-size: 0.875rem;
	}

	.datasources-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1rem;
	}

	.datasource-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 1.25rem;
		transition: all 0.2s ease;
	}

	.datasource-card:hover {
		border-color: #667eea;
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.type-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		background: #fef3c7;
		color: #92400e;
	}

	.date {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.datasource-name {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1a1a1a;
		margin: 0 0 0.75rem 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.stat {
		display: inline-flex;
		gap: 0.25rem;
		font-size: 0.8125rem;
		background: #f3f4f6;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}

	.stat-label {
		color: #6b7280;
	}

	.stat-value {
		color: #374151;
		font-weight: 500;
	}

	.card-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid #e5e7eb;
	}

	.edit-link {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #667eea;
		background: #f0f4ff;
		border-radius: 0.375rem;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.edit-link:hover {
		background: #667eea;
		color: white;
	}

	.delete-btn {
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #ef4444;
		background: #fef2f2;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.delete-btn:hover {
		background: #ef4444;
		color: white;
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

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.form-input {
		padding: 0.75rem 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		font-size: 0.875rem;
	}

	.form-input:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	.error-message {
		color: #d32f2f;
		font-size: 0.875rem;
		margin: 1rem 0 0 0;
		padding: 0.75rem;
		background-color: #ffebee;
		border-radius: 8px;
		border: 1px solid #ef9a9a;
	}

	@media (max-width: 768px) {
		.datasources-header {
			flex-direction: column;
			gap: 1rem;
		}

		.filters-bar {
			flex-direction: column;
		}

		.search-input {
			max-width: none;
			width: 100%;
		}

		.datasources-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
