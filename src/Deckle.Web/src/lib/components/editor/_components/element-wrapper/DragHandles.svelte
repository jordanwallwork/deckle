<script lang="ts">
  import { getContext } from 'svelte';
  import { templateStore } from '$lib/stores/templateElements';
  import type { TemplateElement } from '$lib/components/editor/types';

  let { element }: { element: TemplateElement } = $props();

  let isDragging = $state(false);
  let isHoveringEdge = $state(false);
  let startX = 0;
  let startY = 0;
  let initialX = 0;
  let initialY = 0;
  let shiftPressed = $state(false);

  // Get zoom scale from context (provided by ComponentViewer)
  const zoomContext = getContext<{ getScale: () => number }>('zoomScale');
  const getZoomScale = () => zoomContext?.getScale() ?? 1;

  // Calculate inverse scale for handle sizing (so handles stay constant size on screen)
  let inverseScale = $derived(1 / getZoomScale());

  // Get panzoom instance from context to disable/enable panning
  const panzoomContext = getContext<{ getInstance: () => any }>('panzoom');
  const getPanzoom = () => panzoomContext?.getInstance();

  // Get grid snap context
  const gridSnapContext = getContext<{
    isEnabled: () => boolean;
    getSize: () => number;
  }>('gridSnap');

  // Helper function to snap a value to grid
  function snapToGrid(value: number): number {
    if (!gridSnapContext || !gridSnapContext.isEnabled() || shiftPressed) {
      return Math.round(value);
    }
    const gridSize = gridSnapContext.getSize();
    return Math.round(value / gridSize) * gridSize;
  }

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialX = typeof element.x === 'number' ? element.x : parseFloat(String(element.x)) || 0;
    initialY = typeof element.y === 'number' ? element.y : parseFloat(String(element.y)) || 0;

    // Disable panning during drag
    const panzoom = getPanzoom();
    if (panzoom) {
      panzoom.setOptions({ disablePan: true });
    }

    // Save current state to history before starting drag
    templateStore.saveToHistory();

    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;

    // Track shift key state
    shiftPressed = e.shiftKey;

    const scale = getZoomScale();

    // Calculate delta accounting for zoom level
    const deltaX = (e.clientX - startX) / scale;
    const deltaY = (e.clientY - startY) / scale;

    // Update position with grid snapping
    const newX = snapToGrid(initialX + deltaX);
    const newY = snapToGrid(initialY + deltaY);

    // Update element without adding to history (for smooth dragging)
    templateStore.updateElementWithoutHistory(element.id, {
      x: newX,
      y: newY
    });
  }

  function handleMouseUp() {
    isDragging = false;

    // Re-enable panning
    const panzoom = getPanzoom();
    if (panzoom) {
      panzoom.setOptions({ disablePan: false });
    }

    // Remove global mouse event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }

  // Cleanup on unmount
  $effect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  });
</script>

<!-- Edge drag handles -->
<div
  class="drag-handles panzoom-exclude"
  class:dragging={isDragging}
  class:hovering={isHoveringEdge}
  style="--inverse-scale: {inverseScale}"
>
  <!-- Top edge -->
  <div
    class="drag-handle panzoom-exclude drag-handle-top"
    onmouseenter={() => (isHoveringEdge = true)}
    onmouseleave={() => (isHoveringEdge = false)}
    onmousedown={handleMouseDown}
    role="button"
    tabindex="-1"
  ></div>

  <!-- Right edge -->
  <div
    class="drag-handle panzoom-exclude drag-handle-right"
    onmouseenter={() => (isHoveringEdge = true)}
    onmouseleave={() => (isHoveringEdge = false)}
    onmousedown={handleMouseDown}
    role="button"
    tabindex="-1"
  ></div>

  <!-- Bottom edge -->
  <div
    class="drag-handle panzoom-exclude drag-handle-bottom"
    onmouseenter={() => (isHoveringEdge = true)}
    onmouseleave={() => (isHoveringEdge = false)}
    onmousedown={handleMouseDown}
    role="button"
    tabindex="-1"
  ></div>

  <!-- Left edge -->
  <div
    class="drag-handle panzoom-exclude drag-handle-left"
    onmouseenter={() => (isHoveringEdge = true)}
    onmouseleave={() => (isHoveringEdge = false)}
    onmousedown={handleMouseDown}
    role="button"
    tabindex="-1"
  ></div>
</div>

<style>
  .drag-handles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .drag-handle {
    position: absolute;
    background-color: rgba(59, 130, 246, 0.6);
    pointer-events: all;
    opacity: 0;
    transition: opacity 0.15s ease;
    touch-action: none;
    user-select: none;
    transform-origin: center;
  }

  .drag-handles.hovering .drag-handle,
  .drag-handles.dragging .drag-handle {
    opacity: 1;
  }

  /* Top edge */
  .drag-handle-top {
    top: calc(-3px * var(--inverse-scale));
    left: 0;
    right: 0;
    height: calc(6px * var(--inverse-scale));
    cursor: move;
  }

  /* Right edge */
  .drag-handle-right {
    top: 0;
    right: calc(-3px * var(--inverse-scale));
    bottom: 0;
    width: calc(6px * var(--inverse-scale));
    cursor: move;
  }

  /* Bottom edge */
  .drag-handle-bottom {
    bottom: calc(-3px * var(--inverse-scale));
    left: 0;
    right: 0;
    height: calc(6px * var(--inverse-scale));
    cursor: move;
  }

  /* Left edge */
  .drag-handle-left {
    top: 0;
    left: calc(-3px * var(--inverse-scale));
    bottom: 0;
    width: calc(6px * var(--inverse-scale));
    cursor: move;
  }
</style>
