// The drag state machine as a pure reducer:
//
//   step(dragState, event, ctx) → { dragState, mutations }
//
// A thin reactive shell (interaction.svelte.ts) binds it to the store and
// window pointer listeners; the reducer itself never touches the DOM or the
// store, so synthetic pointer sequences drive it in tests.
//
// Modes wired so far: pile drags with the two grab gestures (ticket 03) —
// a plain drag splits the top card off a multi-card pile at drag start; a
// badge or Alt grab moves the whole pile; drops resolve through the shared
// drop resolver (merge onto a pile's footprint, otherwise place). Later
// tickets add multi-pile drag, marquee, zone move/resize and pan as further
// modes of this same machine.

import type { Point } from './geometry';
import { resolveDrop, type DropPlan } from './drop';
import { makeId } from './operations';
import { selectedPileIds } from './actions';
import type { Selection, TabletopState, Templates } from './types';

/**
 * Pointer movement (world px) below which a press-and-release still counts
 * as a click: no transaction is begun, so clicks never pollute history.
 */
export const DRAG_THRESHOLD = 3;

export type DragState =
  | { mode: 'idle' }
  | {
      mode: 'pile';
      /**
       * The pile being dragged. Before activation this is the pile under the
       * pointer; a 'top-card' grab on a multi-card pile swaps it for the
       * freshly split single-card pile at activation.
       */
      pileId: string;
      /**
       * 'top-card': plain grab — splits the top card off a multi-card pile
       * at activation (degenerates to a whole move for piles of one).
       * 'whole': badge or Alt grab — always moves the entire pile.
       */
      grabKind: 'top-card' | 'whole';
      /** Pointer world position at grab. */
      grab: Point;
      /** Pile centre at grab; drag applies the pointer's world delta to it. */
      pileStart: Point;
      /** True once movement passed the threshold and the transaction began. */
      active: boolean;
      /** Ctrl/Cmd held at grab: a click toggles the pile in the selection. */
      ctrl: boolean;
    };

export type DragInputEvent =
  | {
      type: 'pile-down';
      pileId: string;
      world: Point;
      /** True when the grab started on the pile's count badge. */
      viaBadge?: boolean;
      /** True when Alt was held — same meaning as a badge grab. */
      alt?: boolean;
      /** True when Ctrl/Cmd was held — a click toggles multi-selection. */
      ctrl?: boolean;
    }
  | { type: 'move'; world: Point }
  | {
      type: 'up';
      world: Point;
      /** True when the pointer was released over the component sidebar (the
       *  shell does the DOM hit-test): the dragged pile is removed. */
      overSidebar?: boolean;
    }
  | { type: 'cancel' };

/**
 * Store commands emitted by the reducer, applied in order by the shell.
 * `begin`/`commit`/`rollback` map onto the history transaction API;
 * everything between them is a transient frame.
 */
export type DragMutation =
  | { type: 'begin' }
  | { type: 'raise-pile'; pileId: string }
  | { type: 'split-top'; sourcePileId: string; newPileId: string }
  | { type: 'move-pile'; pileId: string; x: number; y: number }
  | { type: 'remove-pile'; pileId: string }
  | { type: 'drop'; plan: DropPlan }
  | { type: 'commit' }
  | { type: 'rollback' }
  | { type: 'select'; selection: Selection };

export interface ReducerContext {
  state: TabletopState;
  templates: Templates;
}

export interface StepResult {
  drag: DragState;
  mutations: DragMutation[];
}

const IDLE: DragState = { mode: 'idle' };

function idle(mutations: DragMutation[] = []): StepResult {
  return { drag: IDLE, mutations };
}

export function step(drag: DragState, event: DragInputEvent, ctx: ReducerContext): StepResult {
  switch (drag.mode) {
    case 'idle':
      return stepIdle(event, ctx);
    case 'pile':
      return stepPile(drag, event, ctx);
  }
}

function stepIdle(event: DragInputEvent, ctx: ReducerContext): StepResult {
  if (event.type !== 'pile-down') return idle();
  const pile = ctx.state.piles[event.pileId];
  if (!pile) return idle();
  // Locked piles enter the press state too — they must stay clickable to
  // select/unlock — but the move handler never lets them activate a drag.
  return {
    drag: {
      mode: 'pile',
      pileId: event.pileId,
      grabKind: event.viaBadge || event.alt ? 'whole' : 'top-card',
      grab: event.world,
      pileStart: { x: pile.x, y: pile.y },
      active: false,
      ctrl: event.ctrl === true
    },
    mutations: []
  };
}

function stepPile(
  drag: Extract<DragState, { mode: 'pile' }>,
  event: DragInputEvent,
  ctx: ReducerContext
): StepResult {
  switch (event.type) {
    case 'move': {
      const dx = event.world.x - drag.grab.x;
      const dy = event.world.y - drag.grab.y;
      if (!drag.active && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
        return { drag, mutations: [] };
      }
      if (!drag.active) {
        // A locked pile refuses the drag (and the split) but stays pressed,
        // so releasing still counts as a click-select.
        if (ctx.state.piles[drag.pileId]?.locked) return { drag, mutations: [] };
        return activate(drag, dx, dy, ctx);
      }
      return {
        drag,
        mutations: [
          { type: 'move-pile', pileId: drag.pileId, x: drag.pileStart.x + dx, y: drag.pileStart.y + dy }
        ]
      };
    }
    case 'up': {
      if (!drag.active) {
        // Press-and-release without movement: a click. Plain click selects
        // just this pile; Ctrl/Cmd+click toggles it in the multi-selection.
        return idle([{ type: 'select', selection: clickSelection(drag, ctx) }]);
      }
      if (event.overSidebar) {
        // Dropping onto the sidebar removes the pile — inside the still-open
        // transaction, so the whole gesture is a single undo step.
        return idle([{ type: 'remove-pile', pileId: drag.pileId }, { type: 'commit' }]);
      }
      // Everything else goes through the shared drop resolver: merge onto the
      // pile under the pointer, or stay where the pile visually sits.
      const plan = resolveDrop(
        ctx.state,
        ctx.templates,
        { kind: 'pile', pileId: drag.pileId },
        event.world
      );
      return idle([{ type: 'drop', plan }, { type: 'commit' }]);
    }
    case 'cancel':
      return idle(drag.active ? [{ type: 'rollback' }] : []);
    case 'pile-down':
      // A second pointer-down mid-drag shouldn't happen; treat it as a cancel
      // of the current gesture to stay consistent.
      return idle(drag.active ? [{ type: 'rollback' }] : []);
  }
}

/**
 * The selection a click resolves to: Ctrl/Cmd toggles the pile in the
 * current multi-selection; a plain click collapses the selection to it.
 */
function clickSelection(
  drag: Extract<DragState, { mode: 'pile' }>,
  ctx: ReducerContext
): Selection {
  if (!drag.ctrl) return { kind: 'piles', pileIds: [drag.pileId] };
  const current = selectedPileIds(ctx.state);
  const next = current.includes(drag.pileId)
    ? current.filter((id) => id !== drag.pileId)
    : [...current, drag.pileId];
  return next.length === 0 ? { kind: 'none' } : { kind: 'piles', pileIds: next };
}

/**
 * First frame past the threshold: open the transaction and start the grab
 * proper. A 'top-card' grab on a multi-card pile splits the top card off
 * right here — the split pile (spawned at the source centre, on top of the
 * root render order) becomes the dragged pile. Whole grabs and piles of one
 * just get raised above their neighbours. Everything happens inside the
 * transaction, so a rollback restores the split and the render order too.
 */
function activate(
  drag: Extract<DragState, { mode: 'pile' }>,
  dx: number,
  dy: number,
  ctx: ReducerContext
): StepResult {
  const source = ctx.state.piles[drag.pileId];
  const splits = drag.grabKind === 'top-card' && source !== undefined && source.cardIds.length > 1;
  const pileId = splits ? makeId('pile') : drag.pileId;

  const mutations: DragMutation[] = [{ type: 'begin' }];
  if (splits) {
    mutations.push({ type: 'split-top', sourcePileId: drag.pileId, newPileId: pileId });
  } else {
    mutations.push({ type: 'raise-pile', pileId });
  }
  mutations.push({
    type: 'move-pile',
    pileId,
    x: drag.pileStart.x + dx,
    y: drag.pileStart.y + dy
  });

  return { drag: { ...drag, pileId, active: true }, mutations };
}
