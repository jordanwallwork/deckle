<script lang="ts">
  import type { PageData } from './$types';
  import { componentsApi, ApiError } from '$lib/api';
  import { invalidateAll, goto } from '$app/navigation';
  import { Button, Dialog, ConfirmDialog, EmptyState, TabContent } from '$lib/components';
  import ComponentCard from './_components/ComponentCard.svelte';
  import ComponentTypeSelector from './_components/ComponentTypeSelector.svelte';
  import CardConfigForm from './_components/CardConfigForm.svelte';
  import DiceConfigForm from './_components/DiceConfigForm.svelte';
  import PlayerMatConfigForm from './_components/PlayerMatConfigForm.svelte';
  import LinkDataSourceModal from './_components/LinkDataSourceModal.svelte';
  import type { GameComponent } from '$lib/types';
  import { setBreadcrumbs } from '$lib/stores/breadcrumb';
  import { buildComponentsBreadcrumbs } from '$lib/utils/breadcrumbs';

  let { data }: { data: PageData } = $props();

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
    data.components.filter((c) => c.type === 'Card' || c.type === 'PlayerMat')
  );

  // Check if there are any exportable components
  const hasExportableComponents = $derived(exportableComponents.length > 0);

  let showModal = $state(false);
  let selectedType: 'card' | 'dice' | 'playermat' | null = $state(null);
  let componentName = $state('');
  let editingComponent: GameComponent | null = $state(null);

  // Card configuration
  let cardSize = $state('StandardPoker');

  // Dice configuration
  let diceType = $state('D6');
  let diceStyle = $state('Numbered');
  let diceColor = $state('EarthGreen');
  let diceNumber = $state('1');

  // Player Mat configuration
  let playerMatSizeMode: 'preset' | 'custom' = $state('preset');
  let playerMatPresetSize = $state<string | null>('A4');
  let playerMatOrientation = $state('Portrait');
  let playerMatCustomWidth = $state('210');
  let playerMatCustomHeight = $state('297');

  let isSubmitting = $state(false);
  let errorMessage = $state('');

  // Delete confirmation
  let showDeleteConfirm = $state(false);
  let componentToDelete: GameComponent | null = $state(null);

  // Link data source
  let showLinkDataSourceModal = $state(false);
  let componentToLink: GameComponent | null = $state(null);

  function openModal() {
    showModal = true;
    selectedType = null;
    componentName = '';
    editingComponent = null;
    cardSize = 'StandardPoker';
    diceType = 'D6';
    diceStyle = 'Numbered';
    diceColor = 'EarthGreen';
    diceNumber = '1';
    playerMatSizeMode = 'preset';
    playerMatPresetSize = 'A4';
    playerMatOrientation = 'Portrait';
    playerMatCustomWidth = '210';
    playerMatCustomHeight = '297';
    errorMessage = '';
  }

  function navigateToExport() {
    const componentIds = exportableComponents.map((c) => c.id).join(',');
    goto(`/projects/${data.project.id}/export?components=${componentIds}`);
  }

  function closeModal() {
    showModal = false;
    selectedType = null;
    componentName = '';
    editingComponent = null;
    errorMessage = '';
  }

  function selectType(type: 'card' | 'dice' | 'playermat') {
    selectedType = type;
    errorMessage = '';
  }

  /**
   * Populate form fields from a card component
   */
  function populateCardForm(card: Extract<GameComponent, { type: 'Card' }>) {
    selectedType = 'card';
    cardSize = card.size;
  }

  /**
   * Populate form fields from a dice component
   */
  function populateDiceForm(dice: Extract<GameComponent, { type: 'Dice' }>) {
    selectedType = 'dice';
    diceType = dice.diceType;
    diceStyle = dice.style;
    diceColor = dice.baseColor;
    diceNumber = String(dice.number);
  }

  /**
   * Populate form fields from a player mat component
   */
  function populatePlayerMatForm(mat: Extract<GameComponent, { type: 'PlayerMat' }>) {
    selectedType = 'playermat';
    if (mat.presetSize) {
      playerMatSizeMode = 'preset';
      playerMatPresetSize = mat.presetSize;
      playerMatOrientation = mat.orientation;
    } else {
      playerMatSizeMode = 'custom';
      playerMatCustomWidth = String(mat.customWidthMm || 210);
      playerMatCustomHeight = String(mat.customHeightMm || 297);
    }
  }

  /**
   * Populate form fields from any component type
   */
  function populateFormFromComponent(component: GameComponent) {
    componentName = component.name;

    switch (component.type) {
      case 'Card':
        populateCardForm(component);
        break;
      case 'Dice':
        populateDiceForm(component);
        break;
      case 'PlayerMat':
        populatePlayerMatForm(component);
        break;
    }
  }

  function handleEdit(component: GameComponent) {
    editingComponent = component;
    populateFormFromComponent(component);
    showModal = true;
    errorMessage = '';
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
      // Could add error handling UI here
    }
  }

  /**
   * Create a new card component
   */
  async function createCard() {
    await componentsApi.createCard(data.project.id, {
      name: componentName,
      size: cardSize
    });
  }

  /**
   * Update an existing card component
   */
  async function updateCard(componentId: string) {
    await componentsApi.updateCard(data.project.id, componentId, {
      name: componentName,
      size: cardSize
    });
  }

  /**
   * Create a new dice component
   */
  async function createDice() {
    await componentsApi.createDice(data.project.id, {
      name: componentName,
      type: diceType,
      style: diceStyle,
      baseColor: diceColor,
      number: Number(diceNumber)
    });
  }

  /**
   * Update an existing dice component
   */
  async function updateDice(componentId: string) {
    await componentsApi.updateDice(data.project.id, componentId, {
      name: componentName,
      type: diceType,
      style: diceStyle,
      baseColor: diceColor,
      number: Number(diceNumber)
    });
  }

  /**
   * Create a new player mat component
   */
  async function createPlayerMat() {
    await componentsApi.createPlayerMat(data.project.id, {
      name: componentName,
      presetSize: playerMatSizeMode === 'preset' ? playerMatPresetSize : null,
      orientation: playerMatOrientation,
      customWidthMm: playerMatSizeMode === 'custom' ? parseFloat(playerMatCustomWidth) : null,
      customHeightMm: playerMatSizeMode === 'custom' ? parseFloat(playerMatCustomHeight) : null
    });
  }

  /**
   * Update an existing player mat component
   */
  async function updatePlayerMat(componentId: string) {
    await componentsApi.updatePlayerMat(data.project.id, componentId, {
      name: componentName,
      presetSize: playerMatSizeMode === 'preset' ? playerMatPresetSize : null,
      orientation: playerMatOrientation,
      customWidthMm: playerMatSizeMode === 'custom' ? parseFloat(playerMatCustomWidth) : null,
      customHeightMm: playerMatSizeMode === 'custom' ? parseFloat(playerMatCustomHeight) : null
    });
  }

  /**
   * Save component based on selected type
   */
  async function saveComponent() {
    switch (selectedType) {
      case 'card':
        if (editingComponent) {
          await updateCard(editingComponent.id);
        } else {
          await createCard();
        }
        break;
      case 'dice':
        if (editingComponent) {
          await updateDice(editingComponent.id);
        } else {
          await createDice();
        }
        break;
      case 'playermat':
        if (editingComponent) {
          await updatePlayerMat(editingComponent.id);
        } else {
          await createPlayerMat();
        }
        break;
    }
  }

  async function handleSubmit() {
    if (!componentName.trim()) {
      errorMessage = 'Please enter a component name';
      return;
    }

    if (!selectedType) {
      errorMessage = 'Please select a component type';
      return;
    }

    isSubmitting = true;
    errorMessage = '';

    try {
      await saveComponent();
      await invalidateAll();
      closeModal();
    } catch (err) {
      console.error('Error saving component:', err);
      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else {
        errorMessage = `Failed to ${editingComponent ? 'update' : 'create'} component. Please try again.`;
      }
    } finally {
      isSubmitting = false;
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
  {#if canEdit || hasExportableComponents}
    {#snippet actions()}
      {#if hasExportableComponents}
        <Button variant="secondary" size="sm" onclick={navigateToExport}>Export</Button>
      {/if}
      {#if canEdit}
        <Button variant="primary" size="sm" onclick={openModal}>+ Add Component</Button>
      {/if}
    {/snippet}
  {/if}

  {#if data.components && data.components.length > 0}
  <div class="components-list">
    {#each data.components as component}
      <ComponentCard
        {component}
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

<Dialog
  bind:show={showModal}
  title={editingComponent ? 'Edit Component' : 'New Component'}
  maxWidth="600px"
  onclose={closeModal}
>
  {#if !selectedType}
    <ComponentTypeSelector onSelectType={selectType} />
  {:else}
    {#if !editingComponent}
      <Button variant="text" onclick={() => (selectedType = null)}>
        ← Back to component types
      </Button>
    {/if}

    {#if selectedType === 'card'}
      <CardConfigForm bind:cardSize bind:componentName />
    {:else if selectedType === 'dice'}
      <DiceConfigForm
        bind:diceType
        bind:diceStyle
        bind:diceColor
        bind:componentName
        bind:diceNumber
      />
    {:else if selectedType === 'playermat'}
      <PlayerMatConfigForm
        bind:componentName
        bind:sizeMode={playerMatSizeMode}
        bind:presetSize={playerMatPresetSize}
        bind:orientation={playerMatOrientation}
        bind:customWidthMm={playerMatCustomWidth}
        bind:customHeightMm={playerMatCustomHeight}
      />
    {/if}

    {#if errorMessage}
      <p class="error-message">{errorMessage}</p>
    {/if}
  {/if}

  {#snippet actions()}
    {#if selectedType}
      <Button variant="secondary" onclick={closeModal} disabled={isSubmitting}>Cancel</Button>
      <Button variant="primary" onclick={handleSubmit} disabled={isSubmitting}>
        {#if isSubmitting}
          {editingComponent ? 'Updating...' : 'Adding...'}
        {:else}
          {editingComponent ? 'Update Component' : 'Add Component'}
        {/if}
      </Button>
    {/if}
  {/snippet}
</Dialog>

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
  currentDataSourceId={componentToLink?.type === 'Card' || componentToLink?.type === 'PlayerMat'
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

  .error-message {
    color: #d32f2f;
    font-size: 0.875rem;
    margin: 1rem 0 0 0;
    padding: 0.75rem;
    background-color: #ffebee;
    border-radius: 8px;
    border: 1px solid #ef9a9a;
  }
</style>
