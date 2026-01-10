<script lang="ts">
  import type { TemplateElement, ContainerElement, TextElement, ImageElement } from './types';
  import TemplateRenderer from './TemplateRenderer.svelte';
  import ElementWrapper from './_components/ElementWrapper.svelte';
  import TextElementComponent from './_components/elements/TextElement.svelte';
  import ContainerElementComponent from './_components/elements/ContainerElement.svelte';
  import ImageElementComponent from './_components/elements/ImageElement.svelte';
  import { mmToPx } from '$lib/utils/size.utils';

  let { element, dpi }: { element: TemplateElement; dpi: number } = $props();

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

  // Build wrapper style for ALL elements
  // Wrapper handles: positioning, margin, dimensions, z-index, opacity, rotation, visibility
  function buildWrapperStyle(element: TemplateElement): string {
    const styles: string[] = [];

    // Position and coordinates
    if (element.position === 'absolute') {
      styles.push('position: absolute');
      if (element.x !== undefined) styles.push(`left: ${dimensionValue(element.x)}`);
      if (element.y !== undefined) styles.push(`top: ${dimensionValue(element.y)}`);
    } else {
      styles.push('position: relative');
    }

    // Margin (wrapper handles margin, element handles padding)
    if ('margin' in element && element.margin) {
      styles.push(`margin: ${spacingToCss(element.margin)}`);
    }

    // Dimensions (wrapper handles width/height for ALL elements so handles align correctly)
    if ('dimensions' in element && element.dimensions) {
      const d = element.dimensions;
      if (d.width !== undefined) styles.push(`width: ${dimensionValue(d.width)}`);
      if (d.height !== undefined) styles.push(`height: ${dimensionValue(d.height)}`);
      if (d.minWidth !== undefined) styles.push(`min-width: ${dimensionValue(d.minWidth)}`);
      if (d.maxWidth !== undefined) styles.push(`max-width: ${dimensionValue(d.maxWidth)}`);
      if (d.minHeight !== undefined) styles.push(`min-height: ${dimensionValue(d.minHeight)}`);
      if (d.maxHeight !== undefined) styles.push(`max-height: ${dimensionValue(d.maxHeight)}`);
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
    }

    return styles.join('; ');
  }
</script>

{#if element.type === 'container'}
  <ElementWrapper {element} wrapperStyle={buildWrapperStyle(element)}>
    <ContainerElementComponent element={element as ContainerElement} {dpi} />
  </ElementWrapper>
{:else if element.type === 'text'}
  <ElementWrapper {element} wrapperStyle={buildWrapperStyle(element)}>
    <TextElementComponent element={element as TextElement} {dpi} />
  </ElementWrapper>
{:else if element.type === 'image'}
  <ElementWrapper {element} wrapperStyle={buildWrapperStyle(element)}>
    <ImageElementComponent element={element as ImageElement} {dpi} />
  </ElementWrapper>
{/if}

