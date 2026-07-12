<script lang="ts">
  // Fan-out/fan-in overlay for a shuffling pile. A sample of cards (always
  // including the old top and the new top) separates and re-collects; a
  // z-index swap while they're apart lands the new top on top with no visual
  // pop. Purely visual — the store owns committing the precomputed order.
  import type { Card } from '$lib/tabletop/v2';
  import {
    getTabletopApi,
    SHUFFLE_HOLD_MS,
    SHUFFLE_IN_MS,
    SHUFFLE_OUT_MS,
    SHUFFLE_STAGGER_MS,
    templateDisplaySize
  } from '$lib/tabletop/v2';
  import { onMount } from 'svelte';
  import FlipCard from './FlipCard.svelte';

  let { animatedCardIds }: { animatedCardIds: readonly string[] } = $props();

  const { store } = getTabletopApi();

  // Snapshot the animated cards at mount — the pile's order commits when the
  // fan lands, but the ghosts must keep showing pre-shuffle data until then.
  // The IIFE silences Svelte's "captures only initial value" warning; a fresh
  // shuffle re-mounts this component, so capturing once is exactly right.
  const cards: Card[] = ((ids) =>
    ids
      .map((id) => store.state.cards[id])
      .filter((c): c is Card => !!c)
      .map((c) => $state.snapshot(c) as Card))(animatedCardIds);

  // Per-card z-index. Initially the LAST card (the old top) sits on top so the
  // user sees the card they were looking at. A scheduled swap reverses this
  // once the cards have separated, leaving the FIRST card (new top) on top.
  let zIndices = $state(cards.map((_, i) => i));

  let cardEls: (HTMLElement | null)[] = $state(cards.map(() => null));

  onMount(() => {
    const N = cardEls.length;
    if (N === 0) return;

    const total = (N - 1) * SHUFFLE_STAGGER_MS + SHUFFLE_OUT_MS + SHUFFLE_HOLD_MS + SHUFFLE_IN_MS;

    cardEls.forEach((el, i) => {
      if (!el) return;

      // Alternate sides with a randomised distance/rotation so the fan looks
      // natural; a slight upward bias keeps cards off the bottom edge.
      const dir = i % 2 === 0 ? -1 : 1;
      const distance = 80 + Math.random() * 70;
      const rot = (Math.random() - 0.5) * 25 + (dir < 0 ? -8 : 8);
      const yOff = (Math.random() - 0.5) * 36 - 6;

      const outStart = i * SHUFFLE_STAGGER_MS;
      const outEnd = outStart + SHUFFLE_OUT_MS;
      const inStart = outEnd + SHUFFLE_HOLD_MS;
      const inEnd = inStart + SHUFFLE_IN_MS;

      const offsets = [0, outStart / total, outEnd / total, inStart / total, inEnd / total, 1];
      // WAAPI requires non-decreasing offsets.
      for (let k = 1; k < offsets.length; k++) {
        if (offsets[k] < offsets[k - 1]) offsets[k] = offsets[k - 1];
      }
      offsets[offsets.length - 1] = 1;

      const home = 'translate(0px, 0px) rotate(0deg)';
      const away = `translate(${dir * distance}px, ${yOff}px) rotate(${rot}deg)`;

      el.animate(
        [
          { transform: home, offset: offsets[0] },
          { transform: home, offset: offsets[1] },
          { transform: away, offset: offsets[2] },
          { transform: away, offset: offsets[3] },
          { transform: home, offset: offsets[4] },
          { transform: home, offset: offsets[5] }
        ],
        { duration: total, easing: 'ease-in-out', fill: 'forwards' }
      );
    });

    // Swap z-indices once every card is at its outer position — they no longer
    // overlap, so the change is invisible. From here the FIRST card (new top)
    // renders above its peers.
    const swapAt = (N - 1) * SHUFFLE_STAGGER_MS + SHUFFLE_OUT_MS + 20;
    const swapTimer = setTimeout(() => {
      zIndices = cards.map((_, i) => N - 1 - i);
    }, swapAt);
    return () => clearTimeout(swapTimer);
  });
</script>

<div class="shuffle-overlay">
  {#each cards as card, i (card.id + ':' + i)}
    {@const template = store.templates[card.templateId]}
    {@const size = template ? templateDisplaySize(template) : null}
    {#if template && size}
      <div
        bind:this={cardEls[i]}
        class="shuffle-card"
        style="width: {size.width}px; height: {size.height}px; z-index: {zIndices[i]};"
      >
        <div class="rotate-wrap" style="transform: rotate({card.rotation}deg);">
          <FlipCard {card} {template} />
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .shuffle-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: visible;
  }

  .shuffle-card {
    position: absolute;
    inset: 0;
    margin: auto;
    perspective: 800px;
    will-change: transform;
    transform-origin: 50% 50%;
  }

  .rotate-wrap {
    position: relative;
    width: 100%;
    height: 100%;
  }
</style>
