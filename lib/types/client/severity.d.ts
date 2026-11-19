/**
 * Severity tiers for the usage chip and its detail panel. One threshold table
 * for both surfaces, so the dot and the number can never disagree.
 * @module dsh-ocgo-usage/client/severity
 */
import type { UsageWindow } from '../types.ts';
/** How alarmed one window should look: fine, getting close, or out. */
export type SeverityTier = 'ok' | 'warn' | 'err';
/** Percent at which a window starts warning. */
export declare const WARN_AT = 50;
/** Percent at which a window is treated as exhausted. */
export declare const ERROR_AT = 80;
/**
 * Tier of one usage window.
 * @param window - the window's percent and status.
 * @returns `ok` below {@link WARN_AT}, `err` at or above {@link ERROR_AT} or
 * when the account is rate-limited, `warn` between the two.
 */
export declare function severityTier(window: Pick<UsageWindow, 'percent' | 'status'>): SeverityTier;
//# sourceMappingURL=severity.d.ts.map