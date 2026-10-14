<script lang="ts">
  import type { SortDirection } from '$lib/types';

  let {
    label,
    active,
    direction,
    onSort
  }: {
    /** Column heading text */
    label: string;
    /** Whether the table is currently sorted by this column */
    active: boolean;
    /** The table's current sort direction (only shown when `active`) */
    direction: SortDirection;
    /** Called on click; the parent decides the next sort */
    onSort: () => void;
  } = $props();

  const ariaSort = $derived.by(() => {
    if (!active) return 'none';
    return direction === 'asc' ? 'ascending' : 'descending';
  });
</script>

<!-- A header cell for Table's `head` snippet; the button makes the column keyboard-sortable -->
<th aria-sort={ariaSort}>
  <button type="button" class="sort-button" onclick={onSort}>
    {label}
    {#if active}
      <svg
        class="sort-arrow"
        class:desc={direction === 'desc'}
        viewBox="0 0 10 10"
        aria-hidden="true"
        data-testid="sort-arrow"
      >
        <path d="M5 1.5v7M2 4.5l3-3 3 3" />
      </svg>
    {/if}
  </button>
</th>

<style>
  .sort-button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    color: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    text-align: inherit;
    cursor: pointer;
  }

  .sort-button:hover {
    color: var(--color-secondary-fg);
  }

  .sort-button:focus-visible {
    outline: 2px solid var(--color-secondary-fg);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }

  .sort-arrow {
    width: 0.625rem;
    height: 0.625rem;
    flex-shrink: 0;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .sort-arrow.desc {
    transform: rotate(180deg);
  }
</style>
