<script lang="ts">
  import ResizablePanelContainer from "$lib/components/ResizablePanelContainer.svelte";
  import Panel from "$lib/components/editor/Panel.svelte";
  import type { PageData } from "../../../routes/projects/[projectId]/components/[componentId]/[part]/$types";
  import PreviewPanel from "./panels/PreviewPanel.svelte";

  let { data }: { data: PageData } = $props();

  // Capitalize the part name for display (e.g., "front" -> "Front")
  const partLabel = data.part.charAt(0).toUpperCase() + data.part.slice(1);

  const sidebarWidth = 20;
</script>

<ResizablePanelContainer orientation="vertical" initialSplit={80}>
  {#snippet leftOrTop()}
    <ResizablePanelContainer initialSplit={sidebarWidth}>
      {#snippet leftOrTop()}
        <Panel title="Structure Tree" />
      {/snippet}
      {#snippet rightOrBottom()}
        <ResizablePanelContainer
          initialSplit={100 - (sidebarWidth / (100 - sidebarWidth)) * 100}
        >
          {#snippet leftOrTop()}
            <PreviewPanel {data} {partLabel} />
          {/snippet}
          {#snippet rightOrBottom()}
            <Panel title="Config" />
          {/snippet}
        </ResizablePanelContainer>
      {/snippet}
    </ResizablePanelContainer>
  {/snippet}
  {#snippet rightOrBottom()}
    <Panel title="Data Source" />
  {/snippet}
</ResizablePanelContainer>
