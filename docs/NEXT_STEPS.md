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
     - Build Command: `npm run build` (Vite → `dist/` + locale JSON copy).  
     - Output Directory: `dist` (see `vercel.json`).  
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

7. **Required for joining: Redis (Upstash)**  
   On Vercel, each request can run in a different serverless instance, so in-memory room data is not shared. Without Redis, the host creates a room in one instance and the joiner gets 404 in another. See **section 1b** below.

8. **Preview vs production data**  
   See **[ENVIRONMENTS.md](./ENVIRONMENTS.md)** for Redis key prefixes on Vercel Preview.

---

## 1b. Make joining work on Vercel (add Upstash Redis)

**Goal:** Room data is shared across all serverless instances so that when someone opens the join link, the room is found (no more 404).

The app looks for **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`**. When both are set, rooms are stored in Redis; otherwise they stay in memory (not shared on Vercel).

### Step-by-step

1. **Open your Vercel project**  
   Go to [vercel.com/dashboard](https://vercel.com/dashboard), select your **Bingabu** project.

2. **Open Integrations**  
   In the top navigation, click **Integrations** (or use the left sidebar: your team/account → **Integrations**).  
   If you see **Storage** in the sidebar instead, you can also go to **Storage** and look for an option to add a database (e.g. **Create Database** or **Connect Store**).

3. **Open the Marketplace**  
   Click **Browse Marketplace** (or **Add Integration** / **Marketplace**).  
   In the Marketplace, filter or search for **Storage** or **Redis**.

4. **Choose Upstash**  
   Find **Upstash** (“Serverless DB: Redis, Vector, Queue, Search”) and click it.  
   Click **Install** (or **Add Integration**).

5. **Configure the integration**  
   - Select your **Vercel account/team** if asked.  
   - You may see a list of Upstash products (Redis, Vector, etc.). Choose **Redis**.  
   - Pick a **pricing plan** (e.g. **Pay as you go** or **Free** if available).  
   - Choose a **region** close to your users if prompted.  
   - Optionally set a **name** for the database (e.g. `bingabu-rooms`).  
   - Click **Create** / **Continue** / **Install** to provision the Redis database.

6. **Connect the database to Bingabu**  
   After the database is created, you’ll see a **Projects** or **Connect to project** step.  
   - Click **Connect Project** (or **Connect**).  
   - Select **Bingabu** from the list.  
   - **Do not** set a custom environment variable prefix (leave it empty). The app expects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.  
   - Confirm **Connect** / **Save**.  
   Vercel will inject the two env vars into the Bingabu project for the environments you selected (usually **Production**, **Preview**, **Development**).

7. **Redeploy**  
   New env vars apply only to new deployments.  
   - Go to **Deployments**, open the **⋯** menu on the latest deployment, then **Redeploy**; or  
   - Push a new commit to trigger a deploy.  
   Wait for the deployment to finish.

8. **Test**  
   - Open your production URL, create a new room, copy the share link.  
   - Open the link in an incognito window or another device.  
   - You should see the join page (room code, optional password, then “Choose your player”). No 404.

### If you don’t see Integrations or Storage

- **Integrations** is under the main dashboard (team or personal account), not inside a single project. From the project, use the top bar or sidebar to get back to the team/account level, then **Integrations**.  
- Alternatively, in the project go to **Settings → Environment Variables**. If you add Redis manually (e.g. from [Upstash Console](https://console.upstash.com)), create variables named exactly **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`** for Production (and Preview if you want).

### Summary

| Step | Where | Action |
|------|--------|--------|
| 1 | Dashboard | Open Bingabu project |
| 2 | Top/side nav | Integrations → Browse Marketplace |
| 3 | Marketplace | Find **Upstash** → Install |
| 4 | Upstash | Choose Redis, plan, region → Create |
| 5 | Upstash / Vercel | Connect project **Bingabu**, no prefix |
| 6 | Deployments | Redeploy (or push a commit) |
| 7 | Browser | Create room, open share link in incognito → join should work |

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

## Post-MVP (after launch)

- **Translation / i18n** – Structured i18n for **home + join** (English / Hebrew) lives in `locales/*.json`, `i18n.js`, and [docs/I18N.md](./I18N.md). Extend the same pattern to player/bingo/cards when needed; keep **Bingabu** in Latin in non-English strings.

---

## Order suggestion

1. Do **Deploy to Vercel** first so you have a real URL.  
2. Then either **Spectator** (if you want “watch only”) or **Accessibility** (if you want better a11y).  
3. Add **favicon** and **SSE backoff** when you have a few minutes.

If you tell me which one you want to do first (deploy, spectator, or accessibility), I can give you the exact code changes file-by-file next.
