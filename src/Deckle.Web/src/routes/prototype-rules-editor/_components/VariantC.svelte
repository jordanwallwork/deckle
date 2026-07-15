<!-- PROTOTYPE — throwaway (wayfinder ticket #105). Variant C: step list + inspector. -->
<script lang="ts">
  import {
    isWhen,
    isForEach,
    isComparison,
    isAction,
    zoneChoices,
    zoneKey,
    refFromKey,
    stepErrors,
    stepSummary,
    verbIcons,
    componentList,
    optionDecls,
    tableZones,
    newStepPresets,
    type Step,
    type ActionStep,
    type Comparison
  } from './dsl';
  import { editor } from './state.svelte';

  type Selection = { step: Step; parent: Step[] } | null;
  let selection = $state<Selection>(null);

  const selected = $derived(selection?.step ?? null);

  function select(step: Step, parent: Step[]) {
    selection = { step, parent };
  }

  function deleteSelected() {
    if (!selection) return;
    const idx = selection.parent.indexOf(selection.step);
    if (idx >= 0) selection.parent.splice(idx, 1);
    selection = null;
  }

  function addStep(presetIndex: number) {
    const step = newStepPresets[presetIndex].make();
    if (selection) {
      const idx = selection.parent.indexOf(selection.step);
      selection.parent.splice(idx + 1, 0, step);
      selection = { step, parent: selection.parent };
    } else {
      editor.program.push(step);
      selection = { step, parent: editor.program };
    }
  }

  function setZone(holder: Record<string, unknown>, key: string, value: string) {
    holder[key] = refFromKey(value);
  }

  function setLeftKind(cond: Comparison, kind: string) {
    if (kind === 'playerCount') {
      cond.left = { get: 'playerCount' };
      if (typeof cond.right !== 'number') cond.right = 2;
    } else if (kind === 'option') {
      cond.left = { get: 'option', name: optionDecls[0].name };
      cond.op = 'eq';
      cond.right = true;
    } else {
      cond.left = { get: 'count', zone: { zone: tableZones[0] } };
      if (typeof cond.right !== 'number') cond.right = 1;
    }
  }

  function inForEachScope(step: Step, roots: Step[] = editor.program, inLoop = false): boolean {
    for (const s of roots) {
      if (s === step) return inLoop;
      if (isWhen(s)) {
        if (inForEachScope(step, s.steps, inLoop)) return true;
        if (s.else && inForEachScope(step, s.else, inLoop)) return true;
        if (s.steps.includes(step) || s.else?.includes(step)) return inLoop;
      }
      if (isForEach(s) && inForEachScope(step, s.steps, true)) return true;
    }
    return false;
  }
</script>

{#snippet row(step: Step, parent: Step[], depth: number, badge: string | null)}
  {@const errs = stepErrors(step)}
  <button
    class="row"
    class:row-selected={selected === step}
    style:padding-left="{0.6 + depth * 1.1}rem"
    onclick={() => select(step, parent)}
  >
    {#if badge}
      <span class="badge">{badge}</span>
    {:else if isWhen(step)}
      <span class="icon">⑂</span>
    {:else if isForEach(step)}
      <span class="icon">⟳</span>
    {:else if isAction(step)}
      <span class="icon">{verbIcons[step.do]}</span>
    {/if}
    <span class="summary">{stepSummary(step)}</span>
    {#if errs.length > 0}<span class="err-dot" title={errs.join(', ')}>⚠</span>{/if}
  </button>
{/snippet}

{#snippet rows(steps: Step[], depth: number)}
  {#each steps as step (step)}
    {@render row(step, steps, depth, null)}
    {#if isWhen(step)}
      {@render rows(step.steps, depth + 1)}
      {#if step.else}
        <div class="divider" style:padding-left="{0.6 + (depth + 1) * 1.1}rem">otherwise…</div>
        {@render rows(step.else, depth + 1)}
      {/if}
    {:else if isForEach(step)}
      {@render rows(step.steps, depth + 1)}
    {/if}
  {/each}
{/snippet}

{#snippet field(label: string)}
  <span class="field-label">{label}</span>
{/snippet}

{#snippet zoneField(label: string, holder: Record<string, unknown>, key: string, inForEach: boolean)}
  {@const current = zoneKey(holder[key] as never)}
  <label class="field">
    {@render field(label)}
    <select
      class="control"
      class:control-error={current === 'null'}
      value={current}
      onchange={(e) => setZone(holder, key, e.currentTarget.value)}
    >
      {#if current === 'null'}<option value="null">— choose —</option>{/if}
      {#each zoneChoices(inForEach) as c (c.key)}
        <option value={c.key}>{c.label}</option>
      {/each}
    </select>
  </label>
{/snippet}

{#snippet actionForm(step: ActionStep, inForEach: boolean)}
  {#if step.do === 'placeZone'}
    <label class="field">
      {@render field('Zone blueprint')}
      <select class="control" bind:value={step.blueprint}>
        {#each tableZones as z (z)}<option value={z}>{z.replace(/-/g, ' ')}</option>{/each}
      </select>
    </label>
  {:else if step.do === 'place'}
    <label class="field">
      {@render field('Component')}
      <select class="control" class:control-error={!step.component} bind:value={step.component}>
        {#if !step.component}<option value={null}>— choose —</option>{/if}
        {#each componentList as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
      </select>
    </label>
    {@render zoneField('Into zone', step as Record<string, unknown>, 'to', inForEach)}
    <label class="field">
      {@render field('Shuffled')}
      <input type="checkbox" bind:checked={step.shuffled} />
    </label>
    <label class="field">
      {@render field('Facing')}
      <select class="control" bind:value={step.facing}>
        <option value="down">face down</option>
        <option value="up">face up</option>
      </select>
    </label>
  {:else if step.do === 'shuffle'}
    {@render zoneField('Zone', step as Record<string, unknown>, 'zone', inForEach)}
  {:else if step.do === 'deal' || step.do === 'move'}
    <label class="field">
      {@render field('Count')}
      <input class="control control-num" type="number" min="1" max="99" bind:value={step.count} />
    </label>
    {@render zoneField('From zone', step as Record<string, unknown>, 'from', inForEach)}
    {@render zoneField('To zone', step as Record<string, unknown>, 'to', inForEach)}
    {#if step.do === 'deal'}
      <label class="field">
        {@render field('Facing')}
        <select class="control" bind:value={step.facing}>
          <option value="down">face down</option>
          <option value="up">face up</option>
        </select>
      </label>
    {/if}
  {:else if step.do === 'flip'}
    <label class="field">
      {@render field('Which cards')}
      <select class="control" bind:value={step.target}>
        <option value="top">the top card</option>
        <option value="all">all cards</option>
      </select>
    </label>
    {@render zoneField('Zone', step as Record<string, unknown>, 'zone', inForEach)}
  {:else}
    <p class="hint">This step has no settings.</p>
  {/if}
{/snippet}

{#snippet conditionForm(cond: Comparison)}
  <label class="field">
    {@render field('Check')}
    <select class="control" value={cond.left.get} onchange={(e) => setLeftKind(cond, e.currentTarget.value)}>
      <option value="playerCount">player count</option>
      <option value="option">game option</option>
      <option value="count">cards in a zone</option>
    </select>
  </label>
  {#if cond.left.get === 'option'}
    <label class="field">
      {@render field('Option')}
      <select class="control" bind:value={cond.left.name}>
        {#each optionDecls as o (o.name)}<option value={o.name}>{o.label}</option>{/each}
      </select>
    </label>
    <label class="field">
      {@render field('Must be')}
      <select
        class="control"
        value={cond.right === true ? 'true' : 'false'}
        onchange={(e) => (cond.right = e.currentTarget.value === 'true')}
      >
        <option value="true">on</option>
        <option value="false">off</option>
      </select>
    </label>
  {:else}
    {#if cond.left.get === 'count'}
      {@render zoneField('Zone', cond.left as unknown as Record<string, unknown>, 'zone', false)}
    {/if}
    <label class="field">
      {@render field('Comparison')}
      <select class="control" bind:value={cond.op}>
        <option value="eq">is</option>
        <option value="neq">is not</option>
        <option value="lt">is less than</option>
        <option value="lte">is at most</option>
        <option value="gt">is more than</option>
        <option value="gte">is at least</option>
      </select>
    </label>
    <label class="field">
      {@render field('Value')}
      <input class="control control-num" type="number" min="0" bind:value={cond.right} />
    </label>
  {/if}
{/snippet}

<div class="variant-c">
  <div class="list-pane">
    <div class="pane-head">Setup steps</div>
    <div class="rows">
      {@render rows(editor.program, 0)}
    </div>
    <div class="list-foot">
      <select
        class="add-select"
        value=""
        onchange={(e) => {
          const i = Number(e.currentTarget.value);
          if (!Number.isNaN(i) && e.currentTarget.value !== '') addStep(i);
          e.currentTarget.value = '';
        }}
      >
        <option value="" disabled selected>＋ Add step after selection…</option>
        {#each newStepPresets as p, i (p.label)}
          <option value={i}>{p.label}</option>
        {/each}
      </select>
    </div>
  </div>

  <div class="inspector">
    {#if selected}
      {@const errs = stepErrors(selected)}
      {@const inLoop = inForEachScope(selected)}
      <div class="pane-head inspector-head">
        <span>{stepSummary(selected)}</span>
        <button class="delete" onclick={deleteSelected}>Delete</button>
      </div>
      {#if errs.length > 0}
        <div class="err-box">
          {#each errs as e (e)}<div>⚠ {e}</div>{/each}
        </div>
      {/if}
      <div class="fields">
        {#if isWhen(selected)}
          {#if isComparison(selected.when)}
            {@render conditionForm(selected.when)}
          {:else}
            <p class="hint">Compound conditions aren't editable in this prototype.</p>
          {/if}
          <p class="hint">
            The “then” and “otherwise” steps are edited in the list on the left.
            {#if !selected.else}
              <button class="linkish" onclick={() => isWhen(selected!) && (selected!.else = [])}>
                Add an “otherwise” branch.
              </button>
            {/if}
          </p>
        {:else if isForEach(selected)}
          <p class="hint">
            Runs its steps once per seat, in ring order. The steps are edited in the list on the left;
            inside them, zones can reference “this seat”.
          </p>
        {:else}
          {@render actionForm(selected, inLoop)}
        {/if}
      </div>
    {:else}
      <div class="empty">Select a step to edit its settings.</div>
    {/if}
  </div>
</div>

<style>
  .variant-c {
    max-width: 960px;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
    display: grid;
    grid-template-columns: minmax(320px, 1.2fr) minmax(280px, 1fr);
    gap: 1rem;
    align-items: start;
  }

  .list-pane,
  .inspector {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  .pane-head {
    padding: 0.6rem 0.9rem;
    font-weight: 700;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    border-bottom: 1px solid var(--color-border);
  }

  .rows {
    display: flex;
    flex-direction: column;
    padding: 0.4rem 0;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: none;
    background: none;
    font: inherit;
    text-align: left;
    padding: 0.4rem 0.6rem;
    cursor: pointer;
    color: var(--color-text-primary);
  }

  .row:hover {
    background: var(--color-bg-subtle);
  }

  .row-selected {
    background: rgba(120, 160, 131, 0.16);
    box-shadow: inset 3px 0 0 var(--color-sage-dark);
  }

  .icon {
    flex: 0 0 1.4rem;
    text-align: center;
    opacity: 0.8;
  }

  .summary {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.92rem;
  }

  .err-dot {
    color: var(--color-danger);
  }

  .divider {
    font-size: 0.78rem;
    font-style: italic;
    color: var(--color-warning-fg);
    padding: 0.15rem 0.6rem;
  }

  .list-foot {
    border-top: 1px solid var(--color-border);
    padding: 0.5rem 0.6rem;
  }

  .add-select {
    width: 100%;
    appearance: none;
    border: 1px dashed var(--color-border);
    background: none;
    color: var(--color-text-muted);
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.6rem;
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .add-select:hover {
    border-color: var(--color-sage);
    color: var(--color-sage-dark);
  }

  .inspector-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.95rem;
    color: var(--color-text-primary);
  }

  .delete {
    border: 1px solid var(--color-danger-border);
    background: var(--color-danger-bg);
    color: var(--color-danger);
    border-radius: var(--radius-sm);
    padding: 0.2rem 0.6rem;
    font: inherit;
    font-size: 0.78rem;
    cursor: pointer;
  }

  .delete:hover {
    background: var(--color-danger);
    color: white;
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding: 0.9rem;
  }

  .field {
    display: grid;
    grid-template-columns: 7rem 1fr;
    align-items: center;
    gap: 0.6rem;
  }

  .field-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text-muted);
  }

  .control {
    font: inherit;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
  }

  .control-error {
    border-color: var(--color-danger);
    background: var(--color-danger-bg);
  }

  .control-num {
    width: 5rem;
  }

  .err-box {
    margin: 0.7rem 0.9rem 0;
    padding: 0.5rem 0.7rem;
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-sm);
    color: var(--color-danger);
    font-size: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .hint {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .linkish {
    border: none;
    background: none;
    font: inherit;
    font-size: inherit;
    color: var(--color-accent-fg);
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
  }

  .empty {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  .badge {
    font-size: 0.7rem;
  }
</style>
