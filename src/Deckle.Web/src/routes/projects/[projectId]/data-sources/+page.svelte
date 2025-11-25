<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="tab-content">
  <div class="tab-header">
    <h2>Data Sources</h2>
    <button class="add-button">+ Add Data Source</button>
  </div>

  <div class="empty-state">
    <p class="empty-message">No data sources yet</p>
    <p class="empty-subtitle">Connect data sources to populate your game components</p>
  </div>
</div>

<style>
  .tab-content {
    background-color: white;
    border: 2px solid var(--color-teal-grey);
    border-radius: 12px;
    padding: 2rem;
    min-height: 400px;
  }

  .tab-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  h2 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-sage);
    margin: 0;
  }

  .add-button {
    background-color: var(--color-muted-teal);
    color: white;
    border: none;
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .add-button:hover {
    background-color: var(--color-sage);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(120, 160, 131, 0.3);
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-message {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin-bottom: 0.5rem;
  }

  .empty-subtitle {
    font-size: 1rem;
    color: var(--color-muted-teal);
  }
</style>
