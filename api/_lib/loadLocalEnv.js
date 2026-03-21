/**
 * `vercel dev` often runs API handlers with `process.cwd()` outside the repo, and may not
 * inject `.env.local` into the serverless process. Bundled output also moves files under
 * `.vercel/`, so `import.meta.url` + fixed `../..` is unreliable. We walk up until we find
 * this repo (package.json name `bingabu` + `locales/en.json`).
 */

import { existsSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

let didRun = false;

function isBingabuRepoRoot(dir) {
  const pkgPath = join(dir, "package.json");
  const locPath = join(dir, "locales", "en.json");
  if (!existsSync(pkgPath) || !existsSync(locPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return pkg && pkg.name === "bingabu";
  } catch {
    return false;
  }
}

/**
 * Walk upward from `startDir` (max 40 levels) looking for the Bingabu repo root.
 */
function findBingabuRepoRootFrom(startDir) {
  let dir = resolve(startDir);
  for (let i = 0; i < 40; i++) {
    if (isBingabuRepoRoot(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Resolve repo root for loading `.env*`. Works from source tree or Vercel's build output.
 */
export function getRepoRoot() {
  const candidates = [];
  if (process.env.VERCEL_PROJECT_ROOT) {
    candidates.push(process.env.VERCEL_PROJECT_ROOT);
  }
  const here = dirname(fileURLToPath(import.meta.url));
  candidates.push(here, process.cwd());

  for (const start of candidates) {
    const found = findBingabuRepoRootFrom(start);
    if (found) return found;
  }

  // Legacy fallback (unit tests / odd layouts)
  return resolve(here, "..", "..");
}

/**
 * Parse env file into process.env. Strips UTF-8 BOM and optional `export` prefix per line.
 * @returns number of keys applied
 */
function applyEnvFile(path, { override } = { override: false }) {
  if (!existsSync(path)) return 0;
  let raw = readFileSync(path, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const normalized = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*export\s+/, ""))
    .join("\n");
  let parsed;
  try {
    parsed = dotenv.parse(normalized);
  } catch {
    return 0;
  }
  let n = 0;
  for (const [k, v] of Object.entries(parsed)) {
    if (v === undefined) continue;
    const val = typeof v === "string" ? v.trim() : v;
    if (override || process.env[k] === undefined) {
      process.env[k] = val;
      n++;
    }
  }
  return n;
}

export function loadLocalEnvIfNeeded() {
  if (didRun) return;
  didRun = true;
  if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") {
    return;
  }

  const repoRoot = getRepoRoot();
  const cwd = process.cwd();
  const roots =
    cwd === repoRoot ? [repoRoot] : [repoRoot, cwd];

  let total = 0;
  for (const root of roots) {
    total += applyEnvFile(join(root, ".env"), { override: false });
    total += applyEnvFile(join(root, ".env.local"), { override: true });
  }

  const isCloud =
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview";
  if (!isCloud) {
    console.warn(
      `[bingabu] loadLocalEnv: repoRoot=${repoRoot} varsApplied=${total} adminToken=${process.env.BINGABU_ADMIN_LOCALES_TOKEN ? "set" : "missing"}`
    );
  }

  if (
    !isCloud &&
    !process.env.BINGABU_ADMIN_LOCALES_TOKEN &&
    existsSync(join(repoRoot, ".env.local"))
  ) {
    const stat = readFileSync(join(repoRoot, ".env.local"), "utf8").trim();
    if (stat.length > 0) {
      console.warn(
        "[bingabu] .env.local is non-empty but BINGABU_ADMIN_LOCALES_TOKEN was not set. Check KEY=value format (value may need double quotes if it contains #)."
      );
    }
  }
}
