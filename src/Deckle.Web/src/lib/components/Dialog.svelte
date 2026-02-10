<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    show: boolean;
    title: string;
    maxWidth?: string;
    onclose?: () => void;
    children: Snippet;
    actions?: Snippet;
  }

  let {
    show = $bindable(),
    title,
    maxWidth = '500px',
    onclose,
    children,
    actions
  }: Props = $props();

  function handleClose() {
    if (onclose) {
      onclose();
    }
  }

  function handleEscapeKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose();
    }
  }

  // Auto-focus action for dialog
  function autoFocus(element: HTMLElement) {
    element.focus();
  }
</script>

{#if show}
  <div
    class="dialog-overlay"
    role="presentation"
    onkeydown={handleEscapeKey}
  >
    <div
      class="dialog"
      style="max-width: {maxWidth}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      tabindex="-1"
      use:autoFocus
    >
      <div class="dialog-header">
        <h2 id="dialog-title">{title}</h2>
        <button class="close-button" onclick={handleClose} aria-label="Close dialog">&times;</button>
      </div>
      <div class="dialog-content">
        {@render children()}
      </div>
      {#if actions}
        <div class="dialog-actions">
          {@render actions()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background-color: white;
    border-radius: 12px;
    padding: var(--pad-content);
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .dialog h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-sage);
    margin: 0;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    color: var(--color-sage);
    padding: 0.25rem;
    border-radius: 4px;
    opacity: 0.6;
    transition: opacity 0.15s;
  }

  .close-button:hover {
    opacity: 1;
  }

  .dialog-content {
    margin-bottom: 1.5rem;
  }

  .dialog-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }
</style>
