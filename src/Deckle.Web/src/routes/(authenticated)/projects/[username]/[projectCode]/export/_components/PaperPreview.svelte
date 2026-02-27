<script lang="ts">
  import type { PageSetup, CardComponent, PlayerMatComponent, GameComponent } from '$lib/types';
  import { isEditableComponent, isGameBoard } from '$lib/utils/componentTypes';
  import type { ContainerElement } from '$lib/components/editor/types';
  import { PAPER_DIMENSIONS } from '$lib/types';
  import StaticComponentRenderer from './StaticComponentRenderer.svelte';
  import { fontLoader } from '$lib/stores/fontLoader';

  interface ComponentWithData {
    component: GameComponent;
    dataSource: any;
    dataSourceRows: Record<string, string>[];
  }

  let {
    pageSetup,
    components,
    rotatedComponentIds = [],
    slicedComponentIds = [],
    pageElements = $bindable([]),
    paperDimensions = $bindable({ width: 0, height: 0 }),
    projectId
  }: {
    pageSetup: PageSetup;
    components: ComponentWithData[];
    rotatedComponentIds?: string[];
    slicedComponentIds?: string[];
    pageElements?: HTMLElement[];
    paperDimensions?: { width: number; height: number };
    projectId?: string;
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

  // Load Google Fonts used in all component designs
  $effect(() => {
    for (const componentWithData of components) {
      if (!isEditableComponent(componentWithData.component)) continue;
      const component = componentWithData.component;
      for (const designJson of [component.frontDesign, component.backDesign]) {
        if (!designJson) continue;
        try {
          const design = JSON.parse(designJson) as ContainerElement;
          if (design.fonts && design.fonts.length > 0) {
            fontLoader.preloadTemplateFonts(design.fonts);
          }
        } catch {
          // Ignore malformed designs
        }
      }
    }
  });

  // Use DPI from first exportable component (assume all components have same DPI)
  const componentDpi = $derived.by(() => {
    const firstExportable = components.find((c) => isEditableComponent(c.component));
    if (firstExportable && isEditableComponent(firstExportable.component)) {
      return firstExportable.component.dimensions.dpi;
    }
    return 300; // Default DPI
  });

  // Calculate paper dimensions in inches based on setup
  const paperDimensionsInches = $derived.by(() => {
    const baseDimensions = PAPER_DIMENSIONS[pageSetup.paperSize];
    const isLandscape = pageSetup.orientation === 'landscape';

    return {
      width: isLandscape ? baseDimensions.heightInches : baseDimensions.widthInches,
      height: isLandscape ? baseDimensions.widthInches : baseDimensions.heightInches
    };
  });

  // Calculate paper dimensions in pixels at component DPI
  const paperDimensionsPx = $derived.by(() => {
    const dims = paperDimensionsInches;
    return {
      width: dims.width * componentDpi,
      height: dims.height * componentDpi
    };
  });

  // Update paperDimensions when they change
  $effect(() => {
    paperDimensions = {
      width: paperDimensionsPx.width,
      height: paperDimensionsPx.height
    };
  });

  // Calculate margin in pixels
  const marginPx = $derived(pageSetup.marginInches * componentDpi);

  // Track container width for zoom calculation
  let containerWidth = $state(0);

  // User-controlled zoom multiplier (1 = fit to width, >1 = zoom in, <1 = zoom out)
  let userZoomMultiplier = $state(1);

  // Calculate zoom to fit width (with padding)
  const baseZoom = $derived.by(() => {
    if (containerWidth === 0) return 1;
    const padding = 64; // 2rem on each side
    const availableWidth = containerWidth - padding;
    return Math.min(availableWidth / paperDimensionsPx.width, 1);
  });

  // Final zoom including user multiplier
  const zoom = $derived(baseZoom * userZoomMultiplier);

  // Zoom control functions
  const zoomStep = 0.25;
  const minZoom = 0.25;
  const maxZoom = 4;

  function zoomIn() {
    userZoomMultiplier = Math.min(userZoomMultiplier + zoomStep, maxZoom);
  }

  function zoomOut() {
    userZoomMultiplier = Math.max(userZoomMultiplier - zoomStep, minZoom);
  }

  function resetZoom() {
    userZoomMultiplier = 1;
  }

  // Calculate zoom percentage for display
  const zoomPercentage = $derived(Math.round(userZoomMultiplier * 100));

  // Calculate scaled dimensions for layout
  const scaledDimensions = $derived.by(() => ({
    width: paperDimensionsPx.width * zoom,
    height: paperDimensionsPx.height * zoom
  }));

  // Calculate the left offset to center the paper
  const paperLeftOffset = $derived.by(() => {
    const placeholderWidth = scaledDimensions.width;
    const visualWidth = paperDimensionsPx.width * zoom;
    return (placeholderWidth - visualWidth) / 2;
  });

  // Crop mark dimensions
  const cropMarkLength = 20;
  const cropMarkThickness = 1;
  const cropMarkOffset = 5;
  const cropMarkSpace = cropMarkOffset + cropMarkLength;

  // Calculate printable area dimensions
  const printableAreaWidthPx = $derived(paperDimensionsPx.width - 2 * marginPx);
  const printableAreaHeightPx = $derived(paperDimensionsPx.height - 2 * marginPx);

  // Set of component IDs that are rotated 90 degrees
  const rotatedSet = $derived(new Set(rotatedComponentIds));

  // Set of component IDs that are sliced along fold lines
  const slicedSet = $derived(new Set(slicedComponentIds));

  // Layout component instances on pages
  interface ComponentInstance {
    componentIndex: number;
    x: number;
    y: number;
    mergeData: Record<string, string> | null;
    widthPx: number;
    heightPx: number;
    bleedPx: number;
    isRotated: boolean;
    // For sliced game board sections: viewport into the full design
    isSlicedSection?: boolean;
    viewportOffsetXPx?: number;
    viewportOffsetYPx?: number;
  }

  interface Page {
    instances: ComponentInstance[];
  }

  /**
   * Pack component instances onto pages using greedy row-based algorithm
   * @param componentsTopack - Components to pack together
   * @param componentIndexOffset - Offset to add to component indices (for separate packing)
   * @param printableWidthPx - Printable area width in pixels
   * @param printableHeightPx - Printable area height in pixels
   * @param rotatedIds - Set of component IDs that should be rotated 90 degrees
   * @param slicedIds - Set of component IDs that should be sliced along fold lines
   */
  function packComponentInstances(
    componentsTopack: ComponentWithData[],
    componentIndexOffset: number,
    printableWidthPx: number,
    printableHeightPx: number,
    rotatedIds: Set<string>,
    slicedIds: Set<string>
  ): Page[] {
    const pages: Page[] = [];
    let currentPage: Page = { instances: [] };

    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;

    // Process each component
    componentsTopack.forEach((componentWithData, localIndex) => {
      const component = componentWithData.component;
      const componentIndex = componentIndexOffset + localIndex;

      // Skip non-exportable components
      if (!isEditableComponent(component)) {
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
        componentWithData.dataSourceRows.length > 0 ? componentWithData.dataSourceRows : [{}];

      // Determine rotation for this component (all instances share the same rotation)
      const isRotated = rotatedIds.has(component.id);

      // Determine if this component is sliced (GameBoard with fold lines)
      const isSliced =
        slicedIds.has(component.id) &&
        isGameBoard(component) &&
        (component.horizontalFolds > 0 || component.verticalFolds > 0);

      // Create instances for this component
      for (const rowData of instances) {
        // Check for "Num" field for duplicates
        const numCopies = rowData.Num ? Math.max(1, Number.parseInt(rowData.Num, 10) || 1) : 1;

        for (let copyIndex = 0; copyIndex < numCopies; copyIndex++) {
          if (isSliced && isGameBoard(component)) {
            // Split this board into sections along its fold lines.
            // horizontalFolds = number of horizontal fold lines → rows = horizontalFolds + 1
            // verticalFolds = number of vertical fold lines → cols = verticalFolds + 1
            const rows = component.horizontalFolds + 1;
            const cols = component.verticalFolds + 1;
            const sectionContentW = component.dimensions.widthPx / cols;
            const sectionContentH = component.dimensions.heightPx / rows;
            const boardBleed = component.dimensions.bleedPx;
            const mergeData = Object.keys(rowData).length > 0 ? rowData : null;

            for (let sRow = 0; sRow < rows; sRow++) {
              for (let sCol = 0; sCol < cols; sCol++) {
                // Sections have no bleed — the outer container clips exactly to content
                const layoutW = sectionContentW;
                const layoutH = sectionContentH;

                if (currentX + layoutW > printableWidthPx) {
                  currentX = 0;
                  currentY += rowHeight;
                  rowHeight = 0;
                }

                if (currentY + layoutH > printableHeightPx) {
                  if (currentPage.instances.length > 0) {
                    pages.push(currentPage);
                  }
                  currentPage = { instances: [] };
                  currentX = 0;
                  currentY = 0;
                  rowHeight = 0;
                }

                currentPage.instances.push({
                  componentIndex,
                  x: currentX,
                  y: currentY,
                  mergeData,
                  widthPx: sectionContentW,
                  heightPx: sectionContentH,
                  bleedPx: 0,
                  isRotated: false,
                  isSlicedSection: true,
                  viewportOffsetXPx: boardBleed + sCol * sectionContentW,
                  viewportOffsetYPx: boardBleed + sRow * sectionContentH
                });

                currentX += layoutW;
                rowHeight = Math.max(rowHeight, layoutH);
              }
            }
          } else {
            // Swap dimensions if rotated
            const layoutWidthPx = isRotated ? instanceHeightPx : instanceWidthPx;
            const layoutHeightPx = isRotated ? instanceWidthPx : instanceHeightPx;

            // Check if instance fits in current row
            if (currentX + layoutWidthPx > printableWidthPx) {
              // Move to next row
              currentX = 0;
              currentY += rowHeight;
              rowHeight = 0;
            }

            // Check if instance fits on current page
            if (currentY + layoutHeightPx > printableHeightPx) {
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
              isRotated
            });

            // Update position for next instance (use layout dimensions)
            currentX += layoutWidthPx;
            rowHeight = Math.max(rowHeight, layoutHeightPx);
          }
        }
      }
    });

    // Add the last page if it has instances
    if (currentPage.instances.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  }

  const pages = $derived.by((): Page[] => {
    if (pageSetup.separateComponentPages) {
      // Separate packing: each component gets its own page sequence
      const allPages: Page[] = [];

      components.forEach((component, originalIndex) => {
        // Pack this single component
        const componentPages = packComponentInstances(
          [component],
          originalIndex,
          printableAreaWidthPx,
          printableAreaHeightPx,
          rotatedSet,
          slicedSet
        );

        // Append to overall page list
        allPages.push(...componentPages);
      });

      return allPages;
    } else {
      // Combined packing: all components share pages (current behavior)
      return packComponentInstances(
        components,
        0,
        printableAreaWidthPx,
        printableAreaHeightPx,
        rotatedSet,
        slicedSet
      );
    }
  });

  // Generate back pages with horizontally mirrored positions
  const backPages = $derived.by((): Page[] => {
    if (!pageSetup.exportBacks) {
      return [];
    }

    return pages.map((frontPage) => {
      const backPageInstances: ComponentInstance[] = frontPage.instances.map((instance) => {
        // Mirror the x position, accounting for rotation
        const layoutWidth = instance.isRotated ? instance.heightPx : instance.widthPx;
        const mirroredX = printableAreaWidthPx - (instance.x + layoutWidth);
        return {
          ...instance,
          x: mirroredX
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

  // Calculate total number of component instances across all pages
  const totalInstances = $derived.by(() => {
    return allPages.reduce((sum, { page }) => sum + page.instances.length, 0);
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
        // Use layout dimensions for rotated components
        const layoutWidthPx = instance.isRotated ? instance.heightPx : instance.widthPx;
        const layoutHeightPx = instance.isRotated ? instance.widthPx : instance.heightPx;

        minX = Math.min(minX, instance.x);
        minY = Math.min(minY, instance.y);
        maxX = Math.max(maxX, instance.x + layoutWidthPx);
        maxY = Math.max(maxY, instance.y + layoutHeightPx);
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
          width: {scaledDimensions.width}px;
          height: {scaledDimensions.height}px;
        "
      >
        <div
          class="paper"
          style="
            width: {paperDimensionsPx.width}px;
            height: {paperDimensionsPx.height}px;
            left: {paperLeftOffset}px;
            transform: scale({zoom});
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
            width: {scaledDimensions.width}px;
            height: {scaledDimensions.height}px;
          "
        >
          <div
            use:capturePageRef={pageIndex}
            class="paper"
            style="
              width: {paperDimensionsPx.width}px;
              height: {paperDimensionsPx.height}px;
              left: {paperLeftOffset}px;
              transform: scale({zoom});
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
                {#if isEditableComponent(component)}
                  {@const designJson = isBack ? component.backDesign : component.frontDesign}
                  {#if designJson}
                    {@const design = JSON.parse(designJson) as ContainerElement}
                    {#if instance.isSlicedSection && instance.viewportOffsetXPx !== undefined && instance.viewportOffsetYPx !== undefined}
                      <!-- Sliced game board section: clip to section content, viewport into full design -->
                      <div
                        class="component-instance"
                        style="
                          position: absolute;
                          left: {instance.x}px;
                          top: {instance.y}px;
                          width: {instance.widthPx}px;
                          height: {instance.heightPx}px;
                          overflow: hidden;
                        "
                      >
                        <div
                          style="
                            position: absolute;
                            transform: translate({-instance.viewportOffsetXPx}px, {-instance.viewportOffsetYPx}px);
                          "
                        >
                          <StaticComponentRenderer
                            {design}
                            dimensions={component.dimensions}
                            shape={component.shape}
                            mergeData={instance.mergeData}
                            {projectId}
                          />
                        </div>
                      </div>
                    {:else}
                      {@const rotation = instance.isRotated ? (isBack ? -90 : 90) : 0}
                      {@const layoutWidthPx = instance.isRotated
                        ? instance.heightPx
                        : instance.widthPx}
                      {@const layoutHeightPx = instance.isRotated
                        ? instance.widthPx
                        : instance.heightPx}
                      <div
                        class="component-instance"
                        style="
                          position: absolute;
                          left: {instance.x}px;
                          top: {instance.y}px;
                          width: {layoutWidthPx}px;
                          height: {layoutHeightPx}px;
                        "
                      >
                        <div
                          class="component-renderer-wrapper"
                          style="
                            transform: rotate({rotation}deg) {rotation === 90
                            ? 'translateY(-100%)'
                            : rotation === -90
                              ? 'translateX(-100%)'
                              : ''};
                            transform-origin: top left;
                            width: {instance.widthPx}px;
                            height: {instance.heightPx}px;
                          "
                        >
                          <StaticComponentRenderer
                            {design}
                            dimensions={component.dimensions}
                            shape={component.shape}
                            mergeData={instance.mergeData}
                            {projectId}
                          />
                        </div>
                      </div>
                    {/if}
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
                    {@const layoutWidthPx = instance.isRotated
                      ? instance.heightPx
                      : instance.widthPx}
                    {@const layoutHeightPx = instance.isRotated
                      ? instance.widthPx
                      : instance.heightPx}
                    {@const instanceBleedLeft = instance.x + cropMarkSpace}
                    {@const instanceBleedTop = instance.y + cropMarkSpace}
                    {@const instanceBleedRight = instance.x + layoutWidthPx + cropMarkSpace}
                    {@const instanceBleedBottom = instance.y + layoutHeightPx + cropMarkSpace}
                    {@const instanceCutLeft = instance.x + instance.bleedPx + cropMarkSpace}
                    {@const instanceCutTop = instance.y + instance.bleedPx + cropMarkSpace}
                    {@const instanceCutRight =
                      instance.x + layoutWidthPx - instance.bleedPx + cropMarkSpace}
                    {@const instanceCutBottom =
                      instance.y + layoutHeightPx - instance.bleedPx + cropMarkSpace}

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
                    {#if instance.x + layoutWidthPx === bounds.maxX}
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
                    {#if instance.y + layoutHeightPx === bounds.maxY}
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

  <!-- Zoom control -->
  <div class="zoom-control">
    <div class="info-display">
      {totalInstances}
      {totalInstances === 1 ? 'Component' : 'Components'} · {allPages.length}
      {allPages.length === 1 ? 'Page' : 'Pages'}
    </div>

    <button
      class="zoom-btn"
      onclick={zoomOut}
      disabled={userZoomMultiplier <= minZoom}
      title="Zoom out"
    >
      −
    </button>
    <button class="zoom-reset" onclick={resetZoom} title="Reset zoom to fit">
      {zoomPercentage}%
    </button>
    <button
      class="zoom-btn"
      onclick={zoomIn}
      disabled={userZoomMultiplier >= maxZoom}
      title="Zoom in"
    >
      +
    </button>
  </div>
</div>

<style>
  .paper-preview-container {
    background: #f5f5f5;
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
    pointer-events: none;
  }

  .zoom-control {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    gap: 0.25rem;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 0.5rem;
    padding: 0.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(8px);
    z-index: 10;
  }

  .zoom-btn,
  .zoom-reset {
    border: 1px solid #e2e8f0;
    background: white;
    color: #334155;
    font-size: 1rem;
    font-weight: 500;
    padding: 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .zoom-btn:hover:not(:disabled),
  .zoom-reset:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .zoom-btn:active:not(:disabled),
  .zoom-reset:active {
    background: #f1f5f9;
  }

  .zoom-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .zoom-reset {
    min-width: 3.5rem;
    font-size: 0.875rem;
  }

  .info-display {
    line-height: 2rem;
    margin: 0 1rem;
    width: fit-content;
    align-self: flex-start;
    backdrop-filter: blur(8px);
    z-index: 10;
    font-size: 0.875rem;
    font-weight: 500;
    color: #334155;
  }
</style>
