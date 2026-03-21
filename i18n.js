/**
 * Lightweight i18n for static pages: JSON locales + data-i18n hydration.
 */

export const LOCALE_STORAGE_KEY = "bingabu-locale";
export const SUPPORTED_LOCALES = ["en", "he"];

export function normalizeLocale(tag) {
  if (!tag || typeof tag !== "string") return null;
  const lower = tag.trim().toLowerCase();
  if (SUPPORTED_LOCALES.includes(lower)) return lower;
  const two = lower.slice(0, 2);
  if (SUPPORTED_LOCALES.includes(two)) return two;
  return null;
}

export function resolveLocale({
  search = "",
  storageGet,
  navigatorLanguage = "",
} = {}) {
  const q = typeof search === "string" && search.startsWith("?")
    ? search.slice(1)
    : search;
  const params = new URLSearchParams(q);
  const fromQuery = normalizeLocale(params.get("lang"));
  if (fromQuery) return fromQuery;

  let stored = null;
  try {
    if (storageGet) stored = normalizeLocale(storageGet(LOCALE_STORAGE_KEY));
  } catch (_) {}
  if (stored) return stored;

  const fromNav = normalizeLocale(navigatorLanguage);
  if (fromNav) return fromNav;

  return "en";
}

export function mergeMessages(localeMessages, fallbackMessages) {
  const base = { ...(fallbackMessages || {}) };
  for (const k of Object.keys(localeMessages || {})) {
    const v = localeMessages[k];
    if (v != null && v !== "") base[k] = v;
  }
  return base;
}

export function interpolate(template, vars) {
  if (template == null) return "";
  const str = String(template);
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, name) =>
    vars[name] != null ? String(vars[name]) : `{${name}}`
  );
}

export function createTranslator(messages) {
  const table = messages || {};
  return function t(key, vars) {
    const raw = table[key];
    const str = raw != null ? String(raw) : key;
    return interpolate(str, vars);
  };
}

export function applyI18n(root, t) {
  const scope = root || document;
  if (!scope || !scope.querySelectorAll) return;
  scope.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const attrList = el.getAttribute("data-i18n-attr");
    if (attrList) {
      for (const attr of attrList.split(/\s+/).filter(Boolean)) {
        el.setAttribute(attr, t(key));
      }
    } else {
      el.textContent = t(key);
    }
  });
}

let _messages = {};
let _t = createTranslator(_messages);
let _locale = "en";

export function getLocale() {
  return _locale;
}

export function t(key, vars) {
  return _t(key, vars);
}

function persistLocaleFromQuery(search, locale) {
  const q = typeof search === "string" && search.startsWith("?")
    ? search.slice(1)
    : search;
  const params = new URLSearchParams(q);
  if (!normalizeLocale(params.get("lang"))) return;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
  } catch (_) {}
}

export async function initI18n(options = {}) {
  const documentRef =
    options.documentRef ??
    (typeof document !== "undefined" ? document : null);
  const fetchFn =
    options.fetchFn ??
    (typeof fetch !== "undefined" ? fetch.bind(globalThis) : null);
  const basePath = options.basePath ?? "";

  const storageGet =
    options.storageGet ??
    (typeof localStorage !== "undefined"
      ? (k) => localStorage.getItem(k)
      : () => null);

  const search =
    options.search ??
    (typeof location !== "undefined" ? location.search : "");

  const navLang =
    options.navigatorLanguage ??
    (typeof navigator !== "undefined" ? navigator.language : "");

  _locale = resolveLocale({ search, storageGet, navigatorLanguage: navLang });
  persistLocaleFromQuery(search, _locale);

  if (!fetchFn) {
    _messages = {};
    _t = createTranslator(_messages);
    if (documentRef && documentRef.documentElement) {
      documentRef.documentElement.lang = _locale;
      documentRef.documentElement.dir = _locale === "he" ? "rtl" : "ltr";
    }
    return { locale: _locale, t: _t, messages: _messages };
  }

  const origin =
    options.apiOrigin ??
    (typeof location !== "undefined" && location.origin ? location.origin : "");
  const preferLocaleApi = options.localeApi !== false && !!origin;

  async function loadLocaleJson(code) {
    if (preferLocaleApi) {
      try {
        const res = await fetchFn(`${origin}/api/locales/${code}`);
        if (res.ok) return await res.json();
      } catch (_) {}
    }
    try {
      const res = await fetchFn(`${basePath}locales/${code}.json`);
      return res.ok ? await res.json() : {};
    } catch (_) {
      return {};
    }
  }

  const enRaw = await loadLocaleJson("en");
  let locRaw = {};
  if (_locale !== "en") {
    locRaw = await loadLocaleJson(_locale);
  }

  _messages = mergeMessages(locRaw, enRaw);
  _t = createTranslator(_messages);

  if (documentRef && documentRef.documentElement) {
    documentRef.documentElement.lang = _locale;
    documentRef.documentElement.dir = _locale === "he" ? "rtl" : "ltr";
    applyI18n(documentRef, _t);
  }

  return { locale: _locale, t: _t, messages: _messages };
}

export function setLocalePreference(locale, reload = true) {
  const normalized = normalizeLocale(locale) || "en";
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
    }
  } catch (_) {}
  if (reload && typeof location !== "undefined") {
    const url = new URL(location.href);
    url.searchParams.set("lang", normalized);
    location.href = url.toString();
  }
}
