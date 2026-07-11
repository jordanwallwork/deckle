# Virtual Tabletop v2 — Pile-Based Model

Design spec for the rework of the tabletop sandbox. Produced from a full review
of the v1 implementation and a Q&A design session; each decision below was
agreed explicitly. This document is the reference for the rewrite and for the
manual verification pass at the end.

## Problem Statement

As a game designer prototyping my game in Deckle, the tabletop sandbox is where
I playtest — and right now it fights me. Cards behave differently depending on
what kind of zone they happen to be in. Dragging sometimes moves one card and
sometimes a whole stack, depending on invisible selection state. Stacks appear
and vanish on their own, and when they dissolve, the surviving card can jump to
a place I didn't put it. Things I deliberately rotated get straightened without
asking. Dice can't be placed on board grids. Shuffling a grid I carefully laid
out scrambles the positions I chose. Zooming drifts away from my cursor. Every
session I trip over another edge case, and I can't trust the table to behave
like a real table.

## Solution

Rebuild the tabletop around one physical concept: the **pile**. Everything
sitting on the table — a single card, a 60-card deck, a die, a token — is a
pile of one or more items. A lone card is just a pile of one. Piles merge when
dropped on each other, split when you pull the top card off, and behave
identically everywhere.

Zones stop pretending to be objects and become what they really are:
**regions** of the table with layout behaviour — a freeform area, a snapping
grid, an ordered spread (a hand), a scatter group (a dice tray). Any pile can
enter any zone. The table itself is the root region, so things can simply sit
on it without a designated box.

Every interaction follows one rule set: drag pulls the top card, an explicit
handle moves the whole pile, dropping onto a pile merges, dropping into a zone
places according to that zone's layout. Rotation is always preserved (games
like Scout depend on orientation), invariants are enforced centrally so no
operation can leave the table in a nonsense state, and every gesture is
undoable or cancellable.

## User Stories

1. As a game designer, I want a single card on the table to behave exactly like a one-card pile, so that there is no distinction between "loose cards" and "stacks" for me to learn.
2. As a game designer, I want to drop a card onto another card to form a pile, so that I can build decks and discard piles anywhere on the table.
3. As a game designer, I want to drop a pile onto another pile to merge them (dropped pile on top), so that I can combine decks with one gesture.
4. As a game designer, I want to drag the top card off a pile with a plain drag, so that drawing and playing cards — my most frequent action — needs no modifier.
5. As a game designer, I want to move a whole pile by dragging its count badge (or Alt+dragging anywhere on it), so that relocating a deck is deliberate and never accidental.
6. As a game designer, I want a pile that shrinks to zero cards to simply disappear, so that empty husks never litter the table.
7. As a game designer, I want cards to keep their individual rotation when merged into a pile, so that orientation-based games (e.g. Scout) work correctly.
8. As a game designer, I want a rotated card inside a pile to visibly poke out, so that I can see orientation information at a glance, like on a real table.
9. As a game designer, I want rotating a pile to turn all of its cards together while preserving their relative orientations, so that piles behave like physical objects.
10. As a game designer, I want flipping a pile to reverse its order and flip every card, so that it matches physically turning a deck over.
11. As a game designer, I want a "Flip Top Card" action on a pile, so that I can reveal the top of a deck without disturbing the rest.
12. As a game designer, I want to shuffle any multi-card pile (with a visible animation), so that I trust the deck was randomised.
13. As a game designer, I want to drop a card onto its own source pile and have it land back on top with its face state intact, so that aborting a draw is harmless.
14. As a game designer, I want dropping a multi-card deck from the sidebar to create a face-down pile at the drop point (and a single-card component to arrive face-up), so that decks arrive like decks and reference cards arrive readable.
15. As a game designer, I want spawning components to never create zones as a side effect, so that only I decide the table's structure.
16. As a game designer, I want the sidebar to only spawn instances not already on the table, so that dropping the same component twice can't duplicate my deck.
17. As a game designer, I want to drag any pile onto the sidebar to remove it from the table, so that cleanup uses the same gesture as everything else.
18. As a game designer, I want to remove all copies of a component from the table via the sidebar, so that I can reset one component without resetting the table.
19. As a game designer, I want to create freeform, grid, spread, and group zones from the canvas context menu, so that every zone type is reachable directly.
20. As a game designer, I want any pile to be allowed in any zone, so that I never see a drop silently refused or redirected somewhere I didn't aim.
21. As a game designer, I want piles to sit directly on the open table outside any zone, so that I'm not forced to manage a "play area" box.
22. As a game designer, I want a spread zone to hold cards in an ordered row or column with adjustable overlap and direction, so that I can lay out hands and rivers.
23. As a game designer, I want a multi-card pile dropped into a spread to splay into individual cards preserving order and layering, so that a dealt hand reads correctly left-to-right.
24. As a game designer, I want to drop a card between two cards in a spread and see an insertion indicator at the exact slot, so that I can slot cards precisely.
25. As a game designer, I want to drop a card onto a specific card in a spread to stack on it — distinct from inserting beside it — so that both actions are available by pointer position alone.
26. As a game designer, I want a grid zone to snap piles to cells and keep them where I put them, so that it works as a game board.
27. As a game designer, I want shuffling a grid to randomly permute which occupied cells the piles sit on — not repack them — so that face-down tile setups are possible without destroying my layout.
28. As a game designer, I want dice and tokens to snap to grid cells, so that boards work with more than just cards.
29. As a game designer, I want a deck to be able to sit on a grid cell as a pile, so that draw piles can live on the board.
30. As a game designer, I want a group zone that scatters incoming items with a natural jitter, so that dice trays and token pools look organic.
31. As a game designer, I want items leaving a group zone to snap to the nearest 90° instead of resetting to zero, so that cosmetic jitter is removed but my deliberate orientation survives.
32. As a game designer, I want to convert a zone between freeform, grid, spread, and group with its type-specific settings remembered per type, so that I can experiment with layouts without losing configuration.
33. As a game designer, I want converting a spread to freeform to freeze the cards exactly where they lie, so that I can turn a fanned hand into a free arrangement.
34. As a game designer, I want a multi-instance dice component to spawn as loose scattered dice at the drop point, so that I get a usable dice pool without an unwanted container.
35. As a game designer, I want to roll a die (or every die in my selection) and see its result, so that I can playtest randomness.
36. As a game designer, I want game boards and player mats to appear as container regions displaying their artwork, so that I can build the table around real components.
37. As a game designer, I want to nest zones inside freeform containers (e.g. a grid on top of a board) by dragging them there, and un-nest by dragging them out, so that complex table layouts compose.
38. As a game designer, I want nested zones and their contents to stay visually in place through nesting, un-nesting, merging, and pile promotion, so that things never jump to wrong coordinates.
39. As a game designer, I want to click a pile to select it and Ctrl/Cmd+click to build a multi-selection, so that I can operate on several piles at once.
40. As a game designer, I want to drag a rubber-band marquee on empty table or zone background to select multiple piles, so that grabbing scattered pieces is fast.
41. As a game designer, I want to drag a multi-selection together and have every pile land in the drop zone under that zone's rules, so that group moves behave predictably.
42. As a game designer, I want F/R/S keyboard shortcuts to mean flip/rotate/shuffle-or-roll uniformly for whatever is selected, so that I don't memorise per-situation variants.
43. As a game designer, I want to double-click a pile to select its containing zone, so that zone actions stay reachable inside packed layouts.
44. As a game designer, I want zone-wide actions — flip all (with a wave animation on spreads), rotate all, shuffle, select all — from the zone's context menu and shortcuts, so that I can manage a whole hand at once.
45. As a game designer, I want to move a zone by its always-visible header tab (never by body drag), so that dragging inside a zone always acts on contents and marquee, not the container.
46. As a game designer, I want zone edit mode with rename, resize handles, and type/settings controls, where Done commits and Escape cancels the entire edit, so that zone editing is safe to explore.
47. As a game designer, I want to lock a pile or zone to make it fully inert — not draggable, not mergeable-onto, not marquee-selectable, but still clickable to unlock — so that finished setups can't be disturbed accidentally.
48. As a game designer, I want a "Move to <zone>" action that places the pile using the same rules as a real drop, so that menu moves and drag moves agree.
49. As a game designer, I want undo/redo to treat each gesture — an entire drag, an entire zone-edit session, a whole multi-move — as one step, so that Ctrl+Z rewinds intent, not frames.
50. As a game designer, I want Escape (or pointer cancel) mid-drag to abort the drag and restore the exact prior state, so that a mis-grab costs nothing.
51. As a game designer, I want zoom to anchor at my cursor and middle-drag to pan, so that navigating a large table feels like standard canvas tools.
52. As a game designer, I want fit-view to frame everything on the table including loose piles, so that I can always recover my bearings.
53. As a game designer, I want zones to persist when empty, so that a spread or grid I created remains as a labelled destination (e.g. a discard row) until I delete it.
54. As a game designer, I want piles to render at consistent physical scale (derived from real-world mm), so that cards, dice, and mats keep correct relative sizes.
55. As a game designer, I want data-source-backed cards to spawn one card per row (honouring the "Num" duplicates field), so that my real deck composition is on the table.

## Implementation Decisions

### State model

- **Two records replace the entity**: `Card` (identity + face state: template
  reference, merge data, label, `isFlipped`, `diceValue`, per-card `rotation`)
  and `Pile` (the physical object: zone reference or root, zone-local `x`/`y`,
  `locked`, ordered `cardIds` with last = top). Cards never have coordinates;
  piles never have rotation — a pile's orientation is entirely its cards'.
- **No cached sizes anywhere.** A pile's footprint is derived on demand from
  its cards' templates and rotations (quarter-turn-aware AABB). The v1
  `defaultSize` seeding/carry-forward machinery is deleted.
- **No pile-level face-down flag.** "Flip pile" = reverse `cardIds` + toggle
  each card's `isFlipped`; degenerates to a plain card flip for piles of one.
- **Zone types shrink to four regions**: freeform (absolute placement, may
  nest child zones, may render a board/mat background), grid (sparse
  snap-to-cell board), spread (ordered strip), group (freeform + scatter
  placement). `StackZone` is deleted; the stack concept lives entirely in
  piles. Type-specific settings survive type conversion via a per-type cache
  (spread: direction/overlap; grid: cell dims/columns).
- **The table is the root region**: piles may have no zone (world
  coordinates); the root behaves as a freeform region. No seeded "Play Area"
  zone; no fallback-zone hunts anywhere.
- **Selection is a discriminated union** — none | piles (ordered ids) | zone —
  with a separate editing-zone id. Piles are the selection atom; individual
  cards inside a pile are never selectable.
- **Coordinate discipline**: operation inputs/outputs are world-space;
  parent-local storage (nested zones, zone-local pile positions) is converted
  at the operation boundary via shared world-position/AABB helpers.

### Zone behaviour strategy

One behaviour object per zone type (plus root = freeform), dispatched instead
of type-conditionals. Shape (from the design session):

```ts
interface ZoneBehavior {
  ordered: boolean;                              // spread only
  planDrop(ctx, zone, localPt, pile): DropPlan;  // at-point | snap-to-free-cell
                                                 // | insert-index | jitter
  layout(ctx, zone): void;                       // spread derives positions; others no-op
  onLeave(ctx, zone, pile): void;                // group: snap rotation to nearest 90°
  shuffle(ctx, zone): void;                      // spread: permute order
                                                 // grid: permute occupied cells
                                                 // group: re-scatter | freeform: no-op
}
// ctx carries state + templates
```

- Zones impose **no content restrictions**; the only capability gate anywhere
  is merge (card-on-card, both mergeable).
- Spread layout writes pile positions into state (positions are always
  truthful; renderers never compute layout).

### Invariant-based normalization

A single normalize pass runs after **every committed mutation** (full sweep,
no dirty-tracking) and re-establishes:

1. No empty piles (replaces all auto-dissolve machinery).
2. Spreads contain only single-card piles (multi-card arrivals splay in array
   order: bottom → first index, top → last; this also handles conversion into
   spread).
3. Spread positions match the layout.
4. Grid piles sit on cells (nearest free cell on collision; overlap as a
   last resort).
5. Referential integrity (each card in exactly one pile, each pile in exactly
   one zone or root, zone order/child lists consistent).

Violations **throw in dev, repair silently in prod**. Operations become
minimal (list surgery + placement + onLeave) because normalize owns the
bookkeeping. Transient drag frames skip normalize; it runs once at commit.

### Drop pipeline

One resolver shared by every drop path (pointer drags, multi-drags, sidebar
template drops, "Move to zone" menu): payload (pile | piles | template
instances) + world point → plan. Precedence: locked targets refuse; drop onto
a pile's footprint merges (if mergeable); otherwise the target zone's
`planDrop` places; no zone means root placement. Merge preserves each incoming
card's rotation and face state.

### Interaction

- **One drag state machine as a pure reducer** — `step(dragState, event, ctx)
  → { dragState, mutations }` — with a thin reactive shell binding it to the
  store and window pointer listeners. Modes: pile drag (top card via plain
  drag; whole pile via badge handle or Alt), multi-pile drag, marquee,
  zone move (header tab only), zone resize (edit-mode handles), pan
  (middle-button).
- **Split happens at drag start**: pulling the top card immediately forms a
  zoneless single-card pile that follows the pointer in world space, rendered
  in a top-level overlay layer; the drop assigns its zone. There is no
  mid-drag "detach into temporary host zone" concept.
- Spawn-from-sidebar keeps HTML5 drag-and-drop for the cross-panel gesture but
  routes its drop through the shared resolver.
- Escape or pointer-cancel mid-drag rolls back to the pre-drag state.

### History

Transaction API replaces checkpoint/transient method pairs: one-shot `commit`
for atomic actions; `begin` → transient `update` frames → `commit` (single
history entry + normalize) or `rollback` for drags and zone-edit sessions.
History and viewport math are pure modules; the reactive store is a thin
shell.

### Templates and capabilities

Capability flags computed once at template build: `mergeable` (cards),
`isContainer` (boards/mats — spawn as background-rendered freeform regions),
`faces` (dice — rolling no longer consults the component list), `flippable`
(false for dice). Downstream code reads flags, never component types.
Data-source expansion (one instance per row, "Num" duplicates), unplaced-
instance dedup, and physical-scale sizing (mm × px-per-mm) carry over from v1
unchanged.

### Rendering

One pile renderer everywhere (top card artwork, count badge doubling as the
whole-pile handle, depth/underlay peek for mixed sizes and poking-out rotated
cards, selection ring, lock indicator, flip transition). Zone renderers render
chrome only (grid lines, spread insertion indicator, group tint, board
artwork) plus their piles; zones do not clip pile overhang. DOM order within a
zone = pile order; dragged piles render in the overlay above all zones.
Shuffle and wave-flip animations carry over, keyed to piles/zones, driven by
transient store hints as in v1.

### Viewport

Pointer-anchored wheel zoom, middle-drag pan, unbounded world (the surface is
a transform anchor, not a sized box), fit-view over zones *and* root piles.

## Testing Decisions

- **One seam**: pure TypeScript functions over plain serializable data —
  `(state, templates, input) → state/plan`. This is the codebase's existing
  unit-test seam (the v1 operations tests, plus the utility/validation test
  suites, are all this kind); no new seam kinds are introduced — no component
  rendering tests, no store harness, no E2E. If logic is hard to test, it
  moves below the seam rather than gaining a seam above.
- **What good tests look like here**: assert external behaviour — the state
  (or plan) that comes out for the state and input that went in — never
  internal call sequences or intermediate fields. Prefer scenario-shaped
  cases ("dropping a 3-card pile into a spread between slots 1 and 2 yields
  five single-card piles in this order") over function-shaped ones.
- **Modules under test**: operations, zone behaviours, the drop resolver, the
  normalize pass, the interaction reducer (driven by synthetic pointer-event
  sequences), history/transactions, and viewport math.
- **Invariant suite**: because dev-mode normalize throws, every operation test
  doubles as an invariant test by running normalize on its result; plus
  dedicated cases for each invariant's repair behaviour.
- **Prior art**: the v1 tabletop operations test suite (same seam, rewritten
  for the new model) and the existing pure-utility test suites in the web
  project.
- Above the seam (reactive shells, Svelte components, DOM geometry) is
  covered by type-checking (`npm run check`) and a manual verification pass
  against this spec's user stories.

## Out of Scope

- **Persistence of table state** — the table still rebuilds from components on
  each visit; saving/restoring layouts is future work (and the state model is
  deliberately serializable for it).
- **Multiplayer / boardgame.io integration** (Phase 3) — the pure-operation +
  serializable-state design is shaped to hand off to it, but no adapter is
  built now.
- **Slot regions** — small labelled homes that hold a single pile (named
  draw/discard markers that persist when empty). The empty-zone story covers
  the need for now.
- **Deal N** — dealing multiple cards as one action; drawing is per-card via
  the drag gesture in this pass.
- **Touch/pinch support, minimap, zoom-to-selection, canvas rotation.**
- **Backend/API changes** — this is entirely a web-client feature; no .NET or
  schema work.

## Further Notes

- There is no data migration: v1 table state was never persisted, so the
  model change is free.
- Implementation proceeds as a staged rewrite on one branch: the pure layer
  (with full tests) lands alongside v1 first, then the store and interaction
  layers, then the UI switch-over, then deletion of v1 — each stage building
  clean and passing tests, with the app running v1 until the switch-over.
- Known v1 defects intentionally fixed by this design rather than patched:
  selection-dependent drag ambiguity, stack auto-dissolve teleporting cards
  (nested-zone coordinate bugs), rotation clobbered on leaving group zones,
  grid shuffle destroying placement, duplicated detach logic drifting between
  copies, inconsistent face-down defaults between stack-creation paths, zoom
  drift, and the parent-nesting-into-own-child dead end.
- The manual verification checklist at the end of implementation is the user
  stories above, walked in order against the running app.
