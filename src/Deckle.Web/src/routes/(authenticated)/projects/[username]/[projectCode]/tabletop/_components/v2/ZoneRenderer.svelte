<script lang="ts">
  // Thin shell for a v2 zone: renders the region chrome (dashed border, name
  // tab, lock indicator), its piles, and the edit-mode controls. All
  // behaviour goes through the interaction reducer and store — the header
  // tab is the ONLY move handle; body presses forward to the reducer as
  // background events (marquee or click-select-zone).
  import type { Zone } from '$lib/tabletop/v2';
  import {
    getTabletopApi,
    gridRows,
    renameZone,
    removeZone,
    setGridCellHeight,
    setGridCellWidth,
    setGridColumns,
    setSpreadDirection,
    setSpreadOverlap,
    spreadSlots,
    type ResizeCorner
  } from '$lib/tabletop/v2';
  import PileRenderer from './PileRenderer.svelte';
  import ZoneBackground from './ZoneBackground.svelte';
  // Self-import for nested (child) zones — Svelte 5's replacement for
  // <svelte:self>. Freeform containers render their children recursively.
  import ZoneRenderer from './ZoneRenderer.svelte';

  let { zone }: { zone: Zone } = $props();

  const api = getTabletopApi();
  const { store, interaction } = api;

  const spread = $derived(zone.type === 'spread' ? zone : null);
  const grid = $derived(zone.type === 'grid' ? zone : null);
  const isGroup = $derived(zone.type === 'group');
  const gridRowCount = $derived(grid ? gridRows(grid) : 0);

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
  /** Zone-local primary-axis position of the insertion indicator, or null. */
  const insertSlot = $derived.by((): number | null => {
    if (!spread || api.dropHint?.zoneId !== zone.id) return null;
    const slots = spreadSlots(store.state, store.templates, spread);
    return slots[Math.min(api.dropHint.index, slots.length - 1)];
  });

  const CORNERS: ResizeCorner[] = ['nw', 'ne', 'sw', 'se'];

  // The header tab is the zone's move handle (and its click-select surface).
  function handleHeaderPointerDown(e: PointerEvent) {
    if (e.button !== 0 || editing) return;
    e.stopPropagation();
    e.preventDefault();
    interaction.zoneDown(zone.id, api.clientToWorld(e.clientX, e.clientY));
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

  function handleResizePointerDown(e: PointerEvent, corner: ResizeCorner) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    interaction.zoneResizeDown(zone.id, corner, api.clientToWorld(e.clientX, e.clientY));
  }

  function handleRenameInput(e: Event) {
    const name = (e.target as HTMLInputElement).value;
    store.updateTransient((s) => renameZone(s, zone.id, name));
  }

  function handleRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') store.endZoneEdit(true);
    else if (e.key === 'Escape') {
      e.stopPropagation();
      store.endZoneEdit(false);
    }
  }

  // Deleting from inside the session folds into its single undo step.
  function handleDelete() {
    store.updateTransient((s) => removeZone(s, zone.id));
    store.endZoneEdit(true);
  }

  // Spread settings relayout immediately; inside the edit session they are
  // transient frames, so Escape reverts them with the rest of the session.
  function handleDirection(direction: 'row' | 'column') {
    store.updateTransient((s) => setSpreadDirection(s, store.templates, zone.id, direction));
  }

  function handleOverlapInput(e: Event) {
    const overlap = Number((e.target as HTMLInputElement).value);
    if (Number.isNaN(overlap)) return;
    store.updateTransient((s) => setSpreadOverlap(s, store.templates, zone.id, overlap));
  }

  // Grid settings re-snap contents immediately; inside the edit session they
  // are transient frames, so Escape reverts them with the rest of the session.
  function handleCellWidthInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isNaN(value)) return;
    store.updateTransient((s) => setGridCellWidth(s, zone.id, value));
  }

  function handleCellHeightInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isNaN(value)) return;
    store.updateTransient((s) => setGridCellHeight(s, zone.id, value));
  }

  function handleColumnsInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isNaN(value)) return;
    store.updateTransient((s) => setGridColumns(s, zone.id, value));
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="zone"
  class:selected
  class:editing
  class:dragging
  class:locked={zone.locked}
  class:board={backgroundTemplate}
  class:drop-hover={dropHover}
  class:group={isGroup}
  style="left: {zone.x}px; top: {zone.y}px; width: {zone.width}px; height: {zone.height}px;"
  oncontextmenu={handleContextMenu}
>
  {#if editing}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="edit-toolbar" onpointerdown={(e) => e.stopPropagation()}>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="rename-input"
        type="text"
        value={zone.name}
        oninput={handleRenameInput}
        onkeydown={handleRenameKeydown}
        placeholder="Zone name"
        aria-label="Zone name"
        autofocus
      />
      {#if spread}
        <button
          class="edit-btn"
          class:active={spread.direction === 'row'}
          onclick={() => handleDirection('row')}
          title="Row layout">↔</button
        >
        <button
          class="edit-btn"
          class:active={spread.direction === 'column'}
          onclick={() => handleDirection('column')}
          title="Column layout">↕</button
        >
        <input
          class="overlap-input"
          type="number"
          min="0"
          step="5"
          value={spread.overlap}
          oninput={handleOverlapInput}
          title="Overlap (px)"
          aria-label="Overlap (px)"
        />
      {/if}
      {#if grid}
        <label class="grid-field" title="Cell width (px)">
          <span aria-hidden="true">W</span>
          <input
            class="grid-input"
            type="number"
            min="20"
            step="10"
            value={grid.cellWidth}
            oninput={handleCellWidthInput}
            aria-label="Cell width (px)"
          />
        </label>
        <label class="grid-field" title="Cell height (px)">
          <span aria-hidden="true">H</span>
          <input
            class="grid-input"
            type="number"
            min="20"
            step="10"
            value={grid.cellHeight}
            oninput={handleCellHeightInput}
            aria-label="Cell height (px)"
          />
        </label>
        <label class="grid-field" title="Columns">
          <span aria-hidden="true">⌗</span>
          <input
            class="grid-input"
            type="number"
            min="1"
            step="1"
            value={grid.columns}
            oninput={handleColumnsInput}
            aria-label="Columns"
          />
        </label>
      {/if}
      <button class="edit-btn delete" onclick={handleDelete} title="Delete zone">✕</button>
      <button class="edit-btn done" onclick={() => store.endZoneEdit(true)} title="Done">✓</button>
    </div>
  {:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="header-tab"
      title="Drag to move the zone"
      onpointerdown={handleHeaderPointerDown}
    >
      <span class="zone-name">{zone.name}</span>
      {#if zone.pileIds.length > 0}
        <span class="zone-count">{zone.pileIds.length}</span>
      {/if}
      {#if zone.locked}
        <span class="lock-badge" title="Locked">🔒</span>
      {/if}
    </div>
  {/if}

  <!-- Board/mat artwork sits beneath the piles and nested zones. -->
  {#if backgroundTemplate}
    <ZoneBackground template={backgroundTemplate} />
  {/if}
  <!-- The frame carries the border so it never offsets zone-local pile
       coordinates (absolute children position from the padding box). -->
  <div class="zone-frame"></div>
  {#if grid}
    <!-- Cell lattice: lines at each cell boundary from the zone's top-left. -->
    <div
      class="grid-lines"
      style="
        width: {grid.columns * grid.cellWidth}px;
        height: {gridRowCount * grid.cellHeight}px;
        background-size: {grid.cellWidth}px {grid.cellHeight}px;
      "
    ></div>
  {/if}
  <div class="zone-body" onpointerdown={handleBodyPointerDown}></div>

  {#each zone.pileIds as pileId (pileId)}
    {@const pile = store.state.piles[pileId]}
    {#if pile}
      <PileRenderer {pile} />
    {/if}
  {/each}

  <!-- Nested zones (freeform containers only): child coordinates are
       parent-local, so rendering them inside this positioned element places
       them correctly with no world-space maths in the view. -->
  {#each childZoneIds as childId (childId)}
    {@const child = store.state.zones[childId]}
    {#if child}
      <ZoneRenderer zone={child} />
    {/if}
  {/each}

  {#if spread && insertSlot !== null}
    <!-- Insertion indicator: a transient hint at the exact slot the drop
         would insert at (derived from the resolver, never from geometry the
         resolver doesn't share). -->
    <div
      class="insert-indicator"
      class:vertical={spread.direction === 'row'}
      style={spread.direction === 'row' ? `left: ${insertSlot}px;` : `top: ${insertSlot}px;`}
    ></div>
  {/if}

  {#if editing}
    {#each CORNERS as corner (corner)}
      <div
        class="resize-handle handle-{corner}"
        onpointerdown={(e) => handleResizePointerDown(e, corner)}
      ></div>
    {/each}
  {/if}
</div>

<style>
  .zone {
    position: absolute;
  }

  .zone-frame {
    position: absolute;
    inset: -2px;
    border-radius: 8px;
    border: 2px dashed rgba(255, 255, 255, 0.12);
    transition: border-color 0.15s;
    pointer-events: none;
  }

  /* Group (scatter tray): a soft tint marks it as the organic-scatter region. */
  .zone.group .zone-frame {
    background: rgba(120, 90, 200, 0.08);
    border-color: rgba(150, 120, 220, 0.28);
  }

  .zone.selected .zone-frame {
    border-color: rgba(100, 160, 255, 0.6);
  }

  .zone.editing .zone-frame {
    border-color: #3b82f6;
    border-style: solid;
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4);
  }

  .zone.dragging .zone-frame {
    border-color: rgba(100, 160, 255, 0.6);
  }

  .zone.dragging {
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.35));
  }

  .zone.locked .zone-frame {
    border-color: rgba(255, 255, 255, 0.07);
  }

  /* Boards/mats read as solid regions: their artwork carries the edge, so the
     dashed placeholder border recedes to a faint outline. */
  .zone.board .zone-frame {
    border-style: solid;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .zone.drop-hover .zone-frame {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.08);
  }

  .insert-indicator {
    position: absolute;
    background: #3b82f6;
    border-radius: 2px;
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.8);
    pointer-events: none;
    z-index: 30;
  }

  .insert-indicator.vertical {
    top: 6px;
    bottom: 6px;
    width: 3px;
    margin-left: -1.5px;
  }

  .insert-indicator:not(.vertical) {
    left: 6px;
    right: 6px;
    height: 3px;
    margin-top: -1.5px;
  }

  .zone-body {
    position: absolute;
    inset: 0;
  }

  /* Cell lattice drawn beneath the piles; the top/left zone edges come from
     the frame, so the gradients only need the interior + right/bottom lines. */
  .grid-lines {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .header-tab {
    position: absolute;
    top: -24px;
    left: 8px;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    height: 22px;
    padding: 0 8px;
    background: rgba(30, 32, 48, 0.9);
    border: 1px solid #3a3d4e;
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    cursor: grab;
    user-select: none;
    z-index: 1;
  }

  .zone.selected .header-tab {
    border-color: rgba(100, 160, 255, 0.6);
  }

  .zone-name {
    font-size: 0.6875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.55);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .zone-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: #3b82f6;
    color: white;
    font-size: 0.625rem;
    font-weight: 700;
  }

  .lock-badge {
    font-size: 0.625rem;
    line-height: 1;
  }

  .edit-toolbar {
    position: absolute;
    top: -36px;
    left: 0;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem;
    background: #1e2030;
    border: 1px solid #3a3d4e;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    z-index: 20;
  }

  .rename-input {
    background: #2a2d3e;
    border: 1px solid #3a3d4e;
    border-radius: 4px;
    color: #e8e9f0;
    font-size: 0.8125rem;
    padding: 0.25rem 0.5rem;
    min-width: 140px;
    outline: none;
  }

  .rename-input:focus {
    border-color: #3b82f6;
  }

  .edit-btn {
    background: #2a2d3e;
    border: 1px solid #3a3d4e;
    color: #c8cad8;
    border-radius: 4px;
    width: 1.75rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.1s;
  }

  .edit-btn:hover {
    background: #3a3d4e;
  }

  .edit-btn.active {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }

  .overlap-input {
    background: #2a2d3e;
    border: 1px solid #3a3d4e;
    border-radius: 4px;
    color: #e8e9f0;
    font-size: 0.8125rem;
    padding: 0.25rem 0.35rem;
    width: 4rem;
    outline: none;
  }

  .overlap-input:focus {
    border-color: #3b82f6;
  }

  .grid-field {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    color: #8b8ea0;
    font-size: 0.75rem;
  }

  .grid-input {
    background: #2a2d3e;
    border: 1px solid #3a3d4e;
    border-radius: 4px;
    color: #e8e9f0;
    font-size: 0.8125rem;
    padding: 0.25rem 0.35rem;
    width: 3.25rem;
    outline: none;
  }

  .grid-input:focus {
    border-color: #3b82f6;
  }

  .edit-btn.done {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }

  .edit-btn.done:hover {
    background: #1d4ed8;
  }

  .edit-btn.delete:hover {
    background: #7f1d1d;
    border-color: #991b1b;
    color: #fecaca;
  }

  .resize-handle {
    position: absolute;
    width: 12px;
    height: 12px;
    background: #3b82f6;
    border: 2px solid #1e2030;
    border-radius: 3px;
    z-index: 21;
  }

  .handle-nw {
    top: -6px;
    left: -6px;
    cursor: nwse-resize;
  }

  .handle-ne {
    top: -6px;
    right: -6px;
    cursor: nesw-resize;
  }

  .handle-sw {
    bottom: -6px;
    left: -6px;
    cursor: nesw-resize;
  }

  .handle-se {
    bottom: -6px;
    right: -6px;
    cursor: nwse-resize;
  }
</style>
