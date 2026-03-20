import { writable } from 'svelte/store';

/**
 * Store for managing the zoom-to-element action across the editor.
 * This allows the structure tree panel (which is outside ComponentViewer) to
 * trigger zoom-to-element on the preview canvas.
 */
function createZoomActionStore() {
  const { subscribe, set } = writable<((elementId: string) => void) | null>(null);

  return {
    subscribe,
    register: (zoomFn: (elementId: string) => void) => set(zoomFn),
    unregister: () => set(null)
  };
}

export const zoomActionStore = createZoomActionStore();
