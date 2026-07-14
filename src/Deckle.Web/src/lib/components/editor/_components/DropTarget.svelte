<script lang="ts">
  import { templateStore } from '$lib/stores/templateElements';

  let {
    parentId,
    insertIndex,
    depth = 0
  }: {
    parentId: string | null;
    insertIndex: number;
    depth?: number;
  } = $props();

  let isDragOver = $state(false);

  function handleDragOver(e: DragEvent) {
    if (!e.dataTransfer) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    isDragOver = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.stopPropagation();
    isDragOver = false;
  }

  function handleDrop(e: DragEvent) {
    if (!e.dataTransfer) return;
    e.preventDefault();
    e.stopPropagation();

    isDragOver = false;

    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId) return;

    // Move element to this position
    const targetParentId = parentId === null ? 'root' : parentId;
    templateStore.moveElement(draggedId, targetParentId, insertIndex);
  }
</script>

<div
  class="drop-target"
  class:drag-over={isDragOver}
  style="--depth: {depth}"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
></div>

<style>
  .drop-target {
    --indent: calc(var(--depth) * 1rem);
    height: 0.25rem;
    margin: 0.125rem 0;
    margin-left: calc(0.5rem + var(--indent));
    margin-right: 0.5rem;
    border-radius: 2px;
    transition: all 0.15s ease;
    opacity: 0;
  }

  .drop-target:hover,
  .drop-target.drag-over {
    opacity: 1;
    height: 0.5rem;
    margin: 0.25rem 0;
  }

  .drop-target:hover {
    background: var(--color-bg-subtle);
  }

  .drop-target.drag-over {
    background: var(--color-success);
    box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.2);
  }
</style>
