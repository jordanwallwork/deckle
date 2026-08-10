/**
 * Replay planning for animated setup execution (#121, decision #107).
 *
 * The interpreter runs compute-first: {@link runSetup} builds the whole table in
 * one pass and returns the final {@link TabletopState} plus a linear
 * {@link SetupStep} trace. The Play dialog does NOT drop that state onto the
 * table instantly — it hands it here to plan a *progressive reveal*, then plays
 * the frames back one major step at a time so the table visibly builds up.
 *
 * The plan is a pure function of (final state, trace): {@link planReplay} walks
 * the trace and, for each step, reveals the zones and piles that step created.
 * Frame `k` is the final state restricted to everything revealed through step
 * `k`. Two properties hold by construction and are what the playback controller
 * relies on:
 *
 *  - **Monotonic build-up** — each frame is a superset of the previous one, so
 *    the table only ever gains pieces as the replay advances.
 *  - **Last frame === final** — every zone in the final state is created by a
 *    placeSeats/placeZone step, and every surviving pile by a place/deal/move/
 *    roll step, so the union of all revelations is exactly the final state. This
 *    is why a full replay and a mid-flight skip land on the *same* table: the
 *    controller commits the authoritative `runSetup` state either way, and the
 *    last frame it would have shown already equals it.
 *
 * Cards ride along with their piles (a card only ever appears inside a pile), so
 * a frame never shows an orphaned card. Piles referenced by the trace but absent
 * from the final state (e.g. a deck fully drained by a later deal) are skipped —
 * they no longer exist to reveal.
 */

import type { Pile, TabletopState, Zone } from '../tabletop/types';
import type { SetupStep } from './interpreter';

/** One frame of the replay: the step that produced it and the table so far. */
export interface ReplayFrame {
  /** The trace step whose effect this frame reveals. */
  step: SetupStep;
  /** The final state restricted to everything revealed through this step. */
  state: TabletopState;
}

/** Zone ids a step brings onto the table (placeSeats / placeZone / roll target). */
function stepZoneIds(step: SetupStep): string[] {
  switch (step.verb) {
    case 'placeSeats':
    case 'placeZone':
      return step.zoneIds;
    case 'roll':
      return step.zoneId ? [step.zoneId] : [];
    default:
      return [];
  }
}

/** Pile ids a step creates (place / deal / move / roll). */
function stepPileIds(step: SetupStep): string[] {
  switch (step.verb) {
    case 'place':
      return step.pileIds;
    case 'deal':
      return step.deals.map((d) => d.pileId);
    case 'move':
      return step.moves.map((m) => m.pileId).filter((id): id is string => id !== null);
    case 'roll':
      return step.pileIds;
    default:
      return [];
  }
}

/**
 * Project the final state down to the revealed zones and piles, keeping each
 * zone's pile membership consistent with what has been revealed so far. Cards
 * are pulled in transitively from the revealed piles, so the frame is always
 * internally consistent (no pile references a hidden card, no card floats
 * outside a pile).
 */
function projectState(
  final: TabletopState,
  zoneIds: ReadonlySet<string>,
  pileIds: ReadonlySet<string>
): TabletopState {
  const piles: Record<string, Pile> = {};
  const cards: TabletopState['cards'] = {};
  for (const id of pileIds) {
    const pile = final.piles[id];
    if (!pile) continue;
    piles[id] = { ...pile, cardIds: [...pile.cardIds] };
    for (const cardId of pile.cardIds) {
      const card = final.cards[cardId];
      if (card) cards[cardId] = card;
    }
  }

  const zones: Record<string, Zone> = {};
  for (const id of zoneIds) {
    const zone = final.zones[id];
    if (!zone) continue;
    zones[id] = { ...zone, pileIds: zone.pileIds.filter((pid) => piles[pid]) } as Zone;
  }

  return {
    cards,
    piles,
    zones,
    zoneOrder: final.zoneOrder.filter((id) => zones[id]),
    rootPileIds: final.rootPileIds.filter((id) => piles[id]),
    selection: { kind: 'none' },
    editingZoneId: null
  };
}

/**
 * Plan the progressive reveal of a completed run: one {@link ReplayFrame} per
 * trace step, each showing the final table restricted to everything revealed up
 * to and including that step. The frames build up monotonically and the last one
 * equals `final`. An empty trace yields no frames (nothing to animate — the
 * caller drops straight to the committed final state).
 */
export function planReplay(final: TabletopState, trace: readonly SetupStep[]): ReplayFrame[] {
  const zoneIds = new Set<string>();
  const pileIds = new Set<string>();
  const frames: ReplayFrame[] = [];
  for (const step of trace) {
    for (const z of stepZoneIds(step)) zoneIds.add(z);
    for (const p of stepPileIds(step)) pileIds.add(p);
    frames.push({ step, state: projectState(final, zoneIds, pileIds) });
  }
  return frames;
}
