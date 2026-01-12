import { writable } from 'svelte/store';

/**
 * Store for managing the save action across the editor.
 * This allows keyboard shortcuts to trigger the same save functionality as the Save button.
 */
function createSaveActionStore() {
  const { subscribe, set } = writable<(() => Promise<void>) | null>(null);

  return {
    subscribe,
    // Register the save function (called by PreviewPanel)
    register: (saveFunction: () => Promise<void>) => set(saveFunction),
    // Unregister the save function (cleanup)
    unregister: () => set(null)
  };
}

export const saveActionStore = createSaveActionStore();
