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
import type { MaskedConfigView, MaskedSecret, OcgoConfig } from './types.ts';
export declare const ENV_COOKIE = "OPENCODE_GO_COOKIE";
export declare const ENV_WORKSPACE_ID = "OPENCODE_GO_WORKSPACE_ID";
export declare const ENV_BASE_URL = "OPENCODE_GO_BASE_URL";
export declare const ENV_CACHE_TTL = "OPENCODE_GO_CACHE_TTL";
export declare const ENV_TIMEOUT_MS = "OPENCODE_GO_TIMEOUT_MS";
export declare const DEFAULT_BASE_URL = "https://opencode.ai";
export declare const DEFAULT_CACHE_TTL = 300;
export declare const DEFAULT_TIMEOUT_MS = 20000;
export declare const MIN_CACHE_TTL = 60;
export declare const MAX_CACHE_TTL = 3600;
/** Resolve the DSH home directory ($DSH_HOME or ~/.dsh). */
export declare function dshHome(): string;
/** Resolved location of the plugin config file. */
export declare function configFilePath(): string;
/**
 * Load and merge config from file + env vars.
 * Returns a fully resolved OcgoConfig; never throws.
 */
export declare function loadConfig(): OcgoConfig;
/** Mask the last 4 characters of a secret for the browser (full value when ≤ 4 chars). */
export declare function maskSecret(value: string | undefined): MaskedSecret;
/** The browser-facing masked config view (never reveals the full cookie). */
export declare function maskedConfigView(): MaskedConfigView;
/**
 * Write the cookie into the config file (preserving any other fields),
 * chmod 600, and return the updated masked view. The value is normalized like
 * env input (a bare token gets `auth=` prefixed). An absent field is left
 * untouched; pass `null` to clear it.
 */
export declare function writeConfigFile(partial: {
    cookie?: string | null;
    workspaceID?: string | null;
}): MaskedConfigView;
/**
 * Normalize a user-provided cookie string into the `Cookie:` header value the
 * console API read sends.
 *
 * Accepts the whole header as a browser copies it (`oc_locale=zh;
 * desktop_promo_dismissed=1; auth=Fe26.2*...`), the bare `auth` pair, or the
 * bare opaque token. Then:
 *  - The `auth=` pair is located anywhere in the string — assuming the first
 *    segment is the token corrupted such headers into `auth=oc_locale=zh`, a
 *    fake cookie the site rejects.
 *  - Every other pair the paste carried is KEPT: the console validates its own
 *    cookie set, so dropping pairs the browser sends can fail authentication
 *    for reasons this plugin cannot predict. Unknown pairs are inert.
 *
 * @param input - the pasted cookie header or token.
 * @returns a `Cookie:` header value, or undefined when no auth token can be
 * found (the caller refuses to persist a broken cookie rather than fabricating
 * one).
 */
export declare function normalizeCookie(input: string | undefined): string | undefined;
//# sourceMappingURL=config.d.ts.map