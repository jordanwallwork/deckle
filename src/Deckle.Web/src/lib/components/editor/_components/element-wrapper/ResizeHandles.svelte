<script lang="ts">
  import { templateStore } from '$lib/stores/templateElements';
  import type { TemplateElement } from '../../types';
  import { getContext } from 'svelte';
  import ResizeHandle from './ResizeHandle.svelte';

  let { element }: { element: TemplateElement } = $props();

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

  // Track if we're currently resizing
  let isResizing = $state(false);
  let resizeHandle = $state<string | null>(null);
  let startX = $state(0);
  let startY = $state(0);
  let startWidth = $state(0);
  let startHeight = $state(0);
  let startLeft = $state(0);
  let startTop = $state(0);
  let shiftPressed = $state(false);

  // Current resize preview dimensions (updated during drag)
  let previewWidth = $state(0);
  let previewHeight = $state(0);
  let previewX = $state(0);
  let previewY = $state(0);

  // Reference to the resize handles container
  let resizeHandlesEl: HTMLDivElement;

  // Track which dimensions need to be converted from percentage to pixels
  let convertWidthToPx = $state(false);
  let convertHeightToPx = $state(false);

  // Helper function to snap a value to grid
  function snapToGrid(value: number): number {
    if (!gridSnapContext || !gridSnapContext.isEnabled() || shiftPressed) {
      return Math.round(value);
    }
    const gridSize = gridSnapContext.getSize();
    return Math.round(value / gridSize) * gridSize;
  }

  // Get current dimensions
  function getCurrentDimensions() {
    const dims = element.type === 'container' || element.type === 'text' || element.type === 'image'
      ? (element as any).dimensions
      : undefined;

    const width = dims?.width;
    const height = dims?.height;

    return {
      width: typeof width === 'number' ? width : 100,
      height: typeof height === 'number' ? height : 100
    };
  }

  // Get actual rendered dimensions from the DOM element
  function getRenderedDimensions(targetElement: HTMLElement) {
    // For images, we need to get the img element's dimensions
    if (element.type === 'image') {
      const imgElement = targetElement.querySelector('img');
      if (imgElement) {
        return {
          width: imgElement.offsetWidth,
          height: imgElement.offsetHeight
        };
      }
    }

    return {
      width: targetElement.offsetWidth,
      height: targetElement.offsetHeight
    };
  }

  function handleMouseDown(handle: string, e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    isResizing = true;
    resizeHandle = handle;
    startX = e.clientX;
    startY = e.clientY;

    const dims = getCurrentDimensions();
    startLeft = element.x || 0;
    startTop = element.y || 0;

    // Get the actual element being resized (parent of resize handles)
    const targetElement = resizeHandlesEl?.parentElement;

    // Check if dimensions are percentages and need conversion
    const elementDims = element.type === 'container' || element.type === 'text' || element.type === 'image'
      ? (element as any).dimensions
      : undefined;

    const widthIsPercentage = typeof elementDims?.width === 'string' && elementDims.width.includes('%');
    const heightIsPercentage = typeof elementDims?.height === 'string' && elementDims.height.includes('%');

    // If dimensions are percentages, get the actual rendered pixel size
    if (targetElement && (widthIsPercentage || heightIsPercentage)) {
      const rendered = getRenderedDimensions(targetElement);

      startWidth = widthIsPercentage ? rendered.width : dims.width;
      startHeight = heightIsPercentage ? rendered.height : dims.height;

      // Mark which dimensions need to be converted to pixels
      convertWidthToPx = widthIsPercentage;
      convertHeightToPx = heightIsPercentage;
    } else {
      startWidth = dims.width;
      startHeight = dims.height;
      convertWidthToPx = false;
      convertHeightToPx = false;
    }

    // Initialize preview dimensions
    previewWidth = startWidth;
    previewHeight = startHeight;
    previewX = startLeft;
    previewY = startTop;

    // Disable panning during resize
    const panzoom = getPanzoom();
    if (panzoom) {
      panzoom.setOptions({ disablePan: true });
    }

    // Save to history once at the start of the drag operation
    // This ensures undo reverts to the initial size, not each pixel change
    templateStore.saveToHistory();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isResizing || !resizeHandle) return;

    // Track shift key state
    shiftPressed = e.shiftKey;

    // Get current zoom scale and adjust deltas accordingly
    // When zoomed in (scale > 1), mouse moves more pixels on screen than in element space
    // When zoomed out (scale < 1), mouse moves fewer pixels on screen than in element space
    const scale = getZoomScale();
    const deltaX = (e.clientX - startX) / scale;
    const deltaY = (e.clientY - startY) / scale;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newX = startLeft;
    let newY = startTop;

    // Calculate new dimensions based on which handle is being dragged
    // Apply grid snapping to dimensions and positions
    switch (resizeHandle) {
      case 'nw':
        newWidth = snapToGrid(Math.max(20, startWidth - deltaX));
        newHeight = snapToGrid(Math.max(20, startHeight - deltaY));
        newX = snapToGrid(startLeft + (startWidth - newWidth));
        newY = snapToGrid(startTop + (startHeight - newHeight));
        break;
      case 'n':
        newHeight = snapToGrid(Math.max(20, startHeight - deltaY));
        newY = snapToGrid(startTop + (startHeight - newHeight));
        break;
      case 'ne':
        newWidth = snapToGrid(Math.max(20, startWidth + deltaX));
        newHeight = snapToGrid(Math.max(20, startHeight - deltaY));
        newY = snapToGrid(startTop + (startHeight - newHeight));
        break;
      case 'e':
        newWidth = snapToGrid(Math.max(20, startWidth + deltaX));
        break;
      case 'se':
        newWidth = snapToGrid(Math.max(20, startWidth + deltaX));
        newHeight = snapToGrid(Math.max(20, startHeight + deltaY));
        break;
      case 's':
        newHeight = snapToGrid(Math.max(20, startHeight + deltaY));
        break;
      case 'sw':
        newWidth = snapToGrid(Math.max(20, startWidth - deltaX));
        newHeight = snapToGrid(Math.max(20, startHeight + deltaY));
        newX = snapToGrid(startLeft + (startWidth - newWidth));
        break;
      case 'w':
        newWidth = snapToGrid(Math.max(20, startWidth - deltaX));
        newX = snapToGrid(startLeft + (startWidth - newWidth));
        break;
    }

    // Store preview dimensions for potential use
    previewWidth = newWidth;
    previewHeight = newHeight;
    previewX = newX;
    previewY = newY;

    // Update the element's dimensions in real-time
    // Use updateElementWithoutHistory to avoid creating a history entry for each pixel change
    // History is saved once at the start of the drag operation
    const updates: any = {
      dimensions: {
        ...(element.type === 'container' || element.type === 'text' || element.type === 'image' ? (element as any).dimensions : {})
      }
    };

    // Only update dimensions that are actually being changed by the resize handle
    // This preserves the unit (px vs %) of dimensions that aren't being resized
    const widthChanged = newWidth !== startWidth;
    const heightChanged = newHeight !== startHeight;

    // Always update if we're converting from percentage to pixels (even if size hasn't changed yet)
    // This prevents the element from jumping when starting to drag a percentage dimension
    if (widthChanged || convertWidthToPx) {
      updates.dimensions.width = newWidth;
    }
    if (heightChanged || convertHeightToPx) {
      updates.dimensions.height = newHeight;
    }

    // After first update, clear the conversion flags
    if (convertWidthToPx) convertWidthToPx = false;
    if (convertHeightToPx) convertHeightToPx = false;

    // If position changed (for handles that move the element), update x/y
    if (newX !== startLeft) {
      updates.x = newX;
    }
    if (newY !== startTop) {
      updates.y = newY;
    }

    // Update immediately for real-time feedback without saving to history
    templateStore.updateElementWithoutHistory(element.id, updates);
  }

  function handleMouseUp() {
    isResizing = false;
    resizeHandle = null;

    // Re-enable panning
    const panzoom = getPanzoom();
    if (panzoom) {
      panzoom.setOptions({ disablePan: false });
    }

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

<div bind:this={resizeHandlesEl} class="resize-handles panzoom-exclude" style="--inverse-scale: {inverseScale}">
  <!-- Corner handles -->
  <ResizeHandle position="nw" {inverseScale} onmousedown={(e) => handleMouseDown('nw', e)} />
  <ResizeHandle position="ne" {inverseScale} onmousedown={(e) => handleMouseDown('ne', e)} />
  <ResizeHandle position="se" {inverseScale} onmousedown={(e) => handleMouseDown('se', e)} />
  <ResizeHandle position="sw" {inverseScale} onmousedown={(e) => handleMouseDown('sw', e)} />

  <!-- Edge handles -->
  <ResizeHandle position="n" {inverseScale} onmousedown={(e) => handleMouseDown('n', e)} />
  <ResizeHandle position="e" {inverseScale} onmousedown={(e) => handleMouseDown('e', e)} />
  <ResizeHandle position="s" {inverseScale} onmousedown={(e) => handleMouseDown('s', e)} />
  <ResizeHandle position="w" {inverseScale} onmousedown={(e) => handleMouseDown('w', e)} />
</div>

<style>
  .resize-handles {
    position: absolute;
    inset: calc(-4px * var(--inverse-scale));
    pointer-events: none;
  }
</style>
