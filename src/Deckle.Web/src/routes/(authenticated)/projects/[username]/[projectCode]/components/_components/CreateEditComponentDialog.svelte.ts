import type { GameComponent, Dimensions, ComponentShape } from '$lib/types';
import type { ContainerElement } from '$lib/components/editor/types';
import {
	getHandler,
	getTypeKey,
	type ComponentTypeKey,
	type FormState
} from '$lib/utils/componentHandlers';
import { mmToPx } from '$lib/utils/size.utils';
import { CARD_SIZES, PLAYER_MAT_SIZES } from '$lib/constants';

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
	diceNumber = $state('1');

	// Player Mat
	playerMatSizeMode: 'preset' | 'custom' = $state('preset');
	playerMatPresetSize: string | null = $state('A4');
	playerMatHorizontal = $state(false);
	playerMatCustomWidth = $state('210');
	playerMatCustomHeight = $state('297');

	// Templates
	templates: GameComponent[] = $state([]);
	selectedTemplateId: string | null = $state(null);

	selectedTemplate = $derived(
		this.selectedTemplateId
			? this.templates.find((t) => t.id === this.selectedTemplateId) ?? null
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

	showPreview = $derived(
		(this.selectedType === 'card' || this.selectedType === 'playermat') &&
			this.formDimensions !== null
	);

	previewDesign = $derived.by((): ContainerElement | null => {
		if (!this.selectedTemplate) return null;
		if (!('frontDesign' in this.selectedTemplate) || !this.selectedTemplate.frontDesign)
			return null;
		try {
			return JSON.parse(this.selectedTemplate.frontDesign) as ContainerElement;
		} catch {
			return null;
		}
	});

	previewDimensions = $derived.by((): Dimensions | null => {
		if (this.selectedTemplate && 'dimensions' in this.selectedTemplate) {
			return this.selectedTemplate.dimensions;
		}
		return this.formDimensions;
	});

	previewShape = $derived.by((): ComponentShape | undefined => {
		if (!this.selectedTemplate || !('shape' in this.selectedTemplate)) return undefined;
		return this.selectedTemplate.shape;
	});

	applyFormState(state: FormState) {
		this.componentName = state.componentName;

		if ('cardSize' in state) {
			this.cardSize = state.cardSize;
			this.cardHorizontal = state.cardHorizontal;
			this.selectedTemplateId = state.selectedTemplateId;
		} else if ('diceType' in state) {
			this.diceType = state.diceType;
			this.diceStyle = state.diceStyle;
			this.diceColor = state.diceColor;
			this.diceNumber = state.diceNumber;
		} else if ('sizeMode' in state) {
			this.playerMatSizeMode = state.sizeMode;
			this.playerMatPresetSize = state.presetSize;
			this.playerMatHorizontal = state.horizontal;
			this.playerMatCustomWidth = state.customWidthMm;
			this.playerMatCustomHeight = state.customHeightMm;
			this.selectedTemplateId = state.selectedTemplateId;
		}
	}

	collectFormState(): FormState {
		switch (this.selectedType) {
			case 'card':
				return {
					componentName: this.componentName,
					cardSize: this.cardSize,
					cardHorizontal: this.cardHorizontal,
					selectedTemplateId: this.selectedTemplateId
				};
			case 'dice':
				return {
					componentName: this.componentName,
					diceType: this.diceType,
					diceStyle: this.diceStyle,
					diceColor: this.diceColor,
					diceNumber: this.diceNumber
				};
			case 'playermat':
				return {
					componentName: this.componentName,
					sizeMode: this.playerMatSizeMode,
					presetSize: this.playerMatPresetSize,
					horizontal: this.playerMatHorizontal,
					customWidthMm: this.playerMatCustomWidth,
					customHeightMm: this.playerMatCustomHeight,
					selectedTemplateId: this.selectedTemplateId
				};
			default:
				throw new Error('No type selected');
		}
	}

	reset() {
		this.selectedType = null;
		this.componentName = '';
		this.errorMessage = '';
		this.templates = [];
		this.selectedTemplateId = null;

		const cardDefaults = getHandler('card').defaults();
		this.cardSize = (cardDefaults as { cardSize: string }).cardSize;
		this.cardHorizontal = (cardDefaults as { cardHorizontal: boolean }).cardHorizontal;

		const diceDefaults = getHandler('dice').defaults();
		this.diceType = (diceDefaults as { diceType: string }).diceType;
		this.diceStyle = (diceDefaults as { diceStyle: string }).diceStyle;
		this.diceColor = (diceDefaults as { diceColor: string }).diceColor;
		this.diceNumber = (diceDefaults as { diceNumber: string }).diceNumber;

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
		this.templates = [];
		this.errorMessage = '';
	}

	async selectType(type: ComponentTypeKey) {
		this.selectedType = type;
		this.selectedTemplateId = null;
		this.errorMessage = '';
		this.templates = await getHandler(type).loadTemplates();
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

			if (editComponent) {
				await handler.update(projectId, editComponent.id, state);
			} else {
				await handler.create(projectId, state, this.templates);
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
