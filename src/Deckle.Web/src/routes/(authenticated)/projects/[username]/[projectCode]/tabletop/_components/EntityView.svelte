<script lang="ts">
  import type { Entity, EntityTemplate } from '$lib/tabletop';
  import type { GameComponent } from '$lib/types';
  import type { ContainerElement } from '$lib/components/editor/types';
  import { isEditableComponent } from '$lib/utils/componentTypes';
  import { getContext } from 'svelte';
  import StaticComponentRenderer from '../../export/_components/StaticComponentRenderer.svelte';

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

  // For dice, show a visual placeholder
  const isDice = $derived(template.type === 'Dice');
</script>

{#if isDice}
  <div class="dice-view">
    <div class="dice-face">
      <span class="dice-symbol">{template.name}</span>
    </div>
  </div>
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

  .dice-view {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f0f0f0 0%, #d4d4d8 100%);
    border-radius: 8px;
    border: 2px solid rgba(0, 0, 0, 0.15);
    box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.6);
  }

  .dice-face {
    text-align: center;
  }

  .dice-symbol {
    font-size: 1rem;
    font-weight: 700;
    color: #374151;
  }

  .no-design {
    width: 100%;
    height: 100%;
    background: #ffffff;
    border-radius: 4px;
  }
</style>
