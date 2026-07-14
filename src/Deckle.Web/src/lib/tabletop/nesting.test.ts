import { describe, it, expect } from 'vitest';
import {
  createContainerZone,
  createFreeformZone,
  descendantZoneIds,
  findNestTarget,
  findZoneAt,
  moveZoneTo,
  renderOrderedZoneIds,
  reparentZone,
  zoneNestTarget
} from './zones';
import { placePile } from './operations';
import { pileWorldCenter, zoneWorldOrigin, zoneWorldRect } from './geometry';
import { normalize } from './normalize';
import { emptyTabletopState } from './initialization';
import {
  cardTemplate,
  makeCard,
  makePile,
  makeTemplates,
  singleCardPile,
  stateWithPiles,
  withZone
} from './fixtures';
import type { TabletopState } from './types';

const boardTemplate = cardTemplate({
  id: 'tpl-board',
  name: 'Board',
  isContainer: true,
  mergeable: false,
  widthMm: 300,
  heightMm: 200
});
const templates = makeTemplates(cardTemplate(), boardTemplate);

/** Register a loose card pile at a world point, ready to be placed. */
function withLoosePile(state: TabletopState, pileId: string, cardId: string, x: number, y: number) {
  state.cards[cardId] = makeCard({ id: cardId });
  state.piles[pileId] = makePile({ id: pileId, cardIds: [cardId], x, y });
  state.rootPileIds.push(pileId);
}

describe('reparentZone — nesting keeps the zone visually stationary', () => {
  it('nesting a top-level zone into a freeform parent preserves its world origin', () => {
    const state = emptyTabletopState();
    const parent = createFreeformZone(state, 0, 0, 500, 400, 'Parent');
    const child = createFreeformZone(state, 300, 200, 150, 120, 'Child');

    reparentZone(state, child, parent);
    normalize(state, templates, { dev: true });

    // Stored coordinates are now parent-local, but the world origin is exactly
    // where it was before nesting.
    expect(state.zones[child]).toMatchObject({ parentZoneId: parent, x: 300, y: 200 });
    expect(zoneWorldOrigin(state, state.zones[child])).toEqual({ x: 300, y: 200 });
    // The child left the top-level render order and joined its parent's list.
    expect(state.zoneOrder).toEqual([parent]);
    expect((state.zones[parent] as { childZoneIds?: string[] }).childZoneIds).toEqual([child]);
  });

  it('un-nesting a zone returns it to the table at its visual position', () => {
    const state = emptyTabletopState();
    const parent = createFreeformZone(state, 100, 100, 500, 400, 'Parent');
    const child = createFreeformZone(state, 0, 0, 150, 120, 'Child');
    reparentZone(state, child, parent); // world origin (100,100)+(0,0) ... child now at parent-local
    // Position the child somewhere inside the parent first.
    moveZoneTo(state, child, 250, 250); // world → parent-local (150,150)
    expect(zoneWorldOrigin(state, state.zones[child])).toEqual({ x: 250, y: 250 });

    reparentZone(state, child, null);
    normalize(state, templates, { dev: true });

    expect(state.zones[child].parentZoneId).toBeUndefined();
    expect(state.zones[child]).toMatchObject({ x: 250, y: 250 });
    expect(state.zoneOrder).toEqual([parent, child]);
    expect((state.zones[parent] as { childZoneIds?: string[] }).childZoneIds).toEqual([]);
  });

  it('reparenting is a no-op when the parent is unchanged', () => {
    const state = emptyTabletopState();
    const parent = createFreeformZone(state, 0, 0, 500, 400, 'Parent');
    const child = createFreeformZone(state, 100, 100, 150, 120, 'Child');
    reparentZone(state, child, parent);
    const before = structuredClone(state);

    reparentZone(state, child, parent);

    expect(state).toEqual(before);
  });

  it('nesting only ever accepts a freeform parent', () => {
    const state = emptyTabletopState();
    // A grid is not a valid parent — reparent leaves the zone alone.
    const grid = createFreeformZone(state, 0, 0); // stand-in top-level zone
    state.zones[grid].type = 'grid';
    const child = createFreeformZone(state, 400, 0, 150, 120, 'Child');
    const before = structuredClone(state);

    reparentZone(state, child, grid);

    expect(state).toEqual(before);
  });
});

describe('nesting keeps contents visually stable', () => {
  it('a pile inside a nested zone tracks the parent through the whole ancestry', () => {
    const state = emptyTabletopState();
    const outer = createFreeformZone(state, 100, 100, 500, 400, 'Outer');
    const inner = createFreeformZone(state, 0, 0, 200, 160, 'Inner');
    withLoosePile(state, 'p1', 'c1', 0, 0);
    // Seat the pile inside the inner zone at a world point.
    placePile(state, 'p1', inner, 260, 240);
    expect(pileWorldCenter(state, state.piles.p1)).toEqual({ x: 260, y: 240 });

    // Nest inner into outer (visually stationary), then move outer.
    reparentZone(state, inner, outer);
    normalize(state, templates, { dev: true });
    expect(pileWorldCenter(state, state.piles.p1)).toEqual({ x: 260, y: 240 });

    moveZoneTo(state, outer, 300, 300); // world top-left 100→300, 100→300 (+200,+200)
    normalize(state, templates, { dev: true });
    expect(pileWorldCenter(state, state.piles.p1)).toEqual({ x: 460, y: 440 });
  });

  it('a card placed on a board travels with the board when it moves', () => {
    const state = emptyTabletopState();
    const board = createContainerZone(state, 'tpl-board', 100, 100, 600, 400, 'Board');
    withLoosePile(state, 'p1', 'c1', 0, 0);
    placePile(state, 'p1', board, 300, 250); // world centre on the board
    expect(pileWorldCenter(state, state.piles.p1)).toEqual({ x: 300, y: 250 });

    moveZoneTo(state, board, 500, 500); // +400, +400 from (100,100)
    normalize(state, templates, { dev: true });

    expect(state.piles.p1.zoneId).toBe(board);
    expect(pileWorldCenter(state, state.piles.p1)).toEqual({ x: 700, y: 650 });
  });
});

describe('deep-nesting world-position math', () => {
  it('world origin accumulates through every ancestor', () => {
    const state = emptyTabletopState();
    const a = createFreeformZone(state, 100, 50, 800, 600, 'A');
    const b = createFreeformZone(state, 0, 0, 400, 300, 'B');
    const c = createFreeformZone(state, 0, 0, 150, 120, 'C');
    reparentZone(state, b, a); // B world origin (100,50)
    moveZoneTo(state, b, 200, 150); // B world origin (200,150) → parent-local (100,100)
    reparentZone(state, c, b); // C world origin still (200,150)
    moveZoneTo(state, c, 260, 210); // C world origin (260,210)

    normalize(state, templates, { dev: true });

    expect(zoneWorldOrigin(state, state.zones[a])).toEqual({ x: 100, y: 50 });
    expect(zoneWorldOrigin(state, state.zones[b])).toEqual({ x: 200, y: 150 });
    expect(zoneWorldOrigin(state, state.zones[c])).toEqual({ x: 260, y: 210 });
    // Stored coordinates are each parent-local.
    expect(state.zones[b]).toMatchObject({ x: 100, y: 100, parentZoneId: a });
    expect(state.zones[c]).toMatchObject({ x: 60, y: 60, parentZoneId: b });
  });
});

describe('descendant-excluded hit-testing', () => {
  it('a parent cannot nest into its own child (or any descendant)', () => {
    const state = emptyTabletopState();
    const parent = createFreeformZone(state, 0, 0, 400, 400, 'Parent');
    const child = createFreeformZone(state, 50, 50, 200, 200, 'Child'); // world (50,50)
    reparentZone(state, child, parent);

    // The child's whole area is inside the parent, so dragging the parent so
    // its centre lands over the child must NOT resolve to the child.
    expect(descendantZoneIds(state, parent).has(child)).toBe(true);
    const overChild = { x: 100, y: 100 };
    expect(findNestTarget(state, parent, overChild)).toBeNull();
    // The child itself, dropped over its own body, stays with its parent.
    expect(findNestTarget(state, child, overChild)).toBe(parent);
  });

  it('picks the innermost freeform zone under the point', () => {
    const state = emptyTabletopState();
    const outer = createFreeformZone(state, 0, 0, 400, 400, 'Outer');
    const inner = createFreeformZone(state, 50, 50, 150, 150, 'Inner'); // world (50,50)..(200,200)
    reparentZone(state, inner, outer);
    // A free zone dropped over the inner region nests into inner, not outer.
    const loose = createFreeformZone(state, 1000, 1000, 40, 40, 'Loose');

    expect(findNestTarget(state, loose, { x: 100, y: 100 })).toBe(inner);
    expect(findNestTarget(state, loose, { x: 300, y: 300 })).toBe(outer);
    expect(findNestTarget(state, loose, { x: 900, y: 900 })).toBeNull();
  });

  it('findZoneAt returns the innermost nested zone', () => {
    const state = emptyTabletopState();
    const outer = createFreeformZone(state, 0, 0, 400, 400, 'Outer');
    const inner = createFreeformZone(state, 50, 50, 150, 150, 'Inner');
    reparentZone(state, inner, outer);

    expect(findZoneAt(state, { x: 100, y: 100 })?.id).toBe(inner);
    expect(findZoneAt(state, { x: 300, y: 300 })?.id).toBe(outer);
    expect(renderOrderedZoneIds(state)).toEqual([outer, inner]);
  });
});

describe('zoneNestTarget — resolving from a zone’s own position', () => {
  it('resolves the parent under the dragged zone’s centre', () => {
    const state = emptyTabletopState();
    const board = createFreeformZone(state, 0, 0, 600, 400, 'Board'); // centre (300,200)
    const panel = createFreeformZone(state, 1000, 1000, 100, 100, 'Panel');

    // Off the board → un-nest (null).
    expect(zoneNestTarget(state, panel)).toBeNull();

    // Move the panel so its centre sits on the board.
    moveZoneTo(state, panel, 200, 150); // centre (250,200)
    expect(zoneNestTarget(state, panel)).toBe(board);
  });
});

describe('nesting a populated zone via withZone fixtures', () => {
  it('nesting a zone with a pile keeps the pile’s world position', () => {
    const state = withZone(
      stateWithPiles(singleCardPile('p1', 'c1', 350, 250)),
      { id: 'z1', x: 300, y: 200, width: 200, height: 160 },
      ['p1']
    );
    const parent = createFreeformZone(state, 0, 0, 800, 600, 'Parent');
    expect(pileWorldCenter(state, state.piles.p1)).toEqual({ x: 350, y: 250 });

    reparentZone(state, 'z1', parent);
    normalize(state, templates, { dev: true });

    expect(zoneWorldRect(state, state.zones.z1)).toMatchObject({ x: 300, y: 200 });
    expect(pileWorldCenter(state, state.piles.p1)).toEqual({ x: 350, y: 250 });
  });
});
