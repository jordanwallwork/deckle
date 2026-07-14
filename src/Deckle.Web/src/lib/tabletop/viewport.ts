// Pure viewport math: the world↔screen transform, pointer-anchored zoom,
// pan accumulation, and fit-view framing. The reactive shell
// (viewport.svelte.ts) is a thin wrapper; all the arithmetic lives here so
// synthetic inputs drive it in tests (see SPEC "Viewport" + "Testing").
//
// Coordinate model: "screen" is a point relative to the canvas (viewport)
// top-left. A world point maps to screen via `world * zoom + pan`; the
// canvas-surface's CSS `translate(pan) scale(zoom)` realises exactly this.
// The world is unbounded — the surface is a transform anchor, not a sized
// box — so any world coordinate is reachable at any pan/zoom.

import type { Point, Rect, Size } from './geometry';
import { pileWorldRect, zoneWorldRect } from './geometry';
import type { TabletopState, Templates } from './types';

/** Zoom limits, carried over from v1. */
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 3;

/** Screen-space padding fit-view leaves around the framed content. */
export const FIT_PADDING = 40;

export interface Viewport {
  /** Screen-px offset of the world origin (world 0,0 renders here). */
  panX: number;
  panY: number;
  /** Screen px per world px. */
  zoom: number;
}

export const IDENTITY_VIEWPORT: Viewport = { panX: 0, panY: 0, zoom: 1 };

export function clampZoom(zoom: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
}

/** World point → screen point (relative to the canvas top-left). */
export function worldToScreen(vp: Viewport, world: Point): Point {
  return { x: world.x * vp.zoom + vp.panX, y: world.y * vp.zoom + vp.panY };
}

/** Screen point (relative to the canvas top-left) → world point. */
export function screenToWorld(vp: Viewport, screen: Point): Point {
  return { x: (screen.x - vp.panX) / vp.zoom, y: (screen.y - vp.panY) / vp.zoom };
}

/**
 * Set the zoom to `rawZoom` (clamped) while keeping the world point currently
 * under `screen` fixed under `screen` — the anchor stays put at every level.
 * This is the fix for v1's drift toward the origin.
 */
export function zoomTo(vp: Viewport, screen: Point, rawZoom: number): Viewport {
  const zoom = clampZoom(rawZoom);
  const world = screenToWorld(vp, screen);
  return { zoom, panX: screen.x - world.x * zoom, panY: screen.y - world.y * zoom };
}

/** Multiply the zoom by `factor` (clamped), anchored at `screen`. Wheel zoom. */
export function zoomBy(vp: Viewport, screen: Point, factor: number): Viewport {
  return zoomTo(vp, screen, vp.zoom * factor);
}

/** Shift the viewport by a screen-space delta. Pan accumulates across frames. */
export function panBy(vp: Viewport, dx: number, dy: number): Viewport {
  return { ...vp, panX: vp.panX + dx, panY: vp.panY + dy };
}

/**
 * The world-space bounding box of everything on the table: every zone's
 * rectangle (top-level and nested) *and* every pile's actual footprint
 * (root or contained, including rotation/size overhang past its zone).
 * Null when the table is empty. `state.zones`/`state.piles` are already flat
 * by id, so no recursion is needed — walking every entry covers nesting for
 * free. Zones do not clip pile overhang (SPEC "Rendering"), so fit-view must
 * not clip it either (story 8, story 52).
 */
export function tableBoundingBox(state: TabletopState, templates: Templates): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let any = false;

  const include = (r: Rect) => {
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.x + r.width > maxX) maxX = r.x + r.width;
    if (r.y + r.height > maxY) maxY = r.y + r.height;
    any = true;
  };

  for (const zone of Object.values(state.zones)) {
    include(zoneWorldRect(state, zone));
  }
  for (const pile of Object.values(state.piles)) {
    include(pileWorldRect(state, templates, pile));
  }

  if (!any) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * The viewport that frames `box` centred in a canvas of `size` with `padding`
 * around it, zoom clamped to the same limits as manual zoom. A null box (empty
 * table) resets to the identity viewport; a zero-area box (a single point)
 * centres at zoom 1 rather than dividing by zero.
 */
export function fitViewport(box: Rect | null, size: Size, padding = FIT_PADDING): Viewport {
  if (!box) return IDENTITY_VIEWPORT;

  const availableWidth = Math.max(1, size.width - padding * 2);
  const availableHeight = Math.max(1, size.height - padding * 2);
  const zoomX = box.width > 0 ? availableWidth / box.width : Infinity;
  const zoomY = box.height > 0 ? availableHeight / box.height : Infinity;
  const rawZoom = Math.min(zoomX, zoomY);
  const zoom = clampZoom(Number.isFinite(rawZoom) ? rawZoom : 1);

  return {
    zoom,
    panX: size.width / 2 - (box.x + box.width / 2) * zoom,
    panY: size.height / 2 - (box.y + box.height / 2) * zoom
  };
}
