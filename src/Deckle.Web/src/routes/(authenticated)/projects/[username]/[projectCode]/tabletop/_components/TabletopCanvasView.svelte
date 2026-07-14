<script lang="ts">
  // The canvas viewport: the pan/zoom surface and the world-space contents. All
  // its DOM events are wired to the canvas controller; the element itself is
  // bound back to the shell (which owns the ref for the controller's accessors).
  import type { TabletopViewport } from '$lib/tabletop';
  import type { TabletopCanvas } from './tabletopCanvas.svelte';
  import TabletopSurface from './TabletopSurface.svelte';

  let {
    canvas,
    viewport,
    canvasEl = $bindable(null)
  }: {
    canvas: TabletopCanvas;
    viewport: TabletopViewport;
    canvasEl?: HTMLDivElement | null;
  } = $props();
</script>

<div
  bind:this={canvasEl}
  class="canvas"
  class:drop-target={canvas.isDropTarget}
  onpointerdown={canvas.handleCanvasPointerDown}
  oncontextmenu={canvas.handleCanvasContextMenu}
  onwheel={canvas.handleWheel}
  ondragover={canvas.handleCanvasDragOver}
  ondragleave={canvas.handleCanvasDragLeave}
  ondrop={canvas.handleCanvasDrop}
  role="application"
  aria-label="Tabletop sandbox"
>
  <div
    class="canvas-surface"
    style="transform: translate({viewport.panX}px, {viewport.panY}px) scale({viewport.zoom}); transform-origin: 0 0;"
  >
    <TabletopSurface />
  </div>
</div>

<style>
  .canvas {
    flex: 1;
    overflow: hidden;
    position: relative;
    cursor: default;
    transition: box-shadow 0.15s;
  }

  .canvas.drop-target {
    box-shadow: inset 0 0 0 2px #3b82f6;
  }

  .canvas-surface {
    position: absolute;
    top: 0;
    left: 0;
    /* Pure transform anchor — piles render at any coordinate, clipped
       only by the viewport. */
    width: 0;
    height: 0;
    overflow: visible;
  }
</style>
