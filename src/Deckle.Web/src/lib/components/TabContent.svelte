<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    actions,
    children
  }: {
    actions?: Snippet;
    children: Snippet;
  } = $props();
</script>

<div class="tab-content">
  {#if actions}
    <div class="tab-actions">
      {@render actions()}
    </div>
  {/if}

  {@render children()}
</div>

<style>
  .tab-content {
    position: relative;
  }

  .tab-actions {
    display: flex;
    flex-direction: row-reverse;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    width: 100%;
  }
</style>
