<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Snippet for header content (title, subtitle, etc.) */
    header: Snippet;
    /** Optional snippet for header actions (e.g., buttons) */
    headerActions?: Snippet;
    /** Main content */
    children: Snippet;
  }

  let { header, headerActions, children }: Props = $props();
</script>

<div class="page">
  <div class="page-header">
    <div class="header-content">
      {@render header()}
      {#if headerActions}
        <div class="header-actions">
          {@render headerActions()}
        </div>
      {/if}
    </div>
  </div>

  <div class="page-content">
    {@render children()}
  </div>
</div>

<style>
  .page {
    min-height: 100%;
  }

  .page-header {
    background: linear-gradient(135deg, var(--color-teal-grey) 0%, var(--color-muted-teal) 100%);
    padding: 2rem;
    border-bottom: 1px solid var(--color-border);
  }

  .header-content {
    max-width: 1600px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
  }

  .header-actions {
    flex-shrink: 0;
  }

  .page-content {
    padding: 2rem;
    max-width: 1600px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .page-header {
      padding: 1.5rem 1rem;
    }

    .page-content {
      padding: 1.5rem 1rem;
    }

    .header-content {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }
  }
</style>
