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

  function handleOverlayClick() {
    if (onclose) {
      onclose();
    }
  }

  function handleDialogClick(e: MouseEvent) {
    e.stopPropagation();
  }

  function handleEscapeKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && onclose) {
      onclose();
    }
  }
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="dialog-overlay" onclick={handleOverlayClick} onkeydown={handleEscapeKey}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="dialog" style="max-width: {maxWidth}" onclick={handleDialogClick} role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1">
      <h2 id="dialog-title">{title}</h2>
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
    padding: 2rem;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .dialog h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-sage);
    margin-bottom: 1.5rem;
  }

  .dialog-content {
    margin-bottom: 1.5rem;
  }

  .dialog-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .dialog-actions :global(button) {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .dialog-actions :global(button.secondary) {
    background-color: var(--color-teal-grey);
    color: var(--color-sage);
  }

  .dialog-actions :global(button.secondary:hover) {
    background-color: var(--color-muted-teal);
    color: white;
  }

  .dialog-actions :global(button.primary) {
    background-color: var(--color-muted-teal);
    color: white;
  }

  .dialog-actions :global(button.primary:hover) {
    background-color: var(--color-sage);
  }

  .dialog-actions :global(button:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .dialog-actions :global(button.primary:disabled:hover) {
    background-color: var(--color-muted-teal);
  }
</style>
