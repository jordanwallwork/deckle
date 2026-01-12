<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    children,
    href = undefined,
    onclick = undefined,
    class: className = '',
    ariaLabel = undefined
  }: {
    children: Snippet;
    href?: string;
    onclick?: () => void;
    class?: string;
    ariaLabel?: string;
  } = $props();

  const isLink = href !== undefined;
  const isClickable = onclick !== undefined || isLink;

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ' ') && onclick) {
      e.preventDefault();
      onclick();
    }
  }
</script>

{#if isLink}
  <a {href} class="card {className}" class:clickable={isClickable} aria-label={ariaLabel}>
    {@render children()}
  </a>
{:else if onclick}
  <div
    class="card {className}"
    class:clickable={isClickable}
    role="button"
    tabindex="0"
    aria-label={ariaLabel}
    {onclick}
    onkeydown={handleKeyDown}
  >
    {@render children()}
  </div>
{:else}
  <div class="card {className}">
    {@render children()}
  </div>
{/if}

<style>
  .card {
    background-color: white;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    transition: all 0.2s ease;
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .card.clickable {
    cursor: pointer;
  }

  .card.clickable:hover {
    border-color: var(--color-muted-teal);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .card.clickable:focus {
    outline: 2px solid var(--color-muted-teal);
    outline-offset: 2px;
  }
</style>
