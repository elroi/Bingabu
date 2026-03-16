# Bingabu

A web app for running 75-ball Bingo: caller/organizer view with participant cards, leaderboard, and MC announcements.

## Run locally

- **Static only:** `npm run dev` — serves the app; remote play API will not work.
- **With API (recommended):** `npm run dev:api` — runs `vercel dev` to serve the app and API routes. Create room, join by code/link, and lobby work; rooms are stored in `.bingabu-rooms.json` (or Redis if `KV_REST_API_*` / `UPSTASH_REDIS_*` env vars are set).

## Remote play (multi-device)

1. **Host:** Open the app, set participants and start a new game, then click **Play with friends** → **Create room**. Optionally protect the room with a password. Share the **room code**, **join page URL** (`/join`), **full link**, or **QR code** (and password if set) with players.
2. **Players** can join by: opening the share link; going to `/join` (or `/j/CODE`) and entering the 6-letter code; or choosing a game from **Or pick a game** on the join page. If the room is password-protected, enter the password. Choose your player (slot), then you’ll see your card and live updates as the host draws.
3. **Host:** Use **Remove** next to a player to boot them; use **End room** to stop the room (your local game is unchanged).

**Production (Vercel):** Room data is not shared across serverless instances unless you add Redis. See **[docs/NEXT_STEPS.md](docs/NEXT_STEPS.md)** section **1b. Make joining work on Vercel (add Upstash Redis)** for step-by-step instructions. In short: Vercel Dashboard → Integrations → Marketplace → **Upstash** → Redis → Create → Connect project **Bingabu** → Redeploy. The app uses `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` when set.
