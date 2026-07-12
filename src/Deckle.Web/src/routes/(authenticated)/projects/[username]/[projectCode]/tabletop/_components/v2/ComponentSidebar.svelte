<script lang="ts">
  import type { GameComponent } from '$lib/types';
  import { getTabletopApi } from '$lib/tabletop/v2';
  import SidebarComponentItem from './SidebarComponentItem.svelte';
  import SidebarHeader from './SidebarHeader.svelte';

  let {
    components,
    collapsed = $bindable(false),
    el = $bindable(null),
    removeTarget = false
  }: {
    components: GameComponent[];
    collapsed?: boolean;
    /** The sidebar's root element, exposed for the shell's drag hit-testing. */
    el?: HTMLElement | null;
    /** True while a pile drag hovers here — shows the removal indicator. */
    removeTarget?: boolean;
  } = $props();

  const { store } = getTabletopApi();

  // How many cards of each template are currently on the table.
  const placedCountByTemplate = $derived(
    Object.values(store.state.cards).reduce(
      (acc, c) => {
        acc[c.templateId] = (acc[c.templateId] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  );
</script>

<aside bind:this={el} class="sidebar" class:collapsed class:remove-target={removeTarget}>
  <SidebarHeader bind:collapsed />

  <div class="sidebar-list">
    {#each components as component (component.id)}
      <SidebarComponentItem
        {component}
        {collapsed}
        placedCount={placedCountByTemplate[component.id] ?? 0}
      />
    {/each}

    {#if components.length === 0 && !collapsed}
      <div class="sidebar-empty">No components in this project.</div>
    {/if}
  </div>

  {#if !collapsed}
    <div class="sidebar-hint">Drag onto the tabletop to add · drop back here to remove</div>
  {/if}
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: 240px;
    background: #1e2030;
    border-right: 1px solid #3a3d4e;
    color: #c8cad8;
    flex-shrink: 0;
    transition: width 0.15s ease;
    overflow: hidden;
  }

  .sidebar.collapsed {
    width: 44px;
  }

  .sidebar.remove-target {
    background: #2d1b1b;
    box-shadow: inset 0 0 0 2px #ef4444;
  }

  .sidebar-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.375rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .sidebar-empty {
    padding: 0.75rem;
    font-size: 0.75rem;
    color: #8b8ea0;
    text-align: center;
    font-style: italic;
  }

  .sidebar-hint {
    padding: 0.5rem 0.75rem;
    border-top: 1px solid #2a2d3e;
    font-size: 0.6875rem;
    color: #6b7086;
    line-height: 1.35;
  }
</style>
