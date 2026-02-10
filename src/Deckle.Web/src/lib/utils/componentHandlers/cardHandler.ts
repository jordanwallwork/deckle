import { componentsApi } from '$lib/api';
import type { GameComponent, CardComponent } from '$lib/types';
import type { CardFormState, ComponentTypeHandler } from './types';

export const cardHandler: ComponentTypeHandler<CardFormState> = {
  defaults(): CardFormState {
    return {
      componentName: '',
      cardSize: 'StandardPoker',
      cardHorizontal: false,
      selectedSampleId: null
    };
  },

  populateFromComponent(component: GameComponent): CardFormState {
    const card = component as CardComponent;
    return {
      componentName: card.name,
      cardSize: card.size,
      cardHorizontal: card.horizontal,
      selectedSampleId: null
    };
  },

  async create(projectId: string, state: CardFormState): Promise<void> {
    const created = await componentsApi.createCard(projectId, {
      name: state.componentName,
      size: state.cardSize,
      horizontal: state.cardHorizontal,
      sample: state.selectedSampleId
    });
  },

  async update(projectId: string, componentId: string, state: CardFormState): Promise<void> {
    await componentsApi.updateCard(projectId, componentId, {
      name: state.componentName,
      size: state.cardSize,
      horizontal: state.cardHorizontal
    });
  },

  async loadSamples(): Promise<GameComponent[]> {
    try {
      const samples = await componentsApi.getSamples('card');
      return samples.filter((t): t is CardComponent => t.type === 'Card');
    } catch {
      return [];
    }
  }
};
