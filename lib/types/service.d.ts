/**
 * dsh-ocgo-usage host service — the cached OpenCode Go usage read.
 * Resolves the config (env + $DSH_HOME/ocgo-usage.json) on every refresh so
 * a changed cookie reaches the next query without a plugin restart, fetches
 * the SSR usage page, and caches the result so the browser readout can poll
 * without spamming opencode.ai.
 * @module dsh-ocgo-usage/service
 */
import { Context, Service } from '@deepseek-ai/cordis';
import type { OcgoUsageView } from './types.ts';
export type { NormalizedUsage, OcgoUsageView, UsageWindow, UsageWindowKind, UsageStatus } from './types.ts';
/** Plugin configuration. */
export interface OcgoUsageConfig {
    /** Master switch for the plugin (host routes + browser readout). */
    enabled?: boolean;
}
/** After a failed fetch, skip further provider queries for this long. */
export declare const FAILURE_COOLDOWN_MS = 60000;
declare module '@deepseek-ai/cordis' {
    interface Context {
        ocgoUsage: OcgoUsageService;
    }
}
/**
 * Cached OpenCode Go usage read. `view()` answers from a fresh cache,
 * otherwise queries the provider (deduped when concurrent). A failed query
 * enters a short cooldown so a broken config is not hammered by the poller.
 */
export declare class OcgoUsageService extends Service {
    private readonly enabled;
    private cached;
    private cachedAt;
    private failureUntilMs;
    private lastError;
    private inflight;
    constructor(ctx: Context, config?: OcgoUsageConfig);
    /** Whether the service answers queries while enabled. */
    isEnabled(): boolean;
    /** Cache TTL from the live config (seconds → ms). */
    private ttlMs;
    /** RPC: most recent usage view. Returns the cached view when it is still
     * fresh, otherwise re-queries the provider (deduped when concurrent). */
    view(): Promise<OcgoUsageView>;
    /** RPC: force a fresh provider query (bypasses the cache window). */
    refresh(): Promise<OcgoUsageView>;
    /**
     * Drop the cached usage, the failure cooldown, and the last error so the
     * next read re-queries with the freshly written config. Called after a
     * config edit.
     */
    invalidateCache(): void;
    private query;
}
//# sourceMappingURL=service.d.ts.map