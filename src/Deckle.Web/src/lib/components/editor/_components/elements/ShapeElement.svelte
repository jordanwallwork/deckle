<script lang="ts">
  import type { ShapeElement } from '../../types';
  import TemplateRenderer from '../../TemplateRenderer.svelte';
  import { backgroundStyle, boxShadowStyle } from '../../utils';

  let { element, dpi }: { element: ShapeElement; dpi: number } = $props();

  const background = $derived(backgroundStyle(element.background));
  const boxShadow = $derived(boxShadowStyle(element.shadow));
</script>

<!--
  Placeholder shape rendering. Children are centered within the shape.
  Shape-specific clipping (clip-path, SVG masks, etc.) will be added later.
-->
<div
  class="shape-element"
  style:width="100%"
  style:height="100%"
  style:display="flex"
  style:align-items="center"
  style:justify-content="center"
  style:overflow="hidden"
  style:box-shadow={boxShadow}
  style={background}
  data-shape-type={element.shapeType}
>
  {#each element.children as child (child.id)}
    <TemplateRenderer element={child} {dpi} />
  {/each}
</div>

<style>
  .shape-element {
    position: relative;
  }
</style>
