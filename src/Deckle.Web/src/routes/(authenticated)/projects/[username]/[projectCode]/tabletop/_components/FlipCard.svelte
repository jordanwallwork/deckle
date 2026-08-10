<script lang="ts">
  // A single card face with the 3D flip mechanism. Flippable templates render
  // both faces and turn the container on isFlipped; non-flippable ones render a
  // plain face. The caller owns sizing/rotation and perspective — this only
  // supplies the flip. flipDelay staggers a zone's wave flip (0 elsewhere).
  import type { MaskedCard, Template } from '$lib/tabletop';
  import CardFace from './CardFace.svelte';

  let {
    card,
    template,
    flipDelay = 0
  }: { card: MaskedCard; template: Template; flipDelay?: number } = $props();
</script>

{#if card.faceHidden}
  <!-- Redacted under a seat perspective (#124): show only the back, never the
       front DOM, so no identity can leak through the 3D flip. -->
  <CardFace {card} {template} side="back" />
{:else if template.flippable}
  <!-- 3D flip: both faces rendered, the container turns on isFlipped. -->
  <div class="flip-container" class:flipped={card.isFlipped} style="transition-delay: {flipDelay}ms;">
    <div class="flip-face">
      <CardFace {card} {template} side="front" />
    </div>
    <div class="flip-face flip-back">
      <CardFace {card} {template} side="back" />
    </div>
  </div>
{:else}
  <CardFace {card} {template} />
{/if}

<style>
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
</style>
