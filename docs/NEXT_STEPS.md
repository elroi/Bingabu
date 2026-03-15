# Next steps guide

Step-by-step guidance for deploy, spectator mode, accessibility, and polish.

---

## 1. Deploy to Vercel

**Goal:** Get a live URL (e.g. `https://bingabu-xxx.vercel.app`) so friends can join without running the app locally.

### Steps

1. **Push your code**  
   Make sure the latest code is on GitHub (you already did this).

2. **Sign in to Vercel**  
   Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).

3. **Import the project**  
   - Click **Add New… → Project**.  
   - Select **Import Git Repository** and choose your `Bingabu` repo (or paste the repo URL).  
   - Leave **Framework Preset** as “Other” (or “Vite” if it detects it; it doesn’t matter much).  
   - **Root Directory:** leave as `.`  
   - **Build and Output:**  
     - Build Command: leave empty or `npm run build` if you add a build later.  
     - Output Directory: leave empty or `.`  
   - Click **Deploy**.

4. **Wait for the first deploy**  
   Vercel will clone the repo and deploy. Your site and API will be at `https://<project-name>-<your-username>.vercel.app`.

5. **Test remote play**  
   - Open the deployed URL.  
   - Create a room and copy the share link.  
   - Open the link in another device or incognito and join.  
   The share link will use `https` automatically (no more localhost).

6. **Optional: custom domain**  
   In the project → **Settings → Domains**, add a domain (e.g. `bingabu.yourdomain.com`) and follow the DNS instructions.

7. **Optional: Vercel KV (persistent rooms)**  
   Right now rooms are in memory and can be lost on cold starts. For production you can add Vercel KV:  
   - In the Vercel project, go **Storage → Create Database → KV**.  
   - Connect it to the project (env vars like `KV_REST_API_URL` and `KV_REST_API_TOKEN` are added automatically).  
   - Then the codebase would need a small change: in `api/lib/store.js`, use the KV client to read/write rooms instead of (or in addition to) the file. That’s a separate code change; the app works without it for low traffic.

---

## 2. Spectator mode (“Watch only”)

**Goal:** Let someone open the join link and watch the game (current number + history) without picking a player slot.

### What to build

- **Join page (`join.html`)**  
  - Add a second entry: e.g. **“Just watch”** or **“Spectator”** (link or button).  
  - When chosen: don’t call the claim API; store `role: "spectator"` (e.g. in `sessionStorage`) and redirect to a spectator view, e.g. `spectator.html?room=CODE` (or reuse `player.html` with a `spectator=1` query).

- **Spectator view**  
  - New page `spectator.html` (or `player.html` with `?spectator=1`):  
    - Read `roomId` from URL or storage.  
    - Same auth as player (room code; if password-protected, use the join/unlock flow first, then go to spectator with the same `joinToken`).  
    - Show: **current number** (big), **history** of called numbers, optionally **player names** (no cards).  
    - Use the same SSE stream (or polling) as the player view so the screen updates when the host draws.  
  - No card grid, no “Your card”, no slot index.

### Implementation outline

- In `join.html`, after the room is loaded (and password entered if needed), show two actions: **“Choose your player”** (current flow) and **“Just watch”**.  
- “Just watch” → set `sessionStorage` e.g. `bingabu-role: spectator`, then `window.location.href = 'spectator.html?room=' + roomId` (and pass `joinToken` in session or hash if needed).  
- `spectator.html`: same as player view but only render current number + history (+ optional “Players: Alice, Bob…”). Reuse `fetchRoom()` and SSE logic; skip card and slot.

---

## 3. Accessibility

**Goal:** Make join and player view work well with keyboard and screen readers.

### Player view (`player.html`)

- **Live region for current number**  
  - The element that shows the current number (e.g. `#current-number`) should have `aria-live="polite"` so screen readers announce when it changes. (You can add `aria-atomic="true"` so the whole value is read.)

- **Announce “Bingo” / “Line”**  
  - When `getBingoLines()` returns a new line or bingo, put that text in an `aria-live="assertive"` region (e.g. a hidden div that you update) so it’s announced immediately.  
  - Example: a div with `aria-live="assertive"` and `aria-atomic="true"` that you set to e.g. “Bingo! Row 1” when the player gets a line.

- **Card structure**  
  - Use a table or grid with proper headers (e.g. B, I, N, G, O) and `scope="col"` so the card is navigable and understandable.  
  - Each cell can have `role="gridcell"` and the container `role="grid"` if you’re not using a `<table>`.

- **Touch targets**  
  - Keep cells and buttons at least 44×44px (you already have `min-height: 44px` on cells).  
  - Ensure sufficient contrast for “marked” vs “unmarked” (your current colors are likely fine; you can check with browser DevTools or a contrast checker).

### Join flow (`join.html`)

- **Slot picker**  
  - Use a `<fieldset>` / `<legend>` or a list of links/buttons with clear labels: “Join as Alice”, “Join as Bob”, “Join as Player 3 (taken)”.  
  - Ensure focus is visible (outline) and order is logical (e.g. Tab through code → password → slot list → submit).  
  - Prefer `<button>` or `<a>` for each slot so they’re focusable and activatable by keyboard; avoid divs with only click handlers.

- **Error messages**  
  - Put error text in an element with `aria-live="polite"` (or `assertive` for critical errors) so it’s announced when it appears.  
  - Associate errors with inputs with `aria-describedby` or `aria-errormessage` where possible.

---

## 4. Small polish

### Favicon (remove 404)

- Add a small image (e.g. 32×32 or 48×48 PNG/ICO) as the site icon.  
- Save it as `favicon.ico` (or `favicon.png`) in the project root (same folder as `index.html`).  
- In `index.html` and any other entry pages, add:  
  `<link rel="icon" href="/favicon.ico" type="image/x-icon">`  
  (or `href="/favicon.png"` and `type="image/png"`).  
- You can generate a simple favicon from text (“B”) or a logo using an online tool or design app.

### SSE reconnect backoff

- Right now the player view reconnects the EventSource after 1 second on close/error.  
- To be gentler on the server: use **exponential backoff** (e.g. 1s, then 2s, then 4s, cap at e.g. 30s).  
- In `player.html`, replace the fixed `setTimeout(connectStream, 1000)` with a variable like `let reconnectDelay = 1000`; on each reconnect failure increase it (e.g. `reconnectDelay = Math.min(reconnectDelay * 2, 30000)`) and pass it to `setTimeout(connectStream, reconnectDelay)`; on a successful connection you can reset `reconnectDelay = 1000`.

---

## Order suggestion

1. Do **Deploy to Vercel** first so you have a real URL.  
2. Then either **Spectator** (if you want “watch only”) or **Accessibility** (if you want better a11y).  
3. Add **favicon** and **SSE backoff** when you have a few minutes.

If you tell me which one you want to do first (deploy, spectator, or accessibility), I can give you the exact code changes file-by-file next.
