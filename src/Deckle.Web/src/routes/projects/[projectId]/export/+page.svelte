<script lang="ts">
  import type { PageData } from './$types';
  import type { PageSetup } from '$lib/types';
  import { DEFAULT_PAGE_SETUP } from '$lib/types';
  import { setBreadcrumbs } from '$lib/stores/breadcrumb';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import ResizablePanelContainer from '$lib/components/ResizablePanelContainer.svelte';
  import PageSetupPanel from './_components/PageSetupPanel.svelte';
  import PaperPreview from './_components/PaperPreview.svelte';
  import ComponentSelector from './_components/ComponentSelector.svelte';

  let { data }: { data: PageData } = $props();

  const STORAGE_KEY = 'deckle-export-page-setup';

  // Page setup state
  let pageSetup = $state<PageSetup>({ ...DEFAULT_PAGE_SETUP });

  // Load page setup from localStorage on mount
  $effect(() => {
    if (browser) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Merge with defaults to ensure all properties exist
          pageSetup = { ...DEFAULT_PAGE_SETUP, ...parsed };
        }
      } catch (error) {
        console.error('Failed to load page setup from localStorage:', error);
      }
    }
  });

  // Save page setup to localStorage whenever it changes
  $effect(() => {
    if (browser) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pageSetup));
      } catch (error) {
        console.error('Failed to save page setup to localStorage:', error);
      }
    }
  });

  // Page elements for export
  let pageElements = $state<HTMLElement[]>([]);

  // Paper dimensions in pixels
  let paperDimensions = $state({ width: 0, height: 0 });

  // Selected component IDs from URL
  let selectedComponentIds = $derived.by(() => {
    const componentsParam = $page.url.searchParams.get('components');
    if (!componentsParam) return [];
    return componentsParam
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  });

  // Update breadcrumbs for this page
  $effect(() => {
    setBreadcrumbs([
      { label: 'Projects', href: '/projects' },
      { label: data.project.name, href: `/projects/${data.project.id}` },
      { label: 'Export', href: `/projects/${data.project.id}/export` }
    ]);
  });

  // Check if all components are exportable (Card or PlayerMat)
  const allExportable = $derived(
    data.components.every((c) => c.component.type === 'Card' || c.component.type === 'PlayerMat')
  );

  // Get non-exportable components
  const nonExportableComponents = $derived(
    data.components
      .filter((c) => c.component.type !== 'Card' && c.component.type !== 'PlayerMat')
      .map((c) => c.component.name)
  );

  // Generate export filename based on components
  const exportFilename = $derived.by(() => {
    if (data.components.length === 1) {
      return data.components[0].component.name;
    }
    return `${data.project.name}-export`;
  });
</script>

<svelte:head>
  <title>Export · {data.project.name} · Deckle</title>
  <meta name="description" content="Export components from {data.project.name}." />
</svelte:head>

<ResizablePanelContainer initialSplit={20}>
  {#snippet leftOrTop()}
    <div class="left-panel">
      <div class="component-selector-section">
        <ComponentSelector components={data.allExportableComponents} {selectedComponentIds} />
      </div>

      {#if data.components.length > 0}
        <div class="divider"></div>
        <div class="page-setup-section">
          <PageSetupPanel
            bind:pageSetup
            {pageElements}
            {paperDimensions}
            componentName={exportFilename}
            componentCount={data.components.length}
          />
        </div>
      {/if}
    </div>
  {/snippet}
  {#snippet rightOrBottom()}
    {#if data.components.length === 0}
      <div class="empty-preview">
        <p>Select components to export from the left panel</p>
      </div>
    {:else if allExportable}
      <PaperPreview
        {pageSetup}
        components={data.components}
        bind:pageElements
        bind:paperDimensions
        projectId={data.project.id}
      />
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
  {/snippet}
</ResizablePanelContainer>

<style>
  .left-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .component-selector-section {
    overflow: hidden;
    padding: 1rem;
    max-height: 300px;
  }

  .divider {
    height: 1px;
    background-color: #e0e0e0;
    margin: 0;
  }

  .page-setup-section {
    flex: 1;
    overflow: hidden;
    min-height: 200px;
  }

  .empty-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
  }

  .empty-preview p {
    font-size: 1rem;
    color: #666;
    text-align: center;
  }

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
