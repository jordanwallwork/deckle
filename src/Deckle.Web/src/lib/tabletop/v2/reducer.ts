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
// drop resolver (merge onto a pile's footprint, otherwise place). Ticket 05
// adds the marquee (rubber-band selection on empty background) and the
// multi-pile drag (grabbing any pile of a multi-selection moves the whole
// selection). Ticket 06 adds zone moves (header tab only) and edit-mode
// corner resizes. Ticket 14 adds pan as a further mode of this same machine.
//
// Dragged piles always live on the root in world coordinates: activation
// detaches (or splits) them out of their zone at their world position, drag
// frames apply world deltas, and the drop resolver assigns the destination
// region — all inside one transaction, so cancel restores zone membership.

import type { Point, Rect } from './geometry';
import { pileIntersectsRect, pileWorldCenter, rectFromPoints, zoneWorldOrigin } from './geometry';
import { resolveDrop, type DropPlan } from './drop';
import { makeId } from './operations';
import { selectedPileIds } from './actions';
import { resizeRectFromCorner, type ResizeCorner } from './zones';
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
      /** Pile world centre at grab; drag applies the pointer's world delta to it. */
      pileStart: Point;
      /** True once movement passed the threshold and the transaction began. */
      active: boolean;
      /** Ctrl/Cmd held at grab: a click toggles the pile in the selection. */
      ctrl: boolean;
    }
  | {
      /**
       * Whole-selection drag: the grab landed on a pile that is part of a
       * multi-selection, so every (unlocked) selected pile moves together by
       * the same world delta. Grab kind is irrelevant — group moves are
       * always whole-pile moves.
       */
      mode: 'multi';
      /**
       * The piles moving together, in selection order. At press this is the
       * whole selection; activation narrows it to the unlocked survivors.
       */
      pileIds: string[];
      /** The pile the pointer went down on — click resolution targets it. */
      pressedPileId: string;
      /** Pointer world position at grab. */
      grab: Point;
      /** Each pile's world centre at grab, keyed by pile id. */
      starts: Record<string, Point>;
      /** True once movement passed the threshold and the transaction began. */
      active: boolean;
      /** Ctrl/Cmd held at grab: a click toggles the pile in the selection. */
      ctrl: boolean;
    }
  | {
      /**
       * Rubber-band selection: a plain drag that started on empty background.
       * Never opens a transaction — it only rewrites the (ephemeral)
       * selection, live on every frame.
       */
      mode: 'marquee';
      /** Fixed corner: the pointer world position at press. */
      start: Point;
      /** Moving corner: the latest pointer world position. */
      current: Point;
      /** Selection before the marquee began — restored on cancel. */
      prevSelection: Selection;
      /** True once movement passed the threshold. */
      active: boolean;
      /** Ctrl/Cmd held at press: a background click then keeps the selection. */
      ctrl: boolean;
      /**
       * Set when the press landed on a zone's body rather than the open
       * table: a click (no movement) then selects the zone instead of
       * deselecting — body drags still marquee.
       */
      zoneId?: string;
    }
  | {
      /**
       * Zone move: the grab landed on a zone's header tab — the only move
       * handle. Contained piles are zone-local, so they travel with it.
       */
      mode: 'zone-move';
      zoneId: string;
      /** Pointer world position at grab. */
      grab: Point;
      /** Zone world origin (top-left) at grab. */
      zoneStart: Point;
      /** True once movement passed the threshold and the transaction began. */
      active: boolean;
    }
  | {
      /**
       * Edit-mode corner resize. Emits transient resize frames only — the
       * open zone-edit session owns the transaction, so Done/Escape decide
       * what the whole session (resizes included) amounts to.
       */
      mode: 'zone-resize';
      zoneId: string;
      corner: ResizeCorner;
      /** Pointer world position at grab. */
      grab: Point;
      /** Zone rect (stored, parent-local frame) at grab — restored on cancel. */
      startRect: Rect;
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
  | {
      /**
       * Pointer-down on empty background — the open table or a zone's body
       * (`zoneId` set): starts a marquee; a mere click selects the zone (or
       * deselects on the open table).
       */
      type: 'background-down';
      world: Point;
      /** True when Ctrl/Cmd was held — a background click then keeps the selection. */
      ctrl?: boolean;
      /** The zone whose body was pressed, when not the open table. */
      zoneId?: string;
    }
  | {
      /** Pointer-down on a zone's header tab: starts a zone move. */
      type: 'zone-down';
      zoneId: string;
      world: Point;
    }
  | {
      /** Pointer-down on an edit-mode corner resize handle. */
      type: 'zone-resize-down';
      zoneId: string;
      corner: ResizeCorner;
      world: Point;
    }
  | { type: 'move'; world: Point }
  | {
      type: 'up';
      world: Point;
      /** True when the pointer was released over the component sidebar (the
       *  shell does the DOM hit-test): the dragged pile(s) are removed. */
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
  | { type: 'detach-pile'; pileId: string }
  | { type: 'split-top'; sourcePileId: string; newPileId: string }
  | { type: 'move-pile'; pileId: string; x: number; y: number }
  | { type: 'remove-pile'; pileId: string }
  | { type: 'move-zone'; zoneId: string; x: number; y: number }
  | { type: 'resize-zone'; zoneId: string; rect: Rect }
  | { type: 'remove-zone'; zoneId: string }
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
    case 'multi':
      return stepMulti(drag, event, ctx);
    case 'marquee':
      return stepMarquee(drag, event, ctx);
    case 'zone-move':
      return stepZoneMove(drag, event, ctx);
    case 'zone-resize':
      return stepZoneResize(drag, event);
  }
}

function stepIdle(event: DragInputEvent, ctx: ReducerContext): StepResult {
  // During a zone-edit session the table is inert: only the session's own
  // resize handles start gestures. Everything else waits for Done/Escape —
  // a stray drag must not open a second transaction inside the session's.
  if (ctx.state.editingZoneId !== null) {
    if (event.type !== 'zone-resize-down' || event.zoneId !== ctx.state.editingZoneId) {
      return idle();
    }
    const zone = ctx.state.zones[event.zoneId];
    if (!zone) return idle();
    return {
      drag: {
        mode: 'zone-resize',
        zoneId: event.zoneId,
        corner: event.corner,
        grab: event.world,
        startRect: { x: zone.x, y: zone.y, width: zone.width, height: zone.height }
      },
      mutations: []
    };
  }

  if (event.type === 'background-down') {
    return {
      drag: {
        mode: 'marquee',
        start: event.world,
        current: event.world,
        prevSelection: copySelection(ctx.state.selection),
        active: false,
        ctrl: event.ctrl === true,
        zoneId: event.zoneId
      },
      mutations: []
    };
  }
  if (event.type === 'zone-down') {
    const zone = ctx.state.zones[event.zoneId];
    if (!zone) return idle();
    // Locked zones enter the press state too — clicking the header still
    // selects — but the move handler never lets them activate a drag.
    return {
      drag: {
        mode: 'zone-move',
        zoneId: event.zoneId,
        grab: event.world,
        zoneStart: zoneWorldOrigin(ctx.state, zone),
        active: false
      },
      mutations: []
    };
  }
  if (event.type !== 'pile-down') return idle();
  const pile = ctx.state.piles[event.pileId];
  if (!pile) return idle();

  // A grab on a pile that is part of a multi-selection drags the whole
  // selection together; grab kind doesn't matter for group moves.
  const selected = selectedPileIds(ctx.state).filter((id) => ctx.state.piles[id] !== undefined);
  if (selected.length > 1 && selected.includes(event.pileId)) {
    const starts: Record<string, Point> = {};
    for (const id of selected) {
      starts[id] = pileWorldCenter(ctx.state, ctx.state.piles[id]);
    }
    return {
      drag: {
        mode: 'multi',
        pileIds: selected,
        pressedPileId: event.pileId,
        grab: event.world,
        starts,
        active: false,
        ctrl: event.ctrl === true
      },
      mutations: []
    };
  }

  // Locked piles enter the press state too — they must stay clickable to
  // select/unlock — but the move handler never lets them activate a drag.
  return {
    drag: {
      mode: 'pile',
      pileId: event.pileId,
      grabKind: event.viaBadge || event.alt ? 'whole' : 'top-card',
      grab: event.world,
      pileStart: pileWorldCenter(ctx.state, pile),
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
        return idle([{ type: 'select', selection: clickSelection(drag.pileId, drag.ctrl, ctx) }]);
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
    case 'background-down':
    case 'zone-down':
    case 'zone-resize-down':
      // A second pointer-down mid-drag shouldn't happen; treat it as a cancel
      // of the current gesture to stay consistent.
      return idle(drag.active ? [{ type: 'rollback' }] : []);
  }
}

function stepMulti(
  drag: Extract<DragState, { mode: 'multi' }>,
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
        // Same rule as a single pile: a locked grab point refuses the drag
        // (but stays pressed, so releasing still counts as a click).
        if (ctx.state.piles[drag.pressedPileId]?.locked) return { drag, mutations: [] };
        return activateMulti(drag, dx, dy, ctx);
      }
      return {
        drag,
        mutations: drag.pileIds.map((id) => ({
          type: 'move-pile',
          pileId: id,
          x: drag.starts[id].x + dx,
          y: drag.starts[id].y + dy
        }))
      };
    }
    case 'up': {
      if (!drag.active) {
        // A click on a selected pile: plain collapses the selection to it;
        // Ctrl/Cmd toggles it out — same resolution as single-pile mode.
        return idle([
          { type: 'select', selection: clickSelection(drag.pressedPileId, drag.ctrl, ctx) }
        ]);
      }
      if (event.overSidebar) {
        // Releasing the group over the sidebar removes every dragged pile —
        // inside the still-open transaction, so it stays one undo step.
        return idle([
          ...drag.pileIds.map((id): DragMutation => ({ type: 'remove-pile', pileId: id })),
          { type: 'commit' }
        ]);
      }
      // The shared resolver places every pile in the target: mergeable piles
      // merge into whatever sits under the pointer; the rest stay where they
      // visually sit. One commit — the whole group move is one undo step.
      const plan = resolveDrop(
        ctx.state,
        ctx.templates,
        { kind: 'piles', pileIds: drag.pileIds },
        event.world
      );
      return idle([{ type: 'drop', plan }, { type: 'commit' }]);
    }
    case 'cancel':
    case 'pile-down':
    case 'background-down':
    case 'zone-down':
    case 'zone-resize-down':
      return idle(drag.active ? [{ type: 'rollback' }] : []);
  }
}

/**
 * First frame past the threshold for a group grab: open the transaction and
 * start every unlocked selected pile moving. Locked piles stay put and drop
 * out of the gesture entirely (they don't move, don't merge, aren't removed
 * over the sidebar); detaching happens in selection order so relative depth
 * within the group is stable, and lifts every pile onto the root in world
 * coordinates so the group moves in one frame no matter which zones its
 * members came from.
 */
function activateMulti(
  drag: Extract<DragState, { mode: 'multi' }>,
  dx: number,
  dy: number,
  ctx: ReducerContext
): StepResult {
  const moving = drag.pileIds.filter((id) => {
    const pile = ctx.state.piles[id];
    return pile !== undefined && !pile.locked;
  });
  const mutations: DragMutation[] = [{ type: 'begin' }];
  for (const id of moving) mutations.push({ type: 'detach-pile', pileId: id });
  for (const id of moving) {
    mutations.push({
      type: 'move-pile',
      pileId: id,
      x: drag.starts[id].x + dx,
      y: drag.starts[id].y + dy
    });
  }
  return { drag: { ...drag, pileIds: moving, active: true }, mutations };
}

function stepMarquee(
  drag: Extract<DragState, { mode: 'marquee' }>,
  event: DragInputEvent,
  ctx: ReducerContext
): StepResult {
  switch (event.type) {
    case 'move': {
      const next = { ...drag, current: event.world };
      if (!drag.active) {
        const dx = event.world.x - drag.start.x;
        const dy = event.world.y - drag.start.y;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return { drag: next, mutations: [] };
        next.active = true;
      }
      // Live rubber-band: the selection tracks the rectangle on every frame.
      return { drag: next, mutations: [{ type: 'select', selection: marqueeSelection(next, ctx) }] };
    }
    case 'up': {
      if (!drag.active) {
        // A background click: on a zone's body it selects the zone; on the
        // open table, plain deselects. Ctrl/Cmd is reserved for building
        // selections, so it leaves the selection alone.
        if (drag.ctrl) return idle();
        const selection: Selection =
          drag.zoneId !== undefined && ctx.state.zones[drag.zoneId]
            ? { kind: 'zone', zoneId: drag.zoneId }
            : { kind: 'none' };
        return idle([{ type: 'select', selection }]);
      }
      return idle([
        { type: 'select', selection: marqueeSelection({ ...drag, current: event.world }, ctx) }
      ]);
    }
    case 'cancel':
    case 'pile-down':
    case 'background-down':
    case 'zone-down':
    case 'zone-resize-down':
      // Aborting mid-marquee restores whatever was selected before it began.
      return idle(drag.active ? [{ type: 'select', selection: drag.prevSelection }] : []);
  }
}

function stepZoneMove(
  drag: Extract<DragState, { mode: 'zone-move' }>,
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
        // A locked zone refuses the move but stays pressed, so releasing
        // still counts as a click-select (it must remain unlockable).
        if (ctx.state.zones[drag.zoneId]?.locked !== false) return { drag, mutations: [] };
        return {
          drag: { ...drag, active: true },
          mutations: [
            { type: 'begin' },
            { type: 'move-zone', zoneId: drag.zoneId, x: drag.zoneStart.x + dx, y: drag.zoneStart.y + dy }
          ]
        };
      }
      return {
        drag,
        mutations: [
          { type: 'move-zone', zoneId: drag.zoneId, x: drag.zoneStart.x + dx, y: drag.zoneStart.y + dy }
        ]
      };
    }
    case 'up': {
      if (!drag.active) {
        // Press-and-release on the header without movement: select the zone.
        return idle([{ type: 'select', selection: { kind: 'zone', zoneId: drag.zoneId } }]);
      }
      if (event.overSidebar) {
        // Dragging a zone onto the sidebar deletes it (with contents) —
        // inside the still-open transaction, so it stays one undo step.
        return idle([{ type: 'remove-zone', zoneId: drag.zoneId }, { type: 'commit' }]);
      }
      // The move frames already placed the zone; nesting resolution arrives
      // with ticket 11.
      return idle([{ type: 'commit' }]);
    }
    case 'cancel':
    case 'pile-down':
    case 'background-down':
    case 'zone-down':
    case 'zone-resize-down':
      return idle(drag.active ? [{ type: 'rollback' }] : []);
  }
}

function stepZoneResize(
  drag: Extract<DragState, { mode: 'zone-resize' }>,
  event: DragInputEvent
): StepResult {
  switch (event.type) {
    case 'move': {
      const dx = event.world.x - drag.grab.x;
      const dy = event.world.y - drag.grab.y;
      return {
        drag,
        mutations: [
          {
            type: 'resize-zone',
            zoneId: drag.zoneId,
            rect: resizeRectFromCorner(drag.startRect, drag.corner, dx, dy)
          }
        ]
      };
    }
    case 'up':
      // The session transaction stays open — Done/Escape end it.
      return idle();
    case 'cancel':
    case 'pile-down':
    case 'background-down':
    case 'zone-down':
    case 'zone-resize-down':
      // Abort just this handle drag: restore the rect, keep the session.
      return idle([{ type: 'resize-zone', zoneId: drag.zoneId, rect: drag.startRect }]);
  }
}

/**
 * The selection a marquee rectangle resolves to: every unlocked pile
 * intersecting it — zone piles included, tested in world space — in render
 * order (zones bottom-up, then root piles). Rotation-aware — each card is
 * tested as its true rotated rectangle, so a fanned or sideways card is
 * caught by the area it actually covers.
 */
function marqueeSelection(
  drag: Extract<DragState, { mode: 'marquee' }>,
  ctx: ReducerContext
): Selection {
  const rect = rectFromPoints(drag.start, drag.current);
  const candidates = [
    ...ctx.state.zoneOrder.flatMap((zoneId) => ctx.state.zones[zoneId]?.pileIds ?? []),
    ...ctx.state.rootPileIds
  ];
  const pileIds = candidates.filter((id) => {
    const pile = ctx.state.piles[id];
    return (
      pile !== undefined && !pile.locked && pileIntersectsRect(ctx.state, ctx.templates, pile, rect)
    );
  });
  return pileIds.length === 0 ? { kind: 'none' } : { kind: 'piles', pileIds };
}

/**
 * The selection a click resolves to: Ctrl/Cmd toggles the pile in the
 * current multi-selection; a plain click collapses the selection to it.
 */
function clickSelection(pileId: string, ctrl: boolean, ctx: ReducerContext): Selection {
  if (!ctrl) return { kind: 'piles', pileIds: [pileId] };
  const current = selectedPileIds(ctx.state);
  const next = current.includes(pileId)
    ? current.filter((id) => id !== pileId)
    : [...current, pileId];
  return next.length === 0 ? { kind: 'none' } : { kind: 'piles', pileIds: next };
}

/** A detached plain copy of a selection, safe to hold across frames. */
function copySelection(selection: Selection): Selection {
  return selection.kind === 'piles'
    ? { kind: 'piles', pileIds: [...selection.pileIds] }
    : { ...selection };
}

/**
 * First frame past the threshold: open the transaction and start the grab
 * proper. A 'top-card' grab on a multi-card pile splits the top card off
 * right here — the split pile (spawned at the source's world centre, on top
 * of the root render order) becomes the dragged pile. Whole grabs and piles
 * of one detach onto the root at their world position instead (a plain raise
 * for piles already there), so every dragged pile moves in world space and
 * the drop assigns its zone. Everything happens inside the transaction, so a
 * rollback restores the split, zone membership and render order too.
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
    mutations.push({ type: 'detach-pile', pileId });
  }
  mutations.push({
    type: 'move-pile',
    pileId,
    x: drag.pileStart.x + dx,
    y: drag.pileStart.y + dy
  });

  return { drag: { ...drag, pileId, active: true }, mutations };
}
