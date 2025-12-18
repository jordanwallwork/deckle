<script lang="ts">
  import type { BreadcrumbItem } from "$lib/types/breadcrumb";

  let { items = [] }: { items: BreadcrumbItem[] } = $props();
</script>

{#if items.length > 0}
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <ol>
      {#each items as item, index}
        <li>
          {#if item.isActive || index === items.length - 1}
            <span class="current">{item.label}</span>
          {:else}
            <a href={item.href}>{item.label}</a>
          {/if}
        </li>
        {#if index < items.length - 1}
          <li class="separator" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </li>
        {/if}
      {/each}
    </ol>
  </nav>
{/if}

<style>
  .breadcrumb {
    font-size: 0.875rem;
  }

  .breadcrumb ol {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .breadcrumb li {
    display: flex;
    align-items: center;
  }

  .breadcrumb a {
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .breadcrumb a:hover {
    color: white;
  }

  .separator svg {
    width: 14px;
    height: 14px;
    color: rgba(255, 255, 255, 0.6);
    flex-shrink: 0;
  }

  .current {
    color: white;
    font-weight: 600;
  }
</style>
