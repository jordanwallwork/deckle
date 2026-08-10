<script lang="ts">
  import type { GameSetup, ValueExpr, ZoneReference, SetupValidationError } from '$lib/gamerunner';
  import { hasErrorUnder } from './errors';
  import ZoneSlot from './ZoneSlot.svelte';

  let {
    value,
    doc,
    insideSeatLoop = false,
    errors,
    path,
    onChange
  }: {
    value: ValueExpr;
    doc: GameSetup;
    insideSeatLoop?: boolean;
    errors: SetupValidationError[];
    path: string;
    onChange: (expr: ValueExpr) => void;
  } = $props();

  const kind = $derived('const' in value ? 'const' : value.get);

  function setKind(k: string) {
    if (k === 'playerCount') onChange({ get: 'playerCount' });
    else if (k === 'option') onChange({ get: 'option', option: doc.options[0]?.id ?? '' });
    else if (k === 'count') onChange({ get: 'count', zone: { blueprint: '', role: '' } });
    else if (k === 'cardField') onChange({ get: 'cardField', field: '' });
    else onChange({ const: 0 });
  }

  // A literal is edited as free text; coerce to number / boolean / string so the
  // AST stays typed (validation type-checks comparison operands).
  function coerce(raw: string): number | string | boolean {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw.trim() !== '' && !Number.isNaN(Number(raw))) return Number(raw);
    return raw;
  }
</script>

<span class="expr">
  <select class="tok" value={kind} onchange={(e) => setKind(e.currentTarget.value)}>
    <option value="playerCount">the player count</option>
    <option value="option">a game option</option>
    <option value="count">cards in a zone</option>
    <option value="cardField">a card field</option>
    <option value="const">a fixed value</option>
  </select>

  {#if 'get' in value && value.get === 'option'}
    <select
      class="tok"
      class:tok-error={hasErrorUnder(errors, `${path}.option`)}
      value={value.option}
      onchange={(e) => onChange({ get: 'option', option: e.currentTarget.value })}
    >
      {#if !value.option}<option value="">an option…</option>{/if}
      {#each doc.options as o (o.id)}<option value={o.id}>{o.label}</option>{/each}
    </select>
  {:else if 'get' in value && value.get === 'count'}
    in
    <ZoneSlot
      value={value.zone}
      {doc}
      {insideSeatLoop}
      errored={hasErrorUnder(errors, `${path}.zone`)}
      onChange={(zone: ZoneReference) => onChange({ get: 'count', zone })}
    />
  {:else if 'get' in value && value.get === 'cardField'}
    <input
      class="tok tok-text"
      class:tok-error={hasErrorUnder(errors, `${path}.field`)}
      placeholder="field"
      value={value.field}
      oninput={(e) => onChange({ get: 'cardField', field: e.currentTarget.value })}
    />
  {:else if 'const' in value}
    <input
      class="tok tok-text"
      value={String(value.const)}
      oninput={(e) => onChange({ const: coerce(e.currentTarget.value) })}
    />
  {/if}
</span>

<style>
  .expr {
    display: inline;
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
  .tok-text {
    cursor: text;
    min-width: 3rem;
    width: 5rem;
  }
  .tok-error {
    color: var(--color-danger-fg);
    text-decoration: underline wavy 1.5px var(--color-danger);
  }
</style>
