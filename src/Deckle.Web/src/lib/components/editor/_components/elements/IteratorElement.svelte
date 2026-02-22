<script lang="ts">
  import type { IteratorElement } from '../../types';
  import TemplateRenderer from '../../TemplateRenderer.svelte';
  import MergeDataProvider from './MergeDataProvider.svelte';
  import { getDataSourceRow } from '$lib/stores/dataSourceRow';
  import { evaluateExpression, isElementVisible } from '$lib/utils/mergeFields';

  const MAX_ITERATIONS = 100;

  let { element, dpi }: { element: IteratorElement; dpi: number } = $props();

  const dataSourceRow = getDataSourceRow();

  const iterations = $derived.by(() => {
    const rowData = $dataSourceRow;
    const fromVal = evaluateExpression(element.fromExpression, rowData);
    const toVal = evaluateExpression(element.toExpression, rowData);

    const from = typeof fromVal === 'number' ? Math.round(fromVal) : parseInt(String(fromVal ?? ''), 10);
    const to = typeof toVal === 'number' ? Math.round(toVal) : parseInt(String(toVal ?? ''), 10);

    if (isNaN(from) || isNaN(to)) return [];

    const count = Math.abs(to - from) + 1;
    if (count > MAX_ITERATIONS) return [];

    const result: number[] = [];
    const step = from <= to ? 1 : -1;
    for (let v = from; step > 0 ? v <= to : v >= to; v += step) {
      result.push(v);
    }
    return result;
  });

  function augmentedMergeData(value: number): Record<string, string> | null {
    const base = $dataSourceRow ?? {};
    return { ...base, [element.iteratorName]: String(value) };
  }

  const visible = $derived(
    isElementVisible(element.visibilityMode, element.visibilityCondition, $dataSourceRow)
  );
</script>

{#if visible}
  {#each iterations as value (value)}
    <MergeDataProvider mergeData={augmentedMergeData(value)}>
      {#each element.children as child (child.id)}
        <TemplateRenderer element={child} {dpi} />
      {/each}
    </MergeDataProvider>
  {/each}
{/if}
