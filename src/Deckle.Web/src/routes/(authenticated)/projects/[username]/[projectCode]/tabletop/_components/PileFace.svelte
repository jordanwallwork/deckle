<script lang="ts">
  // The resting visuals of a pile: the top card plus any underlay peek. Cards
  // below the top whose rotated AABB exceeds it (a larger or sideways card)
  // poke out behind; fully covered cards are skipped, so a plain same-size deck
  // renders only its top card. The shuffle overlay replaces this while a pile
  // shuffles, so this only handles the settled state.
  import type { MaskedCard, Pile, Template } from '$lib/tabletop';
  import { cardAabbSize, getTabletopApi, templateDisplaySize } from '$lib/tabletop';
  import CardFace from './CardFace.svelte';
  import FlipCard from './FlipCard.svelte';

  let { pile, flipDelay = 0 }: { pile: Pile; flipDelay?: number } = $props();

  const api = getTabletopApi();
  const { store } = api;

  // Cards come from the masked render view (#124): under a seat perspective a
  // card whose face this viewer may not see arrives redacted (faceHidden), and
  // FlipCard/CardFace render its back. Omniscient is the live state, unchanged.
  const topCard = $derived(api.renderState.cards[pile.cardIds[pile.cardIds.length - 1]]);
  const template = $derived(topCard ? store.templates[topCard.templateId] : undefined);
  const cardSize = $derived(template ? templateDisplaySize(template) : { width: 0, height: 0 });

  const underlays = $derived.by((): { card: MaskedCard; template: Template }[] => {
    if (!topCard || !template || pile.cardIds.length < 2) return [];
    const topSize = cardAabbSize(topCard, template);
    const peeking: { card: MaskedCard; template: Template }[] = [];
    for (const cardId of pile.cardIds.slice(0, -1)) {
      const card = api.renderState.cards[cardId];
      const cardTemplate = card ? store.templates[card.templateId] : undefined;
      if (!card || !cardTemplate) continue;
      const size = cardAabbSize(card, cardTemplate);
      if (size.width > topSize.width || size.height > topSize.height) {
        peeking.push({ card, template: cardTemplate });
      }
    }
    return peeking;
  });
</script>

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
    <FlipCard card={topCard} {template} {flipDelay} />
  </div>
{/if}

<style>
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
</style>
