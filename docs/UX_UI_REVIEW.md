# Bingabu UX/UI review

**Date:** 2025-03-21  
**Method:** Code-assisted review (HTML/CSS/inline JS), locale checks, and existing Vitest coverage ([`mobile-friendly.test.js`](../mobile-friendly.test.js), [`join-spectator.test.js`](../join-spectator.test.js), [`legal-pages-i18n.test.js`](../legal-pages-i18n.test.js), etc.). **Manual device passes** (real phone/tablet) are still recommended to validate motion, keyboard on mobile, and RTL truncation in situ—this document flags where that matters most.

**Finding template (for future issues):** persona · page/step · severity · observation · user impact · suggested direction.

---

## Executive summary

1. **Host and join flows are structurally strong:** setup vs play phases on [`bingo.html`](../bingo.html), step strip and first-visit banner scoped to setup, and join/spectator error lines use `role="status"` and `aria-live="polite"`—aligned with the intent of [`docs/RESTRUCTURE_NEW_GAME.md`](RESTRUCTURE_NEW_GAME.md).
2. **Player-facing calling UX is mostly accessible:** [`player.html`](../player.html) exposes the current ball with `aria-live="polite"`; BINGO uses `aria-live="assertive"`—good patterns for remote play.
3. **Gaps to fix first:** the host’s **current number** (`#current-number` on `bingo.html`) has **no live region**, unlike the player view; **“Reconnecting…”** on [`player.html`](../player.html) is **hardcoded English** and bypasses i18n.
4. **Polish / consistency:** typography differs between landing ([`index.html`](../index.html)) and legal pages ([`privacy.html`](../privacy.html), [`terms.html`](../terms.html)); the **play wizard** overlay uses `role="region"` rather than `role="dialog"`/`aria-modal`, which may allow focus to drift behind the overlay for keyboard users.
5. **Automated guardrails are valuable:** viewport, safe-area, breakpoints, touch targets, and print legibility are already enforced in tests—extend that pattern for any fix (e.g. `aria-live` on host current number, new locale keys).

---

## Personas and user stories (review outcomes)

| Persona | User story | Outcome |
|--------|------------|---------|
| **Host / caller** | As a host, I want a clear path from players → cards → optional room → calling so I am not overwhelmed. | **Pass** — `getHostPhase` / `applyPhase` separate setup and play; step nav and first-visit banner hidden outside setup (`bingo.html` ~3113–3127). |
| **Host / caller** | As a host, I want to call numbers quickly without hunting controls. | **Pass with note** — DRAW/previous controls have titles/shortcuts; consider validating under stress on a small phone (manual). |
| **Remote player** | As a player, I want the latest call to be obvious and announced accessibly. | **Pass** — `#current-number` has `aria-live="polite"` (`player.html`). |
| **Remote player** | As a player, I want to understand connection problems in my language. | **Fail (minor)** — polling fallback sets literal `"Reconnecting…"` (`player.html` ~626); not in `locales/*.json`. |
| **Spectator** | As a spectator, I want current call and history without claiming a slot. | **Pass** — [`spectator.html`](../spectator.html) mirrors player hierarchy; `#current-number` has `aria-live="polite"`; room-gone flows set `err` with `role="status"`. |
| **Casual visitor** | As a visitor, I want to choose host vs join confidently. | **Pass** — [`index.html`](../index.html) CTAs are clear; touch targets meet 44px in tests. |
| **In-person helper** | As someone printing cards, I want readable grids. | **Pass** — [`cards.html`](../cards.html) print styles and on-screen `clamp` font sizes covered by [`mobile-friendly.test.js`](../mobile-friendly.test.js). |

---

## Findings backlog (prioritized)

| ID | Severity | Persona | Where | Observation | Impact | Suggested direction | Test hook (when fixing) |
|----|----------|---------|--------|-------------|--------|---------------------|-------------------------|
| H1 | **Major** | Host (a11y) | `bingo.html` play controls | `#current-number` is a plain `div` with no `aria-live` / `aria-atomic`. | Screen reader users may not hear newly drawn balls while focusing elsewhere. | Add `aria-live="polite"` and optionally `aria-atomic="true"` on the host current number (match `player.html`). | New assertion in a small HTML test file (pattern: [`mobile-friendly.test.js`](../mobile-friendly.test.js)) or extend [`hostBoard.test.js`](../hostBoard.test.js) if it reads `bingo.html`. |
| P1 | **Major** | Player (i18n) | `player.html` ~626 | Status text `"Reconnecting…"` is not translated. | Hebrew (or other) players see English during outages. | Add `player.status.reconnecting` (or similar) to `locales/en.json` + `he.json` and use `t()`. | [`i18n.test.js`](../i18n.test.js) patterns; grep ensures key exists. |
| A1 | **Minor** | Host (keyboard) | `bingo.html` play wizard | `#play-wizard-overlay` is `role="region"`, not a modal dialog. | Focus may move to page behind the overlay while the tour is open. | Consider `role="dialog"` `aria-modal="true"` and focus trap, or document as intentional lightweight tip. | Optional Playwright/a11y audit later; not covered by current Vitest. |
| V1 | **Minor** | All (brand) | `index.html` vs `privacy.html` / `terms.html` | Legal pages use Quicksand-only styling; landing uses Fredoka hero + richer chrome. | Slight “different product” feel when moving from app to legal. | Optional: shared heading font or link styling tokens—low priority. | Visual/manual; optional [`legal-pages-i18n.test.js`](../legal-pages-i18n.test.js) only if markup keys change. |
| M1 | **Polish** | Maintainer | `bingo.html` | Two elements share class `host-wizard-show-again-wrap`; `querySelector` only binds `applyPhase` to the **first** (setup). | Easy to break if someone expects one variable to control both. | Use distinct classes or `querySelectorAll` with explicit IDs for setup vs play “Show guide”. | None today; add test if behavior is refactored. |
| D1 | **Polish** | Reader | [`docs/RESTRUCTURE_NEW_GAME.md`](RESTRUCTURE_NEW_GAME.md) | Section “Is this optimal?” still lists old pain points while a later subsection says simplifications are “implemented”. | Contributors may follow stale guidance. | Edit doc to mark historical vs current state (single source of truth). | N/A |
| C1 | **Polish** | Host | First-run play wizard | Auto-opens on first entry to play if `bingabu-play-wizard-done` unset (`applyPhase` ~3128–3134). | Some hosts may find spotlight tour redundant; **Skip** exists. | Optional: defer wizard until “Show guide” or second visit—product call. | N/A |

---

## Journey notes (code review)

### A. Host (`bingo.html`)

- **Setup → play:** `host-start-game-btn` runs `initGame`, sets onboarding done, `setHostPhase("play")`, `applyPhase()` (~3145–3152).
- **New game:** Confirms if `drawnSequence.length > 0`, clears storage, `setHostPhase("setup")`, `initGame()`, `applyPhase()` (~3155–3165).
- **RESTRUCTURE checklist:** Step strip and first-visit banner are tied to `phase === "setup"`; play wizard steps explain **calling UI** (current number, history, draw, board, cards)—not duplicate setup copy (`PLAY_WIZARD_STEPS` ~3739–3744). This matches the “implemented” direction in the doc better than the older “repeats setup” concern.
- **Remote play:** Room code, QR, password fields, joined list, lock joins—live regions on code and list are present.

### B. Player (`join.html` → `player.html`)

- **Join:** Step model with dedicated error nodes (`code-error`, `password-error`, `pick-error`) and `aria-live="polite"`.
- **Watch only:** `btn-watch-only` precedes slot pick UI—clear secondary path.
- **Player card:** Grid uses tested 44px min height on `.card-cell`; status line separate from current number.

### C. Spectator (`spectator.html`)

- Errors and missing room handled with `role="status"` or fallback link to `join.html`; SSE reconnect uses shared `nextReconnectDelayMs` ([`streamReconnect.test.js`](../streamReconnect.test.js)).

### D. Cards (`cards.html`)

- Screen + `@media print` expectations documented via tests; actions row uses `align-items: center` per mobile-friendly test.

### E. Trust pages

- **i18n:** All `data-i18n` keys on privacy/terms are validated in [`legal-pages-i18n.test.js`](../legal-pages-i18n.test.js).
- **UX:** Readable single-column layout and safe-area padding; language/`dir` boot script matches other pages.

---

## Heuristics snapshot

| Heuristic | Notes |
|-----------|--------|
| Visibility of system status | Strong on join (errors), player (status), spectator (`#err`). Host MC announcement uses `aria-live="polite"`. Gap: host current number (H1). |
| Error recovery | Join and spectator surface network/404/password errors; player booted flow exists. |
| Consistency | Shared palette/CSS variables across game pages; legal pages lighter. |
| Time-critical / bingo-specific | DRAW/previous shortcuts documented in `title` attributes; manual timing test still useful on phones. |

---

## Recommended next steps

1. **Ship H1 + P1** — highest value for inclusive play across host and player roles.
2. **Manual pass:** `?lang=he` on `bingo.html`, `join.html`, `player.html` for RTL overflow on remote-play panels and long player names.
3. **Optional:** A1 focus trap if you standardize on modal patterns elsewhere.
4. **Docs:** Resolve D1 so future UX work does not re-debate completed restructure items.

---

## Verification

- `npm test` — **178 passed** (2025-03-21).
