<script lang="ts">
  import type { Dimensions } from "$lib/types";
  import type { Snippet } from "svelte";
  import type { PanzoomObject } from "@panzoom/panzoom";
  import { onMount } from "svelte";

  let {
    dimensions,
    children,
    onPanzoomReady,
  }: {
    dimensions: Dimensions;
    children: Snippet;
    onPanzoomReady?: (instance: PanzoomObject) => void;
  } = $props();

  let viewerElement: HTMLDivElement;
  let contentElement: HTMLDivElement;
  let panzoomInstance: PanzoomObject | null = null;

  onMount(async () => {
    if (contentElement && viewerElement) {
      // Dynamic import to avoid SSR issues - panzoom is browser-only
      const { default: Panzoom } = await import("@panzoom/panzoom");

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
        cursor: "grab",
        // Exclude resize handles and other interactive elements from triggering pan
        excludeClass: "resize-handle",
      });

      // Notify parent component that panzoom is ready
      if (onPanzoomReady && panzoomInstance) {
        onPanzoomReady(panzoomInstance);
      }
    }

    return () => {
      if (panzoomInstance) {
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
    background: repeating-conic-gradient(#e5e5e5 0 25%, #fff 0 50%) 50% / 8px
      8px;
    height: 100%;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .panzoom-content {
    /* Panzoom will handle transforms */
  }
</style>
