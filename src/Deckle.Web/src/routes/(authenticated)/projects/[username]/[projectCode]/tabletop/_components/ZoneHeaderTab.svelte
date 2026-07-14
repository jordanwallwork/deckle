<script lang="ts">
  // The zone's header tab: its name/count/lock readout and the ONLY move
  // handle. A press forwards to the interaction reducer as a zone-down (drag to
  // move, click to select). Only rendered outside edit mode.
  import type { Zone } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';

  let { zone, selected = false }: { zone: Zone; selected?: boolean } = $props();

  const { interaction, clientToWorld } = getTabletopApi();

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    interaction.zoneDown(zone.id, clientToWorld(e.clientX, e.clientY));
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="header-tab"
  class:selected
  title="Drag to move the zone"
  onpointerdown={handlePointerDown}
>
  <span class="zone-name">{zone.name}</span>
  {#if zone.pileIds.length > 0}
    <span class="zone-count">{zone.pileIds.length}</span>
  {/if}
  {#if zone.locked}
    <span class="lock-badge" title="Locked">🔒</span>
  {/if}
</div>

<style>
  .header-tab {
    position: absolute;
    top: -24px;
    left: 8px;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    height: 22px;
    padding: 0 8px;
    background: rgba(30, 32, 48, 0.9);
    border: 1px solid #3a3d4e;
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    cursor: grab;
    user-select: none;
    z-index: 1;
  }

  .header-tab.selected {
    border-color: rgba(100, 160, 255, 0.6);
  }

  .zone-name {
    font-size: 0.6875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.55);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .zone-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: #3b82f6;
    color: white;
    font-size: 0.625rem;
    font-weight: 700;
  }

  .lock-badge {
    font-size: 0.625rem;
    line-height: 1;
  }
</style>
