<script lang="ts">
  import { browser } from '$app/environment';
  import type { PageData } from './$types';
  import { buildInitialTabletop } from '$lib/tabletop';
  import { buildInitialTabletop as buildInitialTabletopV2 } from '$lib/tabletop/v2';
  import Tabletop from './_components/Tabletop.svelte';
  import TabletopV2 from './_components/v2/TabletopV2.svelte';

  let { data }: { data: PageData } = $props();

  // Dev toggle for the v2 engine (pile-based rework, staged expand–contract).
  // v1 stays the default until the switch-over ticket.
  const V2_STORAGE_KEY = 'deckle.tabletop.useV2';
  let useV2 = $state(browser && localStorage.getItem(V2_STORAGE_KEY) === 'true');

  function toggleEngine() {
    useV2 = !useV2;
    if (browser) localStorage.setItem(V2_STORAGE_KEY, String(useV2));
  }

  const initResult = $derived(
    useV2
      ? null
      : buildInitialTabletop({
          components: data.components,
          componentRows: data.componentRows
        })
  );

  const initResultV2 = $derived(
    useV2
      ? buildInitialTabletopV2({
          components: data.components,
          componentRows: data.componentRows
        })
      : null
  );
</script>

<svelte:head>
  <title>Tabletop · {data.project.name} · Deckle</title>
</svelte:head>

<div class="tabletop-page">
  {#if data.components.length === 0}
    <div class="empty-state">
      <p>No components in this project yet.</p>
      <p>Create cards, boards, or other components first, then come back to playtest on the tabletop.</p>
    </div>
  {:else if useV2 && initResultV2}
    <TabletopV2
      initialState={initResultV2.state}
      templates={initResultV2.templates}
      components={data.components}
      projectId={data.project.id}
    />
  {:else if initResult}
    <Tabletop
      initialState={initResult.state}
      templates={initResult.templates}
      components={data.components}
      projectId={data.project.id}
    />
  {/if}

  {#if data.components.length > 0}
    <button
      class="engine-toggle"
      onclick={toggleEngine}
      title={useV2 ? 'Switch back to the current tabletop engine' : 'Try the experimental v2 tabletop engine'}
    >
      {useV2 ? '← Back to v1' : 'Try v2 (dev)'}
    </button>
  {/if}
</div>

<style>
  .tabletop-page {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    /* Override the parent layout padding for an immersive canvas */
    margin: -2rem;
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #6b7280;
    font-size: 0.9375rem;
    padding: 2rem;
    text-align: center;
  }

  .engine-toggle {
    position: absolute;
    bottom: 0.75rem;
    right: 0.75rem;
    z-index: 50;
    background: #1e2030;
    border: 1px solid #3a3d4e;
    color: #8b8ea0;
    border-radius: 4px;
    padding: 0.25rem 0.625rem;
    font-size: 0.6875rem;
    cursor: pointer;
    opacity: 0.75;
    transition: opacity 0.1s, color 0.1s;
  }

  .engine-toggle:hover {
    opacity: 1;
    color: #e8e9f0;
  }
</style>
