import { componentsApi } from '$lib/api';
import type { GameComponent, PlayerMatComponent } from '$lib/types';
import type { PlayerMatFormState, ComponentTypeHandler } from './types';

export const playerMatHandler: ComponentTypeHandler<PlayerMatFormState> = {
	defaults(): PlayerMatFormState {
		return {
			componentName: '',
			sizeMode: 'preset',
			presetSize: 'A4',
			orientation: 'Portrait',
			customWidthMm: '210',
			customHeightMm: '297',
			selectedTemplateId: null
		};
	},

	populateFromComponent(component: GameComponent): PlayerMatFormState {
		const mat = component as PlayerMatComponent;
		if (mat.presetSize) {
			return {
				componentName: mat.name,
				sizeMode: 'preset',
				presetSize: mat.presetSize,
				orientation: mat.orientation,
				customWidthMm: '210',
				customHeightMm: '297',
				selectedTemplateId: null
			};
		}
		return {
			componentName: mat.name,
			sizeMode: 'custom',
			presetSize: null,
			orientation: mat.orientation,
			customWidthMm: String(mat.customWidthMm || 210),
			customHeightMm: String(mat.customHeightMm || 297),
			selectedTemplateId: null
		};
	},

	async create(
		projectId: string,
		state: PlayerMatFormState,
		templates: GameComponent[]
	): Promise<void> {
		const created = await componentsApi.createPlayerMat(projectId, {
			name: state.componentName,
			presetSize: state.sizeMode === 'preset' ? state.presetSize : null,
			orientation: state.orientation,
			customWidthMm: state.sizeMode === 'custom' ? parseFloat(state.customWidthMm) : null,
			customHeightMm: state.sizeMode === 'custom' ? parseFloat(state.customHeightMm) : null
		});

		if (state.selectedTemplateId) {
			const template = templates.find(
				(t): t is PlayerMatComponent =>
					t.id === state.selectedTemplateId && t.type === 'PlayerMat'
			);
			if (template) {
				if (template.frontDesign) {
					await componentsApi.saveDesign(projectId, created.id, 'front', template.frontDesign);
				}
				if (template.backDesign) {
					await componentsApi.saveDesign(projectId, created.id, 'back', template.backDesign);
				}
			}
		}
	},

	async update(
		projectId: string,
		componentId: string,
		state: PlayerMatFormState
	): Promise<void> {
		await componentsApi.updatePlayerMat(projectId, componentId, {
			name: state.componentName,
			presetSize: state.sizeMode === 'preset' ? state.presetSize : null,
			orientation: state.orientation,
			customWidthMm: state.sizeMode === 'custom' ? parseFloat(state.customWidthMm) : null,
			customHeightMm: state.sizeMode === 'custom' ? parseFloat(state.customHeightMm) : null
		});
	},

	async loadTemplates(): Promise<GameComponent[]> {
		try {
			const templates = await componentsApi.getSampleTemplates('playermat');
			return templates.filter((t): t is PlayerMatComponent => t.type === 'PlayerMat');
		} catch {
			return [];
		}
	}
};
