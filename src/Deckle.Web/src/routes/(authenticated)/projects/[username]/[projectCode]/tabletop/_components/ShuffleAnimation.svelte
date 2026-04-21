<script lang="ts">
  import type { Entity } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';
  import { getTemplateDisplaySize } from '$lib/tabletop/initialization';
  import { onMount } from 'svelte';
  import EntityView from './EntityView.svelte';

  let {
    animatedIds,
    onComplete
  }: {
    animatedIds: readonly string[];
    onComplete: () => void;
  } = $props();

  const store = getTabletopApi();

  // Snapshot entities at mount — the underlying state mutates when the
  // animation completes, but our ghost cards must keep showing the pre-
  // shuffle data right up to the final frame. The IIFE is just to silence
  // Svelte's "captures only initial value" warning; that's exactly what we
  // want here since the parent re-mounts us when a new shuffle starts.
  const cards: Entity[] = ((ids) =>
    ids
      .map((id) => store.state.entities[id])
      .filter((e): e is Entity => !!e)
      .map((e) => $state.snapshot(e)))(animatedIds);

  // Per-card z-index. Initially the LAST card (the old top) sits on top, so
  // the user sees the same card they were just looking at. A scheduled swap
  // reverses this once the cards have separated, leaving the FIRST card
  // (the new top) on top when they regroup.
  let zIndices = $state(cards.map((_, i) => i));

  let cardEls: (HTMLElement | null)[] = $state(cards.map(() => null));

  onMount(() => {
    const N = cardEls.length;
    if (N === 0) {
      onComplete();
      return;
    }

    const STAGGER = 70;
    const OUT_DUR = 220;
    const HOLD_DUR = 100;
    const IN_DUR = 240;
    const total = (N - 1) * STAGGER + OUT_DUR + HOLD_DUR + IN_DUR;

    cardEls.forEach((el, i) => {
      if (!el) return;

      // Alternate sides with a randomised distance/rotation so the fan
      // looks natural. Slight upward bias so cards don't all overshoot
      // the bottom of the surface.
      const dir = i % 2 === 0 ? -1 : 1;
      const distance = 80 + Math.random() * 70;
      const rot = (Math.random() - 0.5) * 25 + (dir < 0 ? -8 : 8);
      const yOff = (Math.random() - 0.5) * 36 - 6;

      const outStart = i * STAGGER;
      const outEnd = outStart + OUT_DUR;
      const inStart = outEnd + HOLD_DUR;
      const inEnd = inStart + IN_DUR;

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
        {
          duration: total,
          easing: 'ease-in-out',
          fill: 'forwards'
        }
      );
    });

    // Swap z-indices once every card is at its outer position — they no
    // longer overlap, so the change is invisible. From this point on the
    // FIRST card (the new top) renders above its peers.
    const swapAt = (N - 1) * STAGGER + OUT_DUR + 20;
    const swapTimer = setTimeout(() => {
      zIndices = cards.map((_, i) => N - 1 - i);
    }, swapAt);

    const completeTimer = setTimeout(onComplete, total + 30);
    return () => {
      clearTimeout(swapTimer);
      clearTimeout(completeTimer);
    };
  });
</script>

<div class="shuffle-overlay">
  {#each cards as entity, i (entity.instanceId + ':' + i)}
    {@const template = store.templates[entity.templateId]}
    {@const displaySize = template ? getTemplateDisplaySize(template) : null}
    {@const renderScale =
      template && template.widthPx > 0 && displaySize ? displaySize.width / template.widthPx : 1}
    <div
      bind:this={cardEls[i]}
      class="shuffle-card"
      style="
        width: {displaySize?.width ?? 100}px;
        height: {displaySize?.height ?? 100}px;
        z-index: {zIndices[i]};
      "
    >
      <div class="rotate-wrap" style="transform: rotate({entity.rotation}deg);">
        <div class="entity-flip-container" class:flipped={entity.isFlipped}>
          <div class="entity-front">
            <EntityView {entity} {template} {renderScale} side="front" />
          </div>
          <div class="entity-back">
            <EntityView {entity} {template} {renderScale} side="back" />
          </div>
        </div>
      </div>
    </div>
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
    border-radius: 6px;
    perspective: 800px;
    will-change: transform;
    transform-origin: 50% 50%;
  }

  .rotate-wrap {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .entity-flip-container {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
  }

  .entity-flip-container.flipped {
    transform: rotateY(180deg);
  }

  .entity-front,
  .entity-back {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    border-radius: 6px;
    overflow: hidden;
  }

  .entity-back {
    transform: rotateY(180deg);
  }
</style>
