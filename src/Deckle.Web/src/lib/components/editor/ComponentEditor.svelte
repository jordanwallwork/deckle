<script lang="ts">
  import ResizablePanelContainer from "$lib/components/ResizablePanelContainer.svelte";
  import Panel from "$lib/components/editor/_components/Panel.svelte";
  import type { PageData } from "../../../routes/projects/[projectId]/components/[componentId]/[part]/$types";
  import ElementConfigPanel from "./ElementConfigPanel.svelte";
  import PreviewPanel from "./PreviewPanel.svelte";
  import StructureTreePanel from "./StructureTreePanel.svelte";
  import { templateStore } from "$lib/stores/templateElements";
  import type { CardComponent, DiceComponent } from "$lib/types";
  import { beforeNavigate } from "$app/navigation";

  let { data }: { data: PageData } = $props();

  // Capitalize the part name for display (e.g., "front" -> "Front")
  const partLabel = data.part.charAt(0).toUpperCase() + data.part.slice(1);

  const sidebarWidth = 20;

  // Load the saved design when the editor initializes
  $effect(() => {
    let savedDesign: string | null = null;

    // Only load designs for cards
    if (data.component.type === 'Card') {
      const card = data.component as CardComponent;
      savedDesign = (data.part === 'front' ? card.frontDesign : card.backDesign) ?? null;
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

  // Keyboard shortcuts for undo/redo
  function handleKeydown(event: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

    // Undo: Ctrl/Cmd+Z
    if (ctrlKey && event.key === 'z' && !event.shiftKey) {
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

<ResizablePanelContainer orientation="vertical" initialSplit={80}>
  {#snippet leftOrTop()}
    <ResizablePanelContainer initialSplit={sidebarWidth}>
      {#snippet leftOrTop()}
        <StructureTreePanel component={data.component} part={partLabel} />
      {/snippet}
      {#snippet rightOrBottom()}
        <ResizablePanelContainer
          initialSplit={100 - (sidebarWidth / (100 - sidebarWidth)) * 100}
        >
          {#snippet leftOrTop()}
            <PreviewPanel component={data.component} projectId={data.project.id} part={data.part} />
          {/snippet}
          {#snippet rightOrBottom()}
            <ElementConfigPanel component={data.component} part={partLabel} />
          {/snippet}
        </ResizablePanelContainer>
      {/snippet}
    </ResizablePanelContainer>
  {/snippet}
  {#snippet rightOrBottom()}
    <Panel title="Data Source" />
  {/snippet}
</ResizablePanelContainer>
