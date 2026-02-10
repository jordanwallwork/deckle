import type { GameComponent } from '$lib/types';

export type ComponentTypeKey = 'card' | 'dice' | 'playermat';

export interface CardFormState {
  componentName: string;
  cardSize: string;
  cardHorizontal: boolean;
  selectedSampleId: string | null;
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
  selectedSampleId: string | null;
}

export type FormState = CardFormState | DiceFormState | PlayerMatFormState;

export interface ComponentTypeHandler<TState extends FormState> {
  defaults(): TState;
  populateFromComponent(component: GameComponent): TState;
  create(projectId: string, state: TState): Promise<void>;
  update(projectId: string, componentId: string, state: TState): Promise<void>;
  loadSamples(): Promise<GameComponent[]>;
}
