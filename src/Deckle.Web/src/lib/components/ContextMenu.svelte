<script lang="ts" module>
  export interface ContextMenuItem {
    label?: string;
    action?: () => void;
    disabled?: boolean;
    variant?: 'default' | 'danger';
    divider?: boolean;
    submenu?: ContextMenuItem[];
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
  }

  let { x, y, items, onClose }: Props = $props();

  let menuElement: HTMLDivElement | undefined = $state();
  let activeSubmenu: number | null = $state(null);

  onMount(() => {
    // Adjust position if menu would go off-screen
    if (menuElement) {
      const rect = menuElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        x = viewportWidth - rect.width - 10;
      }
      if (rect.bottom > viewportHeight) {
        y = viewportHeight - rect.height - 10;
      }
    }

    // Close menu on click or right-click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (menuElement && !menuElement.contains(e.target as Node)) {
        onClose();
      }
    };

    // Close menu on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Use capture phase to close before other handlers
    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('contextmenu', handleClickOutside, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('contextmenu', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  });

  function handleItemClick(item: ContextMenuItem) {
    if (item.disabled || item.submenu) return;
    if (item.action) {
      item.action();
      onClose();
    }
  }

  function handleMouseEnter(index: number, item: ContextMenuItem) {
    if (item.submenu) {
      activeSubmenu = index;
    } else {
      activeSubmenu = null;
    }
  }

  function getSubmenuPosition() {
    if (!menuElement) return { top: '0', left: '100%' };

    const menuRect = menuElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // If submenu would go off-screen to the right, position it to the left
    if (menuRect.right + menuRect.width > viewportWidth) {
      return { top: '0', left: 'auto', right: '100%' };
    }

    return { top: '0', left: '100%' };
  }
</script>

<div bind:this={menuElement} class="context-menu" style="top: {y}px; left: {x}px;" role="menu">
  {#each items as item, index}
    {#if item.divider}
      <div class="divider"></div>
    {:else}
      <div
        class="menu-item"
        class:disabled={item.disabled}
        class:danger={item.variant === 'danger'}
        class:has-submenu={item.submenu}
        onclick={() => handleItemClick(item)}
        onmouseenter={() => handleMouseEnter(index, item)}
        role="menuitem"
        tabindex={item.disabled ? -1 : 0}
      >
        <span>{item.label}</span>
        {#if item.submenu}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M4 2L8 6L4 10"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {/if}

        {#if activeSubmenu === index && item.submenu}
          {@const pos = getSubmenuPosition()}
          <div
            class="submenu"
            style="top: {pos.top}; left: {pos.left}; {pos.right ? `right: ${pos.right};` : ''}"
          >
            {#each item.submenu as subitem}
              {#if subitem.divider}
                <div class="divider"></div>
              {:else}
                <div
                  class="menu-item"
                  class:disabled={subitem.disabled}
                  class:danger={subitem.variant === 'danger'}
                  onclick={(e) => {
                    e.stopPropagation();
                    handleItemClick(subitem);
                  }}
                  role="menuitem"
                  tabindex={subitem.disabled ? -1 : 0}
                >
                  <span>{subitem.label}</span>
                </div>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/each}
</div>

<style>
  .context-menu {
    position: fixed;
    background: var(--color-surface);
    border: 1px solid var(--color-border, #d1d5db);
    border-radius: var(--radius-md, 6px);
    box-shadow: var(--shadow-lg);
    min-width: 140px;
    padding: 4px;
    z-index: 1000;
    font-size: 14px;
  }

  .menu-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: var(--radius-sm, 4px);
    user-select: none;
    color: var(--color-text, #374151);
  }

  .menu-item:hover:not(.disabled) {
    background-color: var(--color-bg-subtle);
  }

  .menu-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .menu-item.danger {
    color: var(--color-danger-fg);
  }

  .menu-item.danger:hover:not(.disabled) {
    background-color: var(--color-danger-bg);
  }

  .menu-item.has-submenu {
    padding-right: 8px;
  }

  .menu-item svg {
    margin-left: 8px;
    flex-shrink: 0;
  }

  .divider {
    height: 1px;
    background-color: var(--color-border, #e5e7eb);
    margin: 4px 0;
  }

  .submenu {
    position: absolute;
    background: var(--color-surface);
    border: 1px solid var(--color-border, #d1d5db);
    border-radius: var(--radius-md, 6px);
    box-shadow: var(--shadow-lg);
    min-width: 140px;
    padding: 4px;
    z-index: 1001;
  }
</style>
