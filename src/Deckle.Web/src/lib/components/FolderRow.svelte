<script lang="ts">
  import type { FileDirectory } from '$lib/types';
  import LibraryRow, { type DragItemData } from './LibraryRow.svelte';
  import type { ContextMenuItem } from './ContextMenu.svelte';

  let {
    directory,
    itemCount = 0,
    onclick,
    onrename,
    ondelete,
    onItemDropped,
    selectable = false,
    isSelected = false,
    onSelectionChange,
    selectedIds = [],
    allItems = []
  }: {
    directory: FileDirectory;
    itemCount?: number;
    onclick?: () => void;
    onrename?: (name: string) => void;
    ondelete?: () => void;
    onItemDropped?: (data: DragItemData) => void;
    selectable?: boolean;
    isSelected?: boolean;
    onSelectionChange?: (selected: boolean, shiftKey: boolean) => void;
    selectedIds?: string[];
    allItems?: Array<{ type: 'file' | 'folder'; id: string }>;
  } = $props();

  let rowRef: LibraryRow | undefined = $state();

  function formatItemCount(count: number): string {
    return count === 1 ? '1 item' : `${count} items`;
  }

  // Drag data for this folder
  const dragData: DragItemData = {
    type: 'folder',
    id: directory.id
  };

  // Check if we can accept a drop (not ourselves or any item we're part of)
  function canAcceptDrop(data: DragItemData): boolean {
    // Can't drop a folder onto itself
    if (data.type === 'folder' && data.id === directory.id) {
      return false;
    }
    // When multi-selecting, can't drop if this folder is one of the selected items
    if (data.items?.some((item) => item.type === 'folder' && item.id === directory.id)) {
      return false;
    }
    return true;
  }

  let contextMenuItems = $derived.by(() => {
    const items: ContextMenuItem[] = [];
    if (onclick) {
      items.push({
        label: 'View',
        action: onclick
      });
    }
    if (onrename) {
      items.push({
        label: 'Rename',
        action: () => rowRef?.startEditing()
      });
    }
    if (ondelete) {
      items.push({
        label: 'Delete',
        action: ondelete,
        variant: 'danger'
      });
    }
    return items;
  });
</script>

<LibraryRow
  bind:this={rowRef}
  name={directory.name}
  metadata={formatItemCount(itemCount)}
  onRowClick={onclick}
  onNameEdit={onrename}
  {contextMenuItems}
  {dragData}
  isDropTarget={true}
  {canAcceptDrop}
  onDrop={onItemDropped}
  {selectable}
  {isSelected}
  {onSelectionChange}
  {selectedIds}
  {allItems}
>
  {#snippet thumbnail()}
    <div class="folder-icon">
      <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4Z" />
      </svg>
    </div>
  {/snippet}

  {#snippet actions()}
    {#if onrename}
      <button class="action-button" onclick={() => rowRef?.startEditing()} type="button" title="Rename folder">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    {/if}
    {#if ondelete}
      <button class="action-button delete" onclick={ondelete} type="button" title="Delete folder">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    {/if}
  {/snippet}
</LibraryRow>

<style>
  .folder-icon {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, #e8d4c4 0%, #d4bfaf 100%);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a08979;
    transition: transform 0.2s ease;
  }

  .folder-icon:hover {
    transform: scale(1.05);
  }

  .folder-icon svg {
    width: 32px;
    height: 32px;
  }

  .action-button {
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: white;
    color: var(--color-text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .action-button:hover {
    border-color: var(--color-sage);
    color: var(--color-sage);
  }

  .action-button.delete:hover {
    border-color: var(--color-danger);
    color: var(--color-danger);
  }

  .action-button svg {
    width: 16px;
    height: 16px;
  }
</style>
