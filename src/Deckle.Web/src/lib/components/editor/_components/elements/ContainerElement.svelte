<script lang="ts">
  import type { ContainerElement, Shadow } from '../../types';
  import TemplateRenderer from '../../TemplateRenderer.svelte';
  import { mmToPx } from '$lib/utils/size.utils';

  let { element, dpi, children }: { element: ContainerElement; dpi: number; children?: any } = $props();

  // Helper to convert spacing to CSS string
  function spacingToCss(spacing: {
    all?: number | string;
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
  } | undefined): string | undefined {
    if (!spacing) return undefined;

    // If 'all' is defined, use it for all sides
    if (spacing.all !== undefined) {
      return dimensionValue(spacing.all);
    }

    // Otherwise use individual sides
    const top = dimensionValue(spacing.top ?? 0);
    const right = dimensionValue(spacing.right ?? 0);
    const bottom = dimensionValue(spacing.bottom ?? 0);
    const left = dimensionValue(spacing.left ?? 0);
    return `${top} ${right} ${bottom} ${left}`;
  }

  // Helper to convert dimensions to CSS
  function dimensionValue(value: number | string | undefined): string {
    if (value === undefined) return 'auto';
    if (typeof value === 'number') return `${value}px`;

    // Handle mm unit - convert to px
    if (typeof value === 'string' && value.includes('mm')) {
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue)) {
        return `${mmToPx(numericValue, dpi)}px`;
      }
    }

    return value;
  }

  // Helper to build border CSS string (complex property, keep as string)
  function borderStyle(border: any | undefined): string | undefined {
    if (!border) return undefined;

    const styles: string[] = [];

    // Check if individual sides are defined
    const hasIndividualSides = border.top || border.right || border.bottom || border.left;

    if (hasIndividualSides) {
      // Use individual side properties
      const sides = ['top', 'right', 'bottom', 'left'] as const;
      for (const side of sides) {
        const sideProps = border[side];
        if (sideProps) {
          if (sideProps.width !== undefined) {
            styles.push(`border-${side}-width: ${dimensionValue(sideProps.width)}`);
          }
          if (sideProps.style) {
            styles.push(`border-${side}-style: ${sideProps.style}`);
          }
          if (sideProps.color) {
            styles.push(`border-${side}-color: ${sideProps.color}`);
          }
        }
      }
    } else {
      // Use main border properties (all sides)
      if (border.width !== undefined) styles.push(`border-width: ${dimensionValue(border.width)}`);
      if (border.style) styles.push(`border-style: ${border.style}`);
      if (border.color) styles.push(`border-color: ${border.color}`);
    }

    // Border radius (always applies)
    if (typeof border.radius === 'object') {
      const r = border.radius;
      const tl = dimensionValue(r.topLeft ?? 0);
      const tr = dimensionValue(r.topRight ?? 0);
      const br = dimensionValue(r.bottomRight ?? 0);
      const bl = dimensionValue(r.bottomLeft ?? 0);
      styles.push(`border-radius: ${tl} ${tr} ${br} ${bl}`);
    } else if (border.radius !== undefined) {
      styles.push(`border-radius: ${dimensionValue(border.radius)}`);
    }

    return styles.length > 0 ? styles.join('; ') : undefined;
  }

  // Helper to build background CSS string (complex property, keep as string)
  function backgroundStyle(background: any | undefined): string | undefined {
    if (!background) return undefined;

    const styles: string[] = [];
    if (background.color) styles.push(`background-color: ${background.color}`);
    if (background.image) {
      styles.push(`background-image: url(${background.image.imageId})`);
      if (background.image.size) styles.push(`background-size: ${background.image.size}`);
      if (background.image.repeat) styles.push(`background-repeat: ${background.image.repeat}`);
      if (background.image.position) styles.push(`background-position: ${background.image.position}`);
    }

    return styles.length > 0 ? styles.join('; ') : undefined;
  }

  // Helper to build box-shadow CSS string (complex property, keep as string)
  function boxShadowStyle(shadow: Shadow | Shadow[] | undefined): string | undefined {
    if (!shadow) return undefined;
    const shadows = Array.isArray(shadow) ? shadow : [shadow];
    return shadows
      .map(
        (s: Shadow) =>
          `${s.inset ? 'inset ' : ''}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread || 0}px ${s.color}`
      )
      .join(', ');
  }

  // Derived style properties for granular reactivity
  const display = $derived(element.display || 'flex');
  const flexDirection = $derived(element.display === 'flex' && element.flexConfig?.direction);
  const flexWrap = $derived(element.display === 'flex' && element.flexConfig?.wrap);
  const justifyContent = $derived(element.display === 'flex' && element.flexConfig?.justifyContent);
  const alignItems = $derived(element.display === 'flex' && element.flexConfig?.alignItems);
  const alignContent = $derived(element.display === 'flex' && element.flexConfig?.alignContent);
  const gap = $derived(element.display === 'flex' && element.flexConfig?.gap !== undefined ? `${element.flexConfig.gap}px` : undefined);
  const rowGap = $derived(element.display === 'flex' && element.flexConfig?.rowGap !== undefined ? `${element.flexConfig.rowGap}px` : undefined);
  const columnGap = $derived(element.display === 'flex' && element.flexConfig?.columnGap !== undefined ? `${element.flexConfig.columnGap}px` : undefined);
  const padding = $derived(spacingToCss(element.padding));
  const border = $derived(borderStyle(element.border));
  const background = $derived(backgroundStyle(element.background));
  const boxShadow = $derived(boxShadowStyle(element.shadow));
  const overflow = $derived(element.overflow);
</script>

<div
  style:width="100%"
  style:height="100%"
  style:display={display}
  style:flex-direction={flexDirection}
  style:flex-wrap={flexWrap}
  style:justify-content={justifyContent}
  style:align-items={alignItems}
  style:align-content={alignContent}
  style:gap
  style:row-gap={rowGap}
  style:column-gap={columnGap}
  style:padding={padding}
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
