<script lang="ts">
	import type { PageData } from './$types';
	import type { AdminSampleComponent, AdminSampleDataSource } from '$lib/types';
	import { Button, Dialog, CardConfigForm, PlayerMatConfigForm } from '$lib/components';
	import { goto, invalidateAll } from '$app/navigation';
	import { adminApi, ApiError } from '$lib/api';
	import { setBreadcrumbs } from '$lib/stores/breadcrumb';
	import { buildAdminSamplesBreadcrumbs } from '$lib/utils/breadcrumbs';

	let { data }: { data: PageData } = $props();

	let searchInput = $state(data.currentSearch);
	let typeFilter = $state(data.currentType);

	// Modal state
	let showModal = $state(false);
	let selectedType: 'card' | 'playermat' | null = $state(null);
	let componentName = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	// Card configuration
	let cardSize = $state('StandardPoker');
	let cardHorizontal = $state(false);

	// Player Mat configuration
	let playerMatSizeMode: 'preset' | 'custom' = $state('preset');
	let playerMatPresetSize = $state<string | null>('A4');
	let playerMatHorizontal = $state(false);
	let playerMatCustomWidth = $state('210');
	let playerMatCustomHeight = $state('297');

	function openModal() {
		showModal = true;
		selectedType = null;
		componentName = '';
		cardSize = 'StandardPoker';
		cardHorizontal = false;
		playerMatSizeMode = 'preset';
		playerMatPresetSize = 'A4';
		playerMatHorizontal = false;
		playerMatCustomWidth = '210';
		playerMatCustomHeight = '297';
		errorMessage = '';
	}

	function closeModal() {
		showModal = false;
		selectedType = null;
		componentName = '';
		errorMessage = '';
	}

	function selectType(type: 'card' | 'dice' | 'playermat') {
		// Only allow card and playermat for samples (not dice)
		if (type === 'dice') return;
		selectedType = type;
		errorMessage = '';
	}

	async function handleSubmit() {
		if (!componentName.trim()) {
			errorMessage = 'Please enter a component name';
			return;
		}

		if (!selectedType) {
			errorMessage = 'Please select a component type';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			if (selectedType === 'card') {
				await adminApi.createSampleCard({
					name: componentName,
					size: cardSize,
					horizontal: cardHorizontal
				});
			} else if (selectedType === 'playermat') {
				await adminApi.createSamplePlayerMat({
					name: componentName,
					presetSize: playerMatSizeMode === 'preset' ? playerMatPresetSize : null,
					horizontal: playerMatHorizontal,
					customWidthMm: playerMatSizeMode === 'custom' ? parseFloat(playerMatCustomWidth) : null,
					customHeightMm: playerMatSizeMode === 'custom' ? parseFloat(playerMatCustomHeight) : null
				});
			}

			await invalidateAll();
			closeModal();
		} catch (err) {
			console.error('Error creating sample component:', err);
			if (err instanceof ApiError) {
				errorMessage = err.message;
			} else {
				errorMessage = 'Failed to create sample component. Please try again.';
			}
		} finally {
			isSubmitting = false;
		}
	}

	// Data source linking state
	let linkTarget = $state<AdminSampleComponent | null>(null);
	let selectedDataSourceId = $state<string | null>(null);
	let isLinking = $state(false);

	function openLinkModal(component: AdminSampleComponent) {
		linkTarget = component;
		selectedDataSourceId = component.dataSource?.id ?? null;
	}

	function closeLinkModal() {
		linkTarget = null;
		selectedDataSourceId = null;
	}

	async function handleLink() {
		if (!linkTarget) return;
		isLinking = true;
		try {
			await adminApi.updateSampleComponentDataSource(linkTarget.id, selectedDataSourceId);
			await invalidateAll();
			closeLinkModal();
		} catch (err) {
			console.error('Failed to link data source:', err);
		} finally {
			isLinking = false;
		}
	}

	async function handleUnlink() {
		if (!linkTarget) return;
		isLinking = true;
		try {
			await adminApi.updateSampleComponentDataSource(linkTarget.id, null);
			await invalidateAll();
			closeLinkModal();
		} catch (err) {
			console.error('Failed to unlink data source:', err);
		} finally {
			isLinking = false;
		}
	}

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

	$effect(() => {
		setBreadcrumbs(buildAdminSamplesBreadcrumbs());
	});
</script>

<svelte:head>
	<title>Sample Components - Admin - Deckle</title>
</svelte:head>

<div class="samples-container">
	<div class="samples-header">
		<div class="header-left">
			<h1>Sample Components</h1>
			<p class="samples-count">{data.samplesResponse.totalCount} sample components</p>
		</div>
		<div class="header-right">
			<Button variant="primary" onclick={openModal}>+ Add Sample</Button>
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
					{#if component.type === 'Card' || component.type === 'PlayerMat'}
						<div class="datasource-info">
							{#if component.dataSource}
								<span class="ds-label">Data:</span>
								<a href="/admin/data-sources/{component.dataSource.id}" class="ds-link">
									{component.dataSource.name}
								</a>
								<button class="ds-change-btn" onclick={() => openLinkModal(component)}>
									Change
								</button>
							{:else}
								<button class="ds-link-btn" onclick={() => openLinkModal(component)}>
									Link Data Source
								</button>
							{/if}
						</div>
						<div class="edit-actions">
							<a href="/admin/samples/{component.id}/front" class="edit-link">Edit Front</a>
							<a href="/admin/samples/{component.id}/back" class="edit-link">Edit Back</a>
						</div>
					{/if}
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

<Dialog bind:show={showModal} title="New Sample Component" maxWidth="600px" onclose={closeModal}>
	{#if !selectedType}
		<p class="type-hint">Select a component type to create a sample template.</p>
		<div class="type-selection">
			<button class="type-card" onclick={() => selectType('card')}>
				<div class="type-icon">🃏</div>
				<h4>Card</h4>
				<p>Create a sample card template</p>
			</button>
			<button class="type-card" onclick={() => selectType('playermat')}>
				<div class="type-icon">📋</div>
				<h4>Player Mat</h4>
				<p>Create a sample player mat template</p>
			</button>
		</div>
	{:else}
		<Button variant="text" onclick={() => (selectedType = null)}>
			← Back to component types
		</Button>

		{#if selectedType === 'card'}
			<CardConfigForm bind:cardSize bind:cardHorizontal bind:componentName />
		{:else if selectedType === 'playermat'}
			<PlayerMatConfigForm
				bind:componentName
				bind:sizeMode={playerMatSizeMode}
				bind:presetSize={playerMatPresetSize}
				bind:horizontal={playerMatHorizontal}
				bind:customWidthMm={playerMatCustomWidth}
				bind:customHeightMm={playerMatCustomHeight}
			/>
		{/if}

		{#if errorMessage}
			<p class="error-message">{errorMessage}</p>
		{/if}
	{/if}

	{#snippet actions()}
		{#if selectedType}
			<Button variant="secondary" onclick={closeModal} disabled={isSubmitting}>Cancel</Button>
			<Button variant="primary" onclick={handleSubmit} disabled={isSubmitting}>
				{#if isSubmitting}
					Adding...
				{:else}
					Add Sample
				{/if}
			</Button>
		{/if}
	{/snippet}
</Dialog>

<Dialog
	show={!!linkTarget}
	title="Link Data Source"
	maxWidth="600px"
	onclose={closeLinkModal}
>
	{#snippet children()}
		{#if data.sampleDataSources.length === 0}
			<p class="no-datasources">
				No sample data sources available. <a href="/admin/data-sources">Create one first</a>.
			</p>
		{:else}
			<div class="datasource-options">
				{#each data.sampleDataSources as ds}
					<label class="datasource-option">
						<input
							type="radio"
							name="dataSource"
							value={ds.id}
							checked={selectedDataSourceId === ds.id}
							onchange={() => (selectedDataSourceId = ds.id)}
						/>
						<div class="datasource-details">
							<span class="datasource-name">{ds.name}</span>
							<span class="datasource-meta">
								{#if ds.headers && ds.headers.length > 0}
									{ds.headers.length} columns
								{/if}
								{#if ds.rowCount != null}
									&middot; {ds.rowCount} rows
								{/if}
							</span>
						</div>
					</label>
				{/each}
			</div>
		{/if}
	{/snippet}

	{#snippet actions()}
		{#if linkTarget?.dataSource}
			<Button variant="danger" onclick={handleUnlink} disabled={isLinking}>Remove Link</Button>
		{/if}
		<Button variant="secondary" onclick={closeLinkModal} disabled={isLinking}>Cancel</Button>
		{#if data.sampleDataSources.length > 0}
			<Button
				variant="primary"
				onclick={handleLink}
				disabled={isLinking || !selectedDataSourceId}
			>
				{isLinking ? 'Linking...' : 'Link'}
			</Button>
		{/if}
	{/snippet}
</Dialog>

<style>
	.samples-header {
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

	.edit-actions {
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
		.samples-header {
			flex-direction: column;
			gap: 1rem;
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

	/* Modal styles */
	.type-hint {
		color: #666;
		font-size: 0.875rem;
		margin: 0 0 1.5rem 0;
	}

	.type-selection {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.type-card {
		background-color: white;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		padding: 2rem 1.5rem;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.type-card:hover {
		border-color: #667eea;
		transform: translateY(-4px);
		box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2);
	}

	.type-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.type-card h4 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1a1a1a;
		margin: 0 0 0.5rem 0;
	}

	.type-card p {
		font-size: 0.875rem;
		color: #666;
		margin: 0;
		line-height: 1.4;
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

	/* Data source info on sample cards */
	.datasource-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #e5e7eb;
		font-size: 0.8125rem;
	}

	.ds-label {
		color: #6b7280;
		flex-shrink: 0;
	}

	.ds-link {
		color: #667eea;
		text-decoration: none;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ds-link:hover {
		text-decoration: underline;
	}

	.ds-change-btn {
		flex-shrink: 0;
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		color: #6b7280;
		background: #f3f4f6;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.ds-change-btn:hover {
		color: #667eea;
		background: #f0f4ff;
	}

	.ds-link-btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		color: #667eea;
		background: #f0f4ff;
		border: 1px dashed #c7d2fe;
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.ds-link-btn:hover {
		background: #e0e7ff;
		border-color: #667eea;
	}

	/* Link data source dialog */
	.no-datasources {
		color: #666;
		font-style: italic;
		text-align: center;
		padding: 1rem;
		margin: 0;
	}

	.no-datasources a {
		color: #667eea;
	}

	.datasource-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.datasource-option {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.datasource-option:hover {
		border-color: #c7d2fe;
		background-color: #f9fafb;
	}

	.datasource-option:has(input:checked) {
		border-color: #667eea;
		background-color: #f0f4ff;
	}

	.datasource-option input[type='radio'] {
		width: 20px;
		height: 20px;
		cursor: pointer;
		flex-shrink: 0;
	}

	.datasource-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.datasource-name {
		font-size: 1rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.datasource-meta {
		font-size: 0.875rem;
		color: #6b7280;
	}
</style>
