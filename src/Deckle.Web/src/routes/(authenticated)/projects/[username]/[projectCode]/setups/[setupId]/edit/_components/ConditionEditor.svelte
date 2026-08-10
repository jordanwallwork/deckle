<script lang="ts">
  import type {
    Condition,
    Comparison,
    GameSetup,
    SetupValidationError,
    ValueExpr
  } from '$lib/gamerunner';
  import { hasErrorUnder } from './errors';
  import ValueExprSlot from './ValueExprSlot.svelte';
  import Self from './ConditionEditor.svelte';

  let {
    value,
    doc,
    insideSeatLoop = false,
    errors,
    path,
    onChange
  }: {
    value: Condition;
    doc: GameSetup;
    insideSeatLoop?: boolean;
    errors: SetupValidationError[];
    path: string;
    onChange: (cond: Condition) => void;
  } = $props();

  const kind = $derived(
    'all' in value ? 'all' : 'any' in value ? 'any' : 'not' in value ? 'not' : 'cmp'
  );

  function defaultComparison(): Comparison {
    return { op: 'eq', left: { get: 'playerCount' }, right: { const: 2 } };
  }

  function setKind(k: string) {
    if (k === 'all') onChange({ all: [defaultComparison()] });
    else if (k === 'any') onChange({ any: [defaultComparison()] });
    else if (k === 'not') onChange({ not: defaultComparison() });
    else onChange(defaultComparison());
  }
</script>

<span class="cond">
  <select class="kw-select" value={kind} onchange={(e) => setKind(e.currentTarget.value)}>
    <option value="cmp">a comparison</option>
    <option value="all">all of</option>
    <option value="any">any of</option>
    <option value="not">not</option>
  </select>

  {#if 'op' in value}
    <ValueExprSlot
      value={value.left}
      {doc}
      {insideSeatLoop}
      {errors}
      path={`${path}.left`}
      onChange={(e: ValueExpr) => (value.left = e)}
    />
    <select
      class="tok"
      class:tok-error={hasErrorUnder(errors, `${path}.op`)}
      bind:value={value.op}
    >
      <option value="eq">is</option>
      <option value="ne">is not</option>
      <option value="lt">is less than</option>
      <option value="lte">is at most</option>
      <option value="gt">is more than</option>
      <option value="gte">is at least</option>
    </select>
    <ValueExprSlot
      value={value.right}
      {doc}
      {insideSeatLoop}
      {errors}
      path={`${path}.right`}
      onChange={(e: ValueExpr) => (value.right = e)}
    />
  {:else if 'not' in value}
    <span class="nested">
      <Self
        value={value.not}
        {doc}
        {insideSeatLoop}
        {errors}
        path={`${path}.not`}
        onChange={(c: Condition) => (value.not = c)}
      />
    </span>
  {:else if 'all' in value || 'any' in value}
    {@const key = 'all' in value ? 'all' : 'any'}
    {@const branch = ('all' in value ? value.all : value.any) as Condition[]}
    <span class="branch">
      {#each branch as sub, i (sub)}
        <span class="branch-item">
          <Self
            value={sub}
            {doc}
            {insideSeatLoop}
            {errors}
            path={`${path}.${key}[${i}]`}
            onChange={(c: Condition) => (branch[i] = c)}
          />
          <button class="mini" title="Remove" onclick={() => branch.splice(i, 1)}>✕</button>
        </span>
      {/each}
      <button class="mini add" onclick={() => branch.push(defaultComparison())}>＋ condition</button>
    </span>
  {/if}
</span>

<style>
  .cond {
    display: inline;
  }
  .nested,
  .branch {
    display: inline;
  }
  .branch-item {
    display: inline;
    padding: 0 0.25rem;
    border-left: 2px solid var(--color-border);
    margin-left: 0.25rem;
  }
  .kw-select,
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
  .tok-error {
    color: var(--color-danger-fg);
    text-decoration: underline wavy 1.5px var(--color-danger);
  }
  .mini {
    border: none;
    background: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 0.75rem;
    padding: 0 0.2rem;
  }
  .mini.add:hover {
    color: var(--color-accent-fg);
  }
</style>
