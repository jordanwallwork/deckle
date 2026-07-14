# Research: boardgame.io as the execution foundation for Deckle's tabletop

**Ticket:** [#99](https://github.com/jordanwallwork/deckle/issues/99) (part of #98)
**Date:** 2026-07-14
**Question:** Does boardgame.io fit as the execution foundation for Deckle's tabletop, with a setup DSL transpiling to it?

**Conclusion: adopt-with-caveats** — as a *bridge* target for Phase 3 (multiplayer / rules), not a replacement for the v2 engine today. Details and caveats below.

---

## 1. Project health

Primary sources: [GitHub repo](https://github.com/boardgameio/boardgame.io), commit history via GitHub API, npm registry.

| Signal | Value |
|---|---|
| Stars / license | 12.4k / MIT |
| Latest npm release | **0.50.2, published 2022-11-10** (npm registry `time` field) — no release since |
| Weekly npm downloads | ~4,200 (api.npmjs.org, week of 2026-07-07) |
| Open issues | ~115 |
| Last push | 2026-07-12 |

The timeline matters more than the snapshot:

- **2023-08-25** — creator nicolodavis committed "mark project as dormant" ([commit history](https://github.com/boardgameio/boardgame.io/commits/main)). Community raised concern in [#1150](https://github.com/boardgameio/boardgame.io/issues/1150) (May 2023); a maintainer volunteer appeared in [#1188](https://github.com/boardgameio/boardgame.io/issues/1188) (Aug 2024).
- **2024-11-04** — "Remove unmaintained repo banner" (fladrif); only dependabot activity through 2025.
- **2026-07 (this month)** — a substantial revival burst by new contributors `devill` and `Rupesh-ark`: Node 24/26 + pnpm toolchain modernization (#1244, #1245), fixes ported from the **lean-poker fork** (#1257), modernized release workflow (#1254), ESM server build + exports map (#1263), Koa 3 / socket.io 4.8 / **immer 11 / redux 5 / React 19 / Svelte 5** dependency upgrades (per `package.json` on `main`).

**Assessment:** the project was genuinely dormant 2023–2025 but is being actively revived right now. The revival is two weeks old and has not yet produced an npm release — the installable `0.50.2` is 3.5 years old and predates all the modernization. There is no dominant maintained fork to prefer; the lean-poker fork's fixes are being upstreamed. Health is the single biggest caveat: re-check in a quarter whether the revival produced releases, or pin a git commit.

## 2. Fit with the v2 tabletop engine

Local sources: `src/Deckle.Web/src/lib/tabletop/types.ts`, `operations.ts`, `store.svelte.ts`.

The shapes align unusually well — by design (`types.ts` header: "state is presentation-free so it can later be handed off to boardgame.io for Phase 3"; `operations.ts` header: "can be reused by the boardgame.io adapter in Phase 3"):

- boardgame.io moves receive `G` and **mutate it in place**; Immer converts that to an immutable update ([immutability docs](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/immutability.md)). Deckle's `operations.ts` functions are exactly this shape: `(state, ...args) => void` mutations on serializable `TabletopState`. Registering them as moves is near-mechanical: `moves: { moveEntityToZone: ({ G }, id, zoneId, opts) => ops.moveEntityToZone(G, id, zoneId, opts), ... }`.
- **Free-form manipulation coexists fine with move-based ownership.** Turn restrictions are opt-out: a single phase with `activePlayers: ActivePlayers.ALL` and no `endIf` lets every player dispatch any move at any time ([stages docs](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/stages.md), [events](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/events.md)). Free mode = "one perpetual phase, all moves always legal".
- The store's existing **transient vs. undoable split** (`withHistory` / `withoutHistory`, drag checkpoints) maps directly: transient drag positions stay client-local reactive state; only the committed action (drop, flip, shuffle) becomes a boardgame.io move. Routing per-frame drag updates through the move pipeline (redux dispatch + Immer + network broadcast per move) would be the wrong altitude.

Real friction points:

1. **Nondeterminism inside operations.** `makeId()` uses `crypto.randomUUID()` and `computeShuffledOrder`/`rollDie` use `Math.random`. boardgame.io requires moves to be deterministic and replayable; randomness must go through the seeded `random` plugin ([random docs](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/random.md), [Game API](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/api/Game.md)). Fix: thread an injectable `rng`/`idgen` through the handful of ops that need it — small, and worth doing pre-emptively.
2. **UI state lives in `TabletopState`.** `selectedEntityIds`, `selectedZoneId`, `editingZoneId` are per-client concerns and must move out of shared `G` (or into per-player client state) before `G` is synced.
3. **Undo model differs.** boardgame.io's undo is per-player, per-turn ([undo docs](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/undo.md)); Deckle's is a global 100-deep history. In free mode, keep Deckle's history client-side (single-player) and accept that shared-table undo is a design question for multiplayer regardless of framework.
4. **Animation orchestration** (shuffle fan, wave flip) is already transient store state outside `TabletopState` — unaffected.

## 3. Svelte 5 integration

- boardgame.io ships React bindings, but the **vanilla JS client is first-class**: `Client({ game })`, `client.start()`, `client.subscribe(cb)`, `client.getState()` (returns `{ G, ctx, ... }`), `client.moves.x(...)`, `client.events.endTurn()` ([Client API](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/api/Client.md)). The React binding is a thin wrapper over this.
- Svelte adapter is ~30 lines: a `.svelte.ts` module holding `let g = $state(...)` refreshed from `client.subscribe`, exposing `client.moves`. This matches the repo's existing "logic in `.svelte.ts` runes modules" rule.
- Notably, the modernized `main` branch's debug panel is written in Svelte with a **`peerDependencies: { "svelte": "^5.0.0" }`** (repo `package.json`) — Svelte 5 is already inside the project's own dependency graph, so no React would enter Deckle's bundle (React is only needed for the optional react bindings).

## 4. Phases/turns model vs a setup-script use case

- `setup({ ctx, random }, setupData)` returns initial `G` ([Game API](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/api/Game.md)). A Deckle setup DSL transpiles naturally: the DSL's spawn/shuffle/deal steps become a `setup` function composed from the same `operations.ts` primitives (`spawnFromTemplate`, `shuffleZoneEntities`, `moveEntityToZone`...), with `random` supplied by the plugin so setup is seedable/reproducible.
- Phases are **optional**, not imposed: free mode is one phase with `ActivePlayers.ALL`. When Deckle later grows toward full rules, [phases](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/phases.md) (per-phase move sets, `onBegin`/`onEnd`, `endIf`, turn orders, stages) are a good compilation target for a rules DSL — per-phase `moves` replacing the global set is exactly "which actions are legal now".
- One quirk: phase transitions auto-end the current player's turn — irrelevant in free mode, relevant when transpiling rules.

## 5. Bot / simulation hooks

- Ships `RandomBot` and an **MCTS bot** (`src/ai/mcts-bot.ts`), plus `Step(client, bot)` (one bot move) and `Simulate({ game, bots, state, depth })` (play to game end or depth, default 10,000 iterations) — confirmed in [`src/ai/ai.ts`](https://github.com/boardgameio/boardgame.io/blob/main/src/ai/ai.ts).
- Bots require an `ai.enumerate(G, ctx)` function listing legal moves. This is meaningless for the free-form sandbox (unbounded move space) but is precisely what a rules DSL produces for free — legal-move enumeration is a natural DSL output. So the bot hooks are a genuine payoff for the "designed-for-growth" goal, gated on having rules, not on adopting the framework.

## 6. Wrap, replace, or bridge?

**Bridge.** Keep `operations.ts` as the single engine kernel — it is already the pure, framework-free layer both sides need:

- **Today (free mode, single-player):** unchanged — `store.svelte.ts` wraps operations with runes + history.
- **Phase 3 (multiplayer / setup scripts / rules):** a boardgame.io `game` definition whose `setup` and `moves` are generated from the same operations (DSL transpiles to move/setup compositions). A small Svelte 5 runes adapter around the vanilla client replaces the store's mutation path; transient drag/animation/selection state stays in the client-local store.
- **Do not** replace the v2 store now (boardgame.io buys nothing for single-player free mode and costs the Immer/redux pipeline per action), and **do not** wrap boardgame.io around the whole UI (per-frame drags don't belong in moves).

Pre-emptive, cheap alignment work worth doing in v2 now: inject rng/id-generation into operations; move `selectedEntityIds`/`selectedZoneId`/`editingZoneId` out of `TabletopState` into store-level UI state.

## Verdict: **adopt-with-caveats**

boardgame.io fits: the v2 engine was shaped for it and the mapping is mechanical; free-form play coexists with move ownership via `ActivePlayers.ALL` + client-local transients; the vanilla client makes Svelte 5 integration trivial (and upstream itself now targets Svelte 5); `setup` + seeded randomness is a clean DSL target; MCTS/Simulate hooks align with future rules goals.

Caveats, in order of weight:

1. **Release risk** — latest npm release is Nov 2022; the July 2026 revival (new maintainers, modernized toolchain, release workflow rebuilt) has not shipped yet. Adopt against a pinned commit or wait for the next release; re-validate maintainer momentum before Phase 3 work starts.
2. Determinism: operations must take injected rng/ids before they can be moves.
3. UI/selection state must leave `TabletopState` before `G` is shared.
4. Undo semantics diverge (per-turn vs global history) — treat multiplayer undo as its own design decision.
5. Keep drags/animations out of the move pipeline (already the store's architecture).

**Fallback if the revival stalls:** the bridge architecture keeps `operations.ts` as the engine, so the alternative is a thin bespoke sync layer (server-authoritative reducer + patch broadcast — `rfc6902`/JSON-patch style, which is also what boardgame.io does internally). Nothing adopted now would be thrown away.

---

### Sources

- boardgame.io repo, commits, package.json: https://github.com/boardgameio/boardgame.io
- npm registry (versions/dates): https://registry.npmjs.org/boardgame.io ; downloads: https://api.npmjs.org/downloads/point/last-week/boardgame.io
- Docs (main branch): [Client API](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/api/Client.md), [Game API](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/api/Game.md), [immutability](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/immutability.md), [phases](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/phases.md), [stages](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/stages.md), [random](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/random.md), [undo](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/undo.md)
- AI source: [src/ai/ai.ts](https://github.com/boardgameio/boardgame.io/blob/main/src/ai/ai.ts), `src/ai/mcts-bot.ts`
- Maintenance history: [#1150 state of the project](https://github.com/boardgameio/boardgame.io/issues/1150), [#1188 maintainer offer](https://github.com/boardgameio/boardgame.io/issues/1188), commit log ("mark project as dormant" 2023-08-25; "Remove unmaintained repo banner" 2024-11-04; modernization PRs #1244–#1263, July 2026)
- Deckle: `src/Deckle.Web/src/lib/tabletop/types.ts`, `operations.ts`, `store.svelte.ts`
