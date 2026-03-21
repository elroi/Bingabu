# Environments (Vercel)

## Production vs Preview

- **Production** uses the default Redis key namespace (`bingabu:*`) for rooms, lobby index, i18n overrides, and rate limits.
- **Preview** deployments set `VERCEL_ENV=preview`. The app automatically prefixes keys with `bingabu:preview:*` so preview traffic does not read or overwrite production rooms.

You can use the **same** Upstash Redis database for both; isolation is by key prefix. Alternatively, use separate Redis instances per environment and point Preview env vars at the preview database.

## Recommended variables

| Variable | Production | Preview | Notes |
|----------|------------|---------|--------|
| `UPSTASH_REDIS_REST_URL` | Yes | Yes | Same or different instance |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Yes | |
| `SENTRY_DSN` | Optional | Optional | Error reporting for API routes |
| `BINGABU_ADMIN_LOCALES_TOKEN` | If using admin UI | Optional | Long random secret; must be set for **Production** (not only Preview) if you use `/admin-translations.html` on the live site. Redeploy after adding or changing it. |

## Local

- `npm run dev:api` — no `VERCEL_ENV`; uses `bingabu:*` keys when Redis env vars are set, else file-backed `.bingabu-rooms.json`.

### Translation admin (`BINGABU_ADMIN_LOCALES_TOKEN`)

1. In the **project root** (same folder as `package.json`), create **`.env.local`** (gitignored—do not commit).
2. Add a line (use any long random string, e.g. `openssl rand -hex 32`):

   ```bash
   BINGABU_ADMIN_LOCALES_TOKEN=your-long-secret-here
   ```

3. Run **`npm run dev:api`**. The **admin locales** API loads **`.env.local` / `.env` from the repository root** (path derived from `api/_lib/`, not `process.cwd()`), because `vercel dev` often uses a different cwd and may not inject those variables. Use `KEY=value` per line; optional `export` prefix and UTF-8 BOM are tolerated. See [`api/_lib/loadLocalEnv.js`](../api/_lib/loadLocalEnv.js).
4. Open **`http://localhost:3000/admin-translations.html`** (or whatever port `vercel dev` prints), paste the **same** secret, and click **Connect**.

**Saving** from the admin UI locally also needs Redis in `.env.local`: **`KV_REST_API_URL`** + **`KV_REST_API_TOKEN`** (or **`UPSTASH_REDIS_REST_URL`** + **`UPSTASH_REDIS_REST_TOKEN`**). Without them, **Connect / Reload** still work (defaults from `locales/*.json`); **Save** returns 503.

**Alternative:** run `vercel env pull .env.local` in the project to download variables from the linked Vercel project (includes production secrets—treat the file as sensitive).
