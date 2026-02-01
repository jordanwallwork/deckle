<script lang="ts">
	import type { PageData } from './$types';
	import type { AdminSampleComponent } from '$lib/types';
	import { ArrowLeftIcon } from '$lib/components';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let searchInput = $state(data.currentSearch);
	let typeFilter = $state(data.currentType);

	const componentTypes = [
		{ value: '', label: 'All Types' },
		{ value: 'card', label: 'Card' },
		{ value: 'playermat', label: 'Player Mat' }
	];

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getTypeIcon(type: string): string {
		switch (type.toLowerCase()) {
			case 'card':
				return 'cards';
			case 'dice':
				return 'dice';
			case 'playermat':
				return 'mat';
			default:
				return 'component';
		}
	}

	async function applyFilters() {
		const params = new URLSearchParams();
		if (searchInput) params.set('search', searchInput);
		if (typeFilter) params.set('type', typeFilter);
		params.set('page', '1');
		params.set('pageSize', data.currentPageSize.toString());
		await goto(`/admin/samples?${params.toString()}`);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			applyFilters();
		}
	}

	async function goToPage(page: number) {
		const params = new URLSearchParams();
		if (data.currentSearch) params.set('search', data.currentSearch);
		if (data.currentType) params.set('type', data.currentType);
		params.set('page', page.toString());
		params.set('pageSize', data.currentPageSize.toString());
		await goto(`/admin/samples?${params.toString()}`);
	}

	function renderStats(component: AdminSampleComponent): string {
		return Object.entries(component.stats)
			.filter(([, value]) => value !== '')
			.map(([key, value]) => `${key}: ${value}`)
			.join(' | ');
	}

	const totalPages = $derived(Math.ceil(data.samplesResponse.totalCount / data.currentPageSize));
</script>

<svelte:head>
	<title>Sample Components - Admin - Deckle</title>
</svelte:head>

<div class="samples-container">
	<div class="samples-header">
		<div class="header-left">
			<a href="/admin" class="back-link">
				<ArrowLeftIcon size={20} />
				Back to Dashboard
			</a>
			<h1>Sample Components</h1>
			<p class="samples-count">{data.samplesResponse.totalCount} sample components</p>
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
		<select bind:value={typeFilter} class="type-select">
			{#each componentTypes as opt}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
		<button onclick={applyFilters} class="filter-btn">Apply</button>
	</div>

	{#if data.samplesResponse.components.length === 0}
		<div class="empty-state">
			<p>No sample components found.</p>
			{#if data.currentSearch || data.currentType}
				<p class="empty-hint">Try adjusting your search or filter criteria.</p>
			{/if}
		</div>
	{:else}
		<div class="samples-grid">
			{#each data.samplesResponse.components as component}
				<div class="sample-card">
					<div class="card-header">
						<span class="type-badge" data-type={component.type.toLowerCase()}>
							{component.type}
						</span>
						<span class="date">{formatDate(component.createdAt)}</span>
					</div>
					<h3 class="component-name">{component.name}</h3>
					<div class="stats">
						{#each Object.entries(component.stats).filter(([, v]) => v !== '') as [key, value]}
							<span class="stat">
								<span class="stat-label">{key}:</span>
								<span class="stat-value">{value}</span>
							</span>
						{/each}
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

<style>
	.samples-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
	}

	.samples-header {
		margin-bottom: 2rem;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: #667eea;
		text-decoration: none;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	.samples-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #1a1a1a;
		margin: 0;
	}

	.samples-count {
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

	.type-select {
		padding: 0.75rem 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		background: white;
		cursor: pointer;
		min-width: 140px;
	}

	.type-select:focus {
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

	.samples-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1rem;
	}

	.sample-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 1.25rem;
		transition: all 0.2s ease;
	}

	.sample-card:hover {
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
	}

	.type-badge[data-type='card'] {
		background: #dbeafe;
		color: #1e40af;
	}

	.type-badge[data-type='playermat'] {
		background: #d1fae5;
		color: #065f46;
	}

	.date {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.component-name {
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

	@media (max-width: 768px) {
		.samples-container {
			padding: 1rem;
		}

		.filters-bar {
			flex-direction: column;
		}

		.search-input,
		.type-select {
			max-width: none;
			width: 100%;
		}

		.samples-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
