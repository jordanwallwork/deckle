<script lang="ts">
  import { getTabletopApi } from '$lib/tabletop';

  let {
    zoom,
    onZoomChange,
    onFitView
  }: { zoom: number; onZoomChange: (z: number) => void; onFitView: () => void } = $props();

  const store = getTabletopApi();

  const zoomPercentage = $derived(Math.round(zoom * 100));

  function zoomIn() {
    onZoomChange(Math.min(3, zoom + 0.25));
  }

  function zoomOut() {
    onZoomChange(Math.max(0.25, zoom - 0.25));
  }

  function resetZoom() {
    onZoomChange(1);
  }

  const entityCount = $derived(Object.keys(store.state.entities).length);
  const zoneCount = $derived(store.state.zoneOrder.length);
</script>

<div class="toolbar">
  <div class="toolbar-group">
    <span class="toolbar-label">Tabletop</span>
    <span class="toolbar-info">{entityCount} entities · {zoneCount} zones</span>
  </div>

  <div class="toolbar-group">
    <button
      class="tool-btn"
      onclick={() => store.undo()}
      disabled={!store.canUndo}
      title="Undo (Ctrl+Z)"
    >
      ↩
    </button>
    <button
      class="tool-btn"
      onclick={() => store.redo()}
      disabled={!store.canRedo}
      title="Redo (Ctrl+Y)"
    >
      ↪
    </button>
  </div>

  <div class="toolbar-group">
    <button class="tool-btn" onclick={zoomOut} disabled={zoom <= 0.25} title="Zoom out">−</button>
    <button class="zoom-reset" onclick={resetZoom} title="Reset zoom">{zoomPercentage}%</button>
    <button class="tool-btn" onclick={zoomIn} disabled={zoom >= 3} title="Zoom in">+</button>
    <button class="tool-btn reset-btn" onclick={onFitView} title="Fit all components to screen">
      Reset
    </button>
  </div>

  <div class="toolbar-group shortcuts">
    <span class="shortcut"><kbd>F</kbd> Flip</span>
    <span class="shortcut"><kbd>R</kbd> Rotate</span>
    <span class="shortcut"><kbd>S</kbd> Shuffle</span>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background: #1e2030;
    border-bottom: 1px solid #3a3d4e;
    flex-shrink: 0;
    color: #c8cad8;
    font-size: 0.8125rem;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .toolbar-label {
    font-weight: 600;
    color: #e8e9f0;
    margin-right: 0.25rem;
  }

  .toolbar-info {
    color: #8b8ea0;
    font-size: 0.75rem;
  }

  .tool-btn,
  .zoom-reset {
    background: #2a2d3e;
    border: 1px solid #3a3d4e;
    color: #c8cad8;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: 0.8125rem;
    min-width: 1.75rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s;
  }

  .tool-btn:hover:not(:disabled),
  .zoom-reset:hover {
    background: #3a3d4e;
  }

  .tool-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .zoom-reset {
    min-width: 3rem;
    font-size: 0.75rem;
  }

  .reset-btn {
    min-width: auto;
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
  }

  .shortcuts {
    margin-left: auto;
    gap: 0.75rem;
  }

  .shortcut {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: #8b8ea0;
    font-size: 0.75rem;
  }

  kbd {
    background: #2a2d3e;
    border: 1px solid #3a3d4e;
    border-radius: 3px;
    padding: 0 0.3rem;
    font-family: inherit;
    font-size: 0.6875rem;
    color: #c8cad8;
  }
</style>
