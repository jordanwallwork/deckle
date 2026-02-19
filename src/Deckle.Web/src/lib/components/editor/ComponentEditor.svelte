<script lang="ts">
  import DataSourcePanel from './DataSourcePanel.svelte';
  import type { PageData } from '../../../routes/(authenticated)/projects/[username]/[projectCode]/components/[componentId]/[part]/$types';
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
  import ReadOnlyBanner from './_components/ReadOnlyBanner.svelte';
  import { MenuIcon, GearIcon } from '$lib/components/icons';

  let { data, readOnly = false }: { data: PageData; readOnly?: boolean } = $props();

  // Compute the project URL base for navigation
  const projectUrlBase = `/projects/${data.project.ownerUsername}/${data.project.code}`;

  // Provide projectId through context for child components
  setContext('projectId', data.component.projectId);

  // Capitalize the part name for display (e.g., "front" -> "Front")
  const partLabel = $derived(data.part.charAt(0).toUpperCase() + data.part.slice(1));

  // Initialize the data source row store for merge field functionality
  initDataSourceRow();

  // Side panel visibility (for mobile)
  let structurePanelOpen = $state(false);
  let configPanelOpen = $state(false);

  function toggleStructurePanel() {
    structurePanelOpen = !structurePanelOpen;
    if (structurePanelOpen) configPanelOpen = false; // Close other panel
  }

  function toggleConfigPanel() {
    configPanelOpen = !configPanelOpen;
    if (configPanelOpen) structurePanelOpen = false; // Close other panel
  }

  // Track the last loaded design to avoid resetting unsaved changes
  // when unrelated data (e.g., data source) is refreshed via invalidateAll()
  let lastLoadedDesign: string | null = null;

  // Load the saved design when the editor initializes or the part changes
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

    // Only reload if the design content actually changed (not just a data re-fetch)
    if (savedDesign === lastLoadedDesign) return;
    lastLoadedDesign = savedDesign;

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

<div class="component-editor">
  <!-- Read-only banner -->
  {#if readOnly}
    <ReadOnlyBanner />
  {/if}

  <!-- Main editor area -->
  <div class="editor-main">
    <!-- Mobile toggle buttons -->
    <div class="mobile-toggles">
      <button
        class="panel-toggle"
        class:active={structurePanelOpen}
        onclick={toggleStructurePanel}
        aria-label="Toggle structure panel"
      >
        <MenuIcon size={20} />
        <span>Structure</span>
      </button>
      <button
        class="panel-toggle"
        class:active={configPanelOpen}
        onclick={toggleConfigPanel}
        aria-label="Toggle config panel"
      >
        <GearIcon size={20} />
        <span>Config</span>
      </button>
    </div>

    <!-- Panels container -->
    <div class="panels-container">
      <!-- Structure Tree Panel (left) -->
      <aside class="side-panel structure-panel" class:open={structurePanelOpen}>
        <div class="side-panel-content">
          <StructureTreePanel component={data.component} part={partLabel} {readOnly} />
        </div>
      </aside>

      <!-- Overlay for mobile when side panel is open -->
      {#if structurePanelOpen || configPanelOpen}
        <button
          class="panel-overlay"
          onclick={() => {
            structurePanelOpen = false;
            configPanelOpen = false;
          }}
          aria-label="Close panel"
        ></button>
      {/if}

      <!-- Main Preview Panel (center) -->
      <main class="main-panel">
        <PreviewPanel
          component={data.component}
          {projectUrlBase}
          projectId={data.project.id}
          part={data.part}
        />
      </main>

      <!-- Config Panel (right) -->
      <aside class="side-panel config-panel" class:open={configPanelOpen}>
        <div class="side-panel-content">
          <ElementConfigPanel component={data.component} part={partLabel} {readOnly} />
        </div>
      </aside>
    </div>
  </div>

  <!-- Data Source Panel (bottom) -->
  <div class="data-source-container">
    <DataSourcePanel
      dataSource={data.dataSource}
      dataSources={data.dataSources}
      projectId={data.project.id}
      componentId={data.component.id}
      {readOnly}
    />
  </div>
</div>

<style>
  .component-editor {
    /* Fill parent flex container exactly - don't grow beyond */
    flex: 1 1 0;
    min-height: 0;
    max-height: 100%;

    /* Internal flex layout */
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #f5f5f5;
  }

  /* Main editor area (between readonly banner and data source) */
  .editor-main {
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Mobile toggle buttons - hidden on desktop */
  .mobile-toggles {
    display: none;
    padding: 0.5rem;
    gap: 0.5rem;
    background: white;
    border-bottom: 1px solid #e5e5e7;
    flex: 0 0 auto;
  }

  .panel-toggle {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 6px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .panel-toggle:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .panel-toggle.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  /* Panels container - holds side panels and main panel */
  .panels-container {
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    position: relative;
    overflow: hidden;
  }

  /* Side panels (structure tree and config) */
  .side-panel {
    width: 300px;
    flex: 0 0 300px;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: white;
    border: 1px solid #e5e5e7;
    overflow: hidden;
  }

  .side-panel-content {
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .structure-panel {
    border-right: none;
    width: 300px;
  }

  .config-panel {
    border-left: none;
  }

  /* Main preview panel */
  .main-panel {
    flex: 1 1 0;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: white;
    border: 1px solid #e5e5e7;
  }

  /* Overlay for mobile - hidden by default */
  .panel-overlay {
    display: none;
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 10;
    border: none;
    cursor: pointer;
  }

  /* Data source panel container */
  .data-source-container {
    position: absolute;
    bottom: 0;
    width: 100%;
    border-top: 1px solid #e5e5e7;
    background: white;
  }

  /* Mobile styles */
  @media (max-width: 1024px) {
    .mobile-toggles {
      display: flex;
    }

    .side-panel {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 300px;
      max-width: 85vw;
      flex: none;
      z-index: 20;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
    }

    .structure-panel {
      width: 300px;
      left: 0;
      border-right: 1px solid #e5e5e7;
    }

    .structure-panel.open {
      transform: translateX(0);
    }

    .config-panel {
      right: 0;
      left: auto;
      transform: translateX(100%);
      border-left: 1px solid #e5e5e7;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
    }

    .config-panel.open {
      transform: translateX(0);
    }

    .panel-overlay {
      display: block;
    }

    /* Data source panel on mobile can overlap */
    .data-source-container.expanded {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 15;
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
    }
  }

  /* Small mobile adjustments */
  @media (max-width: 640px) {
    .side-panel {
      width: 280px;
    }

    .panel-toggle span {
      display: none;
    }

    .panel-toggle {
      padding: 0.5rem;
    }
  }
</style>
