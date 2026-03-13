<script lang="ts">
  import type { Snippet } from 'svelte';
  import type {
    TemplateElement,
    ContainerElement,
    TextElement,
    ImageElement,
    ShapeElement,
    GridElement
  } from '../types';
  import ImageElementComponent from './elements/ImageElement.svelte';
  import TextElementComponent from './elements/TextElement.svelte';
  import ShapeElementComponent from './elements/ShapeElement.svelte';
  import ContainerElementComponent from './elements/ContainerElement.svelte';
  import GridElementComponent from './elements/GridElement.svelte';

  let {
    element,
    dpi,
    childRenderer,
    cellChildRenderer
  }: {
    element: TemplateElement;
    dpi: number;
    childRenderer: Snippet<[TemplateElement]>;
    cellChildRenderer?: Snippet<[TemplateElement, number, number]>;
  } = $props();
</script>

{#if element.type === 'image'}
  <ImageElementComponent element={element as ImageElement} {dpi} />
{:else if element.type === 'text'}
  <TextElementComponent element={element as TextElement} {dpi} />
{:else if element.type === 'shape'}
  <ShapeElementComponent element={element as ShapeElement} {dpi}>
    {#each (element as ShapeElement).children as child (child.id)}
      {@render childRenderer(child)}
    {/each}
  </ShapeElementComponent>
{:else if element.type === 'container'}
  <ContainerElementComponent element={element as ContainerElement} {dpi}>
    {#each (element as ContainerElement).children as child (child.id)}
      {@render childRenderer(child)}
    {/each}
  </ContainerElementComponent>
{:else if element.type === 'grid'}
  <GridElementComponent element={element as GridElement} {dpi} cellChildren={cellChildRenderer} />
{/if}
