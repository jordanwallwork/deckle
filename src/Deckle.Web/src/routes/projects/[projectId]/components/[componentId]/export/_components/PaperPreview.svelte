<script lang="ts">
  import type { PageSetup, CardComponent } from "$lib/types";
  import { PAPER_DIMENSIONS } from "$lib/types";

  let {
    pageSetup,
    component,
  }: {
    pageSetup: PageSetup;
    component: CardComponent;
  } = $props();

  // Get the component's DPI
  const componentDpi = component.dimensions.dpi;

  // Calculate paper dimensions in inches based on setup
  const paperDimensionsInches = $derived(() => {
    const baseDimensions = PAPER_DIMENSIONS[pageSetup.paperSize];
    const isLandscape = pageSetup.orientation === "landscape";

    return {
      width: isLandscape ? baseDimensions.heightInches : baseDimensions.widthInches,
      height: isLandscape ? baseDimensions.widthInches : baseDimensions.heightInches,
    };
  });

  // Calculate paper dimensions in pixels at component DPI
  const paperDimensionsPx = $derived(() => {
    const dims = paperDimensionsInches();
    return {
      width: dims.width * componentDpi,
      height: dims.height * componentDpi,
    };
  });

  // Calculate margin in pixels
  const marginPx = $derived(pageSetup.marginInches * componentDpi);

  // Track container width for zoom calculation
  let containerWidth = $state(0);

  // Calculate zoom to fit width (with padding)
  const zoom = $derived(() => {
    if (containerWidth === 0) return 1;
    const padding = 64; // 2rem on each side
    const availableWidth = containerWidth - padding;
    return Math.min(availableWidth / paperDimensionsPx().width, 1);
  });

  // Calculate scaled dimensions for layout
  const scaledDimensions = $derived(() => ({
    width: paperDimensionsPx().width * zoom(),
    height: paperDimensionsPx().height * zoom(),
  }));

  // Calculate the left offset to center the paper
  // The paper is scaled from top-left, so we need to position it such that
  // after scaling, it's centered in the placeholder
  const paperLeftOffset = $derived(() => {
    const placeholderWidth = scaledDimensions().width;
    const visualWidth = paperDimensionsPx().width * zoom();
    return (placeholderWidth - visualWidth) / 2;
  });
</script>

<div class="paper-preview-container" bind:clientWidth={containerWidth}>
  <div class="paper-wrapper">
    <div class="info-header">
      <div class="paper-info">
        {pageSetup.paperSize}
        ({paperDimensionsInches().width.toFixed(2)}" × {paperDimensionsInches().height.toFixed(2)}")
        • {pageSetup.orientation}
      </div>
      <div class="dpi-info">
        {componentDpi} DPI
        • {paperDimensionsPx().width.toFixed(0)} × {paperDimensionsPx().height.toFixed(0)} px
        • {(zoom() * 100).toFixed(0)}% zoom
      </div>
    </div>
    <div
      class="paper-placeholder"
      style="
        width: {scaledDimensions().width}px;
        height: {scaledDimensions().height}px;
      "
    >
      <div
        class="paper"
        style="
          width: {paperDimensionsPx().width}px;
          height: {paperDimensionsPx().height}px;
          left: {paperLeftOffset()}px;
          transform: scale({zoom()});
        "
      >
        <div
          class="printable-area"
          style="
            top: {marginPx}px;
            left: {marginPx}px;
            right: {marginPx}px;
            bottom: {marginPx}px;
          "
        >
          <div class="placeholder-text">
            Components will be laid out here
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .paper-preview-container {
    height: 100%;
    width: 100%;
    background: #f5f5f5;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
  }

  .paper-wrapper {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    gap: 1rem;
  }

  .info-header {
    position: sticky;
    top: 0;
    background: #f5f5f5;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    z-index: 10;
  }

  .paper-info {
    font-size: 0.813rem;
    font-weight: 500;
    color: #333;
    text-align: center;
  }

  .dpi-info {
    font-size: 0.75rem;
    color: #666;
    text-align: center;
  }

  .paper-placeholder {
    position: relative;
    flex-shrink: 0;
  }

  .paper {
    background: white;
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.1),
      0 4px 8px rgba(0, 0, 0, 0.08);
    position: absolute;
    top: 0;
    transform-origin: top left;
  }

  .printable-area {
    position: absolute;
    border: 2px dashed #cbd5e0;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      #f7fafc 10px,
      #f7fafc 20px
    );
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .placeholder-text {
    font-size: 1rem;
    color: #718096;
    text-align: center;
    padding: 2rem;
  }
</style>
