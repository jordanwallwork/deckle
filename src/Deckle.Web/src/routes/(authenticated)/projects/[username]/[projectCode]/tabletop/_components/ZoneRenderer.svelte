<script lang="ts">
  import type { Zone } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';
  import { getContext } from 'svelte';
  import EntityWrapper from './EntityWrapper.svelte';
  import GridRenderer from './GridRenderer.svelte';
  import SpreadRenderer from './SpreadRenderer.svelte';
  import StackRenderer from './StackRenderer.svelte';
  import ZoneEditToolbar from './ZoneEditToolbar.svelte';

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

  function handleDone() {
    store.setEditingZone(null);
  }

  function handleDelete() {
    store.deleteZone(zone.id);
  }

  // Ordered entity list for this zone.
  const zoneEntities = $derived(
    zone.entityIds.map((id) => store.state.entities[id]).filter(Boolean)
  );

  // Per-entity stagger for the wave flip on spread / grid zones. Only
  // populated while the transient zoneFlipAnimation is live; EntityWrapper
  // applies it as a CSS transition-delay so the cards flip in sequence.
  const zoneFlipAnimation = $derived(store.zoneFlipAnimation);
  function flipDelayFor(index: number): number {
    if (!zoneFlipAnimation || zoneFlipAnimation.zoneId !== zone.id) return 0;
    return index * zoneFlipAnimation.staggerMs;
  }
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
      {#if zone.type === 'grid' || zone.type === 'spread'}
        <span class="zone-count">{zoneEntities.length}</span>
      {/if}
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
    <GridRenderer {zone} entities={zoneEntities} {isEditing} {flipDelayFor} />
  {:else if zone.type === 'spread'}
    <SpreadRenderer {zone} entities={zoneEntities} {isEditing} {flipDelayFor} />
  {:else if zone.type === 'stack'}
    <StackRenderer {zone} entities={zoneEntities} {isEditing} {isSelected} />
  {/if}

  {#if isEditing}
    <ZoneEditToolbar {zone} onDone={handleDone} onDelete={handleDelete} />

    <div class="resize-handle handle-nw" onpointerdown={(e) => startEditDrag(e, 'nw')}></div>
    <div class="resize-handle handle-ne" onpointerdown={(e) => startEditDrag(e, 'ne')}></div>
    <div class="resize-handle handle-sw" onpointerdown={(e) => startEditDrag(e, 'sw')}></div>
    <div class="resize-handle handle-se" onpointerdown={(e) => startEditDrag(e, 'se')}></div>
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

  .zone-stack.selected,
  .zone-grid.selected,
  .zone-spread.selected {
    border-color: #f59e0b;
    border-style: solid;
    box-shadow:
      0 0 0 1px rgba(245, 158, 11, 0.35),
      0 0 12px rgba(245, 158, 11, 0.2);
  }

  .zone-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: #3b82f6;
    color: white;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .zone.selected .zone-count {
    background: #f59e0b;
    box-shadow: 0 1px 4px rgba(245, 158, 11, 0.4);
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

  .zone-spread {
    background: rgba(255, 255, 255, 0.03);
  }

  .zone-spread.drop-hover {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.5);
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
