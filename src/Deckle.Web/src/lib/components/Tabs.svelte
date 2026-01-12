<script lang="ts">
  import { page } from '$app/stores';

  interface Tab {
    name: string;
    path: string;
  }

  interface Props {
    tabs: Tab[];
  }

  let { tabs }: Props = $props();

  function isActiveTab(tabPath: string): boolean {
    return $page.url.pathname === tabPath;
  }
</script>

<div class="tabs-bar">
  <div class="tabs-content">
    {#each tabs as tab}
      <a href={tab.path} class="tab-link" class:active={isActiveTab(tab.path)}>
        {tab.name}
      </a>
    {/each}
  </div>
</div>

<style>
  .tabs-bar {
    background: white;
    border-bottom: 1px solid var(--color-border);
    z-index: 50;
  }

  .tabs-content {
    padding: 0 0.75rem;
    display: flex;
    gap: 0.25rem;
  }

  .tab-link {
    position: relative;
    display: block;
    padding: 1rem 1.25rem;
    color: var(--color-text-secondary);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.9375rem;
    transition: all 0.2s ease;
    border-bottom: 2px solid transparent;
  }

  .tab-link:hover {
    color: var(--color-sage);
    background-color: rgba(120, 160, 131, 0.05);
  }

  .tab-link.active {
    color: var(--color-sage);
    font-weight: 600;
    border-bottom-color: var(--color-sage);
  }

  @media (max-width: 768px) {
    .tabs-content {
      padding: 0 1rem;
      overflow-x: auto;
    }

    .tab-link {
      white-space: nowrap;
      padding: 0.875rem 1rem;
    }
  }
</style>
