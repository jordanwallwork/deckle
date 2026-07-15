<!-- PROTOTYPE — throwaway (wayfinder ticket #109). Variant B: BGA-style unrotated rows.
     The ring flattens: viewer's seat full-size at the bottom, other seats in ring order across the top,
     edge zones slotted between the seats they sit between (the two edges touching the viewer flank their panel). -->
<script lang="ts">
  import {
    seatTemplate,
    stampRing,
    ringOrderFrom,
    PLAYER_COLORS,
    type RingKnobs
  } from './model';

  let {
    knobs,
    showEdges,
    viewerSeat
  }: { knobs: RingKnobs; showEdges: boolean; viewerSeat: number } = $props();

  const ring = $derived(stampRing(knobs));
  const others = $derived(ringOrderFrom(viewerSeat, knobs.playerCount));
  // Edge k sits between seats k and k+1. Interleave: after each "other" seat, the edge to its ring-successor —
  // except the last one, whose successor is the viewer; that edge and the viewer's own outgoing edge flank the bottom panel.
  const viewerOutEdge = $derived(ring.edges.find((e) => e.between[0] === viewerSeat));
  const viewerInEdge = $derived(ring.edges.find((e) => e.between[1] === viewerSeat));
  const topEdgeAfter = $derived((seatIndex: number) => {
    const e = ring.edges.find((x) => x.between[0] === seatIndex);
    return e && e.between[1] !== viewerSeat ? e : undefined;
  });
</script>

{#snippet seatPanel(seatIndex: number, big: boolean)}
  <div
    class="seat"
    class:big
    class:viewer={seatIndex === viewerSeat}
    style="--seat-color: {PLAYER_COLORS[seatIndex % PLAYER_COLORS.length]}"
  >
    <div class="seat-name">Seat {seatIndex + 1}{seatIndex === viewerSeat ? ' (you)' : ''}</div>
    <div class="seat-zones">
      {#each seatTemplate as z (z.role)}
        <div
          class="zone"
          style="left: {(z.x / 300) * 100}%; top: {(z.y / 150) * 100}%; width: {(z.w / 300) *
            100}%; height: {(z.h / 150) * 100}%"
        >
          {z.role}
        </div>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet edgePanel(edge: { edgeIndex: number; between: [number, number] })}
  <div class="edge">
    <div class="edge-name">edge {edge.edgeIndex + 1}</div>
    <div class="edge-between">S{edge.between[0] + 1} ↔ S{edge.between[1] + 1}</div>
  </div>
{/snippet}

<div class="stage">
  {#if others.length > 0}
    <div class="others" style="--panel-scale: {knobs.seatScale}">
      {#each others as seatIndex (seatIndex)}
        {@render seatPanel(seatIndex, false)}
        {#if showEdges}
          {@const e = topEdgeAfter(seatIndex)}
          {#if e}{@render edgePanel(e)}{/if}
        {/if}
      {/each}
    </div>
  {/if}

  <div class="table-strip">
    <div class="table-zone">draw</div>
    <div class="table-zone">market</div>
    <div class="table-zone">market</div>
  </div>

  <div class="bottom" style="--panel-scale: {knobs.seatScale}">
    {#if showEdges && viewerInEdge}
      {@render edgePanel(viewerInEdge)}
    {/if}
    {@render seatPanel(viewerSeat, true)}
    {#if showEdges && viewerOutEdge && viewerOutEdge !== viewerInEdge}
      {@render edgePanel(viewerOutEdge)}
    {/if}
  </div>
</div>

<style>
  .stage {
    flex: 1;
    min-height: 0;
    background: #2d5a3d;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: auto;
  }

  .others {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    align-items: center;
  }

  .bottom {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    align-items: center;
    margin-top: auto;
  }

  .seat {
    position: relative;
    width: calc(240px * var(--panel-scale, 1));
    aspect-ratio: 2;
    background: color-mix(in srgb, var(--seat-color) 22%, #1e3a28);
    border: 2px solid var(--seat-color);
    border-radius: 10px;
    flex-shrink: 0;
  }

  .seat.big {
    width: calc(420px * var(--panel-scale, 1));
  }

  .seat.viewer {
    border-width: 4px;
  }

  .seat-name {
    position: absolute;
    top: -1.4rem;
    left: 0.25rem;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--seat-color);
    white-space: nowrap;
  }

  .seat-zones {
    position: absolute;
    inset: 0;
  }

  .zone {
    position: absolute;
    border: 1px dashed rgba(255, 255, 255, 0.4);
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.7rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .edge {
    width: calc(110px * var(--panel-scale, 1));
    aspect-ratio: 130 / 80;
    border: 1px dashed #e8b93e;
    background: rgba(232, 185, 62, 0.12);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .edge-between {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.55);
  }

  .table-strip {
    display: flex;
    gap: 1rem;
    justify-content: center;
    padding: 1rem;
    border: 2px dashed rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    background: #24492f;
  }

  .table-zone {
    width: 70px;
    height: 98px;
    border: 1px dashed rgba(255, 255, 255, 0.4);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
