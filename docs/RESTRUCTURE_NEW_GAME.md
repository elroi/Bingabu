# Restructure: New game experience

## Problem

The host page (bingo.html) mixes **setup** and **play** on one long page with many entry points:

- **Setup:** Participants section, "New game" button, "Create room" button, wizard overlay, step strip, first-visit banner
- **Play:** Board, DRAW, history, leaderboard, participant cards

Hosts see the board and DRAW immediately, plus several setup sections and overlays. It’s unclear what to do first and what “New game” vs “Create room” mean. The wizard helps but sits on top of the same busy layout.

---

## Goal

One clear path: **Setup** (linear, one thing at a time) → **Play** (board + calling). No mixing of setup and play on the same view.

---

## Proposed structure: two phases

### Phase 1 — Setup (default when no game in progress)

**What the host sees:** A single, focused setup flow. No board, no DRAW, no history.

1. **Players**  
   - Heading: “Set up your game” or “Who’s playing?”  
   - Number of participants (1–12) + player names.  
   - *(No separate “Generate cards” step; cards are generated when the host clicks “Start the game”.)*

2. **Optional: Play with friends**  
   - Only after cards are generated: “Playing with friends online?”  
   - If yes: **“Create room”** → show room code + copy link/code.  
   - If no (or skip): no room; they can still use the board in person.

3. **Start calling**  
   - One primary button: **“Start calling”** or **“Go to board”**.  
   - Action: switch to **Play** phase (show board, DRAW, history). No new game logic; we already have cards.

**State:**  
- `phase = 'setup'` when: no cards yet, or cards exist but host hasn’t clicked “Start calling”.  
- Stored in `sessionStorage` (e.g. `bingabu-host-phase: 'setup' | 'play'`) so refresh keeps the right view. When they have cards and have drawn at least once, we can treat as `'play'` and show the board.

### Phase 2 — Play

**What the host sees:** Board, current number, DRAW / Previous, history, leaderboard, participant cards (and Settings & options). Optional: small “New game” or “Setup” that returns to Phase 1.

**State:**  
- `phase = 'play'` when: cards generated and host clicked “Start calling”, or they’ve already drawn at least one number (e.g. return visit with saved state).

**“New game”:** Resets to setup: clear or reset game state, set `phase = 'setup'`, show setup view again.

---

## UX flow (high level)

```
[Land on bingo.html]
    → If no saved game or phase=setup → Show SETUP view only
          → Set players
          → (Optional) Create room → Share link
          → "Start calling" → Show PLAY view
    → If saved game and phase=play (or already drawing) → Show PLAY view

[On PLAY view]
    → "New game" → Back to SETUP view (confirm if mid-game)
```

---

## What to build

### 1. Phase state

- Introduce `hostPhase: 'setup' | 'play'`.
- Derive or persist: e.g. `sessionStorage['bingabu-host-phase'] = 'setup' | 'play'`.
- **To play:** Set to `'play'` when they click “Start calling”, or when `drawnSequence.length > 0` (already in a game).
- **To setup:** Set to `'setup'` when they click “New game” (and confirm if mid-game), or on first load with no/invalid state.

### 2. Setup view (phase === 'setup')

- **Container:** e.g. `#host-setup-view` that wraps the whole setup flow. Shown when `hostPhase === 'setup'`.
- **Content:**
  - Block 1: “Who’s playing?” — number input + player names (reuse existing `#num-participants`, `#participant-names`, etc.).
  - Button: **“Generate cards”** (same as current “New game” / `initGame()`).
  - Block 2 (only after cards exist): “Playing with friends online?” — **“Create room”** (optional). When room created, show code + copy link/code (reuse existing remote-play UI).
  - Button: **“Start calling”** — sets `hostPhase = 'play'`, shows play view.
- **Hide in setup:** Board, DRAW band, history strip, leaderboard, participant cards grid (or show only after “Start calling”). Optionally hide or simplify the step strip and wizard overlay.

### 3. Play view (phase === 'play')

- **Container:** e.g. `#host-play-view` — board, controls band (current number, DRAW, Previous), history, leaderboard, participant cards, Settings & options.
- **Show:** When `hostPhase === 'play'`.
- **“New game”:** In the controls or header. On click: confirm if mid-game, then clear state (or reset), set `hostPhase = 'setup'`, show setup view.

### 4. Single entry from home

- Keep **“Host a game”** → `bingo.html`. First load with no state → setup view. After “Start calling” or with saved game in progress → play view.

### 5. Simplify or remove

- **Wizard overlay:** Optional. Either remove and rely on the setup view as the only path, or keep as optional “Show guide again” that explains the setup steps.
- **Step strip:** Optional in setup (e.g. “Step 1 of 3” inside setup view) or remove.
- **First-visit banner:** Can remove if setup view is self-explanatory.
- **“New game” inside Participants:** Remove; the only “Generate cards” is in setup. In play view, “New game” means “back to setup”.

---

## Implementation checklist

- [x] Add `hostPhase` and persist in `sessionStorage`; set `'play'` on “Start the game” and when `drawnSequence.length > 0` on load; set `'setup'` on “New game” and when no game/phase.
- [x] Add `#host-setup-view`: players block, “Generate cards”, optional “Create room” + share, “Start the game” button. Hide when `phase === 'play'`.
- [x] Add `#host-play-view`: wrap existing board, controls, history, leaderboard, participant cards. Show when `phase === 'play'`.
- [x] Move “Create room” / share UI into setup view.
- [x] “New game” in play view: confirm if mid-game, then set phase to setup and show setup view.
- [x] On load: if `loadState()` restores a game with `drawnSequence.length > 0`, set `hostPhase = 'play'`. Else use stored phase or `'setup'`, then applyPhase().
- [x] Step strip and “Show guide again” shown only in play view; first-visit banner only in play view; wizard opens only when phase is play and onboarding not done.
- [x] Tests: setup view present, play view present, host phase key, “Start the game” and “New game” buttons.

---

## Summary

| Current | After restructure |
|--------|--------------------|
| One long page: setup + play mixed | Two clear views: **Setup** then **Play** |
| Many CTAs (New game, Create room, wizard, steps) | One path: Players → Generate cards → (optional) Create room → Start calling |
| Board visible before setup | Board only after “Start calling” |
| “New game” next to DRAW | “New game” = back to Setup (one place) |

This makes the new game experience a single, linear flow (setup) followed by the calling experience (play), with no competing actions on the same screen.

---

## UX follow-ups (historical → current)

Earlier iterations mixed setup and play on one screen and showed setup-oriented UI (step strip, first-visit tips) after “Start the game,” which was confusing. **Current behavior:**

- **Play vs setup chrome:** In **play** phase, the host step strip and first-visit banner are hidden; they appear only in **setup** (`applyPhase` in `bingo.html`).
- **First-visit banner:** Shown only in setup when onboarding is not done; dismissed or cleared when the host completes onboarding (e.g. “Start the game”).
- **Host setup wizard:** Can still open automatically on first visit in **setup** phase when onboarding is not done (`openHostWizard`).
- **Play / calling wizard:** Explains the **calling** UI (current number, history, DRAW, board, participant cards). It does **not** auto-open when entering play; hosts open it with **Show guide** in the play controls when they want a tour.

Help entry points: **setup** uses the first-visit banner plus optional host wizard; **play** uses **Show guide** for the calling wizard only.
