<script lang="ts">
  // Grid-specific edit controls: cell width/height and column count. Changes
  // re-snap contents immediately; inside the edit session they are transient
  // frames, so Escape reverts them with the rest of the session.
  import type { GridZone } from '$lib/tabletop/v2';
  import {
    getTabletopApi,
    setGridCellHeight,
    setGridCellWidth,
    setGridColumns
  } from '$lib/tabletop/v2';

  let { zone }: { zone: GridZone } = $props();

  const { store } = getTabletopApi();

  function handleCellWidthInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isNaN(value)) return;
    store.updateTransient((s) => setGridCellWidth(s, zone.id, value));
  }

  function handleCellHeightInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isNaN(value)) return;
    store.updateTransient((s) => setGridCellHeight(s, zone.id, value));
  }

  function handleColumnsInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isNaN(value)) return;
    store.updateTransient((s) => setGridColumns(s, zone.id, value));
  }
</script>

<label class="grid-field" title="Cell width (px)">
  <span aria-hidden="true">W</span>
  <input
    class="grid-input"
    type="number"
    min="20"
    step="10"
    value={zone.cellWidth}
    oninput={handleCellWidthInput}
    aria-label="Cell width (px)"
  />
</label>
<label class="grid-field" title="Cell height (px)">
  <span aria-hidden="true">H</span>
  <input
    class="grid-input"
    type="number"
    min="20"
    step="10"
    value={zone.cellHeight}
    oninput={handleCellHeightInput}
    aria-label="Cell height (px)"
  />
</label>
<label class="grid-field" title="Columns">
  <span aria-hidden="true">⌗</span>
  <input
    class="grid-input"
    type="number"
    min="1"
    step="1"
    value={zone.columns}
    oninput={handleColumnsInput}
    aria-label="Columns"
  />
</label>

<style>
  .grid-field {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    color: #8b8ea0;
    font-size: 0.75rem;
  }

  .grid-input {
    background: #2a2d3e;
    border: 1px solid #3a3d4e;
    border-radius: 4px;
    color: #e8e9f0;
    font-size: 0.8125rem;
    padding: 0.25rem 0.35rem;
    width: 3.25rem;
    outline: none;
  }

  .grid-input:focus {
    border-color: #3b82f6;
  }
</style>
