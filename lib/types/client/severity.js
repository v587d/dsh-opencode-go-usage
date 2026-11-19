/**
 * Severity tiers for the usage chip and its detail panel. One threshold table
 * for both surfaces, so the dot and the number can never disagree.
 * @module dsh-ocgo-usage/client/severity
 */
/** Percent at which a window starts warning. */
export const WARN_AT = 50;
/** Percent at which a window is treated as exhausted. */
export const ERROR_AT = 80;
/**
 * Tier of one usage window.
 * @param window - the window's percent and status.
 * @returns `ok` below {@link WARN_AT}, `err` at or above {@link ERROR_AT} or
 * when the account is rate-limited, `warn` between the two.
 */
export function severityTier(window) {
    if (window.status === 'rate-limited' || window.percent >= ERROR_AT)
        return 'err';
    if (window.percent >= WARN_AT)
        return 'warn';
    return 'ok';
}
