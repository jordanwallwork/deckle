<script lang="ts">
  import type { Entity, SpreadZone } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';
  import EntityWrapper from './EntityWrapper.svelte';

  let {
    zone,
    entities,
    isEditing,
    flipDelayFor
  }: {
    zone: SpreadZone;
    entities: Entity[];
    isEditing: boolean;
    flipDelayFor: (index: number) => number;
  } = $props();

  const store = getTabletopApi();

  // Drop indicator: when a drag is hovering over this spread, draw a
  // vertical/horizontal bar at the position where the dropped entity would
  // land. Uses the same step math as layoutSpread so the bar sits exactly
  // between the two cards it's splitting.
  const spreadDropHover = $derived(store.spreadDropHover);
  const isSpreadDropHover = $derived(spreadDropHover?.zoneId === zone.id);

  const spreadIndicator = $derived.by(() => {
    if (!isSpreadDropHover) return null;
    const size = zone.defaultSize;
    if (!size) return null;
    const step = Math.max(1, (zone.direction === 'row' ? size.width : size.height) - zone.overlap);
    const index = spreadDropHover?.index ?? 0;
    const primary = index * step;
    if (zone.direction === 'row') {
      const crossAxis = (zone.height - size.height) / 2;
      return { left: primary - 2, top: crossAxis, width: 4, height: size.height };
    }
    const crossAxis = (zone.width - size.width) / 2;
    return { left: crossAxis, top: primary - 2, width: size.width, height: 4 };
  });
</script>

{#each entities as entity, i (entity.instanceId)}
  <EntityWrapper {entity} disableDrag={isEditing} flipDelay={flipDelayFor(i)} />
{/each}
{#if spreadIndicator}
  <div
    class="spread-drop-indicator"
    style="left: {spreadIndicator.left}px; top: {spreadIndicator.top}px; width: {spreadIndicator.width}px; height: {spreadIndicator.height}px;"
  ></div>
{/if}
{#if zone.entityIds.length === 0 && !isEditing}
  <div class="spread-empty">Drop cards here ({zone.direction})</div>
{/if}

<style>
  .spread-drop-indicator {
    position: absolute;
    background: #3b82f6;
    border-radius: 2px;
    pointer-events: none;
    z-index: 5;
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
  }

  .spread-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.25);
    font-size: 0.8125rem;
    font-style: italic;
    pointer-events: none;
  }
</style>
