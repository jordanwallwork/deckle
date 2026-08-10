<script lang="ts">
  import {
    isAction,
    isWhenNode,
    type GameSetup,
    type ProjectComponentRef,
    type SetupNode,
    type SetupValidationError
  } from '$lib/gamerunner';
  import ActionSentence from './ActionSentence.svelte';
  import WhenBlock from './WhenBlock.svelte';
  import ForEachBlock from './ForEachBlock.svelte';

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
    node: SetupNode;
    list: SetupNode[];
    index: number;
    doc: GameSetup;
    components: ProjectComponentRef[];
    insideSeatLoop?: boolean;
    errors: SetupValidationError[];
    path: string;
  } = $props();
</script>

{#if isAction(node)}
  <ActionSentence {node} {list} {index} {doc} {components} {insideSeatLoop} {errors} {path} />
{:else if isWhenNode(node)}
  <WhenBlock {node} {doc} {components} {insideSeatLoop} {errors} {path} />
{:else}
  <ForEachBlock {node} {doc} {components} {errors} {path} />
{/if}
