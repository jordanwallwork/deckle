<script lang="ts">
  import Panel from './_components/Panel.svelte';
  import ContainerConfig from './_components/configuration/ContainerConfig.svelte';
  import TextConfig from './_components/configuration/TextConfig.svelte';
  import ImageConfig from './_components/configuration/ImageConfig.svelte';
  import IteratorConfig from './_components/configuration/IteratorConfig.svelte';
  import ComponentConfig from './_components/configuration/ComponentConfig.svelte';
  import { templateStore } from '$lib/stores/templateElements';
  import type { ContainerElement, TextElement, ImageElement, IteratorElement } from './types';
  import type { EditableComponent } from '$lib/types';

  let {
    component,
    part,
    readOnly = false
  }: { component: EditableComponent; part?: string; readOnly?: boolean } = $props();

  const selectedElement = $derived(
    $templateStore.selectedElementId
      ? templateStore.getElement($templateStore.selectedElementId)
      : null
  );

  const isRootSelected = $derived($templateStore.selectedElementId === 'root');
</script>

<Panel noheader>
  {#snippet children()}
    {#if isRootSelected}
      <ComponentConfig {component} {part} />
    {:else if selectedElement}
      {#if selectedElement.type === 'container'}
        <ContainerConfig element={selectedElement as ContainerElement} />
      {:else if selectedElement.type === 'text'}
        <TextConfig element={selectedElement as TextElement} />
      {:else if selectedElement.type === 'image'}
        <ImageConfig element={selectedElement as ImageElement} />
      {:else if selectedElement.type === 'iterator'}
        <IteratorConfig element={selectedElement as IteratorElement} />
      {/if}
    {:else}
      <div class="empty-state">
        <p>No element selected</p>
        <p class="hint">Select an element from the structure tree to edit its properties</p>
      </div>
    {/if}
  {/snippet}
</Panel>

<style>
  .empty-state {
    text-align: center;
    padding: 2rem 1rem;
    color: #999;
  }

  .empty-state p {
    margin: 0;
  }

  .empty-state .hint {
    font-size: 0.75rem;
    margin-top: 0.5rem;
  }
</style>
