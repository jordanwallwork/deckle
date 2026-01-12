<script lang="ts">
  import type { Dimensions } from '$lib/types';
  import type { Snippet } from 'svelte';
  import type { PanzoomObject } from '@panzoom/panzoom';
  import { onMount, setContext } from 'svelte';

  let {
    dimensions,
    gridEnabled,
    gridSize,
    children,
    onPanzoomReady
  }: {
    dimensions: Dimensions;
    gridEnabled: boolean;
    gridSize: number;
    children: Snippet;
    onPanzoomReady?: (instance: PanzoomObject, element: HTMLDivElement) => void;
  } = $props();

  let viewerElement: HTMLDivElement;
  let contentElement: HTMLDivElement;
  let panzoomInstance: PanzoomObject | null = null;

  // Create a reactive state for the current zoom scale
  let currentScale = $state(1);

  // Provide zoom scale and panzoom instance via context so handles can access them
  setContext('zoomScale', {
    getScale: () => currentScale
  });

  setContext('panzoom', {
    getInstance: () => panzoomInstance
  });

  // Provide grid snap configuration via context
  // Use getters to ensure reactivity - they read the latest prop values
  setContext('gridSnap', {
    isEnabled: () => gridEnabled,
    getSize: () => gridSize
  });

  // Function to update scale (defined outside onMount for cleanup access)
  const updateScale = () => {
    if (panzoomInstance) {
      currentScale = panzoomInstance.getScale();
    }
  };

  onMount(() => {
    (async () => {
      if (contentElement && viewerElement) {
        // Dynamic import to avoid SSR issues - panzoom is browser-only
        const { default: Panzoom } = await import('@panzoom/panzoom');

        // Calculate the scale needed to fit the component in the viewer
        const padding = 40; // padding in pixels
        const viewerWidth = viewerElement.clientWidth - padding * 2;
        const viewerHeight = viewerElement.clientHeight - padding * 2;

        const scaleX = viewerWidth / dimensions.widthPx;
        const scaleY = viewerHeight / dimensions.heightPx;

        // Use the smaller scale to ensure it fits both dimensions
        // Don't scale up beyond 100%
        const fitScale = Math.min(scaleX, scaleY, 1);

        panzoomInstance = Panzoom(contentElement, {
          maxScale: 5,
          minScale: 0.1,
          startScale: fitScale,
          step: 0.1,
          cursor: 'grab',
          // Exclude resize handles, drag handles, and other interactive elements from triggering pan
          excludeClass: 'panzoom-exclude'
        });

        // Set initial scale
        currentScale = fitScale;

        // Listen for zoom changes to update the context
        contentElement.addEventListener('panzoomzoom', updateScale);
        contentElement.addEventListener('panzoomchange', updateScale);

        // Enable mouse wheel zooming
        viewerElement.addEventListener('wheel', panzoomInstance.zoomWithWheel);

        // Notify parent component that panzoom is ready
        if (onPanzoomReady && panzoomInstance) {
          onPanzoomReady(panzoomInstance, contentElement);
        }
      }
    })();

    return () => {
      if (panzoomInstance && contentElement) {
        viewerElement.removeEventListener('wheel', panzoomInstance.zoomWithWheel);
        contentElement.removeEventListener('panzoomzoom', updateScale);
        contentElement.removeEventListener('panzoomchange', updateScale);
        panzoomInstance.destroy();
      }
    };
  });
</script>

<div class="component-viewer" bind:this={viewerElement}>
  <div class="panzoom-content" bind:this={contentElement}>
    {@render children()}
  </div>
</div>

<style>
  .component-viewer {
    background: repeating-conic-gradient(#e5e5e5 0 25%, #fff 0 50%) 50% / 8px 8px;
    height: 100%;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
