<script lang="ts">
  import { filesApi, ApiError } from '$lib/api';
  import Button from '../Button.svelte';
  import TagInput from '../forms/TagInput.svelte';
  import { formatFileSize, formatShortDate, getFileExtension } from '$lib/utils/file.utils';
  import type { File } from '$lib/types';
  import { CloseIcon, InfoIcon } from '$lib/components/icons';

  let {
    file,
    imageUrl,
    onClose,
    onFileUpdated
  }: {
    file: File;
    imageUrl: string;
    onClose: () => void;
    onFileUpdated?: () => void;
  } = $props();

  // File name editing
  let editingFileName = $state(
    file.fileName.substring(0, file.fileName.lastIndexOf('.')) || file.fileName
  );
  let savingFileName = $state(false);
  let fileNameError = $state<string | null>(null);

  // Tag editing
  let editingTags = $state<string[]>([...file.tags]);
  let availableTags = $state<string[]>([]);
  let savingTags = $state(false);
  let error = $state<string | null>(null);

  // Load available tags on mount
  $effect(() => {
    loadAvailableTags();
  });

  async function loadAvailableTags() {
    try {
      const { tags } = await filesApi.getTags(file.projectId);
      availableTags = tags;
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  }

  async function saveFileName() {
    savingFileName = true;
    error = null;
    fileNameError = null;

    try {
      await filesApi.rename(file.id, {
        newFileName: editingFileName
      });
      onFileUpdated?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          fileNameError = err.message;
        } else if (err.status === 404) {
          error = 'File not found. It may have been deleted.';
        } else if (err.status === 500) {
          error = err.message || 'A server error occurred while renaming the file.';
        } else {
          error = err.message;
        }
      } else {
        error = 'Failed to rename file';
      }
    } finally {
      savingFileName = false;
    }
  }

  async function saveTags() {
    savingTags = true;
    error = null;

    try {
      await filesApi.updateTags(file.id, {
        tags: editingTags
      });
      onFileUpdated?.();
    } catch (err) {
      if (err instanceof ApiError) {
        error = err.message;
      } else {
        error = 'Failed to update tags';
      }
    } finally {
      savingTags = false;
    }
  }

  function handleBackdropClick() {
    onClose();
  }

  function handleContentClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

<div class="lightbox" onclick={handleBackdropClick} role="dialog" aria-modal="true">
  <button class="lightbox-close" onclick={onClose} type="button" aria-label="Close">
    <CloseIcon size={24} />
  </button>

  <div class="lightbox-content" onclick={handleContentClick}>
    <img src={imageUrl} alt={file.fileName} class="lightbox-image" />

    <div class="lightbox-info">
      <h3>{file.fileName}</h3>
      <p>
        {formatFileSize(file.fileSizeBytes)} &bull; Uploaded on {formatShortDate(file.uploadedAt)} by {file.uploadedBy.name || file.uploadedBy.email}
      </p>

      {#if error}
        <div class="error-message">
          <InfoIcon size={20} class="error-icon" />
          <span>{error}</span>
        </div>
      {/if}

      <div class="lightbox-section">
        <label for="lightbox-filename" class="section-label">File Name</label>
        <div class="filename-input-group" class:has-error={fileNameError}>
          <input
            id="lightbox-filename"
            type="text"
            class="filename-input"
            class:invalid={fileNameError}
            bind:value={editingFileName}
            placeholder="Enter file name"
          />
          <span class="filename-extension">{getFileExtension(file.fileName)}</span>
        </div>
        {#if fileNameError}
          <div class="field-error">{fileNameError}</div>
        {/if}
        <div class="section-actions">
          <Button variant="primary" size="sm" onclick={saveFileName} disabled={savingFileName}>
            {savingFileName ? 'Saving...' : 'Rename'}
          </Button>
        </div>
      </div>

      <div class="lightbox-section">
        <label for="lightbox-tags" class="section-label">Tags</label>
        <TagInput bind:value={editingTags} suggestions={availableTags} />
        <div class="section-actions">
          <Button variant="primary" size="sm" onclick={saveTags} disabled={savingTags}>
            {savingTags ? 'Saving...' : 'Save Tags'}
          </Button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
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
    padding: 1rem;
    overflow-y: auto;
  }

  .lightbox-close {
    position: fixed;
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

  .lightbox-content {
    width: 100%;
    max-width: 1200px;
    margin: auto;
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 1024px) {
    .lightbox-content {
      grid-template-columns: 1fr;
      max-width: 800px;
    }
  }

  .lightbox-image {
    width: 100%;
    max-height: calc(90vh - 2rem);
    object-fit: contain;
    border-radius: var(--radius-lg);
  }

  .lightbox-info {
    background: rgba(255, 255, 255, 0.95);
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    max-height: calc(90vh - 2rem);
    overflow-y: auto;
  }

  .lightbox-info h3 {
    margin: 0 0 0.5rem;
    color: var(--color-text);
    font-size: 1.125rem;
  }

  .lightbox-info > p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }

  .lightbox-section {
    margin-top: 1.5rem;
    text-align: left;
  }

  .section-label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .filename-input-group {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: white;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.5rem 0.75rem;
    transition: border-color 0.2s ease;
  }

  .filename-input-group.has-error {
    border-color: #e74c3c;
  }

  .filename-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 0.875rem;
    color: var(--color-text);
    background: transparent;
  }

  .filename-input.invalid {
    color: #e74c3c;
  }

  .filename-extension {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .field-error {
    margin-top: 0.5rem;
    font-size: 0.8125rem;
    color: #e74c3c;
  }

  .section-actions {
    margin-top: 0.75rem;
    display: flex;
    justify-content: flex-start;
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

  :global(.error-icon) {
    flex-shrink: 0;
  }
</style>
