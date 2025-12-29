<script lang="ts">
  import type { Dimensions, ComponentShape, RectangleShape } from "$lib/types";
  import { templateStore } from "$lib/stores/templateElements";
  import TemplateRenderer from "./TemplateRenderer.svelte";
  import { mmToPx } from "$lib/utils/size.utils";

  let {
    dimensions,
    shape,
    showBleedSafeArea = false,
  }: {
    dimensions: Dimensions;
    shape?: ComponentShape;
    showBleedSafeArea?: boolean;
  } = $props();

  // Calculate border radius for different areas when shape is a rectangle
  let borderRadius = $derived(
    !shape || shape.type !== "rectangle"
      ? { component: 0, bleed: 0, safe: 0 }
      : (() => {
          const rectShape = shape as RectangleShape;
          const basePx = mmToPx(rectShape.borderRadiusMm, dimensions.dpi);
          const bleedPx = dimensions.bleedPx;

          return {
            component: basePx + bleedPx, // Outer area (includes bleed)
            bleed: basePx, // Trim area (red border)
            safe: Math.max(0, basePx - bleedPx), // Safe area (green border)
          };
        })()
  );
</script>

<div
  class="component"
  class:show-bleed-safe-area={showBleedSafeArea}
  style:width={dimensions.widthPx + 2 * dimensions.bleedPx + "px"}
  style:height={dimensions.heightPx + 2 * dimensions.bleedPx + "px"}
  style:--bleed-px={dimensions.bleedPx + "px"}
  style:--width-px={dimensions.widthPx + "px"}
  style:--height-px={dimensions.heightPx + "px"}
  style:--border-radius-component={borderRadius.component + "px"}
  style:--border-radius-bleed={borderRadius.bleed + "px"}
  style:--border-radius-safe={borderRadius.safe + "px"}
>
  {#each $templateStore.root.children as child (child.id)}
    <TemplateRenderer element={child} />
  {/each}
</div>

<style>
  .component {
    background-color: #fff;
    overflow: hidden;
    position: relative;
    border-radius: var(--border-radius-component);
  }

  .component.show-bleed-safe-area::before {
    content: "";
    position: absolute;
    top: calc(var(--bleed-px) * 2);
    left: calc(var(--bleed-px) * 2);
    width: calc(var(--width-px) - var(--bleed-px) * 2);
    height: calc(var(--height-px) - var(--bleed-px) * 2);
    border: 1px dotted green;
    border-radius: var(--border-radius-safe);
    pointer-events: none;
    z-index: 1;
  }

  .component.show-bleed-safe-area::after {
    content: "";
    position: absolute;
    top: var(--bleed-px);
    left: var(--bleed-px);
    width: var(--width-px);
    height: var(--height-px);
    border: 1px solid red;
    border-radius: var(--border-radius-bleed);
    pointer-events: none;
    z-index: 1;
  }
</style>
