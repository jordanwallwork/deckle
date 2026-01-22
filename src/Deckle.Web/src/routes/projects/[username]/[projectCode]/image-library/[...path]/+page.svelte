<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { goto, invalidateAll } from '$app/navigation';
  import { filesApi, directoriesApi, ApiError } from '$lib/api';
  import type { DirectoryMoveConflict } from '$lib/api';
  import FileUpload from '$lib/components/FileUpload.svelte';
  import FileGallery from '$lib/components/FileGallery.svelte';
  import FolderRow from '$lib/components/FolderRow.svelte';
  import ParentDirectoryRow from '$lib/components/ParentDirectoryRow.svelte';
  import Dialog from '$lib/components/Dialog.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import TagInput from '$lib/components/forms/TagInput.svelte';
  import { TabContent } from '$lib/components';
  import type { DragItemData } from '$lib/components/LibraryRow.svelte';

  let { data }: { data: PageData } = $props();

  // Modal state
  let showUploadModal = $state(false);
  let showNewFolderModal = $state(false);
  let newFolderName = $state('');
  let newFolderError = $state<string | null>(null);
  let creatingFolder = $state(false);

  // Delete folder confirmation
  let deleteFolderConfirmOpen = $state(false);
  let folderToDelete = $state<{ id: string; name: string } | null>(null);
  let deletingFolder = $state(false);

  // Merge folder confirmation
  let mergeConfirmOpen = $state(false);
  let mergeConflict = $state<DirectoryMoveConflict | null>(null);
  let pendingMergeTarget = $state<string | null>(null);
  let mergingFolder = $state(false);

  // Page-wide drag-and-drop state
  let isDraggingOverPage = $state(false);

  // Tag filtering state
  let selectedFilterTags = $state<string[]>([]);
  let useAndLogic = $state(false);
  let availableTags = $state<string[]>([]);
  let filterLoading = $state(false);

  // Drag and drop state
  let isRootDropTarget = $state(false);

  // Multi-select state
  let selectedIds = $state<Set<string>>(new Set());
  let lastSelectedId = $state<string | null>(null);

  // Computed values
  let files = $derived(data.directoryContents?.files ?? []);
  let directories = $derived(data.directoryContents?.childDirectories ?? []);
  let isEmpty = $derived(files.length === 0 && directories.length === 0);

  // Combined list of all items in display order (for shift+click selection)
  let allItems = $derived([
    ...directories.map((d) => ({ type: 'folder' as const, id: d.id })),
    ...files.map((f) => ({ type: 'file' as const, id: f.id }))
  ]);

  // Helper to check if an item is selected
  function isItemSelected(id: string): boolean {
    return selectedIds.has(id);
  }

  // Get array of selected IDs for components that need it
  let selectedIdsArray = $derived(Array.from(selectedIds));
  // Current directory ID for API operations (empty string for root)
  let currentDirectoryId = $derived(data.directoryContents?.id || null);

  // Base URL for project and image library
  let projectUrlBase = $derived(`/projects/${data.project.ownerUsername}/${data.project.code}`);
  let baseUrl = $derived(`${projectUrlBase}/image-library`);

  // Load available tags on mount
  onMount(async () => {
    try {
      const { tags } = await filesApi.getTags(data.project.id);
      availableTags = tags;
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  });

  // Clear selection when navigating to a different directory
  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    data.currentPath;
    selectedIds = new Set();
    lastSelectedId = null;
  });

  // Handle selection change for an item
  function handleSelectionChange(itemId: string, selected: boolean, shiftKey: boolean) {
    if (shiftKey && lastSelectedId && lastSelectedId !== itemId) {
      // Shift+click: select range from last selected to current
      const lastIndex = allItems.findIndex((item) => item.id === lastSelectedId);
      const currentIndex = allItems.findIndex((item) => item.id === itemId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        const newSelection = new Set(selectedIds);
        for (let i = start; i <= end; i++) {
          newSelection.add(allItems[i].id);
        }
        selectedIds = newSelection;
      }
    } else {
      // Regular click: toggle single item
      const newSelection = new Set(selectedIds);
      if (selected) {
        newSelection.add(itemId);
      } else {
        newSelection.delete(itemId);
      }
      selectedIds = newSelection;
    }
    lastSelectedId = itemId;
  }

  // Handle folder selection change
  function handleFolderSelectionChange(folderId: string, selected: boolean, shiftKey: boolean) {
    handleSelectionChange(folderId, selected, shiftKey);
  }

  // Handle file selection change
  function handleFileSelectionChange(fileId: string, selected: boolean, shiftKey: boolean) {
    handleSelectionChange(fileId, selected, shiftKey);
  }

  // Navigate to a directory by path
  function navigateToPath(path: string) {
    if (path) {
      goto(`${baseUrl}/${path}`);
    } else {
      goto(baseUrl);
    }
  }

  // Navigate to a folder (append folder name to current path)
  function navigateToFolder(folderName: string) {
    const newPath = data.currentPath ? `${data.currentPath}/${folderName}` : folderName;
    goto(`${baseUrl}/${newPath}`);
  }

  // Navigate to parent directory
  function navigateToParent() {
    if (!data.currentPath) return; // Already at root
    const segments = data.currentPath.split('/').filter(Boolean);
    segments.pop();
    const parentPath = segments.join('/');
    navigateToPath(parentPath);
  }

  // Apply filter by fetching from backend (tag filtering works globally, not per-directory)
  async function applyFilter() {
    if (selectedFilterTags.length === 0) {
      // No filters - reload all
      await invalidateAll();
      return;
    }

    filterLoading = true;
    try {
      // When filtering by tags, get all files in project (not limited to directory)
      const filteredFiles = await filesApi.list(data.project.id, {
        tags: selectedFilterTags,
        matchAll: useAndLogic
      });
      // Update the files in directoryContents temporarily
      if (data.directoryContents) {
        data.directoryContents = {
          ...data.directoryContents,
          files: filteredFiles,
          childDirectories: [] // Hide directories when filtering
        };
      }
    } catch (err) {
      console.error('Failed to apply filter:', err);
    } finally {
      filterLoading = false;
    }
  }

  // Watch for filter changes and apply them
  $effect(() => {
    const _ = selectedFilterTags.length;
    const __ = useAndLogic;
    applyFilter();
  });

  // Button click handler
  function openUploadModal() {
    showUploadModal = true;
  }

  function openNewFolderModal() {
    newFolderName = '';
    newFolderError = null;
    showNewFolderModal = true;
  }

  async function createFolder() {
    if (!newFolderName.trim()) {
      newFolderError = 'Folder name is required';
      return;
    }

    creatingFolder = true;
    newFolderError = null;

    try {
      // Use directoryContents.id for parent (empty string means root, which the API handles as null)
      const parentId = currentDirectoryId && currentDirectoryId !== '' ? currentDirectoryId : null;
      await directoriesApi.create(data.project.id, {
        name: newFolderName.trim(),
        parentDirectoryId: parentId
      });
      showNewFolderModal = false;
      await invalidateAll();
    } catch (err) {
      if (err instanceof ApiError) {
        newFolderError = err.message;
      } else {
        newFolderError = 'Failed to create folder';
      }
    } finally {
      creatingFolder = false;
    }
  }

  async function handleRenameFolder(directoryId: string, newName: string, oldName: string) {
    try {
      await directoriesApi.rename(directoryId, { name: newName });
      // Update the URL if we're inside the renamed folder
      if (data.currentPath?.includes(oldName)) {
        const newPath = data.currentPath.replace(oldName, newName);
        goto(`${baseUrl}/${newPath}`, { replaceState: true });
      } else {
        await invalidateAll();
      }
    } catch (err) {
      console.error('Failed to rename folder:', err);
    }
  }

  function confirmDeleteFolder(directory: { id: string; name: string }) {
    folderToDelete = directory;
    deleteFolderConfirmOpen = true;
  }

  async function handleDeleteFolder() {
    if (!folderToDelete) return;

    deletingFolder = true;
    try {
      await directoriesApi.delete(folderToDelete.id);
      deleteFolderConfirmOpen = false;
      folderToDelete = null;
      await invalidateAll();
    } catch (err) {
      console.error('Failed to delete folder:', err);
    } finally {
      deletingFolder = false;
    }
  }

  // Move item to a folder
  async function handleMoveToFolder(targetFolderId: string, dragData: DragItemData) {
    try {
      if (dragData.type === 'file') {
        await filesApi.move(dragData.id, { directoryId: targetFolderId });
      } else {
        await directoriesApi.move(dragData.id, { parentDirectoryId: targetFolderId });
      }
      await invalidateAll();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && dragData.type === 'folder') {
        // Conflict - directory with same name exists, prompt for merge
        mergeConflict = err.response as DirectoryMoveConflict;
        pendingMergeTarget = targetFolderId;
        mergeConfirmOpen = true;
      } else {
        console.error('Failed to move item:', err);
      }
    }
  }

  // Move item to root (null directory)
  async function handleMoveToRoot(dragData: DragItemData) {
    try {
      if (dragData.type === 'file') {
        await filesApi.move(dragData.id, { directoryId: null });
      } else {
        await directoriesApi.move(dragData.id, { parentDirectoryId: null });
      }
      await invalidateAll();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && dragData.type === 'folder') {
        // Conflict - directory with same name exists at root, prompt for merge
        mergeConflict = err.response as DirectoryMoveConflict;
        pendingMergeTarget = null;
        mergeConfirmOpen = true;
      } else {
        console.error('Failed to move item to root:', err);
      }
    }
  }

  // Move item to parent directory
  async function handleMoveToParent(dragData: DragItemData) {
    const parentId = data.directoryContents?.parentDirectoryId ?? null;
    try {
      if (dragData.type === 'file') {
        await filesApi.move(dragData.id, { directoryId: parentId });
      } else {
        await directoriesApi.move(dragData.id, { parentDirectoryId: parentId });
      }
      await invalidateAll();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && dragData.type === 'folder') {
        // Conflict - directory with same name exists in parent, prompt for merge
        mergeConflict = err.response as DirectoryMoveConflict;
        pendingMergeTarget = parentId;
        mergeConfirmOpen = true;
      } else {
        console.error('Failed to move item to parent:', err);
      }
    }
  }

  // Handle merge confirmation
  async function handleMergeConfirm() {
    if (!mergeConflict) return;

    mergingFolder = true;
    try {
      await directoriesApi.move(mergeConflict.sourceDirectoryId, {
        parentDirectoryId: pendingMergeTarget,
        merge: true
      });
      mergeConfirmOpen = false;
      mergeConflict = null;
      pendingMergeTarget = null;
      await invalidateAll();
    } catch (err) {
      console.error('Failed to merge folders:', err);
    } finally {
      mergingFolder = false;
    }
  }

  // Handle merge cancellation
  function handleMergeCancel() {
    mergeConfirmOpen = false;
    mergeConflict = null;
    pendingMergeTarget = null;
  }

  // Root drop zone handlers
  function handleRootDragOver(event: DragEvent) {
    if (!event.dataTransfer?.types.includes('application/json')) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    isRootDropTarget = true;
  }

  function handleRootDragLeave(event: DragEvent) {
    event.stopPropagation();
    isRootDropTarget = false;
  }

  function handleRootDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    isRootDropTarget = false;

    const jsonStr = event.dataTransfer?.getData('application/json');
    if (!jsonStr) return;

    try {
      const dragData = JSON.parse(jsonStr) as DragItemData;
      handleMoveToRoot(dragData);
    } catch {
      // Invalid JSON, ignore
    }
  }

  // Page-wide drag-and-drop handlers
  function handlePageDragOver(event: DragEvent) {
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
      showUploadModal = true;
    }
  }

  // Upload complete handler
  async function handleUploadComplete() {
    await invalidateAll();
    showUploadModal = false;
  }

  // File deleted handler
  async function handleFileDeleted() {
    await invalidateAll();
  }

  // File updated handler (for tag changes)
  async function handleFileUpdated() {
    await invalidateAll();
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
  <title>Image Library - {data.project.name} - Deckle</title>
  <meta
    name="description"
    content="Manage images and artwork for {data.project
      .name}. Upload and organize visual assets to use in your game components."
  />
</svelte:head>

<TabContent>
  {#snippet actions()}
    <div class="action-buttons">
      <button class="icon-button" onclick={openUploadModal} title="Upload Images">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
      </button>
      <button class="icon-button" onclick={openNewFolderModal} title="New Folder">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          />
        </svg>
      </button>
    </div>
    {#if data.quota}
      <div class="quota-info">
        <p>
          Storage: {formatBytes(data.quota.usedBytes)} / {data.quota.quotaMb}MB ({data.quota.usedPercentage.toFixed(
            1
          )}% used)
        </p>
      </div>
    {/if}
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

    <!-- Breadcrumbs -->
    <nav class="breadcrumbs">
      {#each data.breadcrumbs as crumb, index}
        {#if index > 0}
          <span class="breadcrumb-separator">/</span>
        {/if}
        {#if index === data.breadcrumbs.length - 1}
          <span class="breadcrumb-current">{crumb.name}</span>
        {:else if crumb.path === ''}
          <!-- Root breadcrumb is a drop target -->
          <button
            class="breadcrumb-link breadcrumb-drop-target"
            class:drag-over={isRootDropTarget}
            onclick={() => navigateToPath(crumb.path)}
            ondragover={handleRootDragOver}
            ondragleave={handleRootDragLeave}
            ondrop={handleRootDrop}
            type="button"
          >
            {crumb.name}
          </button>
        {:else}
          <button class="breadcrumb-link" onclick={() => navigateToPath(crumb.path)} type="button">
            {crumb.name}
          </button>
        {/if}
      {/each}
    </nav>

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
    {:else if isEmpty}
      <div class="empty-state">
        <p class="empty-message">No images yet</p>
        <p class="empty-subtitle">Upload images to use in your game components</p>
      </div>
    {:else}
      <div class="content-list">
        <!-- Parent directory navigation when in a subfolder -->
        {#if data.currentPath}
          <ParentDirectoryRow
            parentDirectoryId={data.directoryContents?.parentDirectoryId ?? null}
            onclick={navigateToParent}
            onItemDropped={handleMoveToParent}
          />
        {/if}

        <!-- Directories first -->
        {#each directories as directory (directory.id)}
          <FolderRow
            {directory}
            itemCount={data.allDirectories.filter((d) => d.parentDirectoryId === directory.id)
              .length}
            onclick={() => navigateToFolder(directory.name)}
            onrename={(name) => handleRenameFolder(directory.id, name, directory.name)}
            ondelete={() => confirmDeleteFolder(directory)}
            onItemDropped={(dragData) => handleMoveToFolder(directory.id, dragData)}
            selectable={true}
            isSelected={isItemSelected(directory.id)}
            onSelectionChange={(selected, shiftKey) => handleFolderSelectionChange(directory.id, selected, shiftKey)}
          />
        {/each}

        <!-- Then files -->
        {#if files.length > 0}
          <FileGallery
            {files}
            onFileDeleted={handleFileDeleted}
            onFileUpdated={handleFileUpdated}
            selectable={true}
            selectedIds={selectedIdsArray}
            onSelectionChange={handleFileSelectionChange}
          />
        {/if}
      </div>
    {/if}
  </div>
</TabContent>

<Dialog bind:show={showUploadModal} title="Upload Images" maxWidth="700px">
  <FileUpload
    projectId={data.project.id}
    directoryId={currentDirectoryId && currentDirectoryId !== '' ? currentDirectoryId : null}
    onUploadComplete={handleUploadComplete}
  />
</Dialog>

<Dialog bind:show={showNewFolderModal} title="New Folder" maxWidth="400px">
  <form
    onsubmit={(e) => {
      e.preventDefault();
      createFolder();
    }}
    class="new-folder-form"
  >
    <div class="form-group">
      <label for="folder-name">Folder name</label>
      <input
        id="folder-name"
        type="text"
        bind:value={newFolderName}
        placeholder="Enter folder name"
        class:error={newFolderError}
      />
      {#if newFolderError}
        <p class="error-message">{newFolderError}</p>
      {/if}
    </div>
    <div class="form-actions">
      <button type="button" class="cancel-button" onclick={() => (showNewFolderModal = false)}>
        Cancel
      </button>
      <button type="submit" class="submit-button" disabled={creatingFolder}>
        {creatingFolder ? 'Creating...' : 'Create Folder'}
      </button>
    </div>
  </form>
</Dialog>

<ConfirmDialog
  show={deleteFolderConfirmOpen}
  title="Delete Folder"
  message="Are you sure you want to delete '{folderToDelete?.name}'? Files inside will be moved to the parent folder."
  confirmText={deletingFolder ? 'Deleting...' : 'Delete'}
  cancelText="Cancel"
  onconfirm={handleDeleteFolder}
  oncancel={() => {
    deleteFolderConfirmOpen = false;
    folderToDelete = null;
  }}
/>

<ConfirmDialog
  show={mergeConfirmOpen}
  title="Merge Folders"
  message={mergeConflict?.message ?? ''}
  confirmText={mergingFolder ? 'Merging...' : 'Merge'}
  cancelText="Cancel"
  onconfirm={handleMergeConfirm}
  oncancel={handleMergeCancel}
/>

<style>
  .drag-drop-wrapper {
    position: relative;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .icon-button {
    width: 40px;
    height: 40px;
    background-color: var(--color-muted-teal);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .icon-button:hover {
    background-color: var(--color-sage);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(120, 160, 131, 0.3);
  }

  .icon-button svg {
    width: 20px;
    height: 20px;
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
    flex: 1;
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
  }

  .quota-info p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-muted-teal);
  }

  /* Breadcrumbs */
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .breadcrumb-link {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.875rem;
    color: var(--color-sage);
    cursor: pointer;
    text-decoration: none;
  }

  .breadcrumb-link:hover {
    text-decoration: underline;
  }

  .breadcrumb-drop-target {
    padding: 0.25rem 0.5rem;
    margin: -0.25rem -0.5rem;
    border-radius: var(--radius-sm);
    transition: all 0.15s ease;
  }

  .breadcrumb-drop-target.drag-over {
    background-color: rgba(120, 160, 131, 0.2);
    box-shadow: inset 0 0 0 2px var(--color-sage);
  }

  .breadcrumb-separator {
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }

  .breadcrumb-current {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
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

  .content-list {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--color-border);
  }

  /* New folder form */
  .new-folder-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .form-group input {
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    font-size: 0.9375rem;
    transition: border-color 0.2s ease;
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--color-sage);
    box-shadow: 0 0 0 2px rgba(120, 160, 131, 0.2);
  }

  .form-group input.error {
    border-color: var(--color-danger);
  }

  .error-message {
    font-size: 0.8125rem;
    color: var(--color-danger);
    margin: 0;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .cancel-button {
    padding: 0.625rem 1.25rem;
    border: 1px solid var(--color-border);
    background: white;
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-button:hover {
    background-color: #f8f9fa;
  }

  .submit-button {
    padding: 0.625rem 1.25rem;
    border: none;
    background-color: var(--color-muted-teal);
    color: white;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .submit-button:hover:not(:disabled) {
    background-color: var(--color-sage);
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
