<script lang="ts">
  import type { PageData } from "./$types";
  import { componentsApi, ApiError } from "$lib/api";
  import { invalidateAll } from "$app/navigation";
  import { Button, Dialog, ConfirmDialog, EmptyState } from "$lib/components";
  import ComponentCard from "./_components/ComponentCard.svelte";
  import ComponentTypeSelector from "./_components/ComponentTypeSelector.svelte";
  import CardConfigForm from "./_components/CardConfigForm.svelte";
  import DiceConfigForm from "./_components/DiceConfigForm.svelte";
  import type { GameComponent } from "$lib/types";
  import { getBreadcrumbs } from "$lib/stores/breadcrumb";
  import { buildComponentsBreadcrumbs } from "$lib/utils/breadcrumbs";

  let { data }: { data: PageData } = $props();

  // Update breadcrumbs for this page
  const breadcrumbs = getBreadcrumbs();
  $effect(() => {
    breadcrumbs.set(
      buildComponentsBreadcrumbs(data.project.id, data.project.name)
    );
  });

  let showModal = $state(false);
  let selectedType: "card" | "dice" | null = $state(null);
  let componentName = $state("");
  let editingComponent: GameComponent | null = $state(null);

  // Card configuration
  let cardSize = $state("StandardPoker");

  // Dice configuration
  let diceType = $state("D6");
  let diceStyle = $state("Numbered");
  let diceColor = $state("EarthGreen");
  let diceNumber = $state(1);

  let isSubmitting = $state(false);
  let errorMessage = $state("");

  // Delete confirmation
  let showDeleteConfirm = $state(false);
  let componentToDelete: GameComponent | null = $state(null);

  function openModal() {
    showModal = true;
    selectedType = null;
    componentName = "";
    editingComponent = null;
    cardSize = "StandardPoker";
    diceType = "D6";
    diceStyle = "Numbered";
    diceColor = "EarthGreen";
    diceNumber = 1;
    errorMessage = "";
  }

  function closeModal() {
    showModal = false;
    selectedType = null;
    componentName = "";
    editingComponent = null;
    errorMessage = "";
  }

  function selectType(type: "card" | "dice") {
    selectedType = type;
    errorMessage = "";
  }

  function handleEdit(component: GameComponent) {
    editingComponent = component;
    componentName = component.name;

    if (component.type === "Card") {
      selectedType = "card";
      cardSize = component.size;
    } else {
      selectedType = "dice";
      diceType = component.diceType;
      diceStyle = component.diceStyle;
      diceColor = component.diceBaseColor;
      diceNumber = component.diceNumber;
    }

    showModal = true;
    errorMessage = "";
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
      console.error("Error deleting component:", err);
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
      errorMessage = "Please enter a component name";
      return;
    }

    if (!selectedType) {
      errorMessage = "Please select a component type";
      return;
    }

    isSubmitting = true;
    errorMessage = "";

    try {
      if (editingComponent) {
        // Update existing component
        if (selectedType === "card") {
          await componentsApi.updateCard(data.project.id, editingComponent.id, {
            name: componentName,
            size: cardSize,
          });
        } else {
          await componentsApi.updateDice(data.project.id, editingComponent.id, {
            name: componentName,
            type: diceType,
            style: diceStyle,
            baseColor: diceColor,
            number: diceNumber,
          });
        }
      } else {
        // Create new component
        if (selectedType === "card") {
          await componentsApi.createCard(data.project.id, {
            name: componentName,
            size: cardSize,
          });
        } else {
          await componentsApi.createDice(data.project.id, {
            name: componentName,
            type: diceType,
            style: diceStyle,
            baseColor: diceColor,
            number: diceNumber,
          });
        }
      }

      await invalidateAll();
      closeModal();
    } catch (err) {
      console.error("Error saving component:", err);
      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else {
        errorMessage = `Failed to ${editingComponent ? "update" : "create"} component. Please try again.`;
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

<div class="actions">
  <Button variant="primary" size="sm" onclick={openModal}>
    + Add Component
  </Button>
</div>

{#if data.components && data.components.length > 0}
  <div class="components-list">
    {#each data.components as component}
      <ComponentCard
        {component}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
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

<Dialog
  bind:show={showModal}
  title={editingComponent ? "Edit Component" : "New Component"}
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

    {#if selectedType === "card"}
      <CardConfigForm bind:cardSize bind:componentName />
    {:else if selectedType === "dice"}
      <DiceConfigForm
        bind:diceType
        bind:diceStyle
        bind:diceColor
        bind:componentName
        bind:diceNumber
      />
    {/if}

    {#if errorMessage}
      <p class="error-message">{errorMessage}</p>
    {/if}
  {/if}

  {#snippet actions()}
    {#if selectedType}
      <Button variant="secondary" onclick={closeModal} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button variant="primary" onclick={handleSubmit} disabled={isSubmitting}>
        {#if isSubmitting}
          {editingComponent ? "Updating..." : "Adding..."}
        {:else}
          {editingComponent ? "Update Component" : "Add Component"}
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

<style>
  .actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1.5rem;
  }

  .components-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
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
