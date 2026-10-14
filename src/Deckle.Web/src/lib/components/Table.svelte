<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    head,
    children,
    framed = false,
    compact = false,
    minWidth,
    label
  }: {
    /** Header cells (`<th>`), rendered inside `<thead><tr>` */
    head: Snippet;
    /** Body rows (`<tr>`), rendered inside `<tbody>`. Add `use:rowLink` to make a row clickable. */
    children: Snippet;
    /** Give the table its own surface, border and rounded corners (off when inside a card) */
    framed?: boolean;
    /** Tighter cell padding for tables nested in cards */
    compact?: boolean;
    /** Below this width the table scrolls horizontally instead of squashing columns */
    minWidth?: string;
    /** Accessible name for the table */
    label?: string;
  } = $props();
</script>

<div class="table-scroll" class:framed>
  <table class:compact style:min-width={minWidth} aria-label={label}>
    <thead>
      <tr>{@render head()}</tr>
    </thead>
    <tbody>
      {@render children()}
    </tbody>
  </table>
</div>

<style>
  .table-scroll {
    overflow-x: auto;
  }

  .table-scroll.framed {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    --cell-padding: 1rem;
  }

  table.compact {
    --cell-padding: 0.5rem 0.75rem;
  }

  table :global(th) {
    padding: var(--cell-padding);
    text-align: left;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: var(--color-bg-primary);
    border-bottom: 1px solid var(--color-border);
  }

  table :global(td) {
    padding: var(--cell-padding);
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
  }

  tbody :global(tr:last-child td) {
    border-bottom: none;
  }

  tbody :global(tr.row-link) {
    cursor: pointer;
  }

  tbody :global(tr.row-link:hover) {
    background: var(--color-bg-primary);
  }
</style>
