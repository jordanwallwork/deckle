// Pure geometry helpers: physical-scale sizing and derived pile footprints.
// Nothing here caches sizes — footprints are always derived on demand from
// cards' templates and rotations (see SPEC "No cached sizes anywhere").

import type { Card, Pile, TabletopState, Template, Templates } from './types';

/**
 * How many on-screen pixels represent one millimetre of physical component.
 * All display sizes derive from physical mm × this factor so cards, dice and
 * mats keep correct relative scale.
 */
export const PX_PER_MM = 2;

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Display size (px) for a template rendered at physical scale. */
export function templateDisplaySize(template: Template): Size {
  return {
    width: template.widthMm * PX_PER_MM,
    height: template.heightMm * PX_PER_MM
  };
}

/**
 * Axis-aligned bounding size of a single card at its current rotation.
 * Quarter-turn aware: odd quarter turns swap width and height.
 */
export function cardAabbSize(card: Card, template: Template): Size {
  const { width, height } = templateDisplaySize(template);
  const quarterTurns = Math.round(card.rotation / 90);
  const oddQuarterTurn = Math.abs(quarterTurns) % 2 === 1;
  return oddQuarterTurn ? { width: height, height: width } : { width, height };
}

/**
 * Derived footprint of a pile: the union AABB of its cards (each centred on
 * the pile centre). A rotated or larger card lower in the pile grows the
 * footprint so it can visibly poke out.
 */
export function pileFootprint(state: TabletopState, templates: Templates, pile: Pile): Size {
  let maxW = 0;
  let maxH = 0;
  for (const cardId of pile.cardIds) {
    const card = state.cards[cardId];
    const template = card ? templates[card.templateId] : undefined;
    if (!card || !template) continue;
    const { width, height } = cardAabbSize(card, template);
    if (width > maxW) maxW = width;
    if (height > maxH) maxH = height;
  }
  return { width: maxW, height: maxH };
}

/**
 * The pile's footprint rectangle in its own coordinate frame (world for root
 * piles, zone-local otherwise), centred on the pile position.
 */
export function pileRect(state: TabletopState, templates: Templates, pile: Pile): Rect {
  const { width, height } = pileFootprint(state, templates, pile);
  return { x: pile.x - width / 2, y: pile.y - height / 2, width, height };
}
