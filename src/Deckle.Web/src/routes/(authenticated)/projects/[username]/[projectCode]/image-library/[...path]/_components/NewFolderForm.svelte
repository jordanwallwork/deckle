<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import { ApiError } from '$lib/api';

  let {
    onCreate,
    onCancel
  }: {
    onCreate: (name: string) => Promise<void>;
    onCancel: () => void;
  } = $props();

  let name = $state('');
  let busy = $state(false);
  let error = $state<string | null>(null);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    busy = true;
    error = null;
    try {
      await onCreate(trimmed);
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Failed to create folder';
    } finally {
      busy = false;
    }
  }
</script>

<form class="new-folder" onsubmit={submit}>
  <!-- svelte-ignore a11y_autofocus -->
  <input type="text" bind:value={name} placeholder="New folder name" autofocus />
  <Button size="sm" type="submit" disabled={!name.trim() || busy}>Create</Button>
  <Button size="sm" variant="secondary" onclick={onCancel}>Cancel</Button>
</form>
{#if error}<p class="error">{error}</p>{/if}

<style>
  .new-folder {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .new-folder input {
    flex: 1;
    padding: 0.375rem 0.625rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
  }

  .error {
    margin: 0.5rem 0 0;
    font-size: 0.8125rem;
    color: var(--color-danger-fg);
  }
</style>
