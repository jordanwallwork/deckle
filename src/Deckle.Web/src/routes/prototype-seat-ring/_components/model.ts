// PROTOTYPE — throwaway (wayfinder ticket #109). Seat-template + ring geometry shared by both variants.

/** A zone inside the seat blueprint, in local panel coordinates (origin top-left). */
export interface BlueprintZone {
  role: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The sample seat template from the ticket: hand + tableau + discard. Panel is 300×150 units. */
export const SEAT_W = 300;
export const SEAT_H = 150;
export const seatTemplate: BlueprintZone[] = [
  { role: 'tableau', x: 10, y: 10, w: 180, h: 75 },
  { role: 'discard', x: 200, y: 10, w: 90, h: 75 },
  { role: 'hand', x: 10, y: 95, w: 280, h: 45 }
];

export const EDGE_W = 130;
export const EDGE_H = 80;

export const PLAYER_COLORS = [
  '#e05d5d',
  '#4d96d9',
  '#5cb85c',
  '#e8b93e',
  '#9b6dd6',
  '#e07f3e',
  '#4dbdbd',
  '#d66dae'
];

export interface StampedSeat {
  seatIndex: number;
  /** angle from 12 o'clock, clockwise, degrees */
  angleDeg: number;
  color: string;
}

export interface StampedEdge {
  edgeIndex: number;
  /** the two adjacent seats on the ring */
  between: [number, number];
  angleDeg: number;
}

export interface RingKnobs {
  playerCount: number;
  /** distance from table center to seat panel center */
  radius: number;
  /** where seat 1 sits on the ring, degrees from 12 o'clock */
  seatOneAngle: number;
  /** uniform scale applied to seat panels */
  seatScale: number;
}

/** Pure ring math per #102: N seats, always N edges, edge i midway between seats i and i+1. */
export function stampRing(knobs: RingKnobs): { seats: StampedSeat[]; edges: StampedEdge[] } {
  const n = knobs.playerCount;
  const step = 360 / n;
  const seats: StampedSeat[] = [];
  const edges: StampedEdge[] = [];
  for (let i = 0; i < n; i++) {
    seats.push({
      seatIndex: i,
      angleDeg: knobs.seatOneAngle + i * step,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length]
    });
    edges.push({
      edgeIndex: i,
      between: [i, (i + 1) % n],
      angleDeg: knobs.seatOneAngle + (i + 0.5) * step
    });
  }
  return { seats, edges };
}

/** Polar → cartesian around a center; angle measured from 12 o'clock, clockwise. */
export function polar(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) };
}

/** Ring order starting after the viewer and wrapping — the order BGA rows lays other players out in. */
export function ringOrderFrom(viewer: number, n: number): number[] {
  const order: number[] = [];
  for (let i = 1; i < n; i++) order.push((viewer + i) % n);
  return order;
}
