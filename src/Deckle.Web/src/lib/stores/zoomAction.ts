import { writable } from 'svelte/store';

function createZoomActionStore() {
  const { subscribe, set } = writable<((elementId: string) => void) | null>(null);

  return {
    subscribe,
    register: (fn: (elementId: string) => void) => set(fn),
    unregister: () => set(null)
  };
}

export const zoomActionStore = createZoomActionStore();
