<script lang="ts">
  import ComponentViewer from "$lib/components/editor/ComponentViewer.svelte";
  import Panel from "$lib/components/editor/_components/Panel.svelte";
  import UndoRedoControls from "$lib/components/editor/_components/UndoRedoControls.svelte";
  import ZoomControls from "$lib/components/editor/_components/ZoomControls.svelte";
  import type { EditableComponent, ComponentShape, CardComponent } from "$lib/types";
  import EditableComponentView from "./EditableComponent.svelte";
  import type { PanzoomObject } from "@panzoom/panzoom";

  let { component }: { component: EditableComponent } = $props();
  let dimensions = component.dimensions;
  // Extract shape if this is a CardComponent
  let shape = $derived<ComponentShape | undefined>(
    'shape' in component ? (component as CardComponent).shape : undefined
  );

  let showBleedSafeArea = $state(true);
  let panzoomInstance = $state<PanzoomObject | null>(null);
  let panzoomElement = $state<HTMLDivElement | null>(null);

  function handlePanzoomReady(instance: PanzoomObject, element: HTMLDivElement) {
    panzoomInstance = instance;
    panzoomElement = element;
  }
</script>

<Panel title="Preview">
  {#snippet toolbar()}
    <UndoRedoControls />
    <button
      onclick={() => showBleedSafeArea = !showBleedSafeArea}
      class="bleed-safe-area-toggle"
      class:active={showBleedSafeArea}
      title={showBleedSafeArea ? 'Hide Bleed/Safe Area' : 'Show Bleed/Safe Area'}
    >
      {showBleedSafeArea ? 'Hide' : 'Show'} Bleed/Safe Area
    </button>
    <ZoomControls {panzoomInstance} {panzoomElement} />
  {/snippet}
  <ComponentViewer {dimensions} onPanzoomReady={handlePanzoomReady}>
    <EditableComponentView {dimensions} {shape} {showBleedSafeArea} />
  </ComponentViewer>
</Panel>

<style>
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

  .bleed-safe-area-toggle.active {
    background: #3b82f6;
    color: white;
    border-color: #2563eb;
  }

  .bleed-safe-area-toggle.active:hover {
    background: #2563eb;
    border-color: #1d4ed8;
  }
</style>
