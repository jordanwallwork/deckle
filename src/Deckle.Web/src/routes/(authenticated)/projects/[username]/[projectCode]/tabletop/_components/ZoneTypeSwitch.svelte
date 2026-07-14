<script lang="ts">
  // The zone-type selector in the edit toolbar. Converting is a transient frame
  // of the edit session, so Escape reverts it; per-type settings are remembered,
  // so cycling back restores what was configured.
  import type { Zone, ZoneType } from '$lib/tabletop';
  import { getTabletopApi } from '$lib/tabletop';

  let { zone }: { zone: Zone } = $props();

  const { store } = getTabletopApi();

  const ZONE_TYPES: { type: ZoneType; label: string; title: string }[] = [
    { type: 'freeform', label: '▢', title: 'Freeform' },
    { type: 'grid', label: '▦', title: 'Grid' },
    { type: 'spread', label: '▤', title: 'Spread' },
    { type: 'group', label: '⁙', title: 'Group' }
  ];
</script>

<div class="type-switch" role="group" aria-label="Zone type">
  {#each ZONE_TYPES as option (option.type)}
    <button
      class="edit-btn"
      class:active={zone.type === option.type}
      onclick={() => store.convertEditingZone(option.type)}
      title={option.title}
      aria-label={option.title}
      aria-pressed={zone.type === option.type}>{option.label}</button
    >
  {/each}
</div>

<style>
  .type-switch {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    padding-right: 0.25rem;
    margin-right: 0.1rem;
    border-right: 1px solid #3a3d4e;
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
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }
</style>
