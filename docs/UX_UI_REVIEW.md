# Bingabu UX/UI review (rolling log)

This document accumulates **audit passes** over time. The **latest pass** is always the primary read; older sections are kept for context and remediation history.

**Finding template:** persona · surface · severity · observation · impact · suggested direction.

---

## Third pass — 2025-03-21

**Method:** Source review after second-pass fixes merged on `fix/ux-review-followups` (`player.html`, `spectator.html`, `join.html`, `index.html`, landmarks, etc.). Vitest still guards layout/i18n contracts ([`playerUxSecondPass.test.js`](../playerUxSecondPass.test.js), [`mobile-friendly.test.js`](../mobile-friendly.test.js)). **Device + SR smoke tests** remain recommended.

**Git:** Working tree was clean at review time; this section is committed as documentation only.

### Executive summary (pass 3)

1. **Player live stream vs polling:** When `EventSource` is available, **`player.html` does not surface reconnect state on SSE `onerror`**—only the polling `fetchRoom` path shows `player.status.reconnecting` after repeated failures. Many sessions use SSE, so flaky networks can look “stuck” without copy (spectator already shows stream status).
2. **Print cards page lags player card i18n:** [`cards.html`](../cards.html) still renders **FREE** and **B–I–N–G–O** headers as **hardcoded English** in JS, while the live player card uses locale keys—Hebrew printouts stay partially English.
3. **Small a11y parity gaps:** Player **`#current-number`** lacks **`aria-atomic="true"`** (host caller has it); **booted** state hides `#game-wrap` without moving **focus** to the visible recovery block—keyboard/AT users may interact with a hidden subtree until they tab.
4. **Join QR modal ergonomics:** The scanner dialog has focus return and a Tab cycle, but **Escape does not close** it (unlike host/home wizards)—power users expect Esc to dismiss.
5. **Discoverability:** There is still **no “skip to main content”** link to `#main-content` on high-traffic pages—low effort win for keyboard and SR users on long host/join/player views.
6. **Ranking defaults:** [`ranking.js`](../ranking.js) ships **English** `defaultRankingPhrases` / ordinals; **`bingo.html` correctly overrides** with `rankingPhrasesFromT()` and Hebrew ordinals—no user-facing bug today, but **new callers** of `getRankingPhrase` must pass locale options or they will speak English.

### Personas — pulse (pass 3)

| Persona | Lens | Outcome |
|--------|------|---------|
| Remote player | SSE reliability messaging | **Gap** — silent reconnect loop when using EventSource (T1). |
| In-person helper / print | Hebrew print cards | **Gap** — FREE / column letters not localized on `cards.html` (T2). |
| Remote player (a11y) | Announcements + focus | **Gap** — `aria-atomic` on current ball; focus on boot (T3, T4). |
| Joiner | QR flow | **Polish** — Esc to close scanner (T5). |
| Power keyboard user | Landmarks | **Polish** — skip link (T6). |

### Findings backlog (pass 3 — open)

| ID | Severity | Persona | Where | Observation | Impact | Suggested direction |
|----|----------|---------|--------|-------------|--------|---------------------|
| T1 | **Minor** | Player | `player.html` `connectStream` | `EventSource.onerror` only reschedules reconnect; no `#status` (or dedicated line) update. | Same class of problem as pre-fix spectator: UI looks frozen during backoff. | Mirror spectator: show `t("player.status.reconnecting")` on error (and clear on `onopen` / successful `fetchRoom`), without duplicating polling `failCount` logic awkwardly. |
| T2 | **Minor** | Print helper | `cards.html` `renderCards` | `FREE` and `["B","I",…]` literals in DOM build. | Hebrew UI elsewhere; print view mixes languages. | Reuse `player.card.free` / `player.card.colB`… keys or add `cards.colB`… aliases; Vitest key check. |
| T3 | **Minor** | Player (SR) | `player.html` markup | `#current-number` has `aria-live="polite"` but no `aria-atomic="true"`. | Some SRs may announce partial updates less predictably than on host. | Add `aria-atomic="true"` to match host (`bingo.html`). |
| T4 | **Minor** | Player (SR/focus) | `player.html` `showBooted` | Hides `#game-wrap`, shows `#booted-wrap`; no `focus()` on heading or rejoin link. | Focus can remain on removed/hidden controls. | After toggle, `querySelector("#booted-wrap a, #booted-wrap h2")` `.focus()` or use `tabindex="-1"` on wrapper + focus. |
| T5 | **Polish** | Joiner | `join.html` | No document/key listener for Escape while `#qr-scanner-wrap` is open. | Inconsistent with other modals; slower dismiss. | `document.addEventListener("keydown", …)` if QR visible → `closeQrScanner()`. |
| T6 | **Polish** | Keyboard / SR | `bingo.html`, `join.html`, `player.html`, … | Single `<main id="main-content">` exists; no skip link. | Extra tab stops for repeat visitors. | First link in body: “Skip to main” `href="#main-content"` + `:focus-visible` style (match existing focus rings). |
| T7 | **Polish** | Maintainer | `ranking.js` | English defaults in module exports. | Safe while only `bingo.html` calls with `rankingPhrasesFromT`; risky if reused. | JSDoc “must pass phrases for i18n”; or export no English defaults in browser bundle. |

### Suggested priority (pass 3)

1. **T1** — aligns player SSE with spectator behavior.  
2. **T2** — completes i18n story for print.  
3. **T3 + T4** — quick a11y wins.  
4. **T5 + T6** — UX consistency.  
5. **T7** — documentation / guardrail only.

### Verification (pass 3)

- `npm test` before release.  
- Manual: throttle network on **player** with SSE enabled and confirm whether any reconnect copy appears (expect gap until T1).  
- Manual: `?lang=he` → open **Print cards** and inspect headers + FREE.  
- Manual: trigger **booted** state and tab from prior focus — note focus trap (T4).

---

## Second pass — 2025-03-21 (archive)

**Original scope:** Dynamic player i18n, keyboard daub, spectator/join/index modal semantics, `<main>` landmarks, join `aria-busy`, etc.

**Executive summary (historical — many items below are now fixed):** The second-pass doc called out English fragments on the player card, pointer-only manual daub, weak QR/home wizard semantics, missing `<main>`, silent spectator SSE, and hardcoded spectator history `aria-label`. Subsequent commits addressed **I1, I2, K1, S1, S2, M1, M2, L1, E1, C1, C3** (see `player.html`, `spectator.html`, `join.html`, `index.html`, `bingo.html`, `cards.html`, `locales/*.json`, `playerUxSecondPass.test.js`).

**Still open from second-pass table:** **C2** — host page vertical density / sticky DRAW (product decision), not implemented.

---

## First cycle — archive

Host `#current-number` live region, localized player reconnect **polling** string, play-guide dialog semantics + focus return, opt-in play wizard, setup/play guide wrapper ids, Fredoka on legal headings, [`RESTRUCTURE_NEW_GAME.md`](RESTRUCTURE_NEW_GAME.md) clarification — see branch history / earlier commits on `fix/ux-review-followups`.

---

## Cross-pass heuristics (still true)

| Topic | Note |
|--------|------|
| **Locale URLs** | `setLocalePreference` preserves query params (`i18n.js`) — good for `?join=CODE`. |
| **Errors** | Join/spectator use `role="status"` patterns consistently. |
| **Fair play** | Host calls remain authoritative; server enforces daubs. |
