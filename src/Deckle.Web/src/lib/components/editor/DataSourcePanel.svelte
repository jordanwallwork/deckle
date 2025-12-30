<script lang="ts">
  import Panel from "./_components/Panel.svelte";
  import { Button } from "$lib/components";
  import LinkDataSourceModal from "../../../routes/projects/[projectId]/components/_components/LinkDataSourceModal.svelte";
  import { componentsApi, dataSourcesApi } from "$lib/api";
  import { invalidateAll } from "$app/navigation";
  import type { DataSource } from "$lib/types";
  import { formatRelativeTime } from "$lib/utils/date.utils";

  interface Props {
    dataSource: DataSource | null;
    dataSources: DataSource[];
    projectId: string;
    componentId: string;
  }

  let { dataSource, dataSources, projectId, componentId }: Props = $props();

  let showLinkDataSourceModal = $state(false);
  let isSyncing = $state(false);
  let spreadsheetData = $state<string[][] | null>(null);
  let loadingData = $state(false);

  // Load data when component mounts or dataSource changes
  $effect(() => {
    if (dataSource) {
      loadData();
    } else {
      spreadsheetData = null;
    }
  });

  async function loadData() {
    if (!dataSource) return;

    try {
      loadingData = true;
      const result = await dataSourcesApi.getData(dataSource.id);
      spreadsheetData = result.data;
    } catch (err) {
      console.error("Error loading data source data:", err);
      spreadsheetData = null;
    } finally {
      loadingData = false;
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
      await componentsApi.updateCardDataSource(
        projectId,
        componentId,
        dataSourceId
      );
      await invalidateAll();
      closeLinkDataSourceModal();
    } catch (err) {
      console.error("Error updating card data source:", err);
      // Could add error handling UI here
    }
  }

  async function handleSync() {
    if (!dataSource || isSyncing || !dataSource.csvExportUrl) return;

    try {
      isSyncing = true;

      // Fetch the CSV data from the public URL
      const response = await fetch(dataSource.csvExportUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch CSV data");
      }

      const csvText = await response.text();

      // Parse CSV to extract headers and count rows
      const lines = csvText.split("\n");

      // Extract headers (first line)
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/^"|"$/g, "")) // Remove quotes if present
        .filter((h) => h.length > 0);

      // Count non-empty data rows (skip header)
      const dataRows = lines.slice(1).filter((line) => {
        // A row is non-empty if it has at least one non-empty cell
        const cells = line.split(",").map((c) => c.trim());
        return cells.some((cell) => cell.length > 0);
      });

      const rowCount = dataRows.length;

      // Send metadata to the backend
      await dataSourcesApi.sync(dataSource.id, {
        headers,
        rowCount,
      });

      // Refresh the page data
      await invalidateAll();

      // Reload the spreadsheet data
      await loadData();
    } catch (err) {
      console.error("Error syncing data source:", err);
      // Could add error handling UI here
    } finally {
      isSyncing = false;
    }
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
        <span
          class="last-updated"
          title={new Date(dataSource.updatedAt).toLocaleString()}
        >
          Last updated {formatRelativeTime(dataSource.updatedAt)}
        </span>
        <div class="toolbar-buttons">
          <button
            onclick={handleSync}
            class="sync-button"
            title="Sync data from Google Sheets"
            disabled={isSyncing}
          >
            {isSyncing ? "Syncing..." : "Sync"}
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
  {/snippet}
  {#if dataSource}
    {#if loadingData}
      <div class="loading-state">Loading data...</div>
    {:else if spreadsheetData && spreadsheetData.length > 0}
      <div class="headers-section">
        <div class="headers-table">
          <table>
            <thead>
              <tr>
                {#each spreadsheetData[0] as header}
                  <th>{header}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each spreadsheetData.slice(1, 11) as row}
                <tr>
                  {#each row as cell}
                    <td>{cell}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        {#if spreadsheetData.length > 11}
          <p class="showing-preview">
            Showing first 10 rows of {spreadsheetData.length - 1}
          </p>
        {/if}
      </div>
    {:else if dataSource.headers && dataSource.headers.length > 0}
      <div class="no-data-state">
        <p>No data loaded yet. Click "Sync" to load the latest data.</p>
      </div>
    {/if}
  {:else}
    <div class="empty-state">
      <p class="empty-message">No data source linked to this component.</p>
      <p class="empty-hint">
        Link a data source to populate this component with dynamic data.
      </p>
      <Button variant="primary" onclick={openLinkDataSourceModal}>
        Link Data Source
      </Button>
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

  .loading-state,
  .no-data-state {
    padding: 2rem;
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }

  .headers-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .showing-preview {
    font-size: 0.75rem;
    color: #6b7280;
    text-align: center;
    margin: 0.5rem 0 0 0;
    padding: 0.5rem;
  }

  .headers-table {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  thead {
    position: sticky;
    top: 0;
    background-color: var(--color-bg-secondary);
    z-index: 1;
  }

  th {
    padding: 0.5rem;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-secondary);
    border-bottom: 1px solid var(--color-border);
  }

  td {
    padding: 0.5rem;
    border-bottom: 1px solid var(--color-border-light);
  }

  tbody tr:hover {
    background-color: var(--color-bg-hover);
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
