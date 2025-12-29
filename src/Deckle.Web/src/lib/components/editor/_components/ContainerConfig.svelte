<script lang="ts">
  import type { ContainerElement } from '../types';
  import { templateStore } from '$lib/stores/templateElements';

  let { element }: { element: ContainerElement } = $props();

  function updateElement(updates: Partial<ContainerElement>) {
    templateStore.updateElement(element.id, updates);
  }

  // Determine if flex direction is column-based
  const isColumn = $derived(
    element.flexConfig?.direction === 'column' ||
    element.flexConfig?.direction === 'column-reverse'
  );

  // Get current X and Y values based on direction
  const currentX = $derived(() => {
    const justify = element.flexConfig?.justifyContent || 'flex-start';
    const align = element.flexConfig?.alignItems || 'flex-start';

    if (isColumn) {
      // In column mode, X controls alignItems
      return cssToUserValue(align, 'cross');
    } else {
      // In row mode, X controls justifyContent
      return cssToUserValue(justify, 'main');
    }
  });

  const currentY = $derived(() => {
    const justify = element.flexConfig?.justifyContent || 'flex-start';
    const align = element.flexConfig?.alignItems || 'flex-start';

    if (isColumn) {
      // In column mode, Y controls justifyContent
      return cssToUserValue(justify, 'main');
    } else {
      // In row mode, Y controls alignItems
      return cssToUserValue(align, 'cross');
    }
  });

  // Convert CSS values to user-friendly values
  function cssToUserValue(cssValue: string, axis: 'main' | 'cross'): string {
    if (axis === 'main') {
      // Main axis can have space-between, space-around
      const map: Record<string, string> = {
        'flex-start': isColumn ? 'top' : 'left',
        'flex-end': isColumn ? 'bottom' : 'right',
        'center': 'center',
        'space-between': 'space-between',
        'space-around': 'space-around',
        'space-evenly': 'space-around' // Map space-evenly to space-around
      };
      return map[cssValue] || cssValue;
    } else {
      // Cross axis
      const map: Record<string, string> = {
        'flex-start': isColumn ? 'left' : 'top',
        'flex-end': isColumn ? 'right' : 'bottom',
        'center': 'center',
        'stretch': 'stretch',
        'baseline': 'stretch' // Map baseline to stretch
      };
      return map[cssValue] || cssValue;
    }
  }

  // Convert user-friendly values to CSS values
  function userValueToCss(userValue: string, axis: 'main' | 'cross'): string {
    if (axis === 'main') {
      const map: Record<string, string> = {
        'left': 'flex-start',
        'right': 'flex-end',
        'top': 'flex-start',
        'bottom': 'flex-end',
        'center': 'center',
        'space-between': 'space-between',
        'space-around': 'space-around'
      };
      return map[userValue] || userValue;
    } else {
      const map: Record<string, string> = {
        'left': 'flex-start',
        'right': 'flex-end',
        'top': 'flex-start',
        'bottom': 'flex-end',
        'center': 'center',
        'stretch': 'stretch'
      };
      return map[userValue] || userValue;
    }
  }

  // Update alignment based on X/Y values
  function updateAlignment(x?: string, y?: string) {
    const currentJustify = element.flexConfig?.justifyContent || 'flex-start';
    const currentAlign = element.flexConfig?.alignItems || 'flex-start';

    let newJustify = currentJustify;
    let newAlign = currentAlign;

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

    updateElement({
      flexConfig: {
        ...element.flexConfig,
        justifyContent: newJustify as any,
        alignItems: newAlign as any
      }
    });
  }

  // Get options for X and Y based on direction
  const xOptions = $derived(() => {
    if (isColumn) {
      return [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
        { value: 'stretch', label: 'Stretch' }
      ];
    } else {
      return [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
        { value: 'space-between', label: 'Space Between' },
        { value: 'space-around', label: 'Space Around' }
      ];
    }
  });

  const yOptions = $derived(() => {
    if (isColumn) {
      return [
        { value: 'top', label: 'Top' },
        { value: 'center', label: 'Center' },
        { value: 'bottom', label: 'Bottom' },
        { value: 'space-between', label: 'Space Between' },
        { value: 'space-around', label: 'Space Around' }
      ];
    } else {
      return [
        { value: 'top', label: 'Top' },
        { value: 'center', label: 'Center' },
        { value: 'bottom', label: 'Bottom' },
        { value: 'stretch', label: 'Stretch' }
      ];
    }
  });

  // Get the grid cells for the alignment grid
  const gridCells = $derived(() => {
    const cells: Array<{ x: string; y: string }> = [];

    // Only show the 3x3 grid with basic alignments
    const xValues = isColumn ? ['left', 'center', 'right'] : ['left', 'center', 'right'];
    const yValues = isColumn ? ['top', 'center', 'bottom'] : ['top', 'center', 'bottom'];

    for (const y of yValues) {
      for (const x of xValues) {
        cells.push({ x, y });
      }
    }

    return cells;
  });

  function isSelected(x: string, y: string): boolean {
    return currentX() === x && currentY() === y;
  }
</script>

<div class="config-section">
  <h3 class="section-title">Container Settings</h3>

  <div class="field checkbox-field">
    <label>
      <input
        type="checkbox"
        checked={element.visible !== false}
        onchange={(e) => updateElement({ visible: e.currentTarget.checked })}
      />
      <span>Visible</span>
    </label>
  </div>

  {#if element.position === 'absolute'}
    <div class="field">
      <label class="section-label">Position:</label>
      <div class="padding-grid">
        <div class="padding-input">
          <label for="position-x">Left</label>
          <input
            type="number"
            id="position-x"
            value={element.x ?? 0}
            oninput={(e) => updateElement({ x: parseInt(e.currentTarget.value) || 0 })}
          />
          <span class="unit">px</span>
        </div>

        <div class="padding-input">
          <label for="position-y">Top</label>
          <input
            type="number"
            id="position-y"
            value={element.y ?? 0}
            oninput={(e) => updateElement({ y: parseInt(e.currentTarget.value) || 0 })}
          />
          <span class="unit">px</span>
        </div>
      </div>
    </div>
  {/if}

  <div class="field">
    <label for="display">Display:</label>
    <select
      id="display"
      value={element.display || 'flex'}
      onchange={(e) => updateElement({ display: e.currentTarget.value as 'flex' | 'block' })}
    >
      <option value="flex">Flex</option>
      <option value="block">Block</option>
    </select>
  </div>

  {#if element.display === 'flex'}
    <div class="field">
      <label for="flex-direction">Direction:</label>
      <select
        id="flex-direction"
        value={element.flexConfig?.direction || 'row'}
        onchange={(e) => updateElement({
          flexConfig: {
            ...element.flexConfig,
            direction: e.currentTarget.value as any
          }
        })}
      >
        <option value="row">Left to Right</option>
        <option value="row-reverse">Right to Left</option>
        <option value="column">Top to Bottom</option>
        <option value="column-reverse">Bottom to Top</option>
      </select>
    </div>

    <div class="field">
      <label class="section-label">Align children:</label>
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
    </div>

    <div class="field">
      <label for="flex-wrap">Flex wrap:</label>
      <select
        id="flex-wrap"
        value={element.flexConfig?.wrap || 'nowrap'}
        onchange={(e) => updateElement({
          flexConfig: {
            ...element.flexConfig,
            wrap: e.currentTarget.value as any
          }
        })}
      >
        <option value="nowrap">No Wrap</option>
        <option value="wrap">Wrap</option>
        <option value="wrap-reverse">Wrap Reverse</option>
      </select>
    </div>

    <div class="field">
      <label for="gap">Gap:</label>
      <div class="gap-control">
        <input
          type="range"
          id="gap"
          min="0"
          max="50"
          value={element.flexConfig?.gap || 0}
          oninput={(e) => updateElement({
            flexConfig: {
              ...element.flexConfig,
              gap: parseInt(e.currentTarget.value) || 0
            }
          })}
        />
        <input
          type="number"
          class="gap-number"
          min="0"
          value={element.flexConfig?.gap || 0}
          oninput={(e) => updateElement({
            flexConfig: {
              ...element.flexConfig,
              gap: parseInt(e.currentTarget.value) || 0
            }
          })}
        />
        <span class="unit">px</span>
      </div>
    </div>
  {/if}

  <div class="field">
    <label for="bg-color">Background Color:</label>
    <div class="color-input">
      <input
        type="color"
        id="bg-color"
        value={element.background?.color || '#ffffff'}
        oninput={(e) => updateElement({
          background: {
            ...element.background,
            color: e.currentTarget.value
          }
        })}
      />
      <input
        type="text"
        value={element.background?.color || '#ffffff'}
        oninput={(e) => updateElement({
          background: {
            ...element.background,
            color: e.currentTarget.value
          }
        })}
      />
    </div>
  </div>

  <div class="field">
    <label class="section-label">Padding:</label>
    <div class="padding-grid">
      <div class="padding-input">
        <label for="padding-top">Top</label>
        <input
          type="number"
          id="padding-top"
          value={element.padding?.top ?? ''}
          oninput={(e) => updateElement({
            padding: {
              ...element.padding,
              top: parseInt(e.currentTarget.value) || 0
            }
          })}
        />
        <span class="unit">px</span>
      </div>

      <div class="padding-input">
        <label for="padding-right">Right</label>
        <input
          type="number"
          id="padding-right"
          value={element.padding?.right ?? ''}
          oninput={(e) => updateElement({
            padding: {
              ...element.padding,
              right: parseInt(e.currentTarget.value) || 0
            }
          })}
        />
        <span class="unit">px</span>
      </div>

      <div class="padding-input">
        <label for="padding-bottom">Bottom</label>
        <input
          type="number"
          id="padding-bottom"
          value={element.padding?.bottom ?? ''}
          oninput={(e) => updateElement({
            padding: {
              ...element.padding,
              bottom: parseInt(e.currentTarget.value) || 0
            }
          })}
        />
        <span class="unit">px</span>
      </div>

      <div class="padding-input">
        <label for="padding-left">Left</label>
        <input
          type="number"
          id="padding-left"
          value={element.padding?.left ?? ''}
          oninput={(e) => updateElement({
            padding: {
              ...element.padding,
              left: parseInt(e.currentTarget.value) || 0
            }
          })}
        />
        <span class="unit">px</span>
      </div>
    </div>
  </div>

  <div class="field">
    <label for="width">Width:</label>
    <div class="dimension-input">
      <input
        type="number"
        id="width"
        placeholder="auto"
        value={(() => {
          const width = String(element.dimensions?.width ?? '');
          if (!width) return '';
          const match = width.match(/^(\d+\.?\d*)/);
          return match ? match[1] : '';
        })()}
        oninput={(e) => {
          const value = e.currentTarget.value;
          const unit = (() => {
            const width = String(element.dimensions?.width ?? '');
            if (width.includes('%')) return '%';
            return 'px';
          })();
          updateElement({
            dimensions: {
              ...element.dimensions,
              width: value ? `${value}${unit}` : undefined
            }
          });
        }}
      />
      <select
        class="unit-select"
        class:disabled-unit={!element.dimensions?.width}
        value={(() => {
          const width = String(element.dimensions?.width ?? '');
          if (width.includes('%')) return '%';
          return 'px';
        })()}
        onchange={(e) => {
          const width = String(element.dimensions?.width ?? '');
          const match = width.match(/^(\d+\.?\d*)/);
          const value = match ? match[1] : '';
          if (value) {
            updateElement({
              dimensions: {
                ...element.dimensions,
                width: `${value}${e.currentTarget.value}`
              }
            });
          }
        }}
      >
        <option value="px">px</option>
        <option value="%">%</option>
      </select>
    </div>
  </div>

  <div class="field">
    <label for="height">Height:</label>
    <div class="dimension-input">
      <input
        type="number"
        id="height"
        placeholder="auto"
        value={(() => {
          const height = String(element.dimensions?.height ?? '');
          if (!height) return '';
          const match = height.match(/^(\d+\.?\d*)/);
          return match ? match[1] : '';
        })()}
        oninput={(e) => {
          const value = e.currentTarget.value;
          const unit = (() => {
            const height = String(element.dimensions?.height ?? '');
            if (height.includes('%')) return '%';
            return 'px';
          })();
          updateElement({
            dimensions: {
              ...element.dimensions,
              height: value ? `${value}${unit}` : undefined
            }
          });
        }}
      />
      <select
        class="unit-select"
        class:disabled-unit={!element.dimensions?.height}
        value={(() => {
          const height = String(element.dimensions?.height ?? '');
          if (height.includes('%')) return '%';
          return 'px';
        })()}
        onchange={(e) => {
          const height = String(element.dimensions?.height ?? '');
          const match = height.match(/^(\d+\.?\d*)/);
          const value = match ? match[1] : '';
          if (value) {
            updateElement({
              dimensions: {
                ...element.dimensions,
                height: `${value}${e.currentTarget.value}`
              }
            });
          }
        }}
      >
        <option value="px">px</option>
        <option value="%">%</option>
      </select>
    </div>
  </div>
</div>

<style>
  .config-section {
    padding: 1rem;
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    color: #333;
  }

  .field {
    margin-bottom: 1rem;
  }

  .field label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
    margin-bottom: 0.25rem;
  }

  .checkbox-field label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-field input[type="checkbox"] {
    width: auto;
    cursor: pointer;
  }

  .checkbox-field span {
    font-size: 0.813rem;
    color: #333;
  }

  .field input[type="text"],
  .field input[type="number"],
  .field select {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
  }

  .field input[type="text"]:focus,
  .field input[type="number"]:focus,
  .field select:focus {
    outline: none;
    border-color: #0066cc;
  }

  .color-input {
    display: flex;
    gap: 0.5rem;
  }

  .color-input input[type="color"] {
    width: 50px;
    height: 36px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
  }

  .color-input input[type="text"] {
    flex: 1;
  }

  .section-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
    margin-bottom: 0.5rem;
  }

  .padding-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .padding-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .padding-input label {
    font-size: 0.75rem;
    color: #666;
    margin: 0;
    min-width: 40px;
  }

  .padding-input input[type="number"] {
    flex: 1;
    min-width: 0;
    padding: 0.375rem 0.5rem;
  }

  .padding-input .unit {
    font-size: 0.75rem;
    color: #666;
  }

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
  .alignment-icon[data-x="left"]::before {
    left: 0;
  }

  .alignment-icon[data-x="center"]::before {
    left: 50%;
    transform: translateX(-50%);
  }

  .alignment-icon[data-x="right"]::before {
    right: 0;
  }

  /* Vertical alignment (Y) */
  .alignment-icon[data-y="top"]::before {
    top: 0;
  }

  .alignment-icon[data-y="center"]::before {
    top: 50%;
    transform: translateY(-50%);
  }

  .alignment-icon[data-y="bottom"]::before {
    bottom: 0;
  }

  /* Combined transforms */
  .alignment-icon[data-x="center"][data-y="center"]::before {
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .alignment-icon[data-x="center"][data-y="top"]::before {
    left: 50%;
    transform: translateX(-50%);
  }

  .alignment-icon[data-x="center"][data-y="bottom"]::before {
    left: 50%;
    transform: translateX(-50%);
  }

  .alignment-icon[data-x="left"][data-y="center"]::before {
    top: 50%;
    transform: translateY(-50%);
  }

  .alignment-icon[data-x="right"][data-y="center"]::before {
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
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
  }

  .gap-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .gap-control input[type="range"] {
    flex: 1;
    height: 4px;
    background: #d1d5db;
    border-radius: 2px;
    outline: none;
    -webkit-appearance: none;
  }

  .gap-control input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: #0066cc;
    border-radius: 50%;
    cursor: pointer;
  }

  .gap-control input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #0066cc;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }

  .gap-control .gap-number {
    width: 60px;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    text-align: center;
  }

  .gap-control .unit {
    font-size: 0.75rem;
    color: #666;
  }

  .dimension-input {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .dimension-input input[type="number"] {
    flex: 1;
    min-width: 0;
  }

  .dimension-input .unit-select {
    width: 60px;
    padding: 0.375rem 0.5rem;
    font-size: 0.813rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    cursor: pointer;
  }

  .dimension-input .unit-select.disabled-unit {
    opacity: 0.4;
    color: #999;
  }

  .dimension-input .unit-select:focus {
    outline: none;
    border-color: #0066cc;
  }
</style>
