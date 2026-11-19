/**
 * HTTP fetch + response adapters for dsh-ocgo-usage
 *
 * Cookie path: GET /console/api/go/status on the opencode.ai console. The
 * console answers JSON — `access.meters.{fiveHour,week,month}` each carry
 * `limitMicroCents`, `usedMicroCents` and `resetsAt` — so the read is a
 * plain authenticated GET, not a page scrape.
 *
 * Adapted from pi-ocgo-usage/src/api.ts.
 * @module dsh-ocgo-usage/api
 */
// ============================================================================
// Errors
// ============================================================================
/** Error thrown by the HTTP / parsing layer; carries a short code for the UI. */
export class UsageError extends Error {
    code;
    name = 'UsageError';
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
// ============================================================================
// HTTP wrapper
// ============================================================================
/** Text fetch with structured errors (cookie console path). */
async function safeFetchText(url, headers, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers,
            signal: controller.signal,
            redirect: 'manual',
        });
        if (res.status === 401 || res.status === 403) {
            throw new UsageError('Console API rejected the cookie (expired or revoked?)', 'auth');
        }
        if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) {
            throw new UsageError('Console API redirected to sign-in (cookie expired or revoked?)', 'auth');
        }
        if (!res.ok) {
            throw new UsageError(`HTTP ${res.status} for ${sanitizeUrl(url)}`, `http${res.status}`);
        }
        return await res.text();
    }
    catch (e) {
        if (e instanceof UsageError)
            throw e;
        if (e instanceof Error && e.name === 'AbortError') {
            throw new UsageError(`Request timed out after ${timeoutMs}ms`, 'timeout');
        }
        throw new UsageError(String(e instanceof Error ? e.message : e), 'fetch');
    }
    finally {
        clearTimeout(timer);
    }
}
/** Strip query params from a URL for safe error messages. */
function sanitizeUrl(url) {
    try {
        const u = new URL(url);
        return `${u.protocol}//${u.host}${u.pathname}`;
    }
    catch {
        return url;
    }
}
// ============================================================================
// Cookie path: GET /console/api/go/status (console JSON API)
// ============================================================================
/** Console API path of the Go subscription status read. */
export const GO_STATUS_PATH = '/console/api/go/status';
/**
 * Fetch usage through the cookie path. The console scopes the read to the
 * workspace named by `x-org-id`; without that header the endpoint answers
 * 400, before it ever gets to the account's meters.
 */
export async function fetchViaCookie(cfg) {
    if (!cfg.cookie || !cfg.workspaceID) {
        throw new UsageError('Missing cookie or workspace id for the console status read', 'noconfig');
    }
    const url = `${cfg.baseUrl}${GO_STATUS_PATH}`;
    const body = await safeFetchText(url, {
        Cookie: cfg.cookie,
        Accept: 'application/json',
        'x-org-id': cfg.workspaceID,
    }, cfg.timeoutMs);
    let parsed;
    try {
        parsed = JSON.parse(body);
    }
    catch {
        throw new UsageError('Console status read did not answer JSON', 'protocol');
    }
    return fromConsoleStatus(parsed);
}
/**
 * Map a console status read onto the three usage windows. The console calls
 * the windows `fiveHour`, `week` and `month`; the chip's names are rolling,
 * weekly and monthly.
 * @param status - the decoded status body (`null` without a subscription).
 * @returns the windows the body carries.
 * @throws {UsageError} when the account has no Go subscription.
 */
export function fromConsoleStatus(status) {
    const meters = status?.access?.meters;
    if (meters === undefined) {
        throw new UsageError('No OpenCode Go subscription on this account', 'nosub');
    }
    const result = {};
    if (meters.fiveHour !== undefined)
        result.rolling = toWindow('rolling', meters.fiveHour);
    if (meters.week !== undefined)
        result.weekly = toWindow('weekly', meters.week);
    if (meters.month !== undefined)
        result.monthly = toWindow('monthly', meters.month);
    return result;
}
/** One meter as a UsageWindow: percent used plus seconds until it resets. */
function toWindow(kind, meter) {
    const percent = meter.limitMicroCents > 0
        ? clampPercent((meter.usedMicroCents / meter.limitMicroCents) * 100)
        : 0;
    const resetsAt = Date.parse(meter.resetsAt);
    const resetInSec = Number.isFinite(resetsAt)
        ? Math.max(0, Math.round((resetsAt - Date.now()) / 1000))
        : 0;
    return { kind, percent, resetInSec, status: percent >= 100 ? 'rate-limited' : 'ok' };
}
// ============================================================================
// Orchestrator
// ============================================================================
/**
 * Fetch usage with the current config (cookie path only today) and stamp
 * the fetch timestamp so the UI can show data freshness.
 */
export async function fetchUsage(cfg) {
    const data = await fetchViaCookie(cfg);
    return { ...data, updatedAt: Date.now() };
}
// ============================================================================
// Internal helpers
// ============================================================================
function clampPercent(n) {
    if (n === undefined)
        return 0;
    return Math.max(0, Math.min(100, Math.floor(n)));
}
