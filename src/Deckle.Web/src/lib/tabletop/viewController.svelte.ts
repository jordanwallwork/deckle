// Thin reactive shell over the pure `computeViewState` masking (issue #116).
//
// Solo playtesting is one designer playing every seat, so the tabletop offers a
// seat switcher plus an omniscient "see everything" mode. This controller holds
// nothing but the *chosen viewer* as reactive state and derives the masked view
// from it — switching the viewer changes only what is rendered, NEVER the
// underlying `TabletopState`. All masking logic lives in the pure, tested
// `visibility.ts`; this file only wires it to Svelte reactivity (like
// viewport.svelte.ts wraps viewport.ts), so it is intentionally not unit-tested.

import { computeViewState, type MaskedState, type VisibilityMap, type Viewer } from './visibility';
import type { TabletopState } from './types';

export interface ViewControllerOptions {
  /** Reactive getter for the shared, omniscient tabletop state. */
  getState: () => TabletopState;
  /** Reactive getter for per-zone visibility metadata (defaults to none = all public). */
  getVisibility?: () => VisibilityMap;
  /** Reactive getter for the number of seats at the table (drives the switcher). */
  getSeatCount?: () => number;
}

/**
 * Create the seat/omniscient view controller. Defaults to omniscient (the solo
 * default per #107). `view` is the masked projection for the current viewer;
 * `viewAsSeat` / `viewOmniscient` swap the viewer without touching state.
 */
export function createViewController(opts: ViewControllerOptions) {
  let viewer = $state.raw<Viewer>('omniscient');

  const view = $derived(
    computeViewState(opts.getState(), viewer, opts.getVisibility?.() ?? {})
  );

  return {
    /** The current viewer: a seat index, or 'omniscient'. */
    get viewer(): Viewer {
      return viewer;
    },
    /** Whether the all-seeing view is active. */
    get isOmniscient(): boolean {
      return viewer === 'omniscient';
    },
    /** Number of seats available to switch between. */
    get seatCount(): number {
      return opts.getSeatCount?.() ?? 0;
    },
    /** The masked view of the tabletop for the current viewer. */
    get view(): MaskedState {
      return view;
    },
    /** View the table through a specific seat's eyes. */
    viewAsSeat(seat: number): void {
      viewer = seat;
    },
    /** Return to the all-seeing view. */
    viewOmniscient(): void {
      viewer = 'omniscient';
    },
    /** Set the viewer directly. */
    setViewer(next: Viewer): void {
      viewer = next;
    }
  };
}

export type TabletopViewController = ReturnType<typeof createViewController>;
