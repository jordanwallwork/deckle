<script lang="ts">
  import type { Zone, ZoneType } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';

  let {
    zone,
    onDone,
    onDelete
  }: {
    zone: Zone;
    onDone: () => void;
    onDelete: () => void;
  } = $props();

  const store = getTabletopApi();

  // Freeform is omitted from the type selector: freeform zones appear
  // automatically when entities are detached/dropped onto open canvas,
  // and converting any other zone back to freeform would scatter its
  // contents without serving a real editing intent.
  const SWITCHABLE_TYPES: ZoneType[] = ['grid', 'group', 'stack', 'spread'];

  function handleRenameInput(e: Event) {
    store.renameZoneTransient(zone.id, (e.target as HTMLInputElement).value);
  }

  function handleTypeChange(newType: ZoneType) {
    if (zone.type === newType) return;
    store.changeZoneTypeTransient(zone.id, newType);
  }

  function handleDirectionToggle() {
    if (zone.type !== 'spread') return;
    store.setSpreadDirection(zone.id, zone.direction === 'row' ? 'column' : 'row');
  }

  function handleOverlapInput(e: Event) {
    if (zone.type !== 'spread') return;
    const value = Number.parseInt((e.target as HTMLInputElement).value, 10);
    if (Number.isNaN(value)) return;
    store.setSpreadOverlapTransient(zone.id, value);
  }

  function parseGridInput(e: Event): number | null {
    const value = Number.parseInt((e.target as HTMLInputElement).value, 10);
    return Number.isNaN(value) ? null : value;
  }

  function handleGridInput(field: 'cellWidth' | 'cellHeight' | 'columns') {
    return (e: Event) => {
      if (zone.type !== 'grid') return;
      const value = parseGridInput(e);
      if (value === null) return;
      const { cellWidth, cellHeight, columns } = zone;
      const next = { cellWidth, cellHeight, columns, [field]: value };
      store.setGridCellSizeTransient(zone.id, next.cellWidth, next.cellHeight, next.columns);
    };
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="edit-toolbar" onpointerdown={(e) => e.stopPropagation()}>
  <input
    class="rename-input"
    type="text"
    value={zone.name}
    oninput={handleRenameInput}
    onkeydown={(e) => e.key === 'Enter' && onDone()}
    placeholder="Zone name"
    aria-label="Zone name"
  />
  {#if zone.type !== 'freeform'}
    <div class="type-selector" role="group" aria-label="Zone type">
      {#each SWITCHABLE_TYPES as t}
        <button
          class="type-btn"
          class:active={zone.type === t}
          onclick={() => handleTypeChange(t)}
          title="Switch to {t} zone"
        >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
      {/each}
    </div>
  {/if}
  {#if zone.type === 'spread'}
    <button class="edit-btn" onclick={handleDirectionToggle} title="Toggle direction">
      {zone.direction === 'row' ? '↔' : '↕'}
    </button>
    <label class="overlap-control" title="Overlap (px)">
      <span class="overlap-label">⇔</span>
      <input
        class="overlap-input"
        type="number"
        value={zone.overlap}
        oninput={handleOverlapInput}
        step="1"
        aria-label="Overlap in pixels"
      />
    </label>
  {:else if zone.type === 'grid'}
    <label class="grid-control" title="Cell width (px)">
      <span class="grid-label">W</span>
      <input class="grid-input" type="number" value={zone.cellWidth} oninput={handleGridInput('cellWidth')} min="1" step="1" aria-label="Cell width" />
    </label>
    <label class="grid-control" title="Cell height (px)">
      <span class="grid-label">H</span>
      <input class="grid-input" type="number" value={zone.cellHeight} oninput={handleGridInput('cellHeight')} min="1" step="1" aria-label="Cell height" />
    </label>
    <label class="grid-control" title="Columns">
      <span class="grid-label">Cols</span>
      <input class="grid-input" type="number" value={zone.columns} oninput={handleGridInput('columns')} min="1" step="1" aria-label="Columns" />
    </label>
  {:else if zone.type === 'stack'}
    <button
      class="edit-btn"
      class:active={zone.faceDown}
      onclick={() => store.setStackFaceDownTransient(zone.id, !zone.faceDown)}
      title={zone.faceDown ? 'Face down (click to face up)' : 'Face up (click to face down)'}
    >{zone.faceDown ? '▽' : '△'}</button>
    <button
      class="edit-btn"
      class:active={zone.persistent}
      onclick={() => store.setStackPersistentTransient(zone.id, !zone.persistent)}
      title={zone.persistent ? 'Persistent (click to auto-dissolve)' : 'Auto-dissolve (click to persist)'}
    >📌</button>
  {/if}
  <button class="edit-btn delete" onclick={onDelete} title="Delete zone">✕</button>
  <button class="edit-btn done" onclick={onDone} title="Done">✓</button>
</div>

<style>
  .edit-toolbar {
    position: absolute;
    top: -36px;
    left: 0;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem;
    background: #1e2030;
    border: 1px solid #3a3d4e;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    z-index: 20;
  }

  .rename-input {
    background: #2a2d3e;
    border: 1px solid #3a3d4e;
    border-radius: 4px;
    color: #e8e9f0;
    font-size: 0.8125rem;
    padding: 0.25rem 0.5rem;
    min-width: 140px;
    outline: none;
  }

  .rename-input:focus {
    border-color: #3b82f6;
  }

  .type-selector {
    display: flex;
    align-items: center;
    border: 1px solid #3a3d4e;
    border-radius: 4px;
    overflow: hidden;
  }

  .type-btn {
    background: #2a2d3e;
    border: none;
    border-right: 1px solid #3a3d4e;
    color: #8a8d9e;
    padding: 0 0.4rem;
    height: 1.75rem;
    cursor: pointer;
    font-size: 0.6875rem;
    font-weight: 600;
    transition: background 0.1s, color 0.1s;
    white-space: nowrap;
  }

  .type-btn:last-child {
    border-right: none;
  }

  .type-btn:hover {
    background: #3a3d4e;
    color: #c8cad8;
  }

  .type-btn.active {
    background: #1d4ed8;
    color: white;
  }

  .grid-control,
  .overlap-control {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: #2a2d3e;
    border: 1px solid #3a3d4e;
    border-radius: 4px;
    padding: 0 0.25rem;
    color: #c8cad8;
    font-size: 0.75rem;
  }

  .grid-label,
  .overlap-label {
    font-size: 0.6875rem;
    opacity: 0.7;
    white-space: nowrap;
  }

  .grid-input,
  .overlap-input {
    background: transparent;
    border: none;
    color: #e8e9f0;
    font-size: 0.75rem;
    padding: 0.25rem;
    outline: none;
  }

  .grid-input {
    width: 3rem;
  }

  .overlap-input {
    width: 3.5rem;
  }

  .edit-btn {
    background: #2a2d3e;
    border: 1px solid #3a3d4e;
    color: #c8cad8;
    border-radius: 4px;
    width: 1.75rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.1s;
  }

  .edit-btn:hover {
    background: #3a3d4e;
  }

  .edit-btn.active {
    background: #1e3a5f;
    border-color: #2563eb;
    color: #93c5fd;
  }

  .edit-btn.done {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }

  .edit-btn.done:hover {
    background: #1d4ed8;
  }

  .edit-btn.delete:hover {
    background: #7f1d1d;
    border-color: #991b1b;
    color: #fecaca;
  }
</style>
