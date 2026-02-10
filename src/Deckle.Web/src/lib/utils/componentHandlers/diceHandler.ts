import { componentsApi } from '$lib/api';
import type { GameComponent, DiceComponent } from '$lib/types';
import type { DiceFormState, ComponentTypeHandler } from './types';

export const diceHandler: ComponentTypeHandler<DiceFormState> = {
	defaults(): DiceFormState {
		return {
			componentName: '',
			diceType: 'D6',
			diceStyle: 'Numbered',
			diceColor: 'EarthGreen',
			diceNumber: 1
		};
	},

	populateFromComponent(component: GameComponent): DiceFormState {
		const dice = component as DiceComponent;
		return {
			componentName: dice.name,
			diceType: dice.diceType,
			diceStyle: dice.style,
			diceColor: dice.baseColor,
			diceNumber: dice.number
		};
	},

	async create(projectId: string, state: DiceFormState): Promise<void> {
		await componentsApi.createDice(projectId, {
			name: state.componentName,
			type: state.diceType,
			style: state.diceStyle,
			baseColor: state.diceColor,
			number: state.diceNumber
		});
	},

	async update(projectId: string, componentId: string, state: DiceFormState): Promise<void> {
		await componentsApi.updateDice(projectId, componentId, {
			name: state.componentName,
			type: state.diceType,
			style: state.diceStyle,
			baseColor: state.diceColor,
			number: state.diceNumber
		});
	},

	async loadSamples(): Promise<GameComponent[]> {
		return [];
	}
};
