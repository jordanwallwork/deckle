<script lang="ts">
  import type { PageData } from './$types';
  import { buildInitialTabletop } from '$lib/tabletop';
  import Tabletop from './_components/Tabletop.svelte';

  let { data }: { data: PageData } = $props();

  const initResult = $derived(
    buildInitialTabletop({
      components: data.components,
      componentRows: data.componentRows
    })
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
  {:else}
    <Tabletop
      initialState={initResult.state}
      templates={initResult.templates}
      components={data.components}
      projectId={data.project.id}
    />
  {/if}
</div>

<style>
  .tabletop-page {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
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
</style>
