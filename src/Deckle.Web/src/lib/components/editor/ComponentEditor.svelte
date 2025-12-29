<script lang="ts">
  import ResizablePanelContainer from "$lib/components/ResizablePanelContainer.svelte";
  import Panel from "$lib/components/editor/_components/Panel.svelte";
  import type { PageData } from "../../../routes/projects/[projectId]/components/[componentId]/[part]/$types";
  import ElementConfigPanel from "./ElementConfigPanel.svelte";
  import PreviewPanel from "./PreviewPanel.svelte";
  import StructureTreePanel from "./StructureTreePanel.svelte";
  import { templateStore } from "$lib/stores/templateElements";

  let { data }: { data: PageData } = $props();

  // Capitalize the part name for display (e.g., "front" -> "Front")
  const partLabel = data.part.charAt(0).toUpperCase() + data.part.slice(1);

  const sidebarWidth = 20;

  // Select root by default when the editor loads
  $effect(() => {
    templateStore.selectElement('root');
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
</script>

<svelte:window onkeydown={handleKeydown} />

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
            <PreviewPanel component={data.component} />
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
