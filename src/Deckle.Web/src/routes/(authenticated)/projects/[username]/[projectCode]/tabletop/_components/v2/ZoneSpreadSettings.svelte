<script lang="ts">
  // Spread-specific edit controls: layout direction and card overlap. Changes
  // relayout immediately; inside the edit session they are transient frames, so
  // Escape reverts them with the rest of the session.
  import type { SpreadZone } from '$lib/tabletop/v2';
  import { getTabletopApi, setSpreadDirection, setSpreadOverlap } from '$lib/tabletop/v2';
  import { transientNumberInput } from './zoneSettingsInput';

  let { zone }: { zone: SpreadZone } = $props();

  const { store } = getTabletopApi();

  function handleDirection(direction: 'row' | 'column') {
    store.updateTransient((s) => setSpreadDirection(s, store.templates, zone.id, direction));
  }

  const handleOverlapInput = transientNumberInput(store, (s, v) =>
    setSpreadOverlap(s, store.templates, zone.id, v)
  );
</script>

<button
  class="edit-btn"
  class:active={zone.direction === 'row'}
  onclick={() => handleDirection('row')}
  title="Row layout">↔</button
>
<button
  class="edit-btn"
  class:active={zone.direction === 'column'}
  onclick={() => handleDirection('column')}
  title="Column layout">↕</button
>
<input
  class="overlap-input"
  type="number"
  min="0"
  step="5"
  value={zone.overlap}
  oninput={handleOverlapInput}
  title="Overlap (px)"
  aria-label="Overlap (px)"
/>

<style>
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
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }

  .overlap-input {
    background: #2a2d3e;
    border: 1px solid #3a3d4e;
    border-radius: 4px;
    color: #e8e9f0;
    font-size: 0.8125rem;
    padding: 0.25rem 0.35rem;
    width: 4rem;
    outline: none;
  }

  .overlap-input:focus {
    border-color: #3b82f6;
  }
</style>
