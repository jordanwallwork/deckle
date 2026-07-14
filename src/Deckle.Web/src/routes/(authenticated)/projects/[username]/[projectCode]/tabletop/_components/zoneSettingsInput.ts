// Shared wiring for the numeric zone-edit fields (grid cell size/columns,
// spread overlap): every one reads a number from the input, ignores anything
// that isn't a number, and applies the change as a transient edit-session frame
// so Escape reverts it with the rest of the session.
import type { TabletopState, TabletopStore } from '$lib/tabletop';

/**
 * Build an `oninput` handler that parses the field's numeric value and applies
 * `mutate` to the transient edit state. Non-numeric input is ignored.
 */
export function transientNumberInput(
  store: TabletopStore,
  mutate: (state: TabletopState, value: number) => void
): (e: Event) => void {
  return (e: Event) => {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isNaN(value)) return;
    store.updateTransient((s) => mutate(s, value));
  };
}
