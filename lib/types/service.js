/**
 * dsh-ocgo-usage host service — the cached OpenCode Go usage read.
 * Resolves the config (env + $DSH_HOME/ocgo-usage.json) on every refresh so
 * a changed cookie reaches the next query without a plugin restart, fetches
 * the SSR usage page, and caches the result so the browser readout can poll
 * without spamming opencode.ai.
 * @module dsh-ocgo-usage/service
 */
import { Service } from '@deepseek-ai/cordis';
import { fetchUsage, UsageError } from "./api.js";
import { loadConfig } from "./config.js";
/** After a failed fetch, skip further provider queries for this long. */
export const FAILURE_COOLDOWN_MS = 60_000;
/** Map a UsageError (or any error) to a browser-safe view. */
function errorView(error) {
    if (error instanceof UsageError) {
        return { error: error.code, message: error.message };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { error: 'fetch', message };
}
/**
 * Cached OpenCode Go usage read. `view()` answers from a fresh cache,
 * otherwise queries the provider (deduped when concurrent). A failed query
 * enters a short cooldown so a broken config is not hammered by the poller.
 */
export class OcgoUsageService extends Service {
    enabled;
    cached;
    cachedAt = 0;
    failureUntilMs = 0;
    lastError;
    inflight;
    constructor(ctx, config = {}) {
        super(ctx, 'ocgoUsage');
        this.enabled = config.enabled ?? true;
    }
    /** Whether the service answers queries while enabled. */
    isEnabled() {
        return this.enabled;
    }
    /** Cache TTL from the live config (seconds → ms). */
    ttlMs() {
        return loadConfig().cacheTTL * 1000;
    }
    /** RPC: most recent usage view. Returns the cached view when it is still
     * fresh, otherwise re-queries the provider (deduped when concurrent). */
    async view() {
        if (!this.enabled)
            return { error: 'disabled', message: 'The ocgo-usage plugin is disabled.' };
        const now = Date.now();
        if (this.cached !== undefined && now - this.cachedAt < this.ttlMs()) {
            return toView(this.cached);
        }
        // Failure cooldown: keep serving the last known error without a fetch.
        if (now < this.failureUntilMs) {
            return this.lastError ?? { error: 'fetch', message: 'Unknown failure' };
        }
        if (this.inflight !== undefined)
            return this.inflight;
        this.inflight = this.query().then((view) => {
            if (view.error === undefined) {
                // Success: remember the normalized payload for the cooldown window.
                this.lastError = undefined;
            }
            else {
                this.lastError = view;
                this.failureUntilMs = Date.now() + FAILURE_COOLDOWN_MS;
            }
            return view;
        }).finally(() => {
            this.inflight = undefined;
        });
        return this.inflight;
    }
    /** RPC: force a fresh provider query (bypasses the cache window). */
    async refresh() {
        if (!this.enabled)
            return { error: 'disabled', message: 'The ocgo-usage plugin is disabled.' };
        const view = await this.query();
        if (view.error === undefined) {
            this.lastError = undefined;
            this.failureUntilMs = 0;
        }
        else {
            this.lastError = view;
            this.failureUntilMs = Date.now() + FAILURE_COOLDOWN_MS;
        }
        return view;
    }
    /**
     * Drop the cached usage, the failure cooldown, and the last error so the
     * next read re-queries with the freshly written config. Called after a
     * config edit.
     */
    invalidateCache() {
        this.cached = undefined;
        this.cachedAt = 0;
        this.failureUntilMs = 0;
        this.lastError = undefined;
    }
    async query() {
        try {
            const data = await fetchUsage(loadConfig());
            this.cached = data;
            this.cachedAt = Date.now();
            return toView(data);
        }
        catch (error) {
            return errorView(error);
        }
    }
}
/** Convert the internal normalized shape into the browser view. */
function toView(data) {
    return {
        updatedAt: data.updatedAt,
        ...(data.rolling === undefined ? {} : { rolling: data.rolling }),
        ...(data.weekly === undefined ? {} : { weekly: data.weekly }),
        ...(data.monthly === undefined ? {} : { monthly: data.monthly }),
    };
}
