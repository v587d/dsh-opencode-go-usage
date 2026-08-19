/**
 * Configuration loader for dsh-ocgo-usage
 *
 * Priority: env vars > config file ($DSH_HOME/ocgo-usage.json) > built-in defaults
 *
 * The cookie is NEVER logged. If the config file is missing or unparseable,
 * we silently fall back to env vars + defaults — the browser readout shows a
 * clean `noconfig` error if neither source provides a usable value.
 *
 * Env var names match the pi-ocgo-usage extension so one shell profile works
 * for both agents.
 *
 * The browser config editor (`/api/ocgo-usage/config`) reads a MASKED view
 * (never the full cookie) and writes back through {@link writeConfigFile}.
 * @module dsh-ocgo-usage/config
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
export const ENV_COOKIE = 'OPENCODE_GO_COOKIE';
export const ENV_WORKSPACE_ID = 'OPENCODE_GO_WORKSPACE_ID';
export const ENV_BASE_URL = 'OPENCODE_GO_BASE_URL';
export const ENV_CACHE_TTL = 'OPENCODE_GO_CACHE_TTL';
export const ENV_TIMEOUT_MS = 'OPENCODE_GO_TIMEOUT_MS';
export const DEFAULT_BASE_URL = 'https://opencode.ai';
export const DEFAULT_CACHE_TTL = 300;
export const DEFAULT_TIMEOUT_MS = 10_000;
export const MIN_CACHE_TTL = 60;
export const MAX_CACHE_TTL = 3600;
/** Resolve the DSH home directory ($DSH_HOME or ~/.dsh). */
export function dshHome() {
    const explicit = process.env.DSH_HOME;
    if (typeof explicit === 'string' && explicit.length > 0)
        return explicit;
    return join(homedir(), '.dsh');
}
/** Resolved location of the plugin config file. */
export function configFilePath() {
    return join(dshHome(), 'ocgo-usage.json');
}
/**
 * Load and merge config from file + env vars.
 * Returns a fully resolved OcgoConfig; never throws.
 */
export function loadConfig() {
    const fileConfig = readFileConfig();
    // Cookie: prefer env, fall back to file; normalize so users can paste
    // either the full header or just the auth value.
    const cookie = normalizeCookie(pickString(process.env[ENV_COOKIE], asString(fileConfig?.cookie)));
    // Workspace ID: prefer env, fall back to file.
    const workspaceID = pickString(process.env[ENV_WORKSPACE_ID], asString(fileConfig?.workspaceID));
    // baseUrl: prefer env, fall back to file, fall back to default.
    const baseUrl = pickString(process.env[ENV_BASE_URL], asString(fileConfig?.baseUrl)) || DEFAULT_BASE_URL;
    // cacheTTL: clamp into [60, 3600].
    const rawTTL = pickNumber(process.env[ENV_CACHE_TTL], asNumber(fileConfig?.cacheTTL), DEFAULT_CACHE_TTL);
    const cacheTTL = clamp(rawTTL, MIN_CACHE_TTL, MAX_CACHE_TTL);
    // timeoutMs: > 0.
    const timeoutMs = Math.max(0, pickNumber(process.env[ENV_TIMEOUT_MS], asNumber(fileConfig?.timeoutMs), DEFAULT_TIMEOUT_MS));
    return { cookie, workspaceID, baseUrl, cacheTTL, timeoutMs };
}
/** Mask the last 4 characters of a secret for the browser (full value when ≤ 4 chars). */
export function maskSecret(value) {
    if (value === undefined || value.length === 0)
        return { set: false, tail: '' };
    return { set: true, tail: value.length <= 4 ? value : value.slice(-4) };
}
/** The browser-facing masked config view (never reveals the full cookie). */
export function maskedConfigView() {
    const cfg = loadConfig();
    return {
        workspaceID: maskSecret(cfg.workspaceID),
        cookie: maskSecret(cfg.cookie),
    };
}
/**
 * Write cookie / workspaceID into the config file (preserving any other
 * fields), chmod 600, and return the updated masked view. Values are
 * normalized like env input (cookie gets `auth=` prefixed when pasted bare).
 * Empty/absent fields are left untouched; pass `null` to clear a field.
 */
export function writeConfigFile(partial) {
    const file = readFileConfig() ?? {};
    const next = { ...file };
    if (partial.workspaceID !== undefined) {
        const v = typeof partial.workspaceID === 'string' ? partial.workspaceID.trim() : '';
        if (v.length > 0)
            next.workspaceID = v;
        else
            delete next.workspaceID;
    }
    if (partial.cookie !== undefined) {
        const v = typeof partial.cookie === 'string' ? normalizeCookie(partial.cookie) : undefined;
        if (v !== undefined && v.length > 0)
            next.cookie = v;
        else
            delete next.cookie;
    }
    const path = configFilePath();
    try {
        writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
    }
    catch {
        // Fall back to the env/current effective values rather than throwing to
        // the browser with a partial write.
        return maskedConfigView();
    }
    return {
        workspaceID: maskSecret(typeof next.workspaceID === 'string' ? next.workspaceID : undefined),
        cookie: maskSecret(typeof next.cookie === 'string' ? next.cookie : undefined),
    };
}
function readFileConfig() {
    const path = configFilePath();
    if (!existsSync(path))
        return null;
    try {
        const raw = readFileSync(path, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
        return null;
    }
    catch {
        return null;
    }
}
// --- helpers ---
function pickString(envVal, fileVal) {
    if (envVal && envVal.length > 0)
        return envVal;
    if (fileVal && fileVal.length > 0)
        return fileVal;
    return undefined;
}
/**
 * Normalize a user-provided cookie string into a valid `Cookie:` header value
 * for the opencode console HTTP request.
 *
 * Accepts, order-independently:
 *  1. Full header: "auth=Fe26.2*...; oc_locale=zh"   (passthrough)
 *  2. Single bare value: "Fe26.2*..."                (auto-prefix "auth=")
 *  3. Two-segment value+locale: "Fe26.2*...; oc_locale=zh"
 *  4. Locale + auth in any order (incl. `oc_locale=zh` BEFORE `auth=`).
 *
 * The original implementation decided "the first segment is the auth value"
 * whenever the string did not start with `auth=`. That silently corrupted
 * real browser cookies like `oc_locale=zh; desktop_promo_dismissed=1;
 * auth=Fe26.2*...` into `auth=oc_locale=zh; ...` — a fake cookie that
 * opencode.ai rejects with a redirect to the login page.
 *
 * Fixes:
 *  - The `auth=` segment is located anywhere in the string, not assumed to
 *    be first.
 *  - If no `auth=` pair and no bare opaque token is present, `undefined` is
 *    returned so the caller REFUSES to persist a broken cookie rather than
 *    fabricating `auth=<locale>`.
 *  - The `oc_locale` is preserved from the pasted cookie (so a zh user keeps
 *    the Chinese console page, which the parser now supports), defaulting to
 *    `en` when absent. Only a well-formed short locale (e.g. `en`, `zh`, `ja`)
 *    is kept; anything malformed falls back to `en`.
 *  - All other segments (UI prefs like `desktop_promo_dismissed`) are
 *    dropped; only the auth token and the locale are ever sent.
 */
export function normalizeCookie(input) {
    if (!input)
        return undefined;
    const trimmed = input.trim();
    if (!trimmed)
        return undefined;
    const segments = trimmed.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
    // 1) Auth token — order-independent.
    let auth = segments.find((s) => /^auth=/i.test(s));
    if (auth === undefined) {
        // A bare token (no "=") that looks like an opaque auth value.
        const bare = segments.find((s) => !s.includes('=') && s.length >= 8);
        if (bare !== undefined)
            auth = `auth=${bare}`;
    }
    if (auth === undefined)
        return undefined;
    const authValue = auth.slice(auth.indexOf('=') + 1).trim().replace(/^"|"$/g, '');
    if (authValue.length === 0)
        return undefined;
    // 2) Locale — preserve the pasted one (the zh parser understands zh pages),
    //    fall back to `en` when absent or malformed.
    const localeSeg = segments.find((s) => /^oc_locale=/i.test(s));
    const rawLocale = localeSeg ? localeSeg.slice(localeSeg.indexOf('=') + 1).trim() : '';
    const locale = /^[A-Za-z]{2,3}$/.test(rawLocale) ? rawLocale.toLowerCase() : 'en';
    return `auth=${authValue}; oc_locale=${locale}`;
}
function pickNumber(envVal, fileVal, fallback) {
    const fromEnv = envVal ? Number.parseInt(envVal, 10) : NaN;
    if (Number.isFinite(fromEnv))
        return fromEnv;
    if (fileVal !== undefined && Number.isFinite(fileVal))
        return fileVal;
    return fallback;
}
function asString(v) {
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}
function asNumber(v) {
    if (typeof v === 'number' && Number.isFinite(v))
        return v;
    if (typeof v === 'string') {
        const n = Number.parseInt(v, 10);
        if (Number.isFinite(n))
            return n;
    }
    return undefined;
}
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
