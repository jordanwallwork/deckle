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
  } | undefined): string {
    if (!spacing) return '0';

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

  // Helper to convert border to CSS
  function borderToCss(border: any | undefined): string[] {
    if (!border) return [];

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

    return styles;
  }

  // Build element-specific styles (no positioning, margin, dimensions, opacity, rotation, z-index, visibility)
  function buildElementStyle(): string {
    const styles: string[] = [];

    // Fill the wrapper
    styles.push('width: 100%');
    styles.push('height: 100%');

    // Display
    styles.push(`display: ${element.display || 'flex'}`);

    // Flex config
    if (element.display === 'flex' && element.flexConfig) {
      const fc = element.flexConfig;
      if (fc.direction) styles.push(`flex-direction: ${fc.direction}`);
      if (fc.wrap) styles.push(`flex-wrap: ${fc.wrap}`);
      if (fc.justifyContent) styles.push(`justify-content: ${fc.justifyContent}`);
      if (fc.alignItems) styles.push(`align-items: ${fc.alignItems}`);
      if (fc.alignContent) styles.push(`align-content: ${fc.alignContent}`);
      if (fc.gap !== undefined) styles.push(`gap: ${fc.gap}px`);
      if (fc.rowGap !== undefined) styles.push(`row-gap: ${fc.rowGap}px`);
      if (fc.columnGap !== undefined) styles.push(`column-gap: ${fc.columnGap}px`);
    }

    // Padding (NOT margin - that's on wrapper)
    if (element.padding) styles.push(`padding: ${spacingToCss(element.padding)}`);

    // Border
    if (element.border) {
      styles.push(...borderToCss(element.border));
    }

    // Background
    if (element.background) {
      const bg = element.background;
      if (bg.color) styles.push(`background-color: ${bg.color}`);
      if (bg.image) {
        styles.push(`background-image: url(${bg.image.imageId})`);
        if (bg.image.size) styles.push(`background-size: ${bg.image.size}`);
        if (bg.image.repeat) styles.push(`background-repeat: ${bg.image.repeat}`);
        if (bg.image.position) styles.push(`background-position: ${bg.image.position}`);
      }
    }

    // Shadow
    if (element.shadow) {
      const shadows = Array.isArray(element.shadow) ? element.shadow : [element.shadow];
      const shadowCss = shadows
        .map(
          (s: Shadow) =>
            `${s.inset ? 'inset ' : ''}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread || 0}px ${s.color}`
        )
        .join(', ');
      styles.push(`box-shadow: ${shadowCss}`);
    }

    // Overflow
    if (element.overflow) styles.push(`overflow: ${element.overflow}`);

    return styles.join('; ');
  }
</script>

<div style={buildElementStyle()} class="container-element">
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
