import { componentsApi } from '$lib/api';
import type { GameComponent, GameBoardComponent } from '$lib/types';
import type { GameBoardFormState, ComponentTypeHandler } from './types';

export const gameBoardHandler: ComponentTypeHandler<GameBoardFormState> = {
  defaults(): GameBoardFormState {
    return {
      componentName: '',
      sizeMode: 'preset',
      presetSize: 'MediumBifoldRectangle',
      horizontal: true,
      customWidthMm: '457',
      customHeightMm: '305',
      customHorizontalFolds: '1',
      customVerticalFolds: '1',
      selectedSampleId: null
    };
  },

  populateFromComponent(component: GameComponent): GameBoardFormState {
    const board = component as GameBoardComponent;
    if (board.presetSize) {
      return {
        componentName: board.name,
        sizeMode: 'preset',
        presetSize: board.presetSize,
        horizontal: board.horizontal,
        customWidthMm: '457',
        customHeightMm: '305',
        customHorizontalFolds: '1',
        customVerticalFolds: '1',
        selectedSampleId: null
      };
    }
    return {
      componentName: board.name,
      sizeMode: 'custom',
      presetSize: null,
      horizontal: board.horizontal,
      customWidthMm: String(board.customWidthMm ?? 457),
      customHeightMm: String(board.customHeightMm ?? 305),
      customHorizontalFolds: String(board.customHorizontalFolds ?? 1),
      customVerticalFolds: String(board.customVerticalFolds ?? 1),
      selectedSampleId: null
    };
  },

  async create(projectId: string, state: GameBoardFormState): Promise<void> {
    await componentsApi.createGameBoard(projectId, {
      name: state.componentName,
      presetSize: state.sizeMode === 'preset' ? state.presetSize : null,
      horizontal: state.horizontal,
      customWidthMm: state.sizeMode === 'custom' ? parseFloat(state.customWidthMm) : null,
      customHeightMm: state.sizeMode === 'custom' ? parseFloat(state.customHeightMm) : null,
      customHorizontalFolds: state.sizeMode === 'custom' ? parseInt(state.customHorizontalFolds) : null,
      customVerticalFolds: state.sizeMode === 'custom' ? parseInt(state.customVerticalFolds) : null,
      sample: state.selectedSampleId
    });
  },

  async update(projectId: string, componentId: string, state: GameBoardFormState): Promise<void> {
    await componentsApi.updateGameBoard(projectId, componentId, {
      name: state.componentName,
      presetSize: state.sizeMode === 'preset' ? state.presetSize : null,
      horizontal: state.horizontal,
      customWidthMm: state.sizeMode === 'custom' ? parseFloat(state.customWidthMm) : null,
      customHeightMm: state.sizeMode === 'custom' ? parseFloat(state.customHeightMm) : null,
      customHorizontalFolds: state.sizeMode === 'custom' ? parseInt(state.customHorizontalFolds) : null,
      customVerticalFolds: state.sizeMode === 'custom' ? parseInt(state.customVerticalFolds) : null
    });
  },

  async loadSamples(): Promise<GameComponent[]> {
    try {
      const samples = await componentsApi.getSamples('gameboard');
      return samples.filter((t): t is GameBoardComponent => t.type === 'GameBoard');
    } catch {
      return [];
    }
  }
};
