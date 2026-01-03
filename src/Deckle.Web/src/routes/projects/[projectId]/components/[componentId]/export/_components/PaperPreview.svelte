<script lang="ts">
  import type { PageSetup, CardComponent } from "$lib/types";
  import type { ContainerElement } from "$lib/components/editor/types";
  import { PAPER_DIMENSIONS } from "$lib/types";
  import StaticCardRenderer from "./StaticCardRenderer.svelte";

  let {
    pageSetup,
    component,
    dataSourceRows = [],
    pageElements = $bindable([]),
    paperDimensions = $bindable({ width: 0, height: 0 }),
  }: {
    pageSetup: PageSetup;
    component: CardComponent;
    dataSourceRows?: Record<string, string>[];
    pageElements?: HTMLElement[];
    paperDimensions?: { width: number; height: number };
  } = $props();

  // Array to store refs to page elements - using a map for better reactivity
  let pageRefsMap = $state<Map<number, HTMLElement>>(new Map());

  // Svelte action to capture element refs
  function capturePageRef(node: HTMLElement, index: number) {
    pageRefsMap.set(index, node);
    // Trigger reactivity by creating a new Map
    pageRefsMap = new Map(pageRefsMap);

    return {
      destroy() {
        pageRefsMap.delete(index);
        pageRefsMap = new Map(pageRefsMap);
      }
    };
  }

  // Update pageElements when pageRefsMap changes
  $effect(() => {
    // Convert map to array sorted by index
    const elements: HTMLElement[] = [];
    const sortedIndices = Array.from(pageRefsMap.keys()).sort((a, b) => a - b);
    for (const index of sortedIndices) {
      const el = pageRefsMap.get(index);
      if (el) elements.push(el);
    }
    pageElements = elements;
  });

  // Update paperDimensions when they change
  $effect(() => {
    paperDimensions = {
      width: paperDimensionsPx().width,
      height: paperDimensionsPx().height,
    };
  });

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

  // Parse the back design if available
  const backDesign = $derived(() => {
    if (component.backDesign) {
      try {
        return JSON.parse(component.backDesign) as ContainerElement;
      } catch (error) {
        console.error("Failed to parse back design:", error);
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

  // Crop mark dimensions
  const cropMarkLength = 20; // Length of crop mark in pixels
  const cropMarkThickness = 1; // Thickness in pixels
  const cropMarkOffset = 5; // Gap between crop mark and cut line
  const cropMarkSpace = cropMarkOffset + cropMarkLength; // Total space needed for crop marks

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

  interface PageSet {
    front: Page;
    back: Page | null;
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
      // Check for the special "Num" field to determine number of copies
      const numCopies = rowData.Num ? Math.max(1, parseInt(rowData.Num, 10) || 1) : 1;

      // Create the specified number of copies for this row
      for (let copyIndex = 0; copyIndex < numCopies; copyIndex++) {
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
    }

    // Add the last page if it has cards
    if (currentPage.cards.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  });

  // Generate back pages with horizontally mirrored positions for proper alignment when printing double-sided
  const backPages = $derived.by((): Page[] => {
    if (!pageSetup.exportBacks || !backDesign()) {
      return [];
    }

    return pages.map((frontPage) => {
      // Create a back page with horizontally mirrored card positions
      const backPageCards: CardInstance[] = frontPage.cards.map((card) => {
        // Mirror the x position: new_x = printableWidth - (card.x + cardWidth)
        const mirroredX = printableAreaWidthPx - (card.x + cardWidthPx);
        return {
          x: mirroredX,
          y: card.y,
          mergeData: card.mergeData,
        };
      });

      return { cards: backPageCards };
    });
  });

  // Combine front and back pages into a single array for rendering
  const allPages = $derived.by((): Array<{ page: Page; isBack: boolean }> => {
    const result: Array<{ page: Page; isBack: boolean }> = [];

    // Add front and back pages alternately
    for (let i = 0; i < pages.length; i++) {
      result.push({ page: pages[i], isBack: false });
      if (backPages.length > i) {
        result.push({ page: backPages[i], isBack: true });
      }
    }

    return result;
  });

  // Calculate bounding box for cards on each page (for perimeter crop marks)
  const pageCardBounds = $derived.by(() => {
    return allPages.map(({ page }) => {
      if (page.cards.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const card of page.cards) {
        minX = Math.min(minX, card.x);
        minY = Math.min(minY, card.y);
        maxX = Math.max(maxX, card.x + cardWidthPx);
        maxY = Math.max(maxY, card.y + cardHeightPx);
      }

      return { minX, minY, maxX, maxY };
    });
  });
</script>

<div class="paper-preview-container" bind:clientWidth={containerWidth}>
  <div class="paper-wrapper">
    {#if allPages.length === 0}
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
      {#each allPages as { page, isBack }, pageIndex (pageIndex)}
        <div
          class="paper-placeholder"
          style="
            width: {scaledDimensions().width}px;
            height: {scaledDimensions().height}px;
          "
        >
          <div
            use:capturePageRef={pageIndex}
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
                {@const design = isBack ? backDesign() : frontDesign()}
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

              {#if pageSetup.cropMarks && page.cards.length > 0}
                {@const bounds = pageCardBounds[pageIndex]}

                <svg
                  class="perimeter-crop-marks"
                  style="
                    position: absolute;
                    left: -{cropMarkSpace}px;
                    top: -{cropMarkSpace}px;
                    width: {printableAreaWidthPx + 2 * cropMarkSpace}px;
                    height: {printableAreaHeightPx + 2 * cropMarkSpace}px;
                    pointer-events: none;
                  "
                >
                  {#each page.cards as card}
                    {@const cardBleedLeft = card.x + cropMarkSpace}
                    {@const cardBleedTop = card.y + cropMarkSpace}
                    {@const cardBleedRight = card.x + cardWidthPx + cropMarkSpace}
                    {@const cardBleedBottom = card.y + cardHeightPx + cropMarkSpace}
                    {@const cardCutLeft = card.x + component.dimensions.bleedPx + cropMarkSpace}
                    {@const cardCutTop = card.y + component.dimensions.bleedPx + cropMarkSpace}
                    {@const cardCutRight = card.x + cardWidthPx - component.dimensions.bleedPx + cropMarkSpace}
                    {@const cardCutBottom = card.y + cardHeightPx - component.dimensions.bleedPx + cropMarkSpace}

                    <!-- Check if this card is on the left edge -->
                    {#if card.x === bounds.minX}
                      <!-- Top crop mark -->
                      <line
                        x1={cardBleedLeft - cropMarkOffset - cropMarkLength}
                        y1={cardCutTop}
                        x2={cardBleedLeft - cropMarkOffset}
                        y2={cardCutTop}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                      <!-- Bottom crop mark -->
                      <line
                        x1={cardBleedLeft - cropMarkOffset - cropMarkLength}
                        y1={cardCutBottom}
                        x2={cardBleedLeft - cropMarkOffset}
                        y2={cardCutBottom}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                    {/if}

                    <!-- Check if this card is on the right edge -->
                    {#if card.x + cardWidthPx === bounds.maxX}
                      <!-- Top crop mark -->
                      <line
                        x1={cardBleedRight + cropMarkOffset}
                        y1={cardCutTop}
                        x2={cardBleedRight + cropMarkOffset + cropMarkLength}
                        y2={cardCutTop}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                      <!-- Bottom crop mark -->
                      <line
                        x1={cardBleedRight + cropMarkOffset}
                        y1={cardCutBottom}
                        x2={cardBleedRight + cropMarkOffset + cropMarkLength}
                        y2={cardCutBottom}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                    {/if}

                    <!-- Check if this card is on the top edge -->
                    {#if card.y === bounds.minY}
                      <!-- Left crop mark -->
                      <line
                        x1={cardCutLeft}
                        y1={cardBleedTop - cropMarkOffset - cropMarkLength}
                        x2={cardCutLeft}
                        y2={cardBleedTop - cropMarkOffset}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                      <!-- Right crop mark -->
                      <line
                        x1={cardCutRight}
                        y1={cardBleedTop - cropMarkOffset - cropMarkLength}
                        x2={cardCutRight}
                        y2={cardBleedTop - cropMarkOffset}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                    {/if}

                    <!-- Check if this card is on the bottom edge -->
                    {#if card.y + cardHeightPx === bounds.maxY}
                      <!-- Left crop mark -->
                      <line
                        x1={cardCutLeft}
                        y1={cardBleedBottom + cropMarkOffset}
                        x2={cardCutLeft}
                        y2={cardBleedBottom + cropMarkOffset + cropMarkLength}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                      <!-- Right crop mark -->
                      <line
                        x1={cardCutRight}
                        y1={cardBleedBottom + cropMarkOffset}
                        x2={cardCutRight}
                        y2={cardBleedBottom + cropMarkOffset + cropMarkLength}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                    {/if}
                  {/each}
                </svg>
              {/if}
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
