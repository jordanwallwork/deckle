<script lang="ts">
  import type { Zone } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';
  import EntityWrapper from './EntityWrapper.svelte';

  let { zone }: { zone: Zone } = $props();

  const store = getTabletopApi();
  const isSelected = $derived(store.state.selectedZoneId === zone.id);

  function handleZoneClick(e: MouseEvent) {
    e.stopPropagation();
    // Only select zone itself if not clicking an entity
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('zone-bg')) {
      store.selectZone(zone.id);
    }
  }

  // Computed entity list for this zone (ordered)
  const zoneEntities = $derived(
    zone.entityIds
      .map((id) => store.state.entities[id])
      .filter(Boolean)
  );

  // Stack: only show top entity + count badge
  const stackTopEntity = $derived(
    zone.type === 'stack' && zoneEntities.length > 0
      ? zoneEntities[zoneEntities.length - 1]
      : null
  );

  // Grid: compute cell positions for entities
  function gridCellPos(index: number): { x: number; y: number } {
    if (zone.type !== 'grid') return { x: 0, y: 0 };
    const col = index % zone.columns;
    const row = Math.floor(index / zone.columns);
    return { x: col * zone.cellWidth, y: row * zone.cellHeight };
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="zone zone-{zone.type}"
  class:selected={isSelected}
  style="left: {zone.x}px; top: {zone.y}px; width: {zone.width}px; height: {zone.height}px;"
  onclick={handleZoneClick}
>
  <div class="zone-label">{zone.name}</div>
  <div class="zone-bg"></div>

  {#if zone.type === 'freeform'}
    {#each zoneEntities as entity (entity.instanceId)}
      <EntityWrapper {entity} />
    {/each}

  {:else if zone.type === 'grid'}
    <!-- Grid background lines -->
    <svg class="grid-lines" width={zone.width} height={zone.height}>
      {#each Array(zone.columns + 1) as _, i}
        <line
          x1={i * zone.cellWidth}
          y1={0}
          x2={i * zone.cellWidth}
          y2={zone.height}
          stroke="rgba(255,255,255,0.08)"
          stroke-width="1"
        />
      {/each}
      {#each Array(Math.ceil(zone.height / zone.cellHeight) + 1) as _, i}
        <line
          x1={0}
          y1={i * zone.cellHeight}
          x2={zone.width}
          y2={i * zone.cellHeight}
          stroke="rgba(255,255,255,0.08)"
          stroke-width="1"
        />
      {/each}
    </svg>

    {#each zoneEntities as entity, idx (entity.instanceId)}
      {@const cell = gridCellPos(idx)}
      <EntityWrapper {entity} overrideX={cell.x} overrideY={cell.y} />
    {/each}

  {:else if zone.type === 'stack'}
    <!-- Stacked view: offset pile of a few cards showing depth, then the top -->
    {#if stackTopEntity}
      <!-- Visual depth cards (decorative) -->
      {#each Array(Math.min(3, zoneEntities.length - 1)) as _, i}
        <div
          class="stack-depth"
          style="left: {4 + i * 2}px; top: {4 + i * 2}px; right: {4 + (2 - i) * 2}px; bottom: {4 + (2 - i) * 2}px;"
        ></div>
      {/each}
      <div class="stack-top">
        <EntityWrapper entity={stackTopEntity} disableDrag />
      </div>
      <div class="stack-badge">{zoneEntities.length}</div>
    {:else}
      <div class="stack-empty">Empty</div>
    {/if}
  {/if}
</div>

<style>
  .zone {
    position: absolute;
    border-radius: 8px;
    border: 2px dashed rgba(255, 255, 255, 0.12);
    transition: border-color 0.15s;
  }

  .zone.selected {
    border-color: rgba(100, 160, 255, 0.5);
  }

  .zone-label {
    position: absolute;
    top: -22px;
    left: 4px;
    font-size: 0.6875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.45);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    pointer-events: none;
  }

  .zone-bg {
    position: absolute;
    inset: 0;
    border-radius: 6px;
    pointer-events: auto;
  }

  .zone-freeform {
    background: rgba(255, 255, 255, 0.03);
  }

  .zone-grid {
    background: rgba(255, 255, 255, 0.02);
  }

  .zone-stack {
    background: rgba(255, 255, 255, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .grid-lines {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }

  .stack-depth {
    position: absolute;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .stack-top {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 8px;
    overflow: hidden;
  }

  .stack-badge {
    position: absolute;
    bottom: 8px;
    right: 8px;
    z-index: 2;
    background: #3b82f6;
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    min-width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    padding: 0 6px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .stack-empty {
    color: rgba(255, 255, 255, 0.25);
    font-size: 0.8125rem;
    font-style: italic;
  }
</style>
