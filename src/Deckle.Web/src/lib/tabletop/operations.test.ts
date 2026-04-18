import { describe, it, expect, beforeEach } from 'vitest';
import type {
  Entity,
  EntityTemplate,
  FreeformZone,
  GridZone,
  StackZone,
  TabletopState
} from './types';
import {
  drawFromStack,
  findZoneAtPoint,
  flipEntity,
  moveEntity,
  moveEntityToZone,
  moveZone,
  removeEntity,
  reorderInZone,
  rotateEntity,
  setRotation,
  setStackFaceDown,
  setStackPersistent,
  shuffleStack,
  snapToGrid,
  spawnFromTemplate,
  spawnStackZoneFromTemplate
} from './operations';

function makeEntity(overrides: Partial<Entity> & { instanceId: string; zoneId: string }): Entity {
  return {
    templateId: 't',
    x: 0,
    y: 0,
    rotation: 0,
    isFlipped: false,
    mergeData: null,
    locked: false,
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
    entityIds: ['e1', 'e2'],
    locked: false
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
    entityIds: [],
    locked: false
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
    persistent: true,
    entityIds: ['e3', 'e4'],
    locked: false
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
    selectedZoneId: null,
    editingZoneId: null
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
    entityIds: [],
    locked: false
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

  it('preserves flip state when moving into a face-down stack', () => {
    expect(state.entities.e1.isFlipped).toBe(false);
    moveEntityToZone(state, 'e1', 'deck');
    expect(state.entities.e1.isFlipped).toBe(false);
    expect(state.entities.e1.zoneId).toBe('deck');
  });

  it('preserves flip state when moving into a face-up stack', () => {
    (state.zones.deck as StackZone).faceDown = false;
    state.entities.e1.isFlipped = true;
    moveEntityToZone(state, 'e1', 'deck');
    expect(state.entities.e1.isFlipped).toBe(true);
  });

  it('respects insertIndex', () => {
    moveEntityToZone(state, 'e1', 'deck', { insertIndex: 0 });
    expect(state.zones.deck.entityIds).toEqual(['e1', 'e3', 'e4']);
  });

  it('adopts the existing rotation of a stack when moved onto it', () => {
    state.entities.e3.rotation = 90;
    state.entities.e4.rotation = 90;
    state.entities.e1.rotation = 0;
    moveEntityToZone(state, 'e1', 'deck');
    expect(state.entities.e1.rotation).toBe(90);
  });

  it('keeps its own rotation when moved onto an empty stack', () => {
    (state.zones.deck as StackZone).entityIds = [];
    state.entities.e1.rotation = 45;
    moveEntityToZone(state, 'e1', 'deck');
    expect(state.entities.e1.rotation).toBe(45);
  });
});

describe('moveZone', () => {
  it('updates the zone world-space position without touching entities', () => {
    const state = makeState();
    moveZone(state, 'deck', 1500, 200);
    expect(state.zones.deck.x).toBe(1500);
    expect(state.zones.deck.y).toBe(200);
    // Entities inside keep their local coords
    expect(state.entities.e3.x).toBe(0);
    expect(state.entities.e3.y).toBe(0);
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

describe('spawnFromTemplate', () => {
  function makeTemplate(instances: EntityTemplate['instances']): EntityTemplate {
    return {
      id: 'tpl',
      name: 'Card',
      type: 'Card',
      widthPx: 200,
      heightPx: 300,
      widthMm: 63,
      heightMm: 88,
      isEditable: true,
      instances
    };
  }

  it('spawns a single entity with null mergeData for non-data-source templates', () => {
    const state = makeState();
    const template = makeTemplate([null]);
    const ids = spawnFromTemplate(state, template, 'tableau', 50, 60);
    expect(ids).toHaveLength(1);
    const entity = state.entities[ids[0]];
    expect(entity.mergeData).toBeNull();
    expect(entity.x).toBe(50);
    expect(entity.y).toBe(60);
    expect(state.zones.tableau.entityIds).toContain(ids[0]);
  });

  it('spawns one entity per row, each carrying its row data', () => {
    const state = makeState();
    const template = makeTemplate([{ Name: 'Alice' }, { Name: 'Bob' }, { Name: 'Cara' }]);
    const ids = spawnFromTemplate(state, template, 'tableau', 10, 20);
    expect(ids).toHaveLength(3);
    expect(state.entities[ids[0]].mergeData).toEqual({ Name: 'Alice' });
    expect(state.entities[ids[1]].mergeData).toEqual({ Name: 'Bob' });
    expect(state.entities[ids[2]].mergeData).toEqual({ Name: 'Cara' });
  });

  it('piles spawned entities into a stack zone', () => {
    const state = makeState();
    const template = makeTemplate([{ Name: 'a' }, { Name: 'b' }]);
    const ids = spawnFromTemplate(state, template, 'deck', 0, 0);
    expect(state.zones.deck.entityIds.slice(-2)).toEqual(ids);
    // Stack is face-down → new entities adopt the stack face.
    expect(state.entities[ids[0]].isFlipped).toBe(true);
  });
});

describe('spawnStackZoneFromTemplate', () => {
  function makeTemplate(instances: EntityTemplate['instances']): EntityTemplate {
    return {
      id: 'tpl',
      name: 'Heroes',
      type: 'Card',
      widthPx: 200,
      heightPx: 300,
      widthMm: 63,
      heightMm: 88,
      isEditable: true,
      instances
    };
  }

  it('creates a new face-down stack zone centered on the drop point', () => {
    const state = makeState();
    const template = makeTemplate([{ Name: 'a' }, { Name: 'b' }, { Name: 'c' }]);
    const displayW = 126;
    const displayH = 176;

    const { zoneId, instanceIds } = spawnStackZoneFromTemplate(
      state,
      template,
      500,
      400,
      displayW,
      displayH
    );

    const zone = state.zones[zoneId] as StackZone;
    expect(zone).toBeDefined();
    expect(zone.type).toBe('stack');
    expect(zone.name).toBe('Heroes');
    // Centered on (500, 400) with default 20px padding on each side.
    expect(zone.width).toBe(displayW + 40);
    expect(zone.height).toBe(displayH + 40);
    expect(zone.x).toBe(500 - zone.width / 2);
    expect(zone.y).toBe(400 - zone.height / 2);
    expect(state.zoneOrder).toContain(zoneId);
    expect(zone.entityIds).toEqual(instanceIds);
    expect(instanceIds).toHaveLength(3);
    expect(state.entities[instanceIds[0]].mergeData).toEqual({ Name: 'a' });
    expect(state.entities[instanceIds[0]].isFlipped).toBe(true);
    // New stack zones default to non-persistent with the dropped component's
    // display size cached as defaultSize.
    expect(zone.persistent).toBe(false);
    expect(zone.defaultSize).toEqual({ width: displayW, height: displayH });
  });
});

describe('auto-dissolve of non-persistent stacks', () => {
  it('promotes the last entity to a freeform zone and removes the stack', () => {
    const state = makeState();
    (state.zones.deck as StackZone).persistent = false;
    (state.zones.deck as StackZone).defaultSize = { width: 120, height: 180 };

    // 2 → 1: moving e4 out triggers dissolve of the deck.
    moveEntityToZone(state, 'e4', 'tableau', { x: 0, y: 0 });

    expect(state.zones.deck).toBeUndefined();
    expect(state.zoneOrder).not.toContain('deck');
    // e3 (the last remaining) should now live in the tableau.
    expect(state.entities.e3.zoneId).toBe('tableau');
    expect(state.zones.tableau.entityIds).toContain('e3');
  });

  it('leaves persistent stacks alone', () => {
    const state = makeState();
    (state.zones.deck as StackZone).persistent = true;

    moveEntityToZone(state, 'e4', 'tableau', { x: 0, y: 0 });

    expect(state.zones.deck).toBeDefined();
    expect(state.zones.deck.entityIds).toEqual(['e3']);
    expect(state.entities.e3.zoneId).toBe('deck');
  });

  it('dissolves after drawFromStack drops the stack to one card', () => {
    const state = makeState();
    (state.zones.deck as StackZone).persistent = false;

    drawFromStack(state, 'deck', 'tableau', 10, 20);

    expect(state.zones.deck).toBeUndefined();
    expect(state.entities.e3.zoneId).toBe('tableau');
  });

  it('dissolves after removeEntity drops the stack to one card', () => {
    const state = makeState();
    (state.zones.deck as StackZone).persistent = false;

    removeEntity(state, 'e4');

    expect(state.zones.deck).toBeUndefined();
    expect(state.entities.e4).toBeUndefined();
    expect(state.entities.e3.zoneId).toBe('tableau');
  });

  it('removes the zone entirely when dissolved from zero entities', () => {
    const state = makeState();
    (state.zones.deck as StackZone).persistent = false;
    (state.zones.deck as StackZone).entityIds = [];
    delete state.entities.e3;
    delete state.entities.e4;

    // Toggling to non-persistent re-checks the condition.
    setStackPersistent(state, 'deck', false);

    expect(state.zones.deck).toBeUndefined();
    expect(state.zoneOrder).not.toContain('deck');
  });
});

describe('setStackPersistent', () => {
  it('toggles the flag without dissolving a well-stocked stack', () => {
    const state = makeState();
    setStackPersistent(state, 'deck', false);
    expect((state.zones.deck as StackZone).persistent).toBe(false);
    // 2 entities → no dissolve.
    expect(state.zones.deck.entityIds).toEqual(['e3', 'e4']);
  });

  it('dissolves immediately when flipped to non-persistent with one entity', () => {
    const state = makeState();
    (state.zones.deck as StackZone).entityIds = ['e3'];

    setStackPersistent(state, 'deck', false);

    expect(state.zones.deck).toBeUndefined();
    expect(state.entities.e3.zoneId).toBe('tableau');
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
