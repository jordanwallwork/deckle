# Seat ring prototype — wayfinder #109

**Question:** Does the seat-stamping model (#102) — one seat template (hand + tableau + discard) stamped N times on a ring, with N edge zones between adjacent seats — *feel* right when rendered at 1–6+ players?

**How to run:** `aspire run`, then open `/prototype-seat-ring` in the web app (dev-only route). `?variant=A` radial ring, `?variant=B` BGA-style rows; ←/→ switch. Knobs: player count 1–8, viewer seat, edge-zone toggle, and radial author knobs (ring radius, seat-1 position, seat scale).

**React to:**

- Spacing/scale at high counts (6–8) on the radial ring — does it need auto-scaling, or are the radius/scale knobs enough?
- Edge-zone placement between adjacent seats, including the 2-player two-edge case (pure ring math, no collapse).
- Whether the ring model needs author knobs beyond defaults (radius, seat-1 position, others?).
- BGA rows: does flattening the ring (edges interleaved on top, viewer's two edges flanking their panel) stay legible?

## Verdict

Both strategies validated — no single winner, and that's the finding: **render strategy becomes a user-facing option** (different players will prefer different views), confirming #102's swappable-view-strategy seam. Future strategies are anticipated behind the same seam (e.g. two rows of players facing one another, unlike BGA's aligned rows).

Author knobs: **ring radius stays; seat-1 position angle and seat scale are rejected.** Seat scale in particular conflicts with the intent that components render at true physical scale — which also enables deriving useful data later (required table space, etc.).
