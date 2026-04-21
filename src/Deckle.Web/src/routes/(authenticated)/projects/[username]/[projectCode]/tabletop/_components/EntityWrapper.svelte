<script module lang="ts">
  import type { TabletopStore } from '$lib/tabletop';

  // Module-level drag state. Survives the destruction of any single
  // EntityWrapper — needed because a stack-top entity's DOM node is
  // destroyed mid-drag when the entity detaches into a freeform zone.
  // Window-level pointer listeners drive the drag via this record and the
  // store, independent of which component instance started it.
  interface ActiveDrag {
    instanceId: string;
    store: TabletopStore;
    canvas: {
      readonly zoom: number;
      readonly surfaceEl: HTMLElement | null;
      readonly sidebarEl: HTMLElement | null;
    };
    dragStartX: number;
    dragStartY: number;
    entityStartX: number;
    entityStartY: number;
    displayWidth: number;
    displayHeight: number;
    didMove: boolean;
    checkpointSaved: boolean;
    /**
     * True once the drag has escaped an ordered zone (stack or spread) into
     * a freely-positioned intermediate. Ordered zones lay their own entities
     * out, so the drag has to detach before free movement works.
     */
    detachedFromOrdered: boolean;
    // When set, the drag moves the whole zone instead of the entity. Entered
    // when pointerdown lands on a stack's top card while that stack is
    // already the selected zone.
    zoneDrag: { zoneId: string; zoneStartX: number; zoneStartY: number } | null;
  }

  let activeDrag: ActiveDrag | null = null;

  // After a zone-drag pointerup the browser may still fire `click` on the
  // entity — suppress it once so selection doesn't flip back to the top card.
  let suppressNextClick = false;
</script>

<script lang="ts">
  import type { Entity } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';
  import { getTemplateDisplaySize } from '$lib/tabletop/initialization';
  import * as ops from '$lib/tabletop/operations';
  import { getContext } from 'svelte';
  import EntityView from './EntityView.svelte';

  let {
    entity,
    disableDrag = false,
    flipDelay = 0
  }: {
    entity: Entity;
    disableDrag?: boolean;
    /**
     * CSS `transition-delay` (ms) applied to the flip transform. Used by
     * spread / grid zones to stagger a zone-wide flip into a wave.
     */
    flipDelay?: number;
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

  // Local flag mirrors activeDrag for this specific instance so the
  // `.dragging` class shows only while this component's entity is the one
  // being dragged.
  let isDragging = $state(false);

  const DRAG_THRESHOLD_PX = 3;

  function onPointerDown(e: PointerEvent) {
    // Right-click: select the entity so the context menu has a target,
    // but don't start a drag. Two cases route the menu to the zone instead:
    //   - Stack zones — the top card is the stack's only clickable surface,
    //     so its context menu should always be the stack's (shuffle / flip /
    //     persistent / draw).
    //   - Any zone the user has already selected (e.g. via clicking the
    //     zone background, or double-clicking an entity) — preserve that
    //     selection so right-clicking on a card inside a packed spread /
    //     grid still surfaces the zone menu and "Edit Zone" stays reachable.
    if (e.button === 2) {
      e.stopPropagation();
      const currentZone = store.state.zones[entity.zoneId];
      if (currentZone?.type === 'stack' || store.state.selectedZoneId === entity.zoneId) {
        store.selectZone(entity.zoneId);
      } else {
        store.selectEntity(entity.instanceId);
      }
      return;
    }
    if (disableDrag) return;
    if (entity.locked) {
      // Locked entities still select on click but can't be dragged.
      e.stopPropagation();
      store.selectEntity(entity.instanceId);
      return;
    }
    if (e.button !== 0) return;

    e.stopPropagation();

    // If the stack is already the selected zone (typically via a prior
    // double-click), pressing on its top card is a potential zone drag.
    // Defer any selection change until pointerup — a pure click still
    // selects the entity (via onclick), but a drag moves the whole zone
    // without flipping selection to the top card.
    const currentZone = store.state.zones[entity.zoneId];
    const zoneDrag =
      currentZone?.type === 'stack' &&
      !currentZone.locked &&
      store.state.selectedZoneId === currentZone.id
        ? {
            zoneId: currentZone.id,
            zoneStartX: currentZone.x,
            zoneStartY: currentZone.y
          }
        : null;

    if (!zoneDrag) {
      store.selectEntity(entity.instanceId);
    }

    activeDrag = {
      instanceId: entity.instanceId,
      store,
      canvas,
      dragStartX: e.clientX,
      dragStartY: e.clientY,
      entityStartX: entity.x,
      entityStartY: entity.y,
      displayWidth,
      displayHeight,
      didMove: false,
      checkpointSaved: false,
      detachedFromOrdered: false,
      zoneDrag
    };
    isDragging = true;

    // Window listeners (not setPointerCapture) so the drag keeps tracking
    // if this component unmounts — which happens when the entity detaches
    // from a stack and re-renders inside a different zone.
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
  }

  function handleWindowPointerMove(e: PointerEvent) {
    const drag = activeDrag;
    if (!drag) return;
    const current = drag.store.state.entities[drag.instanceId];
    if (!current) return;

    const zoom = drag.canvas?.zoom ?? 1;
    const dxScreen = e.clientX - drag.dragStartX;
    const dyScreen = e.clientY - drag.dragStartY;

    if (!drag.didMove && Math.hypot(dxScreen, dyScreen) < DRAG_THRESHOLD_PX) return;

    if (!drag.checkpointSaved) {
      drag.store.saveCheckpoint();
      drag.checkpointSaved = true;
    }
    drag.didMove = true;

    // Signal the sidebar when a drag hovers over it so it can show the removal indicator.
    drag.store.setDraggingOverSidebar(pointInElement(drag.canvas?.sidebarEl ?? null, e));

    const dx = dxScreen / zoom;
    const dy = dyScreen / zoom;

    // Double-click-drag on a stack: translate the whole zone instead of
    // detaching the top card.
    if (drag.zoneDrag) {
      drag.store.moveZoneTransient(
        drag.zoneDrag.zoneId,
        drag.zoneDrag.zoneStartX + dx,
        drag.zoneDrag.zoneStartY + dy
      );
      return;
    }

    // Stack and spread zones both lay their own entities out, so a drag
    // starting from one has to detach into a freely-positioned zone before
    // free movement works.
    if (!drag.detachedFromOrdered) {
      const currentZone = drag.store.state.zones[current.zoneId];
      if (currentZone?.type === 'stack' || currentZone?.type === 'spread') {
        const world = canvasToWorld(drag.canvas, e);
        if (!world) return;

        // Prefer a non-ordered zone under the pointer; fall back to any
        // freeform/grid so the entity has somewhere to live.
        const isFree = (t: { type: string } | null | undefined) =>
          !!t && t.type !== 'stack' && t.type !== 'spread';
        let target = ops.findZoneAtPoint(drag.store.state, world.worldX, world.worldY);
        if (!isFree(target) || target?.id === currentZone.id) {
          target =
            Object.values(drag.store.state.zones).find((z) => isFree(z)) ?? null;
        }
        if (!target) return;

        const localX = world.worldX - target.x - drag.displayWidth / 2;
        const localY = world.worldY - target.y - drag.displayHeight / 2;
        drag.store.moveEntityToZoneTransient(drag.instanceId, target.id, {
          x: localX,
          y: localY
        });

        const updated = drag.store.state.entities[drag.instanceId];
        if (updated) {
          drag.entityStartX = updated.x;
          drag.entityStartY = updated.y;
        }
        drag.dragStartX = e.clientX;
        drag.dragStartY = e.clientY;
        drag.detachedFromOrdered = true;
        return;
      }
      drag.detachedFromOrdered = true;
    }

    drag.store.moveEntityTransient(
      drag.instanceId,
      drag.entityStartX + dx,
      drag.entityStartY + dy
    );

    // Publish a spread-hover hint so the target spread can render a drop
    // indicator at the computed insert index. Cleared when not over a spread.
    const world = canvasToWorld(drag.canvas, e);
    if (world) {
      const hoverZone = ops.findZoneAtPoint(drag.store.state, world.worldX, world.worldY);
      if (hoverZone?.type === 'spread') {
        const localX = world.worldX - hoverZone.x;
        const localY = world.worldY - hoverZone.y;
        const index = ops.computeSpreadInsertIndex(
          hoverZone,
          localX,
          localY,
          drag.instanceId
        );
        drag.store.setSpreadDropHover({ zoneId: hoverZone.id, index });
      } else {
        drag.store.setSpreadDropHover(null);
      }
    }
  }

  function pointInElement(el: HTMLElement | null, e: PointerEvent): boolean {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX < r.right && e.clientY >= r.top && e.clientY < r.bottom;
  }

  function canvasToWorld(
    canvas: ActiveDrag['canvas'],
    e: PointerEvent
  ): { worldX: number; worldY: number } | null {
    const surfaceEl = canvas?.surfaceEl;
    if (!surfaceEl) return null;
    const zoom = canvas?.zoom ?? 1;
    const rect = surfaceEl.getBoundingClientRect();
    return {
      worldX: (e.clientX - rect.left) / zoom,
      worldY: (e.clientY - rect.top) / zoom
    };
  }

  function handleZoneDragEnd(drag: ActiveDrag, e: PointerEvent): void {
    if (!drag.zoneDrag) return;
    suppressNextClick = true;

    // Drop onto sidebar = remove the whole stack zone from the tabletop.
    if (pointInElement(drag.canvas?.sidebarEl ?? null, e)) {
      drag.store.deleteZone(drag.zoneDrag.zoneId);
      return;
    }

    const world = canvasToWorld(drag.canvas, e);
    if (!world) return;

    // Drop onto another stack → merge the two stacks.
    const targetZone = ops.findZoneAtPoint(
      drag.store.state,
      world.worldX,
      world.worldY,
      drag.zoneDrag.zoneId
    );
    if (targetZone?.type === 'stack') {
      drag.store.mergeStackOntoStack(drag.zoneDrag.zoneId, targetZone.id);
      return;
    }

    mergeStackOntoLooseEntity(drag, world.worldX, world.worldY);
  }

  function mergeStackOntoLooseEntity(drag: ActiveDrag, worldX: number, worldY: number): void {
    if (!drag.zoneDrag) return;
    const entityAtPoint = ops.findEntityAtPoint(
      drag.store.state,
      drag.store.templates,
      worldX,
      worldY
    );
    if (!entityAtPoint) return;

    const draggedZone = drag.store.state.zones[drag.zoneDrag.zoneId];
    if (draggedZone?.type !== 'stack') return;

    const ds = draggedZone.defaultSize;
    const entityTemplate = drag.store.templates[entityAtPoint.templateId];
    if (!ds || !entityTemplate) return;

    const { width, height } = getTemplateDisplaySize(entityTemplate);
    if (width !== ds.width || height !== ds.height) return;

    // Re-centre the stack over the target entity so the merge lands cleanly.
    const entityZone = drag.store.state.zones[entityAtPoint.zoneId];
    if (entityZone) {
      const cx = entityZone.x + entityAtPoint.x + width / 2;
      const cy = entityZone.y + entityAtPoint.y + height / 2;
      drag.store.moveZoneTransient(
        drag.zoneDrag.zoneId,
        cx - draggedZone.width / 2,
        cy - draggedZone.height / 2
      );
    }
    drag.store.moveEntityToZone(entityAtPoint.instanceId, drag.zoneDrag.zoneId, {
      insertIndex: 0
    });
  }

  function handleEntityDragEnd(drag: ActiveDrag, current: Entity, e: PointerEvent): void {
    // Drop onto sidebar = remove entity (and sibling instances for multi-instance templates).
    if (pointInElement(drag.canvas?.sidebarEl ?? null, e)) {
      drag.store.removeEntity(drag.instanceId);
      return;
    }

    const world = canvasToWorld(drag.canvas, e);
    if (!world) return;

    // Entity-on-entity merge: dropped onto a same-type entity in a non-stack
    // zone → create a new stack with both, dragged entity on top.
    if (tryMergeEntitiesIntoStack(drag, current, world.worldX, world.worldY)) return;

    const targetZone = ops.findZoneAtPoint(drag.store.state, world.worldX, world.worldY);
    if (!targetZone) return;
    if (targetZone.id === current.zoneId && targetZone.type !== 'spread') return;

    const dragTemplate = drag.store.templates[current.templateId];
    if (targetZone.type === 'spread' && dragTemplate && ops.isStackable(dragTemplate)) {
      // Spread drops land at the insertion point derived from the pointer,
      // so the user can slot the card anywhere in the row.
      const insertIndex = ops.computeSpreadInsertIndex(
        targetZone,
        world.worldX - targetZone.x,
        world.worldY - targetZone.y,
        drag.instanceId
      );
      drag.store.moveEntityToZone(drag.instanceId, targetZone.id, { insertIndex });
      return;
    }

    const localX = world.worldX - targetZone.x - drag.displayWidth / 2;
    const localY = world.worldY - targetZone.y - drag.displayHeight / 2;
    drag.store.moveEntityToZone(drag.instanceId, targetZone.id, { x: localX, y: localY });
  }

  function tryMergeEntitiesIntoStack(
    drag: ActiveDrag,
    current: Entity,
    worldX: number,
    worldY: number
  ): boolean {
    const entityAtPoint = ops.findEntityAtPoint(
      drag.store.state,
      drag.store.templates,
      worldX,
      worldY,
      drag.instanceId
    );
    if (!entityAtPoint) return false;

    const draggedTemplate = drag.store.templates[current.templateId];
    const targetTemplate = drag.store.templates[entityAtPoint.templateId];
    if (!draggedTemplate || !targetTemplate) return false;
    if (draggedTemplate.type !== targetTemplate.type) return false;
    if (!ops.isStackable(draggedTemplate)) return false;

    const targetEntityZone = drag.store.state.zones[entityAtPoint.zoneId];
    if (targetEntityZone?.type === 'stack' || targetEntityZone?.type === 'spread') return false;

    drag.store.mergeEntitiesIntoStack(drag.instanceId, entityAtPoint.instanceId);
    return true;
  }

  function handleWindowPointerUp(e: PointerEvent) {
    const drag = activeDrag;
    if (!drag) return;
    activeDrag = null;
    isDragging = false;

    drag.store.setDraggingOverSidebar(false);
    drag.store.setSpreadDropHover(null);

    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
    window.removeEventListener('pointercancel', handleWindowPointerUp);

    if (!drag.didMove) return;

    if (drag.zoneDrag) {
      handleZoneDragEnd(drag, e);
      return;
    }

    const current = drag.store.state.entities[drag.instanceId];
    if (!current) return;
    handleEntityDragEnd(drag, current, e);
  }

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    store.selectEntity(entity.instanceId);
  }

  function handleDoubleClick(e: MouseEvent) {
    e.stopPropagation();
    store.selectZone(entity.zoneId);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="entity-wrapper"
  class:selected={isSelected}
  class:dragging={isDragging}
  class:locked={entity.locked}
  style="
    left: {entity.x}px;
    top: {entity.y}px;
    width: {displayWidth}px;
    height: {displayHeight}px;
    transform: rotate({entity.rotation}deg);
  "
  onclick={handleClick}
  ondblclick={handleDoubleClick}
  onpointerdown={onPointerDown}
>
  <div
    class="entity-flip-container"
    class:flipped={entity.isFlipped}
    style="width: 100%; height: 100%; transition-delay: {flipDelay}ms;"
  >
    <div class="entity-front">
      <EntityView {entity} {template} {renderScale} side="front" />
    </div>
    <div class="entity-back">
      <EntityView {entity} {template} {renderScale} side="back" />
    </div>
  </div>
  {#if entity.locked}
    <div class="lock-indicator" title="Locked">🔒</div>
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

  .entity-wrapper.locked {
    cursor: default;
  }

  .lock-indicator {
    position: absolute;
    top: 4px;
    right: 4px;
    font-size: 0.75rem;
    line-height: 1;
    background: rgba(30, 32, 48, 0.85);
    color: #fff;
    padding: 2px 4px;
    border-radius: 3px;
    pointer-events: none;
    z-index: 2;
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
</style>
