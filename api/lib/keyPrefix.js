/**
 * Isolate Redis keys on Vercel Preview so preview deploys do not share production rooms or i18n overrides.
 * Set VERCEL_ENV=preview on Preview; Production and local dev use the default namespace.
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env] - for tests; defaults to process.env
 */
export function getKeyPrefix(env) {
  const e = env ?? (typeof process !== "undefined" ? process.env : {});
  if (e?.VERCEL_ENV === "preview") {
    return "bingabu:preview:";
  }
  return "bingabu:";
}
