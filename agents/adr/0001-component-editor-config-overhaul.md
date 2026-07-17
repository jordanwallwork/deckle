# ADR-0001: Component Editor Configuration Overhaul

**Status:** Accepted (plan approved; implementation not started)
**Date:** 2026-07-17
**Scope:** `src/Deckle.Web/src/lib/components/editor/` (template schema, template store, config panel, canvas)

## Context

A review of the component editor found that its element-configuration layer has drifted into
per-type special cases, and its UI has grown into a single long scroll that is cumbersome to
navigate, especially on mobile. Specific findings:

1. **`BaseElementConfig` is only half-adopted.** Container, Text, Image, and Grid configs wrap
   it; Shape and Iterator hand-roll their own label/lock/visibility/position/dimensions/rotation
   UI, so shared improvements silently skip two element types.
2. **Three competing border models:** the rich `Border` (uniform vs per-side + radius), shape's
   `ShapeBorder` (thickness + color only), and grid's reuse of `Border` for *cell* borders.
3. **Two background models:** `Background` object (color + image) on container/shape/grid vs a
   flat `backgroundColor` string on text.
4. **Render-only properties with no editing UI:** `margin`, `opacity`, `zIndex`, `shadow`,
   `overflow`, `min/max` dimensions, background images — all supported by the CSS builders in
   `utils.ts` but unreachable from the config panel.
5. **No "unset" state:** color pickers coerce `undefined` to `#ffffff`/`#000000`; the element
   factory stamps defaults (e.g. `opacity: 1`) on every new element; touching a control
   permanently writes a value.
6. **Undo history spam:** most controls push a history entry per input event; text content and
   canvas drags each got bespoke workarounds (`saveToHistory` + `updateElementWithoutHistory`).
7. **Inconsistent units:** `DimensionInput` understands px/mm/%, but x/y, gap, padding, font
   size, border widths, and shadow values are px-only number fields.

## Decisions

All decisions below were made explicitly with the project owner (interview, 2026-07-17).

### D1. Capability-driven property groups

Element configuration becomes capability-driven: a declarative registry maps element type →
supported property groups, and the config panel renders one shared group control per granted
group. Per-type config components shrink to only truly type-specific fields. This replaces the
`BaseElementConfig` + per-type-component composition entirely.

Property groups:

| Group | Contents |
|---|---|
| Identity | label, lock, visibility mode/condition |
| Position | position mode, x/y, z-index, rotation |
| Size | width/height, min/max width/height |
| Layout | display, flex direction/wrap/align/gap, padding, margin, overflow |
| Typography | font family, size, weight, style, color, align, line-height, letter-spacing, decoration, transform, word-wrap |
| Background | color + image (source, size, repeat, position) |
| Border | unified border (uniform / per-side) + radius (+ container inner radius) |
| Effects | opacity, shadow list |
| Type-specific | text content, image source/fit/position, shape type, iterator variable/range, grid variant/cell size/cell styling |

### D2. Broad grants for visual elements; iterator stays logical

Container, text, image, shape, and grid all get Background, Border, Effects, Size, Position,
and padding/margin. Iterator gets only Identity plus its range fields — it is a logical
repeater, not a visual box; styling it is ambiguous. Panel length is addressed by the UI
redesign (D5), not by withholding capabilities.

### D3. Schema normalization, no migration

One `Border` model and one `Background` model everywhere. `ShapeBorder` and text's flat
`backgroundColor` are removed; grid's per-cell border/background fields are renamed so they
cannot be confused with the element's own border/background. **No migration or legacy readers:**
Deckle has no users yet; existing saved designs may break and that is accepted.

All render-only properties from finding #4 get real editing UI (none are cut from the schema):
opacity + z-index, shadows (list editor), background images, margin, overflow, min/max
dimensions.

### D4. Unset-first nullable properties

Every property is explicitly nullable and defaults to unset:

- The element factory stops stamping defaults; new elements are nearly empty objects.
- Rendering falls back to CSS defaults; effective defaults live in **one** module (no scattered
  `|| fallback` expressions).
- Controls show the effective value as a placeholder when unset, and every set property gets a
  per-control reset (×) affordance.
- Group set-indicators mean exactly "this group has ≥1 explicitly set property".

### D5. Config panel UX: two in-app prototypes, then pick

Two variants will be built **in-app behind a dev toggle** (query param or panel-header switch),
backed by the real template store, and evaluated with real designs on desktop and phone:

- **A: Collapsible groups** — accordion sections; Identity + type-specific pinned open;
  headers show set-indicators with a value summary (e.g. "Border • 2px solid"); open state
  remembered across selections.
- **B: Vertical tab rail** — a narrow icon tab strip down the panel edge (vertical because
  horizontal tabs are cramped at 300px), one group per tab, set-indicator dots on tabs.

The winning variant keeps its code; the loser is deleted.

### D6. Mobile: bottom sheet with snap points

The config panel on mobile becomes a draggable bottom sheet (peek → half → full) so the
selected element stays visible while editing. The winning D5 variant renders inside it
unchanged. The structure tree stays a left drawer.

### D7. Undo: store-level edit sessions

The template store gains one batching primitive: updates carry an optional session key
(e.g. `${elementId}:${property}`); consecutive updates with the same key collapse into a single
history entry, sealed on blur/pointer-up or when a different key arrives. One undo step per
gesture. The bespoke text-content and drag workarounds are deleted.

### D8. All length-like properties unit-aware

x/y, padding, margin, gap, border widths, radius, shadow offsets/blur, min/max, and font size
all use the shared `DimensionInput` (px/mm/%). Storage convention unchanged: number = px,
string = value with unit (`"5mm"`, `"50%"`). Canvas drag/resize preserves an element's existing
unit (a `10mm`-positioned element converts back to mm after a drag).

### D9. New editor capabilities (all in scope, Phase 3)

- **Smart guides + edge snapping:** snap to other elements' edges/centers and card
  center/safe-area while dragging, with alignment guide lines (in addition to grid snap).
- **Copy/paste + multi-select:** element clipboard (within and across parts/components);
  shift-click multi-select with align/distribute and group property editing (shared controls
  show a "Mixed" placeholder; setting applies to all selected).
- **Copy/paste style (only):** copy an element's set properties, grouped so partial paste
  (e.g. just typography) is possible. Named project-level styles are explicitly deferred —
  no new entities, endpoints, or live-linking in this effort.
- **Keyboard nudging + shortcuts pass:** arrow-key nudge (1 unit / 10 with Shift, unit-aware),
  duplicate shortcut, Escape to deselect, shortcut help overlay.

## Phasing

- **Phase 1 — Foundations (no visible UI change):** schema normalization (D3), unset-first
  model + effective-defaults module (D4), store edit sessions (D7), unit-aware inputs (D8).
- **Phase 2 — Config panel:** capability registry + shared group controls including UI for all
  previously render-only properties (D1–D3), both panel prototypes behind a toggle → owner
  picks → cleanup (D5), then the mobile bottom sheet (D6).
- **Phase 3 — Canvas & workflow:** smart guides/snapping, keyboard nudging/shortcuts,
  copy/paste + multi-select with align/distribute, copy/paste style (D9).

Phase 2 depends on Phase 1's semantics. Phase 3 is independent of both but benefits from
Mixed-value-aware group controls, which are designed in from the start.

## Consequences

- Existing saved designs using `ShapeBorder`, text `backgroundColor`, or grid `border`/
  `background` semantics will render incorrectly or lose those styles (accepted — no users).
- Every config component under `_components/configuration/` and most controls under
  `_components/config-controls/` will be rewritten or substantially changed.
- The per-type config components stop being the unit of composition; adding a future element
  type means declaring its groups in the registry plus a small type-specific fields component.
- Two prototype variants temporarily coexist in the codebase behind a toggle during Phase 2.
