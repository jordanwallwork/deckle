<script lang="ts">
  import { slide } from 'svelte/transition';
  import { templateStore } from '$lib/stores/templateElements';
  import type { TemplateElement, ElementType } from '../types';

  let {
    element,
    isRoot = false,
    depth = 0,
    selectedId,
    onAddClick
  }: {
    element: TemplateElement;
    isRoot?: boolean;
    depth?: number;
    selectedId: string | null;
    onAddClick: (event: MouseEvent, parentId: string | null) => void;
  } = $props();

  let expanded = $state(true);
  let isDragOver = $state(false);

  const hasChildren = $derived(element.type === 'container' && element.children.length > 0);
  const isSelected = $derived(selectedId === element.id);
  const isHovered = $derived($templateStore.hoveredElementId === element.id);

  function toggleExpanded() {
    if (hasChildren) {
      expanded = !expanded;
    }
  }

  function handleSelect() {
    if (!isRoot) {
      templateStore.selectElement(element.id);
    }
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

  function getElementIcon(type: ElementType): string {
    switch (type) {
      case 'container':
        return 'M2 2h12v12H2z';
      case 'text':
        return 'M4 3h8M8 3v10M6 13h4';
      case 'image':
        return 'M2 2h12v12H2zM5.5 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM2 11l3-3 3 3 3-3 3 3';
      default:
        return '';
    }
  }

  function getElementLabel(el: TemplateElement): string {
    if (el.type === 'text') {
      return el.content.substring(0, 20) + (el.content.length > 20 ? '...' : '');
    }
    return el.type.charAt(0).toUpperCase() + el.type.slice(1);
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

    // Only allow drop on containers or root
    if (element.type === 'container' || isRoot) {
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

    // Drop into container or root
    const targetParentId = isRoot ? 'root' : element.id;
    templateStore.moveElement(draggedId, targetParentId);
  }
</script>

{#if !isRoot || hasChildren}
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
      draggable={!isRoot}
      ondragstart={handleDragStart}
      onclick={handleSelect}
      onmouseenter={handleMouseEnter}
      onmouseleave={handleMouseLeave}
    >
      {#if hasChildren}
        <button
          class="expand-button"
          onclick={(e) => { e.stopPropagation(); toggleExpanded(); }}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" class:rotated={expanded}>
            <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      {:else}
        <span class="expand-spacer"></span>
      {/if}

      {#if !isRoot}
        <svg class="drag-handle" width="12" height="16" viewBox="0 0 12 16" fill="none" aria-label="Drag to move">
          <circle cx="3" cy="4" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="4" r="1.5" fill="currentColor"/>
          <circle cx="3" cy="8" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="8" r="1.5" fill="currentColor"/>
          <circle cx="3" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
        </svg>

        <svg class="node-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d={getElementIcon(element.type)} stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>

        <span class="node-label">{getElementLabel(element)}</span>

        <div class="node-actions">
          {#if element.type === 'container'}
            <button
              class="action-button"
              onclick={(e) => { e.stopPropagation(); onAddClick(e, element.id); }}
              aria-label="Add child element"
            >
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M7 3v8M3 7h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          {/if}
          <button
            class="action-button delete"
            onclick={handleDelete}
            aria-label="Delete element"
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      {:else}
        <span class="node-label root-label">Root Container</span>
      {/if}
    </div>

    {#if hasChildren && expanded && element.type === 'container'}
      <div class="node-children" transition:slide={{ duration: 200 }}>
        {#each element.children as child (child.id)}
          <svelte:self
            element={child}
            depth={depth + 1}
            selectedId={selectedId}
            onAddClick={onAddClick}
          />
        {/each}
      </div>
    {/if}
  </div>
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

  .node-content[draggable="true"] {
    cursor: grab;
  }

  .node-content[draggable="true"]:active {
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
    cursor: default;
    font-weight: 600;
    background: #fafafa;
  }

  .node-content.root.drag-over {
    background: #d4edda;
    border: 2px dashed #28a745;
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

  .drag-handle {
    flex-shrink: 0;
    color: #999;
    cursor: grab;
    opacity: 0.5;
    transition: opacity 0.15s ease;
  }

  .node-content:hover .drag-handle {
    opacity: 1;
  }

  .node-icon {
    flex-shrink: 0;
    color: #666;
  }

  .node-label {
    flex: 1;
    font-size: 0.813rem;
    color: #1a1a1a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  .node-content:hover .node-actions {
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
