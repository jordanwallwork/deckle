<script lang="ts">
  import type { Entity, GroupZone } from '$lib/tabletop';
  import EntityWrapper from './EntityWrapper.svelte';

  let {
    zone,
    entities,
    isEditing
  }: {
    zone: GroupZone;
    entities: Entity[];
    isEditing: boolean;
  } = $props();
</script>

{#each entities as entity (entity.instanceId)}
  <EntityWrapper {entity} disableDrag={isEditing} />
{/each}
{#if zone.entityIds.length === 0 && !isEditing}
  <div class="group-empty">Drop entities here</div>
{/if}

<style>
  .group-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.25);
    font-size: 0.8125rem;
    font-style: italic;
    pointer-events: none;
  }
</style>
