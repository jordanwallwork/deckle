<script lang="ts">
  import type { Entity, EntityTemplate } from '$lib/tabletop';
  import type { DiceComponent, GameComponent } from '$lib/types';
  import type { ContainerElement } from '$lib/components/editor/types';
  import { isEditableComponent } from '$lib/utils/componentTypes';
  import { getContext } from 'svelte';
  import StaticComponentRenderer from '../../export/_components/StaticComponentRenderer.svelte';
  import DiceView from './DiceView.svelte';

  let {
    entity,
    template,
    renderScale,
    side = 'front'
  }: {
    entity: Entity;
    template: EntityTemplate;
    renderScale: number;
    side: 'front' | 'back';
  } = $props();

  const components = getContext<GameComponent[]>('tabletopComponents');
  const projectId = getContext<string>('projectId');

  const component = $derived(components.find((c) => c.id === entity.templateId));

  const design = $derived.by((): ContainerElement | null => {
    if (!component || !isEditableComponent(component)) return null;
    const json = side === 'front' ? component.frontDesign : component.backDesign;
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
    component?.type === 'Dice' ? (component as DiceComponent) : null
  );
</script>

{#if diceComponent}
  <DiceView component={diceComponent} currentValue={entity.diceValue} />
{:else if design && dimensions}
  <div class="design-view" style="transform: scale({renderScale}); transform-origin: top left;">
    <StaticComponentRenderer
      {design}
      {dimensions}
      {shape}
      mergeData={entity.mergeData}
      {projectId}
    />
  </div>
{:else}
  <div class="no-design"></div>
{/if}

<style>
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
