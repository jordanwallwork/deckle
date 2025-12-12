<script lang="ts">
  import type { PageData } from './$types';
  import { componentsApi, ApiError } from '$lib/api';
  import { invalidateAll } from '$app/navigation';
  import Dialog from '$lib/components/Dialog.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import ComponentCard from './_components/ComponentCard.svelte';
  import ComponentTypeSelector from './_components/ComponentTypeSelector.svelte';
  import CardConfigForm from './_components/CardConfigForm.svelte';
  import DiceConfigForm from './_components/DiceConfigForm.svelte';
  import type { GameComponent } from '$lib/types';

  let { data }: { data: PageData } = $props();

  let showModal = $state(false);
  let selectedType: 'card' | 'dice' | null = $state(null);
  let componentName = $state('');
  let editingComponent: GameComponent | null = $state(null);

  // Card configuration
  let cardSize = $state('StandardPoker');

  // Dice configuration
  let diceType = $state('D6');
  let diceStyle = $state('Numbered');
  let diceColor = $state('EarthGreen');
  let diceNumber = $state(1);

  let isSubmitting = $state(false);
  let errorMessage = $state('');

  // Delete confirmation
  let showDeleteConfirm = $state(false);
  let componentToDelete: GameComponent | null = $state(null);

  function openModal() {
    showModal = true;
    selectedType = null;
    componentName = '';
    editingComponent = null;
    cardSize = 'StandardPoker';
    diceType = 'D6';
    diceStyle = 'Numbered';
    diceColor = 'EarthGreen';
    diceNumber = 1;
    errorMessage = '';
  }

  function closeModal() {
    showModal = false;
    selectedType = null;
    componentName = '';
    editingComponent = null;
    errorMessage = '';
  }

  function selectType(type: 'card' | 'dice') {
    selectedType = type;
    errorMessage = '';
  }

  function handleEdit(component: GameComponent) {
    editingComponent = component;
    componentName = component.name;

    if (component.type === 'Card') {
      selectedType = 'card';
      cardSize = component.cardSize;
    } else {
      selectedType = 'dice';
      diceType = component.diceType;
      diceStyle = component.diceStyle;
      diceColor = component.diceBaseColor;
      diceNumber = component.diceNumber;
    }

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
      if (editingComponent) {
        // Update existing component
        if (selectedType === 'card') {
          await componentsApi.updateCard(data.project.id, editingComponent.id, {
            name: componentName,
            size: cardSize
          });
        } else {
          await componentsApi.updateDice(data.project.id, editingComponent.id, {
            name: componentName,
            type: diceType,
            style: diceStyle,
            baseColor: diceColor,
            number: diceNumber
          });
        }
      } else {
        // Create new component
        if (selectedType === 'card') {
          await componentsApi.createCard(data.project.id, {
            name: componentName,
            size: cardSize
          });
        } else {
          await componentsApi.createDice(data.project.id, {
            name: componentName,
            type: diceType,
            style: diceStyle,
            baseColor: diceColor,
            number: diceNumber
          });
        }
      }

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
  <meta name="description" content="Manage game components for {data.project.name}. Design cards, tokens, and other game pieces from your data sources." />
</svelte:head>

<div class="tab-content">
  <div class="tab-actions">
    <button class="add-button" onclick={openModal}>+ Add Component</button>
  </div>

  {#if data.components && data.components.length > 0}
    <div class="components-list">
      {#each data.components as component}
        <ComponentCard {component} onEdit={handleEdit} onDelete={handleDeleteClick} />
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <p class="empty-message">No components yet</p>
      <p class="empty-subtitle">Add components to build your game's card decks</p>
    </div>
  {/if}
</div>

<Dialog bind:show={showModal} title={editingComponent ? 'Edit Component' : 'New Component'} maxWidth="600px" onclose={closeModal}>
  {#if !selectedType}
    <ComponentTypeSelector onSelectType={selectType} />
  {:else}
    {#if !editingComponent}
      <button class="back-button" onclick={() => selectedType = null}>← Back to component types</button>
    {/if}

    {#if selectedType === 'card'}
      <CardConfigForm bind:cardSize bind:componentName />
    {:else if selectedType === 'dice'}
      <DiceConfigForm bind:diceType bind:diceStyle bind:diceColor bind:componentName bind:diceNumber />
    {/if}

    {#if errorMessage}
      <p class="error-message">{errorMessage}</p>
    {/if}
  {/if}

  {#snippet actions()}
    {#if selectedType}
      <button class="secondary cancel-button" onclick={closeModal} disabled={isSubmitting}>Cancel</button>
      <button class="primary submit-button" onclick={handleSubmit} disabled={isSubmitting}>
        {#if isSubmitting}
          {editingComponent ? 'Updating...' : 'Adding...'}
        {:else}
          {editingComponent ? 'Update Component' : 'Add Component'}
        {/if}
      </button>
    {/if}
  {/snippet}
</Dialog>

<ConfirmDialog
  bind:show={showDeleteConfirm}
  title="Delete Component"
  message="Are you sure you want to delete '{componentToDelete?.name}'? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  confirmButtonClass="danger"
  onconfirm={confirmDelete}
  oncancel={cancelDelete}
/>

<style>
  .tab-content {
    min-height: 400px;
  }

  .tab-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1.5rem;
  }

  .add-button {
    background-color: var(--color-muted-teal);
    color: white;
    border: none;
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .add-button:hover {
    background-color: var(--color-sage);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(120, 160, 131, 0.3);
  }

  .components-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-message {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-sage);
    margin-bottom: 0.5rem;
  }

  .empty-subtitle {
    font-size: 1rem;
    color: var(--color-muted-teal);
  }

  .back-button {
    background: none;
    border: none;
    color: var(--color-muted-teal);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.5rem 0;
    text-align: left;
    transition: color 0.2s ease;
    margin-bottom: 1rem;
  }

  .back-button:hover {
    color: var(--color-sage);
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
