<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    grow = false,
    children
  }: {
    label: string;
    /** Take up spare width in the bar (e.g. a search box) */
    grow?: boolean;
    /** A single native `<input>` or `<select>`, labelled by wrapping */
    children: Snippet;
  } = $props();
</script>

<label class="filter-field" class:grow>
  <span class="filter-label">{label}</span>
  {@render children()}
</label>

<style>
  .filter-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    min-width: 0;
  }

  .filter-field.grow {
    flex: 1 1 220px;
  }

  .filter-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
