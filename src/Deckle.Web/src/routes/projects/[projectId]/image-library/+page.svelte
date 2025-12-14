<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Image Library · {data.project.name} · Deckle</title>
  <meta
    name="description"
    content="Manage images and artwork for {data.project
      .name}. Upload and organize visual assets to use in your game components."
  />
</svelte:head>

<div class="tab-content">
  <div class="tab-actions">
    <button class="add-button">+ Upload Images</button>
  </div>

  <div class="empty-state">
    <p class="empty-message">No images yet</p>
    <p class="empty-subtitle">Upload images to use in your game components</p>
  </div>
</div>

<style>
  .tab-content {
    padding: 2rem;
  }

  .tab-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1.5rem;
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
