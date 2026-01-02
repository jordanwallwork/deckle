<script lang="ts">
  import type { PageData } from "./$types";
  import type { PageSetup, CardComponent } from "$lib/types";
  import { DEFAULT_PAGE_SETUP } from "$lib/types";
  import { setBreadcrumbs } from "$lib/stores/breadcrumb";
  import { buildComponentExportBreadcrumbs } from "$lib/utils/breadcrumbs";
  import ResizablePanelContainer from "$lib/components/ResizablePanelContainer.svelte";
  import PageSetupPanel from "./_components/PageSetupPanel.svelte";
  import PaperPreview from "./_components/PaperPreview.svelte";

  let { data }: { data: PageData } = $props();

  // Page setup state
  let pageSetup = $state<PageSetup>({ ...DEFAULT_PAGE_SETUP });

  // Update breadcrumbs for this page
  $effect(() => {
    setBreadcrumbs(
      buildComponentExportBreadcrumbs(data.project, data.component)
    );
  });

  // Type guard to check if component is a Card
  const isCard = (component: typeof data.component): component is CardComponent => {
    return component.type === "Card";
  };
</script>

<svelte:head>
  <title>Export · {data.component.name} · {data.project.name} · Deckle</title>
  <meta
    name="description"
    content="Export {data.component.name} from {data.project.name}."
  />
</svelte:head>

{#if isCard(data.component)}
  <ResizablePanelContainer initialSplit={20}>
    {#snippet leftOrTop()}
      <PageSetupPanel bind:pageSetup />
    {/snippet}
    {#snippet rightOrBottom()}
      <PaperPreview {pageSetup} component={data.component} />
    {/snippet}
  </ResizablePanelContainer>
{:else}
  <div class="error-message">
    <p>Export is only available for Card components.</p>
  </div>
{/if}

<style>
  .error-message {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
  }

  .error-message p {
    font-size: 1rem;
    color: #666;
  }
</style>
