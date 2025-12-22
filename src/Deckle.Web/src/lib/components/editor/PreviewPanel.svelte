<script lang="ts">
  import ComponentViewer from "$lib/components/editor/ComponentViewer.svelte";
  import Panel from "$lib/components/editor/_components/Panel.svelte";
  import UndoRedoControls from "$lib/components/editor/_components/UndoRedoControls.svelte";
  import ZoomControls from "$lib/components/editor/_components/ZoomControls.svelte";
  import type { ComponentWithDimensions } from "$lib/types";
  import EditableComponent from "./EditableComponent.svelte";

  let { component }: { component: ComponentWithDimensions } = $props();
  let dimensions = component.dimensions;

  let zoom = $state(100);
</script>

<Panel title="Preview">
  {#snippet toolbar()}
    <UndoRedoControls />
    <ZoomControls bind:zoom />
  {/snippet}
  <ComponentViewer {dimensions} {zoom}>
    <EditableComponent {dimensions} />
  </ComponentViewer>
</Panel>

<style>
</style>
