<script lang="ts">
  import type { Zone } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';
  import { getContext } from 'svelte';
  import EntityWrapper from './EntityWrapper.svelte';
  import ShuffleAnimation from './ShuffleAnimation.svelte';

  let { zone }: { zone: Zone } = $props();

  const store = getTabletopApi();
  const isSelected = $derived(store.state.selectedZoneId === zone.id);
  const isEditing = $derived(store.state.editingZoneId === zone.id);

  // Push a single history entry per edit session, so Done→Undo returns
  // to the pre-edit state in one step regardless of how many drags /
  // keystrokes happened in between.
  let editCheckpointSaved = false;
  $effect(() => {
    if (isEditing && !editCheckpointSaved) {
      store.saveCheckpoint();
      editCheckpointSaved = true;
    } else if (!isEditing) {
      editCheckpointSaved = false;
    }
  });

  const canvas = getContext<{
    readonly zoom: number;
    readonly surfaceEl: HTMLElement | null;
    readonly sidebarEl: HTMLElement | null;
  }>('tabletopCanvas');

  function isZoneBackgroundEvent(e: Event): boolean {
    const target = e.target as HTMLElement;
    return target === e.currentTarget || target.classList.contains('zone-bg');
  }

  function handleZoneClick(e: MouseEvent) {
    if (isEditing) return;
    e.stopPropagation();
    if (isZoneBackgroundEvent(e)) {
      store.selectZone(zone.id);
    }
  }

  function handleZoneContextMenu(e: MouseEvent) {
    if (isEditing) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Select the zone before the canvas handler builds the context menu.
    if (isZoneBackgroundEvent(e)) {
      store.selectZone(zone.id);
    }
  }

  // ─── Edit-mode drag: reposition and resize ─────────────────────────────
  type DragKind = 'move' | 'nw' | 'ne' | 'sw' | 'se';

  interface EditDrag {
    kind: DragKind;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    originWidth: number;
    originHeight: number;
  }

  let editDrag: EditDrag | null = null;

  function startEditDrag(e: PointerEvent, kind: DragKind) {
    if (!isEditing) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    editDrag = {
      kind,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: zone.x,
      originY: zone.y,
      originWidth: zone.width,
      originHeight: zone.height
    };
    // History is captured once on edit enter — drags here stay transient.
    window.addEventListener('pointermove', handleEditDragMove);
    window.addEventListener('pointerup', handleEditDragEnd);
    window.addEventListener('pointercancel', handleEditDragEnd);
  }

  function handleEditDragMove(e: PointerEvent) {
    const drag = editDrag;
    if (!drag) return;
    const zoom = canvas?.zoom ?? 1;
    const dx = (e.clientX - drag.startClientX) / zoom;
    const dy = (e.clientY - drag.startClientY) / zoom;

    if (drag.kind === 'move') {
      store.moveZoneTransient(zone.id, drag.originX + dx, drag.originY + dy);
      return;
    }

    let newX = drag.originX;
    let newY = drag.originY;
    let newW = drag.originWidth;
    let newH = drag.originHeight;

    if (drag.kind === 'se') {
      newW = drag.originWidth + dx;
      newH = drag.originHeight + dy;
    } else if (drag.kind === 'ne') {
      newW = drag.originWidth + dx;
      newY = drag.originY + dy;
      newH = drag.originHeight - dy;
    } else if (drag.kind === 'sw') {
      newX = drag.originX + dx;
      newW = drag.originWidth - dx;
      newH = drag.originHeight + dy;
    } else if (drag.kind === 'nw') {
      newX = drag.originX + dx;
      newY = drag.originY + dy;
      newW = drag.originWidth - dx;
      newH = drag.originHeight - dy;
    }

    // Enforce min size; also clamp the origin so the zone doesn't slide past
    // the opposite edge when shrinking from the top/left.
    const MIN = 40;
    if (newW < MIN) {
      if (drag.kind === 'nw' || drag.kind === 'sw') {
        newX = drag.originX + drag.originWidth - MIN;
      }
      newW = MIN;
    }
    if (newH < MIN) {
      if (drag.kind === 'nw' || drag.kind === 'ne') {
        newY = drag.originY + drag.originHeight - MIN;
      }
      newH = MIN;
    }

    store.resizeZoneTransient(zone.id, newW, newH, newX, newY);
  }

  function handleEditDragEnd() {
    editDrag = null;
    window.removeEventListener('pointermove', handleEditDragMove);
    window.removeEventListener('pointerup', handleEditDragEnd);
    window.removeEventListener('pointercancel', handleEditDragEnd);
  }

  function handleRenameInput(e: Event) {
    const target = e.target as HTMLInputElement;
    store.renameZoneTransient(zone.id, target.value);
  }

  function handleDone() {
    store.setEditingZone(null);
  }

  function handleDelete() {
    store.deleteZone(zone.id);
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

  // While a shuffle is animating for this stack, the underlying stack-top
  // is hidden — ShuffleAnimation owns the visuals end-to-end so the swap to
  // the new top happens behind the cards rather than as a snap.
  const shuffleAnimation = $derived(store.shuffleAnimation);
  const isShuffling = $derived(shuffleAnimation?.zoneId === zone.id);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="zone zone-{zone.type}"
  class:selected={isSelected}
  class:editing={isEditing}
  class:locked={zone.locked}
  style="left: {zone.x}px; top: {zone.y}px; width: {zone.width}px; height: {zone.height}px;"
  onclick={handleZoneClick}
  oncontextmenu={handleZoneContextMenu}
>
  {#if zone.type !== 'stack' && !isEditing}
    <div class="zone-label">
      {zone.name}
      {#if zone.locked}
        <span class="lock-badge" title="Locked">🔒</span>
      {/if}
    </div>
  {/if}

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="zone-bg"
    onpointerdown={(e) => isEditing && startEditDrag(e, 'move')}
  ></div>

  {#if zone.type === 'freeform'}
    {#each zoneEntities as entity (entity.instanceId)}
      <EntityWrapper {entity} disableDrag={isEditing} />
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

    {#each zoneEntities as entity (entity.instanceId)}
      <EntityWrapper {entity} disableDrag={isEditing} />
    {/each}

  {:else if zone.type === 'stack'}
    {#if stackTopEntity}
      {#if !isShuffling}
        <div class="stack-top">
          {#key stackTopEntity.instanceId}
            <EntityWrapper entity={stackTopEntity} disableDrag={isEditing} />
          {/key}
        </div>
      {/if}
      {#if isShuffling && shuffleAnimation}
        <ShuffleAnimation
          animatedIds={shuffleAnimation.animatedIds}
          onComplete={() => store.completeShuffleAnimation()}
        />
      {/if}
      <div class="stack-badge">{zoneEntities.length}</div>
    {:else}
      <div class="stack-empty">Empty</div>
    {/if}
  {/if}

  {#if isEditing}
    <div class="edit-toolbar" onpointerdown={(e) => e.stopPropagation()}>
      <input
        class="rename-input"
        type="text"
        value={zone.name}
        oninput={handleRenameInput}
        onkeydown={(e) => e.key === 'Enter' && handleDone()}
        placeholder="Zone name"
        aria-label="Zone name"
      />
      <button class="edit-btn delete" onclick={handleDelete} title="Delete zone">✕</button>
      <button class="edit-btn done" onclick={handleDone} title="Done">✓</button>
    </div>

    <div
      class="resize-handle handle-nw"
      onpointerdown={(e) => startEditDrag(e, 'nw')}
    ></div>
    <div
      class="resize-handle handle-ne"
      onpointerdown={(e) => startEditDrag(e, 'ne')}
    ></div>
    <div
      class="resize-handle handle-sw"
      onpointerdown={(e) => startEditDrag(e, 'sw')}
    ></div>
    <div
      class="resize-handle handle-se"
      onpointerdown={(e) => startEditDrag(e, 'se')}
    ></div>
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

  .zone-stack.selected {
    border-color: #f59e0b;
    border-style: solid;
    box-shadow:
      0 0 0 1px rgba(245, 158, 11, 0.35),
      0 0 12px rgba(245, 158, 11, 0.2);
  }

  .zone.editing {
    border-color: #3b82f6;
    border-style: solid;
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4);
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
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .lock-badge {
    font-size: 0.75rem;
    line-height: 1;
  }

  .zone-bg {
    position: absolute;
    inset: 0;
    border-radius: 6px;
    pointer-events: auto;
  }

  .zone.editing .zone-bg {
    cursor: move;
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

  .stack-top {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* Centre the card inside the stack so rotation about its own centre lands
     within the stack's (possibly swapped) bounding box. The wrapper's own
     left/top inline styles are always 0 for stack entities, so overriding
     them here is safe. `margin: auto` with `inset: 0` centres an absolutely-
     positioned element with defined width/height. */
  .stack-top :global(.entity-wrapper) {
    inset: 0;
    margin: auto;
  }

  .stack-badge {
    position: absolute;
    top: 0;
    right: 0;
    transform: translate(50%, -50%);
    z-index: 10;
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
    pointer-events: none;
    transition: background 0.15s;
  }

  .zone-stack.selected .stack-badge {
    background: #f59e0b;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
  }

  .stack-empty {
    color: rgba(255, 255, 255, 0.25);
    font-size: 0.8125rem;
    font-style: italic;
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
    width: 14px;
    height: 14px;
    background: #3b82f6;
    border: 2px solid white;
    border-radius: 50%;
    z-index: 15;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  }

  .handle-nw {
    top: -7px;
    left: -7px;
    cursor: nwse-resize;
  }
  .handle-ne {
    top: -7px;
    right: -7px;
    cursor: nesw-resize;
  }
  .handle-sw {
    bottom: -7px;
    left: -7px;
    cursor: nesw-resize;
  }
  .handle-se {
    bottom: -7px;
    right: -7px;
    cursor: nwse-resize;
  }
</style>
