<script lang="ts">
  let { onclick }: { onclick: () => void } = $props();
</script>

<button class="add-card" {onclick} aria-label="Add component">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
  <span>Add Component</span>
</button>

<style>
  .add-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.625rem;
    width: 100%;
    min-height: 120px;
    background: none;
    border: 1.5px dashed var(--color-border);
    border-radius: var(--radius-lg);
    color: var(--color-muted-teal);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9375rem;
    font-weight: 500;
    padding: 1.5rem;
  }

  .add-card:hover {
    border-color: var(--color-muted-teal);
    background-color: color-mix(in srgb, var(--color-muted-teal) 5%, transparent);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .add-card:focus-visible {
    outline: 2px solid var(--color-muted-teal);
    outline-offset: 2px;
  }
</style>
