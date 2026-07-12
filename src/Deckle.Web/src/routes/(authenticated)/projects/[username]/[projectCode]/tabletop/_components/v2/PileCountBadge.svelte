<script lang="ts">
  // The pile's card-count badge, which doubles as the whole-pile drag handle
  // (a press forwards to the reducer as a via-badge pile-down). Only shown for
  // multi-card piles.
  import type { Pile } from '$lib/tabletop/v2';
  import { getTabletopApi } from '$lib/tabletop/v2';

  let { pile }: { pile: Pile } = $props();

  const { interaction, clientToWorld } = getTabletopApi();

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    interaction.pileDown(pile.id, clientToWorld(e.clientX, e.clientY), { viaBadge: true });
  }
</script>

{#if pile.cardIds.length > 1}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span
    class="count-badge"
    title="Drag to move the whole pile"
    onpointerdown={handlePointerDown}>{pile.cardIds.length}</span
  >
{/if}

<style>
  .count-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1e2030;
    color: #e8e9f0;
    border: 1px solid #3a3d4e;
    border-radius: 10px;
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1;
    z-index: 1;
    cursor: grab;
  }

  .count-badge:hover {
    background: #2c2f42;
    border-color: #4a4e63;
  }
</style>
