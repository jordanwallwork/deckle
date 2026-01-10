<script lang="ts">
  import type { ImageElement, Shadow } from '../../types';
  import { mmToPx } from '$lib/utils/size.utils';

  let { element, dpi }: { element: ImageElement; dpi: number } = $props();

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

  // Build element-specific styles
  // Image fills the wrapper, so we use 100% width/height
  function buildElementStyle(): string {
    const styles: string[] = [];

    // Fill the wrapper
    styles.push('width: 100%');
    styles.push('height: 100%');
    styles.push('display: block');

    // Object fit and position
    if (element.objectFit) styles.push(`object-fit: ${element.objectFit}`);
    if (element.objectPosition) styles.push(`object-position: ${element.objectPosition}`);

    // Border
    if (element.border) {
      styles.push(...borderToCss(element.border));
    }

    // Border radius (simplified)
    if (element.borderRadius) styles.push(`border-radius: ${element.borderRadius}px`);

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

    return styles.join('; ');
  }
</script>

<img src={element.imageId} alt="" style={buildElementStyle()} class="image-element" />

<style>
  .image-element {
    /* Element-specific styles only */
  }
</style>
