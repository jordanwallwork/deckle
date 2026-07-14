<script lang="ts">
  // The zone's dashed border chrome. It carries every region-state modifier
  // (selected, editing, dragging, locked, board, drop-hover, group tint) so the
  // base renderer stays free of state styling. Rendered inside the positioned
  // zone element; `inset: -2px` keeps it off the zone-local pile coordinates.
  let {
    selected = false,
    editing = false,
    dragging = false,
    locked = false,
    board = false,
    dropHover = false,
    group = false
  }: {
    selected?: boolean;
    editing?: boolean;
    dragging?: boolean;
    locked?: boolean;
    board?: boolean;
    dropHover?: boolean;
    group?: boolean;
  } = $props();
</script>

<div
  class="zone-frame"
  class:group
  class:selected
  class:editing
  class:dragging
  class:locked
  class:board
  class:drop-hover={dropHover}
></div>

<style>
  .zone-frame {
    position: absolute;
    inset: -2px;
    border-radius: 8px;
    border: 2px dashed rgba(255, 255, 255, 0.12);
    transition: border-color 0.15s;
    pointer-events: none;
  }

  /* Group (scatter tray): a soft tint marks it as the organic-scatter region. */
  .zone-frame.group {
    background: rgba(120, 90, 200, 0.08);
    border-color: rgba(150, 120, 220, 0.28);
  }

  .zone-frame.selected {
    border-color: rgba(100, 160, 255, 0.6);
  }

  .zone-frame.editing {
    border-color: #3b82f6;
    border-style: solid;
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4);
  }

  .zone-frame.dragging {
    border-color: rgba(100, 160, 255, 0.6);
  }

  .zone-frame.locked {
    border-color: rgba(255, 255, 255, 0.07);
  }

  /* Boards/mats read as solid regions: their artwork carries the edge, so the
     dashed placeholder border recedes to a faint outline. */
  .zone-frame.board {
    border-style: solid;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .zone-frame.drop-hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.08);
  }
</style>
