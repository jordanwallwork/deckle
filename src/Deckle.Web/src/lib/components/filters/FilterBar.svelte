<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from '../Button.svelte';

  let {
    onApply,
    onClear,
    applyLabel = 'Apply',
    children
  }: {
    /** Called when the form is submitted (Apply button or Enter in a field) */
    onApply: () => void;
    /** Shows a Clear button when provided */
    onClear?: () => void;
    applyLabel?: string;
    /** The filter controls, typically `FilterField`s and `DateRangeField`s */
    children: Snippet;
  } = $props();

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    onApply();
  }
</script>

<form class="filter-bar" onsubmit={handleSubmit}>
  {@render children()}

  <div class="filter-actions">
    <Button type="submit" size="sm">{applyLabel}</Button>
    {#if onClear}
      <Button variant="secondary" size="sm" onclick={onClear}>Clear</Button>
    {/if}
  </div>
</form>

<style>
  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  /* Compact controls: filter fields sit in one row, so they're smaller than form inputs */
  .filter-bar :global(:is(input, select)) {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-family: inherit;
    font-size: 0.875rem;
    background: var(--color-surface);
    color: var(--color-text);
  }

  .filter-bar :global(:is(input, select):focus) {
    outline: none;
    border-color: var(--color-secondary-fg);
    box-shadow: 0 0 0 3px rgba(80, 114, 123, 0.15);
  }

  .filter-actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
