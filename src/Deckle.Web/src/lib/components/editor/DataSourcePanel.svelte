<script lang="ts">
  import Panel from './_components/Panel.svelte';
  import { Button, DataTable } from '$lib/components';
  import LinkDataSourceModal from '../../../routes/(authenticated)/projects/[username]/[projectCode]/components/_components/LinkDataSourceModal.svelte';
  import { componentsApi, dataSourcesApi } from '$lib/api';
  import { invalidateAll } from '$app/navigation';
  import type { DataSource } from '$lib/types';
  import { formatRelativeTime } from '$lib/utils/date.utils';
  import { syncDataSource } from '$lib/utils/dataSource.utils';
  import { getDataSourceRow } from '$lib/stores/dataSourceRow';
  import { ChevronLeftIcon, MaximizeIcon, MinimizeIcon } from '$lib/components/icons';

  interface Props {
    dataSource: DataSource | null;
    dataSources: DataSource[];
    projectId: string;
    componentId: string;
    onMinimize?: () => void;
    onMaximize?: () => void;
    readOnly?: boolean;
  }

  let {
    dataSource,
    dataSources,
    projectId,
    componentId,
    onMinimize,
    onMaximize,
    readOnly = false
  }: Props = $props();

  // Get the store reference during component initialization
  const dataSourceRowStore = getDataSourceRow();

  let showLinkDataSourceModal = $state(false);
  let isSyncing = $state(false);
  let spreadsheetData = $state<string[][] | null>(null);
  let loadingData = $state(false);
  let selectedRowIndex = $state(0); // Default to first row

  // Load data when component mounts or dataSource changes
  $effect(() => {
    if (dataSource) {
      loadData();
    } else {
      spreadsheetData = null;
      dataSourceRowStore.set(null); // Clear merge field data when no data source
    }
  });

  async function loadData() {
    if (!dataSource) return;

    try {
      loadingData = true;
      const result = await dataSourcesApi.getData(dataSource.id);
      spreadsheetData = result.data;
      // Reset to first row when new data is loaded
      selectedRowIndex = 0;

      // Set the initial row data in the store for merge field functionality
      if (spreadsheetData && spreadsheetData.length > 1) {
        const headers = spreadsheetData[0];
        const firstRow = spreadsheetData[1]; // First data row (index 1, since 0 is headers)

        const rowObject = headers.reduce(
          (obj, header, index) => {
            obj[header] = firstRow[index] || '';
            return obj;
          },
          {} as Record<string, string>
        );

        dataSourceRowStore.set(rowObject);
      } else {
        // Clear the store if no data
        dataSourceRowStore.set(null);
      }
    } catch (err) {
      console.error('Error loading data source data:', err);
      spreadsheetData = null;
      dataSourceRowStore.set(null);
    } finally {
      loadingData = false;
    }
  }

  function handleRowSelect(rowIndex: number) {
    selectedRowIndex = rowIndex;

    // Get the selected row data as a JSON object
    if (spreadsheetData && spreadsheetData.length > 0) {
      const headers = spreadsheetData[0];
      const rows = spreadsheetData.slice(1);
      const selectedRow = rows[rowIndex];

      if (selectedRow) {
        // Map headers to values to create an object
        const rowObject = headers.reduce(
          (obj, header, index) => {
            obj[header] = selectedRow[index] || '';
            return obj;
          },
          {} as Record<string, string>
        );

        console.log('Selected row:', JSON.stringify(rowObject, null, 2));

        // Update the store for merge field functionality
        dataSourceRowStore.set(rowObject);
      }
    }
  }

  function openLinkDataSourceModal() {
    showLinkDataSourceModal = true;
  }

  function closeLinkDataSourceModal() {
    showLinkDataSourceModal = false;
  }

  async function handleConfirmLinkDataSource(dataSourceId: string | null) {
    try {
      await componentsApi.updateDataSource(projectId, componentId, dataSourceId);
      await invalidateAll();
      closeLinkDataSourceModal();
    } catch (err) {
      console.error('Error updating component data source:', err);
      // Could add error handling UI here
    }
  }

  async function handleSync() {
    if (!dataSource || isSyncing) return;

    try {
      isSyncing = true;

      await syncDataSource(dataSource);

      // Refresh the page data
      await invalidateAll();

      // Reload the spreadsheet data
      await loadData();
    } catch (err) {
      console.error('Error syncing data source:', err);
      // Could add error handling UI here
    } finally {
      isSyncing = false;
    }
  }

  function navigateToPreviousRow() {
    if (!spreadsheetData || spreadsheetData.length <= 1) return;

    const totalRows = spreadsheetData.length - 1; // Exclude header row
    const newIndex = selectedRowIndex === 0 ? totalRows - 1 : selectedRowIndex - 1;
    handleRowSelect(newIndex);
  }

  function navigateToNextRow() {
    if (!spreadsheetData || spreadsheetData.length <= 1) return;

    const totalRows = spreadsheetData.length - 1; // Exclude header row
    const newIndex = selectedRowIndex === totalRows - 1 ? 0 : selectedRowIndex + 1;
    handleRowSelect(newIndex);
  }
</script>

<Panel title="Data Source">
  {#snippet subtitle()}
    {#if dataSource}
      <span class="data-source-name">{dataSource.name}</span>
    {/if}
  {/snippet}
  {#snippet toolbar()}
    {#if dataSource}
      <div class="toolbar-content">
        {#if spreadsheetData && spreadsheetData.length > 1}
          <div class="navigation-buttons">
            <button
              class="nav-button"
              onclick={navigateToPreviousRow}
              title="Previous row"
              aria-label="Previous row"
            >
              <ChevronLeftIcon size={16} />
            </button>
            <button
              class="nav-button"
              onclick={navigateToNextRow}
              title="Next row"
              aria-label="Next row"
            >
              <ChevronLeftIcon size={16} class="rotate-180" />
            </button>
          </div>
        {/if}
        <span class="last-updated" title={new Date(dataSource.updatedAt).toLocaleString()}>
          Last updated {formatRelativeTime(dataSource.updatedAt)}
        </span>
        <div class="toolbar-buttons">
          <button
            onclick={handleSync}
            class="sync-button"
            title="Sync data from Google Sheets"
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
          <button
            onclick={openLinkDataSourceModal}
            class="change-data-source-button"
            title="Change Data Source"
          >
            Change Data Source
          </button>
        </div>
      </div>
    {/if}
    <div class="panel-controls">
      <button
        class="icon-button"
        onclick={onMaximize}
        title="Maximize panel"
        aria-label="Maximize panel"
      >
        <MaximizeIcon size={16} />
      </button>
      <button
        class="icon-button"
        onclick={onMinimize}
        title="Minimize panel"
        aria-label="Minimize panel"
      >
        <MinimizeIcon size={16} />
      </button>
    </div>
  {/snippet}
  {#if dataSource}
    {#if loadingData}
      <div class="loading-state">Loading data...</div>
    {:else if spreadsheetData && spreadsheetData.length > 0}
      <DataTable
        data={spreadsheetData}
        sortable={false}
        maxRows={10}
        stickyHeader={true}
        selectable={true}
        {selectedRowIndex}
        onRowSelect={handleRowSelect}
      />
    {:else if dataSource.headers && dataSource.headers.length > 0}
      <div class="no-data-state">
        <p>No data loaded yet. Click "Sync" to load the latest data.</p>
      </div>
    {/if}
  {:else}
    <div class="empty-state">
      <p class="empty-message">No data source linked to this component.</p>
      <p class="empty-hint">Link a data source to populate this component with dynamic data.</p>
      <Button variant="primary" onclick={openLinkDataSourceModal}>Link Data Source</Button>
    </div>
  {/if}
</Panel>

<LinkDataSourceModal
  bind:show={showLinkDataSourceModal}
  {dataSources}
  currentDataSourceId={dataSource?.id}
  onConfirm={handleConfirmLinkDataSource}
  onClose={closeLinkDataSourceModal}
/>

<style>
  .data-source-name {
    font-size: 0.875rem;
    font-weight: normal;
    color: #1a1a1a;
  }

  .toolbar-content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .last-updated {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .toolbar-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .sync-button,
  .change-data-source-button {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .sync-button:hover:not(:disabled),
  .change-data-source-button:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .sync-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .navigation-buttons {
    display: flex;
    gap: 0.25rem;
  }

  :global(.rotate-180) {
    transform: rotate(180deg);
  }

  .nav-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    color: #666;
    transition: all 0.15s ease;
  }

  .nav-button:hover {
    background: #f9fafb;
    border-color: #9ca3af;
    color: #374151;
  }

  .panel-controls {
    display: flex;
    gap: 0.25rem;
    margin-left: auto;
  }

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    color: #666;
    transition: all 0.15s ease;
  }

  .icon-button:hover {
    background: #f9fafb;
    border-color: #9ca3af;
    color: #374151;
  }

  .loading-state,
  .no-data-state {
    padding: 2rem;
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 2rem 1rem;
    text-align: center;
    height: 100%;
  }

  .empty-message {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .empty-hint {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    max-width: 250px;
  }
</style>
