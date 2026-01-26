<script lang="ts">
  import Badge from '../Badge.svelte';
  import LibraryRow, { type DragItemData } from '../LibraryRow.svelte';
  import type { ContextMenuItem } from '../ContextMenu.svelte';
  import FileThumbnail from './FileThumbnail.svelte';
  import InlineFileNameEdit from './InlineFileNameEdit.svelte';
  import { formatFileSize, formatShortDate } from '$lib/utils/file.utils';
  import type { File } from '$lib/types';

  let {
    file,
    isDeleting = false,
    onThumbnailClick,
    onDeleteClick,
    onFileRenamed,
    onError,
    selectable = false,
    isSelected = false,
    onSelectionChange,
    selectedIds = [],
    allItems = []
  }: {
    file: File;
    isDeleting?: boolean;
    onThumbnailClick: () => void;
    onDeleteClick: () => void;
    onFileRenamed?: () => void;
    onError?: (message: string) => void;
    selectable?: boolean;
    isSelected?: boolean;
    onSelectionChange?: (selected: boolean, shiftKey: boolean) => void;
    selectedIds?: string[];
    allItems?: Array<{ type: 'file' | 'folder'; id: string }>;
  } = $props();

  // Drag data for this file
  const dragData: DragItemData = {
    type: 'file',
    id: file.id
  };

  let fileNameEditRef: InlineFileNameEdit | undefined = $state();
  let isEditingFileName = $state(false);

  const contextMenuItems: ContextMenuItem[] = [
    {
      label: 'View',
      action: onThumbnailClick
    },
    {
      label: 'Rename',
      action: () => fileNameEditRef?.startEditing()
    },
    {
      label: 'Delete',
      action: onDeleteClick,
      variant: 'danger'
    }
  ];
</script>

<LibraryRow
  isDisabled={isDeleting}
  isEditingExternal={isEditingFileName}
  onRowClick={onThumbnailClick}
  metadata="{formatFileSize(file.fileSizeBytes)} &bull; {formatShortDate(file.uploadedAt)}"
  {contextMenuItems}
  {dragData}
  {selectable}
  {isSelected}
  {onSelectionChange}
  {selectedIds}
  {allItems}
>
  {#snippet thumbnail()}
    <FileThumbnail
      projectId={file.projectId}
      path={file.path}
      fileName={file.fileName}
    />
  {/snippet}

  {#snippet nameContent()}
    <InlineFileNameEdit
      bind:this={fileNameEditRef}
      {file}
      onRenamed={onFileRenamed}
      {onError}
      onEditingChange={(editing) => isEditingFileName = editing}
    />
    {#if file.tags && file.tags.length > 0}
      <div class="file-tags">
        {#each file.tags as tag}
          <Badge variant="primary" size="sm">{tag}</Badge>
        {/each}
      </div>
    {/if}
  {/snippet}

  {#snippet actions()}
    <button
      class="action-button"
      onclick={() => fileNameEditRef?.startEditing()}
      disabled={isDeleting}
      type="button"
      title="Rename file"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
    <button
      class="action-button delete"
      onclick={onDeleteClick}
      disabled={isDeleting}
      type="button"
      title="Delete file"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  {/snippet}
</LibraryRow>

<style>
  .file-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
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

  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-button:disabled:hover {
    border-color: var(--color-border);
    color: var(--color-text-muted);
  }

  .action-button svg {
    width: 16px;
    height: 16px;
  }
</style>
