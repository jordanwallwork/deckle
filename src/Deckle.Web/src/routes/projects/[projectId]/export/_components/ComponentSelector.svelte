<script lang="ts">
  import type { GameComponent } from '$lib/types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let {
    components,
    selectedComponentIds = []
  }: {
    components: GameComponent[];
    selectedComponentIds?: string[];
  } = $props();

  // Create a set for faster lookups
  let selectedSet = $derived(new Set(selectedComponentIds));

  // Handle checkbox toggle
  function toggleComponent(componentId: string) {
    const newSelected = selectedSet.has(componentId)
      ? selectedComponentIds.filter((id) => id !== componentId)
      : [...selectedComponentIds, componentId];

    // Update URL with new selection
    updateUrl(newSelected);
  }

  // Handle select all
  function selectAll() {
    const allIds = components.map((c) => c.id);
    updateUrl(allIds);
  }

  // Handle clear all
  function clearAll() {
    updateUrl([]);
  }

  // Update URL with new component selection
  function updateUrl(componentIds: string[]) {
    const url = new URL($page.url);
    if (componentIds.length > 0) {
      url.searchParams.set('components', componentIds.join(','));
    } else {
      url.searchParams.delete('components');
    }
    goto(url.toString(), {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  }

  // Group components by type for better organization
  const componentsByType = $derived.by(() => {
    const groups: Record<string, GameComponent[]> = {};
    for (const component of components) {
      if (!groups[component.type]) {
        groups[component.type] = [];
      }
      groups[component.type].push(component);
    }
    return groups;
  });
</script>

<div class="component-selector">
  <div class="header">
    <h3>Components</h3>
    <div class="actions">
      <button class="btn-link" onclick={selectAll}>Select All</button>
      <button class="btn-link" onclick={clearAll}>Clear All</button>
    </div>
  </div>

  {#if components.length === 0}
    <p class="empty-message">
      No exportable components found. Create a Card or Player Mat to begin.
    </p>
  {:else}
    <div class="component-list">
      {#each Object.entries(componentsByType) as [type, typeComponents]}
        <div class="component-group">
          <h4 class="group-title">{type}s</h4>
          {#each typeComponents as component}
            <label class="component-item">
              <input
                type="checkbox"
                checked={selectedSet.has(component.id)}
                onchange={() => toggleComponent(component.id)}
              />
              <span class="component-name">{component.name}</span>
            </label>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .component-selector {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-link {
    background: none;
    border: none;
    color: #0066cc;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    font-size: 0.775rem;
    text-decoration: underline;
  }

  .btn-link:hover {
    color: #004499;
  }

  .empty-message {
    text-align: center;
    color: #666;
    padding: 2rem 1rem;
    font-size: 0.875rem;
  }

  .component-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .component-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .group-title {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .component-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .component-item:hover {
    background-color: #f5f5f5;
  }

  .component-item input[type='checkbox'] {
    cursor: pointer;
    width: 16px;
    height: 16px;
  }

  .component-name {
    font-size: 0.875rem;
    user-select: none;
  }
</style>
