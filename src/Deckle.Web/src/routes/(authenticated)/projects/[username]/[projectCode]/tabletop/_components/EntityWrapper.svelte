<script lang="ts">
  import type { Entity } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';
  import { getTemplateDisplaySize } from '$lib/tabletop/initialization';
  import * as ops from '$lib/tabletop/operations';
  import { getContext } from 'svelte';
  import EntityView from './EntityView.svelte';

  let {
    entity,
    disableDrag = false
  }: {
    entity: Entity;
    disableDrag?: boolean;
  } = $props();

  const store = getTabletopApi();
  const template = $derived(store.templates[entity.templateId]);
  const isSelected = $derived(store.state.selectedEntityId === entity.instanceId);

  // Canvas geometry context — provided by <Tabletop>. Reading through a
  // getter keeps the values reactive without prop drilling.
  const canvas = getContext<{
    readonly zoom: number;
    readonly surfaceEl: HTMLElement | null;
    readonly sidebarEl: HTMLElement | null;
  }>('tabletopCanvas');

  // ─── Render entity at physical scale ──────────────────────────────────
  // Display size is derived from the template's real-world mm dimensions
  // so that cards, dice and player mats stay in proportion to each other.
  // `renderScale` converts the design's native DPI pixels down to those
  // display pixels.
  const displaySize = $derived(template ? getTemplateDisplaySize(template) : null);
  const displayWidth = $derived(displaySize ? displaySize.width : 100);
  const displayHeight = $derived(displaySize ? displaySize.height : 100);

  const renderScale = $derived(
    template && template.widthPx > 0 ? displayWidth / template.widthPx : 1
  );

  // ─── Pointer drag ─────────────────────────────────────────────────────
  let isDragging = $state(false);
  let didMove = false;
  let checkpointSaved = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let entityStartX = 0;
  let entityStartY = 0;

  const DRAG_THRESHOLD_PX = 3;

  function onPointerDown(e: PointerEvent) {
    // Right-click: select the entity so the context menu has a target,
    // but don't start a drag.
    if (e.button === 2) {
      e.stopPropagation();
      store.selectEntity(entity.instanceId);
      return;
    }
    if (disableDrag) return;
    if (e.button !== 0) return;

    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    store.selectEntity(entity.instanceId);

    isDragging = true;
    didMove = false;
    checkpointSaved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    entityStartX = entity.x;
    entityStartY = entity.y;
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;

    const zoom = canvas?.zoom ?? 1;
    const dxScreen = e.clientX - dragStartX;
    const dyScreen = e.clientY - dragStartY;

    if (!didMove && Math.hypot(dxScreen, dyScreen) < DRAG_THRESHOLD_PX) {
      // Suppress until we've moved past the click threshold; avoids
      // creating undo entries for simple clicks.
      return;
    }

    if (!checkpointSaved) {
      store.saveCheckpoint();
      checkpointSaved = true;
    }
    didMove = true;

    const dx = dxScreen / zoom;
    const dy = dyScreen / zoom;

    store.moveEntityTransient(entity.instanceId, entityStartX + dx, entityStartY + dy);
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;

    if (!didMove) return;

    // Drop onto sidebar = remove entity from the tabletop.
    const sidebarEl = canvas?.sidebarEl;
    if (sidebarEl) {
      const rect = sidebarEl.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX < rect.right &&
        e.clientY >= rect.top &&
        e.clientY < rect.bottom
      ) {
        store.removeEntity(entity.instanceId);
        return;
      }
    }

    // If the drop point is inside a different zone, commit the move
    // into that zone. This is the cross-zone drop behaviour.
    const surfaceEl = canvas?.surfaceEl;
    if (surfaceEl) {
      const zoom = canvas?.zoom ?? 1;
      const rect = surfaceEl.getBoundingClientRect();
      const worldX = (e.clientX - rect.left) / zoom;
      const worldY = (e.clientY - rect.top) / zoom;
      const targetZone = ops.findZoneAtPoint(store.state, worldX, worldY);
      if (targetZone && targetZone.id !== entity.zoneId) {
        // Convert drop point to zone-local coords, centered on the entity.
        const localX = worldX - targetZone.x - displayWidth / 2;
        const localY = worldY - targetZone.y - displayHeight / 2;
        store.moveEntityToZone(entity.instanceId, targetZone.id, { x: localX, y: localY });
      }
    }
  }

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    store.selectEntity(entity.instanceId);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="entity-wrapper"
  class:selected={isSelected}
  class:dragging={isDragging}
  style="
    left: {entity.x}px;
    top: {entity.y}px;
    width: {displayWidth}px;
    height: {displayHeight}px;
    transform: rotate({entity.rotation}deg);
  "
  onclick={handleClick}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
>
  <div
    class="entity-flip-container"
    class:flipped={entity.isFlipped}
    style="width: 100%; height: 100%;"
  >
    <div class="entity-front">
      <EntityView {entity} {template} {renderScale} side="front" />
    </div>
    <div class="entity-back">
      <EntityView {entity} {template} {renderScale} side="back" />
    </div>
  </div>

  {#if entity.label && !entity.isFlipped}
    <div class="entity-label" title={entity.label}>
      {entity.label}
    </div>
  {/if}
</div>

<style>
  .entity-wrapper {
    position: absolute;
    cursor: grab;
    user-select: none;
    border-radius: 6px;
    transition: box-shadow 0.15s;
    z-index: 1;
    /* perspective for 3D flip effect */
    perspective: 800px;
  }

  .entity-wrapper.selected {
    z-index: 10;
    box-shadow:
      0 0 0 2px #3b82f6,
      0 4px 16px rgba(59, 130, 246, 0.3);
  }

  .entity-wrapper.dragging {
    cursor: grabbing;
    z-index: 100;
    opacity: 0.92;
    box-shadow:
      0 0 0 2px #3b82f6,
      0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .entity-flip-container {
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.35s ease;
  }

  .entity-flip-container.flipped {
    transform: rotateY(180deg);
  }

  .entity-front,
  .entity-back {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    border-radius: 6px;
    overflow: hidden;
  }

  .entity-back {
    transform: rotateY(180deg);
  }

  .entity-label {
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.625rem;
    color: rgba(255, 255, 255, 0.6);
    text-align: center;
    pointer-events: none;
  }
</style>
