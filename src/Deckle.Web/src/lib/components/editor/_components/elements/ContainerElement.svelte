<script lang="ts">
  import type { ContainerElement } from '../../types';
  import TemplateRenderer from '../../TemplateRenderer.svelte';
  import { spacingToCss, borderStyle, backgroundStyle, boxShadowStyle } from '../../utils';

  let { element, dpi, children }: { element: ContainerElement; dpi: number; children?: any } =
    $props();

  // Derived style properties for granular reactivity
  const display = $derived(element.display || 'flex');
  const flexDirection = $derived(
    element.display === 'flex' ? element.flexConfig?.direction : undefined
  );
  const flexWrap = $derived(element.display === 'flex' ? element.flexConfig?.wrap : undefined);
  const justifyContent = $derived(
    element.display === 'flex' ? element.flexConfig?.justifyContent : undefined
  );
  const alignItems = $derived(
    element.display === 'flex' ? element.flexConfig?.alignItems : undefined
  );
  const alignContent = $derived(
    element.display === 'flex' ? element.flexConfig?.alignContent : undefined
  );
  const gap = $derived(
    element.display === 'flex' && element.flexConfig?.gap !== undefined
      ? `${element.flexConfig.gap}px`
      : undefined
  );
  const rowGap = $derived(
    element.display === 'flex' && element.flexConfig?.rowGap !== undefined
      ? `${element.flexConfig.rowGap}px`
      : undefined
  );
  const columnGap = $derived(
    element.display === 'flex' && element.flexConfig?.columnGap !== undefined
      ? `${element.flexConfig.columnGap}px`
      : undefined
  );
  const padding = $derived(spacingToCss(element.padding, dpi));
  const border = $derived(borderStyle(element.border, dpi));
  const background = $derived(backgroundStyle(element.background));
  const boxShadow = $derived(boxShadowStyle(element.shadow));
  const overflow = $derived(element.overflow);
</script>

<div
  style:width="100%"
  style:height="100%"
  style:display
  style:flex-direction={flexDirection}
  style:flex-wrap={flexWrap}
  style:justify-content={justifyContent}
  style:align-items={alignItems}
  style:align-content={alignContent}
  style:gap
  style:row-gap={rowGap}
  style:column-gap={columnGap}
  style:padding
  style={[border, background].filter(Boolean).join('; ')}
  style:box-shadow={boxShadow}
  style:overflow
  class="container-element"
>
  {#if children}
    {@render children()}
  {:else}
    {#each element.children as child (child.id)}
      <TemplateRenderer element={child} {dpi} />
    {/each}
  {/if}
</div>

<style>
  .container-element {
    /* Element-specific styles only */
  }
</style>
