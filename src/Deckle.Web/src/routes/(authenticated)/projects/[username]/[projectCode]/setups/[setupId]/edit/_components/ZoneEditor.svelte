<script lang="ts">
  // One row of the blueprint's zone list: name, role, geometry (x/y/w/h + type)
  // and the #103 visibility preset. Edits bind straight onto the zone object,
  // which is part of the page's deep `$state` doc, so live validation + Save
  // react without a second write path. The preset dropdown is the surface over
  // the two raw axes; picking one sets both via `applyVisibilityPreset`.
  import { applyVisibilityPreset, matchVisibilityPreset, VISIBILITY_PRESETS } from '$lib/gamerunner';
  import type { Zone, ZoneScope } from '$lib/gamerunner';
  import type { ZoneType } from '$lib/tabletop/types';

  let {
    zone,
    scope,
    errored = false,
    onDelete
  }: { zone: Zone; scope: ZoneScope; errored?: boolean; onDelete: () => void } = $props();

  const ZONE_TYPES: ZoneType[] = ['freeform', 'grid', 'spread', 'group'];
  const currentPreset = $derived(matchVisibilityPreset(zone));
</script>

<div class="zone" class:errored>
  <div class="row">
    <label class="field grow">
      Name
      <input type="text" bind:value={zone.name} />
    </label>
    <label class="field grow">
      Role
      <input type="text" bind:value={zone.role} title="The label the setup script addresses this zone by" />
    </label>
    <label class="field">
      Type
      <select bind:value={zone.geometry.type}>
        {#each ZONE_TYPES as t (t)}<option value={t}>{t}</option>{/each}
      </select>
    </label>
    <button class="del" title="Delete zone" onclick={onDelete} aria-label="Delete zone">✕</button>
  </div>

  <div class="row">
    <label class="field num"><span>X</span><input type="number" bind:value={zone.geometry.rect.x} /></label>
    <label class="field num"><span>Y</span><input type="number" bind:value={zone.geometry.rect.y} /></label>
    <label class="field num"><span>W</span><input type="number" min="0" bind:value={zone.geometry.rect.width} /></label>
    <label class="field num"><span>H</span><input type="number" min="0" bind:value={zone.geometry.rect.height} /></label>

    <label class="field grow">
      Visibility
      <select
        value={currentPreset ?? ''}
        onchange={(e) => applyVisibilityPreset(zone, e.currentTarget.value)}
      >
        {#if currentPreset === null}<option value="" disabled>Custom ({zone.faceVisibility}/{zone.presence})</option>{/if}
        {#each VISIBILITY_PRESETS as p (p.id)}
          <option value={p.id} title={p.description} disabled={p.seatOnly && scope !== 'seat'}>
            {p.label}{p.seatOnly && scope !== 'seat' ? ' (seat only)' : ''}
          </option>
        {/each}
      </select>
    </label>
  </div>
</div>

<style>
  .zone {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 0.6rem;
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .zone.errored {
    border-color: var(--color-danger);
    background: var(--color-danger-bg);
  }
  .row {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }
  .field.grow {
    flex: 1;
    min-width: 8rem;
  }
  .field.num {
    flex-direction: row;
    align-items: center;
    gap: 0.25rem;
  }
  .field.num input {
    width: 4rem;
  }
  input,
  select {
    padding: 0.25rem 0.35rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background);
    color: var(--color-text-primary);
    font: inherit;
    font-size: 0.85rem;
  }
  .del {
    border: none;
    background: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.25rem 0.4rem;
    align-self: center;
  }
  .del:hover {
    color: var(--color-danger);
  }
</style>
