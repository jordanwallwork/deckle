import { describe, it, expect } from 'vitest';
import { seatCountFromVisibility, hasSeatZones } from './seatSwitcher';
import type { VisibilityMap } from './visibility';

describe('seatCountFromVisibility', () => {
  it('returns 0 for an empty (freeform) visibility map', () => {
    expect(seatCountFromVisibility({})).toBe(0);
    expect(hasSeatZones({})).toBe(false);
  });

  it('returns 0 when no zone is owned by a seat (table/edge zones only)', () => {
    const vis: VisibilityMap = {
      table: { faceVisibility: 'all', presence: 'visible' },
      edge0: { faceVisibility: 'all', presence: 'visible' }
    };
    expect(seatCountFromVisibility(vis)).toBe(0);
    expect(hasSeatZones(vis)).toBe(false);
  });

  it('counts seats as highest owner seat + 1', () => {
    const vis: VisibilityMap = {
      hand0: { faceVisibility: 'owner', presence: 'hidden-from-non-owners', ownerSeat: 0 },
      hand1: { faceVisibility: 'owner', presence: 'hidden-from-non-owners', ownerSeat: 1 },
      hand2: { faceVisibility: 'owner', presence: 'hidden-from-non-owners', ownerSeat: 2 },
      table: { faceVisibility: 'all', presence: 'visible' }
    };
    expect(seatCountFromVisibility(vis)).toBe(3);
    expect(hasSeatZones(vis)).toBe(true);
  });

  it('handles multiple owned zones per seat without double counting', () => {
    const vis: VisibilityMap = {
      hand0: { faceVisibility: 'owner', presence: 'hidden-from-non-owners', ownerSeat: 0 },
      tableau0: { faceVisibility: 'all', presence: 'visible', ownerSeat: 0 },
      hand1: { faceVisibility: 'owner', presence: 'hidden-from-non-owners', ownerSeat: 1 }
    };
    expect(seatCountFromVisibility(vis)).toBe(2);
  });

  it('treats seat 0 as a single seat', () => {
    const vis: VisibilityMap = {
      hand0: { faceVisibility: 'owner', presence: 'hidden-from-non-owners', ownerSeat: 0 }
    };
    expect(seatCountFromVisibility(vis)).toBe(1);
    expect(hasSeatZones(vis)).toBe(true);
  });
});
