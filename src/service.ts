/**
 * dsh-ocgo-usage host service — the cached OpenCode Go usage read.
 * Resolves the config (env + $DSH_HOME/ocgo-usage.json) on every refresh so
 * a changed cookie reaches the next query without a plugin restart, fetches
 * the SSR usage page, and caches the result so the browser readout can poll
 * without spamming opencode.ai.
 *
 * Provider visibility is resolved here on the host, in-process (reading the
 * session's request header or the default model selection) and returned with
 * every view — so a poll costs one lightweight JSON round trip and never a
 * model-catalog build.
 * @module dsh-ocgo-usage/service
 */

import { Context, Service } from '@deepseek-ai/cordis'
import { fetchUsage, UsageError } from './api.ts'
import { loadConfig } from './config.ts'
import type { NormalizedUsage, OcgoUsageView } from './types.ts'

export type { NormalizedUsage, OcgoUsageView, UsageWindow, UsageWindowKind, UsageStatus } from './types.ts'

/** Plugin configuration. */
export interface OcgoUsageConfig {
  /** Master switch for the plugin (host routes + browser readout). */
  enabled?: boolean
}

/** After a failed fetch, skip further provider queries for this long. */
export const FAILURE_COOLDOWN_MS = 60_000

declare module '@deepseek-ai/cordis' {
  interface Context {
    ocgoUsage: OcgoUsageService
  }
}

/** The provider whose model selection shows the chip. */
export const OCGO_PROVIDER = 'opencode-go'

/** True when a provider/model means "show OpenCode Go usage". */
export function isOpenCodeGo(provider: string | undefined): boolean {
  return provider === OCGO_PROVIDER || provider?.startsWith(`${OCGO_PROVIDER}/`) === true
}

/**
 * Cached OpenCode Go usage read. `view()` answers from a fresh cache,
 * otherwise queries the provider (deduped when concurrent). A failed query
 * enters a short cooldown so a broken config is not hammered by the poller.
 */
export class OcgoUsageService extends Service {
  private readonly enabled: boolean
  private cached: NormalizedUsage | undefined
  private cachedAt = 0
  private failureUntilMs = 0
  private lastError: Omit<OcgoUsageView, 'visible'> | undefined
  private inflight: Promise<Omit<OcgoUsageView, 'visible'>> | undefined

  constructor(ctx: Context, config: OcgoUsageConfig = {}) {
    super(ctx, 'ocgoUsage')
    this.enabled = config.enabled ?? true
  }

  /** Whether the service answers queries while enabled. */
  isEnabled(): boolean {
    return this.enabled
  }

  /** Cache TTL from the live config (seconds → ms). */
  private ttlMs(): number {
    return loadConfig().cacheTTL * 1000
  }

  /** The current session's model provider, or the deployment default. Never builds the model catalog. */
  private providerFor(sessionId: string | undefined): string | undefined {
    if (sessionId === undefined) return undefined
    const sessions = this.ctx.get('sessions') as
      | { get(id: string): { requestHeader(): { config?: { provider?: string } } | undefined } | undefined }
      | undefined
    const logged = sessions?.get(sessionId)?.requestHeader()?.config?.provider
    if (logged !== undefined && logged.length > 0) return logged
    const defaults = this.ctx.get('agentDefaultModel') as
      | { currentSelection(): { provider: string } }
      | undefined
    return defaults?.currentSelection()?.provider
  }

  /** Resolve the browser-facing view for a session (visible + cached/refreshed usage). */
  async view(sessionId: string | undefined): Promise<OcgoUsageView> {
    if (!this.enabled) {
      return { visible: false, error: 'disabled', message: 'The ocgo-usage plugin is disabled.' }
    }
    const base = await this.readBase()
    return { ...base, visible: isOpenCodeGo(this.providerFor(sessionId)) }
  }

  /** RPC: force a fresh provider query (bypasses the cache window). */
  async refresh(sessionId: string | undefined): Promise<OcgoUsageView> {
    if (!this.enabled) {
      return { visible: false, error: 'disabled', message: 'The ocgo-usage plugin is disabled.' }
    }
    const base = await this.query()
    return { ...base, visible: isOpenCodeGo(this.providerFor(sessionId)) }
  }

  /** The usage read: fresh cache when available, else a provider query. */
  private async readBase(): Promise<Omit<OcgoUsageView, 'visible'>> {
    const now = Date.now()
    if (this.cached !== undefined && now - this.cachedAt < this.ttlMs()) {
      return toView(this.cached)
    }
    // Failure cooldown: keep serving the last known error without a fetch.
    if (now < this.failureUntilMs) {
      return this.lastError ?? { error: 'fetch', message: 'Unknown failure' }
    }
    if (this.inflight !== undefined) return this.inflight
    this.inflight = this.query().then((view) => {
      if (view.error === undefined) {
        // Success: remember the normalized payload for the cooldown window.
        this.lastError = undefined
      } else {
        this.lastError = view
        this.failureUntilMs = Date.now() + FAILURE_COOLDOWN_MS
      }
      return view
    }).finally(() => {
      this.inflight = undefined
    })
    return this.inflight
  }

  private async query(): Promise<Omit<OcgoUsageView, 'visible'>> {
    try {
      const data = await fetchUsage(loadConfig())
      this.cached = data
      this.cachedAt = Date.now()
      return toView(data)
    } catch (error) {
      return errorView(error)
    }
  }
}

/** Map a UsageError (or any error) to a browser-safe view. */
function errorView(error: unknown): Omit<OcgoUsageView, 'visible'> {
  if (error instanceof UsageError) {
    return { error: error.code, message: error.message }
  }
  const message = error instanceof Error ? error.message : String(error)
  return { error: 'fetch', message }
}

/** Convert the internal normalized shape into the browser view. */
function toView(data: NormalizedUsage): Omit<OcgoUsageView, 'visible'> {
  return {
    updatedAt: data.updatedAt,
    ...(data.rolling === undefined ? {} : { rolling: data.rolling }),
    ...(data.weekly === undefined ? {} : { weekly: data.weekly }),
    ...(data.monthly === undefined ? {} : { monthly: data.monthly }),
  }
}
