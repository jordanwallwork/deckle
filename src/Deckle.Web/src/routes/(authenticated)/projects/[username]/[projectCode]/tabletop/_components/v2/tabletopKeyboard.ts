// Keyboard shortcuts for the v2 tabletop. Pulled out of the shell so the
// component stays a thin wiring layer: this owns undo/redo, Escape handling,
// and the F/R/S selection/zone actions, each as one undo step. The shell hands
// in the store, interaction reducer and a few view callbacks it can't see from
// here (open menus, sidebar-drag hover).
import type { TabletopInteraction, TabletopStore } from '$lib/tabletop/v2';
import {
  flipPiles,
  flippablePiles,
  rollablePiles,
  rotateAllInZone,
  rotatablePiles,
  rotatePiles,
  selectedPileIds,
  shufflablePiles,
  shuffleOrRollablePiles,
  shuffleOrRollPiles,
  shuffleZoneContents,
  zoneActions
} from '$lib/tabletop/v2';

export interface TabletopKeyboardContext {
  store: TabletopStore;
  interaction: TabletopInteraction;
  /** True while any context menu is open. */
  hasOpenMenu: () => boolean;
  /** Close every open context menu. */
  closeMenus: () => void;
  /** Reset the sidebar-drag hover flag (a mid-flight drag is being aborted). */
  clearSidebarHover: () => void;
}

export function handleTabletopKeydown(e: KeyboardEvent, ctx: TabletopKeyboardContext): void {
  const { store, interaction, hasOpenMenu, closeMenus, clearSidebarHover } = ctx;

  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const modKey = e.ctrlKey || e.metaKey;

  // A zone-edit session swallows everything except Escape (cancel the whole
  // session): undo/redo would fight the open transaction, and F/R/S have no
  // business inside an edit.
  if (store.state.editingZoneId !== null) {
    if (e.key === 'Escape') {
      e.preventDefault();
      clearSidebarHover();
      interaction.cancel(); // abort a mid-flight resize drag first
      store.endZoneEdit(false);
    }
    return;
  }

  if (modKey && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    store.undo();
    return;
  }
  if (modKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    store.redo();
    return;
  }

  if (e.key === 'Escape') {
    if (interaction.isDragging) {
      e.preventDefault();
      clearSidebarHover();
      interaction.cancel();
    } else if (hasOpenMenu()) {
      closeMenus();
    } else {
      store.setSelection({ kind: 'none' });
    }
    return;
  }

  // F/R/S act on the whole selection as one undo step each. The
  // applicability check runs first so an inert selection (all dice for F,
  // all single cards for S…) records nothing in history.
  if (modKey || e.altKey) return;

  // A selected zone maps F/R/S to its zone-wide actions (story 44):
  // flip-all, rotate-all, and the behaviour-table shuffle.
  if (store.state.selection.kind === 'zone') {
    const zoneId = store.state.selection.zoneId;
    const applicable = zoneActions(store.state, store.templates, zoneId);
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      if (applicable.includes('flip-all')) {
        store.flipAllInZoneAnimated(zoneId);
      }
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      if (applicable.includes('rotate-all')) {
        store.commit((s) => rotateAllInZone(s, zoneId, 90));
      }
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      if (applicable.includes('shuffle')) {
        store.commit((s) => shuffleZoneContents(s, store.templates, zoneId));
      }
    }
    return;
  }

  const selected = selectedPileIds(store.state);
  if (selected.length === 0) return;

  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    if (flippablePiles(store.state, store.templates, selected).length > 0) {
      store.commit((s) => flipPiles(s, store.templates, selected));
    }
  } else if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    if (rotatablePiles(store.state, selected).length > 0) {
      store.commit((s) => rotatePiles(s, selected, 90));
    }
  } else if (e.key === 's' || e.key === 'S') {
    e.preventDefault();
    // S is shuffle-or-roll: dice roll, multi-card piles shuffle. A pure
    // shuffle plays the riffle animation (deferred batch commit, one undo
    // step); a selection that also rolls dice commits instantly as one step
    // (the roll has nothing to animate), so the whole action stays atomic.
    if (shuffleOrRollablePiles(store.state, store.templates, selected).length === 0) return;
    if (rollablePiles(store.state, store.templates, selected).length > 0) {
      store.commit((s) => shuffleOrRollPiles(s, store.templates, selected));
    } else {
      store.shufflePilesAnimated(shufflablePiles(store.state, selected));
    }
  }
}
