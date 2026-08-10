// Svelte context for sharing the store, interaction shell and canvas
// helpers across the tabletop component tree.

import { getContext, setContext } from 'svelte';
import type { SpreadInsertHint } from './drop';
import type { Point } from './geometry';
import type { TabletopInteraction } from './interaction.svelte';
import type { TabletopStore } from './store.svelte';
import type { TabletopViewController } from './viewController.svelte';
import type { MaskedState } from './visibility';

export interface TabletopApi {
  store: TabletopStore;
  interaction: TabletopInteraction;
  /**
   * The seat/omniscient view controller (#124). Holds the chosen viewer and
   * derives the masked view; the toolbar's seat switcher drives it.
   */
  viewController: TabletopViewController;
  /**
   * The state the render layer should draw (#124): the live {@link TabletopState}
   * when viewing omniscient (identity — freeform play unchanged), or the masked
   * projection for the selected seat. Never fed back into the reducer.
   */
  readonly renderState: MaskedState;
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

const TABLETOP_CONTEXT_KEY = Symbol('deckle.tabletop');

export function setTabletopApi(api: TabletopApi): void {
  setContext(TABLETOP_CONTEXT_KEY, api);
}

export function getTabletopApi(): TabletopApi {
  const api = getContext<TabletopApi | undefined>(TABLETOP_CONTEXT_KEY);
  if (!api) {
    throw new Error(
      'Tabletop context not found. Did you forget to render <Tabletop> as an ancestor?'
    );
  }
  return api;
}
