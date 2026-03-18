# Wizard UX improvements: non-blocking and contextual positioning

## Problem

The host wizard is currently:

1. **Blocking** — A full-screen overlay (`position: fixed; inset: 0` with dimmed background) covers the page. Users cannot interact with the highlighted section (e.g. set participants, create room) while the wizard is open.
2. **Centered, not contextual** — The modal is always centered in the viewport. It does not appear next to the step’s relevant UI, so (e.g.) “Set players” floats in the middle and often covers “Playing with friends online?” and “Number marking” instead of sitting near “Who’s playing?” and the Participants input.

## Goal

- **Non-blocking:** The wizard should not block interaction with the page. Users can follow the steps and use the controls (participants, create room, share, start game) without closing the wizard.
- **Contextual:** The wizard card (title, body, Back/Skip/Next) should be positioned next to the relevant element for each step (e.g. near “Who’s playing?” for step 1, near “Create room” for steps 2–3, near “Start the game” for step 4).

## Scope

- **Where:** `bingo.html` — host wizard overlay, modal, CSS, and step logic.
- **Flow:** All four steps (Set players → Create room → Share → Draw).
- **Tests:** `mobile-friendly.test.js` — update assertions that assume a blocking overlay/modal DOM and behavior.

---

## Plan

### 1. Make the wizard non-blocking

**Current:** Full overlay with `background: rgba(0, 0, 0, 0.5)` and modal centered; page is not focusable/clickable.

**Changes:**

- **Option A (recommended): No overlay**  
  - Remove the full-page dimming.  
  - Keep a single wizard “card” (title, body, actions) that is positioned next to the target (see §2).  
  - Page stays fully interactive; the card is a floating hint, not a dialog.

- **Option B: Spotlight**  
  - Replace full overlay with a “spotlight” that dims only areas outside the target (e.g. clip-path or a cutout).  
  - More complex; consider only if you want to keep focus on one area while still allowing interaction with that area.

**Implementation (Option A):**

- Remove or make transparent the overlay background; remove `inset: 0` full coverage, or repurpose the overlay so it only wraps the wizard card and does not block the rest of the page.
- Ensure the wizard card does not trap focus for the whole page: avoid `aria-modal="true"` when non-blocking, or remove the dialog role and use something like `role="region"` with `aria-label="Host setup guide"` so the card is informative rather than modal.
- Keep Escape and Skip to close/dismiss the wizard; Back/Next still change steps. No need to “focus trap” the entire page.

**Files:** `bingo.html` (CSS for `.host-wizard-overlay`, `.host-wizard-modal`; JS that shows/hides overlay).

---

### 2. Position the wizard card next to the relevant element

**Current:** Modal is centered with `align-items: center; justify-content: center`. Step config has `highlight` selectors and the code adds `host-wizard-highlight` and calls `scrollIntoView`, but the card itself stays in the center.

**Changes:**

- **Anchor per step:** For the active step, resolve the target element (reuse or extend `HOST_WIZARD_STEPS[].highlight`). Use `getBoundingClientRect()` (and optionally `scrollY`/scrollX) to get the target’s position.
- **Place card relative to target:** Position the wizard card (the existing `.host-wizard-modal` content) so it sits next to the target, e.g.:
  - **Preferred:** Below the target, left-aligned with the target (or right-aligned on RTL), with a small gap (e.g. 12–16px). If there’s no room below (e.g. near bottom of viewport), place above the target.
  - **Alternative:** To the right of the target (or left on RTL), with fallback above/below if no horizontal space.
- **Viewport checks:** Ensure the card stays within the viewport (e.g. clamp to `padding` from edges). If the target is off-screen, still show the card in a safe area and rely on `scrollIntoView` to bring the target into view.
- **Single DOM node:** Keep one wizard card in the DOM; on step change, update its content and recalculate position from the new step’s target.

**Step–target mapping (current and suggested):**

| Step | Current `highlight`            | Note |
|------|--------------------------------|------|
| 1    | `#setup-players-section`       | That’s the “Advanced participants settings” collapsible. For “Set players”, the main UI is “Who’s playing?” + Participants input above it. Consider adding a wrapper id (e.g. `#wizard-step-1-target`) around the heading + participant-setting so the card anchors to the right block. |
| 2–3  | `#remote-play-section`         | Keep; card can sit below the section or below “Create an online game room” button. |
| 4    | `#host-start-game-btn`         | Keep; card can sit above or below the button. |

**Implementation:**

- Add a small JS helper, e.g. `positionWizardCard(targetEl)`, that:
  - Reads `targetEl.getBoundingClientRect()` and viewport dimensions.
  - Sets the wizard card’s position (e.g. `top`/`left` or `transform`) so it sits below (or above) the target with a gap, and clamps to viewport.
- Call this when opening the wizard and on every `applyWizardStep(step)` (after adding the highlight and scrolling the target into view).
- Use fixed positioning for the card so it doesn’t shift layout; update coordinates on `scroll`/`resize` if the card stays open while the user scrolls (optional for v1).

**Files:** `bingo.html` (CSS for positioning the card; JS in `applyWizardStep` and any open/close logic).

---

### 3. Refine step 1 target (optional but recommended)

- Wrap “Who’s playing?” heading + subtitle + Participants input (and optionally the advanced section) in a container with id `wizard-step-1-target` (or reuse a semantic wrapper).
- Set step 1’s `highlight` to that id so the wizard card and highlight ring align with the actual “Set players” UI, not only the advanced block.

**Files:** `bingo.html` (HTML wrapper + `HOST_WIZARD_STEPS[0].highlight`).

---

### 4. Accessibility

- **Non-blocking:** Prefer `role="region"` (or `complementary`) and `aria-label="Host setup guide"` instead of `role="dialog"` and `aria-modal="true"` so assistive tech doesn’t treat the whole page as modal.
- **Live updates:** Keep `aria-live="polite"` on the wizard so step title/body changes are announced.
- **Focus:** When opening or changing step, optional: move focus to the wizard’s “Next” or “Skip” so keyboard users know the guide is active; do not trap focus so they can still tab to the page.
- **Escape:** Keep Escape to close the wizard.

**Files:** `bingo.html` (overlay/card markup and any focus logic).

---

### 5. Tests

- **mobile-friendly.test.js:** Update tests that assume a blocking overlay/modal:
  - If the overlay is removed or no longer full-screen, adjust assertions that check for `#host-wizard-overlay` (e.g. that the guide container still exists and is shown when the wizard is open).
  - Keep or update tests for: wizard progress text (“Step 1 of 4”), Back/Next/Skip, Skip closing and setting onboarding done, “Show guide” / show-again.
- Add or update a test that the wizard card is positioned relative to a target (e.g. that when step 1 is active, the card’s position is derived from the step 1 target element), if you add a dedicated positioning API or data attribute for testing.

**Files:** `mobile-friendly.test.js`, optionally `bingo.html` (data attributes for tests).

---

## Implementation order

1. **Positioning (Section 2)** — Implement `positionWizardCard(targetEl)` and call it from `applyWizardStep`. Keep overlay as-is first so you can verify “next to element” behavior.
2. **Step 1 target (Section 3)** — Add wrapper and update step 1 `highlight` so the card anchors to “Who’s playing?” / Participants.
3. **Non-blocking (Section 1)** — Remove full overlay/dimming, make page interactive, adjust ARIA and focus.
4. **Accessibility (Section 4)** — Finalize roles and focus behavior.
5. **Tests (Section 5)** — Update and add tests for structure and behavior.

---

## Acceptance criteria

- [ ] Wizard card appears **next to** the relevant section/control for each step (below or above with viewport clamping).
- [ ] User can **interact with the page** while the wizard is open (change participants, create room, share, click “Start the game”).
- [ ] Step 1 is clearly associated with “Who’s playing?” / Participants (optional wrapper + highlight).
- [ ] Back / Next / Skip / Escape behavior unchanged; “Show guide” still reopens the wizard.
- [ ] Accessibility: non-modal semantics and optional focus on open/step change; Escape closes.
- [ ] Existing or updated tests pass (`npm test`).

---

## References

- Current wizard: `bingo.html` — `.host-wizard-overlay`, `.host-wizard-modal`, `HOST_WIZARD_STEPS`, `applyWizardStep`, `openHostWizard`, `closeHostWizard`.
- Restructure doc: `docs/RESTRUCTURE_NEW_GAME.md` (wizard opens when phase is setup and onboarding not done).
- Tests: `mobile-friendly.test.js` (host wizard overlay, modal, steps, Skip, show-again).
