// Pure geometry helpers: physical-scale sizing and derived pile footprints.
// Nothing here caches sizes — footprints are always derived on demand from
// cards' templates and rotations (see SPEC "No cached sizes anywhere").

import type { Card, Pile, TabletopState, Template, Templates, Zone } from './types';

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

export function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/** The normalized rectangle spanning two corner points (in any order). */
export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y)
  };
}

function projectRange(points: Point[], axis: Point): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    const d = p.x * axis.x + p.y * axis.y;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return [min, max];
}

/**
 * Whether a rectangle of `size` centred at `center` and rotated by
 * `rotationDeg` intersects the axis-aligned `rect`. Separating-axis test
 * over the four candidate edge normals, so it is exact for any rotation
 * angle — not a bounding-box approximation.
 */
export function rotatedRectIntersectsRect(
  center: Point,
  size: Size,
  rotationDeg: number,
  rect: Rect
): boolean {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = size.width / 2;
  const hh = size.height / 2;
  const corners: Point[] = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh }
  ].map((p) => ({
    x: center.x + p.x * cos - p.y * sin,
    y: center.y + p.x * sin + p.y * cos
  }));
  const rectCorners: Point[] = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height }
  ];
  const axes: Point[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: cos, y: sin },
    { x: -sin, y: cos }
  ];
  for (const axis of axes) {
    const [minA, maxA] = projectRange(corners, axis);
    const [minB, maxB] = projectRange(rectCorners, axis);
    if (maxA < minB || maxB < minA) return false;
  }
  return true;
}

// ─── World-position helpers ────────────────────────────────────────────────
// The SPEC's coordinate discipline: operation inputs/outputs are world-space;
// zone-local storage is converted at the operation boundary through these
// helpers — nowhere else — so nested contents can never jump.

/**
 * World-space top-left of a zone. Top-level zones store world coordinates
 * directly; nested zones store parent-local, so walk the ancestry chain.
 */
export function zoneWorldOrigin(state: TabletopState, zone: Zone): Point {
  let x = zone.x;
  let y = zone.y;
  let parentId = zone.parentZoneId;
  while (parentId !== undefined) {
    const parent = state.zones[parentId];
    if (!parent) break;
    x += parent.x;
    y += parent.y;
    parentId = parent.parentZoneId;
  }
  return { x, y };
}

/** The zone's rectangle in world space. */
export function zoneWorldRect(state: TabletopState, zone: Zone): Rect {
  const origin = zoneWorldOrigin(state, zone);
  return { x: origin.x, y: origin.y, width: zone.width, height: zone.height };
}

/** Convert a world point to a zone's local frame. */
export function worldToZoneLocal(state: TabletopState, zone: Zone, world: Point): Point {
  const origin = zoneWorldOrigin(state, zone);
  return { x: world.x - origin.x, y: world.y - origin.y };
}

/** Convert a zone-local point to world space. */
export function zoneLocalToWorld(state: TabletopState, zone: Zone, local: Point): Point {
  const origin = zoneWorldOrigin(state, zone);
  return { x: local.x + origin.x, y: local.y + origin.y };
}

/**
 * A pile's centre in world space — pile.x/y is already world for root piles,
 * zone-local otherwise.
 */
export function pileWorldCenter(state: TabletopState, pile: Pile): Point {
  if (pile.zoneId === null) return { x: pile.x, y: pile.y };
  const zone = state.zones[pile.zoneId];
  if (!zone) return { x: pile.x, y: pile.y };
  return zoneLocalToWorld(state, zone, { x: pile.x, y: pile.y });
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
 * The pile's footprint rectangle in world space, centred on the pile's world
 * centre — hit-testing and drop resolution always work in world coordinates.
 */
export function pileWorldRect(state: TabletopState, templates: Templates, pile: Pile): Rect {
  const { width, height } = pileFootprint(state, templates, pile);
  const center = pileWorldCenter(state, pile);
  return { x: center.x - width / 2, y: center.y - height / 2, width, height };
}

/**
 * Whether any of the pile's cards intersects the world-space rect — each card
 * tested as its true rotated rectangle centred on the pile's world centre,
 * not the quarter-turn AABB. The marquee's rotation-aware hit test.
 */
export function pileIntersectsRect(
  state: TabletopState,
  templates: Templates,
  pile: Pile,
  rect: Rect
): boolean {
  const center = pileWorldCenter(state, pile);
  for (const cardId of pile.cardIds) {
    const card = state.cards[cardId];
    const template = card ? templates[card.templateId] : undefined;
    if (!card || !template) continue;
    if (rotatedRectIntersectsRect(center, templateDisplaySize(template), card.rotation, rect)) {
      return true;
    }
  }
  return false;
}
