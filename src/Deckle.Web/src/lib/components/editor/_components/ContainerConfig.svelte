<script lang="ts">
  import type { ContainerElement } from "../types";
  import { templateStore } from "$lib/stores/templateElements";
  import ConfigSection from "./ConfigSection.svelte";
  import FieldWrapper from "./FieldWrapper.svelte";
  import SelectField from "./SelectField.svelte";
  import VisibilityCheckbox from "./VisibilityCheckbox.svelte";
  import LockCheckbox from "./LockCheckbox.svelte";
  import PositionControls from "./PositionControls.svelte";
  import DimensionInput from "./DimensionInput.svelte";
  import ColorPicker from "./ColorPicker.svelte";
  import PaddingControls from "./PaddingControls.svelte";
  import BorderConfig from "./BorderConfig.svelte";
  import Fields from "./Fields.svelte";
  import NumberField from "./NumberField.svelte";

  let { element }: { element: ContainerElement } = $props();

  function updateElement(updates: Partial<ContainerElement>) {
    templateStore.updateElement(element.id, updates);
  }

  // Determine if flex direction is column-based
  const isColumn = $derived(
    element.flexConfig?.direction === "column" ||
      element.flexConfig?.direction === "column-reverse"
  );

  // Get current X and Y values based on direction
  const currentX = $derived(() => {
    const justify = element.flexConfig?.justifyContent || "flex-start";
    const align = element.flexConfig?.alignItems || "flex-start";

    if (isColumn) {
      // In column mode, X controls alignItems
      return cssToUserValue(align, "cross");
    } else {
      // In row mode, X controls justifyContent
      return cssToUserValue(justify, "main");
    }
  });

  const currentY = $derived(() => {
    const justify = element.flexConfig?.justifyContent || "flex-start";
    const align = element.flexConfig?.alignItems || "flex-start";

    if (isColumn) {
      // In column mode, Y controls justifyContent
      return cssToUserValue(justify, "main");
    } else {
      // In row mode, Y controls alignItems
      return cssToUserValue(align, "cross");
    }
  });

  // Convert CSS values to user-friendly values
  function cssToUserValue(cssValue: string, axis: "main" | "cross"): string {
    if (axis === "main") {
      // Main axis can have space-between, space-around
      const map: Record<string, string> = {
        "flex-start": isColumn ? "top" : "left",
        "flex-end": isColumn ? "bottom" : "right",
        center: "center",
        "space-between": "space-between",
        "space-around": "space-around",
        "space-evenly": "space-around", // Map space-evenly to space-around
      };
      return map[cssValue] || cssValue;
    } else {
      // Cross axis
      const map: Record<string, string> = {
        "flex-start": isColumn ? "left" : "top",
        "flex-end": isColumn ? "right" : "bottom",
        center: "center",
        stretch: "stretch",
        baseline: "stretch", // Map baseline to stretch
      };
      return map[cssValue] || cssValue;
    }
  }

  // Convert user-friendly values to CSS values
  function userValueToCss(userValue: string, axis: "main" | "cross"): string {
    if (axis === "main") {
      const map: Record<string, string> = {
        left: "flex-start",
        right: "flex-end",
        top: "flex-start",
        bottom: "flex-end",
        center: "center",
        "space-between": "space-between",
        "space-around": "space-around",
      };
      return map[userValue] || userValue;
    } else {
      const map: Record<string, string> = {
        left: "flex-start",
        right: "flex-end",
        top: "flex-start",
        bottom: "flex-end",
        center: "center",
        stretch: "stretch",
      };
      return map[userValue] || userValue;
    }
  }

  // Update alignment based on X/Y values
  function updateAlignment(x?: string, y?: string) {
    const currentJustify = element.flexConfig?.justifyContent || "flex-start";
    const currentAlign = element.flexConfig?.alignItems || "flex-start";

    let newJustify: string = currentJustify;
    let newAlign: string = currentAlign;

    if (isColumn) {
      // In column mode: X = alignItems, Y = justifyContent
      if (x !== undefined) {
        newAlign = userValueToCss(x, "cross");
      }
      if (y !== undefined) {
        newJustify = userValueToCss(y, "main");
      }
    } else {
      // In row mode: X = justifyContent, Y = alignItems
      if (x !== undefined) {
        newJustify = userValueToCss(x, "main");
      }
      if (y !== undefined) {
        newAlign = userValueToCss(y, "cross");
      }
    }

    updateElement({
      flexConfig: {
        ...element.flexConfig,
        justifyContent: newJustify as any,
        alignItems: newAlign as any,
      },
    });
  }

  // Get options for X and Y based on direction
  const xOptions = $derived(() => {
    if (isColumn) {
      return [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
        { value: "stretch", label: "Stretch" },
      ];
    } else {
      return [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
        { value: "space-between", label: "Space Between" },
        { value: "space-around", label: "Space Around" },
      ];
    }
  });

  const yOptions = $derived(() => {
    if (isColumn) {
      return [
        { value: "top", label: "Top" },
        { value: "center", label: "Center" },
        { value: "bottom", label: "Bottom" },
        { value: "space-between", label: "Space Between" },
        { value: "space-around", label: "Space Around" },
      ];
    } else {
      return [
        { value: "top", label: "Top" },
        { value: "center", label: "Center" },
        { value: "bottom", label: "Bottom" },
        { value: "stretch", label: "Stretch" },
      ];
    }
  });

  // Get the grid cells for the alignment grid
  const gridCells = $derived(() => {
    const cells: Array<{ x: string; y: string }> = [];

    // Only show the 3x3 grid with basic alignments
    const xValues = isColumn
      ? ["left", "center", "right"]
      : ["left", "center", "right"];
    const yValues = isColumn
      ? ["top", "center", "bottom"]
      : ["top", "center", "bottom"];

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

<ConfigSection>
  <VisibilityCheckbox
    visible={element.visible}
    onchange={(visible) => updateElement({ visible })}
  />

  <LockCheckbox
    locked={element.locked}
    onchange={(locked) => updateElement({ locked })}
  />

  {#if element.position === "absolute"}
    <PositionControls
      x={element.x}
      y={element.y}
      onchange={(updates) => updateElement(updates)}
    />
  {/if}

  <NumberField
    label="Rotation"
    id="rotation"
    value={element.rotation ?? 0}
    min={-360}
    max={360}
    step={1}
    unit="°"
    onchange={(rotation) => updateElement({ rotation })}
  />

  <SelectField
    label="Display"
    id="display"
    value={element.display || "flex"}
    options={[
      { value: "flex", label: "Flex" },
      { value: "block", label: "Block" },
    ]}
    onchange={(value) => updateElement({ display: value as "flex" | "block" })}
  />

  {#if element.display === "flex"}
    <Fields>
      <SelectField
        label="Direction"
        id="flex-direction"
        value={element.flexConfig?.direction || "row"}
        options={[
          { value: "row", label: "Left to Right" },
          { value: "row-reverse", label: "Right to Left" },
          { value: "column", label: "Top to Bottom" },
          { value: "column-reverse", label: "Bottom to Top" },
        ]}
        onchange={(value) =>
          updateElement({
            flexConfig: {
              ...element.flexConfig,
              direction: value as any,
            },
          })}
      />

      <SelectField
        label="Flex wrap"
        id="flex-wrap"
        value={element.flexConfig?.wrap || "nowrap"}
        options={[
          { value: "nowrap", label: "No Wrap" },
          { value: "wrap", label: "Wrap" },
          { value: "wrap-reverse", label: "Wrap Reverse" },
        ]}
        onchange={(value) =>
          updateElement({
            flexConfig: {
              ...element.flexConfig,
              wrap: value as any,
            },
          })}
      />
    </Fields>

    <FieldWrapper label="Align children" htmlFor="align-children">
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
              onchange={(e) =>
                updateAlignment(e.currentTarget.value, undefined)}
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
              onchange={(e) =>
                updateAlignment(undefined, e.currentTarget.value)}
            >
              {#each yOptions() as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>
    </FieldWrapper>

    <FieldWrapper label="Gap" htmlFor="gap">
      <div class="gap-control">
        <input
          type="range"
          id="gap"
          min="0"
          max="50"
          value={element.flexConfig?.gap || 0}
          oninput={(e) =>
            updateElement({
              flexConfig: {
                ...element.flexConfig,
                gap: parseInt(e.currentTarget.value) || 0,
              },
            })}
        />
        <input
          type="number"
          class="gap-number"
          min="0"
          value={element.flexConfig?.gap || 0}
          oninput={(e) =>
            updateElement({
              flexConfig: {
                ...element.flexConfig,
                gap: parseInt(e.currentTarget.value) || 0,
              },
            })}
        />
        <span class="unit">px</span>
      </div>
    </FieldWrapper>
  {/if}

  <ColorPicker
    label="Background Color"
    id="bg-color"
    value={element.background?.color || "#ffffff"}
    onchange={(color) =>
      updateElement({
        background: {
          ...element.background,
          color,
        },
      })}
  />

  <PaddingControls
    padding={element.padding}
    onchange={(padding) => updateElement({ padding })}
  />

  <BorderConfig
    border={element.border}
    onchange={(border) => updateElement({ border })}
  />

  <Fields>
    <DimensionInput
      label="Width"
      id="width"
      value={element.dimensions?.width?.toString()}
      onchange={(width) =>
        updateElement({
          dimensions: {
            ...element.dimensions,
            width,
          },
        })}
    />

    <DimensionInput
      label="Height"
      id="height"
      value={element.dimensions?.height?.toString()}
      onchange={(height) =>
        updateElement({
          dimensions: {
            ...element.dimensions,
            height,
          },
        })}
    />
  </Fields>
</ConfigSection>

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
    content: "";
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
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    box-sizing: border-box;
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
    appearance: none;
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
    line-height: 1.25rem;
    height: 2.125rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    text-align: center;
    box-sizing: border-box;
  }

  .gap-control .unit {
    font-size: 0.75rem;
    color: #666;
  }
</style>
