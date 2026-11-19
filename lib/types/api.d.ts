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
import type { NormalizedUsage, OcgoConfig } from './types.ts';
/** Error thrown by the HTTP / parsing layer; carries a short code for the UI. */
export declare class UsageError extends Error {
    readonly code: string;
    readonly name = "UsageError";
    constructor(message: string, code: string);
}
/** Console API path of the Go subscription status read. */
export declare const GO_STATUS_PATH = "/console/api/go/status";
/**
 * One Go usage meter as the console reports it. Amounts are micro-cents, so a
 * window's percentage is `usedMicroCents / limitMicroCents`; `resetsAt` is an
 * ISO timestamp.
 */
export interface GoMeter {
    readonly startsAt?: string;
    readonly resetsAt: string;
    readonly limitMicroCents: number;
    readonly usedMicroCents: number;
}
/** The `access.meters` block: the three windows the console renders. */
export interface GoMeters {
    readonly fiveHour?: GoMeter;
    readonly week?: GoMeter;
    readonly month?: GoMeter;
}
/** Go subscription status body; `null` when the account has no subscription. */
export interface GoStatus {
    readonly access?: {
        readonly endsAt?: string | null;
        readonly meters?: GoMeters;
    } | null;
}
/**
 * Fetch usage through the cookie path. The console scopes the read to the
 * workspace named by `x-org-id`; without that header the endpoint answers
 * 400, before it ever gets to the account's meters.
 */
export declare function fetchViaCookie(cfg: OcgoConfig): Promise<Omit<NormalizedUsage, 'updatedAt'>>;
/**
 * Map a console status read onto the three usage windows. The console calls
 * the windows `fiveHour`, `week` and `month`; the chip's names are rolling,
 * weekly and monthly.
 * @param status - the decoded status body (`null` without a subscription).
 * @returns the windows the body carries.
 * @throws {UsageError} when the account has no Go subscription.
 */
export declare function fromConsoleStatus(status: GoStatus | null): Omit<NormalizedUsage, 'updatedAt'>;
/**
 * Fetch usage with the current config (cookie path only today) and stamp
 * the fetch timestamp so the UI can show data freshness.
 */
export declare function fetchUsage(cfg: OcgoConfig): Promise<NormalizedUsage>;
//# sourceMappingURL=api.d.ts.map