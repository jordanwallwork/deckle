<script lang="ts">
  import { onMount } from 'svelte';

  let {
    items,
    onselect,
    onclose
  }: {
    items: { label: string; value: string; description?: string }[];
    onselect: (value: string) => void;
    onclose: () => void;
  } = $props();

  let selectedIndex = $state(-1);
  let dropdownRef: HTMLDivElement | null = null;

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onclose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      scrollToSelected();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      scrollToSelected();
    } else if (event.key === 'Enter' && selectedIndex >= 0) {
      event.preventDefault();
      onselect(items[selectedIndex].value);
      onclose();
    }
  }

  function scrollToSelected() {
    if (!dropdownRef) return;
    const selected = dropdownRef.querySelector('.selected');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      onclose();
    }
  }

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="insert-dropdown" bind:this={dropdownRef}>
  {#each items as item, i}
    <button
      type="button"
      class="dropdown-item"
      class:selected={i === selectedIndex}
      onclick={() => { onselect(item.value); onclose(); }}
      onmouseenter={() => selectedIndex = i}
    >
      <span class="item-label">{item.label}</span>
      {#if item.description}
        <span class="item-description">{item.description}</span>
      {/if}
    </button>
  {/each}
  {#if items.length === 0}
    <div class="empty">No items available</div>
  {/if}
</div>

<style>
  .insert-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.25rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    max-height: 200px;
    min-width: 200px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .dropdown-item {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0.375rem 0.625rem;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    font-size: 0.813rem;
    transition: background-color 0.1s;
    gap: 0.125rem;
  }

  .dropdown-item:hover,
  .dropdown-item.selected {
    background-color: #f3f4f6;
  }

  .item-label {
    color: #1a1a1a;
    font-weight: 500;
  }

  .item-description {
    color: #9ca3af;
    font-size: 0.6875rem;
  }

  .empty {
    padding: 0.75rem;
    color: #9ca3af;
    font-size: 0.813rem;
    text-align: center;
  }
</style>
