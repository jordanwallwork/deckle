<script lang="ts">
  import { FolderIcon } from '$lib/components/icons';
  import type { FileDirectory } from '$lib/types';
  import { buildDirectoryTree } from './batchActions';

  let {
    value = $bindable(),
    directories,
    excludedIds = [],
    disabledId,
    rootLabel = 'Image Library'
  }: {
    /** undefined = nothing picked yet; null = library root */
    value: string | null | undefined;
    directories: FileDirectory[];
    /** Neither these folders nor their descendants are listed */
    excludedIds?: string[];
    /** Listed but not selectable (e.g. the current folder) */
    disabledId?: string | null;
    rootLabel?: string;
  } = $props();

  let options = $derived([
    { id: null, name: rootLabel, depth: 0 },
    ...buildDirectoryTree(directories, excludedIds).map((n) => ({
      id: n.directory.id,
      name: n.directory.name,
      depth: n.depth + 1
    }))
  ]);
</script>

<div class="tree" role="listbox" aria-label="Destination folder">
  {#each options as node (node.id ?? 'root')}
    <button
      type="button"
      role="option"
      class="tree-item"
      class:selected={value === node.id}
      aria-selected={value === node.id}
      disabled={node.id === disabledId}
      style="padding-left: {0.75 + node.depth * 1.25}rem"
      onclick={() => (value = node.id)}
    >
      <FolderIcon size={16} />
      <span>{node.name}</span>
      {#if node.id === disabledId}<span class="hint">(current)</span>{/if}
    </button>
  {/each}
</div>

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
</style>
