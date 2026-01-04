<script lang="ts">
  import type { PageData } from "./$types";
  import type { PageSetup, CardComponent, PlayerMatComponent } from "$lib/types";
  import { DEFAULT_PAGE_SETUP } from "$lib/types";
  import { setBreadcrumbs } from "$lib/stores/breadcrumb";
  import { buildComponentExportBreadcrumbs } from "$lib/utils/breadcrumbs";
  import ResizablePanelContainer from "$lib/components/ResizablePanelContainer.svelte";
  import PageSetupPanel from "./_components/PageSetupPanel.svelte";
  import PaperPreview from "./_components/PaperPreview.svelte";

  let { data }: { data: PageData } = $props();

  // Page setup state
  let pageSetup = $state<PageSetup>({ ...DEFAULT_PAGE_SETUP });

  // Page elements for export
  let pageElements = $state<HTMLElement[]>([]);

  // Paper dimensions in pixels
  let paperDimensions = $state({ width: 0, height: 0 });

  // Update breadcrumbs for this page
  $effect(() => {
    setBreadcrumbs(
      buildComponentExportBreadcrumbs(data.project, data.component)
    );
  });

  // Type guard to check if component supports export (Card or PlayerMat)
  const isExportable = (component: typeof data.component): component is CardComponent | PlayerMatComponent => {
    return component.type === "Card" || component.type === "PlayerMat";
  };
</script>

<svelte:head>
  <title>Export · {data.component.name} · {data.project.name} · Deckle</title>
  <meta
    name="description"
    content="Export {data.component.name} from {data.project.name}."
  />
</svelte:head>

{#if isExportable(data.component)}
  {@const exportableComponent = data.component}
  <ResizablePanelContainer initialSplit={20}>
    {#snippet leftOrTop()}
      <PageSetupPanel bind:pageSetup {pageElements} {paperDimensions} componentName={data.component.name} />
    {/snippet}
    {#snippet rightOrBottom()}
      <PaperPreview {pageSetup} component={exportableComponent} dataSourceRows={data.dataSourceRows} bind:pageElements bind:paperDimensions />
    {/snippet}
  </ResizablePanelContainer>
{:else}
  <div class="error-message">
    <p>Export is only available for Card and Player Mat components.</p>
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
