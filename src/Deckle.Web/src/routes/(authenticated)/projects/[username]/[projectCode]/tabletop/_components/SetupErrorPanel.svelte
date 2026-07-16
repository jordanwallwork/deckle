<script lang="ts">
  // Shared failure UI for the Play dialog (#120 / decision #107): render the
  // problem as a readable sentence (or a short list of them) plus an
  // "Open in editor" affordance. Used both for the pre-run validation gate
  // (#114 errors) and for a failed run (#117 SetupRunError). The editor route
  // is #123's job — this only exposes the seam via onOpenEditor.
  let {
    heading,
    messages,
    onOpenEditor
  }: { heading: string; messages: string[]; onOpenEditor?: () => void } = $props();
</script>

<div class="panel" role="alert">
  <p class="heading">{heading}</p>
  {#if messages.length === 1}
    <p class="message">{messages[0]}</p>
  {:else}
    <ul class="messages">
      {#each messages as message, i (i)}
        <li>{message}</li>
      {/each}
    </ul>
  {/if}
  {#if onOpenEditor}
    <button type="button" class="open-editor" onclick={onOpenEditor}>Open in editor</button>
  {/if}
</div>

<style>
  .panel {
    border: 1px solid var(--color-danger-fg);
    background: rgba(255, 71, 87, 0.08);
    border-radius: var(--radius-md);
    padding: 0.875rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .heading {
    margin: 0;
    font-weight: 600;
    color: var(--color-danger-fg);
  }

  .message,
  .messages {
    margin: 0;
    color: var(--color-text-primary);
    line-height: 1.5;
  }

  .messages {
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .open-editor {
    align-self: flex-start;
    background: none;
    border: none;
    padding: 0;
    color: var(--color-accent-fg);
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
  }
</style>
