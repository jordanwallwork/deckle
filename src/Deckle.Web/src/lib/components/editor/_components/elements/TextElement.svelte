<script lang="ts">
  import type { TextElement } from '../../types';
  import MarkdownRenderer from '../MarkdownRenderer.svelte';
  import { getDataSourceRow } from '$lib/stores/dataSourceRow';
  import { parseInlineClasses, hasInlineClasses } from '$lib/utils/textParser';
  import { replaceMergeFields } from '$lib/utils/mergeFields';
  import { mmToPx } from '$lib/utils/size.utils';

  let { element, dpi }: { element: TextElement; dpi: number } = $props();

  const dataSourceRow = getDataSourceRow();

  // Apply merge fields and inline classes
  const textContent = $derived(() => {
    // Step 1: Replace merge fields FIRST (before inline classes)
    let processedContent = replaceMergeFields(element.content, $dataSourceRow);

    // Step 2: Apply inline classes if not using markdown
    if (!element.markdown && hasInlineClasses(processedContent)) {
      return parseInlineClasses(processedContent, true);
    }

    // Return processed content (with merge fields replaced)
    return processedContent;
  });

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
    styles.push(`display: ${element.display || 'block'}`);

    // Typography
    if (element.fontSize) styles.push(`font-size: ${element.fontSize}px`);
    if (element.fontFamily) styles.push(`font-family: ${element.fontFamily}`);
    if (element.fontWeight) styles.push(`font-weight: ${element.fontWeight}`);
    if (element.fontStyle) styles.push(`font-style: ${element.fontStyle}`);
    if (element.color) styles.push(`color: ${element.color}`);
    if (element.textDecoration) styles.push(`text-decoration: ${element.textDecoration}`);
    if (element.textAlign) styles.push(`text-align: ${element.textAlign}`);
    if (element.lineHeight) styles.push(`line-height: ${element.lineHeight}`);
    if (element.letterSpacing) styles.push(`letter-spacing: ${element.letterSpacing}px`);
    if (element.wordWrap) styles.push(`word-wrap: ${element.wordWrap}`);
    if (element.textTransform) styles.push(`text-transform: ${element.textTransform}`);

    // Padding (NOT margin - that's on wrapper)
    if (element.padding) styles.push(`padding: ${spacingToCss(element.padding)}`);

    // Background
    if (element.backgroundColor) styles.push(`background-color: ${element.backgroundColor}`);

    // Border
    if (element.border) {
      styles.push(...borderToCss(element.border));
    }

    return styles.join('; ');
  }
</script>

<div style={buildElementStyle()} class="text-element">
  {#if element.markdown}
    <MarkdownRenderer content={element.content} />
  {:else if textContent()}
    {@html textContent()}
  {:else}
    {replaceMergeFields(element.content, $dataSourceRow)}
  {/if}
</div>

<style>
  .text-element {
    /* Element-specific styles only */
  }
</style>
