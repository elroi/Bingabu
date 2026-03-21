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
| `BINGABU_ADMIN_LOCALES_TOKEN` | If using admin UI | Optional | Long random secret |

## Local

- `npm run dev:api` — no `VERCEL_ENV`; uses `bingabu:*` keys when Redis env vars are set, else file-backed `.bingabu-rooms.json`.
