<script lang="ts">
  import type { ImageElement } from "../../types";
  import { borderStyle, boxShadowStyle } from "../../utils";

  let { element, dpi }: { element: ImageElement; dpi: number } = $props();

  // Derived style properties for granular reactivity
  const objectFit = $derived(element.objectFit);
  const objectPosition = $derived(element.objectPosition);
  const border = $derived(borderStyle(element.border, dpi));
  const borderRadius = $derived(
    element.borderRadius ? `${element.borderRadius}px` : undefined
  );
  const boxShadow = $derived(boxShadowStyle(element.shadow));
</script>

<img
  src={element.imageId}
  alt={element.label}
  style:width="100%"
  style:height="100%"
  style:display="block"
  style:object-fit={objectFit}
  style:object-position={objectPosition}
  style={border}
  style:border-radius={borderRadius}
  style:box-shadow={boxShadow}
  class="image-element"
/>

<style>
  .image-element {
    /* Element-specific styles only */
  }
</style>
