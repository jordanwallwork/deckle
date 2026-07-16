// Thin reactive shell over the pure modules: deep-reactive state, the
// transaction-based history API, and the normalize pass after every commit.
// All behaviour lives in operations/normalize/history — this file only wires
// them to Svelte reactivity.

import type { Selection, TabletopState, Templates, ZoneType } from './types';
import type { VisibilityMap } from './visibility';
import * as hist from './history';
import {
  applyPendingShuffle,
  pendingShuffleDuration,
  planShuffle,
  planZoneFlip,
  requestShuffle,
  zoneFlipDuration,
  type PendingShuffle,
  type ZoneFlipHint
} from './animations';
import { normalize } from './normalize';
import { planReplay, type ReplayFrame } from '../gamerunner/replay';
import { replayStepDuration } from '../gamerunner/replayRegistry';
import type { SetupStep } from '../gamerunner/interpreter';
import {
  convertZone,
  createFreeformZone,
  createGridZone,
  createGroupZone,
  createSpreadZone,
  flipAllInZone
} from './zones';

/** Zone types creatable from the canvas menu. */
const zoneCreators = {
  freeform: createFreeformZone,
  spread: createSpreadZone,
  grid: createGridZone,
  group: createGroupZone
} as const;

export type CreatableZoneType = keyof typeof zoneCreators;

export function createTabletopStore(initialState: TabletopState, templates: Templates) {
  const store = $state<{ state: TabletopState }>({
    state: structuredClone(initialState)
  });

  let history = $state.raw<hist.History<TabletopState>>(hist.createHistory());
  let transaction: hist.Transaction<TabletopState> | null = null;

  // Per-zone ownership/visibility for the current table (#116). Produced by a
  // setup run (#120); consumed by `computeViewState` / the seat switcher (#124).
  // It is NOT part of undo history — undoing a run restores the previous table
  // but not a previous run's visibility map (there is no consumer yet). Empty in
  // the default freeform sandbox, where every zone is fully public and unowned.
  let visibility = $state.raw<VisibilityMap>({});

  const canUndo = $derived(hist.canUndo(history));
  const canRedo = $derived(hist.canRedo(history));

  // ─── Transient animation hints ────────────────────────────────────────────
  // Neither hint is history: the shuffle riffle defers its (already computed)
  // order until the fan lands, the wave flip commits at once and only staggers
  // the render. Both are owned here so any commit can finalise a pending
  // shuffle first — its order is never lost and undo sees exactly one step.
  let shuffleAnimation = $state.raw<PendingShuffle | null>(null);
  let shuffleTimer: ReturnType<typeof setTimeout> | null = null;
  let zoneFlipAnimation = $state.raw<ZoneFlipHint | null>(null);
  let zoneFlipTimer: ReturnType<typeof setTimeout> | null = null;

  /** Commit a pending shuffle's precomputed order as its own undo step. */
  function finalizePendingShuffle(): void {
    const pending = shuffleAnimation;
    if (!pending) return;
    shuffleAnimation = null;
    if (shuffleTimer) {
      clearTimeout(shuffleTimer);
      shuffleTimer = null;
    }
    commit((state) => applyPendingShuffle(state, pending));
  }

  function snapshotState(): TabletopState {
    return structuredClone($state.snapshot(store.state)) as TabletopState;
  }

  function runNormalize(): void {
    normalize(store.state, templates, { dev: import.meta.env.DEV });
  }

  /**
   * Apply an atomic mutation as one history entry: snapshot → mutate →
   * normalize → record.
   */
  function commit(mutator: (state: TabletopState) => void): void {
    finalizePendingShuffle();
    const before = snapshotState();
    mutator(store.state);
    runNormalize();
    history = hist.record(history, before);
  }

  /** Open a transaction (e.g. at drag start). One at a time. */
  function beginTransaction(): void {
    if (transaction) return;
    finalizePendingShuffle();
    transaction = hist.begin(snapshotState());
  }

  /**
   * Apply a transient frame — no history, no normalize. Also used for
   * ephemeral UI state (selection) outside transactions.
   */
  function updateTransient(mutator: (state: TabletopState) => void): void {
    mutator(store.state);
  }

  /** Close the transaction as a single history entry and normalize once. */
  function commitTransaction(): void {
    if (!transaction) return;
    runNormalize();
    history = hist.commitTransaction(history, transaction);
    transaction = null;
  }

  /** Abort the transaction, restoring the exact pre-transaction state. */
  function rollbackTransaction(): void {
    if (!transaction) return;
    store.state = hist.rollbackTransaction(transaction);
    transaction = null;
  }

  function undo(): void {
    finalizePendingShuffle();
    const result = hist.undo(history, snapshotState());
    if (!result) return;
    history = result.history;
    store.state = result.state;
  }

  function redo(): void {
    finalizePendingShuffle();
    const result = hist.redo(history, snapshotState());
    if (!result) return;
    history = result.history;
    store.state = result.state;
  }

  // ─── Animated pile shuffle (deferred commit) ──────────────────────────────

  /**
   * Shuffle the given piles with the riffle animation: the new order is
   * precomputed now (so the fan can land on the eventual top card) and
   * committed when the fan finishes — or sooner if any other commit, or a
   * shuffle of a different pile, interrupts it. A shuffle of a pile already
   * animating is ignored. Commits the whole batch as one undo step.
   */
  function shufflePilesAnimated(pileIds: string[]): void {
    const requested = planShuffle(store.state, pileIds);
    if (!requested) return;
    const decision = requestShuffle(shuffleAnimation, requested);
    // Request ignored (a requested pile is already animating): nothing changes.
    if (decision.finalize === null && decision.next === shuffleAnimation) return;
    if (decision.finalize) finalizePendingShuffle();
    shuffleAnimation = decision.next;
    if (shuffleTimer) clearTimeout(shuffleTimer);
    shuffleTimer = null;
    if (shuffleAnimation) {
      const ms = pendingShuffleDuration(shuffleAnimation);
      shuffleTimer = setTimeout(() => {
        shuffleTimer = null;
        finalizePendingShuffle();
      }, ms);
    }
  }

  // ─── Animated zone-wide flip (wave) ───────────────────────────────────────

  /**
   * Flip every pile in a zone as one commit, rippling the flip across the zone
   * as a wave on spreads and grids. The state change is atomic (single undo
   * step); the wave is a transient render hint the renderers turn into a
   * per-pile CSS transition delay, cleared when the ripple finishes.
   */
  function flipAllInZoneAnimated(zoneId: string): void {
    const hint = planZoneFlip(store.state, templates, zoneId);
    if (hint) {
      const zone = store.state.zones[zoneId];
      zoneFlipAnimation = hint;
      if (zoneFlipTimer) clearTimeout(zoneFlipTimer);
      zoneFlipTimer = setTimeout(
        () => {
          zoneFlipAnimation = null;
          zoneFlipTimer = null;
        },
        zoneFlipDuration(zone ? zone.pileIds.length : 0, hint.staggerMs)
      );
    }
    commit((s) => flipAllInZone(s, templates, zoneId));
  }

  // ─── Animated setup replay (#121) ─────────────────────────────────────────
  // A run is computed up front (#120's runSetup). Rather than dropping the final
  // table on instantly, `playSetupRun` plays the trace back as a progressive
  // reveal (planReplay frames), holding each major step for a registry-driven
  // beat, then commits the AUTHORITATIVE final state exactly once. The original
  // table stays untouched in `store.state` throughout — the frames render
  // through `replayState`, off to the side — so the single closing `commit`
  // still snapshots the pre-run table and the whole run is ONE undo entry.
  //
  // A full replay and a mid-flight skip both finish by committing the same
  // `runSetup` state (`loadSetupRun`), so they land on an identical table; the
  // frames are pure visuals that never feed history.
  let replay = $state.raw<{ frames: ReplayFrame[]; state: TabletopState; visibility: VisibilityMap } | null>(
    null
  );
  let replayIndex = $state(0);
  let replayTimer: ReturnType<typeof setTimeout> | null = null;

  const isReplaying = $derived(replay !== null);
  const replayState = $derived.by((): TabletopState | null => {
    if (!replay) return null;
    const i = Math.min(replayIndex, replay.frames.length - 1);
    return replay.frames[i]?.state ?? null;
  });

  /** Stop replay timers and commit the authoritative final state (one entry). */
  function finalizeReplay(): void {
    const pending = replay;
    if (!pending) return;
    if (replayTimer) {
      clearTimeout(replayTimer);
      replayTimer = null;
    }
    replay = null;
    replayIndex = 0;
    loadSetupRun(pending.state, pending.visibility);
  }

  function scheduleReplayStep(): void {
    if (!replay) return;
    const frame = replay.frames[replayIndex];
    const duration = frame ? replayStepDuration(frame.step) : 0;
    replayTimer = setTimeout(() => {
      replayTimer = null;
      if (!replay) return;
      if (replayIndex >= replay.frames.length - 1) {
        finalizeReplay();
      } else {
        replayIndex += 1;
        scheduleReplayStep();
      }
    }, duration);
  }

  /**
   * Play a computed setup run (#121). Plans a progressive reveal from the run's
   * trace and animates it step by step; when it finishes — or when
   * {@link skipReplay} interrupts it — the run's final state is committed as one
   * undo entry. A run with no trace commits immediately (nothing to animate).
   */
  function playSetupRun(next: TabletopState, nextVisibility: VisibilityMap, trace: SetupStep[]): void {
    finalizeReplay(); // never run two replays at once
    const frames = planReplay(next, trace);
    if (frames.length === 0) {
      loadSetupRun(next, nextVisibility);
      return;
    }
    replay = { frames, state: next, visibility: nextVisibility };
    replayIndex = 0;
    scheduleReplayStep();
  }

  /** Skip/fast-forward: end the replay now and jump to the final table. */
  function skipReplay(): void {
    finalizeReplay();
  }

  function setSelection(selection: Selection): void {
    store.state.selection = selection;
  }

  /**
   * Replace the whole table with a setup run's result as ONE history entry
   * (decision #107 — "whole run one undo entry"): a single `commit` snapshots
   * the pre-run table, swaps in the run's cards/piles/zones, and records once,
   * so a lone undo restores exactly what was there before Play. The run's
   * {@link VisibilityMap} is stored alongside (outside history) for #116/#124.
   */
  function loadSetupRun(next: TabletopState, nextVisibility: VisibilityMap): void {
    commit((s) => {
      s.cards = next.cards;
      s.piles = next.piles;
      s.zones = next.zones;
      s.zoneOrder = next.zoneOrder;
      s.rootPileIds = next.rootPileIds;
      s.selection = { kind: 'none' };
      s.editingZoneId = null;
    });
    visibility = nextVisibility;
  }

  // ─── Zone edit sessions ───────────────────────────────────────────────────
  // Editing a zone is one transaction: everything from entering edit mode to
  // Done lands as a single history entry, and Escape rolls the whole session
  // back — including the zone's creation when the session started from
  // "Add Zone".

  /** Create a zone of the given type centred on a world point and open it
   *  for editing. */
  function createZoneAndEdit(
    worldX: number,
    worldY: number,
    type: CreatableZoneType = 'freeform'
  ): void {
    if (transaction) return;
    beginTransaction();
    const id = zoneCreators[type](store.state, worldX, worldY);
    // Centre the fresh zone on the click, using its own (type-dependent)
    // default size — a top-level zone stores world coordinates directly.
    const zone = store.state.zones[id];
    if (zone) {
      zone.x = worldX - zone.width / 2;
      zone.y = worldY - zone.height / 2;
    }
    store.state.editingZoneId = id;
    store.state.selection = { kind: 'zone', zoneId: id };
  }

  /**
   * Convert the zone currently being edited to another type, as a transient
   * frame of the edit session (Escape reverts it with the rest of the
   * session). Runs normalize immediately for feedback — the conversion splays
   * a deck into a fresh spread and seats piles on a fresh grid's cells — while
   * the single history entry is still deferred to Done. A no-op outside an
   * edit session.
   */
  function convertEditingZone(type: ZoneType): void {
    const id = store.state.editingZoneId;
    if (id === null || !transaction) return;
    convertZone(store.state, templates, id, type);
    runNormalize();
  }

  /** Open an existing (unlocked) zone's edit session. */
  function startZoneEdit(zoneId: string): void {
    if (transaction) return;
    const zone = store.state.zones[zoneId];
    if (!zone || zone.locked) return;
    beginTransaction();
    store.state.editingZoneId = zoneId;
    store.state.selection = { kind: 'zone', zoneId };
  }

  /**
   * End the edit session: Done commits it as one history entry; Escape
   * (commit = false) restores the exact pre-session state.
   */
  function endZoneEdit(commitSession: boolean): void {
    if (store.state.editingZoneId === null || !transaction) return;
    if (commitSession) {
      store.state.editingZoneId = null;
      commitTransaction();
    } else {
      rollbackTransaction();
    }
  }

  return {
    /** The reactive state. Components read it; mutations go through the API. */
    get state() {
      return store.state;
    },
    templates,

    get canUndo() {
      return canUndo;
    },
    get canRedo() {
      return canRedo;
    },
    get inTransaction() {
      return transaction !== null;
    },
    /** The pending shuffle animation (transient; not history), or null. */
    get shuffleAnimation() {
      return shuffleAnimation;
    },
    /** The active zone wave-flip hint (transient; not history), or null. */
    get zoneFlipAnimation() {
      return zoneFlipAnimation;
    },
    /** Per-zone ownership/visibility for the current table (#116), or empty. */
    get visibility() {
      return visibility;
    },
    /** Whether a setup run is currently replaying (#121); input is locked. */
    get isReplaying() {
      return isReplaying;
    },
    /** The current replay frame to render while {@link isReplaying}, or null. */
    get replayState() {
      return replayState;
    },

    commit,
    loadSetupRun,
    playSetupRun,
    skipReplay,
    beginTransaction,
    updateTransient,
    commitTransaction,
    rollbackTransaction,
    undo,
    redo,
    setSelection,
    createZoneAndEdit,
    startZoneEdit,
    convertEditingZone,
    endZoneEdit,
    shufflePilesAnimated,
    flipAllInZoneAnimated
  };
}

export type TabletopStore = ReturnType<typeof createTabletopStore>;
