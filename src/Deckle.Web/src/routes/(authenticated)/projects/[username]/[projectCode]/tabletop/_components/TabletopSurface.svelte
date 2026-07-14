<script lang="ts">
  // The world-space contents of the canvas: zones (beneath), root piles, and
  // the marquee. Reads the store and interaction reducer off the tabletop
  // context, so the shell only supplies the transformed surface wrapper.
  import { getTabletopApi } from '$lib/tabletop';
  import PileRenderer from './PileRenderer.svelte';
  import ZoneRenderer from './ZoneRenderer.svelte';

  const { store, interaction } = getTabletopApi();
</script>

<!-- Zones render beneath root piles; each renders its own piles. -->
{#each store.state.zoneOrder as zoneId (zoneId)}
  {@const zone = store.state.zones[zoneId]}
  {#if zone}
    <ZoneRenderer {zone} />
  {/if}
{/each}
{#each store.state.rootPileIds as pileId (pileId)}
  {@const pile = store.state.piles[pileId]}
  {#if pile}
    <PileRenderer {pile} />
  {/if}
{/each}
{#if interaction.marqueeRect}
  {@const r = interaction.marqueeRect}
  <div
    class="marquee"
    style="left: {r.x}px; top: {r.y}px; width: {r.width}px; height: {r.height}px;"
  ></div>
{/if}

<style>
  .marquee {
    position: absolute;
    border: 1px solid #3b82f6;
    background: rgba(59, 130, 246, 0.12);
    pointer-events: none;
    z-index: 200;
  }
</style>
