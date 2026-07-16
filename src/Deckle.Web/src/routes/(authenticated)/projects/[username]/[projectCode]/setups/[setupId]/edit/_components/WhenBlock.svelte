<script lang="ts">
  import type {
    Condition,
    GameSetup,
    ProjectComponentRef,
    SetupValidationError,
    WhenNode
  } from '$lib/gamerunner';
  import ConditionEditor from './ConditionEditor.svelte';
  import StepList from './StepList.svelte';

  let {
    node,
    doc,
    components,
    insideSeatLoop = false,
    errors,
    path
  }: {
    node: WhenNode;
    doc: GameSetup;
    components: ProjectComponentRef[];
    insideSeatLoop?: boolean;
    errors: SetupValidationError[];
    path: string;
  } = $props();

  let collapsed = $state(false);
</script>

<div class="block">
  <div class="block-head">
    <button class="fold" onclick={() => (collapsed = !collapsed)}>{collapsed ? '▸' : '▾'}</button>
    <span class="kw">If</span>
    <ConditionEditor
      value={node.when}
      {doc}
      {insideSeatLoop}
      {errors}
      path={`${path}.when`}
      onChange={(c: Condition) => (node.when = c)}
    />
    <span class="kw">then:</span>
  </div>

  {#if !collapsed}
    <div class="indent">
      <StepList
        list={node.then}
        basePath={`${path}.then`}
        {doc}
        {components}
        {insideSeatLoop}
        {errors}
      />
    </div>

    {#if node.else}
      <div class="block-head"><span class="kw">Otherwise:</span></div>
      <div class="indent">
        <StepList
          list={node.else}
          basePath={`${path}.else`}
          {doc}
          {components}
          {insideSeatLoop}
          {errors}
        />
      </div>
    {:else}
      <button class="ghost" onclick={() => (node.else = [])}>＋ otherwise…</button>
    {/if}
  {/if}
</div>

<style>
  .block {
    display: block;
  }
  .block-head {
    display: block;
  }
  .kw {
    font-weight: 700;
    color: var(--color-text-primary);
  }
  .fold {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    padding: 0 0.25rem 0 0;
  }
  .indent {
    margin-left: 0.4rem;
    padding-left: 1rem;
    border-left: 2px solid var(--color-border);
  }
  .ghost {
    display: block;
    border: none;
    background: none;
    font: inherit;
    font-size: 0.82rem;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0.2rem 0;
  }
  .ghost:hover {
    color: var(--color-warning-fg);
  }
</style>
