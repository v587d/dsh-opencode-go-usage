/**
 * dsh-ocgo-usage HTTP routes — the browser half talks to the host through
 * plain same-origin JSON endpoints (`/api/ocgo-usage`, `/api/ocgo-usage/refresh`
 * and the config editor `/api/ocgo-usage/config`), which the host answers from
 * the cached OpenCode Go usage read. The client never sees the cookie — the
 * config editor serves only masked tails and accepts new values to write.
 * @module dsh-ocgo-usage/routes
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import { maskedConfigView, writeConfigFile } from './config.ts'
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

/** Read a bounded JSON request body. */
function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 64 * 1024) {
        reject(new Error('body-too-large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (raw.length === 0) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw) as unknown)
      } catch {
        reject(new Error('bad-json'))
      }
    })
    req.on('error', reject)
  })
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

/**
 * The config editor routes: GET the masked view, POST new values to write.
 * A successful write invalidates the usage cache so the next poll re-queries
 * with the fresh cookie/workspace immediately (bypassing any cooldown).
 */
function makeConfigRoutes(service: OcgoUsageService): WebRoute[] {
  const read = (): unknown => maskedConfigView()
  const write = async (req: IncomingMessage): Promise<unknown> => {
    const body = (await readJsonBody(req)) as { cookie?: unknown; workspaceID?: unknown }
    const view = writeConfigFile({
      cookie: typeof body.cookie === 'string' ? body.cookie : null,
      workspaceID: typeof body.workspaceID === 'string' ? body.workspaceID : null,
    })
    service.invalidateCache()
    return view
  }
  return [
    {
      kind: 'exact',
      path: `${OCGO_API_PREFIX}/config`,
      handler: (req: IncomingMessage, res: ServerResponse): void => {
        if (req.method === 'GET') {
          Promise.resolve(read()).then((value) => json(res, 200, value), (error) => {
            json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
          })
          return
        }
        if (req.method === 'POST') {
          Promise.resolve(write(req)).then((value) => json(res, 200, value), (error) => {
            json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
          })
          return
        }
        json(res, 405, { ok: false, error: 'method-not-allowed' })
      },
    },
  ]
}

/** Build the full usage API route family for one service. */
export function makeOcgoRoutes(service: OcgoUsageService): WebRoute[] {
  return [
    getRoute(OCGO_API_PREFIX, () => service.view()),
    getRoute(`${OCGO_API_PREFIX}/refresh`, () => service.refresh()),
    ...makeConfigRoutes(service),
  ]
}
