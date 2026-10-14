<script lang="ts">
  let {
    page,
    totalPages,
    onPageChange
  }: {
    /** Current page, 1-based */
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  } = $props();
</script>

<!-- Nothing to page through on a single page -->
{#if totalPages > 1}
  <nav class="pagination" aria-label="Pagination">
    <button
      type="button"
      class="page-btn"
      disabled={page <= 1}
      onclick={() => onPageChange(page - 1)}
    >
      Previous
    </button>
    <span class="page-info">Page {page} of {totalPages}</span>
    <button
      type="button"
      class="page-btn"
      disabled={page >= totalPages}
      onclick={() => onPageChange(page + 1)}
    >
      Next
    </button>
  </nav>
{/if}

<style>
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .page-btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .page-btn:hover:not(:disabled) {
    border-color: var(--color-secondary-fg);
    color: var(--color-secondary-fg);
  }

  .page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-info {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
</style>
