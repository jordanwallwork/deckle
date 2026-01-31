<script lang="ts">
  import Badge from '../Badge.svelte';
  import LibraryRow, { type DragItemData } from '../LibraryRow.svelte';
  import type { ContextMenuItem } from '../ContextMenu.svelte';
  import FileThumbnail from './FileThumbnail.svelte';
  import InlineFileNameEdit from './InlineFileNameEdit.svelte';
  import { formatFileSize, formatShortDate } from '$lib/utils/file.utils';
  import type { File } from '$lib/types';
  import { EditIcon, TrashIcon } from '$lib/components/icons';

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
      <EditIcon size={16} />
    </button>
    <button
      class="action-button delete"
      onclick={onDeleteClick}
      disabled={isDeleting}
      type="button"
      title="Delete file"
    >
      <TrashIcon size={16} />
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
</style>
