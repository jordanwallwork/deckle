// Svelte context for sharing the TabletopStore across the tabletop component
// tree. The `Tabletop.svelte` root calls `setTabletopApi`; descendants call
// `getTabletopApi` to read state and dispatch operations.

import { getContext, setContext } from 'svelte';
import type { TabletopStore } from './store.svelte';

const TABLETOP_CONTEXT_KEY = Symbol('deckle.tabletop');

export function setTabletopApi(store: TabletopStore): void {
  setContext(TABLETOP_CONTEXT_KEY, store);
}

export function getTabletopApi(): TabletopStore {
  const store = getContext<TabletopStore | undefined>(TABLETOP_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      'TabletopApi context not found. Did you forget to render <Tabletop> as an ancestor?'
    );
  }
  return store;
}
