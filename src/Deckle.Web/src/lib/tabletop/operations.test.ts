import { describe, it, expect, beforeEach } from 'vitest';
import type {
  Entity,
  FreeformZone,
  GridZone,
  StackZone,
  TabletopState
} from './types';
import {
  findZoneAtPoint,
  flipEntity,
  moveEntity,
  moveEntityToZone,
  reorderInZone,
  rotateEntity,
  setRotation,
  setStackFaceDown,
  shuffleStack,
  snapToGrid
} from './operations';

function makeEntity(overrides: Partial<Entity> & { instanceId: string; zoneId: string }): Entity {
  return {
    templateId: 't',
    x: 0,
    y: 0,
    rotation: 0,
    isFlipped: false,
    mergeData: null,
    ...overrides
  };
}

function makeState(): TabletopState {
  const tableau: FreeformZone = {
    id: 'tableau',
    name: 'Tableau',
    type: 'freeform',
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    entityIds: ['e1', 'e2']
  };
  const grid: GridZone = {
    id: 'grid',
    name: 'Grid',
    type: 'grid',
    x: 1000,
    y: 0,
    width: 480,
    height: 320,
    cellWidth: 80,
    cellHeight: 80,
    columns: 6,
    entityIds: []
  };
  const deck: StackZone = {
    id: 'deck',
    name: 'Deck',
    type: 'stack',
    x: 0,
    y: 700,
    width: 200,
    height: 300,
    faceDown: true,
    entityIds: ['e3', 'e4']
  };

  return {
    entities: {
      e1: makeEntity({ instanceId: 'e1', zoneId: 'tableau', x: 10, y: 20 }),
      e2: makeEntity({ instanceId: 'e2', zoneId: 'tableau', x: 100, y: 20 }),
      e3: makeEntity({ instanceId: 'e3', zoneId: 'deck', isFlipped: true }),
      e4: makeEntity({ instanceId: 'e4', zoneId: 'deck', isFlipped: true })
    },
    zones: {
      tableau,
      grid,
      deck
    },
    zoneOrder: ['tableau', 'grid', 'deck'],
    selectedEntityId: null,
    selectedZoneId: null
  };
}

describe('snapToGrid', () => {
  const zone: GridZone = {
    id: 'g',
    name: 'g',
    type: 'grid',
    x: 0,
    y: 0,
    width: 480,
    height: 320,
    cellWidth: 80,
    cellHeight: 80,
    columns: 6,
    entityIds: []
  };

  it('snaps to the nearest cell', () => {
    expect(snapToGrid(zone, 30, 45)).toEqual({ x: 0, y: 80, index: 6 });
    expect(snapToGrid(zone, 85, 0)).toEqual({ x: 80, y: 0, index: 1 });
  });

  it('clamps to the zone columns', () => {
    const result = snapToGrid(zone, 10_000, 0);
    expect(result.x).toBe(5 * 80);
  });
});

describe('moveEntity', () => {
  let state: TabletopState;
  beforeEach(() => {
    state = makeState();
  });

  it('updates x/y within a freeform zone', () => {
    moveEntity(state, 'e1', 200, 300);
    expect(state.entities.e1.x).toBe(200);
    expect(state.entities.e1.y).toBe(300);
  });

  it('snaps x/y inside a grid zone', () => {
    state.entities.e1.zoneId = 'grid';
    (state.zones.grid as GridZone).entityIds = ['e1'];
    moveEntity(state, 'e1', 45, 210);
    expect(state.entities.e1.x).toBe(80); // col 1
    expect(state.entities.e1.y).toBe(240); // row 3
  });

  it('is a no-op for stack zones', () => {
    moveEntity(state, 'e3', 500, 500);
    expect(state.entities.e3.x).toBe(0);
    expect(state.entities.e3.y).toBe(0);
  });
});

describe('moveEntityToZone', () => {
  let state: TabletopState;
  beforeEach(() => {
    state = makeState();
  });

  it('moves the entity between zone entityIds arrays', () => {
    moveEntityToZone(state, 'e1', 'grid', { x: 0, y: 0 });
    expect(state.zones.tableau.entityIds).toEqual(['e2']);
    expect(state.zones.grid.entityIds).toEqual(['e1']);
    expect(state.entities.e1.zoneId).toBe('grid');
  });

  it('inherits face-down state when moving into a face-down stack', () => {
    expect(state.entities.e1.isFlipped).toBe(false);
    moveEntityToZone(state, 'e1', 'deck');
    expect(state.entities.e1.isFlipped).toBe(true);
    expect(state.entities.e1.zoneId).toBe('deck');
  });

  it('does not force face-down when moving into a face-up stack', () => {
    (state.zones.deck as StackZone).faceDown = false;
    state.entities.e1.isFlipped = false;
    moveEntityToZone(state, 'e1', 'deck');
    expect(state.entities.e1.isFlipped).toBe(false);
  });

  it('respects insertIndex', () => {
    moveEntityToZone(state, 'e1', 'deck', { insertIndex: 0 });
    expect(state.zones.deck.entityIds).toEqual(['e1', 'e3', 'e4']);
  });
});

describe('flipEntity / rotateEntity / setRotation', () => {
  let state: TabletopState;
  beforeEach(() => {
    state = makeState();
  });

  it('toggles flip', () => {
    flipEntity(state, 'e1');
    expect(state.entities.e1.isFlipped).toBe(true);
    flipEntity(state, 'e1');
    expect(state.entities.e1.isFlipped).toBe(false);
  });

  it('rotates normalized to [0,360)', () => {
    rotateEntity(state, 'e1', 90);
    expect(state.entities.e1.rotation).toBe(90);
    rotateEntity(state, 'e1', 360);
    expect(state.entities.e1.rotation).toBe(90);
    rotateEntity(state, 'e1', -180);
    expect(state.entities.e1.rotation).toBe(270);
  });

  it('setRotation normalizes negatives', () => {
    setRotation(state, 'e1', -45);
    expect(state.entities.e1.rotation).toBe(315);
  });
});

describe('shuffleStack', () => {
  it('preserves the set of ids and only shuffles stack zones', () => {
    const state = makeState();
    (state.zones.deck as StackZone).entityIds = ['a', 'b', 'c', 'd', 'e'];
    const before = [...state.zones.deck.entityIds];
    shuffleStack(state, 'deck');
    expect([...state.zones.deck.entityIds].sort()).toEqual([...before].sort());
  });

  it('is a no-op for non-stack zones', () => {
    const state = makeState();
    const before = [...state.zones.tableau.entityIds];
    shuffleStack(state, 'tableau');
    expect(state.zones.tableau.entityIds).toEqual(before);
  });
});

describe('setStackFaceDown', () => {
  it('flips all entities in the stack', () => {
    const state = makeState();
    setStackFaceDown(state, 'deck', false);
    expect((state.zones.deck as StackZone).faceDown).toBe(false);
    expect(state.entities.e3.isFlipped).toBe(false);
    expect(state.entities.e4.isFlipped).toBe(false);
  });
});

describe('reorderInZone', () => {
  it('moves an entity to a new index within its zone', () => {
    const state = makeState();
    state.zones.tableau.entityIds = ['a', 'b', 'c', 'd'];
    state.entities.a = makeEntity({ instanceId: 'a', zoneId: 'tableau' });
    state.entities.b = makeEntity({ instanceId: 'b', zoneId: 'tableau' });
    state.entities.c = makeEntity({ instanceId: 'c', zoneId: 'tableau' });
    state.entities.d = makeEntity({ instanceId: 'd', zoneId: 'tableau' });

    reorderInZone(state, 'a', 3);
    expect(state.zones.tableau.entityIds).toEqual(['b', 'c', 'd', 'a']);
  });
});

describe('findZoneAtPoint', () => {
  let state: TabletopState;
  beforeEach(() => {
    state = makeState();
  });

  it('finds the zone containing a point', () => {
    expect(findZoneAtPoint(state, 100, 100)?.id).toBe('tableau');
    expect(findZoneAtPoint(state, 1050, 40)?.id).toBe('grid');
    expect(findZoneAtPoint(state, 50, 800)?.id).toBe('deck');
  });

  it('returns null when no zone contains the point', () => {
    expect(findZoneAtPoint(state, 900, 900)).toBeNull();
  });

  it('returns the top-most zone when zones overlap', () => {
    // Make grid overlap tableau and put grid on top
    state.zones.grid.x = 0;
    state.zones.grid.y = 0;
    expect(findZoneAtPoint(state, 50, 50)?.id).toBe('grid');
  });
});
