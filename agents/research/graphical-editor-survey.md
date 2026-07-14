# Graphical Editor Survey: Authoring Board-Game Setup Rules

**Date:** 2026-07-14
**Research question:** Which graphical-programming paradigm (block-based à la Scratch/Blockly, node/dataflow graphs, structured-form builders, or hybrid) best suits non-programmers authoring board-game **setup rules** — sequential actions (deal, shuffle, place) with conditionals (if player count is 2 then…) — and which web libraries support it?

All factual claims below are cited to primary sources (official docs, GitHub repos, npm registry, first-party blogs) checked July 2026.

---

## 1. Paradigm overview and fit for sequential + conditional rules

### Block-based (Scratch, Blockly)

Blocks stack vertically to express an ordered sequence of statements; control structures (if/else, loops) are C-shaped blocks that physically wrap the statements they govern. The paradigm was designed explicitly for imperative, sequential programs written by non-programmers: the Scratch team's design paper states that Scratch blocks are "shaped to fit together only in ways that make syntactic sense," eliminating syntax errors by construction ([Resnick et al., *Scratch: Programming for All*, CACM 52(11), 2009](https://dl.acm.org/doi/10.1145/1592761.1592779)). Blockly, the library that generalizes this approach, describes itself as "a library that adds a visual code editor to web apps" using "interlocking, graphical blocks to represent code concepts like variables, logical expressions, loops" ([google/blockly README](https://github.com/google/blockly)), and it powers Scratch, MakeCode, and LEGO Education ([Google Open Source Blog, Oct 2025](https://opensource.googleblog.com/2025/10/blockly-graduates-from-google.html)).

**Fit:** Direct. "Shuffle deck → deal 5 cards → if player count is 2, remove event cards" is exactly a vertical stack of statement blocks with an `if` block wrapping a nested stack. Reading order equals execution order.

### Node/dataflow graphs (Rete.js, LiteGraph.js, xyflow)

Nodes on a 2D canvas connected by edges. Two distinct execution semantics exist, and the distinction matters:

- **Dataflow**: edges carry *data*; a node pulls values from its inputs. Rete's own engine docs say dataflow "prioritizes data transmission" and is "commonly used in products with node editors such as Blender" ([Rete.js engine docs](https://retejs.org/docs/concepts/engine)) — i.e., it is designed for *expression/transformation pipelines* (shaders, image processing, audio), not ordered side-effecting actions.
- **Control flow**: edges carry *execution order*, "the framework compares this to UE4 Blueprints" ([same page](https://retejs.org/docs/concepts/engine)). This *can* express sequential logic, but a linear script becomes a horizontal chain of nodes joined by exec wires, and every conditional becomes a branch node with two outgoing exec edges. Rete's docs themselves note "there's no one-size-fits-all solution" for graph processing.

**Fit:** Poor-to-moderate for this use case. Pure dataflow is the wrong semantics for imperative setup steps (there is no "data" flowing from `shuffle` to `deal`; there is only order). Control-flow graphs (Blueprints-style) work but impose graph-layout overhead — free 2D placement, wire routing, pan/zoom — on what is inherently a short linear list. Blueprints succeeds with a *professional* audience inside a full IDE; for non-programmers writing 5–15 setup steps, the canvas is cognitive cost with no payoff. Node UIs shine when the program genuinely *is* a graph (many-to-many data dependencies), which setup rules are not.

### Structured-form / sentence builders (Zapier, Notion automations)

The user composes rules from constrained form controls: pick an action from a dropdown, fill its parameter slots, add steps to an ordered list, add "if" branches via dedicated UI. Zapier's own help docs frame their model as exactly our target shape: "If A happens, then do X. If B happens, then do Y," with Filters (a condition gating subsequent steps) and Paths (multiple condition branches, each with its own list of steps), and rules composed of three parts (field, condition, comparison value) joined by AND/OR ([Zapier: conditional logic with filters and paths](https://help.zapier.com/hc/en-us/articles/34372501750285-Use-conditional-logic-to-filter-and-split-your-Zap-workflows), [filters](https://help.zapier.com/hc/en-us/articles/8496276332557-Add-conditions-to-Zap-workflows-with-filters), [paths](https://help.zapier.com/hc/en-us/articles/8496288555917-Add-branching-logic-to-Zaps-with-Paths)).

**Fit:** Excellent for a *small, closed* vocabulary of actions and conditions. Every UI element is domain-specific ("Deal __ cards to each player"), so there is zero programming metaphor to learn. The trade-off is expressiveness: deep nesting, arbitrary expressions, and user-defined abstractions get awkward — but setup rules rarely need them.

### Hybrid

Blockly-style structure with form-style content: a vertical list editor where each row is a domain sentence and conditionals are collapsible nested lists. This is what most successful automation builders (Zapier Paths, Notion automations, Shortcuts on iOS) converge on: block *semantics* (ordered statements, nesting) without block *chrome* (puzzle shapes, drag-from-toolbox).

**Assessment:** For sequential + conditional rules authored by non-programmers, the evidence points to block/list-structured paradigms (blocks or structured forms) over node graphs. The node-editor ecosystem's own documentation positions dataflow for Blender-style data pipelines and control-flow for Blueprints-style professional tooling ([Rete.js engine docs](https://retejs.org/docs/concepts/engine)); Svelte Flow positions itself as a UI for "node-based editors and interactive diagrams" with execution logic left entirely to the developer ([svelteflow.dev](https://svelteflow.dev/)) — it provides no statement/sequence semantics at all.

---

## 2. Library evaluations

### 2.1 Blockly

- **Non-programmer usability:** The reference implementation of the block paradigm; purpose-built for sequential statements + wrapped conditionals with syntax errors impossible by construction (see §1). Used by Scratch, MakeCode, LEGO Education ([Google OSS blog](https://opensource.googleblog.com/2025/10/blockly-graduates-from-google.html)). Custom domain blocks ("deal N cards to each player") are first-class. Caveat: the toolbox/flyout/workspace UI has a learning curve of its own and reads as "kids' coding tool" unless heavily themed.
- **Svelte 5 compatibility:** Framework-agnostic vanilla JS/TS injected into a DOM element ([repo](https://github.com/google/blockly)); no Svelte bindings needed or offered. Works in SvelteKit with client-side-only initialization (Blockly needs the DOM, so `onMount` / `browser` guard).
- **DSL round-trip:** Two separate systems. (a) **JSON serialization** is the lossless, round-trippable source of truth: `Blockly.serialization.workspaces.save()` / `.load()` ([serialization docs](https://docs.blockly.com/guides/configure/web/serialization)). (b) **Code generators** translate blocks to text ("turning the blocks on a workspace into a string of code"; `workspaceToCode`) and are **one-way** — there is no built-in parser from generated code back to blocks ([code-generation docs](https://docs.blockly.com/guides/create-custom-blocks/code-generation/overview/)). So the practical pattern is: JSON as canonical storage, plus a custom generator emitting the Deckle DSL; a DSL→blocks direction requires writing a parser that constructs the block JSON (feasible for a small DSL, but it is custom work).
- **Maintenance:** Very active. v13.1.1 released 2026-07-06 ([npm](https://www.npmjs.com/package/blockly)); 113 releases, ~9.7k commits ([repo](https://github.com/google/blockly)). Stewardship transferred from Google to the **Raspberry Pi Foundation** on 2025-11-10, with the core team and ongoing feature commitment moving with it ([Google OSS blog](https://opensource.googleblog.com/2025/10/blockly-graduates-from-google.html), [Raspberry Pi Foundation announcement](https://www.raspberrypi.org/blog/new-home-for-blockly/)).
- **License:** Apache-2.0 ([repo](https://github.com/google/blockly), [npm](https://www.npmjs.com/package/blockly)).
- **Theming/embedding:** Full theme API (block styles, category styles, base-theme extension via `defineTheme`; workspace components stylable via CSS) ([themes docs](https://docs.blockly.com/guides/configure/appearance/themes/)), plus alternative renderers (Zelos etc.). But it is a heavyweight embed: npm unpacked size ~17 MB (tree-shakeable to a few hundred KB gzipped in practice, still the largest option here), SVG-based rendering, own scrolling/zoom model — it owns its div rather than composing with your components.

### 2.2 scratch-blocks

- **Non-programmer usability:** Scratch's block look-and-feel — the most user-tested block UI in existence for the target demographic.
- **Svelte 5 compatibility:** Vanilla JS like Blockly (v2 "is no longer a fork of Blockly, but rather depends on Blockly as a library," now tracking Blockly 12+) ([repo README](https://github.com/scratchfoundation/scratch-blocks)).
- **DSL round-trip:** Inherits Blockly's serialization/generator architecture (same caveats as §2.1).
- **Maintenance:** Active — v2.1.19 published 2026-04-28 ([npm](https://www.npmjs.com/package/scratch-blocks)), 288 releases — but the README explicitly warns the v2 rewrite is still stabilizing ("there will likely be a few bumps in the road" before a user-facing release) ([repo](https://github.com/scratchfoundation/scratch-blocks)). It exists to serve the Scratch editor, not third-party embedding; its horizontal/vertical grammars and styling are Scratch-opinionated.
- **License:** Apache-2.0 ([repo](https://github.com/scratchfoundation/scratch-blocks)).
- **Theming/embedding:** Designed to look like Scratch; retheming to Deckle's visual language means fighting the point of the library. npm unpacked ~3.8 MB plus the Blockly dependency. **Verdict: use Blockly directly instead** — you get the same engine without Scratch's product-specific layer.

### 2.3 Rete.js

- **Non-programmer usability:** A node-editor *framework*: "a framework for creating visual interfaces and workflows" with "processing graphs based on dataflow and control flow approaches" ([repo](https://github.com/retejs/rete)). Its dataflow engine is Blender-style pull-based data transformation; its control-flow engine is UE4-Blueprints-style ([engine docs](https://retejs.org/docs/concepts/engine)). As argued in §1, both impose graph-canvas mechanics (placement, wiring, layout) on what is a linear script — significant friction for non-programmers writing setup steps.
- **Svelte 5 compatibility:** Best-in-class among node editors besides xyflow: official `rete-svelte-plugin` renders nodes as Svelte components and supports Svelte 3, 4, and 5 (import from `rete-svelte-plugin/5`) ([Rete Svelte guide](https://retejs.org/docs/guides/renderers/svelte/), [npm](https://www.npmjs.com/package/rete-svelte-plugin)).
- **DSL round-trip:** No built-in serialization format in v2 — the graph model is yours to serialize (nodes/connections to JSON), and DSL emission/parsing is entirely custom. A sequential DSL would round-trip through a graph structure awkwardly (linearization step required).
- **Maintenance:** Alive but slow on core: `rete` 2.0.6 published 2025-06-30; `rete-svelte-plugin` 2.1.2 published 2026-07-10 ([npm](https://www.npmjs.com/package/rete)). Community-funded (Open Collective/Patreon), single-maintainer-centric org, 12.1k stars ([repo](https://github.com/retejs/rete)).
- **License:** MIT ([repo](https://github.com/retejs/rete)).
- **Theming/embedding:** Modular plugin architecture; nodes are your own Svelte components so theming is fully yours. Core is small (`rete` ~226 KB unpacked) but a working editor needs 5+ plugins (area, connection, render, etc.).

### 2.4 LiteGraph.js

- **Non-programmer usability:** "A graph node engine and editor written in Javascript similar to PD or UDK Blueprints" ([repo](https://github.com/jagenjo/litegraph.js)) — canvas-rendered, developer-aesthetic node editor. Same paradigm mismatch as Rete, with a rougher, less accessible UI (single `<canvas>`, no DOM nodes, poor a11y).
- **Svelte 5 compatibility:** Vanilla JS, canvas-based; embeddable anywhere but composes with Svelte worst of all options (no component-per-node model).
- **DSL round-trip:** Graphs serialize to JSON ([repo](https://github.com/jagenjo/litegraph.js)); DSL round-trip fully custom.
- **Maintenance:** **Effectively unmaintained upstream.** Last commits to jagenjo/litegraph.js are January 2024 ([commit history](https://github.com/jagenjo/litegraph.js/commits/master)); last npm publish (0.7.18) 2024-01-08 ([npm](https://www.npmjs.com/package/litegraph.js)). The actively developed Comfy-Org fork was **archived 2025-08-05** and merged into the ComfyUI frontend monorepo, explicitly "not for general use" ([Comfy-Org/litegraph.js](https://github.com/Comfy-Org/litegraph.js)). No maintained general-purpose distribution exists as of mid-2026. **Eliminated on this criterion alone.**
- **License:** MIT ([repo](https://github.com/jagenjo/litegraph.js)).
- **Theming/embedding:** Canvas rendering limits theming to its own style options; ~3.2 MB unpacked on npm.

### 2.5 xyflow / Svelte Flow (@xyflow/svelte)

- **Non-programmer usability:** "A customizable Svelte component for building node-based editors and interactive diagrams" — it supplies dragging, zooming, panning, and edge management and "leaves the execution logic to developers" ([svelteflow.dev](https://svelteflow.dev/)). It is a *rendering* library with **no execution semantics at all** — no dataflow engine, no control-flow engine, no notion of statements. Any sequential/conditional semantics would be built from scratch on top of a free-form canvas, inheriting all the paradigm-mismatch concerns of §1 plus the engine work Rete would have given you.
- **Svelte 5 compatibility:** Excellent — the flagship option here. Svelte Flow 1.0 (2025-05-14) was rewritten for Svelte 5, converting all stores to runes ([xyflow blog](https://xyflow.com/blog/svelte-flow-release), [release notes](https://svelteflow.dev/whats-new/2025-05-14)). Peer dependency is `svelte ^5.25.0` (npm registry, checked 2026-07). Nodes/edges are plain Svelte components.
- **DSL round-trip:** Nodes and edges are plain arrays you own — trivially serializable to JSON, but mapping a graph to/from a sequential DSL (linearization, branch reconstruction) is custom work.
- **Maintenance:** Very active: @xyflow/svelte 1.6.2 published 2026-07-06, monthly release cadence ([GitHub releases](https://github.com/xyflow/xyflow/releases)); backed by the xyflow company (also behind React Flow).
- **License:** MIT ([svelteflow.dev](https://svelteflow.dev/), npm).
- **Theming/embedding:** Best embed story of the node editors: nodes are your Svelte components, styled your way; small footprint (~328 KB unpacked on npm); SvelteKit-native.

### 2.6 Custom structured editor (form/tree sentence builder)

- **Non-programmer usability:** Highest ceiling for this specific domain. Every affordance is a domain sentence ("Shuffle **the event deck**", "Deal **5** cards to **each player**") with dropdowns/steppers for slots, an ordered step list with drag-to-reorder, and an "Add condition" affordance producing a nested step list — the exact model Zapier documents for its Filters/Paths conditional logic ([Zapier help](https://help.zapier.com/hc/en-us/articles/34372501750285-Use-conditional-logic-to-filter-and-split-your-Zap-workflows)). No programming metaphor, no canvas, no toolbox. Constrained inputs mean invalid rules are unrepresentable — the same by-construction correctness Scratch achieves with block shapes ([Resnick et al. 2009](https://dl.acm.org/doi/10.1145/1592761.1592779)), delivered through forms instead.
- **Svelte 5 compatibility:** Perfect by definition — plain Svelte 5 components, runes for state, no third-party runtime.
- **DSL round-trip:** The strongest option. Design the editor's data model *as* the DSL's AST: editor state → pretty-print = DSL text; DSL text → parse = editor state. Fully lossless both directions because there is no impedance mismatch (no block IDs, no node coordinates to discard or invent). The DSL grammar and the editor vocabulary evolve together.
- **Maintenance:** Your own code — no upstream risk, but all future features (undo, copy/paste, validation UX, keyboard a11y) are yours to build. For a small closed vocabulary of setup actions this is bounded work; it grows if the rule language grows toward general programming (loops, variables, expressions) — that is the point at which Blockly starts paying for itself.
- **License:** N/A (first-party).
- **Theming/embedding:** Native to the existing SvelteKit app and design system; zero added bundle beyond the components themselves.

---

## 3. Comparison table

| Criterion | Blockly | scratch-blocks | Rete.js | LiteGraph.js | Svelte Flow (@xyflow/svelte) | Custom structured editor |
|---|---|---|---|---|---|---|
| Paradigm | Block (sequential+nesting) | Block (Scratch UI) | Node graph (dataflow + control flow engines) | Node graph (canvas) | Node graph (rendering only, no engine) | Ordered step list + nested conditions |
| Fit for sequential+conditional setup rules | Strong | Strong | Weak–moderate (graph overhead) | Weak | Weak (semantics DIY) | Strongest (domain-native) |
| Svelte 5 | Framework-agnostic, `onMount` embed | Framework-agnostic | Official plugin, Svelte 3/4/5 | Vanilla canvas, poor composition | Native, built on runes, peer `svelte ^5.25` | Native |
| DSL round-trip | JSON lossless; generators to DSL one-way; DSL→blocks needs custom parser | Same as Blockly | Custom JSON; graph↔linear DSL awkward | Custom JSON; same issue | Own arrays; graph↔linear DSL custom | Editor state = AST; lossless both ways |
| Maintenance (mid-2026) | Very active; v13.1.1 Jul 2026; Raspberry Pi Foundation | Active but v2 stabilizing; Scratch-serving | Core slow (2.0.6 Jun 2025); Svelte plugin Jul 2026; community-funded | Upstream dead (Jan 2024); Comfy fork archived Aug 2025 | Very active; 1.6.2 Jul 2026; xyflow company | First-party |
| License | Apache-2.0 | Apache-2.0 | MIT | MIT | MIT | — |
| Theming / embed weight | Theme API + custom renderers; heavy (~17 MB unpacked npm) | Scratch-look, hard to retheme; ~3.8 MB + Blockly | Nodes = your Svelte components; core small, many plugins | Canvas-limited theming; ~3.2 MB | Nodes = your Svelte components; ~328 KB | Design-system native; ~0 |

---

## 4. Conclusion

**Recommended paradigm: structured step-list (form/sentence builder) — block semantics without block chrome. Recommended implementation: custom Svelte 5 structured editor, with Blockly as the fallback if the rule language outgrows a closed vocabulary.**

Rationale, tied to Deckle's context:

1. **Non-programmer audience.** Setup rules are short, linear, and domain-specific. The Zapier/Notion structured-list model expresses exactly "ordered steps + if-branches" ([Zapier conditional-logic docs](https://help.zapier.com/hc/en-us/articles/34372501750285-Use-conditional-logic-to-filter-and-split-your-Zap-workflows)) with zero programming metaphor. Node/dataflow editors are, by their own ecosystems' positioning, built for Blender-style data pipelines or Blueprints-style professional control flow ([Rete engine docs](https://retejs.org/docs/concepts/engine)) — a paradigm mismatch confirmed rather than refuted by this research. Blockly fits the semantics but imports a toolbox-and-canvas UI and ~17 MB dependency for what a dozen domain sentence-forms can do better.
2. **Svelte 5.** A custom editor is native. Among libraries, only Svelte Flow (runes-based, `svelte ^5.25` peer) and Rete's Svelte plugin offer first-class Svelte 5 — but both are node editors, the wrong paradigm. Blockly embeds fine but composes as an opaque widget.
3. **DSL round-trip.** This criterion is decisive for the custom option: making the editor's state *be* the DSL's AST gives lossless bidirectional conversion for free. Blockly's JSON is round-trippable ([serialization docs](https://docs.blockly.com/guides/configure/web/serialization)) but its code generators are one-way ([code-generation docs](https://docs.blockly.com/guides/create-custom-blocks/code-generation/overview/)), so a DSL round-trip via Blockly means maintaining a DSL parser *and* a JSON↔DSL mapping — two artifacts instead of one.
4. **Risk profile.** LiteGraph is eliminated (upstream dead, active fork archived into ComfyUI). scratch-blocks is eliminated (Scratch-serving, v2 still stabilizing). Rete is viable but community-funded with a slow core cadence. Blockly (Raspberry Pi Foundation) and xyflow are the safest third-party bets — and the custom option carries no third-party risk at all, at the cost of owning editor UX features (undo, reorder, validation) that are bounded for a closed setup-rule vocabulary.

**Escape hatch:** if Deckle's rule language later needs user-defined variables, loops over arbitrary collections, or nested expressions — i.e., real programming — adopt **Blockly** (Apache-2.0, very active, Raspberry Pi Foundation-backed) with custom domain blocks, JSON as the stored source of truth, a custom generator emitting the DSL, and a DSL parser targeting block JSON.

---

### Source index

- Blockly repo: https://github.com/google/blockly (Apache-2.0; v13.1.1 2026-07-06)
- Blockly → Raspberry Pi Foundation: https://opensource.googleblog.com/2025/10/blockly-graduates-from-google.html ; https://www.raspberrypi.org/blog/new-home-for-blockly/
- Blockly serialization: https://docs.blockly.com/guides/configure/web/serialization
- Blockly code generation: https://docs.blockly.com/guides/create-custom-blocks/code-generation/overview/
- Blockly themes: https://docs.blockly.com/guides/configure/appearance/themes/
- scratch-blocks repo: https://github.com/scratchfoundation/scratch-blocks (Apache-2.0; v2.1.19 2026-04-28)
- Rete.js repo: https://github.com/retejs/rete (MIT; 2.0.6 2025-06-30)
- Rete.js engine concepts: https://retejs.org/docs/concepts/engine
- Rete Svelte renderer: https://retejs.org/docs/guides/renderers/svelte/ ; https://www.npmjs.com/package/rete-svelte-plugin (2.1.2 2026-07-10; Svelte 3/4/5)
- LiteGraph.js repo: https://github.com/jagenjo/litegraph.js (MIT; last commit Jan 2024) ; archived fork: https://github.com/Comfy-Org/litegraph.js
- Svelte Flow: https://svelteflow.dev/ (MIT) ; 1.0 announcement: https://xyflow.com/blog/svelte-flow-release ; release notes: https://svelteflow.dev/whats-new/2025-05-14 ; releases: https://github.com/xyflow/xyflow/releases (@xyflow/svelte 1.6.2 2026-07-06)
- Scratch design rationale: Resnick et al., "Scratch: Programming for All," CACM 52(11), 2009 — https://dl.acm.org/doi/10.1145/1592761.1592779
- Zapier conditional logic: https://help.zapier.com/hc/en-us/articles/34372501750285-Use-conditional-logic-to-filter-and-split-your-Zap-workflows ; https://help.zapier.com/hc/en-us/articles/8496276332557-Add-conditions-to-Zap-workflows-with-filters ; https://help.zapier.com/hc/en-us/articles/8496288555917-Add-branching-logic-to-Zaps-with-Paths
- npm registry data (versions, licenses, sizes, publish dates) retrieved via `npm view`, 2026-07-14.
