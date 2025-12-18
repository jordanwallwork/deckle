<script lang="ts">
  import ComponentViewer from "$lib/components/editor/ComponentViewer.svelte";
  import Panel from "$lib/components/editor/Panel.svelte";
  import ZoomControls from "$lib/components/editor/ZoomControls.svelte";
  import type { PageData } from "../../../../routes/projects/[projectId]/components/[componentId]/[part]/$types";

  let { data }: { data: PageData } = $props();
  let dim = data.component.dimensions;

  let zoom = $state(100);
</script>

<Panel title="Preview">
  {#snippet toolbar()}
    <ZoomControls bind:zoom />
  {/snippet}
  <ComponentViewer dimensions={dim} {zoom}>
    <div
      class="card"
      style:width={dim.widthPx + "px"}
      style:height={dim.heightPx + "px"}
    >
      Component
    </div>
  </ComponentViewer>
</Panel>

<style>
  .editor-container {
    background: repeating-conic-gradient(#e5e5e5 0 25%, #fff 0 50%) 50% / 8px
      8px;
    padding: 1rem; /*temporary*/
    height: 100%;
  }

  .card {
    background-color: #fff;
    overflow: hidden;
  }

  h1 {
    font-size: 2rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 1rem;
  }

  .todo-message {
    font-size: 1.125rem;
    color: var(--color-text-secondary);
    margin-bottom: 2rem;
    padding: 1rem;
    background-color: var(--color-bg-secondary);
    border-radius: 8px;
    border-left: 4px solid var(--color-sage);
  }

  .component-info {
    text-align: left;
    background-color: var(--color-bg-secondary);
    padding: 1.5rem;
    border-radius: 8px;
  }

  .component-info p {
    margin: 0.5rem 0;
    color: var(--color-text-secondary);
  }

  .component-info strong {
    color: var(--color-text-primary);
  }
</style>
