import type { ComponentTypeKey, FormState, ComponentTypeHandler } from './types';
import { cardHandler } from './cardHandler';
import { diceHandler } from './diceHandler';
import { playerMatHandler } from './playerMatHandler';

export type { ComponentTypeKey, FormState, CardFormState, DiceFormState, PlayerMatFormState } from './types';
export type { ComponentTypeHandler } from './types';

const handlers: Record<ComponentTypeKey, ComponentTypeHandler<FormState>> = {
	card: cardHandler,
	dice: diceHandler,
	playermat: playerMatHandler
};

export function getHandler(type: ComponentTypeKey): ComponentTypeHandler<FormState> {
	return handlers[type];
}

export function getTypeKey(componentType: string): ComponentTypeKey {
	switch (componentType) {
		case 'Card':
			return 'card';
		case 'Dice':
			return 'dice';
		case 'PlayerMat':
			return 'playermat';
		default:
			throw new Error(`Unknown component type: ${componentType}`);
	}
}
