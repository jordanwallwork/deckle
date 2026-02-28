<script lang="ts">
  import type { ShapeElement, Shadow } from '../../types';
  import TemplateRenderer from '../../TemplateRenderer.svelte';
  import { backgroundStyle, boxShadowStyle } from '../../utils';

  let { element, dpi }: { element: ShapeElement; dpi: number } = $props();

  const background = $derived(backgroundStyle(element.background));
  const boxShadow = $derived(boxShadowStyle(element.shadow));
  const dropShadowFilter = $derived(shadowToDropShadow(element.shadow));
  const clipPath = $derived(getClipPath(element.shapeType));

  function getClipPath(shapeType: string): string | undefined {
    switch (shapeType) {
      case 'circle':
        return 'circle(50% at 50% 50%)';
      case 'hexagon':
        return 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
      case 'triangle':
        return 'polygon(50% 0%, 100% 100%, 0% 100%)';
      case 'heart':
        return 'polygon(50% 30%, 61% 22%, 73% 20%, 83% 26%, 88% 36%, 87% 48%, 82% 57%, 73% 67%, 62% 75%, 50% 83%, 38% 75%, 27% 67%, 18% 57%, 13% 48%, 12% 36%, 17% 26%, 27% 20%, 39% 22%)';
      default:
        return undefined; // 'square' — rectangular, no clip needed
    }
  }

  // clip-path clips box-shadow; convert to filter:drop-shadow for clipped shapes
  function shadowToDropShadow(shadow: Shadow | Shadow[] | undefined): string | undefined {
    if (!shadow) return undefined;
    const shadows = Array.isArray(shadow) ? shadow : [shadow];
    const valid = shadows.filter((s: Shadow) => !s.inset);
    if (!valid.length) return undefined;
    return valid
      .map((s: Shadow) => `drop-shadow(${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.color})`)
      .join(' ');
  }
</script>

<!--
  Shapes with clip-path (circle, hexagon, triangle, heart) use an outer wrapper with
  filter:drop-shadow so the shadow follows the shape silhouette. Squares use box-shadow
  directly since there is no clip-path to contend with.
-->
{#if clipPath}
  <div
    class="shape-wrapper"
    style:width="100%"
    style:height="100%"
    style:filter={dropShadowFilter}
  >
    <div
      class="shape-element"
      style:width="100%"
      style:height="100%"
      style:clip-path={clipPath}
      style:overflow="hidden"
      style={background}
    >
      {#each element.children as child (child.id)}
        <TemplateRenderer element={child} {dpi} />
      {/each}
    </div>
  </div>
{:else}
  <div
    class="shape-element"
    style:width="100%"
    style:height="100%"
    style:overflow="hidden"
    style:box-shadow={boxShadow}
    style={background}
  >
    {#each element.children as child (child.id)}
      <TemplateRenderer element={child} {dpi} />
    {/each}
  </div>
{/if}

<style>
  .shape-wrapper {
    position: relative;
  }

  .shape-element {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
