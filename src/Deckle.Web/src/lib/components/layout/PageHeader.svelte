<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Optional snippet for header actions (e.g., buttons) */
    headerActions?: Snippet;
    /** Main content */
    children: Snippet;
  }

  let { headerActions, children }: Props = $props();
</script>

<div class="page-header">
  <div class="header-content">
    {@render children()}
    {#if headerActions}
      <div class="header-actions">
        {@render headerActions()}
      </div>
    {/if}
  </div>
</div>

<style>
  .page-header {
    background: var(--bg-teal);
    padding: calc(var(--pad-content) / 2) var(--pad-content);
    border-bottom: 1px solid var(--color-border);
  }

  .header-content {
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
  }

  .header-actions {
    flex-shrink: 0;
  }

  :global(.header-button) {
    background-color: white !important;
    color: var(--color-sage) !important;
  }

  :global(.header-button:hover) {
    background-color: rgba(255, 255, 255, 0.95) !important;
  }

  :global(.header-button svg) {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }
  }
</style>
