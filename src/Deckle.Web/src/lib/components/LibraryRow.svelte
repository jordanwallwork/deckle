<script lang="ts">
  import type { Snippet } from 'svelte';
  import ContextMenu, { type ContextMenuItem } from './ContextMenu.svelte';

  export type DragItemData = {
    type: 'file' | 'folder';
    id: string;
    items?: Array<{ type: 'file' | 'folder'; id: string }>;
  };

  let {
    name,
    metadata,
    isDisabled = false,
    isEditingExternal = false,
    onRowClick,
    onNameEdit,
    thumbnail,
    actions,
    extraContent,
    nameContent,
    contextMenuItems,
    // Drag and drop props
    dragData,
    isDropTarget = false,
    onDrop,
    canAcceptDrop,
    // Selection props
    selectable = false,
    isSelected = false,
    onSelectionChange,
    // Multi-select drag context
    selectedIds = [],
    allItems = []
  }: {
    name?: string;
    metadata?: string;
    isDisabled?: boolean;
    isEditingExternal?: boolean;
    onRowClick?: () => void;
    onNameEdit?: (newName: string) => void;
    thumbnail: Snippet;
    actions?: Snippet;
    extraContent?: Snippet;
    nameContent?: Snippet<[{ startEditing: () => void }]>;
    contextMenuItems?: ContextMenuItem[];
    // Drag and drop props
    dragData?: DragItemData;
    isDropTarget?: boolean;
    onDrop?: (data: DragItemData) => void;
    canAcceptDrop?: (data: DragItemData) => boolean;
    // Selection props
    selectable?: boolean;
    isSelected?: boolean;
    onSelectionChange?: (selected: boolean, shiftKey: boolean) => void;
    // Multi-select drag context
    selectedIds?: string[];
    allItems?: Array<{ type: 'file' | 'folder'; id: string }>;
  } = $props();

  let contextMenuState = $state<{ x: number; y: number } | null>(null);
  let isDragOver = $state(false);

  let isEditing = $state(false);
  let editName = $state('');
  let inputRef = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (isEditing && inputRef) {
      inputRef.focus();
      inputRef.select();
    }
  });

  export function startEditing() {
    if (!onNameEdit) return;
    if (name) {
      editName = name;
      isEditing = true;
    }
  }

  function cancelEditing() {
    isEditing = false;
    editName = '';
  }

  function submitEdit() {
    if (editName.trim() && editName.trim() !== name) {
      onNameEdit?.(editName.trim());
    }
    isEditing = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitEdit();
    } else if (event.key === 'Escape') {
      cancelEditing();
    }
  }

  function handleRowClick(event: MouseEvent) {
    // Don't trigger row click while editing
    if (isEditing || isEditingExternal) return;

    // Only trigger row click if not clicking on interactive elements
    const target = event.target as HTMLElement;
    if (
      target.closest('.row-actions') ||
      target.closest('.row-name-button') ||
      target.closest('.row-name-input') ||
      target.closest('.drag-handle')
    ) {
      return;
    }
    onRowClick?.();
  }

  function handleContextMenu(event: MouseEvent) {
    if (!contextMenuItems || contextMenuItems.length === 0 || isDisabled) return;
    event.preventDefault();
    contextMenuState = { x: event.clientX, y: event.clientY };
  }

  function closeContextMenu() {
    contextMenuState = null;
  }

  // Drag and drop handlers
  function handleDragStart(event: DragEvent) {
    if (!dragData || !event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';

    // If this item is selected and there are multiple selected items,
    // include all selected items in the drag data
    let dataToTransfer: DragItemData = { ...dragData };

    if (isSelected && selectedIds.length > 1) {
      // Get all selected items from the allItems array
      const selectedItems = allItems.filter((item) => selectedIds.includes(item.id));
      dataToTransfer.items = selectedItems;
    }

    event.dataTransfer.setData('application/json', JSON.stringify(dataToTransfer));
  }

  function handleDragOver(event: DragEvent) {
    if (!isDropTarget || !event.dataTransfer) return;

    const jsonData = event.dataTransfer.types.includes('application/json');
    if (!jsonData) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    isDragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.stopPropagation();
    isDragOver = false;
  }

  function handleDrop(event: DragEvent) {
    if (!isDropTarget || !event.dataTransfer) return;
    event.preventDefault();
    event.stopPropagation();
    isDragOver = false;

    const jsonStr = event.dataTransfer.getData('application/json');
    if (!jsonStr) return;

    try {
      const data = JSON.parse(jsonStr) as DragItemData;

      // Check if we can accept this drop
      if (canAcceptDrop && !canAcceptDrop(data)) return;

      onDrop?.(data);
    } catch {
      // Invalid JSON, ignore
    }
  }

  function handleCheckboxClick(event: MouseEvent) {
    event.stopPropagation();
    onSelectionChange?.(!isSelected, event.shiftKey);
  }

</script>

<div
  class="library-row"
  class:disabled={isDisabled}
  class:clickable={!!onRowClick}
  class:drag-over={isDragOver}
  class:selected={isSelected}
  onclick={handleRowClick}
  oncontextmenu={handleContextMenu}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  role={onRowClick ? 'button' : undefined}
  tabindex={onRowClick ? 0 : undefined}
  onkeydown={onRowClick ? (e) => e.key === 'Enter' && onRowClick() : undefined}
>
  {#if selectable}
    <button
      class="row-checkbox"
      type="button"
      onclick={handleCheckboxClick}
      aria-label={isSelected ? 'Deselect item' : 'Select item'}
    >
      <div class="checkbox" class:checked={isSelected}>
        {#if isSelected}
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
          </svg>
        {/if}
      </div>
    </button>
  {/if}
  {#if dragData}
    <div
      class="drag-handle"
      draggable="true"
      ondragstart={handleDragStart}
      role="button"
      tabindex="0"
      aria-label="Drag to reorder"
    >
      <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
        <circle cx="3" cy="4" r="1.5" fill="currentColor" />
        <circle cx="9" cy="4" r="1.5" fill="currentColor" />
        <circle cx="3" cy="8" r="1.5" fill="currentColor" />
        <circle cx="9" cy="8" r="1.5" fill="currentColor" />
        <circle cx="3" cy="12" r="1.5" fill="currentColor" />
        <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      </svg>
    </div>
  {/if}
  <button
    class="row-thumbnail"
    onclick={onRowClick}
    type="button"
    disabled={isDisabled || !onRowClick}
  >
    {@render thumbnail()}
  </button>

  <div class="row-info">
    <div class="row-name-section">
      {#if nameContent}
        {@render nameContent({ startEditing })}
      {:else if isEditing}
        <div class="row-name-edit">
          <input
            type="text"
            class="row-name-input"
            bind:this={inputRef}
            bind:value={editName}
            onkeydown={handleKeydown}
            onblur={submitEdit}
          />
        </div>
      {:else}
        <button
          class="row-name-button"
          onclick={() => { if (onNameEdit) startEditing(); }}
          type="button"
          disabled={!onNameEdit}
        >
          <span class="row-name">{name}</span>
        </button>
      {/if}
      {#if extraContent}
        {@render extraContent()}
      {/if}
    </div>
    {#if metadata}
      <p class="row-meta">{metadata}</p>
    {/if}
  </div>

  {#if actions}
    <div class="row-actions">
      {@render actions()}
    </div>
  {/if}
</div>

{#if contextMenuState && contextMenuItems}
  <ContextMenu
    x={contextMenuState.x}
    y={contextMenuState.y}
    items={contextMenuItems}
    onClose={closeContextMenu}
  />
{/if}

<style>
  .library-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    transition: background-color 0.15s ease;
  }

  .library-row:hover {
    background-color: rgba(120, 160, 131, 0.08);
  }

  .library-row.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .library-row.clickable {
    cursor: pointer;
  }

  .library-row.drag-over {
    background-color: rgba(120, 160, 131, 0.15);
    box-shadow: inset 0 0 0 2px var(--color-sage);
  }

  .library-row.selected {
    background-color: rgba(120, 160, 131, 0.12);
  }

  .library-row.selected:hover {
    background-color: rgba(120, 160, 131, 0.16);
  }

  .row-checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }

  .checkbox {
    width: 1.125rem;
    height: 1.125rem;
    border: 2px solid #bbb;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    background: white;
  }

  .checkbox:hover {
    border-color: var(--color-sage);
  }

  .checkbox.checked {
    background-color: var(--color-sage);
    border-color: var(--color-sage);
    color: white;
  }

  .checkbox svg {
    width: 0.75rem;
    height: 0.75rem;
  }

  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.25rem;
    height: 2.5rem;
    cursor: grab;
    color: #999;
    opacity: 0.5;
    transition: opacity 0.15s ease, color 0.15s ease;
  }

  .drag-handle:hover {
    opacity: 1;
    color: var(--color-sage);
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .library-row:hover .drag-handle {
    opacity: 0.8;
  }

  .row-thumbnail {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    overflow: hidden;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .row-thumbnail:disabled {
    cursor: default;
  }

  .row-info {
    flex: 1;
    min-width: 0;
  }

  .row-name-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .row-name-button {
    background: none;
    border: none;
    padding: 0.125rem 0.25rem;
    margin: -0.125rem -0.25rem;
    cursor: pointer;
    text-align: left;
    display: block;
    border-radius: var(--radius-sm);
    transition: background-color 0.15s ease;
  }

  .row-name-button:not(:disabled):hover {
    background-color: rgba(120, 160, 131, 0.1);
  }

  .row-name-button:not(:disabled):focus {
    outline: none;
    background-color: rgba(120, 160, 131, 0.15);
  }

  .row-name-button:disabled {
    cursor: default;
  }

  .row-name {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-name-button:not(:disabled):hover .row-name {
    color: var(--color-sage);
  }

  .row-name-input {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-text);
    border: 1px solid var(--color-sage);
    border-radius: var(--radius-sm);
    padding: 0.25rem 0.5rem;
    width: 100%;
    max-width: 300px;
    outline: none;
  }

  .row-name-input:focus {
    box-shadow: 0 0 0 2px rgba(120, 160, 131, 0.2);
  }

  .row-meta {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    margin: 0.25rem 0 0;
  }

  .row-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
