<script lang="ts">
  import {
    cssToUserValue,
    userValueToCss,
    getXOptions,
    getYOptions,
    getAlignmentGridCells
  } from '$lib/utils/flexbox.utils';

  let {
    isColumn,
    justifyContent = 'flex-start',
    alignItems = 'flex-start',
    onchange
  }: {
    isColumn: boolean;
    justifyContent?: string;
    alignItems?: string;
    onchange: (updates: { justifyContent: string; alignItems: string }) => void;
  } = $props();

  // Get current X and Y values based on direction
  const currentX = $derived(() => {
    if (isColumn) {
      // In column mode, X controls alignItems
      return cssToUserValue(alignItems, 'cross', isColumn);
    } else {
      // In row mode, X controls justifyContent
      return cssToUserValue(justifyContent, 'main', isColumn);
    }
  });

  const currentY = $derived(() => {
    if (isColumn) {
      // In column mode, Y controls justifyContent
      return cssToUserValue(justifyContent, 'main', isColumn);
    } else {
      // In row mode, Y controls alignItems
      return cssToUserValue(alignItems, 'cross', isColumn);
    }
  });

  // Get options for X and Y based on direction
  const xOptions = $derived(() => getXOptions(isColumn));
  const yOptions = $derived(() => getYOptions(isColumn));

  // Get the grid cells for the alignment grid
  const gridCells = $derived(() => getAlignmentGridCells(isColumn));

  function isSelected(x: string, y: string): boolean {
    return currentX() === x && currentY() === y;
  }

  // Update alignment based on X/Y values
  function updateAlignment(x?: string, y?: string) {
    let newJustify: string = justifyContent;
    let newAlign: string = alignItems;

    if (isColumn) {
      // In column mode: X = alignItems, Y = justifyContent
      if (x !== undefined) {
        newAlign = userValueToCss(x, 'cross');
      }
      if (y !== undefined) {
        newJustify = userValueToCss(y, 'main');
      }
    } else {
      // In row mode: X = justifyContent, Y = alignItems
      if (x !== undefined) {
        newJustify = userValueToCss(x, 'main');
      }
      if (y !== undefined) {
        newAlign = userValueToCss(y, 'cross');
      }
    }

    onchange({
      justifyContent: newJustify,
      alignItems: newAlign
    });
  }
</script>

<div class="alignment-container">
  <div class="alignment-grid">
    {#each gridCells() as cell}
      <button
        type="button"
        class="alignment-cell"
        class:selected={isSelected(cell.x, cell.y)}
        onclick={() => updateAlignment(cell.x, cell.y)}
        title="{cell.x}, {cell.y}"
      >
        <div class="alignment-icon" data-x={cell.x} data-y={cell.y}></div>
      </button>
    {/each}
  </div>
  <div class="alignment-selects">
    <div class="alignment-select-row">
      <label for="align-x">X:</label>
      <select
        id="align-x"
        value={currentX()}
        onchange={(e) => updateAlignment(e.currentTarget.value, undefined)}
      >
        {#each xOptions() as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>
    <div class="alignment-select-row">
      <label for="align-y">Y:</label>
      <select
        id="align-y"
        value={currentY()}
        onchange={(e) => updateAlignment(undefined, e.currentTarget.value)}
      >
        {#each yOptions() as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>
  </div>
</div>

<style>
  .alignment-container {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .alignment-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    background: #2a2a2a;
    padding: 4px;
    border-radius: 6px;
  }

  .alignment-cell {
    width: 32px;
    height: 32px;
    background: #1a1a1a;
    border: 1px solid #3a3a3a;
    border-radius: 4px;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .alignment-cell:hover {
    background: #2a2a2a;
    border-color: #4a4a4a;
  }

  .alignment-cell.selected {
    background: #0066cc;
    border-color: #0066cc;
  }

  .alignment-icon {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
  }

  /* Create visual indicators using CSS */
  .alignment-icon::before {
    content: '';
    width: 8px;
    height: 8px;
    background: #888;
    border-radius: 1px;
    position: absolute;
  }

  .alignment-cell.selected .alignment-icon::before {
    background: white;
  }

  /* Horizontal alignment (X) */
  .alignment-icon[data-x='left']::before {
    left: 0;
  }

  .alignment-icon[data-x='center']::before {
    left: 50%;
    transform: translateX(-50%);
  }

  .alignment-icon[data-x='right']::before {
    right: 0;
  }

  /* Vertical alignment (Y) */
  .alignment-icon[data-y='top']::before {
    top: 0;
  }

  .alignment-icon[data-y='center']::before {
    top: 50%;
    transform: translateY(-50%);
  }

  .alignment-icon[data-y='bottom']::before {
    bottom: 0;
  }

  /* Combined transforms */
  .alignment-icon[data-x='center'][data-y='center']::before {
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .alignment-icon[data-x='center'][data-y='top']::before {
    left: 50%;
    transform: translateX(-50%);
  }

  .alignment-icon[data-x='center'][data-y='bottom']::before {
    left: 50%;
    transform: translateX(-50%);
  }

  .alignment-icon[data-x='left'][data-y='center']::before {
    top: 50%;
    transform: translateY(-50%);
  }

  .alignment-icon[data-x='right'][data-y='center']::before {
    top: 50%;
    transform: translateY(-50%);
  }

  .alignment-selects {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .alignment-select-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .alignment-select-row label {
    min-width: 20px;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
    margin: 0;
  }

  .alignment-select-row select {
    flex: 1;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    box-sizing: border-box;
  }
</style>
