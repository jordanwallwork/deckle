import { describe, it, expect } from 'vitest';
import {
  IDENTITY_VIEWPORT,
  ZOOM_MAX,
  ZOOM_MIN,
  fitViewport,
  panBy,
  screenToWorld,
  tableBoundingBox,
  worldToScreen,
  zoomBy,
  zoomTo,
  type Viewport
} from './viewport';
import { pileWorldRect, zoneWorldRect } from './geometry';
import {
  cardTemplate,
  makeTemplates,
  singleCardPile,
  stateWithPiles,
  withZone
} from './fixtures';

const templates = makeTemplates(cardTemplate());
const at = (x: number, y: number) => ({ x, y });

describe('viewport — world↔screen transform', () => {
  it('round-trips a world point through screen space at an offset zoom', () => {
    const vp: Viewport = { panX: 120, panY: -40, zoom: 1.5 };
    const world = at(37, 512);
    const back = screenToWorld(vp, worldToScreen(vp, world));
    expect(back.x).toBeCloseTo(world.x);
    expect(back.y).toBeCloseTo(world.y);
  });

  it('reaches world points at large negative and positive coordinates', () => {
    const vp: Viewport = { panX: 0, panY: 0, zoom: 1 };
    // A pile placed far off-origin still maps to a finite, invertible screen
    // position — the world is unbounded, not a sized box.
    for (const world of [at(-8000, -6000), at(9999, 12345)]) {
      const screen = worldToScreen(vp, world);
      expect(Number.isFinite(screen.x)).toBe(true);
      const back = screenToWorld(vp, screen);
      expect(back.x).toBeCloseTo(world.x);
      expect(back.y).toBeCloseTo(world.y);
    }
  });
});

describe('viewport — pointer-anchored zoom', () => {
  it('keeps the world point under the cursor fixed when zooming in', () => {
    const vp: Viewport = { panX: 50, panY: 30, zoom: 1 };
    const cursor = at(220, 160);
    const worldUnderCursor = screenToWorld(vp, cursor);

    const zoomed = zoomBy(vp, cursor, 2);

    expect(zoomed.zoom).toBe(2);
    const after = screenToWorld(zoomed, cursor);
    expect(after.x).toBeCloseTo(worldUnderCursor.x);
    expect(after.y).toBeCloseTo(worldUnderCursor.y);
  });

  it('keeps the anchor fixed across a sequence of zoom steps (in then out)', () => {
    const cursor = at(300, 200);
    let vp: Viewport = { panX: 10, panY: 5, zoom: 1 };
    const world = screenToWorld(vp, cursor);
    for (const factor of [1.3, 1.3, 0.5, 0.7, 2]) {
      vp = zoomBy(vp, cursor, factor);
      const now = screenToWorld(vp, cursor);
      expect(now.x).toBeCloseTo(world.x);
      expect(now.y).toBeCloseTo(world.y);
    }
  });

  it('clamps zoom to the 0.25–3 limits while still anchoring the cursor', () => {
    const cursor = at(100, 100);
    const start: Viewport = { panX: 0, panY: 0, zoom: 1 };
    const world = screenToWorld(start, cursor);

    const zoomedIn = zoomBy(start, cursor, 100);
    expect(zoomedIn.zoom).toBe(ZOOM_MAX);
    expect(screenToWorld(zoomedIn, cursor).x).toBeCloseTo(world.x);

    const zoomedOut = zoomBy(start, cursor, 0.0001);
    expect(zoomedOut.zoom).toBe(ZOOM_MIN);
    expect(screenToWorld(zoomedOut, cursor).y).toBeCloseTo(world.y);
  });

  it('zoomTo sets an absolute level anchored at the point', () => {
    const cursor = at(400, 250);
    const vp: Viewport = { panX: 60, panY: 20, zoom: 1.4 };
    const world = screenToWorld(vp, cursor);
    const next = zoomTo(vp, cursor, 2.5);
    expect(next.zoom).toBe(2.5);
    expect(screenToWorld(next, cursor).x).toBeCloseTo(world.x);
    expect(screenToWorld(next, cursor).y).toBeCloseTo(world.y);
  });
});

describe('viewport — pan accumulation', () => {
  it('sums successive screen-space deltas and leaves zoom untouched', () => {
    let vp: Viewport = { panX: 0, panY: 0, zoom: 1.5 };
    vp = panBy(vp, 10, -5);
    vp = panBy(vp, 30, 15);
    vp = panBy(vp, -4, 100);
    expect(vp.panX).toBe(36);
    expect(vp.panY).toBe(110);
    expect(vp.zoom).toBe(1.5);
  });

  it('shifts the world point under a fixed screen position by delta/zoom', () => {
    const vp: Viewport = { panX: 0, panY: 0, zoom: 2 };
    const screen = at(100, 100);
    const before = screenToWorld(vp, screen);
    const panned = panBy(vp, 40, 20);
    const after = screenToWorld(panned, screen);
    // Panning the viewport right by 40 screen px reveals world 20 px to the left.
    expect(after.x).toBeCloseTo(before.x - 20);
    expect(after.y).toBeCloseTo(before.y - 10);
  });
});

describe('viewport — table bounding box', () => {
  const CANVAS = { width: 800, height: 600 };

  it('is null for an empty table', () => {
    expect(tableBoundingBox(stateWithPiles(), templates)).toBeNull();
  });

  it('frames a table of only loose root piles', () => {
    const state = stateWithPiles(
      singleCardPile('p1', 'c1', 0, 0),
      singleCardPile('p2', 'c2', 400, 300)
    );
    const box = tableBoundingBox(state, templates)!;
    const r1 = pileWorldRect(state, templates, state.piles.p1);
    const r2 = pileWorldRect(state, templates, state.piles.p2);
    expect(box.x).toBeCloseTo(Math.min(r1.x, r2.x));
    expect(box.y).toBeCloseTo(Math.min(r1.y, r2.y));
    expect(box.x + box.width).toBeCloseTo(Math.max(r1.x + r1.width, r2.x + r2.width));
    expect(box.y + box.height).toBeCloseTo(Math.max(r1.y + r1.height, r2.y + r2.height));
  });

  it('frames a table of only zones', () => {
    let state = stateWithPiles();
    state = withZone(state, { id: 'z1', x: 100, y: 100, width: 400, height: 300 });
    const box = tableBoundingBox(state, templates)!;
    const zr = zoneWorldRect(state, state.zones.z1);
    expect(box).toEqual(zr);
  });

  it('spans both zones and loose piles when the table has both', () => {
    let state = stateWithPiles(singleCardPile('p1', 'c1', 900, 700));
    state = withZone(state, { id: 'z1', x: -100, y: -50, width: 200, height: 150 });
    const box = tableBoundingBox(state, templates)!;
    // The zone sits top-left of the origin; the pile bottom-right of it.
    expect(box.x).toBeCloseTo(-100);
    expect(box.y).toBeCloseTo(-50);
    const pr = pileWorldRect(state, templates, state.piles.p1);
    expect(box.x + box.width).toBeCloseTo(pr.x + pr.width);
    expect(box.y + box.height).toBeCloseTo(pr.y + pr.height);
  });

  it('frames piles placed at large negative coordinates', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1', -5000, -4000));
    const box = tableBoundingBox(state, templates)!;
    const vp = fitViewport(box, CANVAS);
    // The far-off pile's centre lands at the canvas centre once fitted.
    const centreScreen = worldToScreen(vp, at(-5000, -4000));
    expect(centreScreen.x).toBeCloseTo(CANVAS.width / 2);
    expect(centreScreen.y).toBeCloseTo(CANVAS.height / 2);
  });
});

describe('viewport — fit-view framing', () => {
  const CANVAS = { width: 800, height: 600 };

  it('resets to the identity viewport for a null (empty-table) box', () => {
    expect(fitViewport(null, CANVAS)).toEqual(IDENTITY_VIEWPORT);
  });

  it('centres the content box in the canvas', () => {
    const box = { x: 200, y: 100, width: 400, height: 200 };
    const vp = fitViewport(box, CANVAS);
    const centre = worldToScreen(vp, at(box.x + box.width / 2, box.y + box.height / 2));
    expect(centre.x).toBeCloseTo(CANVAS.width / 2);
    expect(centre.y).toBeCloseTo(CANVAS.height / 2);
  });

  it('fits the whole box inside the padded viewport', () => {
    const box = { x: -500, y: -500, width: 2000, height: 1500 };
    const padding = 40;
    const vp = fitViewport(box, CANVAS, padding);
    const topLeft = worldToScreen(vp, at(box.x, box.y));
    const bottomRight = worldToScreen(vp, at(box.x + box.width, box.y + box.height));
    expect(topLeft.x).toBeGreaterThanOrEqual(padding - 0.001);
    expect(topLeft.y).toBeGreaterThanOrEqual(padding - 0.001);
    expect(bottomRight.x).toBeLessThanOrEqual(CANVAS.width - padding + 0.001);
    expect(bottomRight.y).toBeLessThanOrEqual(CANVAS.height - padding + 0.001);
  });

  it('clamps the fit zoom to the maximum for tiny content', () => {
    const box = { x: 0, y: 0, width: 4, height: 4 };
    const vp = fitViewport(box, CANVAS);
    expect(vp.zoom).toBe(ZOOM_MAX);
  });

  it('clamps the fit zoom to the minimum for enormous content', () => {
    const box = { x: 0, y: 0, width: 100000, height: 100000 };
    const vp = fitViewport(box, CANVAS);
    expect(vp.zoom).toBe(ZOOM_MIN);
  });

  it('centres a zero-area box at zoom 1 rather than dividing by zero', () => {
    const box = { x: 250, y: 150, width: 0, height: 0 };
    const vp = fitViewport(box, CANVAS);
    expect(vp.zoom).toBe(1);
    const centre = worldToScreen(vp, at(250, 150));
    expect(centre.x).toBeCloseTo(CANVAS.width / 2);
    expect(centre.y).toBeCloseTo(CANVAS.height / 2);
  });
});
