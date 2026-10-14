<script lang="ts">
  import Dialog from '$lib/components/Dialog.svelte';
  import Button from '$lib/components/Button.svelte';
  import { directoriesApi } from '$lib/api';
  import type { FileDirectory } from '$lib/types';
  import DirectoryPicker from './DirectoryPicker.svelte';
  import NewFolderForm from './NewFolderForm.svelte';

  let {
    show = $bindable(),
    projectId,
    directories,
    excludedIds = [],
    currentDirectoryId,
    itemCount,
    onSubmit
  }: {
    show: boolean;
    projectId: string;
    directories: FileDirectory[];
    /** Selected folders: neither they nor their descendants can be a target */
    excludedIds?: string[];
    currentDirectoryId: string | null;
    itemCount: number;
    onSubmit: (targetDirectoryId: string | null) => Promise<void>;
  } = $props();

  // Folders created from this dialog, shown before the page data reloads
  let createdDirectories = $state<FileDirectory[]>([]);
  // undefined = nothing picked yet; null = library root
  let target = $state<string | null | undefined>(undefined);
  let creatingFolder = $state(false);
  let moving = $state(false);

  $effect(() => {
    if (show) {
      createdDirectories = [];
      target = undefined;
      creatingFolder = false;
    }
  });

  // Errors propagate to NewFolderForm, which displays them
  async function createFolder(name: string) {
    const created = await directoriesApi.create(projectId, {
      name,
      parentDirectoryId: target ?? null
    });
    createdDirectories = [...createdDirectories, created];
    target = created.id;
    creatingFolder = false;
  }

  async function submit() {
    if (target === undefined) return;
    moving = true;
    try {
      await onSubmit(target);
      show = false;
    } finally {
      moving = false;
    }
  }
</script>

<Dialog bind:show title="Move {itemCount} {itemCount === 1 ? 'item' : 'items'} to…" maxWidth="480px">
  <DirectoryPicker
    bind:value={target}
    directories={[...directories, ...createdDirectories]}
    {excludedIds}
    disabledId={currentDirectoryId}
  />

  {#if creatingFolder}
    <NewFolderForm onCreate={createFolder} onCancel={() => (creatingFolder = false)} />
  {/if}

  {#snippet actions()}
    {#if !creatingFolder}
      <Button variant="text" onclick={() => (creatingFolder = true)} class="new-folder-button">
        New folder
      </Button>
    {/if}
    <Button variant="secondary" onclick={() => (show = false)}>Cancel</Button>
    <Button
      onclick={submit}
      disabled={target === undefined || target === currentDirectoryId || moving}
    >
      Move here
    </Button>
  {/snippet}
</Dialog>

<style>
  :global(.new-folder-button) {
    margin-right: auto;
  }
</style>
