# Bingabu

A web app for running 75-ball Bingo: caller/organizer view with participant cards, leaderboard, and MC announcements.

## Run locally

- **Static only:** `npm run dev` (serves the app; remote play API will not work).
- **With remote play API:** `npm run dev:api` (uses Vercel dev to serve the app and API routes).

## Remote play (multi-device)

1. **Host:** Open the app, set participants and start a new game, then click **Play with friends** → **Create room**. Optionally protect the room with a password. Share the **room code** and **link** (and password if set) with players.
2. **Players:** Open the share link (or go to `join.html` and enter the room code). If the room is password-protected, enter the password. Choose your player (slot), then you’ll see your card and live updates as the host draws.
3. **Host:** Use **Remove** next to a player to boot them; use **End room** to stop the room (your local game is unchanged).

Rooms use an in-memory store by default; for production with multiple instances, configure a persistent store (e.g. Vercel KV).
