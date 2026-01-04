<script lang="ts">
  import type { PageData } from "./$types";
  import type { PageSetup, CardComponent, PlayerMatComponent } from "$lib/types";
  import { DEFAULT_PAGE_SETUP } from "$lib/types";
  import { setBreadcrumbs } from "$lib/stores/breadcrumb";
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
    setBreadcrumbs([
      { label: "Projects", href: "/projects" },
      { label: data.project.name, href: `/projects/${data.project.id}` },
      { label: "Export", href: `/projects/${data.project.id}/export` }
    ]);
  });

  // Check if all components are exportable (Card or PlayerMat)
  const allExportable = $derived(
    data.components.every(c =>
      c.component.type === "Card" || c.component.type === "PlayerMat"
    )
  );

  // Get non-exportable components
  const nonExportableComponents = $derived(
    data.components
      .filter(c => c.component.type !== "Card" && c.component.type !== "PlayerMat")
      .map(c => c.component.name)
  );

  // Generate export filename based on components
  const exportFilename = $derived(() => {
    if (data.components.length === 1) {
      return data.components[0].component.name;
    }
    return `${data.project.name}-export`;
  });
</script>

<svelte:head>
  <title>Export · {data.project.name} · Deckle</title>
  <meta
    name="description"
    content="Export components from {data.project.name}."
  />
</svelte:head>

{#if allExportable}
  <ResizablePanelContainer initialSplit={20}>
    {#snippet leftOrTop()}
      <PageSetupPanel
        bind:pageSetup
        {pageElements}
        {paperDimensions}
        componentName={exportFilename()}
      />
    {/snippet}
    {#snippet rightOrBottom()}
      <PaperPreview
        {pageSetup}
        components={data.components}
        bind:pageElements
        bind:paperDimensions
      />
    {/snippet}
  </ResizablePanelContainer>
{:else}
  <div class="error-message">
    <div>
      <p>Some components cannot be exported:</p>
      <ul>
        {#each nonExportableComponents as name}
          <li>{name}</li>
        {/each}
      </ul>
      <p>Export is only available for Card and Player Mat components.</p>
    </div>
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

  .error-message div {
    text-align: center;
  }

  .error-message p {
    font-size: 1rem;
    color: #666;
    margin: 0.5rem 0;
  }

  .error-message ul {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0;
  }

  .error-message li {
    font-weight: 500;
    color: #333;
  }
</style>
