<script lang="ts">
  import type { TemplateElement, ImageElement } from '../types';
  import ResizeHandles from './ResizeHandles.svelte';
  import DragHandles from './DragHandles.svelte';
  import RotationHandle from './RotationHandle.svelte';
  import { templateStore } from '$lib/stores/templateElements';

  let {
    element,
    wrapperStyle,
    children
  }: {
    element: TemplateElement;
    wrapperStyle: string;
    children: any;
  } = $props();

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
</script>

<div
  style={wrapperStyle}
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
  {@render children()}

  {#if isSelected && !element.locked}
    <ResizeHandles {element} />
    <RotationHandle {element} />
    {#if element.position === 'absolute'}
      <DragHandles {element} />
    {/if}
  {/if}
</div>

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
