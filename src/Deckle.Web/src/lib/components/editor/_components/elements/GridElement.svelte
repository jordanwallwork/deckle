<script lang="ts">
  import type { GridElement, GridCell, GridVariant } from '../../types';
  import { templateStore } from '$lib/stores/templateElements';
  import { dimensionToPx, backgroundStyle, borderStyle } from '../../utils';
  import { untrack } from 'svelte';

  let { element, dpi }: { element: GridElement; dpi: number } = $props();

  interface CellRect {
    left: number;
    top: number;
    width: number;
    height: number;
    clipPath?: string;
  }

  interface GridLayout {
    rows: number;
    colsPerRow: number[];
    getCellRect: (row: number, col: number) => CellRect;
  }

  function computeCheckerboardLayout(width: number, height: number, itemSize: number): GridLayout {
    const cols = Math.max(0, Math.floor(width / itemSize));
    const rows = Math.max(0, Math.floor(height / itemSize));
    const colsPerRow = Array<number>(rows).fill(cols);
    return {
      rows,
      colsPerRow,
      getCellRect: (row, col) => ({
        left: col * itemSize,
        top: row * itemSize,
        width: itemSize,
        height: itemSize
      })
    };
  }

  function computeOffsetCheckerboardLayout(
    width: number,
    height: number,
    itemSize: number
  ): GridLayout {
    const rows = Math.max(0, Math.floor(height / itemSize));
    const evenCols = Math.max(0, Math.floor(width / itemSize));
    // Odd rows are offset by itemSize/2 to the right, so fewer columns fit
    const oddCols = Math.max(0, Math.floor((width - itemSize / 2) / itemSize));
    const colsPerRow = Array.from({ length: rows }, (_, r) =>
      r % 2 === 0 ? evenCols : oddCols
    );
    return {
      rows,
      colsPerRow,
      getCellRect: (row, col) => ({
        left: col * itemSize + (row % 2 === 1 ? itemSize / 2 : 0),
        top: row * itemSize,
        width: itemSize,
        height: itemSize
      })
    };
  }

  function computeHexagonalLayout(width: number, height: number, itemSize: number): GridLayout {
    // Pointy-top hexagons. itemSize = circumradius (side length).
    // Bounding box: width = sqrt(3)*itemSize, height = 2*itemSize
    // Vertical step between row centres = 1.5*itemSize (rows overlap by 0.5*itemSize)
    const hexW = Math.sqrt(3) * itemSize;
    const hexH = 2 * itemSize;
    const vertStep = 1.5 * itemSize;

    // Number of rows where the bottom of the last row fits within height
    const rows = Math.max(0, Math.floor((height - hexH) / vertStep) + 1);

    // Even rows start at left=0; odd rows are offset right by hexW/2
    const evenCols = Math.max(0, Math.floor(width / hexW));
    const oddCols = Math.max(0, Math.floor((width - hexW / 2) / hexW));
    const colsPerRow = Array.from({ length: rows }, (_, r) =>
      r % 2 === 0 ? evenCols : oddCols
    );

    return {
      rows,
      colsPerRow,
      getCellRect: (row, col) => ({
        left: col * hexW + (row % 2 === 1 ? hexW / 2 : 0),
        top: row * vertStep,
        width: hexW,
        height: hexH,
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
      })
    };
  }

  function computeLayout(
    variant: GridVariant,
    width: number,
    height: number,
    itemSize: number
  ): GridLayout {
    if (variant === 'hexagonal') return computeHexagonalLayout(width, height, itemSize);
    if (variant === 'offset-checkerboard')
      return computeOffsetCheckerboardLayout(width, height, itemSize);
    return computeCheckerboardLayout(width, height, itemSize);
  }

  function needsStructuralUpdate(cells: GridCell[][], layout: GridLayout): boolean {
    if (cells.length !== layout.rows) return true;
    for (let r = 0; r < layout.rows; r++) {
      if (!cells[r] || cells[r].length !== layout.colsPerRow[r]) return true;
    }
    return false;
  }

  function buildCells(
    elementId: string,
    layout: GridLayout,
    currentCells: GridCell[][]
  ): GridCell[][] {
    return Array.from({ length: layout.rows }, (_, r) =>
      Array.from({ length: layout.colsPerRow[r] }, (_, c) => {
        const existing = currentCells[r]?.[c];
        return existing ?? { id: `${elementId}-cell-r${r}-c${c}`, row: r, col: c };
      })
    );
  }

  // Sync cells array whenever layout-determining properties change.
  // Using untrack() to read element.cells without making it a reactive dependency,
  // preventing the update from re-triggering this effect.
  $effect(() => {
    const width = dimensionToPx(element.dimensions?.width, dpi);
    const height = dimensionToPx(element.dimensions?.height, dpi);
    const itemSize = element.itemSize;
    const variant = element.variant;

    if (itemSize <= 0 || width <= 0 || height <= 0) return;

    const layout = computeLayout(variant, width, height, itemSize);
    const currentCells = untrack(() => element.cells);

    if (needsStructuralUpdate(currentCells, layout)) {
      templateStore.updateElement(element.id, {
        cells: buildCells(element.id, layout, currentCells)
      });
    }
  });

  // Derived layout for rendering — always current even before the effect syncs cells
  const gridWidth = $derived(dimensionToPx(element.dimensions?.width, dpi));
  const gridHeight = $derived(dimensionToPx(element.dimensions?.height, dpi));
  const layout = $derived(
    element.itemSize > 0 && gridWidth > 0 && gridHeight > 0
      ? computeLayout(element.variant, gridWidth, gridHeight, element.itemSize)
      : null
  );

  const defaultBackground = $derived(backgroundStyle(element.background));
  const defaultBorder = $derived(borderStyle(element.border, dpi));
</script>

<div class="grid-element">
  {#if layout}
    {#each { length: layout.rows } as _, ri}
      {#each { length: layout.colsPerRow[ri] } as _, ci}
        {@const rect = layout.getCellRect(ri, ci)}
        {@const cell = element.cells[ri]?.[ci]}
        <div
          class="grid-cell"
          style:left="{rect.left}px"
          style:top="{rect.top}px"
          style:width="{rect.width}px"
          style:height="{rect.height}px"
          style:clip-path={rect.clipPath}
          style={cell?.background ? backgroundStyle(cell.background) : defaultBackground}
          style:border={cell?.border ? borderStyle(cell.border, dpi) : defaultBorder}
          style:opacity={cell?.opacity}
        ></div>
      {/each}
    {/each}
  {/if}
</div>

<style>
  .grid-element {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .grid-cell {
    position: absolute;
    box-sizing: border-box;
  }
</style>
