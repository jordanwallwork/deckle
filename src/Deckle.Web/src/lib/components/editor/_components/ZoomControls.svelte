<script lang="ts">
  import type { PanzoomObject } from "@panzoom/panzoom";

  let { panzoomInstance }: { panzoomInstance: PanzoomObject | null } = $props();

  let currentZoom = $state(100);

  // Update zoom display when panzoom instance changes or zoom occurs
  $effect(() => {
    if (panzoomInstance) {
      // Set initial zoom
      const scale = panzoomInstance.getScale();
      currentZoom = Math.round(scale * 100);

      // Listen for zoom changes (from wheel, pinch, or programmatic changes)
      const handleZoomChange = () => {
        const scale = panzoomInstance!.getScale();
        currentZoom = Math.round(scale * 100);
      };

      // Get the element that panzoom is attached to
      const element = panzoomInstance.getElement();
      element.addEventListener('panzoomchange', handleZoomChange);

      // Cleanup listener when effect re-runs or component unmounts
      return () => {
        element.removeEventListener('panzoomchange', handleZoomChange);
      };
    }
  });

  function updateZoomDisplay() {
    if (panzoomInstance) {
      // Use setTimeout to allow panzoom to update before reading the scale
      setTimeout(() => {
        const scale = panzoomInstance.getScale();
        currentZoom = Math.round(scale * 100);
      }, 50);
    }
  }

  function zoomIn() {
    if (panzoomInstance) {
      panzoomInstance.zoomIn();
      updateZoomDisplay();
    }
  }

  function zoomOut() {
    if (panzoomInstance) {
      panzoomInstance.zoomOut();
      updateZoomDisplay();
    }
  }

  function resetZoom() {
    if (panzoomInstance) {
      panzoomInstance.reset();
      updateZoomDisplay();
    }
  }

  function handleZoomInput(e: Event) {
    const value = parseInt((e.target as HTMLInputElement).value);
    if (panzoomInstance && !isNaN(value)) {
      const scale = value / 100;
      panzoomInstance.zoom(scale, { animate: true });
      updateZoomDisplay();
    }
  }
</script>

<div class="zoom-controls">
  <div class="zoom-group">
    <button class="zoom-btn zoom-btn-left" onclick={zoomOut} title="Zoom out"> - </button>
    <div class="zoom-input-wrapper">
      <input
        type="number"
        class="zoom-input"
        value={currentZoom}
        oninput={handleZoomInput}
        min="10"
        max="500"
        step="1"
      />
      <span class="zoom-percent">%</span>
    </div>
    <button class="zoom-btn zoom-btn-right" onclick={zoomIn} title="Zoom in"> + </button>
  </div>
  <button class="zoom-btn" onclick={resetZoom} title="Reset zoom">
    Reset
  </button>
</div>

<style>
  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .zoom-group {
    display: flex;
    align-items: center;
  }

  .zoom-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .zoom-btn:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .zoom-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Button group styling - join buttons to input */
  .zoom-group .zoom-btn-left {
    border-radius: 4px 0 0 4px;
    border-right: none;
  }

  .zoom-group .zoom-btn-right {
    border-radius: 0 4px 4px 0;
    border-left: none;
  }

  .zoom-input-wrapper {
    display: flex;
    align-items: center;
    position: relative;
  }

  .zoom-input {
    padding: 0.25rem 1.5rem 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0;
    background: white;
    width: 3.5rem;
    text-align: right;
  }

  .zoom-input::-webkit-inner-spin-button,
  .zoom-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .zoom-input[type="number"] {
    -moz-appearance: textfield;
  }

  .zoom-percent {
    position: absolute;
    right: 0.5rem;
    font-size: 0.75rem;
    color: #6b7280;
    pointer-events: none;
  }
</style>
