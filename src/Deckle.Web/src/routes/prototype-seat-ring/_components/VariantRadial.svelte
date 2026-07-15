<!-- PROTOTYPE — throwaway (wayfinder ticket #109). Variant A: faithful radial ring. -->
<script lang="ts">
  import {
    SEAT_W,
    SEAT_H,
    EDGE_W,
    EDGE_H,
    seatTemplate,
    stampRing,
    polar,
    type RingKnobs
  } from './model';

  let {
    knobs,
    showEdges,
    viewerSeat
  }: { knobs: RingKnobs; showEdges: boolean; viewerSeat: number } = $props();

  const VB_W = 1100;
  const VB_H = 860;
  const CX = VB_W / 2;
  const CY = VB_H / 2;

  const ring = $derived(stampRing(knobs));
  // Edges sit on a slightly tighter ring so they tuck between seat panels rather than colliding with them.
  const edgeRadius = $derived(knobs.radius * 0.82);
  const tableRadius = $derived(Math.max(90, knobs.radius - (SEAT_H / 2) * knobs.seatScale - 100));
</script>

<div class="stage">
  <svg viewBox="0 0 {VB_W} {VB_H}" preserveAspectRatio="xMidYMid meet">
    <!-- central table area -->
    <circle cx={CX} cy={CY} r={tableRadius} class="table" />
    <g transform="translate({CX}, {CY})">
      <rect x={-35} y={-52} width={70} height={98} rx={6} class="zone table-zone" />
      <text x={0} y={0} class="zone-label">draw</text>
      <rect x={45} y={-52} width={70} height={98} rx={6} class="zone table-zone" />
      <text x={80} y={0} class="zone-label">market</text>
      <rect x={-115} y={-52} width={70} height={98} rx={6} class="zone table-zone" />
      <text x={-80} y={0} class="zone-label">market</text>
    </g>

    <!-- edge zones: midway between each adjacent seat pair, always N of them -->
    {#if showEdges}
      {#each ring.edges as edge (edge.edgeIndex)}
        {@const p = polar(CX, CY, edgeRadius, edge.angleDeg)}
        <g transform="translate({p.x}, {p.y}) rotate({edge.angleDeg - 180}) scale({knobs.seatScale})">
          <rect x={-EDGE_W / 2} y={-EDGE_H / 2} width={EDGE_W} height={EDGE_H} rx={8} class="zone edge-zone" />
          <text x={0} y={-6} class="zone-label">edge {edge.edgeIndex + 1}</text>
          <text x={0} y={12} class="zone-sublabel">S{edge.between[0] + 1} ↔ S{edge.between[1] + 1}</text>
        </g>
      {/each}
    {/if}

    <!-- seats: one template stamped N times, rotated to face the table center -->
    {#each ring.seats as seat (seat.seatIndex)}
      {@const p = polar(CX, CY, knobs.radius, seat.angleDeg)}
      <g transform="translate({p.x}, {p.y}) rotate({seat.angleDeg - 180}) scale({knobs.seatScale})">
        <rect
          x={-SEAT_W / 2}
          y={-SEAT_H / 2}
          width={SEAT_W}
          height={SEAT_H}
          rx={10}
          class="seat"
          class:viewer={seat.seatIndex === viewerSeat}
          style="--seat-color: {seat.color}"
        />
        {#each seatTemplate as z (z.role)}
          <rect
            x={z.x - SEAT_W / 2}
            y={z.y - SEAT_H / 2}
            width={z.w}
            height={z.h}
            rx={5}
            class="zone seat-zone"
          />
          <text x={z.x + z.w / 2 - SEAT_W / 2} y={z.y + z.h / 2 - SEAT_H / 2 + 4} class="zone-label">
            {z.role}
          </text>
        {/each}
        <text x={0} y={-SEAT_H / 2 - 10} class="seat-label" style="fill: {seat.color}">
          Seat {seat.seatIndex + 1}{seat.seatIndex === viewerSeat ? ' (you)' : ''}
        </text>
      </g>
    {/each}
  </svg>
</div>

<style>
  .stage {
    flex: 1;
    min-height: 0;
    background: #2d5a3d;
    border-radius: 12px;
    display: flex;
  }

  svg {
    width: 100%;
    height: 100%;
  }

  .table {
    fill: #24492f;
    stroke: rgba(255, 255, 255, 0.2);
    stroke-width: 2;
    stroke-dasharray: 6 6;
  }

  .seat {
    fill: color-mix(in srgb, var(--seat-color) 22%, #1e3a28);
    stroke: var(--seat-color);
    stroke-width: 2;
  }

  .seat.viewer {
    stroke-width: 4;
  }

  .zone {
    fill: rgba(255, 255, 255, 0.08);
    stroke: rgba(255, 255, 255, 0.4);
    stroke-width: 1;
    stroke-dasharray: 4 4;
  }

  .edge-zone {
    stroke: #e8b93e;
    fill: rgba(232, 185, 62, 0.12);
  }

  .zone-label,
  .zone-sublabel,
  .seat-label {
    fill: rgba(255, 255, 255, 0.85);
    font-size: 13px;
    text-anchor: middle;
    user-select: none;
  }

  .zone-sublabel {
    font-size: 11px;
    fill: rgba(255, 255, 255, 0.55);
  }

  .seat-label {
    font-size: 15px;
    font-weight: 700;
  }
</style>
