<script lang="ts">
  import {
    changeVerb,
    type Action,
    type GameSetup,
    type ProjectComponentRef,
    type SetupNode,
    type Verb,
    type ZoneReference
  } from '$lib/gamerunner';
  import { hasErrorUnder } from './errors';
  import ZoneSlot from './ZoneSlot.svelte';

  let {
    node,
    list,
    index,
    doc,
    components,
    insideSeatLoop = false,
    errors,
    path
  }: {
    node: Action;
    list: SetupNode[];
    index: number;
    doc: GameSetup;
    components: ProjectComponentRef[];
    insideSeatLoop?: boolean;
    errors: import('$lib/gamerunner').SetupValidationError[];
    path: string;
  } = $props();

  const VERB_LABELS: Record<Verb, string> = {
    placeSeats: 'Place seats',
    placeZone: 'Place zone',
    place: 'Place components',
    shuffle: 'Shuffle',
    deal: 'Deal',
    move: 'Move',
    flip: 'Flip',
    roll: 'Roll'
  };

  const seatBlueprints = $derived(doc.blueprints.filter((b) => b.scope === 'seat'));
  const nonSeatBlueprints = $derived(doc.blueprints.filter((b) => b.scope !== 'seat'));
  const dice = $derived(components.filter((c) => c.type === 'Dice'));
  const err = (suffix: string) => hasErrorUnder(errors, `${path}.${suffix}`);
</script>

<span class="sentence">
  <select
    class="verb"
    value={node.do}
    onchange={(e) => changeVerb(list, index, e.currentTarget.value as Verb)}
    title="Change step type"
  >
    {#each Object.entries(VERB_LABELS) as [v, label] (v)}
      <option value={v}>{label}</option>
    {/each}
  </select>

  {#if node.do === 'placeSeats'}
    a seat for every player using
    <select class="tok" class:tok-error={err('blueprint')} bind:value={node.blueprint}>
      {#if !node.blueprint}<option value="">a seat blueprint…</option>{/if}
      {#each seatBlueprints as b (b.id)}<option value={b.id}>{b.displayName}</option>{/each}
    </select>.
  {:else if node.do === 'placeZone'}
    the
    <select class="tok" class:tok-error={err('blueprint')} bind:value={node.blueprint}>
      {#if !node.blueprint}<option value="">a blueprint…</option>{/if}
      {#each nonSeatBlueprints as b (b.id)}<option value={b.id}>{b.displayName}</option>{/each}
    </select>
    zone onto the table.
  {:else if node.do === 'place'}
    <input class="tok tok-num" type="number" min="1" bind:value={node.count} />
    ×
    <select class="tok" class:tok-error={err('component')} bind:value={node.component}>
      {#if !node.component}<option value="">a component…</option>{/if}
      {#each components as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
    </select>
    into
    <ZoneSlot
      value={node.zone}
      {doc}
      {insideSeatLoop}
      errored={err('zone')}
      onChange={(z: ZoneReference) => (node.zone = z)}
    />
    facing
    <select class="tok" bind:value={node.facing}>
      <option value="down">down</option>
      <option value="up">up</option>
    </select>.
  {:else if node.do === 'shuffle'}
    <ZoneSlot
      value={node.zone}
      {doc}
      {insideSeatLoop}
      errored={err('zone')}
      onChange={(z: ZoneReference) => (node.zone = z)}
    />.
  {:else if node.do === 'deal'}
    {#if typeof node.count === 'number'}
      <input class="tok tok-num" type="number" min="1" bind:value={node.count} />
    {:else}
      <button class="tok" onclick={() => (node.count = 1)} title="Replace expression with a number"
        >(expression)</button
      >
    {/if}
    from
    <ZoneSlot
      value={node.from}
      {doc}
      {insideSeatLoop}
      errored={err('from')}
      onChange={(z: ZoneReference) => (node.from = z)}
    />
    to
    <ZoneSlot
      value={node.to}
      {doc}
      {insideSeatLoop}
      errored={err('to')}
      onChange={(z: ZoneReference) => (node.to = z)}
    />
    facing
    <select class="tok" bind:value={node.facing}>
      <option value="down">down</option>
      <option value="up">up</option>
    </select>.
  {:else if node.do === 'move'}
    <input
      class="tok tok-num"
      type="number"
      min="1"
      placeholder="all"
      value={node.count ?? ''}
      oninput={(e) =>
        (node.count = e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))}
    />
    from
    <ZoneSlot
      value={node.from}
      {doc}
      {insideSeatLoop}
      errored={err('from')}
      onChange={(z: ZoneReference) => (node.from = z)}
    />
    to
    <ZoneSlot
      value={node.to}
      {doc}
      {insideSeatLoop}
      errored={err('to')}
      onChange={(z: ZoneReference) => (node.to = z)}
    />.
  {:else if node.do === 'flip'}
    <ZoneSlot
      value={node.zone}
      {doc}
      {insideSeatLoop}
      errored={err('zone')}
      onChange={(z: ZoneReference) => (node.zone = z)}
    />
    facing
    <select class="tok" bind:value={node.facing}>
      <option value="up">up</option>
      <option value="down">down</option>
    </select>.
  {:else if node.do === 'roll'}
    <select class="tok" class:tok-error={err('component')} bind:value={node.component}>
      {#if !node.component}<option value="">dice…</option>{/if}
      {#each dice as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
    </select>.
  {/if}
</span>

<style>
  .sentence {
    display: inline;
    line-height: 1.9;
  }
  .verb {
    appearance: none;
    border: none;
    background: color-mix(in srgb, var(--color-sage) 18%, transparent);
    border-radius: 4px;
    font: inherit;
    font-weight: 700;
    color: var(--color-text-primary);
    cursor: pointer;
    padding: 0 0.2rem;
  }
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
  }
  .tok-num {
    width: 2.8rem;
    text-align: center;
    cursor: text;
  }
  .tok-error {
    color: var(--color-danger-fg);
    text-decoration: underline wavy 1.5px var(--color-danger);
  }
</style>
