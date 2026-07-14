<script lang="ts">
  // Edit-mode toolbar for a zone: rename, type conversion, and the per-type
  // settings (spread/grid), plus delete and done. All edits run through the
  // store's transient session, so Escape reverts the whole session.
  import type { Zone } from '$lib/tabletop';
  import { getTabletopApi, removeZone, renameZone } from '$lib/tabletop';
  import ZoneGridSettings from './ZoneGridSettings.svelte';
  import ZoneSpreadSettings from './ZoneSpreadSettings.svelte';
  import ZoneTypeSwitch from './ZoneTypeSwitch.svelte';

  let { zone }: { zone: Zone } = $props();

  const { store } = getTabletopApi();

  const spread = $derived(zone.type === 'spread' ? zone : null);
  const grid = $derived(zone.type === 'grid' ? zone : null);

  function handleRenameInput(e: Event) {
    const name = (e.target as HTMLInputElement).value;
    store.updateTransient((s) => renameZone(s, zone.id, name));
  }

  function handleRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') store.endZoneEdit(true);
    else if (e.key === 'Escape') {
      e.stopPropagation();
      store.endZoneEdit(false);
    }
  }

  // Deleting from inside the session folds into its single undo step.
  function handleDelete() {
    store.updateTransient((s) => removeZone(s, zone.id));
    store.endZoneEdit(true);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="edit-toolbar" onpointerdown={(e) => e.stopPropagation()}>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    class="rename-input"
    type="text"
    value={zone.name}
    oninput={handleRenameInput}
    onkeydown={handleRenameKeydown}
    placeholder="Zone name"
    aria-label="Zone name"
    autofocus
  />
  <ZoneTypeSwitch {zone} />
  {#if spread}
    <ZoneSpreadSettings zone={spread} />
  {/if}
  {#if grid}
    <ZoneGridSettings zone={grid} />
  {/if}
  <button class="edit-btn delete" onclick={handleDelete} title="Delete zone">✕</button>
  <button class="edit-btn done" onclick={() => store.endZoneEdit(true)} title="Done">✓</button>
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
