<script lang="ts">
  import type { ImageElement } from '../../types';
  import { borderStyle, boxShadowStyle } from '../../utils';

  let { element, dpi }: { element: ImageElement; dpi: number } = $props();

  // Derived style properties for granular reactivity
  const objectFit = $derived(element.objectFit);
  const objectPosition = $derived(element.objectPosition);
  const border = $derived(borderStyle(element.border, dpi));
  // Border radius is handled by borderStyle helper, no need for separate property
  const boxShadow = $derived(boxShadowStyle(element.shadow));

  // Generate placeholder URL when imageId is empty
  // Use default 400x300 dimensions for placeholder (image elements inherit size from container)
  const displaySrc = $derived(
    element.imageId && element.imageId.trim() !== ''
      ? element.imageId
      : `https://placehold.co/400x300/e5e7eb/9ca3af.png?text=Image`
  );
</script>

<img
  src={displaySrc}
  alt={element.label}
  style:width="100%"
  style:height="100%"
  style:display="block"
  style:object-fit={objectFit}
  style:object-position={objectPosition}
  style={border}
  style:box-shadow={boxShadow}
  class="image-element"
/>

<style>
  .image-element {
    /* Element-specific styles only */
  }
</style>
