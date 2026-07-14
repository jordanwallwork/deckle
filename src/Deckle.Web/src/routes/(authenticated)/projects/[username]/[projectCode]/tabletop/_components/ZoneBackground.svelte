<script lang="ts">
  // Renders a board/mat's designed artwork as a freeform container zone's
  // background (the `isContainer` capability). Mirrors CardFace's design
  // pipeline: the component's front design, scaled from design-space px to
  // the zone's physical-scale footprint. Purely presentational — pointer
  // events pass through to the zone body beneath.
  import type { Template } from '$lib/tabletop';
  import { templateDisplaySize } from '$lib/tabletop';
  import type { ContainerElement } from '$lib/components/editor/types';
  import type { GameComponent } from '$lib/types';
  import { isEditableComponent } from '$lib/utils/componentTypes';
  import { getContext } from 'svelte';
  import StaticComponentRenderer from '../../export/_components/StaticComponentRenderer.svelte';

  let { template }: { template: Template } = $props();

  const components = getContext<GameComponent[]>('tabletopComponents');
  const projectId = getContext<string>('projectId');

  const component = $derived(components.find((c) => c.id === template.id));
  const displaySize = $derived(templateDisplaySize(template));
  const renderScale = $derived(displaySize.width / template.widthPx);

  const design = $derived.by((): ContainerElement | null => {
    if (!component || !isEditableComponent(component)) return null;
    if (!component.frontDesign) return null;
    try {
      return JSON.parse(component.frontDesign) as ContainerElement;
    } catch {
      return null;
    }
  });

  const dimensions = $derived(
    component && isEditableComponent(component) ? component.dimensions : null
  );

  const shape = $derived(
    component && isEditableComponent(component) ? component.shape : undefined
  );
</script>

<div class="zone-background" style="width: {displaySize.width}px; height: {displaySize.height}px;">
  {#if design && dimensions}
    <div class="design-view" style="transform: scale({renderScale}); transform-origin: top left;">
      <StaticComponentRenderer {design} {dimensions} {shape} mergeData={null} {projectId} />
    </div>
  {/if}
</div>

<style>
  .zone-background {
    position: absolute;
    top: 0;
    left: 0;
    overflow: hidden;
    border-radius: 6px;
    pointer-events: none;
  }

  .design-view {
    pointer-events: none;
  }
</style>
