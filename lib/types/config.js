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
 * Normalize a user-provided cookie string into a valid `Cookie:` header value.
 *
 * Accepts three forms:
 *  1. Full header: "auth=Fe26.2*...; oc_locale=zh"   (passthrough)
 *  2. Single value: "Fe26.2*..."                    (auto-prefix "auth=")
 *  3. Two-segment:  "Fe26.2*...; oc_locale=zh"       (auto-prefix "auth=",
 *                                                       keep oc_locale)
 *
 * Strips leading/trailing whitespace, collapses internal whitespace, and
 * defaults `oc_locale=en` when only the auth value is present.
 */
export function normalizeCookie(input) {
    if (!input)
        return undefined;
    const trimmed = input.trim().replace(/\s+/g, ' ');
    if (!trimmed)
        return undefined;
    const hasAuthPrefix = /^auth=/.test(trimmed);
    const segments = trimmed.split(/;\s*/).filter(Boolean);
    const ocLocale = segments.find((s) => s.startsWith('oc_locale='));
    if (hasAuthPrefix) {
        // Already valid: just ensure oc_locale exists. Re-stitch from
        // segments so any extra whitespace in the original gets normalized.
        const authSeg = (segments.find((s) => s.startsWith('auth=')) ?? segments[0] ?? '').trim();
        const ocSeg = ocLocale ?? 'oc_locale=en';
        return `${authSeg}; ${ocSeg}`;
    }
    // User pasted just the auth value (possibly with oc_locale appended).
    // The first segment is the auth value; prepend "auth=".
    const authValue = (segments[0] ?? '').trim();
    const extras = segments
        .slice(1)
        .map((s) => s.trim())
        .filter(Boolean);
    const ocLocale2 = extras.find((s) => s.startsWith('oc_locale=')) ?? 'oc_locale=en';
    return `auth=${authValue}; ${ocLocale2}`;
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
