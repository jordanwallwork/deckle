<script lang="ts">
  import type { Entity, GridZone } from '$lib/tabletop';
  import EntityWrapper from './EntityWrapper.svelte';

  let {
    zone,
    entities,
    isEditing,
    flipDelayFor
  }: {
    zone: GridZone;
    entities: Entity[];
    isEditing: boolean;
    flipDelayFor: (index: number) => number;
  } = $props();

  const verticalLines = $derived(
    Array.from({ length: zone.columns + 1 }, (_, i) => i * zone.cellWidth)
  );
  const horizontalLines = $derived(
    Array.from(
      { length: Math.ceil(zone.height / zone.cellHeight) + 1 },
      (_, i) => i * zone.cellHeight
    )
  );
</script>

<svg class="grid-lines" width={zone.width} height={zone.height}>
  {#each verticalLines as x}
    <line x1={x} y1={0} x2={x} y2={zone.height} stroke="rgba(255,255,255,0.08)" stroke-width="1" />
  {/each}
  {#each horizontalLines as y}
    <line x1={0} y1={y} x2={zone.width} y2={y} stroke="rgba(255,255,255,0.08)" stroke-width="1" />
  {/each}
</svg>

{#each entities as entity, i (entity.instanceId)}
  <EntityWrapper {entity} disableDrag={isEditing} flipDelay={flipDelayFor(i)} />
{/each}

<style>
  .grid-lines {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }
</style>
