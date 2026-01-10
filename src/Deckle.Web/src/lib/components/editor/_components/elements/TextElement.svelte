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

  // Derived style properties for granular reactivity
  const display = $derived(element.display || 'block');
  const fontSize = $derived(element.fontSize ? `${element.fontSize}px` : undefined);
  const fontFamily = $derived(element.fontFamily);
  const fontWeight = $derived(element.fontWeight);
  const fontStyle = $derived(element.fontStyle);
  const color = $derived(element.color);
  const textDecoration = $derived(element.textDecoration);
  const textAlign = $derived(element.textAlign);
  const lineHeight = $derived(element.lineHeight);
  const letterSpacing = $derived(element.letterSpacing ? `${element.letterSpacing}px` : undefined);
  const wordWrap = $derived(element.wordWrap);
  const textTransform = $derived(element.textTransform);
  const padding = $derived(spacingToCss(element.padding));
  const backgroundColor = $derived(element.backgroundColor);
  const border = $derived(borderStyle(element.border));
</script>

<div
  style:width="100%"
  style:height="100%"
  style:display={display}
  style:font-size={fontSize}
  style:font-family={fontFamily}
  style:font-weight={fontWeight}
  style:font-style={fontStyle}
  style:color
  style:text-decoration={textDecoration}
  style:text-align={textAlign}
  style:line-height={lineHeight}
  style:letter-spacing={letterSpacing}
  style:word-wrap={wordWrap}
  style:text-transform={textTransform}
  style:padding={padding}
  style:background-color={backgroundColor}
  style={border}
  class="text-element"
>
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
