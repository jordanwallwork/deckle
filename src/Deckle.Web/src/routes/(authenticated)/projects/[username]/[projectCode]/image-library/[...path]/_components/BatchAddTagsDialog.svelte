<script lang="ts">
  import Dialog from '$lib/components/Dialog.svelte';
  import Button from '$lib/components/Button.svelte';
  import TagInput from '$lib/components/forms/TagInput.svelte';

  let {
    show = $bindable(),
    fileCount,
    suggestions = [],
    onSubmit
  }: {
    show: boolean;
    fileCount: number;
    suggestions?: string[];
    onSubmit: (tags: string[]) => Promise<void>;
  } = $props();

  let tags = $state<string[]>([]);
  let saving = $state(false);

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

<Dialog bind:show title="Add Tags" maxWidth="480px">
  <p class="description">
    Tags will be added to {fileCount} selected {fileCount === 1 ? 'image' : 'images'}.
  </p>
  <TagInput bind:value={tags} {suggestions} placeholder="Type a tag and press Enter" />

  {#snippet actions()}
    <Button variant="secondary" onclick={() => (show = false)}>Cancel</Button>
    <Button onclick={submit} disabled={tags.length === 0 || saving}>
      {saving ? 'Adding...' : `Add to ${fileCount} ${fileCount === 1 ? 'image' : 'images'}`}
    </Button>
  {/snippet}
</Dialog>

<style>
  .description {
    margin: 0 0 1rem;
    font-size: 0.875rem;
    color: var(--color-secondary-fg);
  }
</style>
