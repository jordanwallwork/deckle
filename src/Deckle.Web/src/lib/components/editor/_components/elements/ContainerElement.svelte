<script lang="ts">
  import type { ContainerElement } from '../../types';
  import TemplateRenderer from '../../TemplateRenderer.svelte';
  import {
    spacingToCss,
    borderStyle,
    backgroundStyle,
    boxShadowStyle,
    borderRadiusStyle,
    hasAnyBorderRadiusSet,
    dimensionValue
  } from '../../utils';
  import { effectiveContainerDisplay, effectiveContainerFlex } from '../../effectiveDefaults';

  let { element, dpi, children }: { element: ContainerElement; dpi: number; children?: any } =
    $props();

  // Check if we need nested div rendering (when innerBorderRadius is defined and non-zero)
  const hasInnerBorderRadius = $derived(hasAnyBorderRadiusSet(element.innerBorderRadius, dpi));

  // Derived style properties for granular reactivity.
  // Unset display/flex values resolve to their effective defaults (flex-column)
  // via effectiveDefaults.ts, matching what the factory used to stamp.
  const display = $derived(effectiveContainerDisplay(element));
  const isFlex = $derived(display === 'flex');
  const flex = $derived(effectiveContainerFlex(element));
  const flexDirection = $derived(isFlex ? flex.direction : undefined);
  const flexWrap = $derived(isFlex ? flex.wrap : undefined);
  const justifyContent = $derived(isFlex ? flex.justifyContent : undefined);
  const alignItems = $derived(isFlex ? flex.alignItems : undefined);
  const alignContent = $derived(isFlex ? element.flexConfig?.alignContent : undefined);
  const gap = $derived(
    isFlex && element.flexConfig?.gap !== undefined
      ? dimensionValue(element.flexConfig.gap, dpi)
      : undefined
  );
  const rowGap = $derived(
    isFlex && element.flexConfig?.rowGap !== undefined
      ? `${element.flexConfig.rowGap}px`
      : undefined
  );
  const columnGap = $derived(
    isFlex && element.flexConfig?.columnGap !== undefined
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
