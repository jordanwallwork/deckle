import { describe, it, expect } from 'vitest';
import {
  MIN_ZONE_SIZE,
  createFreeformZone,
  findZoneAt,
  moveZoneTo,
  removeZone,
  renameZone,
  resizeRectFromCorner,
  setZoneLocked,
  setZoneRect,
  zoneActions,
  zoneBehavior
} from './zones';
import {
  pileWorldCenter,
  worldToZoneLocal,
  zoneLocalToWorld,
  zoneWorldOrigin,
  zoneWorldRect
} from './geometry';
import { movePileToZone, moveTargetZones } from './drop';
import * as hist from './history';
import { emptyTabletopState } from './initialization';
import { normalize } from './normalize';
import type { TabletopState } from './types';
import { cardTemplate, makeTemplates, singleCardPile, stateWithPiles, withZone } from './fixtures';

const templates = makeTemplates(cardTemplate());

describe('zone lifecycle', () => {
  it('a created freeform zone is registered, rendered last, and persists when empty', () => {
    const state = emptyTabletopState();

    const id = createFreeformZone(state, 100, 50);
    normalize(state, templates, { dev: true });

    expect(state.zones[id]).toMatchObject({
      type: 'freeform',
      x: 100,
      y: 50,
      width: 300,
      height: 200,
      pileIds: [],
      locked: false
    });
    expect(state.zoneOrder).toEqual([id]);
    // Empty zones never auto-delete — normalize leaves them alone.
    expect(state.zones[id]).toBeDefined();
  });

  it('rename and lock update the zone in place', () => {
    const state = emptyTabletopState();
    const id = createFreeformZone(state, 0, 0);

    renameZone(state, id, 'Discard Row');
    setZoneLocked(state, id, true);

    expect(state.zones[id]).toMatchObject({ name: 'Discard Row', locked: true });
  });

  it('moving a zone carries its contained piles along (world positions track the zone)', () => {
    const state = withZone(
      stateWithPiles(singleCardPile('p1', 'c1', 150, 150)),
      { id: 'z1', x: 100, y: 100 },
      ['p1']
    );
    expect(pileWorldCenter(state, state.piles.p1)).toEqual({ x: 150, y: 150 });

    moveZoneTo(state, 'z1', 300, 250);
    normalize(state, templates, { dev: true });

    // The pile's zone-local position is untouched; its world position moved
    // exactly with the zone.
    expect(state.piles.p1).toMatchObject({ x: 50, y: 50, zoneId: 'z1' });
    expect(pileWorldCenter(state, state.piles.p1)).toEqual({ x: 350, y: 300 });
  });

  it('deleting a zone removes it with its contents (piles and their cards)', () => {
    const state = withZone(
      stateWithPiles(singleCardPile('p1', 'c1', 50, 50), singleCardPile('p2', 'c2', 600, 600)),
      { id: 'z1', x: 0, y: 0 },
      ['p1']
    );

    removeZone(state, 'z1');
    normalize(state, templates, { dev: true });

    expect(state.zones.z1).toBeUndefined();
    expect(state.zoneOrder).toEqual([]);
    expect(state.piles.p1).toBeUndefined();
    expect(state.cards.c1).toBeUndefined();
    // The rest of the table is untouched.
    expect(state.piles.p2).toBeDefined();
    expect(state.rootPileIds).toEqual(['p2']);
  });

  it('setZoneRect clamps below the minimum size', () => {
    const state = emptyTabletopState();
    const id = createFreeformZone(state, 0, 0);

    setZoneRect(state, id, { x: 10, y: 10, width: 5, height: 5000 });

    expect(state.zones[id]).toMatchObject({
      x: 10,
      y: 10,
      width: MIN_ZONE_SIZE,
      height: 5000
    });
  });
});

describe('resizeRectFromCorner — edit-mode corner handles', () => {
  const start = { x: 100, y: 100, width: 200, height: 150 };

  it('dragging the se corner grows from a fixed top-left', () => {
    expect(resizeRectFromCorner(start, 'se', 40, 30)).toEqual({
      x: 100,
      y: 100,
      width: 240,
      height: 180
    });
  });

  it('dragging the nw corner moves the origin and shrinks, keeping the bottom-right fixed', () => {
    expect(resizeRectFromCorner(start, 'nw', 40, 30)).toEqual({
      x: 140,
      y: 130,
      width: 160,
      height: 120
    });
  });

  it('shrinking below the minimum pins the dragged edge, never sliding past the opposite one', () => {
    // Drag the nw corner far past the se corner.
    expect(resizeRectFromCorner(start, 'nw', 500, 500)).toEqual({
      x: 100 + 200 - MIN_ZONE_SIZE,
      y: 100 + 150 - MIN_ZONE_SIZE,
      width: MIN_ZONE_SIZE,
      height: MIN_ZONE_SIZE
    });
    // Drag the se corner far past the nw corner: origin stays put.
    expect(resizeRectFromCorner(start, 'se', -500, -500)).toEqual({
      x: 100,
      y: 100,
      width: MIN_ZONE_SIZE,
      height: MIN_ZONE_SIZE
    });
  });

  it('mixed-axis drags resize each axis independently (ne corner)', () => {
    expect(resizeRectFromCorner(start, 'ne', 50, -20)).toEqual({
      x: 100,
      y: 80,
      width: 250,
      height: 170
    });
  });
});

describe('local/world conversion', () => {
  it('round-trips points through a zone frame', () => {
    const state = emptyTabletopState();
    const id = createFreeformZone(state, 200, 300);
    const zone = state.zones[id];

    expect(worldToZoneLocal(state, zone, { x: 250, y: 340 })).toEqual({ x: 50, y: 40 });
    expect(zoneLocalToWorld(state, zone, { x: 50, y: 40 })).toEqual({ x: 250, y: 340 });
  });

  it('walks the parent chain for nested zones', () => {
    const state = emptyTabletopState();
    withZone(state, { id: 'parent', x: 100, y: 100 });
    withZone(state, { id: 'child', x: 30, y: 40, parentZoneId: 'parent' });
    (state.zones.parent as { childZoneIds?: string[] }).childZoneIds = ['child'];

    expect(zoneWorldOrigin(state, state.zones.child)).toEqual({ x: 130, y: 140 });
    expect(zoneWorldRect(state, state.zones.child)).toMatchObject({ x: 130, y: 140 });
  });
});

describe('findZoneAt', () => {
  it('finds the topmost zone under a point; open table resolves to null', () => {
    const state = emptyTabletopState();
    withZone(state, { id: 'below', x: 0, y: 0, width: 400, height: 300 });
    withZone(state, { id: 'above', x: 200, y: 0, width: 400, height: 300 });

    expect(findZoneAt(state, { x: 300, y: 100 })?.id).toBe('above'); // overlap → later wins
    expect(findZoneAt(state, { x: 50, y: 100 })?.id).toBe('below');
    expect(findZoneAt(state, { x: 1000, y: 1000 })).toBeNull();
    expect(findZoneAt(state, { x: 300, y: 100 }, 'above')?.id).toBe('below');
  });
});

describe('zone behaviour table', () => {
  it('freeform planDrop places at-point; the root region shares it', () => {
    const state = emptyTabletopState();
    const id = createFreeformZone(state, 0, 0);
    const ctx = { state, templates };

    expect(zoneBehavior(state.zones[id]).planDrop(ctx, state.zones[id], { x: 70, y: 90 })).toEqual({
      zoneId: id,
      x: 70,
      y: 90
    });
    expect(zoneBehavior(null).planDrop(ctx, null, { x: 70, y: 90 })).toEqual({
      zoneId: null,
      x: 70,
      y: 90
    });
    expect(zoneBehavior(null).ordered).toBe(false);
  });
});

describe('zone edit session — one transaction from start to Done/Escape', () => {
  /** Mirror the store's session wiring against the pure history module. */
  function beginSession(state: TabletopState) {
    return hist.begin(structuredClone(state));
  }

  it('create → rename → resize → Done lands as exactly one undo step', () => {
    let state = stateWithPiles(singleCardPile('p1', 'c1', 500, 500));
    const before = structuredClone(state);
    let history = hist.createHistory<TabletopState>();

    // Session: the transaction opens before the zone exists.
    const tx = beginSession(state);
    const id = createFreeformZone(state, 100, 100);
    state.editingZoneId = id;
    renameZone(state, id, 'Hand');
    setZoneRect(state, id, { x: 100, y: 100, width: 500, height: 180 });
    state.editingZoneId = null;
    normalize(state, templates, { dev: true });
    history = hist.commitTransaction(history, tx);

    expect(state.zones[id]).toMatchObject({ name: 'Hand', width: 500, height: 180 });
    expect(history.past).toHaveLength(1);

    // One undo removes the zone entirely — creation and edits were one step.
    const undone = hist.undo(history, structuredClone(state))!;
    expect(undone.state).toEqual(before);
  });

  it('the same session ended with Escape leaves the table exactly as before editing', () => {
    let state = emptyTabletopState();
    const id = createFreeformZone(state, 100, 100);
    normalize(state, templates, { dev: true });
    const before = structuredClone(state);

    const tx = beginSession(state);
    state.editingZoneId = id;
    renameZone(state, id, 'Oops');
    setZoneRect(state, id, { x: 50, y: 50, width: 999, height: 999 });
    state = hist.rollbackTransaction(tx);

    expect(state).toEqual(before);
    expect(state.editingZoneId).toBeNull();
  });
});

describe('zoneActions — context-menu applicability', () => {
  it('offers edit/lock/delete when unlocked, only unlock when locked', () => {
    const state = emptyTabletopState();
    const id = createFreeformZone(state, 0, 0);

    expect(zoneActions(state, id)).toEqual(['edit', 'lock', 'delete']);
    setZoneLocked(state, id, true);
    expect(zoneActions(state, id)).toEqual(['unlock']);
    expect(zoneActions(state, 'ghost')).toEqual([]);
  });
});

describe('"Move to <zone>" — a menu move that behaves exactly like a drop', () => {
  it('places the pile at the zone centre under the zone drop rules', () => {
    const state = withZone(stateWithPiles(singleCardPile('p1', 'c1', 900, 900)), {
      id: 'z1',
      x: 100,
      y: 100,
      width: 400,
      height: 300
    });

    movePileToZone(state, templates, 'p1', 'z1');
    normalize(state, templates, { dev: true });

    // Zone centre is (300, 250) world → (200, 150) zone-local.
    expect(state.piles.p1).toMatchObject({ zoneId: 'z1', x: 200, y: 150 });
    expect(state.zones.z1.pileIds).toEqual(['p1']);
    expect(state.rootPileIds).toEqual([]);
  });

  it('merges onto a pile already sitting at the zone centre, like a real drop would', () => {
    const state = withZone(
      stateWithPiles(singleCardPile('mover', 'c1', 900, 900), singleCardPile('sitter', 'c2', 300, 250)),
      { id: 'z1', x: 100, y: 100, width: 400, height: 300 },
      ['sitter']
    );

    movePileToZone(state, templates, 'mover', 'z1');
    normalize(state, templates, { dev: true });

    expect(state.piles.mover).toBeUndefined();
    expect(state.piles.sitter.cardIds).toEqual(['c2', 'c1']);
    expect(state.piles.sitter.zoneId).toBe('z1');
  });

  it('refuses locked zones, and the menu never offers them or the current zone', () => {
    const state = withZone(
      withZone(stateWithPiles(singleCardPile('p1', 'c1', 50, 50)), {
        id: 'home',
        x: 0,
        y: 0
      }, ['p1']),
      { id: 'vault', x: 600, y: 0, locked: true }
    );
    const before = structuredClone(state);

    movePileToZone(state, templates, 'p1', 'vault');
    expect(state).toEqual(before);

    // Offered targets: not the pile's own zone, not locked zones.
    expect(moveTargetZones(state, 'p1').map((z) => z.id)).toEqual([]);
    withZone(state, { id: 'other', x: 0, y: 600 });
    expect(moveTargetZones(state, 'p1').map((z) => z.id)).toEqual(['other']);
  });
});
