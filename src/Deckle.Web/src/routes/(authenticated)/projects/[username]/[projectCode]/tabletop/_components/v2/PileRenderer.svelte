<script lang="ts">
  import type { Pile } from '$lib/tabletop/v2';
  import { getTabletopApi, isPileSelected, pileFootprint, templateDisplaySize } from '$lib/tabletop/v2';
  import CardFace from './CardFace.svelte';

  let { pile }: { pile: Pile } = $props();

  const api = getTabletopApi();
  const { store, interaction } = api;

  const topCard = $derived(store.state.cards[pile.cardIds[pile.cardIds.length - 1]]);
  const template = $derived(topCard ? store.templates[topCard.templateId] : undefined);
  const footprint = $derived(pileFootprint(store.state, store.templates, pile));
  const cardSize = $derived(template ? templateDisplaySize(template) : { width: 0, height: 0 });

  const selected = $derived(isPileSelected(store.state, pile.id));
  const dragging = $derived(interaction.draggingPileId === pile.id);

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    interaction.pileDown(pile.id, api.clientToWorld(e.clientX, e.clientY));
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
>
  {#if topCard && template}
    <div
      class="top-card"
      style="width: {cardSize.width}px; height: {cardSize.height}px; transform: rotate({topCard.rotation}deg);"
    >
      <CardFace card={topCard} {template} />
    </div>
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

  .pile.dragging {
    cursor: grabbing;
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.45));
    z-index: 100;
  }

  .pile.locked {
    cursor: default;
  }

  .top-card {
    flex-shrink: 0;
  }
</style>
