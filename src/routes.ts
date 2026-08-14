/**
 * dsh-ocgo-usage HTTP routes — the browser half talks to the host through
 * plain same-origin JSON endpoints (`/api/ocgo-usage` and
 * `/api/ocgo-usage/refresh`), which the host answers from the cached
 * OpenCode Go usage read. The client never sees the cookie.
 * @module dsh-ocgo-usage/routes
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import type { OcgoUsageService, OcgoUsageView } from './service.ts'

/** Browser-facing base path of the usage API. */
export const OCGO_API_PREFIX = '/api/ocgo-usage'

/** Write one JSON response. */
function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** Require the method or answer 405. */
function requireMethod(req: IncomingMessage, res: ServerResponse, method: string): boolean {
  if (req.method === method) return true
  json(res, 405, { ok: false, error: 'method-not-allowed' })
  return false
}

/** Wrap one async usage read as a GET JSON route. */
function getRoute(path: string, run: () => Promise<OcgoUsageView>): WebRoute {
  return {
    kind: 'exact',
    path,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (!requireMethod(req, res, 'GET')) return
      Promise.resolve(run()).then((value) => json(res, 200, value), (error) => {
        json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      })
    },
  }
}

/** Build the full usage API route family for one service. */
export function makeOcgoRoutes(service: OcgoUsageService): WebRoute[] {
  return [
    getRoute(OCGO_API_PREFIX, () => service.view()),
    getRoute(`${OCGO_API_PREFIX}/refresh`, () => service.refresh()),
  ]
}
