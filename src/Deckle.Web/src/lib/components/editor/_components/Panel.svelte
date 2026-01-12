<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    noheader,
    title,
    subtitle,
    toolbar,
    children
  }: {
    noheader?: boolean;
    title?: string;
    subtitle?: Snippet;
    toolbar?: Snippet;
    children?: Snippet;
  } = $props();
</script>

<div class="panel">
  {#if !noheader}
    <header class="panel-header">
      <div class="panel-header-left">
        {#if title}
          <h3 class="panel-title">{title}</h3>
        {/if}
        {#if subtitle}
          <div class="panel-subtitle">
            {@render subtitle()}
          </div>
        {/if}
      </div>
      {#if toolbar}
        <div class="panel-toolbar">
          {@render toolbar()}
        </div>
      {/if}
    </header>
  {/if}
  <div class="panel-content">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid #e5e5e7;
    background: #fafafa;
    min-height: 2.5rem;
  }

  .panel-header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .panel-title {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #1a1a1a;
  }

  .panel-subtitle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .panel-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .panel-content {
    flex: 1;
    overflow: auto;
  }
</style>
