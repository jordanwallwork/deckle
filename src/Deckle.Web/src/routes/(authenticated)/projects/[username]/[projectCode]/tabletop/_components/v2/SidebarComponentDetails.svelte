<script lang="ts">
  // The expanded details for a sidebar row (hidden while collapsed): the
  // component's name and type, its remaining-instance count, and the remove-all
  // shortcut.
  import type { GameComponent } from '$lib/types';
  import { getComponentDisplayType } from '$lib/utils/componentTypes';
  import { getTabletopApi, removeAllCardsOfTemplate } from '$lib/tabletop/v2';

  let {
    component,
    countLabel = null,
    placedCount = 0
  }: { component: GameComponent; countLabel?: string | null; placedCount?: number } = $props();

  const { store } = getTabletopApi();

  function removeAll() {
    store.commit((s) => removeAllCardsOfTemplate(s, component.id));
  }
</script>

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
    onclick={removeAll}
    title={`Remove all ${component.name} from the table`}
    aria-label={`Remove all ${component.name} from the table`}
  >
    ✕
  </button>
{/if}

<style>
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
</style>
