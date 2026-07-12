<script lang="ts">
  import type { GameComponent } from '$lib/types';
  import { getComponentDisplayType } from '$lib/utils/componentTypes';
  import { getTabletopApi, removeAllCardsOfTemplate } from '$lib/tabletop/v2';

  let {
    components,
    collapsed = $bindable(false),
    el = $bindable(null),
    removeTarget = false
  }: {
    components: GameComponent[];
    collapsed?: boolean;
    /** The sidebar's root element, exposed for the shell's drag hit-testing. */
    el?: HTMLElement | null;
    /** True while a pile drag hovers here — shows the removal indicator. */
    removeTarget?: boolean;
  } = $props();

  const api = getTabletopApi();
  const { store } = api;

  // How many cards of each template are currently on the table.
  const placedCountByTemplate = $derived(
    Object.values(store.state.cards).reduce(
      (acc, c) => {
        acc[c.templateId] = (acc[c.templateId] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  );

  function removeAll(templateId: string) {
    store.commit((s) => removeAllCardsOfTemplate(s, templateId));
  }

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
    // dataTransfer is sealed during dragover, so the canvas learns what is
    // being dragged (for the insertion indicator) through the api instead.
    api.setTemplateDrag(componentId);
  }
</script>

<aside bind:this={el} class="sidebar" class:collapsed class:remove-target={removeTarget}>
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
      {@const placedCount = placedCountByTemplate[component.id] ?? 0}
      {@const remainingCount = Math.max(0, totalCount - placedCount)}
      {@const countLabel = totalCount > 1
        ? (placedCount > 0 ? `${remainingCount} / ${totalCount}` : `${totalCount}`)
        : null}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="component-item"
        class:depleted={remainingCount === 0}
        draggable="true"
        ondragstart={(e) => handleDragStart(e, component.id)}
        ondragend={() => api.setTemplateDrag(null)}
        title={`${component.name} — drag onto tabletop${placedCount > 0 ? ` (${remainingCount} of ${totalCount} remaining)` : totalCount > 1 ? ` (${totalCount} cards)` : ''}`}
      >
        <span class="component-icon" aria-hidden="true">{typeIcon(component.type)}</span>
        {#if !collapsed}
          <span class="component-meta">
            <span class="component-name">{component.name}</span>
            <span class="component-type">{getComponentDisplayType(component)}</span>
          </span>
          {#if countLabel}
            <span class="instance-count" class:partial={placedCount > 0}>{countLabel}</span>
          {/if}
          {#if placedCount > 0}
            <button
              type="button"
              class="remove-all-btn"
              onclick={() => removeAll(component.id)}
              title={`Remove all ${component.name} from the table`}
              aria-label={`Remove all ${component.name} from the table`}
            >
              ✕
            </button>
          {/if}
        {/if}
      </div>
    {/each}

    {#if components.length === 0 && !collapsed}
      <div class="sidebar-empty">No components in this project.</div>
    {/if}
  </div>

  {#if !collapsed}
    <div class="sidebar-hint">Drag onto the tabletop to add · drop back here to remove</div>
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

  .sidebar.remove-target {
    background: #2d1b1b;
    box-shadow: inset 0 0 0 2px #ef4444;
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

  .component-item.depleted {
    opacity: 0.55;
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

  .instance-count.partial {
    background: #2d3548;
    color: #f59e0b;
  }

  .remove-all-btn {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid transparent;
    color: #8b8ea0;
    border-radius: 4px;
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.6875rem;
    line-height: 1;
    padding: 0;
  }

  .remove-all-btn:hover {
    background: #3d2530;
    border-color: #5a3040;
    color: #ef4444;
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
