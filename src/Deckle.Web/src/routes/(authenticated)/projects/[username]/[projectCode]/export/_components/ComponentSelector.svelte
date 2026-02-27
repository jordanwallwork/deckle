<script lang="ts">
  import type { GameComponent } from '$lib/types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { isGameBoard } from '$lib/utils/componentTypes';

  let {
    components,
    selectedComponentIds = [],
    rotatedComponentIds = $bindable<string[]>([]),
    slicedComponentIds = $bindable<string[]>([]),
    instanceCounts = {}
  }: {
    components: GameComponent[];
    selectedComponentIds?: string[];
    rotatedComponentIds?: string[];
    slicedComponentIds?: string[];
    instanceCounts?: Record<string, number>;
  } = $props();

  let selectedSet = $derived(new Set(selectedComponentIds));
  let rotatedSet = $derived(new Set(rotatedComponentIds));
  let slicedSet = $derived(new Set(slicedComponentIds));

  function toggleRotation(componentId: string) {
    if (rotatedSet.has(componentId)) {
      rotatedComponentIds = rotatedComponentIds.filter((id) => id !== componentId);
    } else {
      rotatedComponentIds = [...rotatedComponentIds, componentId];
    }
  }

  function toggleSliced(componentId: string) {
    if (slicedSet.has(componentId)) {
      slicedComponentIds = slicedComponentIds.filter((id) => id !== componentId);
    } else {
      slicedComponentIds = [...slicedComponentIds, componentId];
    }
  }

  function toggleComponent(componentId: string) {
    const newSelected = selectedSet.has(componentId)
      ? selectedComponentIds.filter((id) => id !== componentId)
      : [...selectedComponentIds, componentId];
    updateUrl(newSelected);
  }

  function selectAll() {
    const allIds = components.map((c) => c.id);
    updateUrl(allIds);
  }

  function clearAll() {
    updateUrl([]);
  }

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
            {@const isSelected = selectedSet.has(component.id)}
            {@const isRotated = rotatedSet.has(component.id)}
            {@const isSliced = slicedSet.has(component.id)}
            {@const count = instanceCounts[component.id] ?? 1}
            {@const board = isGameBoard(component) ? component : null}
            {@const hasFolds =
              board !== null && (board.horizontalFolds > 0 || board.verticalFolds > 0)}
            <div class="component-item">
              <div class="component-row">
                <label class="component-label">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onchange={() => toggleComponent(component.id)}
                  />
                  <span class="component-name">{component.name}</span>
                </label>
                <span class="instance-count">({count})</span>
              </div>
              {#if isSelected}
                <div class="component-actions">
                  <button
                    class="action-btn"
                    class:active={isRotated}
                    onclick={() => toggleRotation(component.id)}
                    type="button"
                  >
                    Rotate
                  </button>
                  {#if hasFolds}
                    <button
                      class="action-btn"
                      class:active={isSliced}
                      onclick={() => toggleSliced(component.id)}
                      type="button"
                    >
                      Slice Along Cut Lines
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
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
    flex-direction: column;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .component-item:hover {
    background-color: #f5f5f5;
  }

  .component-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .component-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    cursor: pointer;
    min-width: 0;
  }

  .component-label input[type='checkbox'] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .component-name {
    font-size: 0.875rem;
    user-select: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .instance-count {
    font-size: 0.8rem;
    color: #9ca3af;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .component-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding-top: 0.25rem;
    padding-left: 1.5rem;
  }

  .action-btn {
    padding: 0.2rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    color: #374151;
    cursor: pointer;
    font-size: 0.775rem;
    font-weight: 500;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .action-btn:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .action-btn.active {
    background: #dbeafe;
    border-color: #3b82f6;
    color: #2563eb;
  }

  .action-btn.active:hover {
    background: #bfdbfe;
  }
</style>
