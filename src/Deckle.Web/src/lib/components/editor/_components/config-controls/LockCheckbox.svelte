<script lang="ts">
  let { locked = false, onchange }: { locked?: boolean; onchange: (locked: boolean) => void } =
    $props();

  function toggleLocked() {
    onchange(!locked);
  }
</script>

<button
  type="button"
  class="icon-toggle"
  class:active={locked}
  onclick={toggleLocked}
  aria-label={locked ? 'Unlock element' : 'Lock element'}
  title={locked ? 'Locked' : 'Unlocked'}
>
  {#if locked}
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect
        x="4"
        y="7"
        width="8"
        height="7"
        rx="1"
        stroke="currentColor"
        stroke-width="1.5"
        fill="none"
      />
      <path
        d="M5 7V4.5C5 2.84 6.34 1.5 8 1.5C9.66 1.5 11 2.84 11 4.5V7"
        stroke="currentColor"
        stroke-width="1.5"
        fill="none"
      />
    </svg>
  {:else}
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect
        x="4"
        y="7"
        width="8"
        height="7"
        rx="1"
        stroke="currentColor"
        stroke-width="1.5"
        fill="none"
      />
      <path
        d="M5 7V4.5C5 2.84 6.34 1.5 8 1.5C9.66 1.5 11 2.84 11 4.5V5"
        stroke="currentColor"
        stroke-width="1.5"
        fill="none"
      />
      <line
        x1="7"
        y1="7"
        x2="7"
        y2="3"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  {/if}
</button>

<style>
  .icon-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: all 0.15s ease;
  }

  .icon-toggle:hover {
    background: var(--color-bg-subtle);
    border-color: var(--color-text-secondary);
    color: var(--color-text-primary);
  }

  .icon-toggle.active {
    background: var(--color-bg-subtle);
    border-color: var(--color-accent-fg);
    color: var(--color-accent-fg);
  }

  .icon-toggle.active:hover {
    border-color: var(--color-accent-fg-hover);
    color: var(--color-accent-fg-hover);
  }
</style>
