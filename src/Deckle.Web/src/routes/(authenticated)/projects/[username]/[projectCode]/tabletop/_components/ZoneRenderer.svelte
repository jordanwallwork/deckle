<script lang="ts">
  import type { Zone } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';
  import * as ops from '$lib/tabletop/operations';
  import { getContext } from 'svelte';
  import EntityWrapper from './EntityWrapper.svelte';
  import EntityView from './EntityView.svelte';
  import GridRenderer from './GridRenderer.svelte';
  import GroupRenderer from './GroupRenderer.svelte';
  import SpreadRenderer from './SpreadRenderer.svelte';
  import StackRenderer from './StackRenderer.svelte';
  import ZoneEditToolbar from './ZoneEditToolbar.svelte';
  import ZoneRenderer from './ZoneRenderer.svelte';

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
    // Only match this zone's own zone-bg, not a nested zone's zone-bg that
    // bubbled up — check the direct parent matches this zone's element.
    return target === e.currentTarget ||
      (target.classList.contains('zone-bg') && target.parentElement === e.currentTarget);
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
    needsCheckpoint?: boolean;
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
    window.addEventListener('pointerup', handleEditDragUp);
    window.addEventListener('pointercancel', handleEditDragCancel);
  }

  // Move a board/mat zone by dragging when the zone is selected (no edit mode needed).
  function startMoveDrag(e: PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    editDrag = {
      kind: 'move',
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: zone.x,
      originY: zone.y,
      originWidth: zone.width,
      originHeight: zone.height,
      needsCheckpoint: true
    };
    window.addEventListener('pointermove', handleEditDragMove);
    window.addEventListener('pointerup', handleEditDragUp);
    window.addEventListener('pointercancel', handleEditDragCancel);
  }

  function handleEditDragMove(e: PointerEvent) {
    const drag = editDrag;
    if (!drag) return;
    if (drag.needsCheckpoint) {
      store.saveCheckpoint();
      drag.needsCheckpoint = false;
    }
    const zoom = canvas?.zoom ?? 1;
    const dx = (e.clientX - drag.startClientX) / zoom;
    const dy = (e.clientY - drag.startClientY) / zoom;

    if (drag.kind === 'move') {
      store.moveZoneTransient(zone.id, drag.originX + dx, drag.originY + dy);
      // Highlight the freeform zone the dragged zone's centre has entered,
      // mirroring the nest logic that runs on drop in tryNestOrUnnest().
      const worldPos = ops.getZoneWorldPos(store.state, zone.id);
      const cx = worldPos.x + zone.width / 2;
      const cy = worldPos.y + zone.height / 2;
      const nestTarget = ops.findZoneAtPoint(store.state, cx, cy, zone.id);
      store.setDropTargetZoneId(nestTarget?.type === 'freeform' ? nestTarget.id : null);
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

  function cleanupEditDrag() {
    editDrag = null;
    store.setDropTargetZoneId(null);
    window.removeEventListener('pointermove', handleEditDragMove);
    window.removeEventListener('pointerup', handleEditDragUp);
    window.removeEventListener('pointercancel', handleEditDragCancel);
  }

  function handleEditDragUp(e: PointerEvent) {
    const drag = editDrag;
    cleanupEditDrag();
    if (drag?.kind === 'move') {
      tryNestOrUnnest();
    }
  }

  function handleEditDragCancel() {
    cleanupEditDrag();
  }

  /**
   * After a move drag ends, check whether the zone's centre landed inside a
   * different freeform zone (→ nest it) or outside any freeform zone while
   * already nested (→ promote it back to the top level).
   */
  function tryNestOrUnnest() {
    const worldPos = ops.getZoneWorldPos(store.state, zone.id);
    const cx = worldPos.x + zone.width / 2;
    const cy = worldPos.y + zone.height / 2;
    const dropTarget = ops.findZoneAtPoint(store.state, cx, cy, zone.id);

    if (dropTarget?.type === 'freeform' && dropTarget.id !== zone.parentZoneId) {
      store.nestZone(zone.id, dropTarget.id);
    } else if (zone.parentZoneId && dropTarget?.type !== 'freeform') {
      store.unnestZone(zone.id);
    }
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

  // Background rendering for GameBoard / PlayerMat zones.
  const bgTemplate = $derived(
    zone.type === 'freeform' && zone.backgroundTemplateId
      ? store.templates[zone.backgroundTemplateId]
      : null
  );
  const bgRenderScale = $derived(
    bgTemplate && bgTemplate.widthPx > 0 ? zone.width / bgTemplate.widthPx : 1
  );
  // Non-freeform zones (stack/grid/spread/group) and board/mat zones can be
  // dragged directly when selected; plain freeform zones require edit mode.
  const isSelectedMoveable = $derived(
    isSelected && !zone.locked && !isEditing && (zone.type !== 'freeform' || !!bgTemplate)
  );

  // Synthetic entity used only for EntityView's rendering path — no interaction.
  const bgEntity = $derived(
    bgTemplate
      ? {
          instanceId: `${zone.id}-bg`,
          templateId: bgTemplate.id,
          zoneId: zone.id,
          x: 0,
          y: 0,
          rotation: 0,
          isFlipped: false,
          mergeData: null as Record<string, string> | null,
          locked: true
        }
      : null
  );
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="zone zone-{zone.type}"
  class:selected={isSelected}
  class:editing={isEditing}
  class:locked={zone.locked}
  class:board-zone={bgTemplate !== null}
  class:drop-hover={store.dropTargetZoneId === zone.id}
  style="left: {zone.x}px; top: {zone.y}px; width: {zone.width}px; height: {zone.height}px;"
  onclick={handleZoneClick}
  oncontextmenu={handleZoneContextMenu}
>
  {#if zone.type !== 'stack' && !isEditing && !bgTemplate}
    <div class="zone-label">
      {zone.name}
      {#if zone.type === 'grid' || zone.type === 'spread' || zone.type === 'group'}
        <span class="zone-count">{zoneEntities.length}</span>
      {/if}
      {#if zone.locked}
        <span class="lock-badge" title="Locked">🔒</span>
      {/if}
    </div>
  {/if}

  {#if bgEntity && bgTemplate}
    <div class="zone-board-bg" aria-hidden="true">
      <EntityView entity={bgEntity} template={bgTemplate} renderScale={bgRenderScale} side="front" />
    </div>
  {/if}

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="zone-bg"
    class:selected-moveable={isSelectedMoveable}
    onpointerdown={(e) => {
      if (isEditing) startEditDrag(e, 'move');
      else if (isSelectedMoveable) startMoveDrag(e);
    }}
  ></div>

  {#if zone.type === 'freeform'}
    {#each zoneEntities as entity (entity.instanceId)}
      <EntityWrapper {entity} disableDrag={isEditing} />
    {/each}
    {#each zone.childZoneIds ?? [] as childId (childId)}
      {@const childZone = store.state.zones[childId]}
      {#if childZone}
        <ZoneRenderer zone={childZone} />
      {/if}
    {/each}
  {:else if zone.type === 'grid'}
    <GridRenderer {zone} entities={zoneEntities} {isEditing} {flipDelayFor} />
  {:else if zone.type === 'spread'}
    <SpreadRenderer {zone} entities={zoneEntities} {isEditing} {flipDelayFor} />
  {:else if zone.type === 'stack'}
    <StackRenderer {zone} entities={zoneEntities} {isEditing} {isSelected} />
  {:else if zone.type === 'group'}
    <GroupRenderer {zone} entities={zoneEntities} {isEditing} />
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
  .zone-spread.selected,
  .zone-group.selected {
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

  .zone.editing .zone-bg,
  .zone-bg.selected-moveable {
    cursor: move;
  }

  .zone-freeform {
    background: rgba(255, 255, 255, 0.03);
  }

  /* Board/mat zones render their design as a background — no dashed border or tint. */
  .board-zone {
    background: transparent;
    border-color: transparent;
    border-radius: 0;
    overflow: hidden;
  }

  .board-zone.selected {
    border-color: rgba(100, 160, 255, 0.6);
    border-style: solid;
    box-shadow:
      0 0 0 1px rgba(100, 160, 255, 0.3),
      0 0 12px rgba(100, 160, 255, 0.15);
  }

  .board-zone.editing {
    border-color: #3b82f6;
    border-style: solid;
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4);
  }

  .board-zone.drop-hover {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.5);
    border-style: solid;
  }

  .zone-board-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
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

  .zone-group {
    background: rgba(255, 255, 255, 0.03);
  }

  .zone.drop-hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.5);
    border-style: solid;
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
