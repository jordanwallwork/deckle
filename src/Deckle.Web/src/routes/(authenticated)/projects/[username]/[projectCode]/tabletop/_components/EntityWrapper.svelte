<script lang="ts">
  import type { Entity } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';
  import EntityView from './EntityView.svelte';

  let {
    entity,
    overrideX,
    overrideY,
    disableDrag = false
  }: {
    entity: Entity;
    overrideX?: number;
    overrideY?: number;
    disableDrag?: boolean;
  } = $props();

  const store = getTabletopApi();
  const template = $derived(store.templates[entity.templateId]);
  const isSelected = $derived(store.state.selectedEntityId === entity.instanceId);

  const x = $derived(overrideX ?? entity.x);
  const y = $derived(overrideY ?? entity.y);

  // ─── Scale entity to fit reasonable tabletop size ─────────────────────
  // Component designs can be very large (at print DPI). We scale them
  // down so they feel like physical game pieces on the canvas.
  const MAX_ENTITY_WIDTH = 180;
  const MAX_ENTITY_HEIGHT = 260;

  const renderScale = $derived.by(() => {
    if (!template) return 1;
    const scaleX = MAX_ENTITY_WIDTH / template.widthPx;
    const scaleY = MAX_ENTITY_HEIGHT / template.heightPx;
    return Math.min(scaleX, scaleY, 1);
  });

  const displayWidth = $derived(template ? template.widthPx * renderScale : 100);
  const displayHeight = $derived(template ? template.heightPx * renderScale : 100);

  // ─── Pointer drag ─────────────────────────────────────────────────────
  let isDragging = $state(false);
  let dragStartX = 0;
  let dragStartY = 0;
  let entityStartX = 0;
  let entityStartY = 0;

  function onPointerDown(e: PointerEvent) {
    if (disableDrag) return;
    if (e.button !== 0) return; // left-click only

    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    store.selectEntity(entity.instanceId);

    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    entityStartX = entity.x;
    entityStartY = entity.y;

    // Save checkpoint for undo at drag-start, not per-pixel
    store.saveCheckpoint();
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;

    // Account for canvas zoom: the parent uses CSS scale, so we need to
    // convert screen-space deltas to canvas-space.
    const canvasEl = (e.target as HTMLElement).closest('.canvas-surface');
    const zoom = canvasEl
      ? parseFloat(getComputedStyle(canvasEl).transform.split(',')[0]?.replace('matrix(', '') || '1')
      : 1;
    const effectiveZoom = isNaN(zoom) || zoom === 0 ? 1 : zoom;

    const dx = (e.clientX - dragStartX) / effectiveZoom;
    const dy = (e.clientY - dragStartY) / effectiveZoom;

    store.moveEntityTransient(entity.instanceId, entityStartX + dx, entityStartY + dy);
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
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
    left: {x}px;
    top: {y}px;
    width: {displayWidth}px;
    height: {displayHeight}px;
    transform: rotate({entity.rotation}deg);
  "
  onclick={handleClick}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
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
