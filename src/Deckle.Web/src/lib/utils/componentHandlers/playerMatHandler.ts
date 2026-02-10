import { componentsApi } from '$lib/api';
import type { GameComponent, PlayerMatComponent } from '$lib/types';
import type { PlayerMatFormState, ComponentTypeHandler } from './types';

export const playerMatHandler: ComponentTypeHandler<PlayerMatFormState> = {
  defaults(): PlayerMatFormState {
    return {
      componentName: '',
      sizeMode: 'preset',
      presetSize: 'A4',
      horizontal: false,
      customWidthMm: '210',
      customHeightMm: '297',
      selectedSampleId: null
    };
  },

  populateFromComponent(component: GameComponent): PlayerMatFormState {
    const mat = component as PlayerMatComponent;
    if (mat.presetSize) {
      return {
        componentName: mat.name,
        sizeMode: 'preset',
        presetSize: mat.presetSize,
        horizontal: mat.horizontal,
        customWidthMm: '210',
        customHeightMm: '297',
        selectedSampleId: null
      };
    }
    return {
      componentName: mat.name,
      sizeMode: 'custom',
      presetSize: null,
      horizontal: mat.horizontal,
      customWidthMm: String(mat.customWidthMm || 210),
      customHeightMm: String(mat.customHeightMm || 297),
      selectedSampleId: null
    };
  },

  async create(projectId: string, state: PlayerMatFormState): Promise<void> {
    const created = await componentsApi.createPlayerMat(projectId, {
      name: state.componentName,
      presetSize: state.sizeMode === 'preset' ? state.presetSize : null,
      horizontal: state.horizontal,
      customWidthMm: state.sizeMode === 'custom' ? parseFloat(state.customWidthMm) : null,
      customHeightMm: state.sizeMode === 'custom' ? parseFloat(state.customHeightMm) : null,
      sample: state.selectedSampleId
    });
  },

  async update(projectId: string, componentId: string, state: PlayerMatFormState): Promise<void> {
    await componentsApi.updatePlayerMat(projectId, componentId, {
      name: state.componentName,
      presetSize: state.sizeMode === 'preset' ? state.presetSize : null,
      horizontal: state.horizontal,
      customWidthMm: state.sizeMode === 'custom' ? parseFloat(state.customWidthMm) : null,
      customHeightMm: state.sizeMode === 'custom' ? parseFloat(state.customHeightMm) : null
    });
  },

  async loadSamples(): Promise<GameComponent[]> {
    try {
      const samples = await componentsApi.getSamples('playermat');
      return samples.filter((t): t is PlayerMatComponent => t.type === 'PlayerMat');
    } catch {
      return [];
    }
  }
};
