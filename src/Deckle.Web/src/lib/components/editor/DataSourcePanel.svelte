<script lang="ts">
  import Panel from './_components/Panel.svelte';
  import { DataTable } from '$lib/components';
  import LinkDataSourceModal from '../../../routes/(authenticated)/projects/[username]/[projectCode]/components/_components/LinkDataSourceModal.svelte';
  import { componentsApi, dataSourcesApi } from '$lib/api';
  import { invalidateAll } from '$app/navigation';
  import type { DataSource } from '$lib/types';
  import { formatRelativeTime } from '$lib/utils/date.utils';
  import { syncDataSource } from '$lib/utils/dataSource.utils';
  import { getDataSourceRow } from '$lib/stores/dataSourceRow';
  import { toIdentifier, parseDataRow } from '$lib/utils/mergeFields';
  import ToolbarDropdownButton from './_components/ToolbarDropdownButton.svelte';
  import { ChevronLeftIcon, MinimizeIcon, TableIcon, TableRowIcon } from '$lib/components/icons';

  interface Props {
    dataSource: DataSource | null;
    dataSources: DataSource[];
    projectId: string;
    componentId: string;
    readOnly?: boolean;
  }

  let { dataSource, dataSources, projectId, componentId, readOnly = false }: Props = $props();

  // Get the store reference during component initialization
  const dataSourceRowStore = getDataSourceRow();

  let showLinkDataSourceModal = $state(false);
  let isSyncing = $state(false);
  let spreadsheetData = $state<string[][] | null>(null);
  let loadingData = $state(false);
  let selectedRowIndex = $state(0); // Default to first row
  type PanelMode = 'minimised' | 'row' | 'maximised';
  let panelMode = $state<PanelMode>(dataSource ? 'row' : 'minimised');

  // Update panelMode when the data source is linked or unlinked
  let previousDataSourceId: string | null = dataSource?.id ?? null;
  $effect(() => {
    const currentId = dataSource?.id ?? null;
    if (currentId !== previousDataSourceId) {
      previousDataSourceId = currentId;
      panelMode = currentId === null ? 'minimised' : 'row';
    }
  });

  // Compute single-row view data (header + active row only)
  const singleRowData = $derived(
    spreadsheetData && spreadsheetData.length > 1
      ? [spreadsheetData[0], spreadsheetData[selectedRowIndex + 1]]
      : null
  );

  // Compute identifier tooltips for data table headers
  const headerTooltips = $derived(
    spreadsheetData && spreadsheetData.length > 0
      ? spreadsheetData[0].map((header) => {
          const id = toIdentifier(header);
          return id !== header ? `Merge field: {{${id}}}` : `Merge field: {{${header}}}`;
        })
      : undefined
  );

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
        dataSourceRowStore.set(parseDataRow(spreadsheetData[0], spreadsheetData[1]));
      } else {
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

    if (spreadsheetData && spreadsheetData.length > 1) {
      const selectedRow = spreadsheetData[rowIndex + 1]; // +1 to skip header row
      if (selectedRow) {
        dataSourceRowStore.set(parseDataRow(spreadsheetData[0], selectedRow));
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
      <ToolbarDropdownButton label={dataSource.name}>
        {#snippet children(close)}
          <span class="dropdown-last-updated" title={new Date(dataSource.updatedAt).toLocaleString()}>
            Last updated {formatRelativeTime(dataSource.updatedAt)}
          </span>
          <div class="dropdown-divider"></div>
          <button
            onclick={() => { close(); handleSync(); }}
            class="dropdown-action"
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
          <button
            onclick={() => { close(); openLinkDataSourceModal(); }}
            class="dropdown-action"
          >
            Change Data Source
          </button>
        {/snippet}
      </ToolbarDropdownButton>
    {:else if !readOnly}
      <button onclick={openLinkDataSourceModal} class="link-data-source-button">
        Link Data Source
      </button>
    {/if}
  {/snippet}
  {#snippet toolbar()}
    {#if dataSource && spreadsheetData && spreadsheetData.length > 1}
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
    <div class="panel-controls">
      <button
        class="icon-button"
        class:active={panelMode === 'maximised'}
        onclick={() => (panelMode = panelMode === 'maximised' ? 'minimised' : 'maximised')}
        title="Show data table"
        aria-label="Show data table"
      >
        <TableIcon size={16} />
      </button>
      {#if dataSource}
        <button
          class="icon-button"
          class:active={panelMode === 'row'}
          onclick={() => (panelMode = panelMode === 'row' ? 'minimised' : 'row')}
          title="Show active row"
          aria-label="Show active row"
        >
          <TableRowIcon size={16} />
        </button>
      {/if}
      <button
        class="icon-button"
        class:active={panelMode === 'minimised'}
        onclick={() => (panelMode = 'minimised')}
        title="Minimize panel"
        aria-label="Minimize panel"
      >
        <MinimizeIcon size={16} />
      </button>
    </div>
  {/snippet}
  {#if panelMode !== 'minimised'}
    {#if dataSource}
      {#if loadingData}
        <div class="loading-state">Loading data...</div>
      {:else if panelMode === 'row' && singleRowData}
        <div class="data-source-table single-row-table">
          <DataTable
            data={singleRowData}
            sortable={false}
            stickyHeader={false}
            selectable={false}
            {headerTooltips}
          />
        </div>
      {:else if panelMode === 'maximised' && spreadsheetData && spreadsheetData.length > 0}
        <div class="data-source-table">
          <DataTable
            data={spreadsheetData}
            sortable={false}
            maxRows={10}
            stickyHeader={true}
            selectable={true}
            {selectedRowIndex}
            {headerTooltips}
            onRowSelect={handleRowSelect}
          />
        </div>
      {:else if dataSource.headers && dataSource.headers.length > 0}
        <div class="no-data-state">
          <p>No data loaded yet. Click "Sync" to load the latest data.</p>
        </div>
      {/if}
    {:else if panelMode === 'maximised'}
      <div class="empty-state">
        <p class="empty-message">No data source linked to this component.</p>
        <p class="empty-hint">Link a data source to populate this component with dynamic data.</p>
      </div>
    {/if}
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
  .dropdown-last-updated {
    font-size: 0.75rem;
    color: #6b7280;
    padding: 0.125rem 0;
    white-space: nowrap;
  }

  .dropdown-divider {
    height: 1px;
    background-color: #e5e7eb;
    margin: 0.25rem 0;
  }

  .dropdown-action {
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    text-align: left;
    border: none;
    background: none;
    border-radius: 4px;
    cursor: pointer;
    color: #374151;
    transition: background 0.15s ease;
    white-space: nowrap;
  }

  .dropdown-action:hover:not(:disabled) {
    background: #f3f4f6;
  }

  .dropdown-action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .link-data-source-button {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .link-data-source-button:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
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

  .icon-button.active {
    background: #e5e7eb;
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

  .data-source-table {
    width: 100%;
    max-height: 50vh;
    overflow: auto;
  }

  .single-row-table {
    max-height: none;
  }
</style>
