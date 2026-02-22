<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    onLabelClick?: () => void;
    children: Snippet<[() => void]>;
  }

  let { label, onLabelClick, children }: Props = $props();

  let isOpen = $state(false);
  let containerRef = $state<HTMLDivElement | null>(null);
  let popoverRef = $state<HTMLDivElement | null>(null);

  function closeDropdown() {
    popoverRef?.hidePopover();
  }

  function toggleDropdown() {
    if (!popoverRef || !containerRef) return;

    if (isOpen) {
      popoverRef.hidePopover();
      return;
    }

    const rect = containerRef.getBoundingClientRect();

    // Position off-screen first so we can measure actual size before revealing
    popoverRef.style.left = '-9999px';
    popoverRef.style.top = '-9999px';
    popoverRef.showPopover();

    const popoverRect = popoverRef.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;

    const top =
      spaceBelow >= popoverRect.height
        ? rect.bottom + 4
        : rect.top - popoverRect.height - 4;

    popoverRef.style.left = `${rect.left}px`;
    popoverRef.style.top = `${top}px`;
  }

  function handlePopoverToggle(event: Event) {
    isOpen = (event as ToggleEvent).newState === 'open';
  }
</script>

<div class="toolbar-dropdown-button" bind:this={containerRef}>
  {#if onLabelClick}
    <div class="button-group">
      <button class="main-button" onclick={onLabelClick}>
        {label}
      </button>
      <button
        class="caret-trigger"
        class:open={isOpen}
        onclick={toggleDropdown}
        title="More options"
        aria-label="More options"
      >
        <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor" class="caret" class:open={isOpen}>
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            stroke-width="1.5"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  {:else}
    <button
      class="unified-button"
      class:open={isOpen}
      onclick={toggleDropdown}
    >
      {label}
      <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor" class="caret" class:open={isOpen}>
        <path
          d="M1 1l4 4 4-4"
          stroke="currentColor"
          stroke-width="1.5"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  {/if}
</div>

<div
  bind:this={popoverRef}
  popover="auto"
  ontoggle={handlePopoverToggle}
  class="dropdown-panel"
>
  {@render children(closeDropdown)}
</div>

<style>
  .toolbar-dropdown-button {
    display: flex;
    align-items: center;
  }

  /* Unified button: clicking anywhere opens the dropdown */
  .unified-button {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    color: #374151;
  }

  .unified-button:hover,
  .unified-button.open {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  /* Split button: main label has its own action, caret opens dropdown */
  .button-group {
    display: flex;
    align-items: stretch;
  }

  .main-button {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid #d1d5db;
    border-right: none;
    background: white;
    border-radius: 4px 0 0 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    color: #374151;
  }

  .main-button:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .caret-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 0.5rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
    transition: all 0.15s ease;
    color: #6b7280;
  }

  .caret-trigger:hover,
  .caret-trigger.open {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .caret {
    transition: transform 0.15s ease;
    flex-shrink: 0;
  }

  .caret.open {
    transform: rotate(180deg);
  }

  /* Dropdown panel */
  .dropdown-panel {
    position: fixed;
    margin: 0;
    padding: 0.75rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.1),
      0 2px 4px -2px rgb(0 0 0 / 0.1);
    min-width: 140px;
  }

  .dropdown-panel:popover-open {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
</style>
