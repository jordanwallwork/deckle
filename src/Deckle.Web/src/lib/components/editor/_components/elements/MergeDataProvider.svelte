<script lang="ts">
  import type { Snippet } from 'svelte';
  import { initDataSourceRow } from '$lib/stores/dataSourceRow';

  let {
    mergeData,
    children
  }: {
    mergeData: Record<string, string> | null;
    children: Snippet;
  } = $props();

  const store = initDataSourceRow(mergeData);

  $effect(() => {
    store.set(mergeData);
  });
</script>

{@render children()}
