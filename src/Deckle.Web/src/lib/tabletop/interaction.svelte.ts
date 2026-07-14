// Thin reactive shell binding the pure drag reducer to the store. Components
// forward pointer events (already converted to world coordinates); this
// module dispatches them through `step` and applies the emitted mutations.

import {
  applyDropPlan,
  dropTargetZoneAt,
  spreadInsertHint,
  type DropPayload,
  type SpreadInsertHint
} from './drop';
import type { Point, Rect } from './geometry';
import { rectFromPoints } from './geometry';
import { step, type DragInputEvent, type DragMutation, type DragState } from './reducer';
import * as ops from './operations';
import {
  detachPileFromZone,
  moveZoneTo,
  removeZone,
  reparentZone,
  setZoneRect,
  type ResizeCorner
} from './zones';
import type { TabletopStore } from './store.svelte';
import type { TabletopViewport } from './viewport.svelte';

export function createInteraction(store: TabletopStore, viewport?: TabletopViewport) {
  let drag = $state.raw<DragState>({ mode: 'idle' });
  /** Latest pointer world position while a gesture is in flight. */
  let pointer = $state.raw<Point | null>(null);

  const isDragging = $derived(drag.mode !== 'idle');
  /** The piles currently being dragged (for overlay/elevated rendering). */
  const draggingPileIds = $derived.by((): string[] => {
    if (drag.mode === 'pile' && drag.active) return [drag.pileId];
    if (drag.mode === 'multi' && drag.active) return drag.pileIds;
    return [];
  });
  /** The zone currently being moved by its header, or null. */
  const draggingZoneId = $derived(drag.mode === 'zone-move' && drag.active ? drag.zoneId : null);
  /** The live marquee rectangle in world coordinates, or null. */
  const marqueeRect = $derived.by((): Rect | null =>
    drag.mode === 'marquee' && drag.active ? rectFromPoints(drag.start, drag.current) : null
  );
  /** The active drag as a drop payload, once it would actually drop. */
  const dropPayload = $derived.by((): DropPayload | null => {
    if (drag.mode === 'pile' && drag.active) return { kind: 'pile', pileId: drag.pileId };
    if (drag.mode === 'multi' && drag.active) return { kind: 'piles', pileIds: drag.pileIds };
    return null;
  });
  /** Transient render hint: the spread slot the drag would insert at. */
  const insertHint = $derived.by((): SpreadInsertHint | null =>
    dropPayload && pointer
      ? spreadInsertHint(store.state, store.templates, dropPayload, pointer)
      : null
  );
  /** The zone the drag currently hovers as its drop region, or null. */
  const dropZoneId = $derived.by((): string | null =>
    dropPayload && pointer ? dropTargetZoneAt(store.state, pointer) : null
  );

  function applyMutation(mutation: DragMutation): void {
    switch (mutation.type) {
      case 'begin':
        store.beginTransaction();
        break;
      case 'raise-pile':
        store.updateTransient((s) => ops.raisePile(s, mutation.pileId));
        break;
      case 'detach-pile':
        store.updateTransient((s) => detachPileFromZone(s, store.templates, mutation.pileId));
        break;
      case 'split-top':
        store.updateTransient((s) => ops.splitTopCard(s, mutation.sourcePileId, mutation.newPileId));
        break;
      case 'move-pile':
        store.updateTransient((s) => ops.movePileTo(s, mutation.pileId, mutation.x, mutation.y));
        break;
      case 'remove-pile':
        store.updateTransient((s) => ops.removePile(s, mutation.pileId));
        break;
      case 'move-zone':
        store.updateTransient((s) => moveZoneTo(s, mutation.zoneId, mutation.x, mutation.y));
        break;
      case 'nest-zone':
        store.updateTransient((s) => reparentZone(s, mutation.zoneId, mutation.parentZoneId));
        break;
      case 'resize-zone':
        store.updateTransient((s) => setZoneRect(s, mutation.zoneId, mutation.rect));
        break;
      case 'remove-zone':
        store.updateTransient((s) => removeZone(s, mutation.zoneId));
        break;
      case 'drop':
        store.updateTransient((s) => applyDropPlan(s, store.templates, mutation.plan));
        break;
      case 'commit':
        store.commitTransaction();
        break;
      case 'rollback':
        store.rollbackTransaction();
        break;
      case 'select':
        store.setSelection(mutation.selection);
        break;
      case 'pan':
        // Pan moves the viewport, not the table — no store mutation, no history.
        viewport?.panBy(mutation.dx, mutation.dy);
        break;
    }
  }

  function dispatch(event: DragInputEvent): void {
    pointer = 'world' in event ? event.world : null;
    const result = step(drag, event, { state: store.state, templates: store.templates });
    drag = result.drag;
    for (const mutation of result.mutations) applyMutation(mutation);
  }

  return {
    get drag() {
      return drag;
    },
    get isDragging() {
      return isDragging;
    },
    get draggingPileIds() {
      return draggingPileIds;
    },
    get draggingZoneId() {
      return draggingZoneId;
    },
    get marqueeRect() {
      return marqueeRect;
    },
    get insertHint() {
      return insertHint;
    },
    get dropZoneId() {
      return dropZoneId;
    },

    pileDown(
      pileId: string,
      world: Point,
      opts: { viaBadge?: boolean; alt?: boolean; ctrl?: boolean } = {}
    ): void {
      dispatch({
        type: 'pile-down',
        pileId,
        world,
        viaBadge: opts.viaBadge,
        alt: opts.alt,
        ctrl: opts.ctrl
      });
    },
    backgroundDown(world: Point, opts: { ctrl?: boolean; zoneId?: string } = {}): void {
      dispatch({ type: 'background-down', world, ctrl: opts.ctrl, zoneId: opts.zoneId });
    },
    zoneDown(zoneId: string, world: Point): void {
      dispatch({ type: 'zone-down', zoneId, world });
    },
    zoneResizeDown(zoneId: string, corner: ResizeCorner, world: Point): void {
      dispatch({ type: 'zone-resize-down', zoneId, corner, world });
    },
    /** Middle-button press: start a viewport pan (screen = canvas-relative). */
    panDown(screen: Point): void {
      dispatch({ type: 'pan-down', screen });
    },
    move(world: Point, screen?: Point): void {
      dispatch({ type: 'move', world, screen });
    },
    up(world: Point, overSidebar = false, screen?: Point): void {
      dispatch({ type: 'up', world, overSidebar, screen });
    },
    cancel(): void {
      dispatch({ type: 'cancel' });
    }
  };
}

export type TabletopInteraction = ReturnType<typeof createInteraction>;
