import { adminApi } from '$lib/api';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { CardComponent, PlayerMatComponent } from '$lib/types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  try {
    const component = await adminApi.getSample(params.componentId, fetch);

    if (!('dimensions' in component)) {
      throw error(400, 'Component does not have dimensions');
    }

    const part = params.part;
    if (part !== 'front' && part !== 'back') {
      throw error(400, 'Part must be front or back');
    }

    // Cast to editable component type (Card or PlayerMat)
    const editableComponent = component as CardComponent | PlayerMatComponent;

    return {
      component: editableComponent,
      part
    };
  } catch (err) {
    console.error('Failed to load sample component:', err);
    throw error(404, 'Sample component not found');
  }
};
