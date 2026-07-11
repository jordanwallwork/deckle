<script lang="ts">
  import type { Card, Pile, Template } from '$lib/tabletop/v2';
  import {
    cardAabbSize,
    getTabletopApi,
    isPileSelected,
    pileFootprint,
    templateDisplaySize
  } from '$lib/tabletop/v2';
  import CardFace from './CardFace.svelte';

  let { pile }: { pile: Pile } = $props();

  const api = getTabletopApi();
  const { store, interaction } = api;

  const topCard = $derived(store.state.cards[pile.cardIds[pile.cardIds.length - 1]]);
  const template = $derived(topCard ? store.templates[topCard.templateId] : undefined);
  const footprint = $derived(pileFootprint(store.state, store.templates, pile));
  const cardSize = $derived(template ? templateDisplaySize(template) : { width: 0, height: 0 });

  const selected = $derived(isPileSelected(store.state, pile.id));
  const dragging = $derived(interaction.draggingPileIds.includes(pile.id));

  /**
   * Underlay peek: cards below the top card whose rotated AABB exceeds the
   * top card's — a larger or sideways card visibly pokes out behind it.
   * Fully covered cards are skipped, so a plain same-size deck renders only
   * its top card.
   */
  const underlays = $derived.by((): { card: Card; template: Template }[] => {
    if (!topCard || !template || pile.cardIds.length < 2) return [];
    const topSize = cardAabbSize(topCard, template);
    const peeking: { card: Card; template: Template }[] = [];
    for (const cardId of pile.cardIds.slice(0, -1)) {
      const card = store.state.cards[cardId];
      const cardTemplate = card ? store.templates[card.templateId] : undefined;
      if (!card || !cardTemplate) continue;
      const size = cardAabbSize(card, cardTemplate);
      if (size.width > topSize.width || size.height > topSize.height) {
        peeking.push({ card, template: cardTemplate });
      }
    }
    return peeking;
  });

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

  // The count badge is the whole-pile drag handle.
  function handleBadgePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    interaction.pileDown(pile.id, api.clientToWorld(e.clientX, e.clientY), { viaBadge: true });
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    api.openPileContextMenu(pile.id, e.clientX, e.clientY);
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
>
  {#each underlays as underlay (underlay.card.id)}
    {@const size = templateDisplaySize(underlay.template)}
    <div
      class="under-card"
      style="width: {size.width}px; height: {size.height}px; transform: rotate({underlay.card
        .rotation}deg);"
    >
      <CardFace card={underlay.card} template={underlay.template} />
    </div>
  {/each}
  {#if topCard && template}
    <div
      class="top-card"
      style="width: {cardSize.width}px; height: {cardSize.height}px; transform: rotate({topCard.rotation}deg);"
    >
      {#if template.flippable}
        <!-- 3D flip: both faces rendered, the container turns on isFlipped. -->
        <div class="flip-container" class:flipped={topCard.isFlipped}>
          <div class="flip-face">
            <CardFace card={topCard} {template} side="front" />
          </div>
          <div class="flip-face flip-back">
            <CardFace card={topCard} {template} side="back" />
          </div>
        </div>
      {:else}
        <CardFace card={topCard} {template} />
      {/if}
    </div>
  {/if}
  {#if pile.cardIds.length > 1}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span
      class="count-badge"
      title="Drag to move the whole pile"
      onpointerdown={handleBadgePointerDown}>{pile.cardIds.length}</span
    >
  {/if}
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

  .under-card {
    position: absolute;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
  }

  .top-card {
    position: relative;
    flex-shrink: 0;
    /* Perspective for the 3D flip on the card inside. */
    perspective: 800px;
  }

  .flip-container {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.35s ease;
  }

  .flip-container.flipped {
    transform: rotateY(180deg);
  }

  .flip-face {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
  }

  .flip-back {
    transform: rotateY(180deg);
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
