// Ticket 10 — the group zone (scatter tray): jittered placement on entry,
// snap-to-90 rotation on leave (cosmetic jitter removed, deliberate
// orientation preserved), and shuffle re-scatter. Scenario-shaped, at the
// pure seam.

import { describe, it, expect } from 'vitest';
import { applyDropPlan, resolveDrop } from './drop';
import { emptyTabletopState } from './initialization';
import { normalize } from './normalize';
import {
  GROUP_ROTATION_JITTER,
  createGroupZone,
  detachPileFromZone,
  shuffleZoneContents,
  zoneActions,
  zoneBehavior
} from './zones';
import type { GroupZone, TabletopState } from './types';
import {
  cardTemplate,
  diceTemplate,
  makeCard,
  makePile,
  makeTemplates,
  singleCardPile,
  stateWithPiles,
  withZone
} from './fixtures';

const templates = makeTemplates(cardTemplate(), diceTemplate());

/** A sequence of scripted random() values (throws when exhausted). */
function sequence(values: number[]): () => number {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error('random sequence exhausted');
    return values[i++];
  };
}

/** A 300×200 group tray at world (1000, 1000). */
function addTray(state: TabletopState, pileIds: string[] = []): TabletopState {
  return withZone(
    state,
    { id: 'tray', type: 'group', x: 1000, y: 1000, width: 300, height: 200 },
    pileIds
  );
}

function tray(state: TabletopState): GroupZone {
  return state.zones.tray as GroupZone;
}

describe('group creation', () => {
  it('creates a shuffleable, unordered region that persists empty', () => {
    const state = emptyTabletopState();
    const id = createGroupZone(state, 100, 50);
    normalize(state, templates, { dev: true });

    expect(state.zones[id]).toMatchObject({ type: 'group', pileIds: [], locked: false });
    expect(state.zoneOrder).toEqual([id]);
    expect(zoneBehavior(state.zones[id]).ordered).toBe(false);
    expect(zoneBehavior(state.zones[id]).shuffleable).toBe(true);
  });
});

describe('jittered placement on entry', () => {
  it('nudges the drop point within the zone and hands back a rotation delta', () => {
    const state = addTray(emptyTabletopState());
    // Drop at the tray centre (world 1150, 1100 → local 150, 100). Sequence
    // [x, y, rot] = [1, 1, 1] → +24 px each axis, +12° tilt.
    const placement = zoneBehavior(tray(state)).planDrop(
      { state, templates, random: sequence([1, 1, 1]) },
      tray(state),
      { x: 1150, y: 1100 }
    );
    expect(placement).toEqual({ zoneId: 'tray', x: 1174, y: 1124, rotationJitter: 12 });
  });

  it('a pile dropped into a group lands jittered and tilted', () => {
    // The pile tracks the pointer during the drag, so at drop its centre is
    // the drop point (world 1150, 1100 → tray-local 150, 100).
    const state = addTray(stateWithPiles(singleCardPile('p', 'c', 1150, 1100)));
    const plan = resolveDrop(
      state,
      templates,
      { kind: 'pile', pileId: 'p' },
      { x: 1150, y: 1100 },
      sequence([1, 1, 1])
    );
    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });

    expect(state.piles.p.zoneId).toBe('tray');
    // Stored zone-local, nudged off the centre; card carries the tilt.
    expect(state.piles.p).toMatchObject({ x: 174, y: 124 });
    expect(state.cards.c.rotation).toBe(12);
    expect(tray(state).pileIds).toEqual(['p']);
  });

  it('a dice-set dropped onto a group scatters into it, each die jittered, no zone spawned', () => {
    const state = addTray(emptyTabletopState());
    const plan = resolveDrop(
      state,
      templates,
      { kind: 'template', templateId: 'tpl-dice' },
      { x: 1150, y: 1100 },
      // two dice → scatter (2×2) then each die's group jitter (3 each) = 10.
      sequence([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
    );
    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });

    expect(state.zoneOrder).toEqual(['tray']); // only the tray we created
    expect(tray(state).pileIds).toHaveLength(2);
    for (const id of tray(state).pileIds) {
      expect(state.piles[id].zoneId).toBe('tray');
      expect(state.piles[id].cardIds).toHaveLength(1);
    }
  });
});

describe('snap-to-90 on leave', () => {
  it('leaving a group straightens cosmetic jitter but keeps deliberate orientation', () => {
    const state = stateWithPiles(
      singleCardPile('jittered', 'j', 1100, 1050, { }),
      singleCardPile('turned', 't', 1200, 1050, { })
    );
    // 92° (a scatter tilt) and 180° (deliberately turned).
    state.cards.j.rotation = 92;
    state.cards.t.rotation = 180;
    addTray(state, ['jittered', 'turned']);

    // Directly through the behaviour hook.
    zoneBehavior(tray(state)).onLeave({ state, templates }, tray(state), 'jittered');
    zoneBehavior(tray(state)).onLeave({ state, templates }, tray(state), 'turned');
    expect(state.cards.j.rotation).toBe(90);
    expect(state.cards.t.rotation).toBe(180);
  });

  it('picking a die up out of the tray snaps it (detach path)', () => {
    const state = stateWithPiles(singleCardPile('die', 'd', 1150, 1100));
    state.cards.d = makeCard({ id: 'd', templateId: 'tpl-dice', rotation: 92 });
    addTray(state, ['die']);

    detachPileFromZone(state, templates, 'die');
    normalize(state, templates, { dev: true });

    expect(state.piles.die.zoneId).toBeNull();
    expect(state.cards.d.rotation).toBe(90);
  });

  it('leaving a non-group zone leaves rotation untouched', () => {
    const state = stateWithPiles(singleCardPile('p', 'c', 1100, 1050));
    state.cards.c.rotation = 92;
    withZone(state, { id: 'free', type: 'freeform', x: 1000, y: 1000 }, ['p']);

    detachPileFromZone(state, templates, 'p');
    expect(state.cards.c.rotation).toBe(92);
  });
});

describe('shuffle re-scatters the contents', () => {
  it('gives every pile a fresh in-bounds position and tilt', () => {
    const state = addTray(
      stateWithPiles(
        singleCardPile('p1', 'c1', 1100, 1050),
        singleCardPile('p2', 'c2', 1200, 1050)
      ),
      ['p1', 'p2']
    );
    normalize(state, templates, { dev: true });

    // Per pile: [x, y, rot]. margin 24, spanX 252, spanY 152.
    shuffleZoneContents(state, templates, 'tray', sequence([0, 0, 0, 1, 1, 1]));

    // p1: (24, 24), rot normalize(−12) = 348; p2: (276, 176), rot 12.
    expect(state.piles.p1).toMatchObject({ x: 24, y: 24 });
    expect(state.cards.c1.rotation).toBe(348);
    expect(state.piles.p2).toMatchObject({ x: 276, y: 176 });
    expect(state.cards.c2.rotation).toBe(12);

    // Everything stayed inside the tray with a small tilt.
    for (const id of ['p1', 'p2']) {
      expect(state.piles[id].x).toBeGreaterThanOrEqual(0);
      expect(state.piles[id].x).toBeLessThanOrEqual(300);
      expect(state.piles[id].y).toBeGreaterThanOrEqual(0);
      expect(state.piles[id].y).toBeLessThanOrEqual(200);
    }
  });

  it('preserves a multi-card pile\'s relative rotations when re-scattering', () => {
    // A pile of two cards deliberately turned relative to each other (an
    // orientation game like Scout — stories 7 & 9). Re-scatter must re-tilt
    // the pile as a whole, not flatten both cards to one absolute angle.
    const state = stateWithPiles({
      pile: makePile({ id: 'p', cardIds: ['top', 'bottom'], x: 1100, y: 1050 }),
      cards: [
        makeCard({ id: 'top', rotation: 0 }),
        makeCard({ id: 'bottom', rotation: 90 })
      ]
    });
    addTray(state, ['p']);
    normalize(state, templates, { dev: true });

    // Sequence [x, y, rot] = [0, 0, 1] → anchor (top card) gets +12° tilt.
    shuffleZoneContents(state, templates, 'tray', sequence([0, 0, 1]));

    // The anchor card carries the fresh tilt; the second card keeps its +90°
    // offset from it rather than being clobbered to the same value.
    expect(state.cards.top.rotation).toBe(12);
    expect(state.cards.bottom.rotation).toBe(102);
  });

  it('a populated group offers shuffle among its zone actions', () => {
    const state = addTray(
      stateWithPiles(
        singleCardPile('p1', 'c1', 1100, 1050),
        singleCardPile('p2', 'c2', 1200, 1050)
      ),
      ['p1', 'p2']
    );
    normalize(state, templates, { dev: true });
    expect(zoneActions(state, templates, 'tray')).toContain('shuffle');
  });

  it('the jitter tilt stays within the configured bound', () => {
    expect(GROUP_ROTATION_JITTER).toBeGreaterThan(0);
    const state = addTray(stateWithPiles(singleCardPile('p1', 'c1', 1100, 1050)), ['p1']);
    let r = 0;
    shuffleZoneContents(state, templates, 'tray', () => ((r += 0.19) % 1));
    const rot = state.cards.c1.rotation;
    // normalized to [0,360): a small tilt sits near 0 or near 360.
    expect(rot <= GROUP_ROTATION_JITTER || rot >= 360 - GROUP_ROTATION_JITTER).toBe(true);
  });
});
