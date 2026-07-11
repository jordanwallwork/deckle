// Thin reactive shell binding the pure drag reducer to the store. Components
// forward pointer events (already converted to world coordinates); this
// module dispatches them through `step` and applies the emitted mutations.

import { applyDropPlan } from './drop';
import type { Point } from './geometry';
import type { DragMutation, DragState } from './reducer';
import { step, type DragInputEvent } from './reducer';
import * as ops from './operations';
import type { TabletopStore } from './store.svelte';

export function createInteraction(store: TabletopStore) {
  let drag = $state.raw<DragState>({ mode: 'idle' });

  const isDragging = $derived(drag.mode !== 'idle');
  /** The pile currently being dragged (for overlay/elevated rendering). */
  const draggingPileId = $derived(drag.mode === 'pile' && drag.active ? drag.pileId : null);

  function applyMutation(mutation: DragMutation): void {
    switch (mutation.type) {
      case 'begin':
        store.beginTransaction();
        break;
      case 'raise-pile':
        store.updateTransient((s) => ops.raisePile(s, mutation.pileId));
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
    }
  }

  function dispatch(event: DragInputEvent): void {
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
    get draggingPileId() {
      return draggingPileId;
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
    move(world: Point): void {
      dispatch({ type: 'move', world });
    },
    up(world: Point, overSidebar = false): void {
      dispatch({ type: 'up', world, overSidebar });
    },
    cancel(): void {
      dispatch({ type: 'cancel' });
    }
  };
}

export type TabletopInteraction = ReturnType<typeof createInteraction>;
