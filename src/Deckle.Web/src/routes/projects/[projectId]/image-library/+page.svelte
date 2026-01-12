<script lang="ts">
  import type { PageData } from './$types';
  import { invalidateAll } from '$app/navigation';
  import FileUpload from '$lib/components/FileUpload.svelte';
  import FileGallery from '$lib/components/FileGallery.svelte';
  import Dialog from '$lib/components/Dialog.svelte';

  let { data }: { data: PageData } = $props();

  // Modal state
  let showUploadModal = $state(false);

  // Page-wide drag-and-drop state
  let isDraggingOverPage = $state(false);

  // Button click handler
  function openUploadModal() {
    showUploadModal = true;
  }

  // Page-wide drag-and-drop handlers
  function handlePageDragOver(event: DragEvent) {
    // Only handle if not already in upload modal
    if (!showUploadModal && event.dataTransfer?.types.includes('Files')) {
      event.preventDefault();
      isDraggingOverPage = true;
    }
  }

  function handlePageDragLeave(event: DragEvent) {
    event.preventDefault();
    isDraggingOverPage = false;
  }

  function handlePageDrop(event: DragEvent) {
    event.preventDefault();
    isDraggingOverPage = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      // Open upload modal (FileUpload component will handle the file selection)
      showUploadModal = true;
    }
  }

  // Upload complete handler
  async function handleUploadComplete() {
    // Refresh data from server
    await invalidateAll();

    // Close modal
    showUploadModal = false;
  }

  // File deleted handler
  async function handleFileDeleted() {
    // Refresh data from server
    await invalidateAll();
  }

  // Format bytes for display
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

<svelte:head>
  <title>Image Library · {data.project.name} · Deckle</title>
  <meta
    name="description"
    content="Manage images and artwork for {data.project
      .name}. Upload and organize visual assets to use in your game components."
  />
</svelte:head>

<div
  class="tab-content"
  class:dragging-over={isDraggingOverPage}
  ondragover={handlePageDragOver}
  ondragleave={handlePageDragLeave}
  ondrop={handlePageDrop}
>
  <div class="tab-actions">
    <button class="add-button" onclick={openUploadModal}>+ Upload Images</button>
  </div>

  {#if isDraggingOverPage}
    <div class="drag-overlay">
      <p>Drop images here to upload</p>
    </div>
  {/if}

  {#if data.quota}
    <div class="quota-info">
      <p>
        Storage: {formatBytes(data.quota.usedBytes)} / {data.quota.quotaMb}MB ({data.quota.usedPercentage.toFixed(
          1
        )}% used)
      </p>
    </div>
  {/if}

  {#if data.files.length === 0}
    <div class="empty-state">
      <p class="empty-message">No images yet</p>
      <p class="empty-subtitle">Upload images to use in your game components</p>
    </div>
  {:else}
    <FileGallery files={data.files} onFileDeleted={handleFileDeleted} />
  {/if}
</div>

<Dialog bind:show={showUploadModal} title="Upload Images" maxWidth="700px">
  <FileUpload projectId={data.project.id} onUploadComplete={handleUploadComplete} />
</Dialog>

<style>
  .tab-content {
    position: relative;
  }

  .tab-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1.5rem;
  }

  .add-button {
    background-color: var(--color-muted-teal);
    color: white;
    border: none;
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .add-button:hover {
    background-color: var(--color-sage);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(120, 160, 131, 0.3);
  }

  .drag-overlay {
    position: absolute;
    inset: 0;
    background: rgba(120, 160, 131, 0.1);
    border: 2px dashed var(--color-sage);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 10;
    border-radius: 8px;
  }

  .drag-overlay p {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    background: white;
    padding: 1rem 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .quota-info {
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    margin-bottom: 1.5rem;
  }

  .quota-info p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-muted-teal);
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-message {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin-bottom: 0.5rem;
  }

  .empty-subtitle {
    font-size: 1rem;
    color: var(--color-muted-teal);
  }
</style>
