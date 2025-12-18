<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    toolbar,
    children,
  }: {
    title: string;
    toolbar?: Snippet;
    children?: Snippet;
  } = $props();
</script>

<div class="panel">
  <header class="panel-header">
    <h3 class="panel-title">{title}</h3>
    {#if toolbar}
      <div class="panel-toolbar">
        {@render toolbar()}
      </div>
    {/if}
  </header>
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

  .panel-title {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #1a1a1a;
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
