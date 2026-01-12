<script lang="ts">
  import { filesApi, ApiError } from '$lib/api';
  import Button from './Button.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import EmptyState from './EmptyState.svelte';
  import type { File } from '$lib/types';

  let {
    files = [],
    onFileDeleted
  }: {
    files: File[];
    onFileDeleted?: (fileId: string) => void;
  } = $props();

  let selectedFile = $state<File | null>(null);
  let lightboxOpen = $state(false);
  let lightboxImageUrl = $state<string | null>(null);
  let deleteConfirmOpen = $state(false);
  let fileToDelete = $state<File | null>(null);
  let deletingFileId = $state<string | null>(null);
  let error = $state<string | null>(null);

  async function openLightbox(file: File) {
    try {
      error = null;
      const { downloadUrl } = await filesApi.generateDownloadUrl(file.id);
      lightboxImageUrl = downloadUrl;
      selectedFile = file;
      lightboxOpen = true;
    } catch (err) {
      if (err instanceof ApiError) {
        error = err.message;
      } else {
        error = 'Failed to load image';
      }
    }
  }

  function closeLightbox() {
    lightboxOpen = false;
    lightboxImageUrl = null;
    selectedFile = null;
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

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async function getThumbnailUrl(file: File): Promise<string> {
    try {
      const { downloadUrl } = await filesApi.generateDownloadUrl(file.id);
      return downloadUrl;
    } catch {
      return '';
    }
  }
</script>

<div class="file-gallery">
  {#if files.length === 0}
    <EmptyState title="No files uploaded yet" subtitle="Upload your first file to get started" />
  {:else}
    <div class="gallery-grid">
      {#each files as file (file.id)}
        <div class="gallery-item" class:deleting={deletingFileId === file.id}>
          <button class="thumbnail-button" onclick={() => openLightbox(file)} type="button">
            {#await getThumbnailUrl(file)}
              <div class="thumbnail-loading">
                <svg
                  class="loading-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            {:then url}
              {#if url}
                <img src={url} alt={file.fileName} class="thumbnail-image" />
              {:else}
                <div class="thumbnail-error">
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
                </div>
              {/if}
            {/await}
          </button>

          <div class="file-info">
            <p class="file-name" title={file.fileName}>{file.fileName}</p>
            <p class="file-meta">
              {formatFileSize(file.fileSizeBytes)} • {formatDate(file.uploadedAt)}
            </p>
            <p class="file-uploader">
              Uploaded by {file.uploadedBy.name || file.uploadedBy.email}
            </p>
          </div>

          <div class="file-actions">
            <Button
              variant="danger"
              size="sm"
              outline
              onclick={() => openDeleteConfirm(file)}
              disabled={deletingFileId === file.id}
            >
              {deletingFileId === file.id ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
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

{#if lightboxOpen && lightboxImageUrl && selectedFile}
  <div class="lightbox" onclick={closeLightbox}>
    <button class="lightbox-close" onclick={closeLightbox} type="button">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
    <div class="lightbox-content" onclick={(e) => e.stopPropagation()}>
      <img src={lightboxImageUrl} alt={selectedFile.fileName} class="lightbox-image" />
      <div class="lightbox-info">
        <h3>{selectedFile.fileName}</h3>
        <p>
          {formatFileSize(selectedFile.fileSizeBytes)} • Uploaded on {formatDate(
            selectedFile.uploadedAt
          )} by {selectedFile.uploadedBy.name || selectedFile.uploadedBy.email}
        </p>
      </div>
    </div>
  </div>
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

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .gallery-item {
    background-color: white;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .gallery-item:hover {
    border-color: var(--color-muted-teal);
    box-shadow: var(--shadow-md);
  }

  .gallery-item.deleting {
    opacity: 0.5;
    pointer-events: none;
  }

  .thumbnail-button {
    width: 100%;
    height: 200px;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    overflow: hidden;
    position: relative;
    background-color: var(--color-background);
  }

  .thumbnail-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s ease;
  }

  .thumbnail-button:hover .thumbnail-image {
    transform: scale(1.05);
  }

  .thumbnail-loading,
  .thumbnail-error {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
  }

  .loading-icon,
  .error-icon {
    width: 3rem;
    height: 3rem;
  }

  .file-info {
    padding: 1rem;
  }

  .file-name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 0.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-meta {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin: 0 0 0.25rem;
  }

  .file-uploader {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    margin: 0;
  }

  .file-actions {
    padding: 0 1rem 1rem;
    display: flex;
    justify-content: flex-end;
  }

  .empty-hint {
    color: var(--color-text-muted);
    margin-top: 0.5rem;
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

  /* Lightbox styles */
  .lightbox {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
  }

  .lightbox-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
    transition: background-color 0.2s ease;
    z-index: 1001;
  }

  .lightbox-close:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .lightbox-close svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  .lightbox-content {
    max-width: 90%;
    max-height: 90%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .lightbox-image {
    max-width: 100%;
    max-height: calc(90vh - 8rem);
    object-fit: contain;
    border-radius: var(--radius-lg);
  }

  .lightbox-info {
    background: rgba(255, 255, 255, 0.95);
    padding: 1rem 1.5rem;
    border-radius: var(--radius-lg);
    text-align: center;
    max-width: 600px;
  }

  .lightbox-info h3 {
    margin: 0 0 0.5rem;
    color: var(--color-text);
    font-size: 1.125rem;
  }

  .lightbox-info p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }
</style>
