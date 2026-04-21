<script lang="ts">
  import type { Entity, StackZone } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';
  import EntityWrapper from './EntityWrapper.svelte';
  import ShuffleAnimation from './ShuffleAnimation.svelte';

  let {
    zone,
    entities,
    isEditing,
    isSelected
  }: {
    zone: StackZone;
    entities: Entity[];
    isEditing: boolean;
    isSelected: boolean;
  } = $props();

  const store = getTabletopApi();

  const stackTopEntity = $derived(entities.length > 0 ? entities[entities.length - 1] : null);

  // While a shuffle is animating for this stack, ShuffleAnimation owns the
  // visuals end-to-end so the swap to the new top happens behind the cards
  // rather than as a snap.
  const shuffleAnimation = $derived(store.shuffleAnimation);
  const isShuffling = $derived(shuffleAnimation?.zoneId === zone.id);
</script>

{#if stackTopEntity}
  {#if !isShuffling}
    <div class="stack-top">
      {#key stackTopEntity.instanceId}
        <EntityWrapper entity={stackTopEntity} disableDrag={isEditing} />
      {/key}
    </div>
  {/if}
  {#if isShuffling && shuffleAnimation}
    <ShuffleAnimation
      animatedIds={shuffleAnimation.animatedIds}
      onComplete={() => store.completeShuffleAnimation()}
    />
  {/if}
  <div class="stack-badge" class:selected={isSelected}>{entities.length}</div>
{:else}
  <div class="stack-empty">Empty</div>
{/if}

<style>
  .stack-top {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    overflow: hidden;
    /* Let clicks on the empty area around the card fall through to the
       parent's .zone-bg, so Stack zones get the same background-click-to-
       select behaviour as Spread / Grid (whose entities don't cover the
       whole zone). The centred entity re-enables pointer events below. */
    pointer-events: none;
  }

  /* Centre the card inside the stack so rotation about its own centre lands
     within the stack's (possibly swapped) bounding box. The wrapper's own
     left/top inline styles are always 0 for stack entities, so overriding
     them here is safe. `margin: auto` with `inset: 0` centres an absolutely-
     positioned element with defined width/height. */
  .stack-top :global(.entity-wrapper) {
    inset: 0;
    margin: auto;
    pointer-events: auto;
  }

  .stack-badge {
    position: absolute;
    top: 0;
    right: 0;
    transform: translate(50%, -50%);
    z-index: 10;
    background: #3b82f6;
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    min-width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    padding: 0 6px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    pointer-events: none;
    transition: background 0.15s;
  }

  .stack-badge.selected {
    background: #f59e0b;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
  }

  .stack-empty {
    color: rgba(255, 255, 255, 0.25);
    font-size: 0.8125rem;
    font-style: italic;
  }
</style>
