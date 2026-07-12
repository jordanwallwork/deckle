// Svelte context for sharing the v2 store, interaction shell and canvas
// helpers across the v2 tabletop component tree.

import { getContext, setContext } from 'svelte';
import type { SpreadInsertHint } from './drop';
import type { Point } from './geometry';
import type { TabletopInteraction } from './interaction.svelte';
import type { TabletopStore } from './store.svelte';

export interface TabletopApi {
  store: TabletopStore;
  interaction: TabletopInteraction;
  /** Convert a client (viewport) point to world coordinates. */
  clientToWorld(clientX: number, clientY: number): Point;
  /** Open the pile context menu at a client (viewport) position. */
  openPileContextMenu(pileId: string, clientX: number, clientY: number): void;
  /** Open the zone context menu at a client (viewport) position. */
  openZoneContextMenu(zoneId: string, clientX: number, clientY: number): void;
  /** The spread slot the active drag (pointer or sidebar) would insert at. */
  readonly dropHint: SpreadInsertHint | null;
  /** The zone the active drag currently hovers as its drop region. */
  readonly dropTargetZoneId: string | null;
  /** Report the template being HTML5-dragged from the sidebar (null at end). */
  setTemplateDrag(templateId: string | null): void;
}

const TABLETOP_V2_CONTEXT_KEY = Symbol('deckle.tabletop.v2');

export function setTabletopApi(api: TabletopApi): void {
  setContext(TABLETOP_V2_CONTEXT_KEY, api);
}

export function getTabletopApi(): TabletopApi {
  const api = getContext<TabletopApi | undefined>(TABLETOP_V2_CONTEXT_KEY);
  if (!api) {
    throw new Error(
      'Tabletop v2 context not found. Did you forget to render <TabletopV2> as an ancestor?'
    );
  }
  return api;
}
