<script lang="ts">
  let { locked = false, onchange }: { locked?: boolean; onchange: (locked: boolean) => void } = $props();

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
      <rect x="4" y="7" width="8" height="7" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <path d="M5 7V4.5C5 2.84 6.34 1.5 8 1.5C9.66 1.5 11 2.84 11 4.5V7" stroke="currentColor" stroke-width="1.5" fill="none"/>
    </svg>
  {:else}
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="4" y="7" width="8" height="7" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <path d="M5 7V4.5C5 2.84 6.34 1.5 8 1.5C9.66 1.5 11 2.84 11 4.5V5" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <line x1="7" y1="7" x2="7" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
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
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    color: #666;
    transition: all 0.15s ease;
  }

  .icon-toggle:hover {
    background: #f9fafb;
    border-color: #9ca3af;
    color: #374151;
  }

  .icon-toggle.active {
    background: #eff6ff;
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .icon-toggle.active:hover {
    background: #dbeafe;
    border-color: #2563eb;
    color: #2563eb;
  }
</style>
