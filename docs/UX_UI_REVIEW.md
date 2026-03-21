# Bingabu UX/UI review — second pass

**Date:** 2025-03-21 (fresh audit; supersedes the first-pass document)  
**Method:** Source review of [`bingo.html`](../bingo.html), [`join.html`](../join.html), [`player.html`](../player.html), [`spectator.html`](../spectator.html), [`cards.html`](../cards.html), [`index.html`](../index.html), [`privacy.html`](../privacy.html) / [`terms.html`](../terms.html), plus [`i18n.js`](../i18n.js) behavior. Automated checks remain in Vitest ([`mobile-friendly.test.js`](../mobile-friendly.test.js), [`hostCallerA11y.test.js`](../hostCallerA11y.test.js), etc.); **device and screen-reader smoke tests** are still recommended to validate keyboard paths and RTL overflow.

**Finding template:** persona · surface · severity · observation · impact · suggested direction.

---

## Prior remediation (first cycle)

The following were addressed on branch `fix/ux-review-followups` (host `#current-number` live region, localized player reconnect string, play-guide dialog semantics + focus return, opt-in play wizard, setup/play guide wrapper ids, Fredoka on legal headings, [`docs/RESTRUCTURE_NEW_GAME.md`](RESTRUCTURE_NEW_GAME.md) clarification). This pass assumes that work is merged or pending merge and **does not re-list those items**.

---

## Executive summary

1. **Dynamic player UI still mixes English into localized surfaces:** BINGO line descriptions (`Row 1`, `Col B`, `Diagonal`), the default slot title `Player N`, the grid `aria-label`, the center **FREE** label, and column headers **B–I–N–G–O** in the built card HTML are not driven by `locales/*.json`, so Hebrew players can get a bilingual, inconsistent announcement when a line completes.
2. **Manual daub is effectively pointer-only:** Card cells are clickable `div`s with no `tabindex`, roving tabindex, or key handlers—keyboard and many assistive-tech users cannot mark numbers in manual mode ([`player.html`](../player.html) render path).
3. **Several overlays are “almost” dialogs:** The QR scanner wrapper uses `aria-modal="true"` without `role="dialog"` ([`join.html`](../join.html)). The home onboarding overlay on [`index.html`](../index.html) remains `role="region"` with auto-open and no Tab trap or focus restoration pattern (weaker than the updated host play guide).
4. **Landmarks are uneven:** [`index.html`](../index.html) and legal pages use `<main>`; **bingo, join, player, spectator, and cards** do not—screen reader users get fewer “skip to content” hooks on the busiest flows.
5. **Silent degradation on spectator:** SSE reconnect loops ([`spectator.html`](../spectator.html)) mirror [`player.html`](../player.html) but **do not surface** a reconnecting or connection-lost message, so the UI can look frozen while the stream retries.
6. **Small copy / trust gaps:** [`spectator.html`](../spectator.html) hardcodes `aria-label="Called numbers"` on the history container. [`player.html`](../player.html) host-handoff error is a single paragraph with **no** link back to join or host—users can feel stuck.

---

## Personas — quick pulse (pass 2)

| Persona | Focus this pass | Outcome |
|--------|------------------|---------|
| Remote player (HE) | Bingo announcement + card chrome strings | **Gap** — English fragments in bingo lines and grid labeling. |
| Remote player (manual daub) | Keyboard / AT | **Gap** — no keyboard path to toggle cells. |
| Spectator | Feedback during outages | **Gap** — no visible reconnect state. |
| Host | Cognitive load | **Note** — `bingo.html` remains dense (board + MC + remote + settings + cards); acceptable for power hosts, tough for first-timers without optional play guide. |
| Casual visitor | Home onboarding | **Note** — auto wizard still fires once; `role="region"` + no trap (same class of issue as old play overlay). |

---

## Findings backlog (new / not remediated in first cycle)

| ID | Severity | Persona | Where | Observation | Impact | Suggested direction |
|----|----------|---------|--------|-------------|--------|---------------------|
| I1 | **Major** | Player (i18n) | `player.html` (`getBingoLines` / `getBingoLinesManual`) | Line strings are English literals (`Row`, `Col`, `Diagonal`). | Screen readers and sighted Hebrew users see mixed language in the BINGO announcement. | Add locale keys (e.g. `player.bingo.row`, `player.bingo.col`, `player.bingo.diag1`, …) and interpolate; add Vitest that keys exist in `en`/`he`. |
| I2 | **Major** | Player (i18n + a11y) | `player.html` card `innerHTML` | `aria-label="Your bingo card"`, cell text `FREE`, headers `B–I–N–G–O`, fallback `` `Player ${slotIndex + 1}` `` are not translated. | Misaligned with rest of UI; `Player N` may appear in titles. | Use `t()` for label, free space, header letters (or document B–I–N–G–O as invariant symbols), and slot fallback (reuse `join.slot.playerN` or new key). |
| K1 | **Major** | Player (a11y) | `player.html` | No `tabindex` / keyboard handling on `.card-cell` for daub. | Manual mode is unusable without pointer; fails “keyboard equivalent” expectations. | Roving tabindex on grid, Enter/Space to toggle, `aria-pressed` or state on cells; tests for markup contract. |
| S1 | **Minor** | Spectator (a11y + i18n) | `spectator.html` | `#history-wrap` has hardcoded English `aria-label="Called numbers"`. | Hebrew locale still exposes English in the accessibility tree. | `data-i18n` + key, or set `aria-label` in `initI18n` after `t()`. |
| S2 | **Minor** | Spectator (status) | `spectator.html` SSE | `EventSource` `onerror` only schedules reconnect; no `#err` or status line update. | During flaky networks the screen may not update with no explanation. | Mirror player polling UX: optional `spectator.status.reconnecting` + show in `#err` or a dedicated status element (i18n). |
| M1 | **Minor** | Join (a11y) | `join.html` `#qr-scanner-wrap` | `aria-modal="true"` without `role="dialog"` (and no labelledby). | AT may not treat the scanner as a modal. | Add `role="dialog"`, `aria-labelledby` or `aria-label` via i18n, focus trap + return focus to “Scan QR” on close. |
| M2 | **Minor** | Visitor | `index.html` home wizard | Overlay is `role="region"`, auto-opens, no Tab cycle or stored focus restore on close. | Keyboard users can tab “behind” the dimmer; focus may be lost on dismiss. | Align with play guide pattern: `role="dialog"`, `aria-modal="false"` (or true + trap if only modal content is interactive), focus return. |
| L1 | **Minor** | All | `bingo.html`, `join.html`, `player.html`, `spectator.html`, `cards.html` | No `<main>` (or `role="main"`) wrapping primary content. | Weaker document outline for SR and skip links. | Wrap primary column in `<main>`; ensure one per page; optional skip link to `#main-content`. |
| E1 | **Minor** | Player | `player.html` host-handoff error | `innerHTML` is only `t("player.error.hostSession")` with no actions. | User must guess to go back to host tab or join. | Add links: “Open join” / “Back to host” or repeat short instruction with anchor to `join.html`. |
| C1 | **Polish** | Join | `join.html` | Continue/claim buttons disable during fetch but there is no loading text. | Unclear whether tap registered on slow networks. | Optional `aria-busy` + visually hidden “Loading…” or spinner pattern. |
| C2 | **Polish** | Host | `bingo.html` | Large vertical stack: history, controls, board, leaderboard, cards, settings. | On small phones, deep scroll between DRAW and a specific participant card during a dispute. | Consider sticky DRAW bar or collapsible sections (product decision). |
| C3 | **Polish** | Player | History row | History balls are plain `div`s with no list semantics. | SR may not convey “list of recent calls” structure. | Optional `role="list"` / `role="listitem"` or visually hidden summary. |

---

## Heuristic notes (second pass)

| Topic | Note |
|--------|------|
| **Consistency** | `setLocalePreference` correctly preserves URL query params when switching language (`i18n.js`) — good for `?join=CODE` flows. |
| **Error prevention** | Join flow uses `role="status"` errors consistently; spectator reuses `join.error.network` on fetch failure — consistent but generic. |
| **Recognition vs recall** | Short links and QR reduce recall; “rejoin same device” still depends on README knowledge — consider one inline hint on `player.leave` or join success. |
| **Fair play** | No new issues found; authority remains host calls + server daub rules. |

---

## Suggested priority order

1. **I1 + I2** — highest user-visible i18n quality for the core game moment (BINGO).  
2. **K1** — unlocks manual mode for keyboard/AT users.  
3. **S2, E1, S1** — clearer failure and handoff states.  
4. **M1, M2, L1** — structural a11y polish.  
5. **C1–C3** — UX refinement when core gaps are closed.

---

## Verification

- `npm test` — run before release (repo standard).  
- Manual: `?lang=he` on player + spectator; manual daub on desktop with Tab (expect current failure until K1).  
- Manual: airplane mode mid-game on spectator to observe silent retry (S2).
