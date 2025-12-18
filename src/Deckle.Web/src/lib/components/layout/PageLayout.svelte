<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** Main content */
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="page">
  {@render children()}
</div>

<style>
  .page {
    min-height: 100%;
  }
</style>
