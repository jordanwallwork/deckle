// The drag state machine as a pure reducer:
//
//   step(dragState, event, ctx) → { dragState, mutations }
//
// A thin reactive shell (interaction.svelte.ts) binds it to the store and
// window pointer listeners; the reducer itself never touches the DOM or the
// store, so synthetic pointer sequences drive it in tests.
//
// Modes wired so far (ticket 01): moving a pile with a plain drag. Later
// tickets add top-card split, multi-pile drag, marquee, zone move/resize and
// pan as further modes of this same machine.

import type { Point } from './geometry';
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
      pileId: string;
      /** Pointer world position at grab. */
      grab: Point;
      /** Pile centre at grab; drag applies the pointer's world delta to it. */
      pileStart: Point;
      /** True once movement passed the threshold and the transaction began. */
      active: boolean;
    };

export type DragInputEvent =
  | { type: 'pile-down'; pileId: string; world: Point }
  | { type: 'move'; world: Point }
  | { type: 'up'; world: Point }
  | { type: 'cancel' };

/**
 * Store commands emitted by the reducer, applied in order by the shell.
 * `begin`/`commit`/`rollback` map onto the history transaction API;
 * everything between them is a transient frame.
 */
export type DragMutation =
  | { type: 'begin' }
  | { type: 'raise-pile'; pileId: string }
  | { type: 'move-pile'; pileId: string; x: number; y: number }
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
  if (!pile || pile.locked) return idle();
  return {
    drag: {
      mode: 'pile',
      pileId: event.pileId,
      grab: event.world,
      pileStart: { x: pile.x, y: pile.y },
      active: false
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
      const move: DragMutation = {
        type: 'move-pile',
        pileId: drag.pileId,
        x: drag.pileStart.x + dx,
        y: drag.pileStart.y + dy
      };
      if (!drag.active) {
        // First frame past the threshold: open the transaction and raise the
        // pile above its neighbours (inside the transaction, so a rollback
        // restores the render order too).
        return {
          drag: { ...drag, active: true },
          mutations: [{ type: 'begin' }, { type: 'raise-pile', pileId: drag.pileId }, move]
        };
      }
      return { drag, mutations: [move] };
    }
    case 'up': {
      if (drag.active) return idle([{ type: 'commit' }]);
      // Press-and-release without movement: a click. Select the pile.
      return idle([{ type: 'select', selection: { kind: 'piles', pileIds: [drag.pileId] } }]);
    }
    case 'cancel':
      return idle(drag.active ? [{ type: 'rollback' }] : []);
    case 'pile-down':
      // A second pointer-down mid-drag shouldn't happen; treat it as a cancel
      // of the current gesture to stay consistent.
      return idle(drag.active ? [{ type: 'rollback' }] : []);
  }
}
