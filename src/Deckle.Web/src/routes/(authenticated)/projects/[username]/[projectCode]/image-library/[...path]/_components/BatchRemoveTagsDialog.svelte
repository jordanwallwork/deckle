<script lang="ts">
  import Dialog from '$lib/components/Dialog.svelte';
  import Button from '$lib/components/Button.svelte';
  import TagInput from '$lib/components/forms/TagInput.svelte';
  import { mergeTags } from './batchActions';

  let {
    show = $bindable(),
    fileCount,
    existingTags = [],
    onSubmit
  }: {
    show: boolean;
    fileCount: number;
    /** Tags currently present on the selected images */
    existingTags?: string[];
    onSubmit: (tags: string[]) => Promise<void>;
  } = $props();

  let tags = $state<string[]>([]);
  let saving = $state(false);

  let unpickedTags = $derived(
    existingTags.filter((t) => !tags.some((picked) => picked.toLowerCase() === t.toLowerCase()))
  );

  // Start fresh each time the dialog opens
  $effect(() => {
    if (show) tags = [];
  });

  async function submit() {
    if (tags.length === 0) return;
    saving = true;
    try {
      await onSubmit(tags);
      show = false;
    } finally {
      saving = false;
    }
  }
</script>

<Dialog bind:show title="Remove Tags" maxWidth="480px">
  <p class="description">
    Matching tags will be removed from {fileCount} {fileCount === 1 ? 'image' : 'images'}.
  </p>
  <TagInput bind:value={tags} suggestions={existingTags} placeholder="Type a tag to remove" />

  {#if unpickedTags.length > 0}
    <div class="existing">
      <span class="existing-label">On selected images:</span>
      <div class="existing-tags">
        {#each unpickedTags as tag (tag)}
          <button type="button" class="tag-chip" onclick={() => (tags = mergeTags(tags, [tag]))}>
            {tag}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#snippet actions()}
    <Button variant="secondary" onclick={() => (show = false)}>Cancel</Button>
    <Button variant="danger" onclick={submit} disabled={tags.length === 0 || saving}>
      {saving ? 'Removing...' : `Remove ${tags.length === 1 ? 'tag' : 'tags'}`}
    </Button>
  {/snippet}
</Dialog>

<style>
  .description {
    margin: 0 0 1rem;
    font-size: 0.875rem;
    color: var(--color-secondary-fg);
  }

  .existing {
    margin-top: 1rem;
  }

  .existing-label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }

  .existing-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .tag-chip {
    padding: 0.125rem 0.5rem;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tag-chip:hover {
    border-color: var(--color-danger);
    color: var(--color-danger-fg);
  }
</style>
