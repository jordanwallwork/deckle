<script lang="ts">
  let { visible = true, onchange }: { visible?: boolean; onchange: (visible: boolean) => void } =
    $props();

  function toggleVisible() {
    onchange(!visible);
  }
</script>

<button
  type="button"
  class="icon-toggle"
  class:active={visible}
  onclick={toggleVisible}
  aria-label={visible ? 'Hide element' : 'Show element'}
  title={visible ? 'Visible' : 'Hidden'}
>
  {#if visible}
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z"
        stroke="currentColor"
        stroke-width="1.5"
        fill="none"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" fill="none" />
    </svg>
  {:else}
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z"
        stroke="currentColor"
        stroke-width="1.5"
        fill="none"
        opacity="0.4"
      />
      <circle
        cx="8"
        cy="8"
        r="2"
        stroke="currentColor"
        stroke-width="1.5"
        fill="none"
        opacity="0.4"
      />
      <line
        x1="2"
        y1="2"
        x2="14"
        y2="14"
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
