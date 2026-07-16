<script lang="ts">
  // Base renderer for a zone: lays out the region chrome and delegates the
  // variant-specific pieces to sub-components. The frame, header tab, edit
  // toolbar, grid lattice, insertion hint and resize handles are each their own
  // component, so this shell only orchestrates them and forwards body presses
  // to the interaction reducer (marquee or click-select-zone).
  import type { Zone } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';
  import PileRenderer from './PileRenderer.svelte';
  import ZoneBackground from './ZoneBackground.svelte';
  import ZoneEditToolbar from './ZoneEditToolbar.svelte';
  import ZoneFrame from './ZoneFrame.svelte';
  import ZoneGridLines from './ZoneGridLines.svelte';
  import ZoneHeaderTab from './ZoneHeaderTab.svelte';
  import ZoneInsertIndicator from './ZoneInsertIndicator.svelte';
  import ZoneResizeHandles from './ZoneResizeHandles.svelte';
  // Self-import for nested (child) zones — Svelte 5's replacement for
  // <svelte:self>. Freeform containers render their children recursively.
  import ZoneRenderer from './ZoneRenderer.svelte';

  let { zone }: { zone: Zone } = $props();

  const api = getTabletopApi();
  const { store, interaction } = api;

  const isGroup = $derived(zone.type === 'group');

  // Boards/mats are freeform container zones: they render their template's
  // artwork as the background and may hold nested child zones.
  const freeform = $derived(zone.type === 'freeform' ? zone : null);
  const backgroundTemplate = $derived(
    freeform?.backgroundTemplateId ? store.templates[freeform.backgroundTemplateId] : undefined
  );
  const childZoneIds = $derived(freeform?.childZoneIds ?? []);

  const selected = $derived(
    store.state.selection.kind === 'zone' && store.state.selection.zoneId === zone.id
  );
  const editing = $derived(store.state.editingZoneId === zone.id);
  const dragging = $derived(interaction.draggingZoneId === zone.id);
  /** A drag hovers this zone as its drop region. */
  const dropHover = $derived(api.dropTargetZoneId === zone.id);

  // Wave flip: while this zone's flip ripples, each pile's flip transition is
  // delayed by its position in the zone so the flip sweeps across (0 otherwise).
  function flipDelayFor(index: number): number {
    const anim = store.zoneFlipAnimation;
    if (!anim || anim.zoneId !== zone.id) return 0;
    return index * anim.staggerMs;
  }

  // Body presses are background presses: marquee on drag, select-zone on click.
  function handleBodyPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    interaction.backgroundDown(api.clientToWorld(e.clientX, e.clientY), {
      ctrl: e.ctrlKey || e.metaKey,
      zoneId: zone.id
    });
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (editing) return;
    api.openZoneContextMenu(zone.id, e.clientX, e.clientY);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="zone"
  class:dragging
  style="left: {zone.x}px; top: {zone.y}px; width: {zone.width}px; height: {zone.height}px;"
  oncontextmenu={handleContextMenu}
>
  {#if editing}
    <ZoneEditToolbar {zone} />
  {:else}
    <ZoneHeaderTab {zone} {selected} />
  {/if}

  <!-- Board/mat artwork sits beneath the piles and nested zones. -->
  {#if backgroundTemplate}
    <ZoneBackground template={backgroundTemplate} />
  {/if}
  <!-- The frame carries the border so it never offsets zone-local pile
       coordinates (absolute children position from the padding box). -->
  <ZoneFrame
    {selected}
    {editing}
    {dragging}
    locked={zone.locked}
    board={!!backgroundTemplate}
    {dropHover}
    group={isGroup}
  />
  <ZoneGridLines {zone} />
  <div class="zone-body" onpointerdown={handleBodyPointerDown}></div>

  {#each zone.pileIds as pileId, i (pileId)}
    {@const pile = api.renderState.piles[pileId]}
    {#if pile}
      <PileRenderer {pile} flipDelay={flipDelayFor(i)} />
    {/if}
  {/each}

  <!-- Nested zones (freeform containers only): child coordinates are
       parent-local, so rendering them inside this positioned element places
       them correctly with no world-space maths in the view. -->
  {#each childZoneIds as childId (childId)}
    {@const child = api.renderState.zones[childId]}
    {#if child}
      <ZoneRenderer zone={child} />
    {/if}
  {/each}

  <ZoneInsertIndicator {zone} />

  {#if editing}
    <ZoneResizeHandles {zone} />
  {/if}
</div>

<style>
  .zone {
    position: absolute;
  }

  .zone.dragging {
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.35));
  }

  .zone-body {
    position: absolute;
    inset: 0;
  }
</style>
