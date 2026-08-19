/**
 * HTTP fetch + response adapters for dsh-ocgo-usage
 *
 * Cookie path (current): GET /workspace/<wrk>/go HTML SSR scrape.
 * The opencode.ai dashboard renders usage values inline in
 * `data-slot="usage-item"` blocks; this is the only cookie-authenticated
 * way to read usage today. (The proposed official API from
 * anomalyco/opencode#16513 is not merged yet; when it ships, an apikey
 * path can be added behind the same `NormalizedUsage` shape.)
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
/** Text fetch with structured errors (cookie SSR path). */
async function safeFetchText(url, headers, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers,
            signal: controller.signal,
        });
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
/** Fetch usage through the cookie path. Throws UsageError on any failure. */
export async function fetchViaCookie(cfg) {
    if (!cfg.cookie || !cfg.workspaceID) {
        throw new UsageError('Missing cookie or workspaceID for cookie path', 'noconfig');
    }
    const url = `${cfg.baseUrl}/workspace/${encodeURIComponent(cfg.workspaceID)}/go`;
    const html = await safeFetchText(url, { Cookie: cfg.cookie, Accept: 'text/html' }, cfg.timeoutMs);
    const parsed = fromSSRHTML(html);
    // The page 302-redirects to the login page when the cookie is invalid;
    // that page parses as empty, which is indistinguishable from "no windows".
    // Only report success when at least one window was found.
    if (parsed.rolling === undefined && parsed.weekly === undefined && parsed.monthly === undefined) {
        throw new UsageError('Usage page parsed empty (cookie expired or invalid?)', 'http302');
    }
    return parsed;
}
/**
 * Parse the opencode console SSR HTML page and extract the three usage
 * windows. Reset times are emitted as English phrases inside
 * `data-slot="reset-time"` (e.g. "Resets in 2 hours 29 minutes"). We parse
 * them into a coarse `resetInSec` estimate; precise second-level resets are
 * not needed for display.
 */
export function fromSSRHTML(html) {
    // Each usage-item is a `<div data-slot="usage-item">...</div>` block, but
    // the markup inside may itself contain nested divs (usage-header,
    // progress bar, ...). Instead of trying to find the block's closing tag
    // with a regex, we slice between consecutive item start tags — that keeps
    // the whole block (including any nested divs) in one piece.
    const itemStartRe = /<div[^>]*data-slot="usage-item"/g;
    const starts = [];
    let startMatch = itemStartRe.exec(html);
    while (startMatch !== null) {
        starts.push(startMatch.index);
        startMatch = itemStartRe.exec(html);
    }
    const items = [];
    for (let i = 0; i < starts.length; i++) {
        const block = html.slice(starts[i], starts[i + 1] ?? html.length);
        const labelMatch = block.match(/data-slot="usage-label"[^>]*>([^<]+)</);
        const valueMatch = block.match(/data-slot="usage-value"[\s\S]*?<!--\$-->\s*(\d+)\s*<!--\/-->/);
        // The page renders the reset phrase in the UI locale — "Resets in"
        // (en) or "重置于" (zh) — so accept both.
        const resetMatch = block.match(/data-slot="reset-time"[\s\S]*?(?:Resets in|重置于)(?:<!--\/-->\s*)?([\s\S]*?)(?:<!--\/-->|<\/span>)/);
        if (!labelMatch || !valueMatch)
            continue;
        const label = labelMatch[1]?.trim() ?? '';
        const percent = Number.parseInt(valueMatch[1] ?? '0', 10);
        const resetsIn = resetMatch ? stripHtmlComments(resetMatch[1] ?? '').trim() : '';
        items.push({ label, percent, resetsIn });
    }
    const result = {};
    for (const item of items) {
        const kind = labelToKind(item.label);
        if (!kind)
            continue;
        result[kind] = {
            kind,
            percent: clampPercent(item.percent),
            resetInSec: parseDurationToSec(item.resetsIn),
            status: item.percent >= 100 ? 'rate-limited' : 'ok',
        };
    }
    return result;
}
function labelToKind(label) {
    const lower = label.toLowerCase();
    // English labels ("Rolling Usage", "Weekly Usage", "Monthly Usage").
    if (lower.startsWith('rolling'))
        return 'rolling';
    if (lower.startsWith('weekly'))
        return 'weekly';
    if (lower.startsWith('monthly'))
        return 'monthly';
    // Chinese labels rendered for zh locale ("滚动用量", "每周用量", "每月用量").
    if (lower.startsWith('滚动'))
        return 'rolling';
    if (lower.startsWith('每周'))
        return 'weekly';
    if (lower.startsWith('每月'))
        return 'monthly';
    return undefined;
}
/** Strip SolidStart HTML comments `<!-- ... -->` from a string. */
function stripHtmlComments(s) {
    return s.replace(/<!--[\s\S]*?-->/g, '').trim();
}
/**
 * Parse a human duration phrase into seconds. Examples (English plus the
 * Chinese renderings used by the zh locale):
 *   "2 hours 29 minutes" → 8940      "2 小时 29 分钟" → 8940
 *   "45 minutes"          → 2700     "45 分钟"         → 2700
 *   "5 days"              → 432000   "5 天"            → 432000
 *   "30 seconds"          → 30       "30 秒"           → 30
 *   "1 week"              → 604800   "1 周"            → 604800
 *   "1 month"             → 2592000  "1 个月"          → 2592000
 *   "1 year"              → 31536000 "1 年"            → 31536000
 *
 * Returns 0 on unrecognized input.
 */
export function parseDurationToSec(phrase) {
    if (!phrase)
        return 0;
    // Defensive: SolidStart may leave `<!--/-->` markers inside the captured
    // reset phrase; strip them before matching (see stripHtmlComments).
    const cleaned = phrase.replace(/<!--[\s\S]*?-->/g, ' ');
    const p = cleaned.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!p)
        return 0;
    const re = /(\d+)\s*(?:个\s*)?(second|minute|hour|day|week|month|year|秒|分钟|小时|天|周|月|年)s?/g;
    let total = 0;
    let matched = false;
    let m = re.exec(p);
    while (m !== null) {
        const n = Number.parseInt(m[1] ?? '0', 10);
        const unit = m[2] ?? '';
        matched = true;
        switch (unit) {
            case 'second':
            case '秒':
                total += n;
                break;
            case 'minute':
            case '分钟':
                total += n * 60;
                break;
            case 'hour':
            case '小时':
                total += n * 3600;
                break;
            case 'day':
            case '天':
                total += n * 86400;
                break;
            case 'week':
            case '周':
                total += n * 604800;
                break;
            case 'month':
            case '月':
                total += n * 2592000; // 30 days; coarse but adequate for display
                break;
            case 'year':
            case '年':
                total += n * 31536000;
                break;
        }
        m = re.exec(p);
    }
    return matched ? total : 0;
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
