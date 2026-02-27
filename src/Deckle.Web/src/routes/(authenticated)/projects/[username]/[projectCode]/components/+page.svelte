<script lang="ts">
  import type { PageData } from './$types';
  import { componentsApi } from '$lib/api';
  import { invalidateAll, goto } from '$app/navigation';
  import {
    Button,
    ConfirmDialog,
    EmptyState,
    TabContent
  } from '$lib/components';
  import ComponentCard from './_components/ComponentCard.svelte';
  import LinkDataSourceModal from './_components/LinkDataSourceModal.svelte';
  import CreateEditComponentDialog from './_components/CreateEditComponentDialog.svelte';
  import type { GameComponent } from '$lib/types';
  import { setBreadcrumbs } from '$lib/stores/breadcrumb';
  import { buildComponentsBreadcrumbs } from '$lib/utils/breadcrumbs';
  import { isEditableComponent, hasDataSource } from '$lib/utils/componentTypes';

  let { data }: { data: PageData } = $props();

  // Helper to build project URL base
  const projectUrlBase = $derived(`/projects/${data.project.ownerUsername}/${data.project.code}`);

  // Update breadcrumbs for this page
  $effect(() => {
    setBreadcrumbs(buildComponentsBreadcrumbs(data.project));
  });

  // Permission checks based on user role
  const canEdit = $derived(data.project.role !== 'Viewer'); // Collaborators, Admins, and Owners can edit
  const canDelete = $derived(data.project.role === 'Owner' || data.project.role === 'Admin'); // Only Owners and Admins can delete
  const canLinkDataSource = $derived(
    data.project.role === 'Owner' || data.project.role === 'Admin'
  ); // Only Owners and Admins can link data sources

  // Get exportable components (Card and PlayerMat only)
  const exportableComponents = $derived(
    data.components.filter((c) => isEditableComponent(c))
  );

  // Check if there are any exportable components
  const hasExportableComponents = $derived(exportableComponents.length > 0);

  // Create/Edit dialog state
  let showCreateEditDialog = $state(false);
  let editComponent: GameComponent | null = $state(null);

  // Delete confirmation
  let showDeleteConfirm = $state(false);
  let componentToDelete: GameComponent | null = $state(null);

  // Link data source
  let showLinkDataSourceModal = $state(false);
  let componentToLink: GameComponent | null = $state(null);

  function openCreateDialog() {
    editComponent = null;
    showCreateEditDialog = true;
  }

  function handleEdit(component: GameComponent) {
    editComponent = component;
    showCreateEditDialog = true;
  }

  async function handleSaved() {
    await invalidateAll();
  }

  function navigateToExport() {
    const componentIds = exportableComponents.map((c) => c.id).join(',');
    goto(`${projectUrlBase}/export?components=${componentIds}`);
  }

  function handleDeleteClick(component: GameComponent) {
    componentToDelete = component;
    showDeleteConfirm = true;
  }

  async function confirmDelete() {
    if (!componentToDelete) return;

    try {
      await componentsApi.delete(data.project.id, componentToDelete.id);
      await invalidateAll();
      showDeleteConfirm = false;
      componentToDelete = null;
    } catch (err) {
      console.error('Error deleting component:', err);
      showDeleteConfirm = false;
      componentToDelete = null;
    }
  }

  function cancelDelete() {
    showDeleteConfirm = false;
    componentToDelete = null;
  }

  function handleLinkDataSource(component: GameComponent) {
    componentToLink = component;
    showLinkDataSourceModal = true;
  }

  function closeLinkDataSourceModal() {
    showLinkDataSourceModal = false;
    componentToLink = null;
  }

  async function handleConfirmLinkDataSource(dataSourceId: string | null) {
    if (!componentToLink) return;

    try {
      await componentsApi.updateDataSource(data.project.id, componentToLink.id, dataSourceId);
      await invalidateAll();
      closeLinkDataSourceModal();
    } catch (err) {
      console.error('Error updating data source:', err);
    }
  }
</script>

<svelte:head>
  <title>Components · {data.project.name} · Deckle</title>
  <meta
    name="description"
    content="Manage game components for {data.project
      .name}. Design cards, tokens, and other game pieces from your data sources."
  />
</svelte:head>

<TabContent>
  {#snippet actions()}
    {#if canEdit || hasExportableComponents}
      <div>
        {#if hasExportableComponents}
          <Button variant="secondary" size="sm" onclick={navigateToExport}>Export</Button>
        {/if}
        {#if canEdit}
          <Button variant="primary" size="sm" onclick={openCreateDialog}>+ Add Component</Button>
        {/if}
      </div>
    {/if}
  {/snippet}

  {#if data.components && data.components.length > 0}
  <div class="components-list">
    {#each data.components as component}
      <ComponentCard
        {component}
        {projectUrlBase}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canDelete ? handleDeleteClick : undefined}
        onLinkDataSource={canLinkDataSource ? handleLinkDataSource : undefined}
      />
    {/each}
  </div>
  {:else}
    <EmptyState
      title="No components yet"
      subtitle="Add components to build your game's card decks"
      border={false}
    />
  {/if}
</TabContent>

<CreateEditComponentDialog
  bind:show={showCreateEditDialog}
  projectId={data.project.id}
  {editComponent}
  onsaved={handleSaved}
/>

<ConfirmDialog
  bind:show={showDeleteConfirm}
  title="Delete Component"
  message="Are you sure you want to delete '{componentToDelete?.name}'? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  confirmVariant="danger"
  onconfirm={confirmDelete}
  oncancel={cancelDelete}
/>

<LinkDataSourceModal
  bind:show={showLinkDataSourceModal}
  dataSources={data.dataSources || []}
  currentDataSourceId={componentToLink && hasDataSource(componentToLink)
    ? componentToLink.dataSource?.id
    : null}
  onConfirm={handleConfirmLinkDataSource}
  onClose={closeLinkDataSourceModal}
/>

<style>
  .components-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1rem;
  }
</style>
