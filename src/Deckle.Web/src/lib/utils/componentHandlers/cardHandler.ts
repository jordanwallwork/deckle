import { componentsApi, dataSourcesApi } from '$lib/api';
import type { GameComponent, CardComponent } from '$lib/types';
import type { CardFormState, ComponentTypeHandler } from './types';

export const cardHandler: ComponentTypeHandler<CardFormState> = {
	defaults(): CardFormState {
		return {
			componentName: '',
			cardSize: 'StandardPoker',
			cardHorizontal: false,
			selectedTemplateId: null
		};
	},

	populateFromComponent(component: GameComponent): CardFormState {
		const card = component as CardComponent;
		return {
			componentName: card.name,
			cardSize: card.size,
			cardHorizontal: card.horizontal,
			selectedTemplateId: null
		};
	},

	async create(
		projectId: string,
		state: CardFormState,
		templates: GameComponent[]
	): Promise<void> {
		const created = await componentsApi.createCard(projectId, {
			name: state.componentName,
			size: state.cardSize,
			horizontal: state.cardHorizontal
		});

		if (state.selectedTemplateId) {
			const template = templates.find(
				(t): t is CardComponent => t.id === state.selectedTemplateId && t.type === 'Card'
			);
			if (template) {
				if (template.frontDesign) {
					await componentsApi.saveDesign(projectId, created.id, 'front', template.frontDesign);
				}
				if (template.backDesign) {
					await componentsApi.saveDesign(projectId, created.id, 'back', template.backDesign);
				}
				if (template.dataSource) {
					const copiedDs = await dataSourcesApi.copySample({
						projectId,
						sampleDataSourceId: template.dataSource.id
					});
					await componentsApi.updateDataSource(projectId, created.id, copiedDs.id);
				}
			}
		}
	},

	async update(projectId: string, componentId: string, state: CardFormState): Promise<void> {
		await componentsApi.updateCard(projectId, componentId, {
			name: state.componentName,
			size: state.cardSize,
			horizontal: state.cardHorizontal
		});
	},

	async loadTemplates(): Promise<GameComponent[]> {
		try {
			const templates = await componentsApi.getSampleTemplates('card');
			return templates.filter((t): t is CardComponent => t.type === 'Card');
		} catch {
			return [];
		}
	}
};
