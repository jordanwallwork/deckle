import type { GameComponent, Dimensions, ComponentShape } from '$lib/types';
import type { ContainerElement } from '$lib/components/editor/types';
import {
	getHandler,
	getTypeKey,
	type ComponentTypeKey,
	type FormState
} from '$lib/utils/componentHandlers';
import { mmToPx } from '$lib/utils/size.utils';
import { CARD_SIZES, GAME_BOARD_SIZES, PLAYER_MAT_SIZES } from '$lib/constants';

const DPI = 300;
const BLEED_MM = 3;

export class ComponentDialogState {
  // Form state
  selectedType: ComponentTypeKey | null = $state(null);
  isSubmitting = $state(false);
  errorMessage = $state('');
  componentName = $state('');

  // Card
  cardSize = $state('StandardPoker');
  cardHorizontal = $state(false);

  // Dice
  diceType = $state('D6');
  diceStyle = $state('Numbered');
  diceColor = $state('EarthGreen');
  diceNumber = $state(1);

  // Game Board
  gameBoardSizeMode: 'preset' | 'custom' = $state('preset');
  gameBoardPresetSize: string | null = $state('MediumBifoldRectangle');
  gameBoardHorizontal = $state(true);
  gameBoardCustomWidth = $state('457');
  gameBoardCustomHeight = $state('305');
  gameBoardCustomHorizontalFolds = $state('1');
  gameBoardCustomVerticalFolds = $state('1');

  // Player Mat
  playerMatSizeMode: 'preset' | 'custom' = $state('preset');
  playerMatPresetSize: string | null = $state('A4');
  playerMatHorizontal = $state(false);
  playerMatCustomWidth = $state('210');
  playerMatCustomHeight = $state('297');

  // Samples
  samples: GameComponent[] = $state([]);
  selectedSampleId: string | null = $state(null);

  selectedSample = $derived(
    this.selectedSampleId
      ? (this.samples.find((t) => t.id === this.selectedSampleId) ?? null)
      : null
  );

  formDimensions = $derived.by((): Dimensions | null => {
    let widthMm: number;
    let heightMm: number;

    if (this.selectedType === 'card') {
      const size = CARD_SIZES.find((s) => s.value === this.cardSize);
      if (!size) return null;
      widthMm = this.cardHorizontal ? size.heightMm : size.widthMm;
      heightMm = this.cardHorizontal ? size.widthMm : size.heightMm;
    } else if (this.selectedType === 'gameboard') {
      if (this.gameBoardSizeMode === 'preset') {
        const size = GAME_BOARD_SIZES.find((s) => s.value === this.gameBoardPresetSize);
        if (!size) return null;
        widthMm = this.gameBoardHorizontal ? size.landscapeWidthMm : size.landscapeHeightMm;
        heightMm = this.gameBoardHorizontal ? size.landscapeHeightMm : size.landscapeWidthMm;
      } else {
        const w = parseFloat(this.gameBoardCustomWidth);
        const h = parseFloat(this.gameBoardCustomHeight);
        if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;
        widthMm = w;
        heightMm = h;
      }
    } else if (this.selectedType === 'playermat') {
      if (this.playerMatSizeMode === 'preset') {
        const size = PLAYER_MAT_SIZES.find((s) => s.value === this.playerMatPresetSize);
        if (!size) return null;
        widthMm = this.playerMatHorizontal ? size.heightMm : size.widthMm;
        heightMm = this.playerMatHorizontal ? size.widthMm : size.heightMm;
      } else {
        const w = parseFloat(this.playerMatCustomWidth);
        const h = parseFloat(this.playerMatCustomHeight);
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

  previewHorizontalFolds = $derived.by((): number => {
    if (this.selectedType !== 'gameboard') return 0;
    if (this.gameBoardSizeMode === 'preset') {
      const size = GAME_BOARD_SIZES.find((s) => s.value === this.gameBoardPresetSize);
      if (!size) return 0;
      return size.isQuadFold ? 1 : (this.gameBoardHorizontal ? 0 : 1);
    }
    const v = parseInt(this.gameBoardCustomHorizontalFolds);
    return isNaN(v) ? 0 : Math.max(0, v);
  });

  previewVerticalFolds = $derived.by((): number => {
    if (this.selectedType !== 'gameboard') return 0;
    if (this.gameBoardSizeMode === 'preset') {
      const size = GAME_BOARD_SIZES.find((s) => s.value === this.gameBoardPresetSize);
      if (!size) return 0;
      return size.isQuadFold ? 1 : (this.gameBoardHorizontal ? 1 : 0);
    }
    const v = parseInt(this.gameBoardCustomVerticalFolds);
    return isNaN(v) ? 0 : Math.max(0, v);
  });

  showPreview = $derived(
    (this.selectedType === 'card' ||
      this.selectedType === 'gameboard' ||
      this.selectedType === 'playermat') &&
      this.formDimensions !== null
  );

  previewDesign = $derived.by((): ContainerElement | null => {
    if (!this.selectedSample) return null;
    if (!('frontDesign' in this.selectedSample) || !this.selectedSample.frontDesign)
      return null;
    try {
      return JSON.parse(this.selectedSample.frontDesign) as ContainerElement;
    } catch {
      return null;
    }
  });

  previewDimensions = $derived.by((): Dimensions | null => {
    if (this.selectedSample && 'dimensions' in this.selectedSample) {
      return this.selectedSample.dimensions;
    }
    return this.formDimensions;
  });

  previewShape = $derived.by((): ComponentShape | undefined => {
    if (!this.selectedSample || !('shape' in this.selectedSample)) return undefined;
    return this.selectedSample.shape;
  });

  applyFormState(state: FormState) {
    this.componentName = state.componentName;

    if ('cardSize' in state) {
      this.cardSize = state.cardSize;
      this.cardHorizontal = state.cardHorizontal;
      this.selectedSampleId = state.selectedSampleId;
    } else if ('diceType' in state) {
      this.diceType = state.diceType;
      this.diceStyle = state.diceStyle;
      this.diceColor = state.diceColor;
      this.diceNumber = state.diceNumber;
    } else if ('customHorizontalFolds' in state) {
      this.gameBoardSizeMode = state.sizeMode;
      this.gameBoardPresetSize = state.presetSize;
      this.gameBoardHorizontal = state.horizontal;
      this.gameBoardCustomWidth = state.customWidthMm;
      this.gameBoardCustomHeight = state.customHeightMm;
      this.gameBoardCustomHorizontalFolds = state.customHorizontalFolds;
      this.gameBoardCustomVerticalFolds = state.customVerticalFolds;
      this.selectedSampleId = state.selectedSampleId;
    } else if ('sizeMode' in state) {
      this.playerMatSizeMode = state.sizeMode;
      this.playerMatPresetSize = state.presetSize;
      this.playerMatHorizontal = state.horizontal;
      this.playerMatCustomWidth = state.customWidthMm;
      this.playerMatCustomHeight = state.customHeightMm;
      this.selectedSampleId = state.selectedSampleId;
    }
  }

  collectFormState(): FormState {
    switch (this.selectedType) {
      case 'card':
        return {
          componentName: this.componentName,
          cardSize: this.cardSize,
          cardHorizontal: this.cardHorizontal,
          selectedSampleId: this.selectedSampleId
        };
      case 'dice':
        return {
          componentName: this.componentName,
          diceType: this.diceType,
          diceStyle: this.diceStyle,
          diceColor: this.diceColor,
          diceNumber: this.diceNumber
        };
      case 'gameboard':
        return {
          componentName: this.componentName,
          sizeMode: this.gameBoardSizeMode,
          presetSize: this.gameBoardPresetSize,
          horizontal: this.gameBoardHorizontal,
          customWidthMm: this.gameBoardCustomWidth,
          customHeightMm: this.gameBoardCustomHeight,
          customHorizontalFolds: this.gameBoardCustomHorizontalFolds,
          customVerticalFolds: this.gameBoardCustomVerticalFolds,
          selectedSampleId: this.selectedSampleId
        };
      case 'playermat':
        return {
          componentName: this.componentName,
          sizeMode: this.playerMatSizeMode,
          presetSize: this.playerMatPresetSize,
          horizontal: this.playerMatHorizontal,
          customWidthMm: this.playerMatCustomWidth,
          customHeightMm: this.playerMatCustomHeight,
          selectedSampleId: this.selectedSampleId
        };
      default:
        throw new Error('No type selected');
    }
  }

  reset() {
    this.selectedType = null;
    this.componentName = '';
    this.errorMessage = '';
    this.samples = [];
    this.selectedSampleId = null;

    const cardDefaults = getHandler('card').defaults();
    this.cardSize = (cardDefaults as { cardSize: string }).cardSize;
    this.cardHorizontal = (cardDefaults as { cardHorizontal: boolean }).cardHorizontal;

    const diceDefaults = getHandler('dice').defaults();
    this.diceType = (diceDefaults as { diceType: string }).diceType;
    this.diceStyle = (diceDefaults as { diceStyle: string }).diceStyle;
    this.diceColor = (diceDefaults as { diceColor: string }).diceColor;
    this.diceNumber = (diceDefaults as { diceNumber: number }).diceNumber;

    const boardDefaults = getHandler('gameboard').defaults();
    this.gameBoardSizeMode = (boardDefaults as { sizeMode: 'preset' | 'custom' }).sizeMode;
    this.gameBoardPresetSize = (boardDefaults as { presetSize: string | null }).presetSize;
    this.gameBoardHorizontal = (boardDefaults as { horizontal: boolean }).horizontal;
    this.gameBoardCustomWidth = (boardDefaults as { customWidthMm: string }).customWidthMm;
    this.gameBoardCustomHeight = (boardDefaults as { customHeightMm: string }).customHeightMm;
    this.gameBoardCustomHorizontalFolds = (boardDefaults as { customHorizontalFolds: string }).customHorizontalFolds;
    this.gameBoardCustomVerticalFolds = (boardDefaults as { customVerticalFolds: string }).customVerticalFolds;

    const matDefaults = getHandler('playermat').defaults();
    this.playerMatSizeMode = (matDefaults as { sizeMode: 'preset' | 'custom' }).sizeMode;
    this.playerMatPresetSize = (matDefaults as { presetSize: string | null }).presetSize;
    this.playerMatHorizontal = (matDefaults as { horizontal: boolean }).horizontal;
    this.playerMatCustomWidth = (matDefaults as { customWidthMm: string }).customWidthMm;
    this.playerMatCustomHeight = (matDefaults as { customHeightMm: string }).customHeightMm;
  }

  initForEdit(component: GameComponent) {
    const typeKey = getTypeKey(component.type);
    this.selectedType = typeKey;
    const handler = getHandler(typeKey);
    this.applyFormState(handler.populateFromComponent(component));
    this.samples = [];
    this.errorMessage = '';
  }

  async selectType(type: ComponentTypeKey) {
    this.selectedType = type;
    this.selectedSampleId = null;
    this.errorMessage = '';
    this.samples = await getHandler(type).loadSamples();
  }

  async handleSubmit(
    projectId: string,
    editComponent: GameComponent | null,
    onsaved: () => void,
    closeDialog: () => void
  ) {
    if (!this.componentName.trim()) {
      this.errorMessage = 'Please enter a component name';
      return;
    }

    if (!this.selectedType) {
      this.errorMessage = 'Please select a component type';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const handler = getHandler(this.selectedType);
      const state = this.collectFormState();
      console.log(handler, state);
      if (editComponent) {
        await handler.update(projectId, editComponent.id, state);
      } else {
        await handler.create(projectId, state);
      }

      onsaved();
      closeDialog();
    } catch (err) {
      console.error('Error saving component:', err);
      const { ApiError } = await import('$lib/api');
      if (err instanceof ApiError) {
        this.errorMessage = err.message;
      } else {
        this.errorMessage = `Failed to ${editComponent ? 'update' : 'create'} component. Please try again.`;
      }
    } finally {
      this.isSubmitting = false;
    }
  }
}
