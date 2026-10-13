<script lang="ts">
  import type { FileDirectory } from '$lib/types';
  import type { DragItemData } from '$lib/components/LibraryRow.svelte';
  import { buildBreadcrumbs, type Breadcrumb } from './breadcrumbs';

  let {
    baseUrl,
    path,
    directories,
    onItemDropped
  }: {
    baseUrl: string;
    path: string;
    directories: FileDirectory[];
    onItemDropped?: (directoryId: string | null, data: DragItemData) => void;
  } = $props();

  let crumbs = $derived(buildBreadcrumbs(baseUrl, path, directories));
  let dragOverHref = $state<string | null>(null);

  // Only accept library item drags, and only onto crumbs whose folder could be resolved
  function canDrop(event: DragEvent, crumb: Breadcrumb) {
    return (
      !!onItemDropped &&
      crumb.directoryId !== undefined &&
      (event.dataTransfer?.types.includes('application/json') ?? false)
    );
  }

  function handleDragOver(event: DragEvent, crumb: Breadcrumb) {
    if (!canDrop(event, crumb)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer!.dropEffect = 'move';
    dragOverHref = crumb.href;
  }

  function handleDragLeave(event: DragEvent) {
    event.stopPropagation();
    dragOverHref = null;
  }

  function handleDrop(event: DragEvent, crumb: Breadcrumb) {
    if (!canDrop(event, crumb)) return;
    event.preventDefault();
    event.stopPropagation();
    dragOverHref = null;

    const jsonStr = event.dataTransfer?.getData('application/json');
    if (!jsonStr) return;
    try {
      onItemDropped!(crumb.directoryId ?? null, JSON.parse(jsonStr) as DragItemData);
    } catch {
      // Invalid JSON, ignore
    }
  }
</script>

<nav class="breadcrumbs" aria-label="Folder location">
  <ol>
    {#each crumbs as crumb, i (crumb.href)}
      <li>
        {#if i === crumbs.length - 1}
          <span aria-current="page">{crumb.label}</span>
        {:else}
          <a
            href={crumb.href}
            class:drag-over={dragOverHref === crumb.href}
            ondragover={(e) => handleDragOver(e, crumb)}
            ondragleave={handleDragLeave}
            ondrop={(e) => handleDrop(e, crumb)}>{crumb.label}</a
          >
          <span class="separator" aria-hidden="true">/</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>

<style>
  .breadcrumbs {
    margin-bottom: 1rem;
    font-size: 0.9375rem;
  }

  ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
  }

  a {
    padding: 0.125rem 0.375rem;
    border-radius: var(--radius-sm, 4px);
    color: var(--color-secondary-fg);
    text-decoration: none;
  }

  a:hover {
    color: var(--color-accent-fg);
    text-decoration: underline;
  }

  a.drag-over {
    background-color: rgba(120, 160, 131, 0.15);
    box-shadow: inset 0 0 0 2px var(--color-sage);
    color: var(--color-accent-fg);
  }

  [aria-current='page'] {
    padding: 0.125rem 0.375rem;
    font-weight: 600;
    color: var(--color-text);
    overflow-wrap: anywhere;
  }

  .separator {
    color: var(--color-secondary-fg);
  }
</style>
