// Thin reactive shell over the pure viewport math. Holds the current viewport
// as reactive state and delegates every transform to viewport.ts — components
// read the getters for the canvas CSS transform and screen↔world conversion.

import type { Point, Rect, Size } from './geometry';
import {
  IDENTITY_VIEWPORT,
  fitViewport,
  panBy,
  screenToWorld,
  worldToScreen,
  zoomBy,
  zoomTo,
  type Viewport
} from './viewport';

export function createViewport() {
  let vp = $state.raw<Viewport>(IDENTITY_VIEWPORT);

  return {
    get panX() {
      return vp.panX;
    },
    get panY() {
      return vp.panY;
    },
    get zoom() {
      return vp.zoom;
    },
    /** The raw viewport value (for passing to pure helpers). */
    get value() {
      return vp;
    },

    screenToWorld(screen: Point): Point {
      return screenToWorld(vp, screen);
    },
    worldToScreen(world: Point): Point {
      return worldToScreen(vp, world);
    },

    /** Accumulate a screen-space pan delta. */
    panBy(dx: number, dy: number): void {
      vp = panBy(vp, dx, dy);
    },
    /** Multiply the zoom, anchored at a screen point (wheel). */
    zoomBy(screen: Point, factor: number): void {
      vp = zoomBy(vp, screen, factor);
    },
    /** Set the zoom to a level, anchored at a screen point (toolbar buttons). */
    zoomTo(screen: Point, zoom: number): void {
      vp = zoomTo(vp, screen, zoom);
    },
    /** Frame a world-space box in a canvas of `size` (fit-view). */
    fit(box: Rect | null, size: Size, padding?: number): void {
      vp = fitViewport(box, size, padding);
    }
  };
}

export type TabletopViewport = ReturnType<typeof createViewport>;
