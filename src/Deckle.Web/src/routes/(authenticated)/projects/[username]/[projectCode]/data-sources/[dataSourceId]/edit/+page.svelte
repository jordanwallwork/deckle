<script lang="ts">
	import type { PageData } from './$types';
	import { Button, SpreadsheetEditor, DeleteConfirmationDialog, EditableText } from '$lib/components';
	import { goto } from '$app/navigation';
	import { dataSourcesApi, ApiError } from '$lib/api';
	import { setBreadcrumbs } from '$lib/stores/breadcrumb';
	import { buildDataSourceEditBreadcrumbs } from '$lib/utils/breadcrumbs';

	interface SampleDataJson {
		headers: string[];
		rows: string[][];
	}

	let { data }: { data: PageData } = $props();

	const projectUrlBase = $derived(`/projects/${data.project.ownerUsername}/${data.project.code}`);

	function parseJsonData(jsonData: string | null | undefined): SampleDataJson {
		if (!jsonData) {
			return { headers: ['Column 1'], rows: [['']] };
		}
		try {
			const parsed = JSON.parse(jsonData) as SampleDataJson;
			if (parsed.headers && parsed.headers.length > 0) {
				return parsed;
			}
		} catch {
			// ignore parse errors
		}
		return { headers: ['Column 1'], rows: [['']] };
	}

	let name = $state(data.dataSource.name);
	let parsedData = $state(parseJsonData(data.dataSource.jsonData));
	let headers = $state(parsedData.headers);
	let rows = $state(parsedData.rows);

	let isSaving = $state(false);
	let saveMessage = $state('');
	let showDeleteDialog = $state(false);

	function handleSpreadsheetChange(newHeaders: string[], newRows: string[][]) {
		headers = newHeaders;
		rows = newRows;
	}

	async function handleSave() {
		isSaving = true;
		saveMessage = '';

		const jsonData = JSON.stringify({ headers, rows });

		try {
			const updated = await dataSourcesApi.updateSpreadsheet(data.dataSource.id, {
				name,
				jsonData
			});
			data.dataSource = updated;
			saveMessage = 'Saved';
			setTimeout(() => (saveMessage = ''), 2000);
		} catch (err) {
			if (err instanceof ApiError) {
				saveMessage = `Error: ${err.message}`;
			} else {
				saveMessage = 'Failed to save';
			}
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete() {
		try {
			await dataSourcesApi.delete(data.dataSource.id);
			await goto(`${projectUrlBase}/data-sources`);
		} catch (err) {
			console.error('Failed to delete data source:', err);
		}
	}

	async function handleNameChange(newName: string) {
		name = newName;
	}

	$effect(() => {
		setBreadcrumbs(buildDataSourceEditBreadcrumbs(data.project, data.dataSource.id, name));
	});
</script>

<svelte:head>
	<title>{name} - Edit - {data.project.name} - Deckle</title>
</svelte:head>

<div class="editor-container">
	<div class="editor-header">
		<div class="header-left">
			<EditableText value={name} onSave={handleNameChange} />
			<p class="editor-subtitle">
				{headers.length} column{headers.length !== 1 ? 's' : ''}, {rows.length} row{rows.length !==
				1
					? 's'
					: ''}
			</p>
		</div>
		<div class="header-actions">
			{#if saveMessage}
				<span class="save-message" class:error={saveMessage.startsWith('Error')}>
					{saveMessage}
				</span>
			{/if}
			<Button variant="primary" onclick={handleSave} disabled={isSaving}>
				{isSaving ? 'Saving...' : 'Save'}
			</Button>
			<Button variant="danger" onclick={() => (showDeleteDialog = true)}>Delete</Button>
		</div>
	</div>

	<SpreadsheetEditor {headers} {rows} onchange={handleSpreadsheetChange} />
</div>

<DeleteConfirmationDialog
	show={showDeleteDialog}
	itemName={name}
	itemType="data source"
	onConfirm={handleDelete}
	onCancel={() => (showDeleteDialog = false)}
/>

<style>
	.editor-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.header-left :global(.editable-text-display),
	.header-left :global(.editable-text-input) {
		font-size: 2rem;
		font-weight: 700;
		color: #1a1a1a;
	}

	.editor-subtitle {
		color: #666;
		font-size: 0.875rem;
		margin: 0;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.save-message {
		font-size: 0.875rem;
		color: #059669;
		font-weight: 500;
	}

	.save-message.error {
		color: #ef4444;
	}

	@media (max-width: 768px) {
		.editor-header {
			flex-direction: column;
		}
	}
</style>
