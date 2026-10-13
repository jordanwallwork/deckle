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
  import type { ContextMenuItem } from '$lib/components/ContextMenu.svelte';
  import BatchAddTagsDialog from './_components/BatchAddTagsDialog.svelte';
  import BatchRemoveTagsDialog from './_components/BatchRemoveTagsDialog.svelte';
  import MoveToDialog from './_components/MoveToDialog.svelte';
  import DirectoryBreadcrumbs from './_components/DirectoryBreadcrumbs.svelte';
  import {
    mergeTags,
    subtractTags,
    unionTags,
    runBatch,
    type BatchResult
  } from './_components/batchActions';

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
  let pendingDropFiles = $state<globalThis.File[]>([]);

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

  // Batch action state
  let batchDeleteConfirmOpen = $state(false);
  let batchDeleting = $state(false);
  let showBatchAddTags = $state(false);
  let showBatchRemoveTags = $state(false);
  let showMoveTo = $state(false);
  let batchError = $state<string | null>(null);

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

  // Selection broken down for batch actions (tag actions only apply to files)
  let selectedItems = $derived(allItems.filter((item) => selectedIds.has(item.id)));
  let selectedFiles = $derived(files.filter((f) => selectedIds.has(f.id)));
  let selectedFolderIds = $derived(
    selectedItems.filter((item) => item.type === 'folder').map((item) => item.id)
  );

  // Items the move/tag dialogs act on: the selection, or the single row whose menu opened them
  let actionTargetIds = $state<Set<string>>(new Set());
  let actingOnSelection = $state(true);
  let targetItems = $derived(allItems.filter((item) => actionTargetIds.has(item.id)));
  let targetFiles = $derived(files.filter((f) => actionTargetIds.has(f.id)));
  let targetFolderIds = $derived(
    targetItems.filter((item) => item.type === 'folder').map((item) => item.id)
  );
  let targetFileTags = $derived(unionTags(targetFiles.map((f) => f.tags ?? [])));

  function actOnSelection(open: () => void) {
    actionTargetIds = new Set(selectedIds);
    actingOnSelection = true;
    open();
  }

  function actOnItem(id: string, open: () => void) {
    actionTargetIds = new Set([id]);
    actingOnSelection = false;
    open();
  }

  let batchContextMenuItems = $derived<ContextMenuItem[]>([
    { label: 'Move to…', action: () => actOnSelection(() => (showMoveTo = true)) },
    {
      label: 'Add tags…',
      action: () => actOnSelection(() => (showBatchAddTags = true)),
      disabled: selectedFiles.length === 0
    },
    {
      label: 'Remove tags…',
      action: () => actOnSelection(() => (showBatchRemoveTags = true)),
      disabled: selectedFiles.length === 0
    },
    { divider: true },
    {
      label: `Delete ${selectedItems.length} items`,
      action: () => (batchDeleteConfirmOpen = true),
      variant: 'danger'
    }
  ]);

  function folderContextMenuItems(folderId: string): ContextMenuItem[] {
    return [{ label: 'Move to…', action: () => actOnItem(folderId, () => (showMoveTo = true)) }];
  }

  function fileContextMenuItems(file: (typeof files)[number]): ContextMenuItem[] {
    return [
      { label: 'Move to…', action: () => actOnItem(file.id, () => (showMoveTo = true)) },
      { label: 'Add tags…', action: () => actOnItem(file.id, () => (showBatchAddTags = true)) },
      {
        label: 'Remove tags…',
        action: () => actOnItem(file.id, () => (showBatchRemoveTags = true)),
        disabled: (file.tags ?? []).length === 0
      }
    ];
  }

  // Empty GUID string that represents root directory
  const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

  // Current directory ID for API operations (null for root)
  // The API returns Guid.Empty for root, so we need to treat it as null
  let currentDirectoryId = $derived.by(() => {
    const id = data.directoryContents?.id;
    if (!id || id === '' || id === EMPTY_GUID) return null;
    return id;
  });

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
    pendingDropFiles = [];
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
      await directoriesApi.create(data.project.id, {
        name: newFolderName.trim(),
        parentDirectoryId: currentDirectoryId
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

  // Move a single item to a folder
  async function moveSingleItem(
    item: { type: 'file' | 'folder'; id: string },
    targetFolderId: string | null
  ): Promise<{ success: boolean; conflict?: DirectoryMoveConflict }> {
    try {
      if (item.type === 'file') {
        await filesApi.move(item.id, { directoryId: targetFolderId });
      } else {
        await directoriesApi.move(item.id, { parentDirectoryId: targetFolderId });
      }
      return { success: true };
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && item.type === 'folder') {
        return { success: false, conflict: err.response as DirectoryMoveConflict };
      }
      console.error('Failed to move item:', err);
      return { success: false };
    }
  }

  // Move items to a folder (null = root), stopping to prompt for a merge on a folder name conflict
  async function moveItems(
    itemsToMove: Array<{ type: 'file' | 'folder'; id: string }>,
    targetFolderId: string | null,
    clearSelection = true
  ) {
    for (const item of itemsToMove) {
      const result = await moveSingleItem(item, targetFolderId);
      if (!result.success && result.conflict) {
        mergeConflict = result.conflict;
        pendingMergeTarget = targetFolderId;
        mergeConfirmOpen = true;
        // Stop processing remaining items on conflict
        break;
      }
    }

    if (clearSelection) selectedIds = new Set();
    await invalidateAll();
  }

  function draggedItems(dragData: DragItemData) {
    return dragData.items ?? [{ type: dragData.type, id: dragData.id }];
  }

  function handleMoveToFolder(targetFolderId: string, dragData: DragItemData) {
    return moveItems(draggedItems(dragData), targetFolderId);
  }

  function handleMoveToRoot(dragData: DragItemData) {
    return moveItems(draggedItems(dragData), null);
  }

  function handleMoveToParent(dragData: DragItemData) {
    return moveItems(draggedItems(dragData), data.directoryContents?.parentDirectoryId ?? null);
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
      pendingDropFiles = Array.from(event.dataTransfer.files);
      showUploadModal = true;
    }
  }

  // Batch finished: keep the modal open if anything failed so it can be retried
  async function handleUploadComplete({ failed }: { failed: number }) {
    if (failed === 0) {
      showUploadModal = false;
    }
    await invalidateAll();
    await refreshTags();
  }

  async function refreshTags() {
    try {
      const { tags } = await filesApi.getTags(data.project.id);
      availableTags = tags;
    } catch (err) {
      console.error('Failed to refresh tags:', err);
    }
  }

  // File deleted handler
  async function handleFileDeleted() {
    await invalidateAll();
  }

  // File updated handler (for tag changes)
  async function handleFileUpdated() {
    await invalidateAll();
    await refreshTags();
  }

  // Keep only failed items selected so the user can retry, and report the failure count
  async function finishBatch(
    result: BatchResult<{ id: string }>,
    verb: string,
    reselectFailed = true
  ) {
    const total = result.succeeded.length + result.failed.length;
    batchError =
      result.failed.length > 0 ? `${result.failed.length} of ${total} items failed to ${verb}` : null;
    if (reselectFailed) selectedIds = new Set(result.failed.map((item) => item.id));
    await invalidateAll();
    await refreshTags();
  }

  async function handleBatchDelete() {
    batchDeleting = true;
    try {
      // Files first: deleting a folder moves its contents up, so delete selected files before that
      const fileResult = await runBatch(
        selectedItems.filter((item) => item.type === 'file'),
        (item) => filesApi.delete(item.id)
      );
      const folderResult = await runBatch(
        selectedItems.filter((item) => item.type === 'folder'),
        (item) => directoriesApi.delete(item.id)
      );
      batchDeleteConfirmOpen = false;
      await finishBatch(
        {
          succeeded: [...fileResult.succeeded, ...folderResult.succeeded],
          failed: [...fileResult.failed, ...folderResult.failed]
        },
        'delete'
      );
    } finally {
      batchDeleting = false;
    }
  }

  // Apply a tag change to every target file, skipping files it wouldn't change
  async function updateTargetFileTags(change: (tags: string[]) => string[]) {
    const updates = targetFiles
      .map((file) => ({ id: file.id, before: file.tags ?? [], after: change(file.tags ?? []) }))
      .filter((u) => u.after.length !== u.before.length);
    const result = await runBatch(updates, (u) => filesApi.updateTags(u.id, { tags: u.after }));
    await finishBatch(result, 'update', actingOnSelection);
  }

  function handleBatchAddTags(tags: string[]) {
    return updateTargetFileTags((existing) => mergeTags(existing, tags));
  }

  function handleBatchRemoveTags(tags: string[]) {
    return updateTargetFileTags((existing) => subtractTags(existing, tags));
  }

  // Delete key deletes the selection, unless typing or a dialog/lightbox/menu is open
  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key !== 'Delete' || event.defaultPrevented || selectedIds.size === 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (document.querySelector('[role="dialog"], .context-menu')) return;
    event.preventDefault();
    batchDeleteConfirmOpen = true;
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

<svelte:window onkeydown={handleWindowKeydown} />

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

    {#if batchError}
      <div class="batch-error" role="alert">
        <span>{batchError}. The failed items are still selected.</span>
        <button type="button" onclick={() => (batchError = null)} aria-label="Dismiss">
          &times;
        </button>
      </div>
    {/if}

    {#if data.currentPath}
      <DirectoryBreadcrumbs
        {baseUrl}
        path={data.currentPath}
        directories={data.allDirectories}
        onItemDropped={(directoryId, dragData) => moveItems(draggedItems(dragData), directoryId)}
      />
    {/if}

    {#if filterLoading}
      <div class="loading-state">
        <p>Loading filtered files...</p>
      </div>
    {:else if isEmpty && !data.currentPath}
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
            onSelectionChange={(selected, shiftKey) =>
              handleFolderSelectionChange(directory.id, selected, shiftKey)}
            selectedIds={selectedIdsArray}
            {allItems}
            extraContextMenuItems={folderContextMenuItems(directory.id)}
            {batchContextMenuItems}
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
            {allItems}
            {fileContextMenuItems}
            {batchContextMenuItems}
          />
        {/if}
      </div>

      {#if isEmpty}
        <div class="empty-state">
          <p class="empty-message">This folder is empty</p>
          <p class="empty-subtitle">Upload images or drag items here to add them</p>
        </div>
      {/if}
    {/if}
  </div>
</TabContent>

<Dialog bind:show={showUploadModal} title="Upload Images" maxWidth="700px">
  <FileUpload
    projectId={data.project.id}
    directoryId={currentDirectoryId}
    initialFiles={pendingDropFiles}
    onFileUploaded={() => invalidateAll()}
    onComplete={handleUploadComplete}
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
  show={batchDeleteConfirmOpen}
  title="Delete {selectedItems.length} Items"
  message={[
    `Are you sure you want to delete ${selectedFiles.length} ${selectedFiles.length === 1 ? 'image' : 'images'}`,
    selectedFolderIds.length > 0
      ? ` and ${selectedFolderIds.length} ${selectedFolderIds.length === 1 ? 'folder' : 'folders'}? Files inside deleted folders will be moved to the parent folder.`
      : '?',
    ' This action cannot be undone.'
  ].join('')}
  confirmText={batchDeleting ? 'Deleting...' : 'Delete'}
  confirmVariant="danger"
  cancelText="Cancel"
  onconfirm={handleBatchDelete}
  oncancel={() => (batchDeleteConfirmOpen = false)}
/>

<BatchAddTagsDialog
  bind:show={showBatchAddTags}
  fileCount={targetFiles.length}
  suggestions={availableTags}
  onSubmit={handleBatchAddTags}
/>

<BatchRemoveTagsDialog
  bind:show={showBatchRemoveTags}
  fileCount={targetFiles.length}
  existingTags={targetFileTags}
  onSubmit={handleBatchRemoveTags}
/>

<MoveToDialog
  bind:show={showMoveTo}
  projectId={data.project.id}
  directories={data.allDirectories}
  excludedIds={targetFolderIds}
  {currentDirectoryId}
  itemCount={targetItems.length}
  onSubmit={(targetId) => moveItems(targetItems, targetId, actingOnSelection)}
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
    background-color: var(--color-sage-dark);
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
    color: var(--color-accent-fg);
    background: var(--color-surface);
    padding: 1rem 2rem;
    border-radius: 8px;
    box-shadow: var(--shadow-md);
  }

  .quota-info {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0.625rem 1rem;
    background-color: var(--color-bg-subtle);
    border: 1px solid var(--color-border);
    border-radius: 8px;
  }

  .quota-info p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-secondary-fg);
  }

  .filter-section {
    background-color: var(--color-bg-subtle);
    border: 1px solid var(--color-border);
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

  .batch-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.75rem 1rem;
    background-color: var(--color-danger-bg);
    border: 1px solid var(--color-danger);
    border-radius: 8px;
    color: var(--color-danger-fg);
    font-size: 0.875rem;
  }

  .batch-error button {
    border: none;
    background: none;
    color: inherit;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
  }

  .loading-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .loading-state p {
    font-size: 1rem;
    color: var(--color-secondary-fg);
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-message {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-accent-fg);
    margin-bottom: 0.5rem;
  }

  .empty-subtitle {
    font-size: 1rem;
    color: var(--color-secondary-fg);
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
    color: var(--color-danger-fg);
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
    background: var(--color-surface);
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-button:hover {
    background-color: var(--color-bg-subtle);
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
    background-color: var(--color-sage-dark);
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>

