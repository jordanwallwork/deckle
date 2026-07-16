<script lang="ts">
  import type {
    ForEachSeatNode,
    GameSetup,
    ProjectComponentRef,
    SetupValidationError
  } from '$lib/gamerunner';
  import StepList from './StepList.svelte';

  let {
    node,
    doc,
    components,
    errors,
    path
  }: {
    node: ForEachSeatNode;
    doc: GameSetup;
    components: ProjectComponentRef[];
    errors: SetupValidationError[];
    path: string;
  } = $props();

  let collapsed = $state(false);
</script>

<div class="block">
  <div class="block-head">
    <button class="fold" onclick={() => (collapsed = !collapsed)}>{collapsed ? '▸' : '▾'}</button>
    <span class="kw">For each seat, in turn:</span>
  </div>

  {#if !collapsed}
    <div class="indent">
      <!-- Inside a seat loop, seat zones resolve to the current loop seat. -->
      <StepList
        list={node.forEachSeat.body}
        basePath={`${path}.forEachSeat.body`}
        {doc}
        {components}
        insideSeatLoop={true}
        {errors}
      />
    </div>
  {/if}
</div>

<style>
  .block,
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
</style>
