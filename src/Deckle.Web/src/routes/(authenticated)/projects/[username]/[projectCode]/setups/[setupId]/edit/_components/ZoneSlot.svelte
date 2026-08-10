<script lang="ts">
  import { zoneOptions, zoneRefKey, type GameSetup, type ZoneReference } from '$lib/gamerunner';

  let {
    value,
    doc,
    insideSeatLoop = false,
    errored = false,
    onChange
  }: {
    value: ZoneReference | undefined;
    doc: GameSetup;
    insideSeatLoop?: boolean;
    errored?: boolean;
    onChange: (ref: ZoneReference) => void;
  } = $props();

  const options = $derived(zoneOptions(doc, insideSeatLoop));
  const currentKey = $derived(zoneRefKey(value));

  function handle(key: string) {
    const opt = options.find((o) => o.key === key);
    if (opt) onChange(structuredClone(opt.ref));
  }
</script>

<select
  class="tok"
  class:tok-error={errored || currentKey === ''}
  value={currentKey}
  onchange={(e) => handle(e.currentTarget.value)}
  title="Choose a zone"
>
  {#if currentKey === ''}<option value="">a zone…</option>{/if}
  {#each options as o (o.key)}
    <option value={o.key}>{o.label}</option>
  {/each}
</select>

<style>
  .tok {
    appearance: none;
    border: none;
    background: none;
    font: inherit;
    color: var(--color-accent-fg);
    font-weight: 600;
    text-decoration: underline dotted 1.5px;
    text-underline-offset: 3px;
    cursor: pointer;
    padding: 0 0.1rem;
  }
  .tok:hover {
    color: var(--color-accent-fg-hover);
    background: color-mix(in srgb, var(--color-sage) 16%, transparent);
    border-radius: 3px;
  }
  .tok-error {
    color: var(--color-danger-fg);
    text-decoration: underline wavy 1.5px var(--color-danger);
  }
</style>
