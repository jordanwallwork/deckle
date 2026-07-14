# Survey: Languages & Systems for Describing Board-Game Setup and Rules

*Research date: 2026-07-14. Question: what should Deckle's setup DSL borrow or adopt rather than invent? Target: express "deal 2 cards face-down from main deck to each player's tableau", player-count conditionals, and grow into full rules later. Deckle's VTT runs in the browser (Svelte 5/TS) with a .NET API.*

## TL;DR / Recommendation

**Design a small, new, JSON-serializable declarative DSL — but steal aggressively rather than invent vocabulary.** No surveyed system is adoptable wholesale: the two languages that can *natively* say "deal N cards to each player" (Ludii's `.lud`, CardStock's RECYCLE) are Java/C# implementations under licenses (CC BY-NC-ND 4.0 and GPL-3.0 respectively) that block embedding in a commercial JS runtime; the systems that *do* run in the browser (boardgame.io, Boardzilla, virtualtabletop.io) express setup as imperative JS/TS or ad-hoc JSON routines, not a designer-facing declarative language. Specifically:

1. **Steal Ludii's structure**: a *ludeme tree* — nested, typed terms `(verb arg arg ...)` — is trivially serializable as JSON, maps 1:1 onto a block/tree graphical editor, and Ludii proves the same structure scales from "start rules" (setup) to full play rules ([Piette et al., ECAI 2020](https://ludii.games/publications/ECAI2020.pdf)). Ludii already has the exact primitive Deckle needs: a `deal` start rule that "deals a certain number of cards/dominoes to each player" ([Ludii Game Logic Guide, arXiv:2101.02120](https://arxiv.org/abs/2101.02120)).
2. **Steal CardStock/RECYCLE's card-game vocabulary**: named zones with **owners** (game / each-player), collections (deck, hand, tableau), visibility (face-up/down/owner-only), and setup as a distinct **GameFlow stage** ([CardStock docs](https://cardstock.readthedocs.io/en/latest/)).
3. **Steal boardgame.io's runtime shape as the compile target**: `setup: ({ ctx }) => G` with `ctx.numPlayers`, plus `moves`/`phases`/`turn` for the future rules layer ([boardgame.io tutorial](https://boardgame.io/documentation/#/tutorial)). Deckle's interpreter should evaluate the DSL tree into exactly this kind of pure `setup(ctx)` state transform, executed in TS in the browser and validated (schema + semantics) in .NET.
4. **Steal Tabletop Simulator's `deal()` parameter set** as the checklist for what a deal action must express: count, target player(s), which hand/zone, deal-from-bottom ([TTS API](https://api.tabletopsimulator.com/object/)).
5. **Copy virtualtabletop.io's proof of concept** that JSON-embedded automation "routines" work in a browser VTT and remain hand-editable alongside a visual editor ([virtualtabletop GitHub](https://github.com/ArnoldSmith86/virtualtabletop)).

Sketch of the resulting shape (Deckle-invented syntax, Ludii-shaped tree, RECYCLE vocabulary, boardgame.io semantics):

```json
{
  "setup": [
    { "do": "shuffle", "zone": "deck:main" },
    { "do": "deal", "count": 2, "from": "deck:main",
      "to": { "each": "player", "zone": "tableau" }, "facing": "down" },
    { "when": { "playerCount": { "gte": 4 } },
      "do": "place", "component": "card:wildcard", "zone": "deck:main" }
  ]
}
```

---

## Comparison Table

| System | "Deal N face-down to each player's zone"? | Player-count conditionals? | Syntax style | Graphical editor? | License (impl.) | JS-embeddable? |
|---|---|---|---|---|---|---|
| GDL / GDL-II | No native primitive — must encode cards/zones in first-order logic | Yes, but manually via logic rules | KIF / Datalog-like logic | No; poor fit | Spec: open tech report; impls vary | Poor (needs logic engine; no card vocab) |
| Ludii (.lud) | **Yes** — `(start (deal Cards n))`, `(place ...)` | Yes — descriptions parameterized by `(players n)`; options/rulesets | Lisp-like ludeme tree, semi-readable | No official visual editor, but tree maps naturally to one | CC BY-NC-ND 4.0 (Java) | No (Java; license bars derivatives) |
| boardgame.io | Yes, imperatively in JS `setup()` | Yes — `ctx.numPlayers` | Plain JS objects + functions | No; code-only | **MIT** | **Native** |
| TTS Lua API | Yes — `deck.deal(n, color)` imperatively | Yes — Lua over seated players | Imperative Lua | TTS itself is the editor (in-game) | Proprietary product; API only inside TTS | No |
| Vassal buildFile | Partially — GKCs/Decks can send cards to hands; "deal N to each player" is assembled from triggers, clunky | Weak — via global properties/triggers | Editor-generated XML, not hand-authored | **Yes** — Module Editor is the primary interface | LGPL v2 (Java) | No |
| RECYCLE / CardStock | **Yes** — core purpose; zones with owners, deal in setup stage | Yes | Terse keyword DSL (`.rcy`) | No | GPL-3.0 (C#) | No (GPL + C#) |
| Machinations | No — models economies/resource flows, not table setup | Sort of (registers) | Diagram (nodes/edges), no text DSL | **Yes** — diagram *is* the language | Proprietary SaaS | No |
| RBG (Regular Boardgames) | No card primitives; boards + regular-expression moves | No first-class notion | Regex-over-graph, very terse | No | MIT (C++) | Theoretically; wrong domain |
| Toss | No (GDL-descendant, logic + real-time) | Manual | Logic formulas | No | GPL (SourceForge, abandoned) | No |
| Boardzilla | Yes, imperatively in TS (`create`, `shuffle`, flow) | Yes — `game.players` | TypeScript class API | No; code-first | AGPL-3.0 (TS) | Yes technically, **AGPL risk** |
| virtualtabletop.io | Yes — JSON widget `routine` ops (e.g. MOVE/FLIP/SHUFFLE) | Yes via variables/conditions | JSON widgets + JSON op-list routines | **Yes** — built-in visual + JSON editor | GPL v3 (JS) | Yes technically, **GPL risk** |
| Screentop.gg | Yes via its component/automation model (proprietary) | Yes (expressions) | Visual builder + formulas | **Yes** — that's the product | Proprietary hosted | No |
| Dized | N/A — interactive *tutorial* authoring, not executable rules | N/A | Authoring tool | Yes (tutorial editor) | Proprietary | No |

---

## GDL / GDL-II (Stanford Game Description Language)

**What it is.** The academic standard for General Game Playing: a game is a set of logic rules over the relations `role`, `init`, `legal`, `next`, `terminal`, `goal`, written in a variant of KIF (prefix first-order logic, Datalog-like restrictions). Spec: Love, Hinrichs, Genesereth et al., *General Game Playing: Game Description Language Specification*, Stanford tech report LG-2006-01 ([PDF](http://logic.stanford.edu/reports/LG-2006-01.pdf); overview: [Wikipedia](https://en.wikipedia.org/wiki/Game_Description_Language)). GDL-II (Thielscher 2010) adds the `random` role and `sees` relation for chance and imperfect information — which is what card dealing requires.

1. **Setup expressiveness.** There is *no* deal/deck/zone vocabulary. Setup is a list of `(init ...)` facts; a shuffled deal must be encoded as moves of the `random` role plus `sees` rules hiding cards. "Each player" and player-count conditionals are expressible (it's first-order logic) but every game re-derives them from scratch. This is the canonical example of a language that is *universal but hostile* to card games.
2. **Syntax.** Terse logic. Representative (Tic-Tac-Toe, from the spec):
   ```lisp
   (role xplayer) (role oplayer)
   (init (cell 1 1 b)) (init (control xplayer))
   (<= (legal ?p (mark ?x ?y)) (true (cell ?x ?y b)) (true (control ?p)))
   ```
3. **Graphical editor.** None; the flat rule-set shape does not map onto a tree/block editor well.
4. **Licensing.** The language is defined by an openly published tech report; there is no license on the *language*. Implementations vary (e.g., GGP-Base is open source).
5. **JS embeddability.** Requires a Datalog/logic-programming engine; some JS GGP players exist, but you'd still have zero card vocabulary. Not a fit.

**Verdict for Deckle:** borrow only the *lesson*: pure logic with no domain vocabulary makes card-game setup miserable. GDL-II's split of "hidden information = who `sees` what" is worth remembering for face-down semantics.

## Ludii (.lud language, ludii.games)

**What it is.** The general game system from the ERC Digital Ludeme Project (Cameron Browne et al.). Games are `.lud` files: a tree of **ludemes** — "name followed by whitespace-separated arguments in parentheses" ([Ludii tutorials: .lud basics](https://ludiitutorials.readthedocs.io/en/latest/lud_format_basics.html)). ~1,000+ games modelled. Java implementation ([GitHub Ludeme/Ludii](https://github.com/Ludeme/Ludii)).

1. **Setup expressiveness.** **Yes — the best-in-class declarative answer.** Rules have a `(start ...)` section with start rules such as `(place ...)` and `(deal ...)`; per the [Ludii Game Logic Guide (arXiv:2101.02120)](https://arxiv.org/abs/2101.02120), the `deal` rule "deal[s] a certain number of cards/dominoes to each player", and the `Deck` ludeme models a stack of cards with configurable suits/counts. Player count is a first-class header `(players n)`, and Ludii supports options/rulesets to vary a description parametrically.
2. **Syntax.** Lisp-ish but noun-heavy and fairly readable:
   ```lisp
   (game "Tic-Tac-Toe"
     (players 2)
     (equipment { (board (square 3)) (piece "Disc" P1) (piece "Cross" P2) })
     (rules
       (play (move Add (to (sites Empty))))
       (end (if (is Line 3) (result Mover Win)))))
   ```
   ([source](https://ludiitutorials.readthedocs.io/en/latest/lud_format_basics.html))
3. **Graphical editor.** No shipped visual rule editor (the Ludii Player has text editing), but the ludeme-tree structure is explicitly designed as composable typed units and maps naturally onto a tree/block editor — this is the single most stealable idea for Deckle.
4. **Licensing.** The Ludii source repository carries a **CC BY-NC-ND 4.0** badge ([GitHub](https://github.com/Ludeme/Ludii)) — non-commercial, **no derivatives**. The *language design* is described in open academic papers ([ECAI 2020](https://ludii.games/publications/ECAI2020.pdf), [arXiv:2101.02120](https://arxiv.org/abs/2101.02120)); copyright protects the Java expression, not the concepts, so re-implementing a ludeme-tree *idea* with your own vocabulary is fine, but reusing their code, grammar files, or game library is not (and NC bars commercial use anyway).
5. **JS embeddability.** None — Java desktop app; no official JS runtime.

**Verdict:** adopt the *shape* (typed ludeme tree, `(start ...)` vs `(play ...)` vs `(end ...)` separation, `deal`/`place` start-rule vocabulary), re-implement clean-room in TS/JSON.

## boardgame.io

**What it is.** MIT-licensed JS/TS framework: "write simple functions that describe how the game state changes when a particular move is made", with built-in multiplayer state sync, phases, turn orders ([GitHub](https://github.com/boardgameio/boardgame.io), 12.4k stars).

1. **Setup expressiveness.** Setup is an arbitrary JS function returning initial state `G`; it receives `ctx` including `numPlayers`, so "deal 2 to each player" and player-count conditionals are trivial — but *imperative code*, not declarative data. No card/zone vocabulary; you build your own deck arrays (a `plugins`/community ecosystem exists but nothing canonical for cards).
2. **Syntax.** Plain JS objects ([tutorial](https://boardgame.io/documentation/#/tutorial)):
   ```js
   export const TicTacToe = {
     setup: () => ({ cells: Array(9).fill(null) }),
     turn: { minMoves: 1, maxMoves: 1 },
     moves: {
       clickCell: ({ G, playerID }, id) => {
         if (G.cells[id] !== null) return INVALID_MOVE;
         G.cells[id] = playerID;
       },
     },
     endIf: ({ G, ctx }) => { if (IsVictory(G.cells)) return { winner: ctx.currentPlayer }; },
   };
   ```
3. **Graphical editor.** None; a function-valued definition can't be safely round-tripped through a GUI, which is exactly why Deckle's DSL should be data, not code.
4. **Licensing.** **MIT** ([GitHub](https://github.com/boardgameio/boardgame.io)) — fully adoptable, including commercially. Maintenance has slowed in recent years; treat it as a design reference / optional dependency, not a bet-the-farm platform.
5. **JS embeddability.** Native. Could literally run inside Deckle's Svelte tabletop.

**Verdict:** adopt its *execution model* (pure `setup(ctx) → G`, `moves`, `phases`, `endIf`) as the semantics Deckle's DSL compiles/interprets into; the phase/turn structure is the pre-drawn map for "grow into full rules later". Whether to take the library itself as a dependency is a separate engineering call — the MIT license permits either.

## Tabletop Simulator (Lua scripting API)

**What it is.** Berserk Games' commercial 3D sandbox; mods script table behavior in **Lua** against an object API ([api.tabletopsimulator.com](https://api.tabletopsimulator.com/)).

1. **Setup expressiveness.** Imperative but the primitives are exactly right: `deal(number, player_color, index, deal_from_bottom)` — "Deals Objects to hand zones. Will deal from decks/bags/stacks as well as individual items", defaulting to *all seated players* when no color given ([Object API](https://api.tabletopsimulator.com/object/)). Face-down is object state (`flip()`); zones are hand zones/scripting zones. Player-count logic via `Player.getPlayers()` in Lua.
2. **Syntax.** Imperative Lua: `deck.shuffle(); deck.deal(2)`.
3. **Graphical editor.** The game itself is the WYSIWYG editor (place objects, save as mod); scripting is code-only.
4. **Licensing.** Proprietary game (paid, Steam); the Lua API exists only inside the product. Nothing legally reusable.
5. **JS embeddability.** No.

**Verdict:** steal the **parameter checklist** of its `deal` (count, whom, which hand zone, from-bottom) and its sensible default "no target = every seated player".

## Vassal

**What it is.** The venerable open-source wargame/boardgame engine (Java). A module (`.vmod`) is a ZIP whose `buildFile.xml` "links all the parts of your module together… normally maintained for you by the VASSAL Module Editor" ([vassal-module-template](https://github.com/vassalengine/vassal-module-template); [Reference Manual](https://vassalengine.org/doc/latest/ReferenceManual/Concepts.html)).

1. **Setup expressiveness.** Decks exist as components with shuffle/face-down options, and Global Key Commands + triggers can push cards to player hands; but "deal 2 to each player at setup" is assembled from editor plumbing (predefined setups, saved games, key-command chains), not stated declaratively. Player-count adaptation is notoriously manual.
2. **Syntax.** Machine-oriented XML like `<VASSAL.build.GameModule name="..." version="...">…` — generated by the editor, not meant for humans.
3. **Graphical editor.** **Yes** — the Module Editor *is* the language's authoring surface; the XML is its serialization. This is the strongest existence proof that "GUI-first, XML/JSON-serialized" works for hobbyist designers.
4. **Licensing.** **LGPL v2** ([vassalengine.org/wiki/Licensing](https://vassalengine.org/wiki/Licensing); [GitHub](https://github.com/vassalengine/vassal)). Java implementation; the XML format is de-facto open.
5. **JS embeddability.** No (Java desktop).

**Verdict:** anti-model for syntax (editor-generated XML with anemic semantics ages badly), positive model for "editor is primary, text is serialization".

## RECYCLE / CardStock (Mark Goadrich)

**What it is.** RECYCLE is "a card game description language" (originating in Font, Mahlmann, Manrique & Togelius, *A Card Game Description Language*, EvoApplications 2013); **CardStock** is Goadrich's C# general game engine for it — "games are written in RECYCLE… and then simulations are run with random, simple, and complex AI players", files are `.rcy` ([GitHub mgoadric/cardstock](https://github.com/mgoadric/cardstock); [docs](https://cardstock.readthedocs.io/en/latest/)).

1. **Setup expressiveness.** **Yes — this is its whole domain.** The documented language concepts are exactly Deckle's: **Owner** (who a zone belongs to), **Collection** (decks/hands/piles with visibility), **Variable and Action**, **GameFlow and Setup** as an explicit stage, **Scoring** ([docs TOC](https://cardstock.readthedocs.io/en/latest/)). Actions move cards between owned collections; setup deals are ordinary actions in the setup stage.
2. **Syntax.** Terse keyword/S-expression-ish DSL (`.rcy`), e.g. moving the top card of the deck to each player's hand inside a repeat — compact but researcher-flavored, less readable than Ludii.
3. **Graphical editor.** None.
4. **Licensing.** CardStock engine: **GPL-3.0**, C# ([GitHub](https://github.com/mgoadric/cardstock)). The RECYCLE *language* is described in an open academic paper; concepts freely reusable.
5. **JS embeddability.** No (C# + GPL).

**Verdict:** steal the **vocabulary and ontology**: owner-scoped zones, collection visibility (hidden/owner/all), setup as a named stage, and "for each player" iteration as a built-in rather than a loop the author writes.

## Machinations

**What it is.** Joris Dormans' diagram formalism for **game economies** (pools, sources, drains, converters, resource flows), now a commercial simulation SaaS at [machinations.io](https://machinations.io) (Community free tier with public diagrams; paid Starter/Pro/Academia tiers billed by simulation "events"; proprietary, ISO-27001-badged — [pricing](https://machinations.io/pricing)).

1. **Setup expressiveness.** Not applicable — it models resource flow rates and feedback loops, not physical table state; it cannot say "deal 2 face-down to each tableau".
2. **Syntax.** There is no text DSL; the diagram is the artifact.
3. **Graphical editor.** Yes — it *only* exists as a graphical editor, and is the field's best evidence that designers will happily author executable models visually.
4. **Licensing.** Proprietary SaaS; the underlying framework is published in Dormans' academic work (*Engineering Emergence*, 2012; *Game Mechanics: Advanced Game Design*, Adams & Dormans).
5. **JS embeddability.** The web app is JS, but nothing is licensed for reuse.

**Verdict:** out of scope for setup, but a reference point if Deckle ever adds economy balancing/simulation.

## GDL descendants: Regular Boardgames (RBG) and Toss

- **RBG** (Kowalski et al., AAAI 2019; [arXiv:1706.02462](https://arxiv.org/abs/1706.02462)) describes game rules as **regular expressions over graph operations** — orders of magnitude faster to reason over than GDL. Implementation: C++, **MIT license** ([GitHub marekesz/rbg](https://github.com/marekesz/rbg); [LICENSE](https://raw.githubusercontent.com/marekesz/rbg/master/LICENSE)). No card/deal/hidden-information vocabulary; setup is initial board literals. Terse to the point of write-only. Nothing for Deckle beyond the reminder that efficiency-oriented DSLs sacrifice readability.
- **Toss** (Kaiser & Stafiniak, ~2010–2012) extended GDL toward structures/real-time using logic formulas; GPL, SourceForge, effectively abandoned. Historical footnote only.

## Boardzilla

**What it is.** "A framework to make writing a digital board game easy" — TypeScript, handles players, rules structuring, state, animations ([GitHub boardzilla/boardzilla-core](https://github.com/boardzilla/boardzilla-core); [docs](https://docs.boardzilla.io/)).

1. **Setup expressiveness.** Yes, imperatively, and with a genuinely nice element model — first-class `Space`/`Piece` classes, per-player spaces, and flow definitions. From the official starter game ([source](https://github.com/boardzilla/boardzilla-starter-game)):
   ```ts
   export default createGame(MyGamePlayer, MyGame, game => {
     for (const player of game.players) {
       const mat = game.create(Space, 'mat', { player });
       ...
     }
     game.create(Space, 'pool');
     $.pool.createMany(game.setting('tokens') - 1, Token, 'blue', { color: 'blue' });
     game.defineFlow(() => $.pool.shuffle(), ...);
   });
   ```
   `for (const player of game.players)` gives player-count-aware setup for free.
2. **Syntax.** TypeScript class/fluent API — developer-facing, not designer-facing.
3. **Graphical editor.** No.
4. **Licensing.** **AGPL-3.0** ([GitHub](https://github.com/boardzilla/boardzilla-core)) — network copyleft; embedding it in Deckle's hosted product would obligate releasing Deckle's source. Avoid as a dependency.
5. **JS embeddability.** Technically perfect (it *is* a browser/TS framework); legally poisoned for a proprietary SaaS.

**Verdict:** steal the *element-tree data model* idea (typed Space/Piece hierarchy queried with selectors) as design reference only; do not copy code.

## playingcards.io / virtualtabletop.io

**What it is.** virtualtabletop.io is the open-source successor to playingcards.io: "a virtual surface in the browser on which you can play board, dice and card games", games defined as **JSON widgets** (cards, holders, dice, buttons) with a built-in visual editor plus "context-sensitive JSON editor" ([GitHub ArnoldSmith86/virtualtabletop](https://github.com/ArnoldSmith86/virtualtabletop)). **GPL v3**.

1. **Setup expressiveness.** Yes — buttons/widgets carry **routines**, "a custom programming language inside the JSON" (ordered lists of operations like moving/flipping/shuffling/recalling cards, with variables and conditionals), so a "Deal" button that gives N face-down cards to each seat is a standard pattern (playingcards.io's automation worked the same way). Player-count handling is via seats and routine conditionals — workable, not elegant.
2. **Syntax.** JSON op-lists, e.g. (paraphrased shape) `{"func": "MOVE", "count": 2, "from": "mainDeck", "to": "seat.hand"}` — verbose, no schema-level typing, but demonstrably usable by non-programmers with the editor.
3. **Graphical editor.** **Yes** — built-in drag-and-drop editor with JSON round-tripping; the closest existing product to Deckle's intended UX.
4. **Licensing.** **GPL v3** (JS) — code reuse would copyleft Deckle; the *format idea* is free.
5. **JS embeddability.** It is a browser app; but GPL blocks embedding.

**Verdict:** the strongest *product* precedent: JSON-serialized ops + visual editor + browser VTT is a proven combination. Deckle should do the same with a cleaner, schema-validated action vocabulary.

## Screentop.gg, Dized, and other industry tools

- **Screentop.gg** — proprietary hosted platform to "play tabletop games with friends" with a Create section for user-built games ([screentop.gg](https://screentop.gg/)); builders compose components in a visual editor with expression-based behavior (docs at docs.screentop.gg were unreachable during this research; details beyond the landing page are unverified here). No exportable/open language; relevant only as UX competition.
- **Dized** ([dized.com](https://dized.com)) — proprietary platform for authoring interactive rules *tutorials*; its authoring tool structures rules for step-by-step teaching, not machine-executable setup. Relevant later if Deckle wants "teach the setup" mode generated from the same DSL — a genuinely differentiating possibility.
- **Ludi / GAML** (Cameron Browne's pre-Ludii system, *Evolutionary Game Design*, 2011 — origin of Yavalath) — introduced the ludeme-tree idea that Ludii industrialized ([Digital Ludeme Project](http://www.ludeme.eu/)); subsumed by the Ludii section above.
- **Dominion-style card DSLs** — hobby projects abound (data-driven card effect JSON in Dominion clones, Hearthstone's server-side card definitions, MtG's Magarena/Forge scripts). Common thread: **card effects as data records with a small verb vocabulary** (draw/gain/trash + amounts + targets), which is the same pattern recommended here, applied at card scope instead of setup scope.

---

## Recommendation in Full: Design New, Steal These Parts

**Adopt:** nothing wholesale. **Adapt/steal:**

| Idea | From | Into Deckle |
|---|---|---|
| Nested typed term tree ("ludeme tree"); `start` vs `play` vs `end` rule sections | Ludii | DSL = JSON AST; ship `setup` (start rules) now, reserve `rules`/`end` keys for later |
| `deal` / `place` / `shuffle` as declarative start-rule verbs | Ludii | Core action vocabulary v1: `shuffle`, `deal`, `place`, `flip`, `setVar` |
| Owner-scoped zones, collection visibility, Setup as a named GameFlow stage | RECYCLE/CardStock | Zones declared per component type with `owner: "game" \| "player"` and `visibility`; `each: "player"` as first-class target |
| `setup({ ctx }) → G` purity; `ctx.numPlayers`; phases/moves/turn for future growth | boardgame.io (MIT) | Interpreter contract: DSL evaluates to a pure state transform in the browser VTT; conditionals get `playerCount` from ctx |
| `deal(count, target?, handIndex?, fromBottom?)`, default "all seated players" | TTS Lua API | Parameter checklist for the `deal` action node |
| JSON widgets + routines + built-in visual/JSON dual editor | virtualtabletop.io | Product shape: block/tree editor writes the same JSON a power user can hand-edit |
| Editor-first, text-as-serialization | Vassal, Machinations | The DSL must round-trip a GUI losslessly — hence data, never functions |

**Why not adopt an existing language outright:**
- **Ludii** is the only true declarative fit but is Java + **CC BY-NC-ND 4.0** (non-commercial, no derivatives) — unusable in and un-portable to Deckle's stack; only its published *ideas* are reusable.
- **CardStock** is GPL-3.0 C#; **Boardzilla** is AGPL-3.0; **virtualtabletop** is GPL-3.0 — all copyleft-incompatible with embedding in Deckle unless Deckle itself goes (A)GPL.
- **boardgame.io** is MIT and browser-native but is a *code* framework: functions can't be authored in a graphical editor, stored in Postgres, or validated server-side the way a JSON AST can. It is the right *semantics* and an acceptable optional runtime substrate, not a designer DSL.
- **GDL/RBG/Toss** lack card vocabulary entirely; **Machinations/Screentop/Dized/TTS** are proprietary or out-of-domain.

**Concrete v1 shape.** A `GameSetup` document (JSON, versioned, JSON-Schema-validated in both TS and .NET) containing: zone declarations (id, owner scope, visibility, layout hint) and an ordered action list where each node is `{ do, ...params }` or `{ when: <condition>, do | steps }`. Conditions v1: `playerCount` comparisons only. Targets are selectors: `"deck:main"`, `{ each: "player", zone: "tableau" }` (RECYCLE's owner model). Facing is explicit (`"up" | "down"`), per GDL-II's lesson that hidden information must be stated, never implied. The browser interpreter (TS, in the Svelte VTT) executes nodes against tabletop state; the .NET side validates schema and referential integrity (zone/deck ids exist on the project's components). Growth path to full rules: add `phases`, `moves` (same action-node grammar plus triggers/legality conditions), and `end` — i.e., converge on boardgame.io's proven decomposition without ever having taken the dependency.

---

## References

- GDL spec: Love, Hinrichs, Genesereth et al., *GGP: Game Description Language Specification*, LG-2006-01 — http://logic.stanford.edu/reports/LG-2006-01.pdf ; overview https://en.wikipedia.org/wiki/Game_Description_Language
- Ludii: repo (CC BY-NC-ND badge) https://github.com/Ludeme/Ludii ; Game Logic Guide (deal/start rules, Deck ludeme) https://arxiv.org/abs/2101.02120 ; ECAI 2020 paper https://ludii.games/publications/ECAI2020.pdf ; .lud syntax tutorial https://ludiitutorials.readthedocs.io/en/latest/lud_format_basics.html ; Digital Ludeme Project http://www.ludeme.eu/
- boardgame.io: repo (MIT) https://github.com/boardgameio/boardgame.io ; tutorial (setup/moves/endIf code) https://boardgame.io/documentation/#/tutorial
- Tabletop Simulator: Object API (`deal`) https://api.tabletopsimulator.com/object/
- Vassal: licensing (LGPL) https://vassalengine.org/wiki/Licensing ; repo https://github.com/vassalengine/vassal ; buildFile/module structure https://github.com/vassalengine/vassal-module-template , https://vassalengine.org/doc/latest/ReferenceManual/Concepts.html
- CardStock/RECYCLE: repo (GPL-3.0) https://github.com/mgoadric/cardstock ; docs (Owner/Collection/GameFlow & Setup) https://cardstock.readthedocs.io/en/latest/ ; Font et al., *A Card Game Description Language*, EvoApplications 2013 https://doi.org/10.1007/978-3-642-37192-9_26
- Machinations: pricing/proprietary SaaS https://machinations.io/pricing
- RBG: repo https://github.com/marekesz/rbg ; MIT license https://raw.githubusercontent.com/marekesz/rbg/master/LICENSE ; language paper https://arxiv.org/abs/1706.02462
- Boardzilla: core repo (AGPL-3.0, TypeScript) https://github.com/boardzilla/boardzilla-core ; docs https://docs.boardzilla.io/ ; starter game (setup code quoted) https://github.com/boardzilla/boardzilla-starter-game
- virtualtabletop.io: repo (GPL v3; JSON widgets, routines, built-in editor) https://github.com/ArnoldSmith86/virtualtabletop
- Screentop.gg https://screentop.gg/ ; Dized https://dized.com
