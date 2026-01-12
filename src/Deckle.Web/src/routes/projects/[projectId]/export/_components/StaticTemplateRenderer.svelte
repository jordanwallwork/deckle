<script lang="ts">
  import type {
    TemplateElement,
    ContainerElement,
    TextElement,
    ImageElement,
    Shadow
  } from '$lib/components/editor/types';
  import StaticTemplateRenderer from './StaticTemplateRenderer.svelte';
  import MarkdownRenderer from '$lib/components/editor/_components/MarkdownRenderer.svelte';
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';
  import type { DataSourceRowData } from '$lib/stores/dataSourceRow';
  import { parseInlineClasses, hasInlineClasses } from '$lib/utils/textParser';
  import { replaceMergeFields } from '$lib/utils/mergeFields';
  import { mmToPx } from '$lib/utils/size.utils';

  let {
    element,
    dpi,
    mergeData = null
  }: {
    element: TemplateElement;
    dpi: number;
    mergeData?: Record<string, string> | null;
  } = $props();

  // Get the data source row from props or context (if available)
  const dataSourceRowStore = getContext<Writable<DataSourceRowData> | undefined>('dataSourceRow');
  const dataSourceRow = $derived(mergeData ?? (dataSourceRowStore ? $dataSourceRowStore : null));

  // For text elements, apply merge fields first, then check if we need to parse inline classes
  const textContent = $derived(() => {
    if (element.type === 'text') {
      const textEl = element as TextElement;

      // Step 1: Replace merge fields FIRST (before inline classes)
      let processedContent = replaceMergeFields(textEl.content, dataSourceRow);

      // Step 2: Apply inline classes if not using markdown
      if (!textEl.markdown && hasInlineClasses(processedContent)) {
        return parseInlineClasses(processedContent, true);
      }

      // Return processed content (with merge fields replaced)
      return processedContent;
    }
    return null;
  });

  // Helper to convert spacing to CSS string
  function spacingToCss(
    spacing:
      | {
          all?: number | string;
          top?: number | string;
          right?: number | string;
          bottom?: number | string;
          left?: number | string;
        }
      | undefined
  ): string {
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

  // Helper to build style object
  function buildStyle(element: TemplateElement): string {
    const styles: string[] = [];

    // Position
    if (element.position === 'absolute') {
      styles.push('position: absolute');
      if (element.x !== undefined) styles.push(`left: ${dimensionValue(element.x)}`);
      if (element.y !== undefined) styles.push(`top: ${dimensionValue(element.y)}`);
    } else {
      styles.push('position: relative');
    }

    // Z-index
    if (element.zIndex !== undefined) {
      styles.push(`z-index: ${element.zIndex}`);
    }

    // Opacity
    if (element.opacity !== undefined) {
      styles.push(`opacity: ${element.opacity}`);
    }

    // Rotation
    if (element.rotation !== undefined && element.rotation !== 0) {
      styles.push(`transform: rotate(${element.rotation}deg)`);
    }

    // Visibility
    if (element.visible === false) {
      styles.push('display: none');
      return styles.join('; ');
    }

    // Type-specific styles
    if (element.type === 'container') {
      const container = element as ContainerElement;

      // Display
      styles.push(`display: ${container.display || 'flex'}`);

      // Flex config
      if (container.display === 'flex' && container.flexConfig) {
        const fc = container.flexConfig;
        if (fc.direction) styles.push(`flex-direction: ${fc.direction}`);
        if (fc.wrap) styles.push(`flex-wrap: ${fc.wrap}`);
        if (fc.justifyContent) styles.push(`justify-content: ${fc.justifyContent}`);
        if (fc.alignItems) styles.push(`align-items: ${fc.alignItems}`);
        if (fc.alignContent) styles.push(`align-content: ${fc.alignContent}`);
        if (fc.gap !== undefined) styles.push(`gap: ${fc.gap}px`);
        if (fc.rowGap !== undefined) styles.push(`row-gap: ${fc.rowGap}px`);
        if (fc.columnGap !== undefined) styles.push(`column-gap: ${fc.columnGap}px`);
      }

      // Padding and margin
      if (container.padding) styles.push(`padding: ${spacingToCss(container.padding)}`);
      if (container.margin) styles.push(`margin: ${spacingToCss(container.margin)}`);

      // Border
      if (container.border) {
        styles.push(...borderToCss(container.border));
      }

      // Background
      if (container.background) {
        const bg = container.background;
        if (bg.color) styles.push(`background-color: ${bg.color}`);
        if (bg.image) {
          styles.push(`background-image: url(${bg.image.imageId})`);
          if (bg.image.size) styles.push(`background-size: ${bg.image.size}`);
          if (bg.image.repeat) styles.push(`background-repeat: ${bg.image.repeat}`);
          if (bg.image.position) styles.push(`background-position: ${bg.image.position}`);
        }
      }

      // Shadow
      if (container.shadow) {
        const shadows = Array.isArray(container.shadow) ? container.shadow : [container.shadow];
        const shadowCss = shadows
          .map(
            (s: Shadow) =>
              `${s.inset ? 'inset ' : ''}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread || 0}px ${s.color}`
          )
          .join(', ');
        styles.push(`box-shadow: ${shadowCss}`);
      }

      // Dimensions
      if (container.dimensions) {
        const d = container.dimensions;
        if (d.width !== undefined) styles.push(`width: ${dimensionValue(d.width)}`);
        if (d.height !== undefined) styles.push(`height: ${dimensionValue(d.height)}`);
        if (d.minWidth !== undefined) styles.push(`min-width: ${dimensionValue(d.minWidth)}`);
        if (d.maxWidth !== undefined) styles.push(`max-width: ${dimensionValue(d.maxWidth)}`);
        if (d.minHeight !== undefined) styles.push(`min-height: ${dimensionValue(d.minHeight)}`);
        if (d.maxHeight !== undefined) styles.push(`max-height: ${dimensionValue(d.maxHeight)}`);
      }

      // Overflow
      if (container.overflow) styles.push(`overflow: ${container.overflow}`);
    }

    if (element.type === 'text') {
      const text = element as TextElement;

      // Display
      styles.push(`display: ${text.display || 'block'}`);

      // Typography
      if (text.fontSize) styles.push(`font-size: ${text.fontSize}px`);
      if (text.fontFamily) styles.push(`font-family: ${text.fontFamily}`);
      if (text.fontWeight) styles.push(`font-weight: ${text.fontWeight}`);
      if (text.fontStyle) styles.push(`font-style: ${text.fontStyle}`);
      if (text.color) styles.push(`color: ${text.color}`);
      if (text.textDecoration) styles.push(`text-decoration: ${text.textDecoration}`);
      if (text.textAlign) styles.push(`text-align: ${text.textAlign}`);
      if (text.lineHeight) styles.push(`line-height: ${text.lineHeight}`);
      if (text.letterSpacing) styles.push(`letter-spacing: ${text.letterSpacing}px`);
      if (text.wordWrap) styles.push(`word-wrap: ${text.wordWrap}`);
      if (text.textTransform) styles.push(`text-transform: ${text.textTransform}`);

      // Spacing (block mode)
      if (text.padding) styles.push(`padding: ${spacingToCss(text.padding)}`);
      if (text.margin) styles.push(`margin: ${spacingToCss(text.margin)}`);

      // Background
      if (text.backgroundColor) styles.push(`background-color: ${text.backgroundColor}`);

      // Border
      if (text.border) {
        styles.push(...borderToCss(text.border));
      }

      // Dimensions (block mode)
      if (text.dimensions) {
        const d = text.dimensions;
        if (d.width !== undefined) styles.push(`width: ${dimensionValue(d.width)}`);
        if (d.height !== undefined) styles.push(`height: ${dimensionValue(d.height)}`);
        if (d.minWidth !== undefined) styles.push(`min-width: ${dimensionValue(d.minWidth)}`);
        if (d.maxWidth !== undefined) styles.push(`max-width: ${dimensionValue(d.maxWidth)}`);
        if (d.minHeight !== undefined) styles.push(`min-height: ${dimensionValue(d.minHeight)}`);
        if (d.maxHeight !== undefined) styles.push(`max-height: ${dimensionValue(d.maxHeight)}`);
      }
    }

    if (element.type === 'image') {
      const image = element as ImageElement;

      // Dimensions
      if (image.dimensions) {
        const d = image.dimensions;
        if (d.width !== undefined) styles.push(`width: ${dimensionValue(d.width)}`);
        if (d.height !== undefined) styles.push(`height: ${dimensionValue(d.height)}`);
        if (d.minWidth !== undefined) styles.push(`min-width: ${dimensionValue(d.minWidth)}`);
        if (d.maxWidth !== undefined) styles.push(`max-width: ${dimensionValue(d.maxWidth)}`);
        if (d.minHeight !== undefined) styles.push(`min-height: ${dimensionValue(d.minHeight)}`);
        if (d.maxHeight !== undefined) styles.push(`max-height: ${dimensionValue(d.maxHeight)}`);
      }

      // Object fit and position
      if (image.objectFit) styles.push(`object-fit: ${image.objectFit}`);
      if (image.objectPosition) styles.push(`object-position: ${image.objectPosition}`);

      // Border
      if (image.border) {
        styles.push(...borderToCss(image.border));
      }

      // Shadow
      if (image.shadow) {
        const shadows = Array.isArray(image.shadow) ? image.shadow : [image.shadow];
        const shadowCss = shadows
          .map(
            (s: Shadow) =>
              `${s.inset ? 'inset ' : ''}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread || 0}px ${s.color}`
          )
          .join(', ');
        styles.push(`box-shadow: ${shadowCss}`);
      }
    }

    return styles.join('; ');
  }
</script>

{#if element.type === 'container'}
  <div style={buildStyle(element)} data-element-id={element.id}>
    {#each (element as ContainerElement).children as child (child.id)}
      <StaticTemplateRenderer element={child} {dpi} {mergeData} />
    {/each}
  </div>
{:else if element.type === 'text'}
  <div style={buildStyle(element)} data-element-id={element.id}>
    {#if (element as TextElement).markdown}
      <MarkdownRenderer content={(element as TextElement).content} {mergeData} />
    {:else if textContent()}
      {@html textContent()}
    {:else}
      {replaceMergeFields((element as TextElement).content, dataSourceRow)}
    {/if}
  </div>
{:else if element.type === 'image'}
  <img
    src={(element as ImageElement).imageId}
    alt=""
    style={buildStyle(element)}
    data-element-id={element.id}
  />
{/if}
