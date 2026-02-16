<script lang="ts">
  import type { TemplateElement, ElementType } from '../../types';
  import ResizeHandles from './ResizeHandles.svelte';
  import DragHandles from './DragHandles.svelte';
  import RotationHandle from './RotationHandle.svelte';
  import { templateStore } from '$lib/stores/templateElements';
  import { spacingToCss, dimensionValue } from '../../utils';
  import { createElementOfType } from '../../elementFactory';
  import ContextMenu, { type ContextMenuItem } from '$lib/components/ContextMenu.svelte';
  import Portal from '$lib/components/Portal.svelte';
  import { getDataSourceRow } from '$lib/stores/dataSourceRow';
  import { isElementVisible } from '$lib/utils/mergeFields';

  let {
    element,
    dpi,
    children
  }: {
    element: TemplateElement;
    dpi: number;
    children: any;
  } = $props();

  const dataSourceRow = getDataSourceRow();

  const isHovered = $derived($templateStore.hoveredElementId === element.id);
  const isSelected = $derived($templateStore.selectedElementId === element.id);

  // Context menu state
  let showContextMenu = $state(false);
  let contextMenuX = $state(0);
  let contextMenuY = $state(0);

  // Derived style properties for granular reactivity
  const position = $derived(element.position === 'absolute' ? 'absolute' : 'relative');
  const left = $derived(
    element.position === 'absolute' ? dimensionValue(element.x, dpi) : undefined
  );
  const top = $derived(
    element.position === 'absolute' ? dimensionValue(element.y, dpi) : undefined
  );
  const margin = $derived(spacingToCss(element.margin, dpi));

  const width = $derived(dimensionValue(element.dimensions?.width, dpi));
  const height = $derived(dimensionValue(element.dimensions?.height, dpi));
  const minWidth = $derived(dimensionValue(element.dimensions?.minWidth, dpi));
  const maxWidth = $derived(dimensionValue(element.dimensions?.maxWidth, dpi));
  const minHeight = $derived(dimensionValue(element.dimensions?.minHeight, dpi));
  const maxHeight = $derived(dimensionValue(element.dimensions?.maxHeight, dpi));

  const zIndex = $derived(element.zIndex);
  const opacity = $derived(element.opacity);
  const transform = $derived(
    element.rotation !== undefined && element.rotation !== 0
      ? `rotate(${element.rotation}deg)`
      : undefined
  );
  const display = $derived(
    isElementVisible(element.visibilityMode, element.visibilityCondition, $dataSourceRow)
      ? undefined
      : 'none'
  );

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

  // Context menu handlers
  function handleContextMenu(e: MouseEvent) {
    // Don't show context menu for locked elements - let right-clicks pass through
    if (element.locked) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    contextMenuX = e.clientX;
    contextMenuY = e.clientY;
    showContextMenu = true;

    // Select the element when showing context menu
    templateStore.selectElement(element.id);
  }

  function handleDuplicate() {
    templateStore.duplicateElement(element.id);
  }

  function handleAddElement(type: ElementType) {
    const newElement = createElementOfType(type);
    templateStore.addElement(newElement, element.id);
  }

  function handleToggleVisibility() {
    // Toggle between 'show' and 'hide' (preserve 'conditional' by not using toggle in context menu when conditional)
    const newMode = element.visibilityMode === 'hide' ? 'show' : 'hide';
    templateStore.updateElement(element.id, { visibilityMode: newMode });
  }

  function handleToggleLock() {
    templateStore.updateElement(element.id, { locked: !element.locked });
  }

  function handleDelete() {
    templateStore.removeElement(element.id);
  }

  function getContextMenuItems(): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];

    // Duplicate action
    items.push({
      label: 'Duplicate',
      action: handleDuplicate
    });

    // Add submenu for container and iterator elements
    if (element.type === 'container' || element.type === 'iterator') {
      items.push({
        label: 'Add...',
        submenu: [
          {
            label: 'Container',
            action: () => handleAddElement('container')
          },
          {
            label: 'Text',
            action: () => handleAddElement('text')
          },
          {
            label: 'Image',
            action: () => handleAddElement('image')
          },
          {
            label: 'Iterator',
            action: () => handleAddElement('iterator')
          }
        ]
      });
    }

    // Visibility toggle (only show simple toggle for show/hide, not conditional)
    items.push({ divider: true });
    if (element.visibilityMode === 'conditional') {
      items.push({
        label: 'Visibility: Conditional',
        action: () => {} // No-op, use config panel for conditional
      });
    } else {
      items.push({
        label: element.visibilityMode === 'hide' ? 'Show' : 'Hide',
        action: handleToggleVisibility
      });
    }

    // Lock toggle
    items.push({
      label: element.locked === true ? 'Unlock' : 'Lock',
      action: handleToggleLock
    });

    // Delete action
    items.push({ divider: true });
    items.push({
      label: 'Delete',
      variant: 'danger',
      action: handleDelete
    });

    return items;
  }
</script>

<div
  style:position
  style:left
  style:top
  style:margin
  style:width
  style:height
  style:min-width={minWidth}
  style:max-width={maxWidth}
  style:min-height={minHeight}
  style:max-height={maxHeight}
  style:z-index={zIndex}
  style:opacity
  style:transform
  style:display
  data-element-id={element.id}
  class="editable-element"
  class:locked={element.locked}
  class:hovered={isHovered}
  class:selected={isSelected}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onclick={handleClick}
  oncontextmenu={handleContextMenu}
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

{#if showContextMenu}
  <Portal>
    <ContextMenu
      x={contextMenuX}
      y={contextMenuY}
      items={getContextMenuItems()}
      onClose={() => (showContextMenu = false)}
    />
  </Portal>
{/if}

<style>
  .editable-element {
    cursor: pointer;
    transition:
      outline 0.15s ease,
      box-shadow 0.15s ease;
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
