<script lang="ts">
  // The selected blueprint's editing pane: rename, scope badge, duplicate/delete,
  // the single-seat canvas preview, and the zone list. All edits bind onto the
  // shared `$state` doc (#111 one document); delete/duplicate are delegated up so
  // the list can re-select. Delete surfaces dangling-ref warnings first.
  import { addZone, deleteZone, type Blueprint, type SetupValidationError } from '$lib/gamerunner';
  import { Button } from '$lib/components';
  import ZoneEditor from './ZoneEditor.svelte';
  import BlueprintCanvas from './BlueprintCanvas.svelte';

  let {
    blueprint,
    blueprintIndex,
    errors,
    onDuplicate,
    onDelete
  }: {
    blueprint: Blueprint;
    blueprintIndex: number;
    errors: SetupValidationError[];
    onDuplicate: () => void;
    onDelete: () => void;
  } = $props();

  const basePath = $derived(`blueprints[${blueprintIndex}]`);

  function zoneErrored(zoneIndex: number): boolean {
    return errors.some((e) => e.docPath.startsWith(`${basePath}.zones[${zoneIndex}]`));
  }
</script>

<div class="detail">
  <header>
    <input class="name" type="text" bind:value={blueprint.displayName} aria-label="Blueprint display name" />
    <span class="scope scope-{blueprint.scope}">{blueprint.scope}</span>
    <div class="spacer"></div>
    <Button variant="secondary" onclick={onDuplicate}>Duplicate</Button>
    <Button variant="danger" onclick={onDelete}>Delete</Button>
  </header>

  <BlueprintCanvas zones={blueprint.zones} scope={blueprint.scope} />

  <div class="zones-head">
    <h4>Zones ({blueprint.zones.length})</h4>
    <button class="add" onclick={() => addZone(blueprint)}>＋ add zone</button>
  </div>

  <div class="zones">
    {#each blueprint.zones as zone, i (zone.id)}
      <ZoneEditor
        {zone}
        scope={blueprint.scope}
        errored={zoneErrored(i)}
        onDelete={() => deleteZone(blueprint, zone.id)}
      />
    {/each}
    {#if blueprint.zones.length === 0}
      <p class="empty">No zones yet. Add one to define this blueprint's layout.</p>
    {/if}
  </div>
</div>

<style>
  .detail {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .name {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text-primary);
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 0.2rem 0.4rem;
  }
  .name:hover,
  .name:focus {
    border-color: var(--color-border);
    background: var(--color-surface);
  }
  .scope {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    color: var(--color-text-inverse, #fff);
  }
  .scope-seat {
    background: #4f83cc;
  }
  .scope-table {
    background: var(--color-sage, #6b8f71);
  }
  .scope-edge {
    background: #a06fce;
  }
  .spacer {
    flex: 1;
  }
  .zones-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.3rem;
  }
  .zones-head h4 {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-text-primary);
  }
  .add {
    border: none;
    background: none;
    color: var(--color-accent-fg);
    cursor: pointer;
    font: inherit;
    font-size: 0.85rem;
  }
  .add:hover {
    color: var(--color-accent-fg-hover);
  }
  .zones {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .empty {
    color: var(--color-text-muted);
    font-size: 0.85rem;
  }
</style>
