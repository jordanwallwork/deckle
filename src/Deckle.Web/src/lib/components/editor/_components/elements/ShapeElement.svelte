<script lang="ts">
  import type { ShapeElement, Shadow } from '../../types';
  import TemplateRenderer from '../../TemplateRenderer.svelte';
  import { backgroundStyle, boxShadowStyle } from '../../utils';

  let { element, dpi }: { element: ShapeElement; dpi: number } = $props();

  const background = $derived(backgroundStyle(element.background));
  const boxShadow = $derived(boxShadowStyle(element.shadow));
  const dropShadowFilter = $derived(shadowToDropShadow(element.shadow));
  const clipPath = $derived(getClipPath(element.shapeType, element.id));

  // Heart path in objectBoundingBox units (0–1). Uses cubic Bézier curves for smooth lobes.
  // Points: bottom tip (0.5,1), left lobe peak (0.25,0), centre dip (0.5,0.25), right lobe peak (0.75,0).
  const heartPath =
    'M 0.5,1 C 0.2,0.8 0,0.6 0,0.4 C 0,0.1 0.15,0 0.25,0 C 0.38,0 0.5,0.1 0.5,0.25 C 0.5,0.1 0.62,0 0.75,0 C 0.85,0 1,0.1 1,0.4 C 1,0.6 0.8,0.8 0.5,1 Z';

  function getClipPath(shapeType: string, id: string): string | undefined {
    switch (shapeType) {
      case 'circle':
        return 'ellipse(50% 50% at 50% 50%)';
      case 'hexagon':
        return 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
      case 'triangle':
        return 'polygon(50% 0%, 100% 100%, 0% 100%)';
      case 'heart':
        return `url(#heart-clip-${id})`;
      default:
        return undefined;
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
  Heart shape uses an SVG clipPath with objectBoundingBox units so the Bézier curves scale
  with the element. The SVG is zero-sized and invisible but the defs remain available for URL refs.
-->
{#if element.shapeType === 'heart'}
  <svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">
    <defs>
      <clipPath id="heart-clip-{element.id}" clipPathUnits="objectBoundingBox">
        <path d={heartPath} />
      </clipPath>
    </defs>
  </svg>
{/if}

<!--
  Shapes with clip-path use an outer wrapper with filter:drop-shadow so the shadow follows
  the shape silhouette.
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
