/**
 * Per-setup persistence of the last Play choices (#120 / decision #107 —
 * "remembers last choices"). Stored in `localStorage` keyed by setup id, so
 * re-opening the Play dialog for a setup pre-fills the previous player count and
 * option values. Purely a convenience cache: any malformed/absent entry is
 * ignored and the caller falls back to the document's defaults.
 *
 * The seed is deliberately NOT remembered — a re-run defaults to a new seed
 * (decision #107, "new seed by default").
 */

import type { PlayChoices } from './choices';

const PREFIX = 'deckle.play.choices.';

/** localStorage key holding the remembered choices for a given setup. */
export function choicesKey(setupId: string): string {
  return `${PREFIX}${setupId}`;
}

/** Resolve a Storage, preferring an explicit one (tests) then `localStorage`. */
function resolveStorage(explicit?: Storage): Storage | null {
  if (explicit) return explicit;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    // Accessing localStorage can throw (SSR, privacy modes).
    return null;
  }
}

/** Read the remembered choices for a setup, or null when absent/unreadable. */
export function loadRememberedChoices(
  setupId: string,
  storage?: Storage
): Partial<PlayChoices> | null {
  const store = resolveStorage(storage);
  if (!store) return null;
  const raw = store.getItem(choicesKey(setupId));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Partial<PlayChoices>;
    }
  } catch {
    // Corrupt entry — treat as absent.
  }
  return null;
}

/** Persist the choices for a setup. Best-effort; storage failures are ignored. */
export function saveRememberedChoices(
  setupId: string,
  choices: PlayChoices,
  storage?: Storage
): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.setItem(choicesKey(setupId), JSON.stringify(choices));
  } catch {
    // Quota/availability failures are non-fatal — the run still proceeds.
  }
}
