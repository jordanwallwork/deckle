<script lang="ts">
  // A spread zone's insertion hint: a transient bar at the exact slot a drop
  // would insert at (derived from the resolver, never from geometry the
  // resolver doesn't share). Renders nothing unless this spread is the active
  // drop target, so the base renderer can drop it in unconditionally.
  import type { Zone } from '$lib/tabletop/v2';
  import { getTabletopApi, spreadSlots } from '$lib/tabletop/v2';

  let { zone }: { zone: Zone } = $props();

  const api = getTabletopApi();
  const { store } = api;

  const spread = $derived(zone.type === 'spread' ? zone : null);

  /** Zone-local primary-axis position of the insertion indicator, or null. */
  const insertSlot = $derived.by((): number | null => {
    if (!spread || api.dropHint?.zoneId !== zone.id) return null;
    const slots = spreadSlots(store.state, store.templates, spread);
    return slots[Math.min(api.dropHint.index, slots.length - 1)];
  });
</script>

{#if spread && insertSlot !== null}
  <div
    class="insert-indicator"
    class:vertical={spread.direction === 'row'}
    style={spread.direction === 'row' ? `left: ${insertSlot}px;` : `top: ${insertSlot}px;`}
  ></div>
{/if}

<style>
  .insert-indicator {
    position: absolute;
    background: #3b82f6;
    border-radius: 2px;
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.8);
    pointer-events: none;
    z-index: 30;
  }

  .insert-indicator.vertical {
    top: 6px;
    bottom: 6px;
    width: 3px;
    margin-left: -1.5px;
  }

  .insert-indicator:not(.vertical) {
    left: 6px;
    right: 6px;
    height: 3px;
    margin-top: -1.5px;
  }
</style>
