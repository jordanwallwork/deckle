<!-- PROTOTYPE — throwaway (wayfinder ticket #105). Variant B: rulebook outline. -->
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
    type Comparison
  } from './dsl';
  import { editor } from './state.svelte';

  let collapsed = $state<Set<Step>>(new Set());
  let dragging = $state<{ step: Step; parent: Step[] } | null>(null);
  let overZone = $state<{ steps: Step[]; index: number } | null>(null);

  function stepOwnsArray(step: Step, arr: Step[]): boolean {
    if (isWhen(step)) {
      return (
        step.steps === arr ||
        step.else === arr ||
        step.steps.some((s) => stepOwnsArray(s, arr)) ||
        (step.else?.some((s) => stepOwnsArray(s, arr)) ?? false)
      );
    }
    if (isForEach(step)) {
      return step.steps === arr || step.steps.some((s) => stepOwnsArray(s, arr));
    }
    return false;
  }

  function canDrop(steps: Step[]): boolean {
    return dragging !== null && dragging.step !== null && !stepOwnsArray(dragging.step, steps);
  }

  function isOver(steps: Step[], index: number): boolean {
    return overZone !== null && overZone.steps === steps && overZone.index === index;
  }

  function dropAt(steps: Step[], index: number) {
    if (!dragging || !canDrop(steps)) return;
    const { step, parent } = dragging;
    const from = parent.indexOf(step);
    if (from >= 0) {
      parent.splice(from, 1);
      let idx = index;
      if (parent === steps && from < index) idx -= 1;
      steps.splice(idx, 0, step);
    }
    dragging = null;
    overZone = null;
  }

  function startDrag(e: DragEvent, step: Step, parent: Step[]) {
    dragging = { step, parent };
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', '');
      e.dataTransfer.effectAllowed = 'move';
      const li = (e.currentTarget as HTMLElement).closest('li');
      if (li) e.dataTransfer.setDragImage(li, 12, 12);
    }
  }

  function toggle(step: Step) {
    const next = new Set(collapsed);
    if (next.has(step)) next.delete(step);
    else next.add(step);
    collapsed = next;
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
</script>

{#snippet zoneTok(holder: Record<string, unknown>, key: string, inForEach: boolean)}
  {@const current = zoneKey(holder[key] as never)}
  <select
    class="tok"
    class:tok-error={current === 'null'}
    value={current}
    onchange={(e) => setZone(holder, key, e.currentTarget.value)}
  >
    {#if current === 'null'}<option value="null">a zone…</option>{/if}
    {#each zoneChoices(inForEach) as c (c.key)}
      <option value={c.key}>{c.label}</option>
    {/each}
  </select>
{/snippet}

{#snippet countTok(step: ActionStep)}
  <input class="tok tok-num" type="number" min="1" max="99" bind:value={step.count} />
{/snippet}

{#snippet facingTok(step: ActionStep)}
  <select class="tok" bind:value={step.facing}>
    <option value="down">face down</option>
    <option value="up">face up</option>
  </select>
{/snippet}

{#snippet conditionInline(cond: Comparison)}
  <select class="tok" value={cond.left.get} onchange={(e) => setLeftKind(cond, e.currentTarget.value)}>
    <option value="playerCount">the player count</option>
    <option value="option">a game option</option>
    <option value="count">the number of cards in a zone</option>
  </select>
  {#if cond.left.get === 'option'}
    <select class="tok" bind:value={cond.left.name}>
      {#each optionDecls as o (o.name)}<option value={o.name}>“{o.label}”</option>{/each}
    </select>
    is
    <select
      class="tok"
      value={cond.right === true ? 'true' : 'false'}
      onchange={(e) => (cond.right = e.currentTarget.value === 'true')}
    >
      <option value="true">turned on</option>
      <option value="false">turned off</option>
    </select>
  {:else}
    {#if cond.left.get === 'count'}
      in {@render zoneTok(cond.left as unknown as Record<string, unknown>, 'zone', false)}
    {/if}
    <select class="tok" bind:value={cond.op}>
      <option value="eq">is</option>
      <option value="neq">is not</option>
      <option value="lt">is less than</option>
      <option value="lte">is at most</option>
      <option value="gt">is more than</option>
      <option value="gte">is at least</option>
    </select>
    <input class="tok tok-num" type="number" min="0" bind:value={cond.right} />
  {/if}
{/snippet}

{#snippet prose(step: ActionStep, inForEach: boolean)}
  {#if step.do === 'placeSeats'}
    Place a seat for every player.
  {:else if step.do === 'placeZone'}
    Place the
    <select class="tok" bind:value={step.blueprint}>
      {#each tableZones as z (z)}<option value={z}>{z.replace(/-/g, ' ')}</option>{/each}
    </select>
    zone on the table.
  {:else if step.do === 'place'}
    Put the
    <select class="tok" class:tok-error={!step.component} bind:value={step.component}>
      {#if !step.component}<option value={null}>a component…</option>{/if}
      {#each componentList as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
    </select>
    into {@render zoneTok(step as Record<string, unknown>, 'to', inForEach)},
    <select
      class="tok"
      value={step.shuffled ? 'yes' : 'no'}
      onchange={(e) => (step.shuffled = e.currentTarget.value === 'yes')}
    >
      <option value="yes">shuffled</option>
      <option value="no">in order</option>
    </select>
    and {@render facingTok(step)}.
  {:else if step.do === 'shuffle'}
    Shuffle {@render zoneTok(step as Record<string, unknown>, 'zone', inForEach)}.
  {:else if step.do === 'deal'}
    Deal {@render countTok(step)} cards from
    {@render zoneTok(step as Record<string, unknown>, 'from', inForEach)} to
    {@render zoneTok(step as Record<string, unknown>, 'to', inForEach)},
    {@render facingTok(step)}.
  {:else if step.do === 'move'}
    Move {@render countTok(step)} cards from
    {@render zoneTok(step as Record<string, unknown>, 'from', inForEach)} to
    {@render zoneTok(step as Record<string, unknown>, 'to', inForEach)}.
  {:else if step.do === 'flip'}
    Flip
    <select class="tok" bind:value={step.target}>
      <option value="top">the top card</option>
      <option value="all">all cards</option>
    </select>
    of {@render zoneTok(step as Record<string, unknown>, 'zone', inForEach)}.
  {:else if step.do === 'roll'}
    Roll the dice.
  {/if}
{/snippet}

{#snippet insertPoint(steps: Step[], index: number)}
  <div
    class="insert-point"
    class:drop-active={canDrop(steps)}
    class:drop-over={isOver(steps, index)}
    role="presentation"
    ondragover={(e) => {
      if (!canDrop(steps)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      overZone = { steps, index };
    }}
    ondragleave={() => {
      if (isOver(steps, index)) overZone = null;
    }}
    ondrop={(e) => {
      e.preventDefault();
      dropAt(steps, index);
    }}
  >
    {#if !dragging}
      <select
        class="insert-select"
        value=""
        onchange={(e) => {
          const i = Number(e.currentTarget.value);
          if (!Number.isNaN(i) && e.currentTarget.value !== '') steps.splice(index, 0, newStepPresets[i].make());
          e.currentTarget.value = '';
        }}
      >
        <option value="" disabled selected>＋ insert step here</option>
        {#each newStepPresets as p, i (p.label)}
          <option value={i}>{p.label}</option>
        {/each}
      </select>
    {/if}
  </div>
{/snippet}

{#snippet addLine(steps: Step[])}
  <div class="add-line">
    <select
      class="add-select"
      value=""
      onchange={(e) => {
        const i = Number(e.currentTarget.value);
        if (!Number.isNaN(i) && e.currentTarget.value !== '') steps.push(newStepPresets[i].make());
        e.currentTarget.value = '';
      }}
    >
      <option value="" disabled selected>＋ add a step</option>
      {#each newStepPresets as p, i (p.label)}
        <option value={i}>{p.label}</option>
      {/each}
    </select>
  </div>
{/snippet}

{#snippet outline(steps: Step[], inForEach: boolean, depth: number)}
  <ol class="steps" class:top={depth === 0}>
    {#each steps as step, i (step)}
      {@const errs = stepErrors(step)}
      <li class="insert-li">{@render insertPoint(steps, i)}</li>
      <li class="step" class:has-error={errs.length > 0}>
        <span class="controls">
          <span
            class="drag-handle"
            role="button"
            tabindex="-1"
            aria-label="Drag to move step"
            title="Drag to move"
            draggable="true"
            ondragstart={(e) => startDrag(e, step, steps)}
            ondragend={() => {
              dragging = null;
              overZone = null;
            }}>⋮⋮</span
          >
          <button class="del" title="Delete step" onclick={() => steps.splice(i, 1)}>✕</button>
        </span>
        {#if isWhen(step)}
          <div class="block-head">
            <button class="fold" onclick={() => toggle(step)}>{collapsed.has(step) ? '▸' : '▾'}</button>
            <span class="kw">If</span>
            {#if isComparison(step.when)}
              {@render conditionInline(step.when)}
            {:else}
              (compound condition)
            {/if}
            <span class="kw">:</span>
          </div>
          {#if !collapsed.has(step)}
            <div class="indent">
              {@render outline(step.steps, inForEach, depth + 1)}
              {@render addLine(step.steps)}
            </div>
            {#if step.else}
              <div class="block-head else-head"><span class="kw">Otherwise:</span></div>
              <div class="indent">
                {@render outline(step.else, inForEach, depth + 1)}
                {@render addLine(step.else)}
              </div>
            {:else}
              <button class="ghost" onclick={() => (step.else = [])}>＋ otherwise…</button>
            {/if}
          {/if}
        {:else if isForEach(step)}
          <div class="block-head">
            <button class="fold" onclick={() => toggle(step)}>{collapsed.has(step) ? '▸' : '▾'}</button>
            <span class="kw">For each seat, in turn:</span>
          </div>
          {#if !collapsed.has(step)}
            <div class="indent">
              {@render outline(step.steps, true, depth + 1)}
              {@render addLine(step.steps)}
            </div>
          {/if}
        {:else}
          <div class="prose">{@render prose(step, inForEach)}</div>
        {/if}
        {#if errs.length > 0}
          <div class="err-note">⚠ {errs.join(' · ')}</div>
        {/if}
      </li>
    {/each}
    <li class="insert-li">{@render insertPoint(steps, steps.length)}</li>
  </ol>
{/snippet}

<div class="variant-b">
  <div class="doc">
    <h2>Setup</h2>
    <p class="doc-sub">Before the first turn, do the following in order:</p>
    {@render outline(editor.program, false, 0)}
    {@render addLine(editor.program)}
  </div>
</div>

<style>
  .variant-b {
    max-width: 760px;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
  }

  .doc {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    padding: 2rem 2.5rem 2.5rem;
    font-size: 1rem;
    line-height: 1.9;
  }

  h2 {
    margin: 0 0 0.2rem;
    font-size: 1.5rem;
    color: var(--color-text-primary);
  }

  .doc-sub {
    margin: 0 0 1rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  .steps {
    margin: 0;
    padding-left: 1.6rem;
    list-style: none;
    counter-reset: step;
  }

  .step {
    position: relative;
    padding: 0.1rem 1.5rem 0.1rem 0.2rem;
    border-radius: var(--radius-xs);
    counter-increment: step;
  }

  .step::before {
    content: counter(step) '.';
    position: absolute;
    left: -1.4rem;
    color: var(--color-text-primary);
  }

  .step:hover {
    background: var(--color-bg-subtle);
  }

  .has-error {
    background: var(--color-danger-bg);
  }

  .prose,
  .block-head {
    display: inline;
  }

  .kw {
    font-weight: 700;
  }

  .fold {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    padding: 0 0.25rem 0 0;
    margin-left: -1.1rem;
  }

  .else-head {
    display: block;
  }

  .indent {
    margin-left: 0.4rem;
    padding-left: 1rem;
    border-left: 2px solid var(--color-border);
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
    padding: 0;
  }

  .tok:hover {
    color: var(--color-accent-fg-hover);
    background: rgba(120, 160, 131, 0.14);
    border-radius: 3px;
  }

  .tok-error {
    color: var(--color-danger);
    text-decoration: underline wavy 1.5px var(--color-danger);
  }

  .tok-num {
    width: 2.6rem;
    text-align: center;
    cursor: text;
  }

  .controls {
    position: absolute;
    right: 0.2rem;
    top: 0.3rem;
    display: flex;
    gap: 0.1rem;
    opacity: 0;
  }

  .step:hover > .controls {
    opacity: 1;
  }

  .controls button {
    border: none;
    background: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 0.75rem;
    line-height: 1;
    padding: 0.1rem 0.2rem;
  }

  .controls .del:hover {
    color: var(--color-danger);
  }

  .drag-handle {
    color: var(--color-text-muted);
    font-size: 0.75rem;
    line-height: 1;
    padding: 0.1rem 0.2rem;
    cursor: grab;
    user-select: none;
    letter-spacing: -0.15em;
  }

  .drag-handle:hover {
    color: var(--color-accent-fg);
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .insert-point {
    height: 0.9rem;
    display: flex;
    align-items: center;
    margin-left: -0.2rem;
    border-radius: var(--radius-xs);
  }

  .insert-li {
    list-style: none;
    padding-left: 0.2rem;
  }

  .drop-active {
    background: rgba(120, 160, 131, 0.12);
    outline: 1px dashed var(--color-sage);
    outline-offset: -1px;
  }

  .drop-over {
    background: rgba(120, 160, 131, 0.4);
    outline-style: solid;
  }

  .insert-select {
    appearance: none;
    border: none;
    background: none;
    font: inherit;
    font-size: 0.72rem;
    line-height: 1;
    color: var(--color-sage-dark);
    cursor: pointer;
    padding: 0;
    opacity: 0;
  }

  .insert-point:hover .insert-select {
    opacity: 1;
  }

  .err-note {
    font-size: 0.8rem;
    color: var(--color-danger);
    line-height: 1.4;
    padding-bottom: 0.3rem;
  }

  .ghost {
    display: block;
    border: none;
    background: none;
    font: inherit;
    font-size: 0.82rem;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0;
    margin-left: 0.4rem;
  }

  .ghost:hover {
    color: var(--color-warning-fg);
  }

  .add-line {
    margin-top: 0.2rem;
  }

  .add-select {
    appearance: none;
    border: none;
    background: none;
    font: inherit;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    cursor: pointer;
    opacity: 0.55;
  }

  .add-select:hover {
    opacity: 1;
    color: var(--color-sage-dark);
  }
</style>
