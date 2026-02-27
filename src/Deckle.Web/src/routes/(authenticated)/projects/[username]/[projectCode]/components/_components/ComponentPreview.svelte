<script lang="ts">
  import type { Dimensions, ComponentShape } from '$lib/types';
  import type { ContainerElement } from '$lib/components/editor/types';
  import type { ComponentTypeKey } from '$lib/utils/componentHandlers';
  import { mmToPx } from '$lib/utils/size.utils';
  import StaticComponentRenderer from '../../export/_components/StaticComponentRenderer.svelte';

  let {
    selectedType,
    previewDesign,
    previewDimensions,
    previewShape,
    horizontalFolds = 0,
    verticalFolds = 0
  }: {
    selectedType: ComponentTypeKey | null;
    previewDesign: ContainerElement | null;
    previewDimensions: Dimensions;
    previewShape: ComponentShape | undefined;
    horizontalFolds?: number;
    verticalFolds?: number;
  } = $props();

  let horizontalFoldPositions = $derived(
    Array.from(
      { length: horizontalFolds },
      (_, i) =>
        previewDimensions.bleedPx + (previewDimensions.heightPx * (i + 1)) / (horizontalFolds + 1)
    )
  );

  let verticalFoldPositions = $derived(
    Array.from(
      { length: verticalFolds },
      (_, i) =>
        previewDimensions.bleedPx + (previewDimensions.widthPx * (i + 1)) / (verticalFolds + 1)
    )
  );

  let previewContainerWidth = $state(0);
  let previewContainerHeight = $state(0);

  let safeAreaPx = $derived(mmToPx(3, previewDimensions.dpi));

  let blankOuterRadius = $derived.by(() => {
    if (selectedType !== 'card') return 0;
    return mmToPx(3, previewDimensions.dpi) + previewDimensions.bleedPx;
  });

  let blankInnerRadius = $derived.by(() => {
    if (selectedType !== 'card') return 0;
    return mmToPx(3, previewDimensions.dpi);
  });

  let componentFullWidth = $derived(previewDimensions.widthPx + 2 * previewDimensions.bleedPx);
  let componentFullHeight = $derived(previewDimensions.heightPx + 2 * previewDimensions.bleedPx);

  let previewScale = $derived.by(() => {
    if (!componentFullWidth || !componentFullHeight) return 1;
    if (!previewContainerWidth || !previewContainerHeight) return 1;
    const pad = 24;
    return Math.min(
      (previewContainerWidth - pad) / componentFullWidth,
      (previewContainerHeight - pad) / componentFullHeight
    );
  });

  // Scale border/line widths inversely so they remain visually consistent
  // regardless of how much the component is scaled down.
  let trimBorderWidth = $derived(Math.max(4, 1 / previewScale));
  let foldLineWidth = $derived(Math.max(2, 1 / previewScale));
</script>

<div class="preview-panel">
  <div class="preview-label">Preview</div>
  <div
    class="preview-container"
    bind:clientWidth={previewContainerWidth}
    bind:clientHeight={previewContainerHeight}
  >
    <div
      class="preview-scaler"
      style="
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%) scale({previewScale});
				width: {componentFullWidth}px;
				height: {componentFullHeight}px;
			"
    >
      {#if previewDesign}
        <StaticComponentRenderer
          design={previewDesign}
          dimensions={previewDimensions}
          shape={previewShape}
        />
      {:else}
        <div
          class="blank-preview"
          style="width: {componentFullWidth}px; height: {componentFullHeight}px; border-radius: {blankOuterRadius}px;"
        >
          <div
            class="blank-trim"
            style="inset: {previewDimensions.bleedPx}px; border-radius: {blankInnerRadius}px; border-width: {trimBorderWidth}px;"
          ></div>
          <div
            class="blank-safe"
            style="inset: {previewDimensions.bleedPx +
              safeAreaPx}px; border-width: {trimBorderWidth}px;"
          ></div>
          {#each horizontalFoldPositions as y (y)}
            <div
              class="fold-line fold-line-h"
              style="top: {y}px; left: {previewDimensions.bleedPx}px; width: {previewDimensions.widthPx}px; border-top-width: {foldLineWidth}px;"
            ></div>
          {/each}
          {#each verticalFoldPositions as x (x)}
            <div
              class="fold-line fold-line-v"
              style="top: {previewDimensions.bleedPx}px; left: {x}px; height: {previewDimensions.heightPx}px; border-left-width: {foldLineWidth}px;"
            ></div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
  {#if !previewDesign}
    <div class="preview-legend">
      <span class="legend-item">
        <span class="legend-swatch legend-bleed"></span> Bleed
      </span>
      <span class="legend-item">
        <span class="legend-swatch legend-trim"></span> Trim
      </span>
      <span class="legend-item">
        <span class="legend-swatch legend-safe"></span> Safe area
      </span>
    </div>
  {/if}
</div>

<style>
  .preview-panel {
    flex: 0 0 280px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .preview-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-sage);
  }

  .preview-container {
    flex: 1;
    min-height: 200px;
    background-color: #f5f5f5;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    overflow: hidden;
    position: relative;
  }

  .blank-preview {
    position: relative;
    background: #e8e4e4;
    overflow: hidden;
  }

  .blank-trim {
    position: absolute;
    background: white;
    border: 4px dashed #b0a8a8;
  }

  .blank-safe {
    position: absolute;
    border: 4px dashed #d4cfcf;
  }

  .preview-legend {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: #666;
    padding-top: 0.375rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .legend-swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .legend-bleed {
    background: #e8e4e4;
    border: 1px solid #ccc;
  }

  .legend-trim {
    background: white;
    border: 1.5px dashed #b0a8a8;
  }

  .legend-safe {
    background: transparent;
    border: 1.5px dashed #d4cfcf;
  }

  .fold-line {
    position: absolute;
    pointer-events: none;
    z-index: 2;
  }

  .fold-line-h {
    height: 0;
    border-top: 1px dashed #b0a8a8;
  }

  .fold-line-v {
    width: 0;
    border-left: 1px dashed #b0a8a8;
  }
</style>

