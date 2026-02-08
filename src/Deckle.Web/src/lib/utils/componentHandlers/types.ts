import type { GameComponent, CardComponent, PlayerMatComponent } from '$lib/types';

export type ComponentTypeKey = 'card' | 'dice' | 'playermat';

export interface CardFormState {
	componentName: string;
	cardSize: string;
	cardHorizontal: boolean;
	selectedTemplateId: string | null;
}

export interface DiceFormState {
	componentName: string;
	diceType: string;
	diceStyle: string;
	diceColor: string;
	diceNumber: number;
}

export interface PlayerMatFormState {
	componentName: string;
	sizeMode: 'preset' | 'custom';
	presetSize: string | null;
	horizontal: boolean;
	customWidthMm: string;
	customHeightMm: string;
	selectedTemplateId: string | null;
}

export type FormState = CardFormState | DiceFormState | PlayerMatFormState;

export interface ComponentTypeHandler<TState extends FormState> {
	defaults(): TState;
	populateFromComponent(component: GameComponent): TState;
	create(
		projectId: string,
		state: TState,
		templates: GameComponent[]
	): Promise<void>;
	update(
		projectId: string,
		componentId: string,
		state: TState
	): Promise<void>;
	loadTemplates(): Promise<GameComponent[]>;
}
