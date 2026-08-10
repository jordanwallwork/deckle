// Ownership & visibility view layer (issue #116, design decision #103).
//
// `computeViewState` is a PURE function turning the shared, omniscient
// `TabletopState` into the masked copy a single viewer is allowed to see. It is
// a pure function of (state, viewer, visibility) — no mutation of the input,
// no reactivity — so it lives here below the testing seam; the rune controller
// (viewController.svelte.ts) is a thin reactive wrapper over it.
//
// Two orthogonal per-zone axes (both from #103, reusing the gamerunner
// vocabulary):
//   - faceVisibility  all | owner | others | none  — who may see card faces
//   - presence        visible | hidden-from-non-owners — whether the whole
//                     zone (piles + cards) exists at all for non-owners
// The owner of a zone is its `ownerSeat` (a zone's seatIndex; table/edge zones
// are unowned). Reveal is achieved by moving a card into a visible zone — there
// are NO per-card overrides here.
//
// Visibility-metadata seam (see the implementer report / #116): the live
// tabletop `Zone` type deliberately does NOT carry ownership/visibility fields,
// and nothing yet wires blueprint instantiation (#115 `PlacedZone`) into a live
// `TabletopState`. Rather than thread new fields through every zone operation,
// `computeViewState` takes a separate `VisibilityMap` keyed by tabletop zone id.
// This keeps the function pure and trivially testable, and pairs directly with
// `PlacedZone` (whose `id`, `seatIndex`, `faceVisibility`, `presence` map onto
// one entry each). Zones absent from the map — every zone in today's freeform
// solo sandbox — are treated as fully public and unowned, so existing play is
// unaffected.

import type { FaceVisibility, ZonePresence } from '../gamerunner/types';
import type { Card, Pile, Selection, TabletopState, Zone } from './types';

/** Who is looking: a seat index, or the all-seeing solo/editor view. */
export type Viewer = number | 'omniscient';

/**
 * The visibility metadata for a single tabletop zone. Sourced from the
 * blueprint that produced the zone (#115 `PlacedZone`), decoupled from the live
 * `Zone` shape via {@link VisibilityMap}.
 */
export interface ZoneVisibility {
  /** Who may see the faces of cards in this zone. */
  faceVisibility: FaceVisibility;
  /** Whether the whole zone disappears for non-owners. */
  presence: ZonePresence;
  /** Owning seat index; undefined for unowned (table/edge) zones. */
  ownerSeat?: number;
}

/** Per-zone visibility metadata, keyed by tabletop {@link Zone.id}. */
export type VisibilityMap = Record<string, ZoneVisibility>;

/**
 * A card as a viewer sees it. Identical to {@link Card} except that when
 * {@link faceHidden} is set the identity fields have been redacted: `mergeData`
 * is null and `label`/`diceValue` are absent. The card's presence, back and
 * geometry (`templateId`, `rotation`, `isFlipped`) are kept so it still renders
 * as a face-down object of the right size — the viewer knows a card is there,
 * just not what it is.
 */
export interface MaskedCard extends Card {
  /** True when this viewer may not see the card's face. */
  faceHidden?: boolean;
}

/**
 * A view of the tabletop for one viewer. Same shape as {@link TabletopState}
 * but with {@link MaskedCard}s and with hidden zones/piles/cards removed. It is
 * a projection for rendering only — never fed back into the reducer.
 */
export interface MaskedState {
  cards: Record<string, MaskedCard>;
  piles: Record<string, Pile>;
  zones: Record<string, Zone>;
  zoneOrder: string[];
  rootPileIds: string[];
  selection: Selection;
  editingZoneId: string | null;
}

const PUBLIC_UNOWNED: ZoneVisibility = { faceVisibility: 'all', presence: 'visible' };

/** Whether a viewer at `viewer` may see the faces of cards in a zone. */
function viewerSeesFaces(vis: ZoneVisibility, viewer: number): boolean {
  const isOwner = vis.ownerSeat !== undefined && vis.ownerSeat === viewer;
  switch (vis.faceVisibility) {
    case 'all':
      return true;
    case 'none':
      return false;
    case 'owner':
      return isOwner;
    case 'others':
      // Everyone except the owner (Hanabi). An unowned zone has no owner, so
      // everyone is an "other" and sees the faces.
      return !isOwner;
  }
}

/** Whether a zone (and its contents) exists at all for a viewer. */
function viewerSeesZone(vis: ZoneVisibility, viewer: number): boolean {
  if (vis.presence === 'visible') return true;
  // hidden-from-non-owners: only the owner sees the zone.
  return vis.ownerSeat !== undefined && vis.ownerSeat === viewer;
}

/** Produce a redacted copy of a card with its identity blanked. */
function redactCard(card: Card): MaskedCard {
  const { label: _label, diceValue: _diceValue, ...rest } = card;
  return { ...rest, mergeData: null, faceHidden: true };
}

/**
 * Compute the masked view of `state` for `viewer`, using `visibility` to look
 * up each zone's ownership/visibility. Pure: the input is never mutated and the
 * result shares no mutable structure with it.
 *
 * - `omniscient` sees everything unmasked (a deep clone of the state).
 * - For a seat viewer, cards in zones whose faces they may not see are redacted
 *   ({@link MaskedCard.faceHidden}); zones marked `hidden-from-non-owners` that
 *   they do not own disappear entirely (zone + its piles + those piles' cards).
 * - Root-table piles (`zoneId: null`) and any zone absent from `visibility` are
 *   fully public and unowned, so solo freeform play is unaffected.
 */
export function computeViewState(
  state: TabletopState,
  viewer: Viewer,
  visibility: VisibilityMap = {}
): MaskedState {
  // Omniscient: an unmasked deep clone. Never share structure with the input.
  if (viewer === 'omniscient') {
    return structuredClone(state) as MaskedState;
  }

  const zones: Record<string, Zone> = {};
  const hiddenZoneIds = new Set<string>();
  for (const [zoneId, zone] of Object.entries(state.zones)) {
    const vis = visibility[zoneId] ?? PUBLIC_UNOWNED;
    if (viewerSeesZone(vis, viewer)) {
      zones[zoneId] = structuredClone(zone);
    } else {
      hiddenZoneIds.add(zoneId);
    }
  }

  // Drop any references to hidden zones from surviving zones' render/child lists.
  for (const zone of Object.values(zones)) {
    if (zone.type === 'freeform' && zone.childZoneIds) {
      zone.childZoneIds = zone.childZoneIds.filter((id) => !hiddenZoneIds.has(id));
    }
  }
  const zoneOrder = state.zoneOrder.filter((id) => !hiddenZoneIds.has(id));

  // Piles: drop those inside a hidden zone; the rest carry through unchanged.
  const piles: Record<string, Pile> = {};
  const droppedCardIds = new Set<string>();
  for (const [pileId, pile] of Object.entries(state.piles)) {
    if (pile.zoneId !== null && hiddenZoneIds.has(pile.zoneId)) {
      for (const cardId of pile.cardIds) droppedCardIds.add(cardId);
      continue;
    }
    piles[pileId] = structuredClone(pile);
  }

  // Map each surviving card to the zone it sits in (via its pile) so we know
  // whether to redact its face.
  const cardZone: Record<string, string | null> = {};
  for (const pile of Object.values(piles)) {
    for (const cardId of pile.cardIds) cardZone[cardId] = pile.zoneId;
  }

  const cards: Record<string, MaskedCard> = {};
  for (const [cardId, card] of Object.entries(state.cards)) {
    if (droppedCardIds.has(cardId)) continue;
    const zoneId = cardZone[cardId] ?? null;
    const vis = zoneId !== null ? (visibility[zoneId] ?? PUBLIC_UNOWNED) : PUBLIC_UNOWNED;
    cards[cardId] = viewerSeesFaces(vis, viewer) ? structuredClone(card) : redactCard(card);
  }

  return {
    cards,
    piles,
    zones,
    zoneOrder,
    rootPileIds: [...state.rootPileIds],
    selection: structuredClone(state.selection),
    editingZoneId: state.editingZoneId
  };
}
