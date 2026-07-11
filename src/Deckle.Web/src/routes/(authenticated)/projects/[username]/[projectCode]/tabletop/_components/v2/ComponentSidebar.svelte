<script lang="ts">
  import type { GameComponent } from '$lib/types';
  import { getComponentDisplayType } from '$lib/utils/componentTypes';
  import { getTabletopApi } from '$lib/tabletop/v2';

  let {
    components,
    collapsed = $bindable(false)
  }: {
    components: GameComponent[];
    collapsed?: boolean;
  } = $props();

  const { store } = getTabletopApi();

  function typeIcon(type: GameComponent['type']): string {
    switch (type) {
      case 'Card':
        return '🂠';
      case 'Dice':
        return '🎲';
      case 'GameBoard':
        return '▦';
      case 'PlayerMat':
        return '▤';
      default:
        return '◻';
    }
  }

  function handleDragStart(e: DragEvent, componentId: string) {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/x-deckle-template', componentId);
    e.dataTransfer.setData('text/plain', componentId);
  }
</script>

<aside class="sidebar" class:collapsed>
  <div class="sidebar-header">
    {#if !collapsed}
      <span class="sidebar-title">Components</span>
    {/if}
    <button
      class="collapse-btn"
      onclick={() => (collapsed = !collapsed)}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {collapsed ? '›' : '‹'}
    </button>
  </div>

  <div class="sidebar-list">
    {#each components as component (component.id)}
      {@const totalCount = store.templates[component.id]?.instances.length ?? 1}
      <button
        type="button"
        class="component-item"
        draggable="true"
        ondragstart={(e) => handleDragStart(e, component.id)}
        title={`${component.name} — drag onto tabletop${totalCount > 1 ? ` (${totalCount} cards)` : ''}`}
      >
        <span class="component-icon" aria-hidden="true">{typeIcon(component.type)}</span>
        {#if !collapsed}
          <span class="component-meta">
            <span class="component-name">{component.name}</span>
            <span class="component-type">{getComponentDisplayType(component)}</span>
          </span>
          {#if totalCount > 1}
            <span class="instance-count">{totalCount}</span>
          {/if}
        {/if}
      </button>
    {/each}

    {#if components.length === 0 && !collapsed}
      <div class="sidebar-empty">No components in this project.</div>
    {/if}
  </div>

  {#if !collapsed}
    <div class="sidebar-hint">Drag onto the tabletop to add</div>
  {/if}
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: 240px;
    background: #1e2030;
    border-right: 1px solid #3a3d4e;
    color: #c8cad8;
    flex-shrink: 0;
    transition: width 0.15s ease;
    overflow: hidden;
  }

  .sidebar.collapsed {
    width: 44px;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.5rem 0.5rem 0.75rem;
    border-bottom: 1px solid #2a2d3e;
    min-height: 2.25rem;
  }

  .sidebar.collapsed .sidebar-header {
    justify-content: center;
    padding: 0.5rem 0;
  }

  .sidebar-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #8b8ea0;
  }

  .collapse-btn {
    background: transparent;
    border: 1px solid #3a3d4e;
    color: #c8cad8;
    border-radius: 4px;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.875rem;
    line-height: 1;
  }

  .collapse-btn:hover {
    background: #2a2d3e;
  }

  .sidebar-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.375rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .component-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.5rem;
    background: #2a2d3e;
    border: 1px solid transparent;
    border-radius: 4px;
    color: #e8e9f0;
    font-size: 0.8125rem;
    text-align: left;
    cursor: grab;
    transition: background 0.1s;
    width: 100%;
  }

  .sidebar.collapsed .component-item {
    justify-content: center;
    padding: 0.375rem 0;
  }

  .component-item:hover {
    background: #343848;
    border-color: #3a3d4e;
  }

  .component-item:active {
    cursor: grabbing;
  }

  .component-icon {
    font-size: 1.125rem;
    line-height: 1;
    width: 1.25rem;
    text-align: center;
    flex-shrink: 0;
  }

  .component-meta {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
    flex: 1;
  }

  .component-name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .component-type {
    font-size: 0.6875rem;
    color: #8b8ea0;
  }

  .instance-count {
    flex-shrink: 0;
    font-size: 0.6875rem;
    font-weight: 600;
    background: #3a3d52;
    color: #8b8ea0;
    border-radius: 10px;
    padding: 0 6px;
    min-width: 1.25rem;
    text-align: center;
    line-height: 1.5rem;
  }

  .sidebar-empty {
    padding: 0.75rem;
    font-size: 0.75rem;
    color: #8b8ea0;
    text-align: center;
    font-style: italic;
  }

  .sidebar-hint {
    padding: 0.5rem 0.75rem;
    border-top: 1px solid #2a2d3e;
    font-size: 0.6875rem;
    color: #6b7086;
    line-height: 1.35;
  }
</style>
