<script lang="ts">
  import { filesApi, ApiError } from '$lib/api';
  import { config } from '$lib/config';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import EmptyState from './EmptyState.svelte';
  import { FileRow, FileLightbox } from './file-gallery';
  import type { File } from '$lib/types';

  let {
    files = [],
    onFileDeleted,
    onFileUpdated,
    selectable = false,
    selectedIds = [],
    onSelectionChange,
    allItems = []
  }: {
    files: File[];
    onFileDeleted?: (fileId: string) => void;
    onFileUpdated?: () => void;
    selectable?: boolean;
    selectedIds?: string[];
    onSelectionChange?: (fileId: string, selected: boolean, shiftKey: boolean) => void;
    allItems?: Array<{ type: 'file' | 'folder'; id: string }>;
  } = $props();

  // Lightbox state
  let lightboxFile = $state<File | null>(null);
  let lightboxImageUrl = $state<string | null>(null);

  // Delete confirmation state
  let deleteConfirmOpen = $state(false);
  let fileToDelete = $state<File | null>(null);
  let deletingFileId = $state<string | null>(null);

  // Error state
  let error = $state<string | null>(null);

  function openLightbox(file: File) {
    error = null;
    lightboxImageUrl = `${config.apiUrl}/file/${file.projectId}?filename=${encodeURIComponent(file.path)}`;
    lightboxFile = file;
  }

  function closeLightbox() {
    lightboxFile = null;
    lightboxImageUrl = null;
  }

  function openDeleteConfirm(file: File) {
    fileToDelete = file;
    deleteConfirmOpen = true;
  }

  async function confirmDelete() {
    if (!fileToDelete) return;

    const fileId = fileToDelete.id;
    deletingFileId = fileId;
    error = null;

    try {
      await filesApi.delete(fileId);
      deleteConfirmOpen = false;
      fileToDelete = null;
      onFileDeleted?.(fileId);
    } catch (err) {
      if (err instanceof ApiError) {
        error = err.message;
      } else {
        error = 'Failed to delete file';
      }
    } finally {
      deletingFileId = null;
    }
  }

  function handleError(message: string) {
    error = message;
  }
</script>

<div class="file-gallery">
  {#if files.length === 0}
    <EmptyState title="No files uploaded yet" subtitle="Upload your first file to get started" />
  {:else}
    <div class="file-list">
      {#each files as file (file.id)}
        <FileRow
          {file}
          isDeleting={deletingFileId === file.id}
          onThumbnailClick={() => openLightbox(file)}
          onDeleteClick={() => openDeleteConfirm(file)}
          onFileRenamed={onFileUpdated}
          onError={handleError}
          {selectable}
          isSelected={selectedIds.includes(file.id)}
          onSelectionChange={(selected, shiftKey) => onSelectionChange?.(file.id, selected, shiftKey)}
          {selectedIds}
          {allItems}
        />
      {/each}
    </div>
  {/if}

  {#if error}
    <div class="error-message">
      <svg
        class="error-icon"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{error}</span>
    </div>
  {/if}
</div>

{#if lightboxFile && lightboxImageUrl}
  <FileLightbox
    file={lightboxFile}
    imageUrl={lightboxImageUrl}
    onClose={closeLightbox}
    onFileUpdated={onFileUpdated}
  />
{/if}

<ConfirmDialog
  show={deleteConfirmOpen}
  title="Delete File"
  message="Are you sure you want to delete this file? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  onconfirm={confirmDelete}
  oncancel={() => {
    deleteConfirmOpen = false;
    fileToDelete = null;
  }}
/>

<style>
  .file-gallery {
    width: 100%;
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background-color: rgba(231, 76, 60, 0.1);
    border: 1px solid #e74c3c;
    border-radius: var(--radius-md);
    color: #e74c3c;
    font-size: 0.875rem;
  }

  .error-message .error-icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }
</style>
