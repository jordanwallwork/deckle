<script lang="ts">
  import type { PageData } from './$types';
  import { config } from '$lib/config';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { buildDataSourceBreadcrumbs } from '$lib/utils/breadcrumbs';
  import { setBreadcrumbs } from '$lib/stores/breadcrumb';
  import { Button, DataTable } from '$lib/components';

  let { data }: { data: PageData } = $props();

  // Helper to build project URL base
  const projectUrlBase = $derived(`/projects/${data.project.ownerUsername}/${data.project.code}`);

  interface DataSource {
    id: string;
    projectId: string;
    name: string;
    type: string;
    googleSheetsId?: string;
    googleSheetsUrl?: string;
    headers?: string[];
    rowCount?: number;
    createdAt: string;
    updatedAt: string;
  }

  let dataSource = $state<DataSource | null>(null);
  let spreadsheetData = $state<string[][] | null>(null);
  let loading = $state(true);
  let errorMessage = $state('');

  // Name editing state
  let isEditingName = $state(false);
  let editedName = $state('');
  let savingName = $state(false);

  // Update breadcrumbs when dataSource is loaded
  $effect(() => {
    if (dataSource) {
      setBreadcrumbs(
        buildDataSourceBreadcrumbs(
          data.project,
          dataSource.id,
          dataSource.name
        )
      );
    }
  });

  onMount(async () => {
    await loadDataSource();
  });

  async function loadDataSource() {
    try {
      loading = true;
      errorMessage = '';

      // Get data source details
      const dsResponse = await fetch(`${config.apiUrl}/data-sources/${data.dataSourceId}`, {
        credentials: 'include'
      });

      if (!dsResponse.ok) {
        if (dsResponse.status === 404) {
          errorMessage = 'Data source not found';
          return;
        }
        throw new Error('Failed to load data source');
      }

      dataSource = await dsResponse.json();

      // Get spreadsheet data
      const dataResponse = await fetch(`${config.apiUrl}/data-sources/${data.dataSourceId}/data`, {
        credentials: 'include'
      });

      if (dataResponse.ok) {
        const result = await dataResponse.json();
        spreadsheetData = result.data;
      } else {
        errorMessage = 'Failed to load spreadsheet data. Please try syncing the data source.';
      }
    } catch (error) {
      console.error('Failed to load data source:', error);
      errorMessage = 'Failed to load data source. Please try again.';
    } finally {
      loading = false;
    }
  }

  async function deleteDataSource() {
    if (!confirm('Are you sure you want to delete this data source?')) {
      return;
    }

    try {
      const response = await fetch(`${config.apiUrl}/data-sources/${data.dataSourceId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        goto(`${projectUrlBase}/data-sources`);
      }
    } catch (error) {
      console.error('Failed to delete data source:', error);
    }
  }

  function startEditingName() {
    if (dataSource) {
      editedName = dataSource.name;
      isEditingName = true;
    }
  }

  function cancelEditingName() {
    isEditingName = false;
    editedName = '';
  }

  async function saveName() {
    if (!dataSource || !editedName.trim()) {
      return;
    }

    try {
      savingName = true;
      const response = await fetch(`${config.apiUrl}/data-sources/${data.dataSourceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ name: editedName.trim() })
      });

      if (response.ok) {
        const updated = await response.json();
        dataSource = updated;
        isEditingName = false;
        editedName = '';
      } else {
        errorMessage = 'Failed to update name';
      }
    } catch (error) {
      console.error('Failed to update name:', error);
      errorMessage = 'Failed to update name';
    } finally {
      savingName = false;
    }
  }
</script>

<svelte:head>
  {#if dataSource}
    <title>{dataSource.name} · Data Sources · {data.project.name} · Deckle</title>
    <meta
      name="description"
      content="View and manage {dataSource.name} data source for {data.project
        .name}. Preview spreadsheet data and configure how it connects to your game components."
    />
  {:else}
    <title>Data Source · {data.project.name} · Deckle</title>
    <meta name="description" content="View data source details for {data.project.name}." />
  {/if}
</svelte:head>

{#if loading}
  <div class="loading">Loading...</div>
{:else if errorMessage}
  <div class="error">
    <p>{errorMessage}</p>
    <a href={`${projectUrlBase}/data-sources`}>Back to Data Sources</a>
  </div>
{:else if dataSource}
  <div class="header">
    <div class="title-area">
      {#if isEditingName}
        <div class="name-edit-container">
          <input
            type="text"
            bind:value={editedName}
            class="name-input"
            placeholder="Data source name"
            disabled={savingName}
          />
          <div class="edit-actions">
            <button
              class="save-button"
              onclick={saveName}
              disabled={savingName || !editedName.trim()}
            >
              {savingName ? 'Saving...' : 'Save'}
            </button>
            <button class="cancel-button" onclick={cancelEditingName} disabled={savingName}>
              Cancel
            </button>
          </div>
        </div>
      {:else}
        <div class="name-display">
          <h1>{dataSource.name}</h1>
          <button class="edit-icon-button" onclick={startEditingName} title="Edit name">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        </div>
      {/if}
      <p class="type">{dataSource.type}</p>
    </div>

    <div class="actions">
      {#if dataSource.googleSheetsUrl}
        <a href={dataSource.googleSheetsUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary" size="sm">Open in Google Sheets</Button>
        </a>
      {/if}
      {#if dataSource.type === 'Spreadsheet'}
        <a href={`${projectUrlBase}/data-sources/${dataSource.id}/edit`} style="text-decoration: none;">
          <Button variant="secondary" size="sm">Edit</Button>
        </a>
      {/if}
      <Button variant="danger" size="sm" onclick={deleteDataSource}>Delete</Button>
    </div>
  </div>

  {#if spreadsheetData && spreadsheetData.length > 0}
    <div class="data-info">
      <p class="data-summary">
        {spreadsheetData.length > 1 ? spreadsheetData.length - 1 : 0} rows
        {spreadsheetData[0] ? `· ${spreadsheetData[0].length} columns` : ''}
        · Last updated {new Date(dataSource.updatedAt).toLocaleDateString()}
      </p>
    </div>

    <DataTable data={spreadsheetData} sortable={true} />
  {:else}
    <div class="empty-state">
      <p>No data available</p>
      <p class="empty-subtitle">
        Sync this data source from the{' '}
        <a href={`${projectUrlBase}/data-sources`}>Data Sources page</a>{' '}
        to load spreadsheet data.
      </p>
    </div>
  {/if}
{/if}

<style>
  .loading,
  .error {
    text-align: center;
    padding: 3rem;
    color: var(--color-muted-teal);
  }

  .error a {
    color: var(--color-muted-teal);
    text-decoration: underline;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
  }

  .title-area {
    flex: 1;
  }

  .name-display {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .title-area h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-sage);
    margin: 0;
  }

  .edit-icon-button {
    background: none;
    border: none;
    color: var(--color-muted-teal);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .edit-icon-button:hover {
    color: var(--color-sage);
    background-color: var(--color-teal-grey);
  }

  .name-edit-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .name-input {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-sage);
    padding: 0.5rem;
    border: 2px solid var(--color-teal-grey);
    border-radius: 6px;
    background-color: white;
    transition: border-color 0.2s ease;
  }

  .name-input:focus {
    outline: none;
    border-color: var(--color-muted-teal);
  }

  .name-input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }

  .edit-actions {
    display: flex;
    gap: 0.5rem;
  }

  .save-button,
  .cancel-button {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .save-button {
    background-color: var(--color-muted-teal);
    color: white;
  }

  .save-button:hover:not(:disabled) {
    background-color: var(--color-sage);
  }

  .save-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .cancel-button {
    background-color: #e0e0e0;
    color: #333;
  }

  .cancel-button:hover:not(:disabled) {
    background-color: #d0d0d0;
  }

  .type {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0.5rem 0 0 0;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .actions a {
    text-decoration: none;
  }

  .data-info {
    margin-bottom: 1rem;
  }

  .data-summary {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    margin: 0;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-state p {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin-bottom: 0.5rem;
  }

  .empty-subtitle {
    font-size: 1rem;
    color: var(--color-muted-teal);
  }

  .empty-subtitle a {
    color: var(--color-muted-teal);
    text-decoration: underline;
  }

  .empty-subtitle a:hover {
    color: var(--color-sage);
  }
</style>
