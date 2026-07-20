<script lang="ts">
  import Panel from './_components/Panel.svelte';
  import ComponentConfig from './_components/configuration/ComponentConfig.svelte';
  import GroupConfigHost from './_components/config-groups/GroupConfigHost.svelte';
  import { templateStore } from '$lib/stores/templateElements';
  import type { EditableComponent } from '$lib/types';

  let {
    component,
    part,
    readOnly = false,
    dpi = 96
  }: { component: EditableComponent; part?: string; readOnly?: boolean; dpi?: number } = $props();

  const selectedElement = $derived(
    $templateStore.selectedElementId
      ? templateStore.getElement($templateStore.selectedElementId)
      : null
  );

  const isRootSelected = $derived($templateStore.selectedElementId === 'root');
</script>

<Panel noheader>
  {#snippet children()}
    {#if isRootSelected}
      <ComponentConfig {component} {part} />
    {:else if selectedElement}
      <GroupConfigHost elements={[selectedElement]} {dpi} {readOnly} />
    {:else}
      <div class="empty-state">
        <p>No element selected</p>
        <p class="hint">
          Select an element on the canvas or in the structure tree to edit its properties
        </p>
      </div>
    {/if}
  {/snippet}
</Panel>

<style>
  .empty-state {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-text-secondary);
  }

  .empty-state p {
    margin: 0;
  }

  .empty-state .hint {
    font-size: 0.75rem;
    margin-top: 0.5rem;
  }
</style>
