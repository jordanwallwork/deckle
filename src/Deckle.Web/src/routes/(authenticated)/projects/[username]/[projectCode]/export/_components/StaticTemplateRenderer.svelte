<script lang="ts">
  import type {
    TemplateElement,
    ContainerElement,
    TextElement,
    ImageElement
  } from '$lib/components/editor/types';
  import StaticTemplateRenderer from './StaticTemplateRenderer.svelte';
  import { dimensionValue, spacingToCss } from '$lib/components/editor/utils';
  import ImageElementComponent from '$lib/components/editor/_components/elements/ImageElement.svelte';
  import TextElementComponent from '$lib/components/editor/_components/elements/TextElement.svelte';
  import ContainerElementComponent from '$lib/components/editor/_components/elements/ContainerElement.svelte';

  let {
    element,
    dpi,
    mergeData = null,
    projectId
  }: {
    element: TemplateElement;
    dpi: number;
    mergeData?: Record<string, string> | null;
    projectId?: string;
  } = $props();

  // Derived positioning styles
  const position = $derived(element.position === 'absolute' ? 'absolute' : 'relative');
  const left = $derived(
    element.position === 'absolute' ? dimensionValue(element.x, dpi) : undefined
  );
  const top = $derived(
    element.position === 'absolute' ? dimensionValue(element.y, dpi) : undefined
  );
  const margin = $derived(spacingToCss(element.margin, dpi));

  const width = $derived(dimensionValue(element.dimensions?.width, dpi));
  const height = $derived(dimensionValue(element.dimensions?.height, dpi));
  const minWidth = $derived(dimensionValue(element.dimensions?.minWidth, dpi));
  const maxWidth = $derived(dimensionValue(element.dimensions?.maxWidth, dpi));
  const minHeight = $derived(dimensionValue(element.dimensions?.minHeight, dpi));
  const maxHeight = $derived(dimensionValue(element.dimensions?.maxHeight, dpi));

  const zIndex = $derived(element.zIndex);
  const opacity = $derived(element.opacity);
  const transform = $derived(
    element.rotation !== undefined && element.rotation !== 0
      ? `rotate(${element.rotation}deg)`
      : undefined
  );
</script>

{#if element.visibilityMode !== 'hide'}
  <div
    style:position
    style:left
    style:top
    style:margin
    style:width
    style:height
    style:min-width={minWidth}
    style:max-width={maxWidth}
    style:min-height={minHeight}
    style:max-height={maxHeight}
    style:z-index={zIndex}
    style:opacity
    style:transform
    data-element-id={element.id}
  >
    {#if element.type === 'image'}
      <ImageElementComponent element={element as ImageElement} {dpi} />
    {:else if element.type === 'text'}
      <TextElementComponent element={element as TextElement} {dpi} />
    {:else if element.type === 'container'}
      <ContainerElementComponent element={element as ContainerElement} {dpi}>
        {#each (element as ContainerElement).children as child (child.id)}
          <StaticTemplateRenderer element={child} {dpi} {mergeData} {projectId} />
        {/each}
      </ContainerElementComponent>
    {/if}
  </div>
{/if}
