<!-- PROTOTYPE — throwaway (wayfinder ticket #105). Variant A: sentence cards. -->
<script lang="ts">
  import {
    isWhen,
    isForEach,
    isComparison,
    zoneChoices,
    zoneKey,
    refFromKey,
    stepErrors,
    componentList,
    optionDecls,
    tableZones,
    newStepPresets,
    type Step,
    type ActionStep,
    type Comparison,
    type CompareOp
  } from './dsl';
  import { editor } from './state.svelte';

  function setZone(holder: Record<string, unknown>, key: string, value: string) {
    holder[key] = refFromKey(value);
  }

  function addStep(steps: Step[], presetIndex: number) {
    steps.push(newStepPresets[presetIndex].make());
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
</script>

{#snippet zoneSlot(holder: Record<string, unknown>, key: string, inForEach: boolean)}
  {@const current = zoneKey(holder[key] as never)}
  <select
    class="chip"
    class:chip-empty={current === 'null'}
    value={current}
    onchange={(e) => setZone(holder, key, e.currentTarget.value)}
  >
    {#if current === 'null'}<option value="null">choose zone…</option>{/if}
    {#each zoneChoices(inForEach) as c (c.key)}
      <option value={c.key}>{c.label}</option>
    {/each}
  </select>
{/snippet}

{#snippet countSlot(step: ActionStep)}
  <input class="chip chip-num" type="number" min="1" max="99" bind:value={step.count} />
{/snippet}

{#snippet facingSlot(step: ActionStep)}
  <select class="chip" bind:value={step.facing}>
    <option value="down">face down</option>
    <option value="up">face up</option>
  </select>
{/snippet}

{#snippet conditionEditor(cond: Comparison)}
  <select
    class="chip"
    value={cond.left.get}
    onchange={(e) => setLeftKind(cond, e.currentTarget.value)}
  >
    <option value="playerCount">player count</option>
    <option value="option">a game option</option>
    <option value="count">cards in a zone</option>
  </select>
  {#if cond.left.get === 'option'}
    <select class="chip" bind:value={cond.left.name}>
      {#each optionDecls as o (o.name)}<option value={o.name}>{o.label}</option>{/each}
    </select>
    <span class="word">is</span>
    <select
      class="chip"
      value={cond.right === true ? 'true' : 'false'}
      onchange={(e) => (cond.right = e.currentTarget.value === 'true')}
    >
      <option value="true">on</option>
      <option value="false">off</option>
    </select>
  {:else}
    {#if cond.left.get === 'count'}
      <span class="word">in</span>
      {@render zoneSlot(cond.left as unknown as Record<string, unknown>, 'zone', false)}
    {/if}
    <select class="chip" bind:value={cond.op}>
      <option value="eq">is</option>
      <option value="neq">is not</option>
      <option value="lt">is less than</option>
      <option value="lte">is at most</option>
      <option value="gt">is more than</option>
      <option value="gte">is at least</option>
    </select>
    <input class="chip chip-num" type="number" min="0" bind:value={cond.right} />
  {/if}
{/snippet}

{#snippet sentence(step: ActionStep, inForEach: boolean)}
  {#if step.do === 'placeSeats'}
    <span class="word">Place a</span> <span class="fixed">seat</span>
    <span class="word">for every player</span>
  {:else if step.do === 'placeZone'}
    <span class="word">Place the</span>
    <select class="chip" bind:value={step.blueprint}>
      {#each tableZones as z (z)}<option value={z}>{z.replace(/-/g, ' ')}</option>{/each}
    </select>
    <span class="word">zone on the table</span>
  {:else if step.do === 'place'}
    <span class="word">Put</span>
    <select class="chip" class:chip-empty={!step.component} bind:value={step.component}>
      {#if !step.component}<option value={null}>choose component…</option>{/if}
      {#each componentList as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
    </select>
    <span class="word">into</span>
    {@render zoneSlot(step as Record<string, unknown>, 'to', inForEach)}
    <select
      class="chip"
      value={step.shuffled ? 'yes' : 'no'}
      onchange={(e) => (step.shuffled = e.currentTarget.value === 'yes')}
    >
      <option value="yes">shuffled</option>
      <option value="no">in order</option>
    </select>
    <span class="word">,</span>
    {@render facingSlot(step)}
  {:else if step.do === 'shuffle'}
    <span class="word">Shuffle</span>
    {@render zoneSlot(step as Record<string, unknown>, 'zone', inForEach)}
  {:else if step.do === 'deal'}
    <span class="word">Deal</span>
    {@render countSlot(step)}
    <span class="word">cards from</span>
    {@render zoneSlot(step as Record<string, unknown>, 'from', inForEach)}
    <span class="word">to</span>
    {@render zoneSlot(step as Record<string, unknown>, 'to', inForEach)}
    <span class="word">,</span>
    {@render facingSlot(step)}
  {:else if step.do === 'move'}
    <span class="word">Move</span>
    {@render countSlot(step)}
    <span class="word">cards from</span>
    {@render zoneSlot(step as Record<string, unknown>, 'from', inForEach)}
    <span class="word">to</span>
    {@render zoneSlot(step as Record<string, unknown>, 'to', inForEach)}
  {:else if step.do === 'flip'}
    <span class="word">Flip</span>
    <select class="chip" bind:value={step.target}>
      <option value="top">the top card</option>
      <option value="all">all cards</option>
    </select>
    <span class="word">of</span>
    {@render zoneSlot(step as Record<string, unknown>, 'zone', inForEach)}
  {:else if step.do === 'roll'}
    <span class="word">Roll the dice</span>
  {/if}
{/snippet}

{#snippet addStepControl(steps: Step[])}
  <select
    class="add-step"
    value=""
    onchange={(e) => {
      const i = Number(e.currentTarget.value);
      if (!Number.isNaN(i) && e.currentTarget.value !== '') addStep(steps, i);
      e.currentTarget.value = '';
    }}
  >
    <option value="" disabled selected>＋ Add step…</option>
    {#each newStepPresets as p, i (p.label)}
      <option value={i}>{p.label}</option>
    {/each}
  </select>
{/snippet}

{#snippet stepList(steps: Step[], inForEach: boolean)}
  {#each steps as step, i (step)}
    {@const errs = stepErrors(step)}
    <div class="card" class:card-error={errs.length > 0}>
      <button class="delete" title="Delete step" onclick={() => steps.splice(i, 1)}>✕</button>
      {#if isWhen(step)}
        <div class="line">
          <span class="keyword">If</span>
          {#if isComparison(step.when)}
            {@render conditionEditor(step.when)}
          {:else}
            <span class="fixed">{'(compound condition)'}</span>
          {/if}
        </div>
        <div class="branch">
          <div class="rail rail-then"><span>then</span></div>
          <div class="nested">
            {@render stepList(step.steps, inForEach)}
            {@render addStepControl(step.steps)}
          </div>
        </div>
        {#if step.else}
          <div class="branch">
            <div class="rail rail-else"><span>otherwise</span></div>
            <div class="nested">
              {@render stepList(step.else, inForEach)}
              {@render addStepControl(step.else)}
            </div>
          </div>
        {:else}
          <button class="add-else" onclick={() => (step.else = [])}>＋ add “otherwise” branch</button>
        {/if}
      {:else if isForEach(step)}
        <div class="line">
          <span class="keyword">For each seat</span><span class="word">, in turn:</span>
        </div>
        <div class="branch">
          <div class="rail rail-loop"><span>do</span></div>
          <div class="nested">
            {@render stepList(step.steps, true)}
            {@render addStepControl(step.steps)}
          </div>
        </div>
      {:else}
        <div class="line">{@render sentence(step, inForEach)}</div>
      {/if}
      {#if errs.length > 0}
        <ul class="errors">
          {#each errs as e (e)}<li>{e}</li>{/each}
        </ul>
      {/if}
    </div>
  {/each}
{/snippet}

<div class="variant-a">
  <div class="stack">
    {@render stepList(editor.program, false)}
    {@render addStepControl(editor.program)}
  </div>
</div>

<style>
  .variant-a {
    max-width: 720px;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .card {
    position: relative;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    padding: 0.7rem 2rem 0.7rem 0.9rem;
  }

  .card-error {
    border-color: var(--color-danger-border);
    border-left: 3px solid var(--color-danger);
  }

  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    line-height: 2;
  }

  .word {
    color: var(--color-text-primary);
  }

  .keyword {
    font-weight: 700;
    color: var(--color-accent-fg);
  }

  .fixed {
    font-weight: 600;
  }

  .chip {
    appearance: none;
    border: 1px solid var(--color-sage);
    background: rgba(120, 160, 131, 0.14);
    color: var(--color-sage-darker);
    border-radius: 999px;
    padding: 0.15rem 0.6rem;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .chip:hover {
    background: rgba(120, 160, 131, 0.26);
  }

  .chip-empty {
    border-style: dashed;
    border-color: var(--color-danger);
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }

  .chip-num {
    width: 4.2rem;
    text-align: center;
    cursor: text;
  }

  .branch {
    display: flex;
    gap: 0.6rem;
    margin: 0.5rem 0 0.2rem;
  }

  .rail {
    flex: 0 0 auto;
    width: 5.2rem;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 0.5rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .rail-then {
    background: rgba(120, 160, 131, 0.18);
    color: var(--color-sage-darker);
  }

  .rail-else {
    background: rgba(255, 177, 66, 0.18);
    color: var(--color-warning-fg);
  }

  .rail-loop {
    background: rgba(80, 114, 123, 0.15);
    color: var(--color-muted-teal);
  }

  .nested {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }

  .delete {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    border: none;
    background: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0.2rem;
    opacity: 0;
  }

  .card:hover > .delete {
    opacity: 0.7;
  }

  .delete:hover {
    color: var(--color-danger);
    opacity: 1;
  }

  .add-step {
    appearance: none;
    align-self: flex-start;
    border: 1px dashed var(--color-border);
    background: none;
    color: var(--color-text-muted);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.7rem;
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .add-step:hover {
    border-color: var(--color-sage);
    color: var(--color-sage-dark);
  }

  .add-else {
    border: none;
    background: none;
    color: var(--color-text-muted);
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0.2rem 0;
    margin-top: 0.3rem;
  }

  .add-else:hover {
    color: var(--color-warning-fg);
  }

  .errors {
    margin: 0.4rem 0 0;
    padding: 0.35rem 0.6rem 0.35rem 1.6rem;
    background: var(--color-danger-bg);
    border-radius: var(--radius-sm);
    color: var(--color-danger);
    font-size: 0.82rem;
  }
</style>
