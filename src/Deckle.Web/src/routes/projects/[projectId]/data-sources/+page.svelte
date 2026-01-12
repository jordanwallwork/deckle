<script lang="ts">
  import type { PageData } from './$types';
  import type { DataSource as DataSourceType, DataSourceSyncStatus } from '$lib/types';
  import { Card, Dialog, Button, EmptyState, ConfirmDialog } from '$lib/components';
  import { buildDataSourcesBreadcrumbs } from '$lib/utils/breadcrumbs';
  import { setBreadcrumbs } from '$lib/stores/breadcrumb';
  import { dataSourcesApi, ApiError } from '$lib/api';
  import { formatRelativeTime } from '$lib/utils/date.utils';
  import { syncDataSource } from '$lib/utils/dataSource.utils';
  import { invalidateAll } from '$app/navigation';

  let { data }: { data: PageData } = $props();

  // Update breadcrumbs for this page
  $effect(() => {
    setBreadcrumbs(buildDataSourcesBreadcrumbs(data.project));
  });

  let showAddModal = $state(false);
  let newSourceUrl = $state('');
  let newSourceName = $state('');
  let newSourceGid = $state<number | undefined>(undefined);
  let addingSource = $state(false);
  let errorMessage = $state('');

  // Track sync status per data source
  let syncStatuses = $state<Record<string, DataSourceSyncStatus>>({});
  let syncErrors = $state<Record<string, string>>({});

  // Delete confirmation
  let showDeleteConfirm = $state(false);
  let dataSourceToDelete: DataSourceType | null = $state(null);

  async function addDataSource(): Promise<void> {
    if (!newSourceUrl.trim()) {
      errorMessage = 'Please enter a Google Sheets URL';
      return;
    }

    try {
      addingSource = true;
      errorMessage = '';

      await dataSourcesApi.create({
        projectId: data.project.id,
        name: newSourceName.trim() || '',
        url: newSourceUrl.trim(),
        sheetGid: newSourceGid
      });

      // Refresh data from server
      await invalidateAll();

      // Close modal and reset form
      showAddModal = false;
      newSourceUrl = '';
      newSourceName = '';
      newSourceGid = undefined;
    } catch (err) {
      console.error('Failed to add data source:', err);
      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else {
        errorMessage = 'Failed to add data source. Please try again.';
      }
    } finally {
      addingSource = false;
    }
  }

  function initiateDelete(source: DataSourceType): void {
    dataSourceToDelete = source;
    showDeleteConfirm = true;
  }

  async function confirmDelete(): Promise<void> {
    if (!dataSourceToDelete) return;

    try {
      await dataSourcesApi.delete(dataSourceToDelete.id);
      await invalidateAll();
      showDeleteConfirm = false;
      dataSourceToDelete = null;
    } catch (err) {
      console.error('Failed to delete data source:', err);
      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else {
        errorMessage = 'Failed to delete data source. Please try again.';
      }
      showDeleteConfirm = false;
    }
  }

  function cancelDelete(): void {
    showDeleteConfirm = false;
    dataSourceToDelete = null;
  }

  async function handleSyncDataSource(source: DataSourceType): Promise<void> {
    try {
      // Set syncing status
      syncStatuses[source.id] = 'syncing';
      syncErrors[source.id] = '';

      // Use the shared sync utility
      await syncDataSource(source);

      // Refresh data from server to get updated source
      await invalidateAll();

      // Set idle status
      syncStatuses[source.id] = 'idle';
    } catch (error) {
      console.error('Failed to sync data source:', error);
      syncStatuses[source.id] = 'error';
      syncErrors[source.id] = error instanceof Error ? error.message : 'Failed to sync data source';
    }
  }

  function openAddModal(): void {
    showAddModal = true;
    errorMessage = '';
    newSourceUrl = '';
    newSourceName = '';
    newSourceGid = undefined;
  }
</script>

<svelte:head>
  <title>Data Sources · {data.project.name} · Deckle</title>
  <meta
    name="description"
    content="Connect Google Sheets and other data sources to {data.project
      .name}. Link spreadsheets to populate your game components with data."
  />
</svelte:head>

<div class="tab-content">
  <div class="tab-actions">
    <Button variant="primary" size="sm" onclick={openAddModal}>+ Add Data Source</Button>
  </div>

  {#if data.dataSources.length === 0}
    <EmptyState
      title="No data sources yet"
      subtitle="Connect data sources to populate your game components"
      border={false}
    />
  {:else}
    <div class="data-sources-list">
      {#each data.dataSources as source}
        <Card>
          <div class="card-content">
            <div class="source-info">
              <h3>{source.name}</h3>
              <p class="source-type">{source.type}</p>
              <p class="source-updated">Last updated {formatRelativeTime(source.updatedAt)}</p>
              {#if source.googleSheetsUrl}
                <a
                  href={source.googleSheetsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="source-link"
                >
                  Open in Google Sheets →
                </a>
              {/if}
              {#if source.headers && source.rowCount !== undefined}
                <p class="source-metadata">
                  {source.headers.length} columns, {source.rowCount} rows
                </p>
              {/if}
              {#if syncStatuses[source.id] === 'syncing'}
                <p class="sync-status syncing">Syncing...</p>
              {:else if syncStatuses[source.id] === 'error'}
                <p class="sync-status error">
                  Sync failed: {syncErrors[source.id]}
                </p>
              {/if}
            </div>
            <div class="source-actions">
              <Button
                variant="secondary"
                size="sm"
                onclick={() => handleSyncDataSource(source)}
                disabled={syncStatuses[source.id] === 'syncing'}
              >
                {syncStatuses[source.id] === 'syncing' ? 'Syncing...' : 'Sync'}
              </Button>
              <a
                href={`/projects/${data.project.id}/data-sources/${source.id}`}
                style="text-decoration: none;"
              >
                <Button variant="primary" size="sm">View</Button>
              </a>
              <Button variant="danger" size="sm" onclick={() => initiateDelete(source)}>
                Delete
              </Button>
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<Dialog
  bind:show={showAddModal}
  title="Add Google Sheets Data Source"
  onclose={() => (showAddModal = false)}
>
  {#if errorMessage}
    <div class="error-message">{errorMessage}</div>
  {/if}

  <div class="form-group">
    <label for="source-url">Google Sheets URL *</label>
    <input
      id="source-url"
      type="url"
      bind:value={newSourceUrl}
      placeholder="https://docs.google.com/spreadsheets/d/..."
      disabled={addingSource}
    />
  </div>

  <div class="form-group">
    <label for="source-name">Name (optional)</label>
    <input
      id="source-name"
      type="text"
      bind:value={newSourceName}
      placeholder="Leave empty to use spreadsheet title"
      disabled={addingSource}
    />
  </div>

  <div class="form-group">
    <label for="source-gid">Sheet GID (optional)</label>
    <input
      id="source-gid"
      type="number"
      bind:value={newSourceGid}
      placeholder="Default: 0 (first sheet)"
      disabled={addingSource}
    />
    <p class="help-text">
      Find in URL: #gid=123456 or ?gid=123456. Leave empty for first sheet (0).
    </p>
  </div>

  {#snippet actions()}
    <Button variant="secondary" onclick={() => (showAddModal = false)} disabled={addingSource}>
      Cancel
    </Button>
    <Button variant="primary" onclick={addDataSource} disabled={addingSource}>
      {addingSource ? 'Adding...' : 'Add Data Source'}
    </Button>
  {/snippet}
</Dialog>

<ConfirmDialog
  bind:show={showDeleteConfirm}
  title="Delete Data Source"
  message="Are you sure you want to delete this data source? This action cannot be undone."
  confirmText="Delete"
  confirmVariant="danger"
  onconfirm={confirmDelete}
  oncancel={cancelDelete}
/>

<style>
  .tab-content {
    min-height: 400px;
  }

  .tab-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1.5rem;
  }

  .data-sources-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .source-info h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin: 0 0 0.5rem 0;
  }

  .source-type {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    margin: 0 0 0.25rem 0;
  }

  .source-updated {
    font-size: 0.75rem;
    color: var(--color-muted-teal);
    margin: 0 0 0.5rem 0;
    opacity: 0.8;
  }

  .source-link {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .source-link:hover {
    color: var(--color-sage);
  }

  .source-metadata {
    font-size: 0.875rem;
    color: var(--color-sage);
    margin: 0.5rem 0 0 0;
    font-weight: 500;
  }

  .sync-status {
    font-size: 0.875rem;
    margin: 0.5rem 0 0 0;
  }

  .sync-status.syncing {
    color: var(--color-muted-teal);
  }

  .sync-status.error {
    color: #c00;
  }

  .source-actions {
    display: flex;
    gap: 0.75rem;
  }

  .error-message {
    background-color: #fee;
    border: 1px solid #fcc;
    color: #c00;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    font-weight: 600;
    color: var(--color-sage);
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--color-teal-grey);
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--color-muted-teal);
  }

  .form-group input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }

  .help-text {
    font-size: 0.75rem;
    color: var(--color-muted-teal);
    margin: 0.5rem 0 0 0;
  }
</style>
