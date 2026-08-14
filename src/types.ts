/**
 * Shared types for dsh-ocgo-usage.
 * @module dsh-ocgo-usage/types
 */

/** One of the three OpenCode Go usage windows. */
export type UsageWindowKind = 'rolling' | 'weekly' | 'monthly'

/** Whether the window is still usable or the account is rate-limited. */
export type UsageStatus = 'ok' | 'rate-limited'

/** One usage window: percent used + seconds until reset. */
export interface UsageWindow {
  /** Window identity. */
  readonly kind: UsageWindowKind
  /** 0–100 integer percent. */
  readonly percent: number
  /** Seconds until the window resets (coarse estimate from the SSR page). */
  readonly resetInSec: number
  /** `rate-limited` when the window is exhausted. */
  readonly status: UsageStatus
}

/** Normalized usage shape shared by every fetch path. */
export interface NormalizedUsage {
  /** Epoch ms of the last successful fetch (data freshness). */
  readonly updatedAt: number
  /** Any window may be missing (new account, no Go subscription). */
  readonly rolling?: UsageWindow
  readonly weekly?: UsageWindow
  readonly monthly?: UsageWindow
}

/** Fully resolved plugin configuration (env + config file + defaults). */
export interface OcgoConfig {
  /** Full `Cookie:` header value (e.g. `auth=Fe26.2*...; oc_locale=zh`). */
  readonly cookie?: string
  /** OpenCode workspace id (e.g. `wrk_01...`). */
  readonly workspaceID?: string
  /** API base URL. */
  readonly baseUrl: string
  /** Cache TTL in seconds, clamped to [60, 3600]. */
  readonly cacheTTL: number
  /** HTTP timeout in milliseconds. */
  readonly timeoutMs: number
}

/** One window serialized for the browser (no session identity). */
export type UsageWindowView = UsageWindow

/** The browser-facing snapshot served by the host JSON endpoint. */
export interface OcgoUsageView {
  /** Epoch ms of the last successful fetch (absent before any success). */
  readonly updatedAt?: number
  readonly rolling?: UsageWindowView
  readonly weekly?: UsageWindowView
  readonly monthly?: UsageWindowView
  /** Machine-readable error code, present only on failure. */
  readonly error?: string
  /** Human-readable failure detail (never contains the cookie). */
  readonly message?: string
}

/** One masked secret field for the browser config editor (never the full value). */
export interface MaskedSecret {
  /** Whether a value is currently set (env or config file). */
  readonly set: boolean
  /** The last 4 characters of the value (full value when ≤ 4 chars). */
  readonly tail: string
}

/** The browser-facing config view: which fields are set, masked. */
export interface MaskedConfigView {
  readonly workspaceID: MaskedSecret
  readonly cookie: MaskedSecret
}
