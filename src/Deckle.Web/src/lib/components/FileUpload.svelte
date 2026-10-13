<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { filesApi } from '$lib/api';
  import Button from './Button.svelte';
  import TagInput from './forms/TagInput.svelte';
  import UploadQueueItem from './file-upload/UploadQueueItem.svelte';
  import { UploadQueue, type UploadSummary } from './file-upload/uploadQueue.svelte';
  import type { File } from '$lib/types';

  let {
    projectId,
    directoryId = null,
    initialFiles = [],
    onFileUploaded,
    onComplete
  }: {
    projectId: string;
    directoryId?: string | null;
    initialFiles?: globalThis.File[];
    onFileUploaded?: (file: File) => void;
    onComplete?: (summary: UploadSummary) => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  const queue = new UploadQueue(projectId);

  let fileInput = $state<HTMLInputElement | null>(null);
  let isDragging = $state(false);
  let selectedTags = $state<string[]>([]);
  let availableTags = $state<string[]>([]);
  let lastSummary = $state<UploadSummary | null>(null);

  let hasItems = $derived(queue.items.length > 0);

  onMount(async () => {
    queue.add(initialFiles);
    try {
      const { tags } = await filesApi.getTags(projectId);
      availableTags = tags;
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  });

  // Closing the modal mid-batch stops after the in-flight file
  onDestroy(() => queue.cancel());

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) queue.add(Array.from(target.files));
    target.value = '';
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    if (event.dataTransfer?.files) queue.add(Array.from(event.dataTransfer.files));
  }

  function clearAll() {
    queue.clear();
    selectedTags = [];
    lastSummary = null;
  }

  async function startUpload() {
    lastSummary = null;
    const summary = await queue.start({ tags: selectedTags, directoryId, onFileUploaded });
    lastSummary = summary;
    onComplete?.(summary);
  }

  function retryFailed() {
    queue.retryFailed();
    startUpload();
  }
</script>

<div class="file-upload">
  <div
    class="drop-zone"
    class:dragging={isDragging}
    class:compact={hasItems}
    role="region"
    aria-label="File drop zone"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    {#if hasItems}
      <p class="drop-zone-hint">Drop more images here, or</p>
      <Button variant="secondary" size="sm" onclick={() => fileInput?.click()}>Add Files</Button>
    {:else}
      <svg
        class="upload-icon"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <p class="drop-zone-text">Drag and drop images here, or click to select</p>
      <p class="drop-zone-hint">
        Maximum file size: 50MB. Supported formats: JPEG, PNG, GIF, WebP, SVG
      </p>
      <Button variant="primary" onclick={() => fileInput?.click()}>Select Files</Button>
    {/if}
  </div>

  {#if hasItems}
    <ul class="queue-list">
      {#each queue.items as item (item.id)}
        <UploadQueueItem {item} onremove={() => queue.remove(item.id)} />
      {/each}
    </ul>

    {#if !queue.isUploading}
      <div class="file-tags-section">
        <label for="file-tags" class="tags-label">Tags (optional, applied to all files)</label>
        <TagInput bind:value={selectedTags} suggestions={availableTags} />
      </div>
    {/if}

    {#if lastSummary && lastSummary.failed > 0}
      <p class="summary">{lastSummary.uploaded} uploaded, {lastSummary.failed} failed</p>
    {/if}

    <div class="file-actions">
      {#if queue.isUploading}
        <p class="summary">Uploading… {queue.pendingCount} remaining after this one</p>
      {:else}
        {#if queue.failedCount > 0}
          <Button variant="secondary" onclick={retryFailed}>Retry Failed</Button>
        {/if}
        <Button variant="primary" disabled={!queue.hasUploadable} onclick={startUpload}>
          Upload {queue.pendingCount}
          {queue.pendingCount === 1 ? 'Image' : 'Images'}
        </Button>
        <Button variant="secondary" onclick={clearAll}>Clear</Button>
      {/if}
    </div>
  {/if}

  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    multiple
    onchange={handleFileSelect}
    style="display: none;"
  />
</div>

<style>
  .file-upload {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--pad-content);
    text-align: center;
    transition: all 0.2s ease;
    background-color: var(--color-background);
  }

  .drop-zone.compact {
    flex-direction: row;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
  }

  .drop-zone.dragging {
    border-color: var(--color-secondary-fg);
    background-color: rgba(120, 160, 131, 0.05);
  }

  .upload-icon {
    width: 3rem;
    height: 3rem;
    color: var(--color-secondary-fg);
  }

  .drop-zone-text {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .drop-zone-hint {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin: 0;
  }

  .queue-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 18rem;
    overflow-y: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .tags-label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .file-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    align-items: center;
  }

  .summary {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin: 0;
    text-align: center;
  }
</style>
