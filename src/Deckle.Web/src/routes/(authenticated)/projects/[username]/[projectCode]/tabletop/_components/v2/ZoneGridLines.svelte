<script lang="ts">
  // The cell lattice for a grid zone: lines at each cell boundary drawn beneath
  // the piles. Renders nothing for non-grid zones so the base renderer can drop
  // it in unconditionally.
  import type { Zone } from '$lib/tabletop/v2';
  import { gridRows } from '$lib/tabletop/v2';

  let { zone }: { zone: Zone } = $props();

  const grid = $derived(zone.type === 'grid' ? zone : null);
  const rows = $derived(grid ? gridRows(grid) : 0);
</script>

{#if grid}
  <!-- Cell lattice: lines at each cell boundary from the zone's top-left. The
       top/left edges come from the zone frame, so the gradients only need the
       interior + right/bottom lines. -->
  <div
    class="grid-lines"
    style="
      width: {grid.columns * grid.cellWidth}px;
      height: {rows * grid.cellHeight}px;
      background-size: {grid.cellWidth}px {grid.cellHeight}px;
    "
  ></div>
{/if}

<style>
  .grid-lines {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
</style>
