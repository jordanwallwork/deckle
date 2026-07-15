# PROTOTYPE — setup rules editor (wayfinder ticket #105)

**Question:** In the decided sentence-builder paradigm, which structural take on the
graphical setup-rules editor feels right to author with, reads best, and surfaces
errors well?

**Where:** `/prototype-rules-editor` (dev-only; 404s in production builds). Switch
variants with the floating pill or ←/→ arrow keys — `?variant=A|B|C`.

All three variants edit the **same in-memory DSL AST** (`_components/state.svelte.ts`),
so edits made in one variant appear in the others, and the collapsible "Live DSL AST"
panel at the bottom shows the serialized JSON — demonstrating the lossless
editor-state-is-the-AST round trip decided in ticket #101/#104.

The sample program is the ticket's real setup — 2p: deal 4 each; 3–4p: deal 3 each;
flip top card to market — plus an option-gated expansion step that is **deliberately
invalid** (no target zone) to exercise error affordances, and a forEach-seat loop.

## Variants

- **A — Sentence cards**: Zapier-style card stack; each step is one natural-language
  sentence with chip-styled dropdown slots; if/else render as nested card groups with
  colored "then"/"otherwise" rails; errors = red-railed card + message list.
- **B — Rulebook outline**: Notion-style prose document; steps are numbered rulebook
  lines; slots are dotted-underline inline tokens; conditionals are collapsible
  indented blocks; errors = wavy red underline + inline note.
- **C — List + inspector**: compact step list (icons + summaries, indentation for
  nesting) on the left; selecting a step opens a form-style inspector on the right;
  errors = ⚠ dot in the list + red box in the inspector.

## Verdict

_(fill in after reviewing: which variant — or which combination of pieces — wins,
and any notes on authoring feel, readability, and error affordances; then record it
on ticket #105 and delete this route.)_
