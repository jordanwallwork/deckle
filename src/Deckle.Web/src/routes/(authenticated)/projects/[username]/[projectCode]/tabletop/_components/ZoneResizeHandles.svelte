<script lang="ts">
  // The four corner handles shown while a zone is being edited. Each forwards a
  // press to the interaction reducer as a resize-drag from that corner.
  import type { ResizeCorner, Zone } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';

  let { zone }: { zone: Zone } = $props();

  const { interaction, clientToWorld } = getTabletopApi();

  const CORNERS: ResizeCorner[] = ['nw', 'ne', 'sw', 'se'];

  function handlePointerDown(e: PointerEvent, corner: ResizeCorner) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    interaction.zoneResizeDown(zone.id, corner, clientToWorld(e.clientX, e.clientY));
  }
</script>

{#each CORNERS as corner (corner)}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="resize-handle handle-{corner}" onpointerdown={(e) => handlePointerDown(e, corner)}></div>
{/each}

<style>
  .resize-handle {
    position: absolute;
    width: 12px;
    height: 12px;
    background: #3b82f6;
    border: 2px solid #1e2030;
    border-radius: 3px;
    z-index: 21;
  }

  .handle-nw {
    top: -6px;
    left: -6px;
    cursor: nwse-resize;
  }

  .handle-ne {
    top: -6px;
    right: -6px;
    cursor: nesw-resize;
  }

  .handle-sw {
    bottom: -6px;
    left: -6px;
    cursor: nesw-resize;
  }

  .handle-se {
    bottom: -6px;
    right: -6px;
    cursor: nwse-resize;
  }
</style>
