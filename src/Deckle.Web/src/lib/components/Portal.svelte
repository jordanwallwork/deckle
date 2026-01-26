<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';

  let {
    target = 'body',
    children
  }: {
    target?: string;
    children: Snippet;
  } = $props();

  let portalElement: HTMLDivElement;
  let mounted = $state(false);

  onMount(() => {
    const targetElement = document.querySelector(target);
    if (targetElement && portalElement) {
      targetElement.appendChild(portalElement);
      mounted = true;
    }

    return () => {
      if (portalElement && portalElement.parentNode) {
        portalElement.parentNode.removeChild(portalElement);
      }
    };
  });
</script>

<div bind:this={portalElement} class="portal">
  {#if mounted}
    {@render children()}
  {/if}
</div>

<style>
  .portal {
    display: contents;
  }
</style>
