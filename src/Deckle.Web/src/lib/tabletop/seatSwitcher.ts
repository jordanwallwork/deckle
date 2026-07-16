// Seat-switcher derivations (issue #124).
//
// The solo seat switcher only appears when the current table has seat zones,
// and it lists one entry per seat plus "Omniscient". Both facts are pure
// functions of the run's {@link VisibilityMap} (#116/#120): a zone is owned by a
// seat when it carries an `ownerSeat` (its 0-based seatIndex). Table/edge zones
// are unowned and contribute no seats, so a freeform table — whose visibility
// map is empty — yields zero seats and no switcher.
//
// These live below the reactive seam so they are trivially unit-tested; the
// toolbar component and viewController wire them to Svelte reactivity.

import type { VisibilityMap } from './visibility';

/**
 * The number of seats at the table, derived from the visibility map. Seats are
 * numbered 0..N-1 (a contiguous fan-out from `instantiateBlueprint`), so the
 * count is the highest owner seat plus one. Returns 0 when no zone is owned by a
 * seat (e.g. the freeform sandbox, or a setup with only table/edge zones).
 */
export function seatCountFromVisibility(visibility: VisibilityMap): number {
  let max = -1;
  for (const vis of Object.values(visibility)) {
    if (vis.ownerSeat !== undefined && vis.ownerSeat > max) {
      max = vis.ownerSeat;
    }
  }
  return max + 1;
}

/**
 * Whether the seat switcher should be shown at all: true only when the table
 * has at least one seat zone. Freeform play (empty map) is unaffected.
 */
export function hasSeatZones(visibility: VisibilityMap): boolean {
  return seatCountFromVisibility(visibility) > 0;
}
