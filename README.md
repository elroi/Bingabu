# Bingabu

A web app for running 75-ball Bingo: caller/organizer view with participant cards, leaderboard, and MC announcements.

## Run locally

- **Static only:** `npm run dev` — serves source HTML from the repo root (no API).
- **With API (recommended):** `npm run dev:api` — runs a **Vite build** first, then `vercel dev` to serve **`dist/`** plus API routes. Create room, join by code/link, and lobby work; rooms are stored in `.bingabu-rooms.json` (or Redis if `KV_REST_API_*` / `UPSTASH_REDIS_*` env vars are set).

## Production build

- **`npm run build`** — Vite outputs hashed assets to **`dist/`** and copies `locales/*.json` into `dist/locales/`. Vercel uses `dist` as the static output directory (`vercel.json`).
- **CI:** GitHub Actions runs `npm test` and `npm run build` on pushes and PRs (see `.github/workflows/ci.yml`).

**Vercel Hobby:** Deployments are limited to **12 serverless functions**. Room sub-routes (`join`, `claim`, `daubs`, `boot`, `leave`, `report`, `stream`) are implemented as a **single function** at [`api/rooms/[roomId]/[action].js`](api/rooms/[roomId]/[action].js) (shared logic in [`api/_lib/roomActionHandlers.js`](api/_lib/roomActionHandlers.js)). Shared server code lives under **`api/_lib/`** (underscore prefix so Vercel does not treat each file as its own function). Public URLs are unchanged (`/api/rooms/:id/claim`, etc.). Upgrade to Pro if you need more separate functions.

## Remote play (multi-device)

1. **Host:** Open the app, set participants and start a new game, then click **Play with friends** → **Create room**. Optionally protect the room with a password. Share the **room code**, **join page URL** (`/join`), **full link**, or **QR code** (and password if set) with players.
2. **Players** can join by: opening the share link; going to `/join` (or `/j/CODE`) and entering the 6-letter code; or choosing a game from **Or pick a game** on the join page. If the room is password-protected, enter the password. Choose **Watch only** to follow calls without a card, or pick a player slot for a card.
3. **Host:** Use **Remove** next to a player to boot them; use **Block new players from taking empty slots** to stop new claims; use **End room** to stop the room (your local game is unchanged).

**Fair play:** Only numbers the host draws are authoritative. The server only accepts daubs on the free space or on numbers already in the call sequence.

**Rejoin:** Players should use the same browser/device and link to reclaim a slot if they refresh or lose connection.

**Production (Vercel):** Room data is not shared across serverless instances unless you add Redis. See **[docs/NEXT_STEPS.md](docs/NEXT_STEPS.md)** section **1b. Make joining work on Vercel (add Upstash Redis)**. The app uses `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` when set.

**Preview vs production:** On Vercel Preview, Redis keys are prefixed (`bingabu:preview:*`) so preview deploys do not clash with production data. See **[docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md)**.

## Observability (optional)

- **`SENTRY_DSN`** — If set, API routes report Redis/store errors to Sentry via [`api/_lib/initObservability.js`](api/_lib/initObservability.js).

## Moderation hooks (no accounts)

- **Lock joins** — The host can enable **Block new players from taking empty slots** in the online room panel (stored as `joinLocked` on the room).
- **Reports** — `POST /api/rooms/{roomId}/report` with JSON `{ "message": "…" }` appends an entry to Redis (when configured) for operator review. Rate-limited by IP like the join endpoint.

## Translation admin (optional)

- Open **`/admin-translations.html`** (same origin as the app). Use a long random **Bearer** token set in Vercel as **`BINGABU_ADMIN_LOCALES_TOKEN`** (Environment Variables → Production). Saving edits requires the same **Upstash Redis** vars as rooms: overrides are stored per locale under `bingabu:i18n:overrides:*`. The public site loads copy from **`GET /api/locales/{en|he}`**, which merges Redis overrides on top of the committed JSON in `locales/`. Repo JSON remains the source of truth for new keys; use git for bulk or structural changes.

## Legal placeholders

- **[privacy.html](privacy.html)** and **[terms.html](terms.html)** are placeholders. Replace with your real policies before a public launch.
- **Prizes or money** in real-money or sweepstakes-style games can trigger gambling or promotion laws in your jurisdiction—get appropriate advice if you go beyond casual free play with friends.
