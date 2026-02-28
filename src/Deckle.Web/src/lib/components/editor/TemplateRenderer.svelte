<script lang="ts">
  import type {
    TemplateElement,
    ContainerElement,
    TextElement,
    ImageElement,
    IteratorElement,
    ShapeElement
  } from './types';
  import ElementWrapper from './_components/element-wrapper/ElementWrapper.svelte';
  import TextElementComponent from './_components/elements/TextElement.svelte';
  import ContainerElementComponent from './_components/elements/ContainerElement.svelte';
  import ImageElementComponent from './_components/elements/ImageElement.svelte';
  import IteratorElementComponent from './_components/elements/IteratorElement.svelte';
  import ShapeElementComponent from './_components/elements/ShapeElement.svelte';

  let { element, dpi }: { element: TemplateElement; dpi: number } = $props();
</script>

{#if element.type === 'container'}
  <ElementWrapper {element} {dpi}>
    <ContainerElementComponent element={element as ContainerElement} {dpi} />
  </ElementWrapper>
{:else if element.type === 'text'}
  <ElementWrapper {element} {dpi}>
    <TextElementComponent element={element as TextElement} {dpi} />
  </ElementWrapper>
{:else if element.type === 'image'}
  <ElementWrapper {element} {dpi}>
    <ImageElementComponent element={element as ImageElement} {dpi} />
  </ElementWrapper>
{:else if element.type === 'iterator'}
  <IteratorElementComponent element={element as IteratorElement} {dpi} />
{:else if element.type === 'shape'}
  <ElementWrapper {element} {dpi}>
    <ShapeElementComponent element={element as ShapeElement} {dpi} />
  </ElementWrapper>
{/if}
