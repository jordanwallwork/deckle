# Taste-Skill Audit — Deckle Frontend

**Ruleset:** [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (`skills/taste-skill/SKILL.md`), the open-source "anti-slop" frontend design rubric. The skill is not installed in this repo; its ruleset was fetched and applied manually.
**Scope:** Public surfaces + app chrome — auth/landing page, TopBar, layout shell/footer, shared primitives (Button, Card, Dialog, Badge, PageHeader, base-input), global tokens in `app.css`, and the projects dashboard. The deep WYSIWYG editor internals are out of scope.
**Date:** 2026-07-12

> **Update (2026-07-12):** the **P0 contrast finding has been fixed** (commit on
> `claude/leonxlsx-taste-skill-test-knsv3r`). Two tokens were added — `--color-sage-dark
> #537258` and `--color-sage-darker #456049` — and every place `--color-sage #78a083`
> was used as *text* or as a *solid surface behind white text* now uses the darker sage;
> text on the dark teal gradient (auth hero, page headers) is now white. Sage is
> retained for tints/fills/focus-glow only. All measured pairs now pass WCAG AA
> (≥ 4.5:1). Remaining P1/P2 items below are unchanged.
>
> The fix landed in two passes: first the public + app chrome (`app.css`, `TopBar`,
> `Button`, `+page.svelte`, `Dialog`, `Badge`, `PageHeader`, plus shared primitives
> `Tabs`, `EmptyState`, `ConfirmDialog`, `FormField`, `ProjectCard`), then a **whole-app
> sweep** of the remaining sage-as-text uses across the feature and editor pages
> (data sources, image library, account, component forms, file gallery, public profile,
> etc. — ~24 more files). Every `--color-sage` foreground/solid-behind-white use is now
> `--color-sage-dark`; the only surviving `--color-sage` uses are decorative (borders,
> focus outlines, selection rings, the logo, and gradients).

---

## 1. Summary & verdict

Deckle's frontend is **cohesive, restrained, and consistent** — a single light theme built on a small teal/sage CSS-variable token set, system fonts, soft shadows, one repeated "hover-lift + 0.2s ease" motion motif, and clean focus states. On the taste-skill's *anti-slop* axis (the thing the skill most cares about) it scores well: no AI-purple gradients, no fake screenshots, no oversized screaming H1s, no generic-startup slop copy, real semantic markup.

The problems the skill surfaces here are **not** "generic AI slop" — they are **design-system hygiene** issues:

1. **Contrast (P0, real accessibility defect):** the sage accent `#78a083` is used as a *foreground/text* color throughout, and it fails WCAG AA everywhere it is measured (2.36–2.94:1, below even the 3:1 large-text bar). White text on the sage TopBar has the same problem.
2. **Token discipline (P1):** one semantic role (danger/error) is expressed with **four different hard-coded reds**; the "accent" oscillates between sage and muted-teal; and several components reference **CSS variables that are never defined**.
3. **Dark mode (P1):** the skill treats it as mandatory; the app is light-only.
4. **Lower-priority (P2):** no `prefers-reduced-motion` guards, radius values that bypass the token scale, a system-only type stack with no scale, and em-dashes in UI microcopy (the skill's stated #1 tell).

The single highest-value change is **the contrast/accent fix** — it is an accessibility win *and* it resolves most of the "one accent, used identically" tension in one move, because the fix is simply "use `muted-teal` for anything that is text, reserve `sage` for large fills."

**Applicability caveat (required by the skill's own Redesign Protocol — "audit-first, preserve IA"):** the taste-skill is written for **marketing/landing pages on a React/Next + Tailwind stack**. Deckle is a **SvelteKit application tool** with plain scoped CSS. The audit applies the skill's *portable* rules and explicitly marks the marketing-only rules as N/A (see §5). Findings that would force an IA/routing/content change are **not** recommended.

---

## 2. Design read + current dials (skill §0–1)

> Skill §0.B: *"State your design read in one sentence before generating anything."*

**Design read:** *Reading this as a utility SaaS app-chrome for indie tabletop-game designers, with a calm/earthy craft vibe, leaning toward a restrained system aesthetic (owned components, no framework kit).*

**Current implied dials** (the skill's `DESIGN_VARIANCE / MOTION_INTENSITY / VISUAL_DENSITY`, 1–10, inferred from the existing code):

| Dial | Reading | Evidence |
|---|---|---|
| DESIGN_VARIANCE | **2** | Symmetric, centered, grid-based layouts; no asymmetry. |
| MOTION_INTENSITY | **2** | One `translateY(-2px)` hover-lift + one spinner; no scroll/entrance motion. |
| VISUAL_DENSITY | **4–5** | Comfortable rem spacing, roomy cards, single `--pad-content: 2rem`. |

This `2 / 2 / 5` reading is **appropriate for an app tool** and should be preserved. The skill's baseline (`8 / 6 / 4`) is a *landing-page* default and would be wrong to impose here — do not "add variance/motion" for its own sake. This is noted so a future contributor doesn't over-correct.

---

## 3. Findings

Each finding cites the skill rule, `file:line` evidence, and a concrete fix. Severity: **P0** = ship-blocker / accessibility defect · **P1** = clear quality gap · **P2** = polish.

### P0 — Contrast: sage used as a foreground color fails WCAG AA  ✅ FIXED

> Skill: *"Button Contrast Check — WCAG AA minimum (4.5:1)"* · *"Form Contrast Check — labels, inputs, placeholders, focus rings, helper text, error text all pass WCAG AA."*

Computed contrast ratios (sRGB relative-luminance, WCAG 2.x):

| Foreground / background | Ratio | AA normal (4.5) | AA large (3.0) |
|---|---|---|---|
| white text on sage `#78a083` (TopBar) | **2.94** | ❌ | ❌ |
| sage `#78a083` text on white (headings, links, dropdown) | **2.94** | ❌ | ❌ |
| sage text on `#f8f9fa` (global `body` default color) | **2.78** | ❌ | ❌ |
| sage headline on teal gradient (mid `~#425e68`) | **2.36** | ❌ | ❌ |
| muted-teal `#50727b` text on white | 5.21 | ✅ | ✅ |
| white text on muted-teal (primary button) | 5.21 | ✅ | ✅ |
| text-primary `#2c3e50` on white | 10.98 | ✅ | ✅ |

Sage is the app's most-used "brand" foreground, and it fails at every size. Affected, in-scope locations:

- **TopBar** — white brand/text on the sage bar: `TopBar.svelte:157` (bg) with `:63/:205/:333` white text.
- **Auth/landing headline** — `+page.svelte:210` sage `h1` over the teal gradient (`.container` bg `:197`); worst case at **2.36**.
- **Auth link** — `.link-button` sage `+page.svelte:399`.
- **Global default text** — `app.css:33` `body { color: var(--color-sage) }`. (Most components re-set their own text color, but any unstyled text inherits a failing color.)
- **Dropdown items / user name / dialog heading** — `TopBar.svelte:333/419`, `Dialog.svelte:104/114` all use sage as text.

**Fix (small, high-impact):** treat sage as a **fill/decoration color only** (TopBar background, badge tints, focus-ring glow) and switch every *text/icon* use to `--color-muted-teal` (5.21:1) or `--color-teal-grey` (darker). For the white-on-sage TopBar, either darken the bar to `muted-teal`/`teal-grey` or keep sage but verify the specific white pairing — a `teal-grey` bar with white text passes comfortably. Fix `body` default color to `--color-text-primary`.

### P1 — Token discipline: one accent, used identically (and defined once)  ✅ (b) + (c) FIXED

> **Update:** parts **(b) hard-coded status colors** and **(c) undefined variables** are
> now fixed app-wide. A semantic token layer was added to `app.css`
> (`--color-danger`/`-hover`/`-bg`/`-border`, `--color-success/-warning/-info`) plus
> aliases for every previously-undefined name (`--color-text`, `--color-text-muted`,
> `--color-surface`, `--color-background`, `--color-background-secondary`, `--color-bg`,
> `--color-bg-subtle`, `--color-primary`, `--color-deep-forest`). The audit undercounted:
> there were **three** distinct danger reds (`#e74c3c`/`#d32f2f`/`#dc2626`) plus
> `#c0392b`, spread across **~29 files** (not four), and **10** undefined `--color-*`
> tokens referenced app-wide — including `--color-danger` itself, already used with
> fallbacks in FolderRow/FileRow/image-library but never declared. All are consolidated:
> danger → `--color-danger` (`#d32f2f`, 4.98:1 on white — passes AA as both button-fill
> and error text), and every undefined token now resolves. Part **(a) accent oscillation**
> was already resolved by the P0 fix (primary CTAs now darken-on-hover); the only residue
> is the secondary button (muted-teal) vs primary (green). Success/warning/info were
> tokenized at their **existing** values (no visual change) and still fail AA as small
> chips — darkening them (`#1e7d47` / `#a15c00` / `#2c74ad` all pass) is an optional
> follow-up.

> Skill: *"One accent color per page… use it identically across the whole page. No mid-page shifts (Color Consistency Lock)."*

**(a) The accent oscillates between sage and muted-teal.** The primary Button is `muted-teal` at rest but flips to `sage` on hover (`Button.svelte:93` → `:99`), while the auth submit button is `sage` at rest and flips to `muted-teal` on hover (`+page.svelte:354` → `:366`) — the two primary CTAs animate in *opposite directions* between the same two colors. Pick one accent-at-rest and one hover treatment and apply globally.

**(b) One semantic role, four hard-coded reds.** "Danger/error" is spelled four different ways, none tokenized:

| Value | Location |
|---|---|
| `#e74c3c` / `#c0392b` | `Button.svelte:119/123` (danger variant) |
| `#dc2626` (+ `#fef2f2`/`#fecaca`) | `+page.svelte:341-343` (auth error) |
| `#d32f2f` | `forms/base-input.css:23` and `projects/+page.svelte:237` (general error) |
| `#ff4757` | `Badge.svelte:104` (danger badge) |

Badge also hard-codes success `#2ed573`, warning `#ffb142`, info `#3498db` (`Badge.svelte:92/98/110`) outside the token set.

**Fix:** add semantic tokens to `app.css` — `--color-danger`, `--color-danger-strong`, `--color-danger-bg`, plus `--color-success/-warning/-info` — and reference them everywhere. Consolidate the four reds to one.

**(c) Undefined CSS variables (latent bug).** Several components reference tokens that do not exist in `app.css`, so they silently fall back to `inherit`/transparent:

- `projects/+page.svelte:247-248` — `var(--color-text)` and `var(--color-surface)` (defined names are `--color-text-primary`, `--color-bg-secondary`). The visibility `<select>` gets no explicit color/background.
- `+page.svelte:301` — `var(--color-bg-subtle, #f3f4f6)` relies on the inline fallback because `--color-bg-subtle` is undefined.

**Fix:** either define these tokens or point the references at the existing ones. This is the closest thing to an outright defect among the P1s.

### P1 — Dark mode is absent  ✅ FIXED (chrome-first)

> Skill: *"Design for both modes from the start. Never ship light-only or dark-only without explicit user instruction… Page Theme Lock: one theme for the whole page."*

> **Update (2026-07-13):** dark mode is **implemented** on
> `claude/leonxlsx-taste-skill-test-knsv3r` via the token-remap path this finding
> predicted. A `:root[data-theme='dark']` block (plus a `@media (prefers-color-scheme: dark)`
> fallback for JS-off) re-maps the existing `:root` tokens — no per-component rewrite.
> Activation is a **persisted manual toggle + system default**: an inline no-flash script
> in `app.html` resolves `localStorage['deckle-theme']` (else `prefers-color-scheme`) and
> stamps `data-theme` on `<html>` before first paint; a sun/moon control in the TopBar
> (`lib/stores/theme.svelte.ts`) flips and persists it.
>
> Because the brand color served two roles that must diverge in dark, two role splits were
> added: `--color-accent-fg` / `--color-secondary-fg` (text, lightens in dark) vs
> `--color-accent-solid` (fill behind white, constant); and `--color-danger-fg` (error
> text, lightens) vs `--color-danger` (fill that keeps white readable). The blocklist of
> hard-coded colors that won't respond to a swap was tokenized where it sits on a
> dark-enabled surface (auth card greys, disabled greys, scrollbar/shadow rgba, the
> `rgba(211,47,47,…)` error tint, the `CreateApiKeyDialog` amber box, footer/dropdown teal).
>
> **Scope is chrome-first** per the Page Theme Lock rule: public/auth, TopBar, layout shell,
> shared primitives, the projects dashboard, account settings/MCP, and public profiles are
> dark. The editor, tabletop, data-sources, image-library, admin, and onboarding surfaces
> (~1200 hard-coded literals) are **not yet converted**; each is wrapped in a `.theme-light`
> lock that re-asserts the light tokens so those pages render fully light under the dark
> theme — never half-inverted. Converting those surfaces is the tracked follow-up.
>
> All measured text/UI pairs pass **WCAG AA** in both modes (body text hits AAA); see the
> dark-mode appendix. `npm run check`: 0 errors. Landing page verified in both themes via
> headless Chromium; the light-lock cascade verified by computed-style probe.

The app is light-only: no `prefers-color-scheme` handling, no `data-theme` strategy, backgrounds hard-set to white/`#f8f9fa`. This is the largest lift in the report and is flagged, **not** implemented. Because styling already runs through `:root` CSS variables, the low-risk path is a `@media (prefers-color-scheme: dark)` (or `:root[data-theme="dark"]`) block that re-maps the existing token values — no per-component rewrite — *provided* the P1(c) undefined-variable and P0 hard-coded-color issues are fixed first (hard-coded hexes won't respond to a theme swap).

### P2 — No reduced-motion guards

> Skill: *"Wrap animations… degrade to static under `prefers-reduced-motion`."* (Mandatory for MOTION_INTENSITY > 3; good practice regardless.)

The hover-lift `transform: translateY(-2px)` (`Button.svelte:64/101`, `Card.svelte:69`) and the spinner `@keyframes spin` (`+page.svelte:384`) have no `@media (prefers-reduced-motion: reduce)` fallback. Motion is minimal so this is low-severity, but a single global `@media (prefers-reduced-motion: reduce){ *{ transition:none!important; animation:none!important } }` (with a spinner exception) closes it cheaply.

### P2 — Radius values bypass the token scale

> Skill: *"One corner-radius system applied consistently."*

Tokens are `--radius-sm/md/lg` = 6/8/12px (`app.css:15-17`), but several places hard-code raw values: auth card `16px` (`+page.svelte:224`), Button icon `4px` (`Button.svelte:146`), Dialog close-button `4px` (`Dialog.svelte:117`), scrollbar thumb `4px` (`app.css:60`). Values mostly *coincide* with the scale but aren't routed through it, and `16px`/`4px` are off-scale. **Fix:** route all radii through the tokens; add a `--radius-xs: 4px` if 4px is genuinely wanted.

### P2 — Typography: system-only stack, no scale

> Skill: *"Default sans-serif display: Geist / Outfit / Cabinet Grotesk / Satoshi — not Inter as automatic choice"* + implied type scale.

The UI uses the raw system stack (`app.css:30`) with ad-hoc weights (300/500/600/700) and one-off `rem` sizes; there are no typography scale tokens. For an app tool the system stack is a **defensible, fast choice** (this is not a landing page), so this is optional. If a brand lift is wanted: self-host one display face (Geist/Outfit/Satoshi) for headings/brand only, and add `--font-size-*` / `--font-weight-*` tokens. Note: the app already lazy-loads Google Fonts inside the *card editor* for user designs (`lib/services/googleFonts.ts`) — those are user content, unrelated to app chrome.

### P2 — Em-dashes in UI microcopy

> Skill: *"NO EM-DASH (`—`) anywhere… the #1 AI Tell and a non-negotiable hard ban."*

The **auth/landing page is clean** (uses hyphens: `+page.svelte:73/83`). But em-dashes appear in in-scope UI copy:

- Project visibility options — `projects/+page.svelte:198-200` ("Private — only project members", etc.).
- (Adjacent, just outside core scope) the MCP/account page copy — `account/mcp/+page.svelte` (many), `ApiKeysCard.svelte:45`, `CreateApiKeyDialog.svelte:86`.

**Honest calibration:** the skill's em-dash ban is aimed at *marketing hero copy* where an em-dash reads as machine-generated. In dense app microcopy an em-dash is ordinary and arguably good typography, so this is **cosmetic, not a real quality problem** — listed for completeness because the skill treats it as a hard Pre-Flight failure. If you want strict skill compliance, replace with a colon or comma; otherwise safe to ignore. (Em-dashes inside `//` code comments and `title=` strings elsewhere are not page copy and don't count.)

---

## 4. Prioritized recommendations

Ordered by the skill's **Modernization Levers** (color/contrast first here because that's where the defects are), each tagged with rough effort.

| # | Priority | Change | Effort |
|---|---|---|---|
| 1 | **P0** ✅ | ~~Recolor foreground uses of sage; reserve sage for fills; fix `body` default text color.~~ **Done** — introduced `--color-sage-dark`/`--color-sage-darker`; kept the green identity per user choice. All pairs now ≥ 4.5:1. Darken-on-hover also resolved the primary/submit accent oscillation. | S |
| 2 | **P1** ✅ | ~~Define semantic color tokens; consolidate the reds; fix undefined vars.~~ **Done** — added the danger/status token layer + 10 alias tokens; consolidated 3 reds across ~29 files; every `--color-*` reference now resolves. | S–M |
| 3 | **P1** | Lock one accent-at-rest + one hover treatment across Button and auth CTA. | S |
| 4 | **P1** ✅ | ~~Add dark mode via a token-remap block (do **after** #1–#2).~~ **Done (chrome-first)** — `data-theme` remap + no-flash script + TopBar toggle; accent/danger split into fg vs solid roles; deep surfaces `.theme-light`-locked pending conversion. All pairs pass AA both modes. | M–L |
| 5 | **P2** | Global `prefers-reduced-motion` guard. | XS |
| 6 | **P2** | Route all radii through tokens; add `--radius-xs`. | XS |
| 7 | **P2** | (Optional) display typeface + type-scale tokens. | M |
| 8 | **P2** | (Optional, strict compliance) replace em-dashes in microcopy. | XS |

---

## 5. Marketing-only rules marked N/A

These skill rules target landing/marketing pages and do **not** apply to an application tool; they are recorded so they aren't mistaken for un-checked violations:

- Design-System selection table (Fluent/Material/Carbon/shadcn/…) and the React/Next/Tailwind **stack defaults** — Deckle is SvelteKit + scoped CSS by design.
- Hero stack / eyebrow-restraint / "Trusted by" logo-wall placement — beyond the single auth page, there are no marketing sections.
- Section-Layout-Repetition ban, Zigzag-Alternation cap, Bento cell-count, "≥4 layout families across 8 sections" — no marketing section stack exists.
- Picsum/stock imagery, logo walls, `next/font`, Motion/GSAP scroll-pinning, marquees — not applicable to app chrome.

---

## 6. Pre-Flight checklist result (skill's own list)

| Box | Result | Note |
|---|---|---|
| Design read declared | ✅ | §2 |
| Dials explicit & reasoned | ✅ | `2/2/5`, §2 |
| Design system chosen or aesthetic labeled honestly | ✅ | SvelteKit + owned CSS, labeled |
| **Zero em-dashes** in page copy | ⚠️ | Auth page clean; dashboard/MCP microcopy uses them (§3, cosmetic) |
| One page theme (no mid-scroll inversions) | ✅ | Enforced in both modes; un-converted surfaces `.theme-light`-locked |
| One accent used identically | ⚠️ | Primary/submit oscillation fixed; secondary still muted-teal at rest vs primary green (§3 P1a) |
| One corner-radius system | ⚠️ | Tokens exist but bypassed by 16px/4px (§3 P2) |
| Button contrast WCAG AA (4.5:1) | ✅ | Fixed — sage-dark solids/text now 5.1–5.4:1 |
| Form inputs/labels/focus rings pass AA | ✅ | Fixed — labels/focus rings now sage-dark; inputs already passed |
| No wrapped CTA labels | ✅ | — |
| Serif discipline (not Fraunces/Instrument_Serif) | ✅ | No serif used |
| Premium-consumer palette check (not beige+brass+oxblood) | ✅ | Teal/sage, not the banned palette |
| Hero fits viewport (≤2-line headline, CTA visible) | ✅ | Auth page compliant |
| Hero top padding ≤ pt-24 | ✅ | Centered, no excess |
| Hero stack ≤ 4 elements | ✅ | Title + subtitle + card |
| Navigation one line ≤ 80px | ✅ | TopBar 60px (`TopBar.svelte:156`) |
| Duplicate CTA intent | ✅ | None |
| Real images (no div fake screenshots) | ✅ | N/A — app chrome |
| Interactive states (loading/empty/error) | ✅ | Spinner, `EmptyState`, inline errors all present |
| Tactile `:active` feedback | ✅ | `Button.svelte:68` |
| Reduced motion wrapped | ❌ | No guard (§3 P2) |
| Dark mode defined & tested both modes | ✅ | Chrome-first dark mode; both modes pass AA (§3 P1, appendix) |
| Mobile collapse explicit | ✅ | Media queries in TopBar/auth |
| AI Tells (Inter default, AI-purple, 3-equal cards, "Jane Doe", "Acme") | ✅ | None found |

**Overall:** the app **passes the anti-slop spirit of the skill**. The **P0 button/form contrast defect** and the **P1 dark-mode gap** are now fixed (recommendations #1 and #4). Remaining open Pre-Flight gaps: reduced-motion (P2), full accent consistency (secondary button, P1), radius tokenization (P2), and dark-theming the deep editor/admin/tabletop surfaces (currently `.theme-light`-locked).

---

## Appendix — P0 fix verification (2026-07-12)

Final contrast pairs, computed (sRGB, WCAG 2.x):

| Pair | Ratio | AA (4.5) |
|---|---|---|
| white text on sage-dark `#537258` (TopBar, CTAs, active tab) | 5.36 | ✅ |
| sage-dark text on white (titles, labels, links) | 5.36 | ✅ |
| sage-dark text on `#f8f9fa` | 5.09 | ✅ |
| sage-dark on 10% sage tint (default badge) | 4.92 | ✅ |
| white text on sage-darker `#456049` (button hover) | 6.95 | ✅ |
| white H1 on teal gradient (hero, page header) | 6.92 | ✅ |
| 85% white subtitle on teal gradient | 5.56 | ✅ |
| breadcrumb owner (opacity 1) on sage-dark bar | 4.71 | ✅ |
| sage-dark focus-ring border on white (≥ 3:1 needed) | 5.36 | ✅ |

`npm run check`: 0 errors (pre-existing warnings only). Landing page verified visually
via headless Chromium screenshot.

---

## Appendix — Dark-mode contrast verification (2026-07-13)

Dark tokens: bg `#1a1c22`, surface `#24272f`, text `#e6e8ec`, muted `#a3aab4`,
accent-fg `#8fbf9b`, secondary-fg `#7ea9b3`, accent-solid `#537258`, danger-fg `#ff8a80`,
danger-fill `#c62828`. Computed sRGB / WCAG 2.x (tints composited over the stated bg):

| Pair | Ratio | AA (4.5) |
|---|---|---|
| body text on app bg | 13.88 | ✅ (AAA) |
| body text on surface | 12.17 | ✅ (AAA) |
| muted text on app bg / surface | 7.27 / 6.38 | ✅ |
| accent-fg (sage) text on app bg / surface | 8.19 / 7.18 | ✅ |
| secondary-fg (teal) text on app bg / surface | 6.66 / 5.84 | ✅ |
| white on accent-solid (TopBar, CTAs, active tab) | 5.36 | ✅ |
| white on danger fill `#c62828` (danger button) | 5.62 | ✅ |
| danger-fg text on surface | 6.54 | ✅ |
| danger-fg text on danger-bg tint | 5.50 | ✅ |
| warning-fg on warning-bg tint | 6.66 | ✅ |
| success / warning / info chip on surface | 8.57 / 9.04 / 5.87 | ✅ |
| accent-fg focus ring on app bg (≥ 3 needed) | 8.19 | ✅ |

Verified: landing page screenshotted in both themes (no flash on reload; `data-theme`
resolves before first paint); light-lock cascade confirmed by computed-style probe
(a `.theme-light` subtree resolves `--color-surface: #ffffff` while the page body is dark).
