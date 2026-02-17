<script lang="ts">
  import { slide } from 'svelte/transition';
  import { templateStore } from '$lib/stores/templateElements';
  import type { TemplateElement, ElementType } from '../types';
  import { getElementIcon } from '$lib/utils/icons';
  import { createElementOfType } from '../elementFactory';
  import DropTarget from './DropTarget.svelte';
  import ContextMenu, { type ContextMenuItem } from '$lib/components/ContextMenu.svelte';
  import TreeNode from './TreeNode.svelte';
  import { getElementLabel } from '../utils';
  import { DragHandleIcon, LockIcon, PlusIcon, CloseIcon } from '$lib/components/icons';
  import { getDataSourceRow } from '$lib/stores/dataSourceRow';
  import { isElementVisible } from '$lib/utils/mergeFields';

  let {
    element,
    isRoot = false,
    rootLabel,
    depth = 0,
    selectedId,
    onAddClick
  }: {
    element: TemplateElement;
    isRoot?: boolean;
    rootLabel?: string;
    depth?: number;
    selectedId: string | null;
    onAddClick: (event: MouseEvent, parentId: string | null) => void;
  } = $props();

  let expanded = $state(true);
  let isDragOver = $state(false);
  let isEditingLabel = $state(false);
  let editLabelValue = $state('');
  let showContextMenu = $state(false);
  let contextMenuX = $state(0);
  let contextMenuY = $state(0);

  const dataSourceRow = getDataSourceRow();

  const hasChildren = $derived(
    (element.type === 'container' || element.type === 'iterator') && element.children.length > 0
  );
  const isSelected = $derived(selectedId === element.id);
  const isHovered = $derived($templateStore.hoveredElementId === element.id);
  const isInvisible = $derived(
    !isElementVisible(element.visibilityMode, element.visibilityCondition, $dataSourceRow)
  );
  const isLocked = $derived(element.locked === true);

  function toggleExpanded() {
    if (hasChildren) {
      expanded = !expanded;
    }
  }

  function handleSelect() {
    templateStore.selectElement(element.id);
  }

  function handleMouseEnter() {
    if (!isRoot) {
      templateStore.setHoveredElement(element.id);
    }
  }

  function handleMouseLeave() {
    templateStore.setHoveredElement(null);
  }

  function handleDelete(e: MouseEvent) {
    e.stopPropagation();
    if (!isRoot) {
      templateStore.removeElement(element.id);
    }
  }

  function handleLabelDoubleClick(e: MouseEvent) {
    e.stopPropagation();
    if (!isRoot) {
      editLabelValue = getElementLabel(element);
      isEditingLabel = true;
    }
  }

  function handleLabelBlur() {
    saveLabelEdit();
  }

  function handleLabelKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      saveLabelEdit();
    } else if (e.key === 'Escape') {
      isEditingLabel = false;
    }
  }

  function saveLabelEdit() {
    if (isEditingLabel) {
      const trimmedValue = editLabelValue.trim();
      templateStore.updateElement(element.id, {
        label: trimmedValue || undefined
      });
      isEditingLabel = false;
    }
  }

  // Auto-focus action for input
  function focusOnMount(element: HTMLInputElement) {
    element.focus();
    element.select();
  }

  // Drag and drop handlers
  function handleDragStart(e: DragEvent) {
    if (!e.dataTransfer || isRoot) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', element.id);
    e.stopPropagation();
  }

  function handleDragOver(e: DragEvent) {
    if (!e.dataTransfer) return;
    e.preventDefault();
    e.stopPropagation();

    // Only allow drop on containers, iterators, or root
    if (element.type === 'container' || element.type === 'iterator' || isRoot) {
      e.dataTransfer.dropEffect = 'move';
      isDragOver = true;
    }
  }

  function handleDragLeave(e: DragEvent) {
    isDragOver = false;
  }

  function handleDrop(e: DragEvent) {
    if (!e.dataTransfer) return;
    e.preventDefault();
    e.stopPropagation();

    isDragOver = false;

    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId) return;

    // Don't drop on yourself
    if (draggedId === element.id) return;

    // If the dragged element is an iterator, only allow dropping into containers (not root, not iterators)
    const draggedElement = templateStore.getElement(draggedId);
    if (draggedElement?.type === 'iterator') {
      if (isRoot || element.type !== 'container') return;
    }

    // Drop into container or root
    const targetParentId = isRoot ? 'root' : element.id;
    templateStore.moveElement(draggedId, targetParentId);
  }

  // Context menu handlers
  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Don't show context menu for root element (it can only add children, not be duplicated/deleted)
    if (isRoot) {
      return;
    }

    contextMenuX = e.clientX;
    contextMenuY = e.clientY;
    showContextMenu = true;
  }

  function handleDuplicate() {
    templateStore.duplicateElement(element.id);
  }

  function handleAddElement(type: ElementType) {
    const newElement = createElementOfType(type);
    templateStore.addElement(newElement, element.id);
  }

  function handleToggleVisibility() {
    // Toggle between 'show' and 'hide'
    const newMode = element.visibilityMode === 'hide' ? 'show' : 'hide';
    templateStore.updateElement(element.id, { visibilityMode: newMode });
  }

  function handleToggleLock() {
    templateStore.updateElement(element.id, { locked: !element.locked });
  }

  function getContextMenuItems(): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];

    // Duplicate action (available for all non-root elements)
    items.push({
      label: 'Duplicate',
      action: handleDuplicate
    });

    // Add submenu for container and iterator elements
    if (element.type === 'container' || element.type === 'iterator') {
      const submenuItems: ContextMenuItem[] = [
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
        }
      ];

      // Only allow adding iterators inside containers (not inside other iterators)
      if (element.type === 'container') {
        submenuItems.push({
          label: 'Iterator',
          action: () => handleAddElement('iterator')
        });
      }

      items.push({
        label: 'Add...',
        submenu: submenuItems
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

    // Delete action (with divider before it)
    items.push({ divider: true });
    items.push({
      label: 'Delete',
      action: () => handleDelete(new MouseEvent('click'))
    });

    return items;
  }
</script>

<div
  class="tree-node"
  style="--depth: {depth}"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <div
    class="node-content"
    class:selected={isSelected}
    class:hovered={isHovered && !isSelected}
    class:root={isRoot}
    class:drag-over={isDragOver && !isRoot}
    class:invisible={isInvisible}
    draggable={!isRoot}
    ondragstart={handleDragStart}
    onclick={handleSelect}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    oncontextmenu={handleContextMenu}
  >
    {#if hasChildren}
      <button
        class="expand-button"
        onclick={(e) => {
          e.stopPropagation();
          toggleExpanded();
        }}
        aria-label={expanded ? 'Collapse' : 'Expand'}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" class:rotated={expanded}>
          <path
            d="M4 2L8 6L4 10"
            stroke="currentColor"
            stroke-width="1.5"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    {:else}
      <span class="expand-spacer"></span>
    {/if}

    {#if !isRoot}
      <DragHandleIcon size={16} class="drag-handle" />

      <svg class="node-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d={getElementIcon(element.type)}
          stroke="currentColor"
          stroke-width="1.5"
          fill="none"
        />
      </svg>

      {#if isLocked}
        <LockIcon size={12} class="lock-icon" />
      {/if}

      {#if isEditingLabel}
        <input
          type="text"
          class="label-input"
          bind:value={editLabelValue}
          onblur={handleLabelBlur}
          onkeydown={handleLabelKeyDown}
          onclick={(e) => e.stopPropagation()}
          use:focusOnMount
        />
      {:else}
        <span class="node-label" ondblclick={handleLabelDoubleClick}>
          {getElementLabel(element)}
        </span>
      {/if}

      <div class="node-actions">
        {#if element.type === 'container' || element.type === 'iterator'}
          <button
            class="action-button"
            onclick={(e) => {
              e.stopPropagation();
              onAddClick(e, element.id);
            }}
            aria-label="Add child element"
          >
            <PlusIcon size={14} />
          </button>
        {/if}
        <button class="action-button delete" onclick={handleDelete} aria-label="Delete element">
          <CloseIcon size={14} />
        </button>
      </div>
    {:else}
      <span class="node-label root-label">{rootLabel || 'Root Container'}</span>
      <div class="node-actions">
        <button
          class="action-button"
          onclick={(e) => {
            e.stopPropagation();
            onAddClick(e, 'root');
          }}
          aria-label="Add child element"
        >
          <PlusIcon size={14} />
        </button>
      </div>
    {/if}
  </div>

  {#if hasChildren && expanded && (element.type === 'container' || element.type === 'iterator')}
    <div class="node-children" transition:slide={{ duration: 200 }}>
      {#each element.children as child, index (child.id)}
        <DropTarget parentId={isRoot ? 'root' : element.id} insertIndex={index} depth={depth + 1} />
        <TreeNode element={child} depth={depth + 1} {selectedId} {onAddClick} />
      {/each}
      <DropTarget
        parentId={isRoot ? 'root' : element.id}
        insertIndex={element.children.length}
        depth={depth + 1}
      />
    </div>
  {/if}
</div>

{#if showContextMenu}
  <ContextMenu
    x={contextMenuX}
    y={contextMenuY}
    items={getContextMenuItems()}
    onClose={() => (showContextMenu = false)}
  />
{/if}

<style>
  .tree-node {
    --indent: calc(var(--depth) * 1rem);
  }

  .node-content {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.5rem;
    padding-left: calc(0.5rem + var(--indent));
    margin: 1px 0;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s ease;
    position: relative;
  }

  .node-content[draggable='true'] {
    cursor: grab;
  }

  .node-content[draggable='true']:active {
    cursor: grabbing;
  }

  .node-content:hover {
    background: #f5f5f5;
  }

  .node-content.hovered {
    background: #f0f7ff;
    border: 1px dashed #0066cc;
    margin: 0;
  }

  .node-content.selected {
    background: #e6f2ff;
    border: 2px solid #0066cc;
    margin: 0;
  }

  .node-content.drag-over {
    background: #d4edda;
    border: 2px dashed #28a745;
    margin: 0;
  }

  .node-content.root {
    cursor: pointer;
    font-weight: 600;
    background: #fafafa;
  }

  .node-content.root.drag-over {
    background: #d4edda;
    border: 2px dashed #28a745;
  }

  .node-content.invisible {
    opacity: 0.5;
  }

  .expand-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: #666;
    transition: transform 0.2s ease;
  }

  .expand-button svg {
    transition: transform 0.2s ease;
  }

  .expand-button svg.rotated {
    transform: rotate(90deg);
  }

  .expand-spacer {
    width: 1.25rem;
    height: 1.25rem;
  }

  :global(.drag-handle) {
    flex-shrink: 0;
    color: #999;
    cursor: grab;
    opacity: 0.5;
    transition: opacity 0.15s ease;
  }

  .node-content:hover :global(.drag-handle) {
    opacity: 1;
  }

  .node-icon {
    flex-shrink: 0;
    color: #666;
  }

  :global(.lock-icon) {
    flex-shrink: 0;
    color: #999;
    margin-left: 0.25rem;
  }

  .node-label {
    flex: 1;
    font-size: 0.813rem;
    color: #1a1a1a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    user-select: none;
  }

  .label-input {
    flex: 1;
    font-size: 0.813rem;
    color: #1a1a1a;
    padding: 0.125rem 0.25rem;
    border: 1px solid #0066cc;
    border-radius: 3px;
    background: white;
    outline: none;
    font-family: inherit;
  }

  .label-input:focus {
    border-color: #0066cc;
    box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
  }

  .root-label {
    color: #666;
  }

  .node-actions {
    display: none;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
  }

  .node-content:hover .node-actions,
  .node-content.selected .node-actions {
    display: flex;
  }

  .action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    background: white;
    border: 1px solid #d0d0d0;
    border-radius: 3px;
    cursor: pointer;
    color: #666;
    transition: all 0.15s ease;
  }

  .action-button:hover {
    background: #f0f0f0;
    color: #1a1a1a;
  }

  .action-button.delete:hover {
    background: #fff0f0;
    color: #cc0000;
    border-color: #cc0000;
  }

  .node-children {
    overflow: hidden;
  }
</style>
