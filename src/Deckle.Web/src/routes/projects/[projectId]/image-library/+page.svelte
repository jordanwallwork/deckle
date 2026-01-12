<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { invalidateAll } from '$app/navigation';
  import { filesApi } from '$lib/api';
  import FileUpload from '$lib/components/FileUpload.svelte';
  import FileGallery from '$lib/components/FileGallery.svelte';
  import Dialog from '$lib/components/Dialog.svelte';
  import TagInput from '$lib/components/forms/TagInput.svelte';
  import { TabContent } from '$lib/components';

  let { data }: { data: PageData } = $props();

  // Modal state
  let showUploadModal = $state(false);

  // Page-wide drag-and-drop state
  let isDraggingOverPage = $state(false);

  // Tag filtering state
  let selectedFilterTags = $state<string[]>([]);
  let useAndLogic = $state(false);
  let availableTags = $state<string[]>([]);
  let filterLoading = $state(false);

  // Load available tags on mount
  onMount(async () => {
    try {
      const { tags } = await filesApi.getTags(data.project.id);
      availableTags = tags;
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  });

  // Apply filter by fetching from backend
  async function applyFilter() {
    if (selectedFilterTags.length === 0) {
      // No filters - reload all files
      await invalidateAll();
      return;
    }

    filterLoading = true;
    try {
      data.files = await filesApi.list(
        data.project.id,
        selectedFilterTags,
        useAndLogic
      );
    } catch (err) {
      console.error('Failed to apply filter:', err);
    } finally {
      filterLoading = false;
    }
  }

  // Watch for filter changes and apply them
  $effect(() => {
    // Trigger when selectedFilterTags or useAndLogic changes
    const _ = selectedFilterTags.length;
    const __ = useAndLogic;

    // Apply filter (debounced would be better, but this works)
    applyFilter();
  });

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

  // File updated handler (for tag changes)
  async function handleFileUpdated() {
    // Refresh data from server
    await invalidateAll();

    // Refresh available tags
    try {
      const { tags } = await filesApi.getTags(data.project.id);
      availableTags = tags;
    } catch (err) {
      console.error('Failed to refresh tags:', err);
    }
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

<TabContent>
  {#snippet actions()}
    <button class="add-button" onclick={openUploadModal}>+ Upload Images</button>
  {/snippet}

  <div
    class="drag-drop-wrapper"
    class:dragging-over={isDraggingOverPage}
    ondragover={handlePageDragOver}
    ondragleave={handlePageDragLeave}
    ondrop={handlePageDrop}
  >
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

  {#if availableTags.length > 0}
    <div class="filter-section">
      <div class="filter-header">
        <label for="filter-tags" class="filter-label">Filter by tags</label>
      </div>
      <TagInput bind:value={selectedFilterTags} suggestions={availableTags} />

      {#if selectedFilterTags.length > 0}
        <div class="filter-logic">
          <label class="radio-label">
            <input type="radio" bind:group={useAndLogic} value={false} />
            Match ANY tag (OR)
          </label>
          <label class="radio-label">
            <input type="radio" bind:group={useAndLogic} value={true} />
            Match ALL tags (AND)
          </label>
        </div>
      {/if}
    </div>
  {/if}

  {#if filterLoading}
    <div class="loading-state">
      <p>Loading filtered files...</p>
    </div>
  {:else if data.files.length === 0}
    <div class="empty-state">
      <p class="empty-message">No images yet</p>
      <p class="empty-subtitle">Upload images to use in your game components</p>
    </div>
  {:else}
    <FileGallery files={data.files} onFileDeleted={handleFileDeleted} onFileUpdated={handleFileUpdated} />
    {/if}
  </div>
</TabContent>

<Dialog bind:show={showUploadModal} title="Upload Images" maxWidth="700px">
  <FileUpload projectId={data.project.id} onUploadComplete={handleUploadComplete} />
</Dialog>

<style>
  .drag-drop-wrapper {
    position: relative;
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

  .filter-section {
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .filter-header {
    margin-bottom: 0.75rem;
  }

  .filter-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .filter-logic {
    display: flex;
    gap: 1.5rem;
    margin-top: 0.75rem;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text);
    cursor: pointer;
  }

  .radio-label input[type='radio'] {
    cursor: pointer;
  }

  .loading-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .loading-state p {
    font-size: 1rem;
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
