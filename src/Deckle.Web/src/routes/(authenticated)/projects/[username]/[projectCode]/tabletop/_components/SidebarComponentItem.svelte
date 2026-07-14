<script lang="ts">
  // A single draggable row in the component sidebar. Owns the drag (spawns
  // cards on the tabletop; dropping a pile back on the sidebar removes it,
  // handled by the shell) and the row's icon; the expanded name/count/remove
  // details are delegated to SidebarComponentDetails. Reports the dragged
  // template through the api because dataTransfer is sealed during dragover.
  import type { GameComponent } from '$lib/types';
  import { getTabletopApi } from '$lib/tabletop';
  import SidebarComponentDetails from './SidebarComponentDetails.svelte';

  let {
    component,
    collapsed = false,
    placedCount = 0
  }: { component: GameComponent; collapsed?: boolean; placedCount?: number } = $props();

  const api = getTabletopApi();
  const { store } = api;

  const totalCount = $derived(store.templates[component.id]?.instances.length ?? 1);
  const remainingCount = $derived(Math.max(0, totalCount - placedCount));
  const countLabel = $derived(
    totalCount > 1 ? (placedCount > 0 ? `${remainingCount} / ${totalCount}` : `${totalCount}`) : null
  );

  const title = $derived(
    `${component.name} — drag onto tabletop${
      placedCount > 0
        ? ` (${remainingCount} of ${totalCount} remaining)`
        : totalCount > 1
          ? ` (${totalCount} cards)`
          : ''
    }`
  );

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

  function handleDragStart(e: DragEvent) {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/x-deckle-template', component.id);
    e.dataTransfer.setData('text/plain', component.id);
    api.setTemplateDrag(component.id);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="component-item"
  class:collapsed
  class:depleted={remainingCount === 0}
  draggable="true"
  ondragstart={handleDragStart}
  ondragend={() => api.setTemplateDrag(null)}
  {title}
>
  <span class="component-icon" aria-hidden="true">{typeIcon(component.type)}</span>
  {#if !collapsed}
    <SidebarComponentDetails {component} {countLabel} {placedCount} />
  {/if}
</div>

<style>
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

  .component-item.collapsed {
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
</style>
