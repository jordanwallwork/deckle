<script lang="ts">
  import { onMount } from 'svelte';
  import type { MenuItem } from '../types';

  interface Props {
    x: number;
    y: number;
    items: MenuItem[];
    onClose: () => void;
  }

  let { x, y, items, onClose }: Props = $props();

  let menuElement: HTMLDivElement | undefined = $state();
  let activeSubmenu: number | null = $state(null);
  let submenuElement: HTMLDivElement | undefined = $state();

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

    // Close menu on click outside
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

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  });

  function handleItemClick(item: MenuItem) {
    if (item.disabled) return;

    if (item.action) {
      item.action();
      onClose();
    }
  }

  function handleMouseEnter(index: number, item: MenuItem) {
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

    // Position submenu to the right by default, aligned to top of menu item
    let leftValue = '100%';
    let topValue = '0';

    // If submenu would go off-screen to the right, position it to the left
    // Assuming submenu has similar width to menu
    if (menuRect.right + menuRect.width > viewportWidth) {
      leftValue = 'auto';
      return { top: topValue, left: leftValue, right: '100%' };
    }

    return { top: topValue, left: leftValue };
  }
</script>

<div bind:this={menuElement} class="context-menu" style="top: {y}px; left: {x}px;">
  {#each items as item, index}
    {#if item.divider}
      <div class="divider"></div>
    {:else}
      <div
        class="menu-item"
        class:disabled={item.disabled}
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
            bind:this={submenuElement}
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
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 160px;
    padding: 4px;
    z-index: 1000;
    font-size: 14px;
  }

  .menu-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    cursor: pointer;
    border-radius: 4px;
    user-select: none;
    color: #374151;
  }

  .menu-item:hover:not(.disabled) {
    background-color: #f3f4f6;
  }

  .menu-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
    background-color: #e5e7eb;
    margin: 4px 0;
  }

  .submenu {
    position: absolute;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 160px;
    padding: 4px;
    z-index: 1001;
  }
</style>
