<script lang="ts">
  import type { TemplateElement, ContainerElement, TextElement, ImageElement } from './types';
  import ElementWrapper from './_components/element-wrapper/ElementWrapper.svelte';
  import TextElementComponent from './_components/elements/TextElement.svelte';
  import ContainerElementComponent from './_components/elements/ContainerElement.svelte';
  import ImageElementComponent from './_components/elements/ImageElement.svelte';

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
{/if}
