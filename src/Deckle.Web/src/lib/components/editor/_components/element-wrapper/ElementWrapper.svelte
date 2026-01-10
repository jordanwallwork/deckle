<script lang="ts">
  import type { TemplateElement } from "../../types";
  import ResizeHandles from "./ResizeHandles.svelte";
  import DragHandles from "./DragHandles.svelte";
  import RotationHandle from "./RotationHandle.svelte";
  import { templateStore } from "$lib/stores/templateElements";
  import { mmToPx } from "$lib/utils/size.utils";

  let {
    element,
    dpi,
    children,
  }: {
    element: TemplateElement;
    dpi: number;
    children: any;
  } = $props();

  const isHovered = $derived($templateStore.hoveredElementId === element.id);
  const isSelected = $derived($templateStore.selectedElementId === element.id);

  // Helper to convert spacing to CSS string
  function spacingToCss(
    spacing:
      | {
          all?: number | string;
          top?: number | string;
          right?: number | string;
          bottom?: number | string;
          left?: number | string;
        }
      | undefined
  ): string | undefined {
    if (!spacing) return undefined;

    // If 'all' is defined, use it for all sides
    if (spacing.all !== undefined) {
      return dimensionValue(spacing.all);
    }

    // Otherwise use individual sides
    const top = dimensionValue(spacing.top ?? 0);
    const right = dimensionValue(spacing.right ?? 0);
    const bottom = dimensionValue(spacing.bottom ?? 0);
    const left = dimensionValue(spacing.left ?? 0);
    return `${top} ${right} ${bottom} ${left}`;
  }

  // Helper to convert dimensions to CSS
  function dimensionValue(value: number | string | undefined): string {
    if (value === undefined) return "auto";
    if (typeof value === "number") return `${value}px`;

    // Handle mm unit - convert to px
    if (typeof value === "string" && value.includes("mm")) {
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue)) {
        return `${mmToPx(numericValue, dpi)}px`;
      }
    }

    return value;
  }

  // Derived style properties for granular reactivity
  const position = $derived(
    element.position === "absolute" ? "absolute" : "relative"
  );
  const left = $derived(
    element.position === "absolute" && element.x !== undefined
      ? dimensionValue(element.x)
      : undefined
  );
  const top = $derived(
    element.position === "absolute" && element.y !== undefined
      ? dimensionValue(element.y)
      : undefined
  );
  const margin = $derived(spacingToCss(element.margin));

  const width = $derived(
    element.dimensions?.width !== undefined
      ? dimensionValue(element.dimensions.width)
      : undefined
  );
  const height = $derived(
    element.dimensions?.height !== undefined
      ? dimensionValue(element.dimensions.height)
      : undefined
  );
  const minWidth = $derived(
    element.dimensions?.minWidth !== undefined
      ? dimensionValue(element.dimensions.minWidth)
      : undefined
  );
  const maxWidth = $derived(
    element.dimensions?.maxWidth !== undefined
      ? dimensionValue(element.dimensions.maxWidth)
      : undefined
  );
  const minHeight = $derived(
    element.dimensions?.minHeight !== undefined
      ? dimensionValue(element.dimensions.minHeight)
      : undefined
  );
  const maxHeight = $derived(
    element.dimensions?.maxHeight !== undefined
      ? dimensionValue(element.dimensions.maxHeight)
      : undefined
  );

  const zIndex = $derived(element.zIndex);
  const opacity = $derived(element.opacity);
  const transform = $derived(
    element.rotation !== undefined && element.rotation !== 0
      ? `rotate(${element.rotation}deg)`
      : undefined
  );
  const display = $derived(element.visible === false ? "none" : undefined);

  function handleMouseEnter() {
    // Don't hover locked elements in preview
    if (!element.locked) {
      templateStore.setHoveredElement(element.id);
    }
  }

  function handleMouseLeave() {
    templateStore.setHoveredElement(null);
  }

  function handleClick(e: MouseEvent) {
    // Don't select locked elements in preview - let clicks pass through
    if (element.locked) {
      return;
    }
    e.stopPropagation();
    templateStore.selectElement(element.id);
  }
</script>

<div
  style:position
  style:left
  style:top
  style:margin
  style:width
  style:height
  style:min-width={minWidth}
  style:max-width={maxWidth}
  style:min-height={minHeight}
  style:max-height={maxHeight}
  style:z-index={zIndex}
  style:opacity
  style:transform
  style:display
  data-element-id={element.id}
  class="editable-element"
  class:locked={element.locked}
  class:hovered={isHovered}
  class:selected={isSelected}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onclick={handleClick}
  role="button"
  tabindex="0"
>
  {@render children()}

  {#if isSelected && !element.locked}
    <ResizeHandles {element} />
    <RotationHandle {element} />
    {#if element.position === "absolute"}
      <DragHandles {element} />
    {/if}
  {/if}
</div>

<style>
  .editable-element {
    cursor: pointer;
    transition:
      outline 0.15s ease,
      box-shadow 0.15s ease;
  }

  .editable-element.locked {
    cursor: default;
  }

  .editable-element.hovered {
    outline: 1px dashed #0066cc;
    outline-offset: 2px;
  }

  .editable-element.selected {
    outline: 2px solid #0066cc;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(0, 102, 204, 0.1);
  }
</style>
