<script lang="ts">
  import type { TemplateElement, IteratorElement } from './types';
  import ElementWrapper from './_components/element-wrapper/ElementWrapper.svelte';
  import IteratorElementComponent from './_components/elements/IteratorElement.svelte';
  import ElementContent from './_components/ElementContent.svelte';

  let { element, dpi }: { element: TemplateElement; dpi: number } = $props();
</script>

{#snippet childRenderer(child: TemplateElement)}
  <svelte:self element={child} {dpi} />
{/snippet}

{#if element.type === 'iterator'}
  <IteratorElementComponent element={element as IteratorElement} {dpi} />
{:else}
  <ElementWrapper {element} {dpi}>
    <ElementContent {element} {dpi} {childRenderer} />
  </ElementWrapper>
{/if}
