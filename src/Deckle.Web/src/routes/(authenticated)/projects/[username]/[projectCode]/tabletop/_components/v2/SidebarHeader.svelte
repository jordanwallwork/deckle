<script lang="ts">
  // The sidebar's title bar and collapse toggle. Owns the collapsed binding so
  // the container only reads it.
  let { collapsed = $bindable(false) }: { collapsed?: boolean } = $props();
</script>

<div class="sidebar-header" class:collapsed>
  {#if !collapsed}
    <span class="sidebar-title">Components</span>
  {/if}
  <button
    class="collapse-btn"
    onclick={() => (collapsed = !collapsed)}
    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
  >
    {collapsed ? '›' : '‹'}
  </button>
</div>

<style>
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.5rem 0.5rem 0.75rem;
    border-bottom: 1px solid #2a2d3e;
    min-height: 2.25rem;
  }

  .sidebar-header.collapsed {
    justify-content: center;
    padding: 0.5rem 0;
  }

  .sidebar-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #8b8ea0;
  }

  .collapse-btn {
    background: transparent;
    border: 1px solid #3a3d4e;
    color: #c8cad8;
    border-radius: 4px;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.875rem;
    line-height: 1;
  }

  .collapse-btn:hover {
    background: #2a2d3e;
  }
</style>
