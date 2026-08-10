<script lang="ts">
  import {
    appendStep,
    insertStep,
    deleteStep,
    moveStepBy,
    moveStep,
    createNode,
    type GameSetup,
    type NodeKind,
    type ProjectComponentRef,
    type SetupNode,
    type SetupValidationError
  } from '$lib/gamerunner';
  import { ownErrors } from './errors';
  import StepNode from './StepNode.svelte';
  import AddStepMenu from './AddStepMenu.svelte';

  let {
    list,
    basePath,
    doc,
    components,
    insideSeatLoop = false,
    errors
  }: {
    list: SetupNode[];
    basePath: string;
    doc: GameSetup;
    components: ProjectComponentRef[];
    insideSeatLoop?: boolean;
    errors: SetupValidationError[];
  } = $props();

  // Drag-to-reorder is scoped to this list (siblings only); cross-block moves use
  // delete + re-add. Insert-between and up/down cover the rest of the AC.
  let dragFrom = $state<number | null>(null);
  let dragOver = $state<number | null>(null);

  function onDrop(target: number) {
    if (dragFrom !== null) moveStep(list, dragFrom, target > dragFrom ? target - 1 : target);
    dragFrom = null;
    dragOver = null;
  }
</script>

<ol class="steps" class:top={basePath === 'setup'}>
  {#each list as node, i (node)}
    {@const nodeErrors = ownErrors(errors, `${basePath}[${i}]`)}
    <li class="insert-li">
      <AddStepMenu
        variant="insert"
        label="＋ insert"
        onAdd={(kind: NodeKind) => insertStep(list, i, createNode(kind))}
      />
    </li>
    <li
      class="step"
      class:has-error={nodeErrors.length > 0}
      class:drag-over={dragOver === i}
      ondragover={(e) => {
        if (dragFrom !== null) {
          e.preventDefault();
          dragOver = i;
        }
      }}
      ondrop={(e) => {
        e.preventDefault();
        onDrop(i);
      }}
    >
      <span class="controls">
        <span
          class="drag-handle"
          role="button"
          tabindex="-1"
          aria-label="Drag to reorder"
          title="Drag to reorder"
          draggable="true"
          ondragstart={() => (dragFrom = i)}
          ondragend={() => {
            dragFrom = null;
            dragOver = null;
          }}>⋮⋮</span
        >
        <button class="ctl" title="Move up" disabled={i === 0} onclick={() => moveStepBy(list, i, -1)}
          >▲</button
        >
        <button
          class="ctl"
          title="Move down"
          disabled={i === list.length - 1}
          onclick={() => moveStepBy(list, i, 1)}>▼</button
        >
        <button class="ctl del" title="Delete step" onclick={() => deleteStep(list, i)}>✕</button>
      </span>

      <div class="content">
        <StepNode
          {node}
          {list}
          index={i}
          {doc}
          {components}
          {insideSeatLoop}
          {errors}
          path={`${basePath}[${i}]`}
        />
      </div>

      {#if nodeErrors.length > 0}
        <ul class="err-note">
          {#each nodeErrors as e (e.docPath + e.message)}
            <li title={e.docPath}><code>{e.docPath}</code> — {e.message}</li>
          {/each}
        </ul>
      {/if}
    </li>
  {/each}

  <li class="insert-li">
    <AddStepMenu onAdd={(kind: NodeKind) => appendStep(list, createNode(kind))} />
  </li>
</ol>

<style>
  .steps {
    margin: 0;
    padding-left: 1.6rem;
    list-style: none;
    counter-reset: step;
  }
  .step {
    position: relative;
    padding: 0.15rem 5.5rem 0.15rem 0.2rem;
    border-radius: var(--radius-xs);
    counter-increment: step;
  }
  .step::before {
    content: counter(step) '.';
    position: absolute;
    left: -1.4rem;
    color: var(--color-text-muted);
  }
  .step:hover {
    background: var(--color-bg-subtle);
  }
  .has-error {
    background: var(--color-danger-bg);
  }
  .drag-over {
    outline: 2px dashed var(--color-accent-fg);
    outline-offset: -2px;
  }
  .content {
    display: inline;
  }
  .controls {
    position: absolute;
    right: 0.2rem;
    top: 0.2rem;
    display: flex;
    gap: 0.05rem;
    opacity: 0;
    align-items: center;
  }
  .step:hover > .controls {
    opacity: 1;
  }
  .ctl {
    border: none;
    background: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 0.7rem;
    padding: 0.1rem 0.2rem;
  }
  .ctl:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .ctl.del:hover {
    color: var(--color-danger);
  }
  .drag-handle {
    color: var(--color-text-muted);
    font-size: 0.7rem;
    cursor: grab;
    user-select: none;
    letter-spacing: -0.15em;
  }
  .drag-handle:active {
    cursor: grabbing;
  }
  .insert-li {
    list-style: none;
    min-height: 0.9rem;
    opacity: 0.35;
    transition: opacity 0.1s;
  }
  .insert-li:hover {
    opacity: 1;
  }
  .err-note {
    margin: 0.15rem 0 0.35rem;
    padding-left: 1rem;
    font-size: 0.8rem;
    color: var(--color-danger-fg);
    line-height: 1.4;
  }
  .err-note code {
    font-size: 0.75rem;
    opacity: 0.85;
  }
</style>
