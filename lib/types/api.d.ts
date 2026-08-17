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
import type { NormalizedUsage, OcgoConfig } from './types.ts';
/** Error thrown by the HTTP / parsing layer; carries a short code for the UI. */
export declare class UsageError extends Error {
    readonly code: string;
    readonly name = "UsageError";
    constructor(message: string, code: string);
}
/** Fetch usage through the cookie path. Throws UsageError on any failure. */
export declare function fetchViaCookie(cfg: OcgoConfig): Promise<Omit<NormalizedUsage, 'updatedAt'>>;
/**
 * Parse the opencode console SSR HTML page and extract the three usage
 * windows. Reset times are emitted as English phrases inside
 * `data-slot="reset-time"` (e.g. "Resets in 2 hours 29 minutes"). We parse
 * them into a coarse `resetInSec` estimate; precise second-level resets are
 * not needed for display.
 */
export declare function fromSSRHTML(html: string): Omit<NormalizedUsage, 'updatedAt'>;
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
export declare function parseDurationToSec(phrase: string): number;
/**
 * Fetch usage with the current config (cookie path only today) and stamp
 * the fetch timestamp so the UI can show data freshness.
 */
export declare function fetchUsage(cfg: OcgoConfig): Promise<NormalizedUsage>;
//# sourceMappingURL=api.d.ts.map