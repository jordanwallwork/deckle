<script lang="ts">
  import type {
    PageSetup,
    CardComponent,
    PlayerMatComponent,
    GameComponent,
  } from "$lib/types";
  import type { ContainerElement } from "$lib/components/editor/types";
  import { PAPER_DIMENSIONS } from "$lib/types";
  import StaticComponentRenderer from "./StaticComponentRenderer.svelte";

  interface ComponentWithData {
    component: GameComponent;
    dataSource: any;
    dataSourceRows: Record<string, string>[];
  }

  let {
    pageSetup,
    components,
    pageElements = $bindable([]),
    paperDimensions = $bindable({ width: 0, height: 0 }),
  }: {
    pageSetup: PageSetup;
    components: ComponentWithData[];
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
      },
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

  // Use DPI from first exportable component (assume all components have same DPI)
  const componentDpi = $derived(() => {
    const firstExportable = components.find(c => isExportable(c.component));
    if (firstExportable && isExportable(firstExportable.component)) {
      return firstExportable.component.dimensions.dpi;
    }
    return 300; // Default DPI
  });

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
      width: dims.width * componentDpi(),
      height: dims.height * componentDpi(),
    };
  });

  // Update paperDimensions when they change
  $effect(() => {
    paperDimensions = {
      width: paperDimensionsPx().width,
      height: paperDimensionsPx().height,
    };
  });

  // Calculate margin in pixels
  const marginPx = $derived(pageSetup.marginInches * componentDpi());

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
  const paperLeftOffset = $derived(() => {
    const placeholderWidth = scaledDimensions().width;
    const visualWidth = paperDimensionsPx().width * zoom();
    return (placeholderWidth - visualWidth) / 2;
  });

  // Crop mark dimensions
  const cropMarkLength = 20;
  const cropMarkThickness = 1;
  const cropMarkOffset = 5;
  const cropMarkSpace = cropMarkOffset + cropMarkLength;

  // Calculate printable area dimensions
  const printableAreaWidthPx = $derived(
    paperDimensionsPx().width - 2 * marginPx
  );
  const printableAreaHeightPx = $derived(
    paperDimensionsPx().height - 2 * marginPx
  );

  // Layout component instances on pages
  interface ComponentInstance {
    componentIndex: number;
    x: number;
    y: number;
    mergeData: Record<string, string> | null;
    widthPx: number;
    heightPx: number;
    bleedPx: number;
  }

  interface Page {
    instances: ComponentInstance[];
  }

  // Type guard to check if component is exportable
  const isExportable = (component: GameComponent): component is CardComponent | PlayerMatComponent => {
    return component.type === "Card" || component.type === "PlayerMat";
  };

  const pages = $derived.by((): Page[] => {
    const pages: Page[] = [];
    let currentPage: Page = { instances: [] };

    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;

    // Process each component
    components.forEach((componentWithData, componentIndex) => {
      const component = componentWithData.component;

      // Skip non-exportable components
      if (!isExportable(component)) {
        return;
      }

      // Parse front design to check if it exists
      let frontDesign: ContainerElement | null = null;
      if (component.frontDesign) {
        try {
          frontDesign = JSON.parse(component.frontDesign);
        } catch (error) {
          console.error(`Failed to parse front design for component ${component.name}:`, error);
        }
      }

      // Skip if no front design
      if (!frontDesign) {
        return;
      }

      // Calculate component dimensions including bleed
      const instanceWidthPx = component.dimensions.widthPx + 2 * component.dimensions.bleedPx;
      const instanceHeightPx = component.dimensions.heightPx + 2 * component.dimensions.bleedPx;

      // Determine instances based on data source
      const instances: Record<string, string>[] =
        componentWithData.dataSourceRows.length > 0
          ? componentWithData.dataSourceRows
          : [{}];

      // Create instances for this component
      for (const rowData of instances) {
        // Check for "Num" field for duplicates
        const numCopies = rowData.Num
          ? Math.max(1, parseInt(rowData.Num, 10) || 1)
          : 1;

        for (let copyIndex = 0; copyIndex < numCopies; copyIndex++) {
          // Check if instance fits in current row
          if (currentX + instanceWidthPx > printableAreaWidthPx) {
            // Move to next row
            currentX = 0;
            currentY += rowHeight;
            rowHeight = 0;
          }

          // Check if instance fits on current page
          if (currentY + instanceHeightPx > printableAreaHeightPx) {
            // Start new page
            if (currentPage.instances.length > 0) {
              pages.push(currentPage);
            }
            currentPage = { instances: [] };
            currentX = 0;
            currentY = 0;
            rowHeight = 0;
          }

          // Add instance to current page
          currentPage.instances.push({
            componentIndex,
            x: currentX,
            y: currentY,
            mergeData: Object.keys(rowData).length > 0 ? rowData : null,
            widthPx: instanceWidthPx,
            heightPx: instanceHeightPx,
            bleedPx: component.dimensions.bleedPx,
          });

          // Update position for next instance
          currentX += instanceWidthPx;
          rowHeight = Math.max(rowHeight, instanceHeightPx);
        }
      }
    });

    // Add the last page if it has instances
    if (currentPage.instances.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  });

  // Generate back pages with horizontally mirrored positions
  const backPages = $derived.by((): Page[] => {
    if (!pageSetup.exportBacks) {
      return [];
    }

    return pages.map((frontPage) => {
      const backPageInstances: ComponentInstance[] = frontPage.instances.map((instance) => {
        // Mirror the x position
        const mirroredX = printableAreaWidthPx - (instance.x + instance.widthPx);
        return {
          ...instance,
          x: mirroredX,
        };
      });

      return { instances: backPageInstances };
    });
  });

  // Combine front and back pages
  const allPages = $derived.by((): Array<{ page: Page; isBack: boolean }> => {
    const result: Array<{ page: Page; isBack: boolean }> = [];

    for (let i = 0; i < pages.length; i++) {
      result.push({ page: pages[i], isBack: false });
      if (backPages.length > i) {
        result.push({ page: backPages[i], isBack: true });
      }
    }

    return result;
  });

  // Calculate bounding box for instances on each page
  const pageInstanceBounds = $derived.by(() => {
    return allPages.map(({ page }) => {
      if (page.instances.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const instance of page.instances) {
        minX = Math.min(minX, instance.x);
        minY = Math.min(minY, instance.y);
        maxX = Math.max(maxX, instance.x + instance.widthPx);
        maxY = Math.max(maxY, instance.y + instance.heightPx);
      }

      return { minX, minY, maxX, maxY };
    });
  });
</script>

<div class="paper-preview-container" bind:clientWidth={containerWidth}>
  <div class="paper-wrapper">
    {#if allPages.length === 0}
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
              No components with designs available. Create designs in the component editors first.
            </div>
          </div>
        </div>
      </div>
    {:else}
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
              {#each page.instances as instance, instanceIndex (`${pageIndex}-${instanceIndex}`)}
                {@const componentWithData = components[instance.componentIndex]}
                {@const component = componentWithData.component}
                {#if isExportable(component)}
                  {@const designJson = isBack ? component.backDesign : component.frontDesign}
                  {#if designJson}
                    {@const design = JSON.parse(designJson) as ContainerElement}
                    <div
                      class="component-instance"
                      style="
                        position: absolute;
                        left: {instance.x}px;
                        top: {instance.y}px;
                      "
                    >
                      <StaticComponentRenderer
                        {design}
                        dimensions={component.dimensions}
                        shape={component.shape}
                        mergeData={instance.mergeData}
                      />
                    </div>
                  {/if}
                {/if}
              {/each}

              {#if pageSetup.cropMarks && page.instances.length > 0}
                {@const bounds = pageInstanceBounds[pageIndex]}

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
                  {#each page.instances as instance}
                    {@const instanceBleedLeft = instance.x + cropMarkSpace}
                    {@const instanceBleedTop = instance.y + cropMarkSpace}
                    {@const instanceBleedRight = instance.x + instance.widthPx + cropMarkSpace}
                    {@const instanceBleedBottom = instance.y + instance.heightPx + cropMarkSpace}
                    {@const instanceCutLeft = instance.x + instance.bleedPx + cropMarkSpace}
                    {@const instanceCutTop = instance.y + instance.bleedPx + cropMarkSpace}
                    {@const instanceCutRight = instance.x + instance.widthPx - instance.bleedPx + cropMarkSpace}
                    {@const instanceCutBottom = instance.y + instance.heightPx - instance.bleedPx + cropMarkSpace}

                    <!-- Left edge crop marks -->
                    {#if instance.x === bounds.minX}
                      <line
                        x1={instanceBleedLeft - cropMarkOffset - cropMarkLength}
                        y1={instanceCutTop}
                        x2={instanceBleedLeft - cropMarkOffset}
                        y2={instanceCutTop}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                      <line
                        x1={instanceBleedLeft - cropMarkOffset - cropMarkLength}
                        y1={instanceCutBottom}
                        x2={instanceBleedLeft - cropMarkOffset}
                        y2={instanceCutBottom}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                    {/if}

                    <!-- Right edge crop marks -->
                    {#if instance.x + instance.widthPx === bounds.maxX}
                      <line
                        x1={instanceBleedRight + cropMarkOffset}
                        y1={instanceCutTop}
                        x2={instanceBleedRight + cropMarkOffset + cropMarkLength}
                        y2={instanceCutTop}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                      <line
                        x1={instanceBleedRight + cropMarkOffset}
                        y1={instanceCutBottom}
                        x2={instanceBleedRight + cropMarkOffset + cropMarkLength}
                        y2={instanceCutBottom}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                    {/if}

                    <!-- Top edge crop marks -->
                    {#if instance.y === bounds.minY}
                      <line
                        x1={instanceCutLeft}
                        y1={instanceBleedTop - cropMarkOffset - cropMarkLength}
                        x2={instanceCutLeft}
                        y2={instanceBleedTop - cropMarkOffset}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                      <line
                        x1={instanceCutRight}
                        y1={instanceBleedTop - cropMarkOffset - cropMarkLength}
                        x2={instanceCutRight}
                        y2={instanceBleedTop - cropMarkOffset}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                    {/if}

                    <!-- Bottom edge crop marks -->
                    {#if instance.y + instance.heightPx === bounds.maxY}
                      <line
                        x1={instanceCutLeft}
                        y1={instanceBleedBottom + cropMarkOffset}
                        x2={instanceCutLeft}
                        y2={instanceBleedBottom + cropMarkOffset + cropMarkLength}
                        stroke="black"
                        stroke-width={cropMarkThickness}
                      />
                      <line
                        x1={instanceCutRight}
                        y1={instanceBleedBottom + cropMarkOffset}
                        x2={instanceCutRight}
                        y2={instanceBleedBottom + cropMarkOffset + cropMarkLength}
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

  .component-instance {
    pointer-events: auto;
  }
</style>
