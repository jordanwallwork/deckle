<script lang="ts">
  import ComponentViewer from '$lib/components/editor/ComponentViewer.svelte';
  import Panel from '$lib/components/editor/_components/Panel.svelte';
  import UndoRedoControls from '$lib/components/editor/_components/UndoRedoControls.svelte';
  import ZoomControls from '$lib/components/editor/_components/ZoomControls.svelte';
  import MenuIcon from '$lib/components/icons/MenuIcon.svelte';
  import type { EditableComponent, ComponentShape, CardComponent } from '$lib/types';
  import EditableComponentView from './EditableComponent.svelte';
  import type { PanzoomObject } from '@panzoom/panzoom';
  import { templateStore } from '$lib/stores/templateElements';
  import { componentsApi } from '$lib/api';
  import { saveActionStore } from '$lib/stores/saveAction';
  import { goto } from '$app/navigation';

  let {
    component,
    projectUrlBase,
    projectId,
    part
  }: { component: EditableComponent; projectUrlBase: string; projectId: string; part: string } =
    $props();
  let dimensions = component.dimensions;
  // Extract shape if this is a CardComponent
  let shape = $derived<ComponentShape | undefined>(
    'shape' in component ? (component as CardComponent).shape : undefined
  );

  let showBleedSafeArea = $state(true);
  let panzoomInstance = $state<PanzoomObject | null>(null);
  let panzoomElement = $state<HTMLDivElement | null>(null);
  let isSaving = $state(false);
  let saveSuccess = $state(false);
  let exportError = $state<string | null>(null);

  // Grid snap controls - owned by PreviewPanel and passed to ComponentViewer
  // Calculate sensible default: 1/50th of smallest dimension, rounded to nearest 5
  const defaultGridSize = Math.max(
    5,
    Math.round(Math.min(dimensions.widthPx, dimensions.heightPx) / 50 / 5) * 5
  );
  let gridEnabled = $state(true);
  let gridSize = $state(defaultGridSize);
  let gridDropdownOpen = $state(false);
  let gridDropdownRef = $state<HTMLDivElement | null>(null);

  // Mobile menu state
  let mobileMenuOpen = $state(false);
  let mobileMenuRef = $state<HTMLDivElement | null>(null);

  function handleClickOutside(event: MouseEvent) {
    if (gridDropdownRef && !gridDropdownRef.contains(event.target as Node)) {
      gridDropdownOpen = false;
    }
    if (mobileMenuRef && !mobileMenuRef.contains(event.target as Node)) {
      mobileMenuOpen = false;
    }
  }

  $effect(() => {
    if (gridDropdownOpen || mobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });

  function handlePanzoomReady(instance: PanzoomObject, element: HTMLDivElement) {
    panzoomInstance = instance;
    panzoomElement = element;
  }

  function handleExport() {
    // Clear any previous error
    exportError = null;

    // Check for unsaved changes
    if ($templateStore.hasUnsavedChanges) {
      exportError = 'Save unsaved changes before exporting';
      // Clear the error after 3 seconds
      setTimeout(() => {
        exportError = null;
      }, 3000);
      return;
    }

    // Navigate to export page with component ID in query string
    goto(`${projectUrlBase}/export?components=${component.id}`);
  }

  async function handleSave() {
    // Only allow saving for components that support design (Card and PlayerMat)
    if (component.type !== 'Card' && component.type !== 'PlayerMat') {
      alert('Only card and player mat designs can be saved.');
      return;
    }

    isSaving = true;
    saveSuccess = false;

    try {
      // Get the current template design from the store
      let design: string | null = null;
      templateStore.subscribe((store) => {
        design = JSON.stringify(store.root);
      })();

      // Save the design via API (works for both Card and PlayerMat)
      await componentsApi.saveDesign(projectId, component.id, part.toLowerCase(), design);

      // Mark changes as saved
      templateStore.markAsSaved();

      saveSuccess = true;
      setTimeout(() => {
        saveSuccess = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to save design:', error);
      alert('Failed to save design. Please try again.');
    } finally {
      isSaving = false;
    }
  }

  // Register the save function with the store for keyboard shortcuts
  $effect(() => {
    saveActionStore.register(handleSave);
    return () => saveActionStore.unregister();
  });
</script>

<Panel>
  {#snippet toolbar()}
    <button
      onclick={handleSave}
      class="save-button"
      class:saving={isSaving}
      class:success={saveSuccess}
      class:unsaved={$templateStore.hasUnsavedChanges}
      disabled={isSaving}
      title="Save Design (Ctrl/Cmd+S)"
    >
      {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save'}
    </button>
    <button
      onclick={handleExport}
      class="export-button"
      class:error={exportError !== null}
      title={exportError || 'Export Design'}
    >
      {exportError || 'Export'}
    </button>
    <div class="toolbar-divider"></div>
    <UndoRedoControls />

    <!-- Desktop controls (hidden on mobile) -->
    <div class="desktop-controls">
      <div class="toolbar-divider"></div>
      <button
        onclick={() => (showBleedSafeArea = !showBleedSafeArea)}
        class="bleed-safe-area-toggle"
        title={showBleedSafeArea ? 'Hide Bleed/Safe Area' : 'Show Bleed/Safe Area'}
      >
        {showBleedSafeArea ? 'Hide' : 'Show'} Bleed/Safe Area
      </button>
      <div class="toolbar-divider"></div>
      <div class="grid-controls" bind:this={gridDropdownRef}>
        <div class="grid-button-group">
          <button
            onclick={() => (gridEnabled = !gridEnabled)}
            class="grid-toggle"
            title={gridEnabled
              ? 'Disable Grid Snapping (Shift to temporarily disable)'
              : 'Enable Grid Snapping'}
          >
            Grid: {gridEnabled ? 'On' : 'Off'}
          </button>
          <button
            onclick={() => (gridDropdownOpen = !gridDropdownOpen)}
            class="grid-dropdown-trigger"
            class:open={gridDropdownOpen}
            title="Grid settings"
          >
            <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
              <path
                d="M1 1l4 4 4-4"
                stroke="currentColor"
                stroke-width="1.5"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
        {#if gridDropdownOpen}
          <div class="grid-dropdown">
            <label class="grid-size-label">
              <span>Grid Size:</span>
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                bind:value={gridSize}
                class="grid-size-input"
                title="Grid size in pixels"
              />
              <span class="grid-size-unit">px</span>
            </label>
          </div>
        {/if}
      </div>
      <div class="toolbar-divider"></div>
      <ZoomControls {panzoomInstance} {panzoomElement} />
    </div>

    <!-- Mobile menu (hidden on desktop) -->
    <div class="mobile-menu-container" bind:this={mobileMenuRef}>
      <button
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
        class="mobile-menu-button"
        class:open={mobileMenuOpen}
        title="View options"
      >
        <MenuIcon size={16} />
      </button>
      {#if mobileMenuOpen}
        <div class="mobile-menu-dropdown">
          <div class="mobile-menu-section">
            <span class="mobile-menu-label">Bleed/Safe Area</span>
            <button
              onclick={() => (showBleedSafeArea = !showBleedSafeArea)}
              class="mobile-menu-toggle"
              class:active={showBleedSafeArea}
            >
              {showBleedSafeArea ? 'On' : 'Off'}
            </button>
          </div>
          <div class="mobile-menu-divider"></div>
          <div class="mobile-menu-section">
            <span class="mobile-menu-label">Grid Snap</span>
            <button
              onclick={() => (gridEnabled = !gridEnabled)}
              class="mobile-menu-toggle"
              class:active={gridEnabled}
            >
              {gridEnabled ? 'On' : 'Off'}
            </button>
          </div>
          <div class="mobile-menu-section grid-size-row">
            <span class="mobile-menu-label">Grid Size</span>
            <div class="mobile-grid-input-wrapper">
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                bind:value={gridSize}
                class="mobile-grid-input"
              />
              <span class="mobile-grid-unit">px</span>
            </div>
          </div>
          <div class="mobile-menu-divider"></div>
          <div class="mobile-menu-section zoom-section">
            <span class="mobile-menu-label">Zoom</span>
            <ZoomControls {panzoomInstance} {panzoomElement} />
          </div>
        </div>
      {/if}
    </div>
  {/snippet}
  <ComponentViewer {dimensions} {gridEnabled} {gridSize} onPanzoomReady={handlePanzoomReady}>
    <EditableComponentView {dimensions} {shape} {showBleedSafeArea} />
  </ComponentViewer>
</Panel>

<style>
  .toolbar-divider {
    width: 1px;
    height: 20px;
    background-color: #e5e7eb;
    margin: 0 0.05rem;
  }

  .bleed-safe-area-toggle {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .bleed-safe-area-toggle:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .save-button {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    font-weight: 500;
  }

  .save-button:hover:not(:disabled) {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .save-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .save-button.unsaved {
    background: #f59e0b;
    color: white;
    border-color: #f59e0b;
  }

  .save-button.unsaved:hover:not(:disabled) {
    background: #d97706;
    border-color: #d97706;
  }

  .save-button.saving {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .save-button.success {
    background: #10b981;
    color: white;
    border-color: #10b981;
  }

  .export-button {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    font-weight: 500;
  }

  .export-button:hover {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .export-button.error {
    background: #ef4444;
    color: white;
    border-color: #ef4444;
    cursor: not-allowed;
  }

  .export-button.error:hover {
    background: #dc2626;
    border-color: #dc2626;
  }

  .grid-controls {
    position: relative;
    display: flex;
    align-items: center;
  }

  .grid-button-group {
    display: flex;
    align-items: stretch;
  }

  .grid-toggle {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px 0 0 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    font-weight: 500;
    border-right: none;
  }

  .grid-toggle:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .grid-dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
    transition: all 0.15s ease;
    color: #6b7280;
  }

  .grid-dropdown-trigger:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .grid-dropdown-trigger.open {
    background: #f3f4f6;
  }

  .grid-dropdown-trigger svg {
    transition: transform 0.15s ease;
  }

  .grid-dropdown-trigger.open svg {
    transform: rotate(180deg);
  }

  .grid-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    padding: 0.75rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.1),
      0 2px 4px -2px rgb(0 0 0 / 0.1);
    z-index: 50;
    min-width: 140px;
  }

  .grid-size-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #374151;
    white-space: nowrap;
  }

  .grid-size-input {
    width: 60px;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    text-align: center;
  }

  .grid-size-input:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .grid-size-unit {
    color: #6b7280;
  }

  /* Desktop controls - visible by default */
  .desktop-controls {
    display: contents;
  }

  /* Mobile menu - hidden by default */
  .mobile-menu-container {
    display: none;
    position: relative;
  }

  .mobile-menu-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 0.5rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    color: #374151;
  }

  .mobile-menu-button:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .mobile-menu-button.open {
    background: #f3f4f6;
  }

  .mobile-menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    padding: 0.75rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.1),
      0 2px 4px -2px rgb(0 0 0 / 0.1);
    z-index: 50;
    min-width: 200px;
  }

  .mobile-menu-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.25rem 0;
  }

  .mobile-menu-section.grid-size-row {
    padding-top: 0.5rem;
  }

  .mobile-menu-section.zoom-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .mobile-menu-label {
    font-size: 0.75rem;
    color: #374151;
    white-space: nowrap;
  }

  .mobile-menu-toggle {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 40px;
  }

  .mobile-menu-toggle:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .mobile-menu-toggle.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .mobile-menu-divider {
    height: 1px;
    background-color: #e5e7eb;
    margin: 0.5rem 0;
  }

  .mobile-grid-input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .mobile-grid-input {
    width: 50px;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    text-align: center;
  }

  .mobile-grid-input:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .mobile-grid-unit {
    font-size: 0.75rem;
    color: #6b7280;
  }

  /* Responsive: Show mobile menu, hide desktop controls on small screens */
  @media (max-width: 768px) {
    .desktop-controls {
      display: none;
    }

    .mobile-menu-container {
      display: block;
    }
  }
</style>
