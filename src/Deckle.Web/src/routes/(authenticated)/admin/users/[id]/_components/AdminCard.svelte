<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    error = null,
    wide = false,
    children
  }: {
    title: string;
    /** Inline error from the card's last action */
    error?: string | null;
    /** Span the full width of the grid */
    wide?: boolean;
    children: Snippet;
  } = $props();
</script>

<section class="admin-card" class:wide aria-label={title}>
  <h2>{title}</h2>
  {@render children()}
  {#if error}
    <p class="card-error" role="alert">{error}</p>
  {/if}
</section>

<style>
  .admin-card {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.25rem;
    min-width: 0;
  }

  .admin-card.wide {
    grid-column: 1 / -1;
  }

  h2 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-error {
    margin: 0;
    padding: 0.5rem 0.75rem;
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
    border-radius: 0.5rem;
    color: var(--color-danger);
    font-size: 0.8125rem;
  }

  .admin-card :global(.card-hint) {
    margin: 0;
    font-size: 0.8125rem;
    color: #6b7280;
  }

  .admin-card :global(.card-actions) {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
