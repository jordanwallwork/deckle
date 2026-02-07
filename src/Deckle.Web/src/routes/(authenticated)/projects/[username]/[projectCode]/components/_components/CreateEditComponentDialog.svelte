<script lang="ts">
  import { ApiError } from '$lib/api';
  import {
    Button,
    Dialog,
    ComponentTypeSelector,
    CardConfigForm,
    DiceConfigForm,
    PlayerMatConfigForm
  } from '$lib/components';
  import type { GameComponent, CardComponent, PlayerMatComponent } from '$lib/types';
  import {
    getHandler,
    getTypeKey,
    type ComponentTypeKey,
    type FormState
  } from '$lib/utils/componentHandlers';

  let {
    show = $bindable(false),
    projectId,
    editComponent = null,
    onsaved
  }: {
    show: boolean;
    projectId: string;
    editComponent: GameComponent | null;
    onsaved: () => void;
  } = $props();

  let selectedType: ComponentTypeKey | null = $state(null);
  let isSubmitting = $state(false);
  let errorMessage = $state('');

  // Card form state
  let componentName = $state('');
  let cardSize = $state('StandardPoker');
  let cardHorizontal = $state(false);

  // Dice form state
  let diceType = $state('D6');
  let diceStyle = $state('Numbered');
  let diceColor = $state('EarthGreen');
  let diceNumber = $state('1');

  // Player Mat form state
  let playerMatSizeMode: 'preset' | 'custom' = $state('preset');
  let playerMatPresetSize = $state<string | null>('A4');
  let playerMatOrientation = $state('Portrait');
  let playerMatCustomWidth = $state('210');
  let playerMatCustomHeight = $state('297');

  // Template state
  let templates: GameComponent[] = $state([]);
  let selectedTemplateId: string | null = $state(null);

  function applyFormState(state: FormState) {
    componentName = state.componentName;

    if ('cardSize' in state) {
      cardSize = state.cardSize;
      cardHorizontal = state.cardHorizontal;
      selectedTemplateId = state.selectedTemplateId;
    } else if ('diceType' in state) {
      diceType = state.diceType;
      diceStyle = state.diceStyle;
      diceColor = state.diceColor;
      diceNumber = state.diceNumber;
    } else if ('sizeMode' in state) {
      playerMatSizeMode = state.sizeMode;
      playerMatPresetSize = state.presetSize;
      playerMatOrientation = state.orientation;
      playerMatCustomWidth = state.customWidthMm;
      playerMatCustomHeight = state.customHeightMm;
      selectedTemplateId = state.selectedTemplateId;
    }
  }

  function collectFormState(): FormState {
    switch (selectedType) {
      case 'card':
        return {
          componentName,
          cardSize,
          cardHorizontal,
          selectedTemplateId
        };
      case 'dice':
        return {
          componentName,
          diceType,
          diceStyle,
          diceColor,
          diceNumber
        };
      case 'playermat':
        return {
          componentName,
          sizeMode: playerMatSizeMode,
          presetSize: playerMatPresetSize,
          orientation: playerMatOrientation,
          customWidthMm: playerMatCustomWidth,
          customHeightMm: playerMatCustomHeight,
          selectedTemplateId
        };
      default:
        throw new Error('No type selected');
    }
  }

  function resetState() {
    selectedType = null;
    componentName = '';
    errorMessage = '';
    templates = [];
    selectedTemplateId = null;

    const cardDefaults = getHandler('card').defaults();
    cardSize = (cardDefaults as { cardSize: string }).cardSize;
    cardHorizontal = (cardDefaults as { cardHorizontal: boolean }).cardHorizontal;

    const diceDefaults = getHandler('dice').defaults();
    diceType = (diceDefaults as { diceType: string }).diceType;
    diceStyle = (diceDefaults as { diceStyle: string }).diceStyle;
    diceColor = (diceDefaults as { diceColor: string }).diceColor;
    diceNumber = (diceDefaults as { diceNumber: string }).diceNumber;

    const matDefaults = getHandler('playermat').defaults();
    playerMatSizeMode = (matDefaults as { sizeMode: 'preset' | 'custom' }).sizeMode;
    playerMatPresetSize = (matDefaults as { presetSize: string | null }).presetSize;
    playerMatOrientation = (matDefaults as { orientation: string }).orientation;
    playerMatCustomWidth = (matDefaults as { customWidthMm: string }).customWidthMm;
    playerMatCustomHeight = (matDefaults as { customHeightMm: string }).customHeightMm;
  }

  $effect(() => {
    if (show) {
      if (editComponent) {
        const typeKey = getTypeKey(editComponent.type);
        selectedType = typeKey;
        const handler = getHandler(typeKey);
        applyFormState(handler.populateFromComponent(editComponent));
        templates = [];
        errorMessage = '';
      } else {
        resetState();
      }
    }
  });

  async function selectType(type: ComponentTypeKey) {
    selectedType = type;
    selectedTemplateId = null;
    errorMessage = '';
    templates = await getHandler(type).loadTemplates();
  }

  function closeDialog() {
    show = false;
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
      const handler = getHandler(selectedType);
      const state = collectFormState();

      if (editComponent) {
        await handler.update(projectId, editComponent.id, state);
      } else {
        await handler.create(projectId, state, templates);
      }

      onsaved();
      closeDialog();
    } catch (err) {
      console.error('Error saving component:', err);
      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else {
        errorMessage = `Failed to ${editComponent ? 'update' : 'create'} component. Please try again.`;
      }
    } finally {
      isSubmitting = false;
    }
  }
</script>

<Dialog
  bind:show
  title={editComponent ? 'Edit Component' : 'New Component'}
  maxWidth="600px"
  onclose={closeDialog}
>
  {#if !selectedType}
    <ComponentTypeSelector onSelectType={selectType} />
  {:else}
    {#if !editComponent}
      <Button variant="text" onclick={() => (selectedType = null)}>
        ← Back to component types
      </Button>
    {/if}

    {#if selectedType === 'card'}
      <CardConfigForm
        bind:cardSize
        bind:cardHorizontal
        bind:componentName
        templates={templates as CardComponent[]}
        bind:selectedTemplateId
      />
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
        templates={templates as PlayerMatComponent[]}
        bind:selectedTemplateId
      />
    {/if}

    {#if errorMessage}
      <p class="error-message">{errorMessage}</p>
    {/if}
  {/if}

  {#snippet actions()}
    {#if selectedType}
      <Button variant="secondary" onclick={closeDialog} disabled={isSubmitting}>Cancel</Button>
      <Button variant="primary" onclick={handleSubmit} disabled={isSubmitting}>
        {#if isSubmitting}
          {editComponent ? 'Updating...' : 'Adding...'}
        {:else}
          {editComponent ? 'Update Component' : 'Add Component'}
        {/if}
      </Button>
    {/if}
  {/snippet}
</Dialog>

<style>
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
