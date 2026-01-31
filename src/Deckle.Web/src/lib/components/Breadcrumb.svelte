<script lang="ts">
  import type { BreadcrumbItem } from '$lib/types/breadcrumb';
  import { goto } from '$app/navigation';
  import { ChevronRightIcon } from '$lib/components/icons';

  let { items = [] }: { items: BreadcrumbItem[] } = $props();

  function handlePartChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const href = select.value;
    if (href) {
      goto(href);
    }
  }
</script>

{#if items.length > 0}
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <ol>
      {#each items as item, index}
        <li>
          {#if item.isActive || index === items.length - 1}
            {#if item.partOptions && item.partOptions.length > 0}
              <select
                class="part-select"
                value={item.href}
                onchange={handlePartChange}
                aria-label="Select part"
              >
                {#each item.partOptions as option}
                  <option value={option.href}>{option.label}</option>
                {/each}
              </select>
            {:else}
              <span class="current">{item.label}</span>
            {/if}
          {:else}
            <a href={item.href}>{item.label}</a>
          {/if}
        </li>
        {#if index < items.length - 1}
          <li class="separator" aria-hidden="true">
            <ChevronRightIcon size={14} />
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

  .separator {
    color: rgba(255, 255, 255, 0.6);
  }

  .current {
    color: white;
    font-weight: 600;
  }

  .part-select {
    color: white;
    font-weight: 600;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    padding: 2px 24px 2px 6px;
    font-size: 0.875rem;
    font-family: inherit;
    cursor: pointer;
    outline: none;
    transition: all 0.2s ease;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' /%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 4px center;
    background-size: 16px;
  }

  .part-select:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .part-select:focus {
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.05);
  }

  .part-select option {
    background: #1a1a1a;
    color: white;
  }
</style>
