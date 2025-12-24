<script lang="ts">
  import { templateStore } from '$lib/stores/templateElements';
  import type { TemplateElement } from '../types';

  let { element }: { element: TemplateElement } = $props();

  // Track if we're currently resizing
  let isResizing = $state(false);
  let resizeHandle = $state<string | null>(null);
  let startX = $state(0);
  let startY = $state(0);
  let startWidth = $state(0);
  let startHeight = $state(0);
  let startLeft = $state(0);
  let startTop = $state(0);

  // Current resize preview dimensions (updated during drag)
  let previewWidth = $state(0);
  let previewHeight = $state(0);
  let previewX = $state(0);
  let previewY = $state(0);

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

  function handleMouseDown(handle: string, e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    isResizing = true;
    resizeHandle = handle;
    startX = e.clientX;
    startY = e.clientY;

    const dims = getCurrentDimensions();
    startWidth = dims.width;
    startHeight = dims.height;
    startLeft = element.x || 0;
    startTop = element.y || 0;

    // Initialize preview dimensions
    previewWidth = startWidth;
    previewHeight = startHeight;
    previewX = startLeft;
    previewY = startTop;

    // Save to history once at the start of the drag operation
    // This ensures undo reverts to the initial size, not each pixel change
    templateStore.saveToHistory();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isResizing || !resizeHandle) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newX = startLeft;
    let newY = startTop;

    // Calculate new dimensions based on which handle is being dragged
    switch (resizeHandle) {
      case 'nw':
        newWidth = Math.max(20, startWidth - deltaX);
        newHeight = Math.max(20, startHeight - deltaY);
        newX = startLeft + (startWidth - newWidth);
        newY = startTop + (startHeight - newHeight);
        break;
      case 'n':
        newHeight = Math.max(20, startHeight - deltaY);
        newY = startTop + (startHeight - newHeight);
        break;
      case 'ne':
        newWidth = Math.max(20, startWidth + deltaX);
        newHeight = Math.max(20, startHeight - deltaY);
        newY = startTop + (startHeight - newHeight);
        break;
      case 'e':
        newWidth = Math.max(20, startWidth + deltaX);
        break;
      case 'se':
        newWidth = Math.max(20, startWidth + deltaX);
        newHeight = Math.max(20, startHeight + deltaY);
        break;
      case 's':
        newHeight = Math.max(20, startHeight + deltaY);
        break;
      case 'sw':
        newWidth = Math.max(20, startWidth - deltaX);
        newHeight = Math.max(20, startHeight + deltaY);
        newX = startLeft + (startWidth - newWidth);
        break;
      case 'w':
        newWidth = Math.max(20, startWidth - deltaX);
        newX = startLeft + (startWidth - newWidth);
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
        ...(element.type === 'container' || element.type === 'text' || element.type === 'image' ? (element as any).dimensions : {}),
        width: newWidth,
        height: newHeight
      }
    };

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

<div class="resize-handles">
  <!-- Corner handles -->
  <div
    class="resize-handle nw"
    onmousedown={(e) => handleMouseDown('nw', e)}
    role="button"
    tabindex="-1"
  ></div>
  <div
    class="resize-handle ne"
    onmousedown={(e) => handleMouseDown('ne', e)}
    role="button"
    tabindex="-1"
  ></div>
  <div
    class="resize-handle se"
    onmousedown={(e) => handleMouseDown('se', e)}
    role="button"
    tabindex="-1"
  ></div>
  <div
    class="resize-handle sw"
    onmousedown={(e) => handleMouseDown('sw', e)}
    role="button"
    tabindex="-1"
  ></div>

  <!-- Edge handles -->
  <div
    class="resize-handle n"
    onmousedown={(e) => handleMouseDown('n', e)}
    role="button"
    tabindex="-1"
  ></div>
  <div
    class="resize-handle e"
    onmousedown={(e) => handleMouseDown('e', e)}
    role="button"
    tabindex="-1"
  ></div>
  <div
    class="resize-handle s"
    onmousedown={(e) => handleMouseDown('s', e)}
    role="button"
    tabindex="-1"
  ></div>
  <div
    class="resize-handle w"
    onmousedown={(e) => handleMouseDown('w', e)}
    role="button"
    tabindex="-1"
  ></div>
</div>

<style>
  .resize-handles {
    position: absolute;
    inset: -4px;
    pointer-events: none;
  }

  .resize-handle {
    position: absolute;
    width: 8px;
    height: 8px;
    background: #0066cc;
    border: 1px solid white;
    border-radius: 2px;
    pointer-events: auto;
    z-index: 10;
  }

  /* Corner handles */
  .resize-handle.nw {
    top: -4px;
    left: -4px;
    cursor: nw-resize;
  }

  .resize-handle.ne {
    top: -4px;
    right: -4px;
    cursor: ne-resize;
  }

  .resize-handle.se {
    bottom: -4px;
    right: -4px;
    cursor: se-resize;
  }

  .resize-handle.sw {
    bottom: -4px;
    left: -4px;
    cursor: sw-resize;
  }

  /* Edge handles */
  .resize-handle.n {
    top: -4px;
    left: 50%;
    transform: translateX(-50%);
    cursor: n-resize;
  }

  .resize-handle.e {
    right: -4px;
    top: 50%;
    transform: translateY(-50%);
    cursor: e-resize;
  }

  .resize-handle.s {
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    cursor: s-resize;
  }

  .resize-handle.w {
    left: -4px;
    top: 50%;
    transform: translateY(-50%);
    cursor: w-resize;
  }

  .resize-handle:hover {
    background: #0052a3;
  }
</style>
