<script lang="ts">
  import Panel from "./_components/Panel.svelte";
  import TreeNode from "./_components/TreeNode.svelte";
  import DropTarget from "./_components/DropTarget.svelte";
  import AddElementPopover from "./_components/AddElementPopover.svelte";
  import { templateStore } from "$lib/stores/templateElements";
  import type { EditableComponent } from "$lib/types";

  let { component, part }: { component: EditableComponent; part?: string } = $props();

  let showAddPopover = $state(false);
  let popoverParentId = $state<string | null>(null);
  let popoverPosition = $state({ top: 0, left: 0 });
  let isRootDragOver = $state(false);

  function handleClickOutside(event: MouseEvent) {
    if (showAddPopover) {
      const popover = document.querySelector('.add-popover');
      if (popover && !popover.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        // Don't close if clicking an add button
        if (!target.closest('.btn-add') && !target.closest('.action-button')) {
          showAddPopover = false;
        }
      }
    }
  }

  function updatePopoverPosition(target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    popoverPosition = {
      top: rect.bottom + 4,
      left: rect.right - 180 // popover width
    };
  }

  function handleAddClick(event: MouseEvent, parentId: string | null = null) {
    if (event.currentTarget instanceof HTMLElement) {
      updatePopoverPosition(event.currentTarget);
      popoverParentId = parentId;
      showAddPopover = !showAddPopover;
    }
  }

  function handleRootDragOver(e: DragEvent) {
    if (!e.dataTransfer) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    isRootDragOver = true;
  }

  function handleRootDragLeave() {
    isRootDragOver = false;
  }

  function handleRootDrop(e: DragEvent) {
    if (!e.dataTransfer) return;
    e.preventDefault();
    isRootDragOver = false;

    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId) return;

    templateStore.moveElement(draggedId, 'root');
  }
</script>

<svelte:document onclick={handleClickOutside} />

<Panel title="Structure Tree">
  {#snippet toolbar()}
    <div class="add-button-container">
      <button class="btn-add" onclick={(e) => handleAddClick(e, 'root')} aria-label="Add root element">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Add
      </button>
    </div>
  {/snippet}

  {#snippet children()}
    <div
      class="tree-container"
      class:drag-over={isRootDragOver}
      ondragover={handleRootDragOver}
      ondragleave={handleRootDragLeave}
      ondrop={handleRootDrop}
    >
      <TreeNode
        element={$templateStore.root}
        isRoot={true}
        rootLabel={part ? `${component.name} - ${part}` : component.name}
        depth={0}
        selectedId={$templateStore.selectedElementId}
        onAddClick={handleAddClick}
      />
    </div>
  {/snippet}
</Panel>

<AddElementPopover
  bind:isOpen={showAddPopover}
  parentId={popoverParentId}
  position={popoverPosition}
/>

<style>
  .add-button-container {
    position: relative;
  }

  .btn-add {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #0066cc;
    background: white;
    border: 1px solid #0066cc;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-add:hover {
    background: #f0f7ff;
  }

  .tree-container {
    padding: 0.5rem;
    min-height: 100px;
    transition: background 0.15s ease;
  }

  .tree-container.drag-over {
    background: #d4edda;
    outline: 2px dashed #28a745;
    outline-offset: -4px;
  }
</style>
