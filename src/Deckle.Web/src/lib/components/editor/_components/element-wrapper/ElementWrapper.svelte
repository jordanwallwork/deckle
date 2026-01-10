<script lang="ts">
  import type { TemplateElement } from "../../types";
  import ResizeHandles from "./ResizeHandles.svelte";
  import DragHandles from "./DragHandles.svelte";
  import RotationHandle from "./RotationHandle.svelte";
  import { templateStore } from "$lib/stores/templateElements";
  import { spacingToCss, dimensionValue } from "../../utils";

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

  // Derived style properties for granular reactivity
  const position = $derived(
    element.position === "absolute" ? "absolute" : "relative"
  );
  const left = $derived(
    element.position === "absolute" ? dimensionValue(element.x, dpi) : undefined
  );
  const top = $derived(
    element.position === "absolute" ? dimensionValue(element.y, dpi) : undefined
  );
  const margin = $derived(spacingToCss(element.margin, dpi));

  const width = $derived(dimensionValue(element.dimensions?.width, dpi));
  const height = $derived(dimensionValue(element.dimensions?.height, dpi));
  const minWidth = $derived(dimensionValue(element.dimensions?.minWidth, dpi));
  const maxWidth = $derived(dimensionValue(element.dimensions?.maxWidth, dpi));
  const minHeight = $derived(dimensionValue(element.dimensions?.minHeight, dpi));
  const maxHeight = $derived(dimensionValue(element.dimensions?.maxHeight, dpi));

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
