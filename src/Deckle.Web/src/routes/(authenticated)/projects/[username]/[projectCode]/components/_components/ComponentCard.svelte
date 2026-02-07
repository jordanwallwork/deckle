<script lang="ts">
  import { Card, Button } from '$lib/components';
  import type { GameComponent } from '$lib/types';
  import { isEditableComponent, hasDataSource } from '$lib/utils/componentTypes';
  import EditableComponentActions from './ComponentCard/EditableComponentActions.svelte';
  import DataSourceIndicator from './ComponentCard/DataSourceIndicator.svelte';
  import ComponentTypeInfo from './ComponentCard/ComponentTypeInfo.svelte';

  let {
    component,
    projectUrlBase,
    onEdit,
    onDelete,
    onLinkDataSource
  }: {
    component: GameComponent;
    projectUrlBase: string;
    onEdit?: (component: GameComponent) => void;
    onDelete?: (component: GameComponent) => void;
    onLinkDataSource?: (component: GameComponent) => void;
  } = $props();

  // Determine if we can edit based on whether edit callbacks are provided
  const canEdit = $derived(!!onEdit);
</script>

<Card>
  <div class="card-header">
    <h3>{component.name}</h3>
    <div class="card-actions">
      {#if onEdit}
        <Button variant="icon" class="edit-button" onclick={() => onEdit(component)}>
          {#snippet icon()}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          {/snippet}
        </Button>
      {/if}
      {#if onDelete}
        <Button variant="icon" class="delete-button" onclick={() => onDelete(component)}>
          {#snippet icon()}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" x2="10" y1="11" y2="17" />
              <line x1="14" x2="14" y1="11" y2="17" />
            </svg>
          {/snippet}
        </Button>
      {/if}
    </div>
  </div>

  <ComponentTypeInfo {component} />

  {#if isEditableComponent(component)}
    <EditableComponentActions {component} {projectUrlBase} {canEdit} />
  {/if}

  {#if hasDataSource(component)}
    <DataSourceIndicator {component} {onLinkDataSource} {projectUrlBase} />
  {/if}
</Card>

<style>
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }

  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-sage);
    margin: 0;
    flex: 1;
  }

  .card-actions {
    display: flex;
    gap: 0.25rem;
    margin-left: 0.5rem;
  }

  :global(.edit-button) {
    color: var(--color-muted-teal) !important;
  }

  :global(.edit-button:hover) {
    background-color: var(--color-teal-grey) !important;
    color: var(--color-sage) !important;
  }

  :global(.delete-button) {
    color: #d32f2f !important;
  }

  :global(.delete-button:hover) {
    background-color: #ffebee !important;
    color: #b71c1c !important;
  }
</style>
