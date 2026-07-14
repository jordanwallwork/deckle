<script lang="ts">
  // Renders the tabletop's three context menus (pile / zone / open-canvas) from
  // the menus controller. Presentational only — the controller owns the state.
  import ContextMenu from '$lib/components/ContextMenu.svelte';
  import PileContextMenu from './PileContextMenu.svelte';
  import type { TabletopMenus } from './tabletopMenus.svelte';
  import ZoneContextMenu from './ZoneContextMenu.svelte';

  let { menus }: { menus: TabletopMenus } = $props();
</script>

{#if menus.pile}
  <PileContextMenu
    pileId={menus.pile.pileId}
    x={menus.pile.x}
    y={menus.pile.y}
    onClose={menus.closePile}
  />
{/if}
{#if menus.zone}
  <ZoneContextMenu
    zoneId={menus.zone.zoneId}
    x={menus.zone.x}
    y={menus.zone.y}
    onClose={menus.closeZone}
  />
{/if}
{#if menus.canvas}
  <ContextMenu
    x={menus.canvas.x}
    y={menus.canvas.y}
    items={menus.canvasItems}
    onClose={menus.closeCanvas}
  />
{/if}
