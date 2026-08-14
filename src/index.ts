/**
 * dsh-opencode-go-usage host half — mounts the usage service and its HTTP routes.
 * The browser half (the `./client` entry) reads the three OpenCode Go usage
 * windows (rolling 5h / weekly / monthly) through the same-origin
 * `/api/ocgo-usage` JSON endpoints. Install via
 * `dsh plugin --profile web add <path-or-git-url>`; the cordis.patch.yml
 * inserts this plugin row.
 * @module dsh-opencode-go-usage
 */

import { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { makeOcgoRoutes } from './routes.ts'
import { OcgoUsageService, type OcgoUsageConfig } from './service.ts'

export { OcgoUsageService } from './service.ts'
export type { OcgoUsageConfig, OcgoUsageView } from './service.ts'
export { OCGO_API_PREFIX, makeOcgoRoutes } from './routes.ts'
export { loadConfig, normalizeCookie, configFilePath } from './config.ts'
export type { NormalizedUsage, OcgoConfig, UsageWindow, UsageWindowKind, UsageStatus } from './types.ts'
export { fetchUsage, fromSSRHTML, parseDurationToSec, UsageError } from './api.ts'

/** Stable cordis plugin name (matches cordis.patch.yml insert id). */
export const name = 'ocgo-usage'

/** Services required before the usage service can answer. */
export const inject = ['webServer']

/** Register the usage service and its API routes on the context. */
export function apply(ctx: Context, config: OcgoUsageConfig = {}): void {
  const service = new OcgoUsageService(ctx, config)

  // The routes are registered while the plugin is enabled.
  const routes = makeOcgoRoutes(service)
  ctx.effect(
    () => {
      const disposers = routes.map((route) => ctx.webServer.register(route))
      return () => {
        for (const dispose of disposers) dispose()
      }
    },
    'ocgo-usage: routes',
  )
}
