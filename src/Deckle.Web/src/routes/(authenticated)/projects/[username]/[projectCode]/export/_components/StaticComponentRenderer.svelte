<script lang="ts">
  import type { Dimensions, ComponentShape, RectangleShape } from '$lib/types';
  import type { ContainerElement } from '$lib/components/editor/types';
  import { mmToPx } from '$lib/utils/size.utils';
  import StaticTemplateRenderer from './StaticTemplateRenderer.svelte';
  import { setContext } from 'svelte';
  import { initDataSourceRow } from '$lib/stores/dataSourceRow';

  let {
    design,
    dimensions,
    shape,
    mergeData = null,
    projectId
  }: {
    design: ContainerElement;
    dimensions: Dimensions;
    shape?: ComponentShape;
    mergeData?: Record<string, string> | null;
    projectId?: string;
  } = $props();

  // Set projectId context for child element components
  setContext('projectId', projectId);

  // Initialize dataSourceRow context with mergeData for export/preview
  initDataSourceRow(mergeData);

  // Calculate border radius for rectangle shapes
  let borderRadius = $derived(
    !shape || shape.type !== 'rectangle'
      ? 0
      : (() => {
          const rectShape = shape as RectangleShape;
          const basePx = mmToPx(rectShape.borderRadiusMm, dimensions.dpi);
          const bleedPx = dimensions.bleedPx;
          return basePx + bleedPx; // Outer area (includes bleed)
        })()
  );

  // Build the component style string from root element background
  const componentStyle = $derived.by(() => {
    const styles = [];
    if (design.background?.color) {
      styles.push(`background-color: ${design.background.color}`);
    }
    return styles.join('; ');
  });
</script>

<div
  class="static-card"
  style="{componentStyle}; width: {dimensions.widthPx +
    2 * dimensions.bleedPx}px; height: {dimensions.heightPx +
    2 * dimensions.bleedPx}px; border-radius: {borderRadius}px"
>
  {#each design.children as child (child.id)}
    <StaticTemplateRenderer element={child} dpi={dimensions.dpi} {mergeData} {projectId} />
  {/each}
</div>

<style>
  .static-card {
    background-color: #fff;
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
  }
</style>
