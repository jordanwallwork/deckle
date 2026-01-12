<script lang="ts">
  import { Dialog, Button } from '$lib/components';
  import type { DataSource } from '$lib/types';

  let {
    show = $bindable(),
    dataSources,
    currentDataSourceId,
    onConfirm,
    onClose
  }: {
    show: boolean;
    dataSources: DataSource[];
    currentDataSourceId: string | null | undefined;
    onConfirm: (dataSourceId: string | null) => void;
    onClose: () => void;
  } = $props();

  let selectedDataSourceId = $state<string | null>(currentDataSourceId || null);

  // Reset selection when dialog opens
  $effect(() => {
    if (show) {
      selectedDataSourceId = currentDataSourceId || null;
    }
  });

  function handleConfirm() {
    onConfirm(selectedDataSourceId);
  }

  function handleRemove() {
    onConfirm(null);
  }
</script>

<Dialog bind:show title="Link Data Source" maxWidth="600px" onclose={onClose}>
  {#snippet children()}
    {#if dataSources.length === 0}
      <p class="no-data-sources">
        No data sources available. Create a data source first to link it to this card.
      </p>
    {:else}
      <div class="data-sources-list">
        {#each dataSources as dataSource}
          <label class="data-source-option">
            <input
              type="radio"
              name="dataSource"
              value={dataSource.id}
              checked={selectedDataSourceId === dataSource.id}
              onchange={() => (selectedDataSourceId = dataSource.id)}
            />
            <div class="data-source-details">
              <span class="data-source-name">{dataSource.name}</span>
              <span class="data-source-meta">
                {dataSource.type}
                {#if dataSource.rowCount !== undefined && dataSource.rowCount !== null}
                  • {dataSource.rowCount} rows
                {/if}
              </span>
            </div>
          </label>
        {/each}
      </div>
    {/if}
  {/snippet}

  {#snippet actions()}
    {#if currentDataSourceId}
      <Button variant="danger" onclick={handleRemove}>Remove Link</Button>
    {/if}
    <Button variant="primary" outline onclick={onClose}>Cancel</Button>
    {#if dataSources.length > 0}
      <Button variant="primary" onclick={handleConfirm} disabled={!selectedDataSourceId}>
        Link Data Source
      </Button>
    {/if}
  {/snippet}
</Dialog>

<style>
  .no-data-sources {
    color: var(--color-muted-teal);
    font-style: italic;
    margin: 0;
    padding: 1rem;
    text-align: center;
  }

  .data-sources-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .data-source-option {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border: 2px solid var(--color-teal-grey);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .data-source-option:hover {
    border-color: var(--color-muted-teal);
    background-color: var(--color-teal-grey);
  }

  .data-source-option:has(input:checked) {
    border-color: var(--color-sage);
    background-color: var(--color-teal-grey);
  }

  .data-source-option input[type='radio'] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .data-source-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .data-source-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-sage);
  }

  .data-source-meta {
    font-size: 0.875rem;
    color: var(--color-muted-teal);
  }
</style>
