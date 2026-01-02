<script lang="ts">
  import type { PageSetup, CardComponent } from "$lib/types";
  import type { ContainerElement } from "$lib/components/editor/types";
  import { PAPER_DIMENSIONS } from "$lib/types";
  import StaticCardRenderer from "./StaticCardRenderer.svelte";

  let {
    pageSetup,
    component,
    dataSourceRows = [],
  }: {
    pageSetup: PageSetup;
    component: CardComponent;
    dataSourceRows?: Record<string, string>[];
  } = $props();

  // Get the component's DPI
  const componentDpi = component.dimensions.dpi;

  // Calculate paper dimensions in inches based on setup
  const paperDimensionsInches = $derived(() => {
    const baseDimensions = PAPER_DIMENSIONS[pageSetup.paperSize];
    const isLandscape = pageSetup.orientation === "landscape";

    return {
      width: isLandscape
        ? baseDimensions.heightInches
        : baseDimensions.widthInches,
      height: isLandscape
        ? baseDimensions.widthInches
        : baseDimensions.heightInches,
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

  // Parse the front design if available
  const frontDesign = $derived(() => {
    if (component.frontDesign) {
      try {
        return JSON.parse(component.frontDesign) as ContainerElement;
      } catch (error) {
        console.error("Failed to parse front design:", error);
        return null;
      }
    }
    return null;
  });

  // Calculate card dimensions including bleed
  const cardWidthPx = $derived(
    component.dimensions.widthPx + 2 * component.dimensions.bleedPx
  );
  const cardHeightPx = $derived(
    component.dimensions.heightPx + 2 * component.dimensions.bleedPx
  );

  // Calculate printable area dimensions
  const printableAreaWidthPx = $derived(
    paperDimensionsPx().width - 2 * marginPx
  );
  const printableAreaHeightPx = $derived(
    paperDimensionsPx().height - 2 * marginPx
  );

  // Layout cards on pages
  interface CardInstance {
    x: number;
    y: number;
    mergeData: Record<string, string> | null;
  }

  interface Page {
    cards: CardInstance[];
  }

  const pages = $derived.by((): Page[] => {
    // If no design, return empty
    if (!frontDesign()) {
      return [];
    }

    // Determine how many instances to create
    const instances: Record<string, string>[] =
      dataSourceRows.length > 0
        ? dataSourceRows
        : [{}]; // Single instance with no merge data if no data source

    const pages: Page[] = [];
    let currentPage: Page = { cards: [] };

    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;

    for (const rowData of instances) {
      // Check if card fits in current row
      if (currentX + cardWidthPx > printableAreaWidthPx) {
        // Move to next row
        currentX = 0;
        currentY += rowHeight;
        rowHeight = 0;
      }

      // Check if card fits on current page
      if (currentY + cardHeightPx > printableAreaHeightPx) {
        // Start new page
        if (currentPage.cards.length > 0) {
          pages.push(currentPage);
        }
        currentPage = { cards: [] };
        currentX = 0;
        currentY = 0;
        rowHeight = 0;
      }

      // Add card to current page
      currentPage.cards.push({
        x: currentX,
        y: currentY,
        mergeData: Object.keys(rowData).length > 0 ? rowData : null,
      });

      // Update position for next card
      currentX += cardWidthPx;
      rowHeight = Math.max(rowHeight, cardHeightPx);
    }

    // Add the last page if it has cards
    if (currentPage.cards.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  });
</script>

<div class="paper-preview-container" bind:clientWidth={containerWidth}>
  <div class="paper-wrapper">
    {#if pages.length === 0}
      <!-- No design or no pages -->
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
              {#if !frontDesign()}
                No design available. Create a design in the Front editor first.
              {:else}
                No data to display.
              {/if}
            </div>
          </div>
        </div>
      </div>
    {:else}
      <!-- Render each page -->
      {#each pages as page, pageIndex (pageIndex)}
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
              {#each page.cards as card, cardIndex (`${pageIndex}-${cardIndex}`)}
                {@const design = frontDesign()}
                {#if design}
                  <div
                    class="card-instance"
                    style="
                      position: absolute;
                      left: {card.x}px;
                      top: {card.y}px;
                    "
                  >
                    <StaticCardRenderer
                      {design}
                      dimensions={component.dimensions}
                      shape={component.shape}
                      mergeData={card.mergeData}
                    />
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        </div>
      {/each}
    {/if}
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
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 0;
  }

  .placeholder-text {
    font-size: 1rem;
    color: #718096;
    text-align: center;
    padding: 2rem;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .card-instance {
    pointer-events: auto;
  }
</style>
