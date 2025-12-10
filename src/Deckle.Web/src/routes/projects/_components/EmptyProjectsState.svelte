<script lang="ts">
  let {
    onCreateClick
  }: {
    onCreateClick: () => void;
  } = $props();
</script>

<div class="empty-state">
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
  <p class="empty-message">No projects yet</p>
  <p class="empty-subtitle">Create your first project to get started</p>
  <button class="empty-action" onclick={onCreateClick}>
    Create Project
  </button>
</div>

<style>
  .empty-state {
    background: white;
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-lg);
    padding: 4rem 2rem;
    text-align: center;
  }

  .empty-state svg {
    width: 48px;
    height: 48px;
    color: var(--color-muted-teal);
    margin: 0 auto 1rem;
    opacity: 0.5;
  }

  .empty-message {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin-bottom: 0.5rem;
  }

  .empty-subtitle {
    font-size: 1rem;
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
  }

  .empty-action {
    background-color: var(--color-muted-teal);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 0.9375rem;
    font-weight: 600;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .empty-action:hover {
    background-color: var(--color-sage);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
</style>
