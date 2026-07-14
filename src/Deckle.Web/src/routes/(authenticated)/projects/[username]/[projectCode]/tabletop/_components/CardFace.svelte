<script lang="ts">
  import type { Card, Template } from '$lib/tabletop';
  import { templateDisplaySize } from '$lib/tabletop';
  import type { ContainerElement } from '$lib/components/editor/types';
  import type { DiceComponent, GameComponent } from '$lib/types';
  import { isEditableComponent } from '$lib/utils/componentTypes';
  import { getContext } from 'svelte';
  import StaticComponentRenderer from '../../export/_components/StaticComponentRenderer.svelte';
  import DiceView from './DiceView.svelte';

  let {
    card,
    template,
    side
  }: {
    card: Card;
    template: Template;
    /**
     * Force which face to render (for the 3D flip transition, which shows
     * both). Defaults to whichever face card.isFlipped says is up.
     */
    side?: 'front' | 'back';
  } = $props();

  const components = getContext<GameComponent[]>('tabletopComponents');
  const projectId = getContext<string>('projectId');

  const component = $derived(components.find((c) => c.id === card.templateId));

  const displaySize = $derived(templateDisplaySize(template));
  const renderScale = $derived(displaySize.width / template.widthPx);

  const showBack = $derived(side ? side === 'back' : card.isFlipped);

  const design = $derived.by((): ContainerElement | null => {
    if (!component || !isEditableComponent(component)) return null;
    const json = showBack ? component.backDesign : component.frontDesign;
    if (!json) return null;
    try {
      return JSON.parse(json) as ContainerElement;
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

  const diceComponent = $derived(
    template.faces !== undefined && component ? (component as DiceComponent) : null
  );
</script>

<div class="card-face" style="width: {displaySize.width}px; height: {displaySize.height}px;">
  {#if diceComponent}
    <DiceView component={diceComponent} currentValue={card.diceValue} />
  {:else if design && dimensions}
    <div class="design-view" style="transform: scale({renderScale}); transform-origin: top left;">
      <StaticComponentRenderer {design} {dimensions} {shape} mergeData={card.mergeData} {projectId} />
    </div>
  {:else}
    <div class="no-design"></div>
  {/if}
</div>

<style>
  .card-face {
    overflow: hidden;
    border-radius: 4px;
  }

  .design-view {
    pointer-events: none;
  }

  .no-design {
    width: 100%;
    height: 100%;
    background: #ffffff;
    border-radius: 4px;
  }
</style>
