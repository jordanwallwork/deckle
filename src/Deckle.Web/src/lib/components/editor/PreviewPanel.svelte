<script lang="ts">
  import ComponentViewer from '$lib/components/editor/ComponentViewer.svelte';
  import Panel from '$lib/components/editor/_components/Panel.svelte';
  import UndoRedoControls from '$lib/components/editor/_components/UndoRedoControls.svelte';
  import ZoomControls from '$lib/components/editor/_components/ZoomControls.svelte';
  import type { EditableComponent, ComponentShape, CardComponent } from '$lib/types';
  import EditableComponentView from './EditableComponent.svelte';
  import type { PanzoomObject } from '@panzoom/panzoom';
  import { templateStore } from '$lib/stores/templateElements';
  import { componentsApi } from '$lib/api';
  import { saveActionStore } from '$lib/stores/saveAction';
  import { goto } from '$app/navigation';

  let {
    component,
    projectId,
    part
  }: { component: EditableComponent; projectId: string; part: string } = $props();
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
    goto(`/projects/${projectId}/export?components=${component.id}`);
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
    <div class="toolbar-divider"></div>
    <button
      onclick={() => (showBleedSafeArea = !showBleedSafeArea)}
      class="bleed-safe-area-toggle"
      title={showBleedSafeArea ? 'Hide Bleed/Safe Area' : 'Show Bleed/Safe Area'}
    >
      {showBleedSafeArea ? 'Hide' : 'Show'} Bleed/Safe Area
    </button>
    <div class="toolbar-divider"></div>
    <div class="grid-controls">
      <button
        onclick={() => (gridEnabled = !gridEnabled)}
        class="grid-toggle"
        title={gridEnabled
          ? 'Disable Grid Snapping (Shift to temporarily disable)'
          : 'Enable Grid Snapping'}
      >
        Grid: {gridEnabled ? 'On' : 'Off'}
      </button>
      <label class="grid-size-label">
        <span>Size:</span>
        <input
          type="number"
          min="1"
          max="100"
          step="1"
          bind:value={gridSize}
          class="grid-size-input"
          title="Grid size in pixels"
        />
      </label>
    </div>
    <div class="toolbar-divider"></div>
    <ZoomControls {panzoomInstance} {panzoomElement} />
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
    margin: 0 0.25rem;
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .grid-toggle {
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

  .grid-toggle:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .grid-size-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .grid-size-input {
    width: 50px;
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
</style>
