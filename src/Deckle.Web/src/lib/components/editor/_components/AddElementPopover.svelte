<script lang="ts">
  import { templateStore } from '$lib/stores/templateElements';
  import { createElementOfType } from '../elementFactory';
  import type { ElementType } from '../types';

  let {
    isOpen = $bindable(false),
    parentId,
    position
  }: {
    isOpen: boolean;
    parentId: string | null;
    position: { top: number; left: number };
  } = $props();

  function addElement(type: ElementType) {
    // Use the shared factory so every creation path produces the same
    // unset-first elements (ADR-0001 D4) with the normalized schema (D3).
    templateStore.addElement(createElementOfType(type), parentId);
    isOpen = false;
  }

  const isRootLevel = $derived(!parentId || parentId === 'root');

  const parentElement = $derived(
    parentId && parentId !== 'root' ? templateStore.getElement(parentId) : null
  );
  const isParentContainer = $derived(
    parentElement?.type === 'container' || parentElement?.type === 'shape' || parentElement?.type === 'grid'
  );
</script>

{#if isOpen}
  <div class="add-popover" style="top: {position.top}px; left: {position.left}px;">
    <div class="popover-header">
      Add Element
      {#if isRootLevel}
        <span class="parent-note">(position: absolute)</span>
      {:else}
        <span class="parent-note">(to container)</span>
      {/if}
    </div>
    <button class="popover-item" onclick={() => addElement('container')}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect
          x="2"
          y="2"
          width="12"
          height="12"
          stroke="currentColor"
          stroke-width="1.5"
          fill="none"
        />
      </svg>
      Container
    </button>
    <button class="popover-item" onclick={() => addElement('text')}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M4 3H12M8 3V13M6 13H10"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
      Text
    </button>
    <button class="popover-item" onclick={() => addElement('image')}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect
          x="2"
          y="2"
          width="12"
          height="12"
          stroke="currentColor"
          stroke-width="1.5"
          fill="none"
        />
        <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor" />
        <path d="M2 11L5 8L8 11L11 8L14 11" stroke="currentColor" stroke-width="1.5" fill="none" />
      </svg>
      Image
    </button>
    <button class="popover-item" onclick={() => addElement('shape')}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 2L13 5V11L8 14L3 11V5L8 2Z"
          stroke="currentColor"
          stroke-width="1.5"
          fill="none"
        />
      </svg>
      Shape
    </button>
    <button class="popover-item" onclick={() => addElement('grid')}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" stroke="currentColor" stroke-width="1.5" fill="none" />
        <rect x="9" y="1" width="6" height="6" stroke="currentColor" stroke-width="1.5" fill="none" />
        <rect x="1" y="9" width="6" height="6" stroke="currentColor" stroke-width="1.5" fill="none" />
        <rect x="9" y="9" width="6" height="6" stroke="currentColor" stroke-width="1.5" fill="none" />
      </svg>
      Grid
    </button>
    {#if isParentContainer}
      <button class="popover-item" onclick={() => addElement('iterator')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 4h8M4 8h8M4 12h8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <circle cx="2" cy="4" r="1" fill="currentColor" />
          <circle cx="2" cy="8" r="1" fill="currentColor" />
          <circle cx="2" cy="12" r="1" fill="currentColor" />
        </svg>
        Iterator
      </button>
    {/if}
  </div>
{/if}

<style>
  .add-popover {
    position: fixed;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    box-shadow: var(--shadow-md);
    min-width: 180px;
    z-index: 1000;
    overflow: hidden;
  }

  .popover-header {
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-subtle);
  }

  .parent-note {
    font-weight: 400;
    color: var(--color-text-secondary);
    font-size: 0.7rem;
  }

  .popover-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.813rem;
    color: var(--color-text-primary);
    background: var(--color-surface);
    border: none;
    cursor: pointer;
    transition: background 0.15s ease;
    text-align: left;
  }

  .popover-item:hover {
    background: var(--color-bg-subtle);
  }
</style>
