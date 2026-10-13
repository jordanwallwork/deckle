<script lang="ts">
  import Dialog from '$lib/components/Dialog.svelte';
  import Button from '$lib/components/Button.svelte';
  import { FolderIcon } from '$lib/components/icons';
  import { directoriesApi, ApiError } from '$lib/api';
  import type { FileDirectory } from '$lib/types';
  import { buildDirectoryTree } from './batchActions';

  let {
    show = $bindable(),
    projectId,
    directories,
    excludedIds = [],
    currentDirectoryId,
    itemCount,
    onSubmit
  }: {
    show: boolean;
    projectId: string;
    directories: FileDirectory[];
    /** Selected folders: neither they nor their descendants can be a target */
    excludedIds?: string[];
    currentDirectoryId: string | null;
    itemCount: number;
    onSubmit: (targetDirectoryId: string | null) => Promise<void>;
  } = $props();

  // Folders created from this dialog, shown before the page data reloads
  let createdDirectories = $state<FileDirectory[]>([]);
  // undefined = nothing picked yet; null = library root
  let target = $state<string | null | undefined>(undefined);
  let newFolderName = $state<string | null>(null);
  let error = $state<string | null>(null);
  let busy = $state(false);

  let options = $derived([
    { id: null, name: 'Image Library', depth: 0 },
    ...buildDirectoryTree([...directories, ...createdDirectories], excludedIds).map((n) => ({
      id: n.directory.id,
      name: n.directory.name,
      depth: n.depth + 1
    }))
  ]);

  $effect(() => {
    if (show) {
      createdDirectories = [];
      target = undefined;
      newFolderName = null;
      error = null;
    }
  });

  async function createFolder() {
    const name = newFolderName?.trim();
    if (!name) return;
    busy = true;
    error = null;
    try {
      const created = await directoriesApi.create(projectId, { name, parentDirectoryId: target ?? null });
      createdDirectories = [...createdDirectories, created];
      target = created.id;
      newFolderName = null;
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Failed to create folder';
    } finally {
      busy = false;
    }
  }

  async function submit() {
    if (target === undefined) return;
    busy = true;
    try {
      await onSubmit(target);
      show = false;
    } finally {
      busy = false;
    }
  }
</script>

<Dialog bind:show title="Move {itemCount} {itemCount === 1 ? 'item' : 'items'} to…" maxWidth="480px">
  <div class="tree" role="listbox" aria-label="Destination folder">
    {#each options as node (node.id ?? 'root')}
      <button
        type="button"
        role="option"
        class="tree-item"
        class:selected={target === node.id}
        aria-selected={target === node.id}
        disabled={node.id === currentDirectoryId}
        style="padding-left: {0.75 + node.depth * 1.25}rem"
        onclick={() => (target = node.id)}
      >
        <FolderIcon size={16} />
        <span>{node.name}</span>
        {#if node.id === currentDirectoryId}<span class="hint">(current)</span>{/if}
      </button>
    {/each}
  </div>

  {#if newFolderName !== null}
    <form class="new-folder" onsubmit={(e) => { e.preventDefault(); createFolder(); }}>
      <!-- svelte-ignore a11y_autofocus -->
      <input type="text" bind:value={newFolderName} placeholder="New folder name" autofocus />
      <Button size="sm" type="submit" disabled={!newFolderName.trim() || busy}>Create</Button>
      <Button size="sm" variant="secondary" onclick={() => (newFolderName = null)}>Cancel</Button>
    </form>
  {/if}
  {#if error}<p class="error">{error}</p>{/if}

  {#snippet actions()}
    {#if newFolderName === null}
      <Button variant="text" onclick={() => (newFolderName = '')} class="new-folder-button">
        New folder
      </Button>
    {/if}
    <Button variant="secondary" onclick={() => (show = false)}>Cancel</Button>
    <Button onclick={submit} disabled={target === undefined || target === currentDirectoryId || busy}>
      Move here
    </Button>
  {/snippet}
</Dialog>

<style>
  .tree {
    display: flex;
    flex-direction: column;
    max-height: 320px;
    overflow-y: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.25rem;
  }

  .tree-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--color-text);
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;
  }

  .tree-item:hover:not(:disabled) {
    background-color: var(--color-bg-subtle);
  }

  .tree-item.selected {
    background-color: rgba(120, 160, 131, 0.18);
    color: var(--color-accent-fg);
  }

  .tree-item:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .hint {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .new-folder {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .new-folder input {
    flex: 1;
    padding: 0.375rem 0.625rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
  }

  .error {
    margin: 0.5rem 0 0;
    font-size: 0.8125rem;
    color: var(--color-danger-fg);
  }

  :global(.new-folder-button) {
    margin-right: auto;
  }
</style>
