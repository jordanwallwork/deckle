<script lang="ts">
  import type { Pile } from '$lib/tabletop';
  import {
    getTabletopApi,
    isPileSelected,
    pendingShuffleFor,
    pileFootprint
  } from '$lib/tabletop';
  import PileCountBadge from './PileCountBadge.svelte';
  import PileFace from './PileFace.svelte';
  import ShuffleAnimation from './ShuffleAnimation.svelte';

  let {
    pile,
    /**
     * CSS `transition-delay` (ms) for this pile's flip transition. Zone wave
     * flips stagger it by pile index so the flip ripples across the zone; 0
     * everywhere else.
     */
    flipDelay = 0
  }: { pile: Pile; flipDelay?: number } = $props();

  const api = getTabletopApi();
  const { store, interaction } = api;

  // While this pile is shuffling, ShuffleAnimation owns its visuals end-to-end
  // so the swap to the new top happens behind the fanned cards, not as a snap.
  const pendingShuffle = $derived(pendingShuffleFor(store.shuffleAnimation, pile.id));
  const isShuffling = $derived(pendingShuffle !== null);

  const footprint = $derived(pileFootprint(store.state, store.templates, pile));

  const selected = $derived(isPileSelected(store.state, pile.id));
  const dragging = $derived(interaction.draggingPileIds.includes(pile.id));

  // Plain drag pulls the top card; Alt+drag moves the whole pile;
  // Ctrl/Cmd+click toggles the pile in a multi-selection.
  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    interaction.pileDown(pile.id, api.clientToWorld(e.clientX, e.clientY), {
      alt: e.altKey,
      ctrl: e.ctrlKey || e.metaKey
    });
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    api.openPileContextMenu(pile.id, e.clientX, e.clientY);
  }

  // Double-clicking a pile selects its containing zone, so zone actions stay
  // reachable inside packed layouts.
  function handleDblClick(e: MouseEvent) {
    if (pile.zoneId === null || !store.state.zones[pile.zoneId]) return;
    e.stopPropagation();
    store.setSelection({ kind: 'zone', zoneId: pile.zoneId });
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="pile"
  class:selected
  class:dragging
  class:locked={pile.locked}
  style="left: {pile.x}px; top: {pile.y}px; width: {footprint.width}px; height: {footprint.height}px;"
  onpointerdown={handlePointerDown}
  oncontextmenu={handleContextMenu}
  ondblclick={handleDblClick}
>
  {#if isShuffling && pendingShuffle}
    <!-- The fan overlay owns the visuals until the shuffle lands. -->
    <ShuffleAnimation animatedCardIds={pendingShuffle.animatedCardIds} />
  {:else}
    <PileFace {pile} {flipDelay} />
  {/if}
  <PileCountBadge {pile} />
  {#if pile.locked}
    <span class="lock-indicator" title="Locked">🔒</span>
  {/if}
</div>

<style>
  .pile {
    position: absolute;
    /* x/y is the footprint centre */
    translate: -50% -50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    border-radius: 4px;
  }

  .pile.selected {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  /* Dragged piles float above all neighbours; the surface has no other
     stacking contexts, so this doubles as the drag overlay layer. */
  .pile.dragging {
    cursor: grabbing;
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.45));
    z-index: 100;
  }

  .pile.locked {
    cursor: default;
  }

  .lock-indicator {
    position: absolute;
    top: -8px;
    left: -8px;
    font-size: 0.6875rem;
    line-height: 1;
    background: rgba(30, 32, 48, 0.85);
    padding: 3px 4px;
    border-radius: 3px;
    pointer-events: none;
    z-index: 1;
  }
</style>
