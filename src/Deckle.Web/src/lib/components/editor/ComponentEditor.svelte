<script lang="ts">
  import ResizablePanelContainer from '$lib/components/ResizablePanelContainer.svelte';
  import DataSourcePanel from './DataSourcePanel.svelte';
  import type { PageData } from '../../../routes/projects/[username]/[projectCode]/components/[componentId]/[part]/$types';
  import ElementConfigPanel from './ElementConfigPanel.svelte';
  import PreviewPanel from './PreviewPanel.svelte';
  import StructureTreePanel from './StructureTreePanel.svelte';
  import { templateStore } from '$lib/stores/templateElements';
  import { fontLoader } from '$lib/stores/fontLoader';
  import { initDataSourceRow } from '$lib/stores/dataSourceRow';
  import { beforeNavigate } from '$app/navigation';
  import { saveActionStore } from '$lib/stores/saveAction';
  import { get } from 'svelte/store';
  import { isEditableComponent } from '$lib/utils/componentTypes';
  import { setContext } from 'svelte';

  let { data, readOnly = false }: { data: PageData; readOnly?: boolean } = $props();

  // Compute the project URL base for navigation
  const projectUrlBase = `/projects/${data.project.ownerUsername}/${data.project.code}`;

  // Provide projectId through context for child components
  setContext('projectId', data.component.projectId);

  // Capitalize the part name for display (e.g., "front" -> "Front")
  const partLabel = $derived(data.part.charAt(0).toUpperCase() + data.part.slice(1));

  const sidebarWidth = 20;

  // Initialize the data source row store for merge field functionality
  initDataSourceRow();

  // Panel size control
  let dataSourcePanelSplit = $state(80); // Start at 80% for the main editor area
  const MINIMIZED_HEIGHT = 10; // Minimal height for data source panel
  const MAXIMIZED_HEIGHT = 50; // 50% split

  function minimizeDataSourcePanel() {
    dataSourcePanelSplit = 100 - MINIMIZED_HEIGHT;
  }

  function maximizeDataSourcePanel() {
    dataSourcePanelSplit = MAXIMIZED_HEIGHT;
  }

  // Load the saved design when the editor initializes
  $effect(() => {
    let savedDesign: string | null = null;

    // Check if component supports design editing (Card or PlayerMat)
    if (isEditableComponent(data.component)) {
      switch (data.part) {
        case 'front':
          savedDesign = data.component.frontDesign ?? null;
          break;
        case 'back':
          savedDesign = data.component.backDesign ?? null;
          break;
      }
    }

    // Load the design into the template store
    if (savedDesign) {
      try {
        const design = JSON.parse(savedDesign);
        templateStore.set({
          root: design,
          selectedElementId: 'root',
          hoveredElementId: null,
          canUndo: false,
          canRedo: false,
          hasUnsavedChanges: false
        });

        // Load fonts used in the design
        if (design.fonts && design.fonts.length > 0) {
          fontLoader.preloadTemplateFonts(design.fonts);
        }
      } catch (error) {
        console.error('Failed to parse saved design:', error);
        // If parsing fails, just use the default empty design
        templateStore.reset();
        templateStore.selectElement('root');
      }
    } else {
      // No saved design, start with empty template
      templateStore.reset();
      templateStore.selectElement('root');
    }
  });

  // Keyboard shortcuts for undo/redo/save (disabled in read-only mode)
  function handleKeydown(event: KeyboardEvent) {
    // Disable keyboard shortcuts in read-only mode
    if (readOnly) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

    // Save: Ctrl/Cmd+S
    if (ctrlKey && event.key === 's') {
      event.preventDefault();
      const saveFunction = get(saveActionStore);
      if (saveFunction) {
        saveFunction();
      }
    }
    // Undo: Ctrl/Cmd+Z
    else if (ctrlKey && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      templateStore.undo();
    }
    // Redo: Ctrl/Cmd+Y
    else if (ctrlKey && event.key === 'y') {
      event.preventDefault();
      templateStore.redo();
    }
  }

  // Handle browser navigation (close tab, refresh, etc.)
  function handleBeforeUnload(event: BeforeUnloadEvent) {
    let hasUnsavedChanges = false;
    templateStore.subscribe((store) => {
      hasUnsavedChanges = store.hasUnsavedChanges;
    })();

    if (hasUnsavedChanges) {
      event.preventDefault();
      // Modern browsers require returnValue to be set
      event.returnValue = '';
      return '';
    }
  }

  // Handle SvelteKit navigation
  beforeNavigate(({ cancel }) => {
    let hasUnsavedChanges = false;
    templateStore.subscribe((store) => {
      hasUnsavedChanges = store.hasUnsavedChanges;
    })();

    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Do you want to leave without saving?')) {
        cancel();
      }
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} onbeforeunload={handleBeforeUnload} />

{#if readOnly}
  <div class="read-only-banner">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
    <span>Read-only mode: You have view-only access to this component</span>
  </div>
{/if}

<ResizablePanelContainer orientation="vertical" bind:splitPercentage={dataSourcePanelSplit}>
  {#snippet leftOrTop()}
    <ResizablePanelContainer initialSplit={sidebarWidth}>
      {#snippet leftOrTop()}
        <StructureTreePanel component={data.component} part={partLabel} {readOnly} />
      {/snippet}
      {#snippet rightOrBottom()}
        <ResizablePanelContainer initialSplit={100 - (sidebarWidth / (100 - sidebarWidth)) * 100}>
          {#snippet leftOrTop()}
            <PreviewPanel component={data.component} {projectUrlBase} projectId={data.project.id} part={data.part} />
          {/snippet}
          {#snippet rightOrBottom()}
            <ElementConfigPanel component={data.component} part={partLabel} {readOnly} />
          {/snippet}
        </ResizablePanelContainer>
      {/snippet}
    </ResizablePanelContainer>
  {/snippet}
  {#snippet rightOrBottom()}
    <DataSourcePanel
      dataSource={data.dataSource}
      dataSources={data.dataSources}
      projectId={data.project.id}
      componentId={data.component.id}
      onMinimize={minimizeDataSourcePanel}
      onMaximize={maximizeDataSourcePanel}
      {readOnly}
    />
  {/snippet}
</ResizablePanelContainer>

<style>
  .read-only-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background-color: #fff3cd;
    border-bottom: 1px solid #ffc107;
    color: #856404;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .read-only-banner svg {
    flex-shrink: 0;
  }
</style>
