<script lang="ts">
  import type { PageData } from './$types';
  import { setMaxScreen } from '$lib/stores/maxScreen';
  import { projectsApi } from '$lib/api';
  import BlocklyWorkspace from './_components/BlocklyWorkspace.svelte';

  let { data }: { data: PageData } = $props();

  $effect(() => {
    setMaxScreen(true);
    return () => setMaxScreen(false);
  });

  const tabletopUrl = $derived(
    `/projects/${data.project.ownerUsername}/${data.project.code}/tabletop`
  );

  const storageKey = $derived(`game-setup-${data.project.id}`);

  let workspaceRef = $state<ReturnType<typeof BlocklyWorkspace> | null>(null);
  let saving = $state(false);
  let saveStatus = $state<'idle' | 'saved' | 'error'>('idle');
  let saveStatusTimer: ReturnType<typeof setTimeout> | null = null;

  function handleClear() {
    if (confirm('Clear all setup steps? This cannot be undone.')) {
      workspaceRef?.clear();
      saveStatus = 'idle';
    }
  }

  async function handleSave() {
    const state = workspaceRef?.getState();
    if (state == null) return;

    saving = true;
    if (saveStatusTimer) clearTimeout(saveStatusTimer);

    try {
      await projectsApi.saveGameSetup(data.project.id, state);
      saveStatus = 'saved';
    } catch {
      saveStatus = 'error';
    } finally {
      saving = false;
      saveStatusTimer = setTimeout(() => (saveStatus = 'idle'), 3000);
    }
  }
</script>

<svelte:head>
  <title>Game Setup · {data.project.name} · Deckle</title>
</svelte:head>

<div class="layout">
  <!-- Top bar -->
  <div class="topbar">
    <a href={tabletopUrl} class="back-btn">← Tabletop</a>
    <h1 class="topbar-title">Game Setup</h1>
    <div class="topbar-actions">
      <button class="clear-btn" onclick={handleClear}>Clear all</button>
      <button class="save-btn" onclick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save'}
      </button>
    </div>
  </div>

  <!-- Blockly fills the remaining space; its built-in toolbox acts as the left panel -->
  <div class="workspace-area">
    <BlocklyWorkspace
      bind:this={workspaceRef}
      components={data.components}
      {storageKey}
      initialState={data.savedGameSetup}
    />
  </div>
</div>

<style>
  .layout {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .topbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0 1.25rem;
    height: 52px;
    background: white;
    border-bottom: 1px solid #e0e0e0;
    flex-shrink: 0;
  }

  .back-btn {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #6b7280;
    text-decoration: none;
    padding: 0.3125rem 0.625rem;
    border: 1px solid #e5e7eb;
    border-radius: 5px;
    transition: background 0.1s, color 0.1s;
    white-space: nowrap;
  }

  .back-btn:hover {
    background: #f3f4f6;
    color: #111827;
  }

  .topbar-title {
    flex: 1;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  .topbar-actions {
    display: flex;
    gap: 0.5rem;
  }

  .clear-btn {
    font-size: 0.8125rem;
    padding: 0.3125rem 0.75rem;
    background: none;
    color: #6b7280;
    border: 1px solid #e5e7eb;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.1s;
  }

  .clear-btn:hover {
    background: #fef2f2;
    color: #dc2626;
    border-color: #fca5a5;
  }

  .save-btn {
    font-size: 0.8125rem;
    padding: 0.3125rem 0.875rem;
    background: #2563eb;
    color: white;
    border: 1px solid #1d4ed8;
    border-radius: 5px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.1s;
    min-width: 70px;
  }

  .save-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .save-btn:disabled {
    opacity: 0.65;
    cursor: default;
  }

  .workspace-area {
    flex: 1;
    min-height: 0;
    position: relative;
  }
</style>
