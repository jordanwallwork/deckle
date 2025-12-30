<script lang="ts">
  import type { TemplateElement, ContainerElement, TextElement, ImageElement, Shadow } from './types';
  import TemplateRenderer from './TemplateRenderer.svelte';
  import ResizeHandles from './_components/ResizeHandles.svelte';
  import DragHandles from './_components/DragHandles.svelte';
  import RotationHandle from './_components/RotationHandle.svelte';
  import { templateStore } from '$lib/stores/templateElements';

  let { element }: { element: TemplateElement } = $props();

  const isHovered = $derived($templateStore.hoveredElementId === element.id);
  const isSelected = $derived($templateStore.selectedElementId === element.id);

  function handleMouseEnter() {
    // Don't hover locked elements in preview
    if (!element.locked) {
      templateStore.setHoveredElement(element.id);
    }
  }

  function handleMouseLeave() {
    templateStore.setHoveredElement(null);
  }

  function handleClick(e: MouseEvent) {
    // Don't select locked elements in preview - let clicks pass through
    if (element.locked) {
      return;
    }
    e.stopPropagation();
    templateStore.selectElement(element.id);
  }

  // Helper to convert spacing to CSS string
  function spacingToCss(spacing: { top?: number; right?: number; bottom?: number; left?: number } | undefined): string {
    if (!spacing) return '0';
    const { top = 0, right = 0, bottom = 0, left = 0 } = spacing;
    return `${top}px ${right}px ${bottom}px ${left}px`;
  }

  // Helper to convert dimensions to CSS
  function dimensionValue(value: number | string | undefined): string {
    if (value === undefined) return 'auto';
    if (typeof value === 'number') return `${value}px`;
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
            styles.push(`border-${side}-width: ${sideProps.width}px`);
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
      if (border.width !== undefined) styles.push(`border-width: ${border.width}px`);
      if (border.style) styles.push(`border-style: ${border.style}`);
      if (border.color) styles.push(`border-color: ${border.color}`);
    }

    // Border radius (always applies)
    if (typeof border.radius === 'number') {
      styles.push(`border-radius: ${border.radius}px`);
    } else if (border.radius) {
      const r = border.radius;
      styles.push(`border-radius: ${r.topLeft || 0}px ${r.topRight || 0}px ${r.bottomRight || 0}px ${r.bottomLeft || 0}px`);
    }

    return styles;
  }

  // Helper to build style object
  function buildStyle(element: TemplateElement): string {
    const styles: string[] = [];

    // Position
    if (element.position === 'absolute') {
      styles.push('position: absolute');
      if (element.x !== undefined) styles.push(`left: ${element.x}px`);
      if (element.y !== undefined) styles.push(`top: ${element.y}px`);
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
          // TODO: Handle background image when image management is implemented
          styles.push(`background-image: url(${bg.image.imageId})`);
          if (bg.image.size) styles.push(`background-size: ${bg.image.size}`);
          if (bg.image.repeat) styles.push(`background-repeat: ${bg.image.repeat}`);
          if (bg.image.position) styles.push(`background-position: ${bg.image.position}`);
        }
      }

      // Shadow
      if (container.shadow) {
        const shadows = Array.isArray(container.shadow) ? container.shadow : [container.shadow];
        const shadowCss = shadows.map((s: Shadow) =>
          `${s.inset ? 'inset ' : ''}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread || 0}px ${s.color}`
        ).join(', ');
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

      // Border radius (simplified)
      if (image.borderRadius) styles.push(`border-radius: ${image.borderRadius}px`);

      // Shadow
      if (image.shadow) {
        const shadows = Array.isArray(image.shadow) ? image.shadow : [image.shadow];
        const shadowCss = shadows.map((s: Shadow) =>
          `${s.inset ? 'inset ' : ''}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread || 0}px ${s.color}`
        ).join(', ');
        styles.push(`box-shadow: ${shadowCss}`);
      }
    }

    return styles.join('; ');
  }
</script>

{#if element.type === 'container'}
  <div
    style={buildStyle(element)}
    data-element-id={element.id}
    class="editable-element"
    class:locked={element.locked}
    class:hovered={isHovered}
    class:selected={isSelected}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    onclick={handleClick}
    role="button"
    tabindex="0"
  >
    {#each (element as ContainerElement).children as child (child.id)}
      <TemplateRenderer element={child} />
    {/each}
    {#if isSelected && !element.locked}
      <ResizeHandles element={element} />
      <RotationHandle element={element} />
      {#if element.position === 'absolute'}
        <DragHandles element={element} />
      {/if}
    {/if}
  </div>
{:else if element.type === 'text'}
  <div
    style={buildStyle(element)}
    data-element-id={element.id}
    class="editable-element"
    class:locked={element.locked}
    class:hovered={isHovered}
    class:selected={isSelected}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    onclick={handleClick}
    role="button"
    tabindex="0"
  >
    {(element as TextElement).content}
    {#if isSelected && !element.locked}
      <ResizeHandles element={element} />
      <RotationHandle element={element} />
      {#if element.position === 'absolute'}
        <DragHandles element={element} />
      {/if}
    {/if}
  </div>
{:else if element.type === 'image'}
  <div
    style="position: relative; display: inline-block;"
    data-element-id={element.id}
  >
    <img
      src={(element as ImageElement).imageId}
      alt=""
      style={buildStyle(element)}
      class="editable-element"
      class:locked={element.locked}
      class:hovered={isHovered}
      class:selected={isSelected}
      onmouseenter={handleMouseEnter}
      onmouseleave={handleMouseLeave}
      onclick={handleClick}
      role="button"
      tabindex="0"
    />
    {#if isSelected && !element.locked}
      <ResizeHandles element={element} />
      <RotationHandle element={element} />
      {#if element.position === 'absolute'}
        <DragHandles element={element} />
      {/if}
    {/if}
  </div>
{/if}

<style>
  .editable-element {
    cursor: pointer;
    transition: outline 0.15s ease, box-shadow 0.15s ease;
  }

  .editable-element.locked {
    cursor: default;
  }

  .editable-element.hovered {
    outline: 1px dashed #0066cc;
    outline-offset: 2px;
  }

  .editable-element.selected {
    outline: 2px solid #0066cc;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(0, 102, 204, 0.1);
  }
</style>
