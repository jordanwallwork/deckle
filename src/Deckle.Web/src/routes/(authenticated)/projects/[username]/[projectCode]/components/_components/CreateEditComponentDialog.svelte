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
  import type {
    GameComponent,
    CardComponent,
    PlayerMatComponent,
    Dimensions,
    ComponentShape
  } from '$lib/types';
  import type { ContainerElement } from '$lib/components/editor/types';
  import {
    getHandler,
    getTypeKey,
    type ComponentTypeKey,
    type FormState
  } from '$lib/utils/componentHandlers';
  import { mmToPx } from '$lib/utils/size.utils';
  import { CARD_SIZES, PLAYER_MAT_SIZES } from '$lib/constants';
  import StaticComponentRenderer from '../../export/_components/StaticComponentRenderer.svelte';

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
  let playerMatHorizontal = $state(false);
  let playerMatCustomWidth = $state('210');
  let playerMatCustomHeight = $state('297');

  // Template state
  let templates: GameComponent[] = $state([]);
  let selectedTemplateId: string | null = $state(null);

  // Preview state
  let previewContainerWidth = $state(0);
  let previewContainerHeight = $state(0);

  let selectedTemplate = $derived(
    selectedTemplateId ? templates.find((t) => t.id === selectedTemplateId) ?? null : null
  );

  // Compute dimensions from form state (card size / player mat size) for preview without template
  let formDimensions = $derived.by((): Dimensions | null => {
    const DPI = 300;
    const BLEED_MM = 3;
    let widthMm: number;
    let heightMm: number;

    if (selectedType === 'card') {
      const size = CARD_SIZES.find((s) => s.value === cardSize);
      if (!size) return null;
      widthMm = cardHorizontal ? size.heightMm : size.widthMm;
      heightMm = cardHorizontal ? size.widthMm : size.heightMm;
    } else if (selectedType === 'playermat') {
      if (playerMatSizeMode === 'preset') {
        const size = PLAYER_MAT_SIZES.find((s) => s.value === playerMatPresetSize);
        if (!size) return null;
        widthMm = playerMatHorizontal ? size.heightMm : size.widthMm;
        heightMm = playerMatHorizontal ? size.widthMm : size.heightMm;
      } else {
        const w = parseFloat(playerMatCustomWidth);
        const h = parseFloat(playerMatCustomHeight);
        if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;
        widthMm = w;
        heightMm = h;
      }
    } else {
      return null;
    }

    return {
      widthMm,
      heightMm,
      bleedMm: BLEED_MM,
      dpi: DPI,
      widthPx: mmToPx(widthMm, DPI),
      heightPx: mmToPx(heightMm, DPI),
      bleedPx: mmToPx(BLEED_MM, DPI)
    };
  });

  let previewDesign = $derived.by((): ContainerElement | null => {
    if (!selectedTemplate) return null;
    if (!('frontDesign' in selectedTemplate) || !selectedTemplate.frontDesign) return null;
    try {
      return JSON.parse(selectedTemplate.frontDesign) as ContainerElement;
    } catch {
      return null;
    }
  });

  let previewDimensions = $derived.by((): Dimensions | null => {
    if (selectedTemplate && 'dimensions' in selectedTemplate) {
      return selectedTemplate.dimensions;
    }
    return formDimensions;
  });

  let previewShape = $derived.by((): ComponentShape | undefined => {
    if (!selectedTemplate || !('shape' in selectedTemplate)) return undefined;
    return selectedTemplate.shape;
  });

  let showPreview = $derived(
    (selectedType === 'card' || selectedType === 'playermat') && previewDimensions !== null
  );

  // Blank preview zone calculations
  let safeAreaPx = $derived(previewDimensions ? mmToPx(3, previewDimensions.dpi) : 0);

  let blankOuterRadius = $derived.by(() => {
    if (!previewDimensions || selectedType !== 'card') return 0;
    return mmToPx(3, previewDimensions.dpi) + previewDimensions.bleedPx;
  });

  let blankInnerRadius = $derived.by(() => {
    if (!previewDimensions || selectedType !== 'card') return 0;
    return mmToPx(3, previewDimensions.dpi);
  });

  let componentFullWidth = $derived(
    previewDimensions
      ? previewDimensions.widthPx + 2 * previewDimensions.bleedPx
      : 0
  );

  let componentFullHeight = $derived(
    previewDimensions
      ? previewDimensions.heightPx + 2 * previewDimensions.bleedPx
      : 0
  );

  let previewScale = $derived.by(() => {
    if (!componentFullWidth || !componentFullHeight) return 1;
    if (!previewContainerWidth || !previewContainerHeight) return 1;
    const pad = 24;
    return Math.min(
      (previewContainerWidth - pad) / componentFullWidth,
      (previewContainerHeight - pad) / componentFullHeight
    );
  });

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
      playerMatHorizontal = state.horizontal;
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
          horizontal: playerMatHorizontal,
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
    playerMatHorizontal = (matDefaults as { horizontal: boolean }).horizontal;
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
  maxWidth={showPreview ? '900px' : '600px'}
  onclose={closeDialog}
>
  {#if !selectedType}
    <ComponentTypeSelector onSelectType={selectType} />
  {:else}
    <div class={showPreview ? 'dialog-body-with-preview' : ''}>
      <div class={showPreview ? 'form-column' : ''}>
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
            bind:horizontal={playerMatHorizontal}
            bind:customWidthMm={playerMatCustomWidth}
            bind:customHeightMm={playerMatCustomHeight}
            templates={templates as PlayerMatComponent[]}
            bind:selectedTemplateId
          />
        {/if}

        {#if errorMessage}
          <p class="error-message">{errorMessage}</p>
        {/if}
      </div>

      {#if showPreview && previewDimensions}
        <div class="preview-panel">
          <div class="preview-label">Preview</div>
          <div
            class="preview-container"
            bind:clientWidth={previewContainerWidth}
            bind:clientHeight={previewContainerHeight}
          >
            <div
              class="preview-scaler"
              style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale({previewScale});
                width: {componentFullWidth}px;
                height: {componentFullHeight}px;
              "
            >
              {#if previewDesign}
                <StaticComponentRenderer
                  design={previewDesign}
                  dimensions={previewDimensions}
                  shape={previewShape}
                />
              {:else}
                <div
                  class="blank-preview"
                  style="width: {componentFullWidth}px; height: {componentFullHeight}px; border-radius: {blankOuterRadius}px;"
                >
                  <div
                    class="blank-trim"
                    style="inset: {previewDimensions.bleedPx}px; border-radius: {blankInnerRadius}px;"
                  ></div>
                  <div
                    class="blank-safe"
                    style="inset: {previewDimensions.bleedPx + safeAreaPx}px;"
                  ></div>
                </div>
              {/if}
            </div>
          </div>
          {#if !previewDesign}
            <div class="preview-legend">
              <span class="legend-item">
                <span class="legend-swatch legend-bleed"></span> Bleed
              </span>
              <span class="legend-item">
                <span class="legend-swatch legend-trim"></span> Trim
              </span>
              <span class="legend-item">
                <span class="legend-swatch legend-safe"></span> Safe area
              </span>
            </div>
          {/if}
        </div>
      {/if}
    </div>
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

  .dialog-body-with-preview {
    display: flex;
    gap: 1.5rem;
  }

  .form-column {
    flex: 1;
    min-width: 0;
  }

  .preview-panel {
    flex: 0 0 280px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .preview-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-sage);
  }

  .preview-container {
    flex: 1;
    min-height: 200px;
    background-color: #f5f5f5;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    overflow: hidden;
    position: relative;
  }

  .blank-preview {
    position: relative;
    background: #e8e4e4;
    overflow: hidden;
  }

  .blank-trim {
    position: absolute;
    background: white;
    border: 4px dashed #b0a8a8;
  }

  .blank-safe {
    position: absolute;
    border: 4px dashed #d4cfcf;
  }

  .preview-legend {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: #666;
    padding-top: 0.375rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .legend-swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .legend-bleed {
    background: #e8e4e4;
    border: 1px solid #ccc;
  }

  .legend-trim {
    background: white;
    border: 1.5px dashed #b0a8a8;
  }

  .legend-safe {
    background: transparent;
    border: 1.5px dashed #d4cfcf;
  }
</style>
