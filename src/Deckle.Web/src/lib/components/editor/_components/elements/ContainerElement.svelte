<script lang="ts">
  import type { ContainerElement } from '../../types';
  import TemplateRenderer from '../../TemplateRenderer.svelte';
  import {
    spacingToCss,
    borderStyle,
    backgroundStyle,
    boxShadowStyle,
    borderRadiusStyle,
    hasAnyBorderRadiusSet
  } from '../../utils';

  let { element, dpi, children }: { element: ContainerElement; dpi: number; children?: any } =
    $props();

  // Check if we need nested div rendering (when innerBorderRadius is defined and non-zero)
  const hasInnerBorderRadius = $derived(hasAnyBorderRadiusSet(element.innerBorderRadius, dpi));

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

  // Styles for nested div rendering (when innerBorderRadius is used)
  // Outer div: background = border color, border-radius = outer radius
  const outerBorderRadius = $derived(borderRadiusStyle(element.border?.radius, dpi));
  const outerBackground = $derived(element.border?.color ?? 'transparent');

  // Inner div: background = background color, border-radius = inner radius
  const innerBorderRadius = $derived(borderRadiusStyle(element.innerBorderRadius, dpi));
  const innerBackground = $derived(backgroundStyle(element.background));
</script>

{#if hasInnerBorderRadius}
  <!-- Nested div rendering for inner border radius effect -->
  <div
    style:width="100%"
    style:height="100%"
    style:background-color={outerBackground}
    style:border-radius={outerBorderRadius}
    style:box-shadow={boxShadow}
    style:overflow="hidden"
    class="container-element container-outer"
    style={border}
  >
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
      style={innerBackground}
      style:border-radius={innerBorderRadius}
      style:overflow
      class="container-inner"
    >
      {#if children}
        {@render children()}
      {:else}
        {#each element.children as child (child.id)}
          <TemplateRenderer element={child} {dpi} />
        {/each}
      {/if}
    </div>
  </div>
{:else}
  <!-- Standard single div rendering -->
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
{/if}

<style>
  .container-element {
    /* Element-specific styles only */
  }

  .container-outer {
    /* Outer container styles for nested rendering */
  }

  .container-inner {
    /* Inner container styles for nested rendering */
  }
</style>
