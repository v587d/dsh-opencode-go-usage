/**
 * Unit tests for the console status read and its mapping onto the chip windows.
 * @module dsh-ocgo-usage/api.test
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchViaCookie, fromConsoleStatus, UsageError } from './api.ts'
import type { OcgoConfig } from './types.ts'

describe('fromConsoleStatus', () => {
  /** Build one console meter whose window resets in `hours` from now. */
  function meter(hours: number, limit: number, used: number) {
    return {
      resetsAt: new Date(Date.now() + hours * 3600_000).toISOString(),
      limitMicroCents: limit,
      usedMicroCents: used,
    }
  }

  it('maps the console fiveHour/week/month meters onto the chip windows', () => {
    const usage = fromConsoleStatus({
      access: {
        meters: {
          fiveHour: meter(2, 10_000_000, 2_300_000),
          week: meter(96, 100_000_000, 80_000_000),
          month: meter(290, 500_000_000, 500_000_000),
        },
      },
    })
    expect(usage.rolling).toEqual({ kind: 'rolling', percent: 23, resetInSec: 7200, status: 'ok' })
    expect(usage.weekly?.percent).toBe(80)
    expect(usage.weekly?.status).toBe('ok')
    expect(usage.monthly?.percent).toBe(100)
    expect(usage.monthly?.status).toBe('rate-limited')
  })

  it('omits a meter the body does not carry', () => {
    const usage = fromConsoleStatus({ access: { meters: { week: meter(24, 1000, 100) } } })
    expect(usage.rolling).toBeUndefined()
    expect(usage.monthly).toBeUndefined()
    expect(usage.weekly?.percent).toBe(10)
  })

  it('treats an empty limit and a past reset as zero', () => {
    const usage = fromConsoleStatus({
      access: {
        meters: { fiveHour: { resetsAt: new Date(Date.now() - 60_000).toISOString(), limitMicroCents: 0, usedMicroCents: 5 } },
      },
    })
    expect(usage.rolling).toEqual({ kind: 'rolling', percent: 0, resetInSec: 0, status: 'ok' })
  })

  it('reports nosub for a null body or a body without meters', () => {
    for (const body of [null, {}, { access: null }, { access: {} }]) {
      expect(() => fromConsoleStatus(body)).toThrowError(UsageError)
      try {
        fromConsoleStatus(body)
      } catch (error) {
        expect((error as UsageError).code).toBe('nosub')
      }
    }
  })
})

describe('fetchViaCookie', () => {
  const cfg: OcgoConfig = {
    cookie: 'auth=Fe26.2*test',
    workspaceID: 'wrk_test',
    baseUrl: 'https://opencode.ai',
    cacheTTL: 300,
    timeoutMs: 20_000,
  }

  afterEach(() => { vi.restoreAllMocks() })

  it('reads the console status endpoint with the workspace header and maps the body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      access: { meters: { fiveHour: { resetsAt: new Date(Date.now() + 3600_000).toISOString(), limitMicroCents: 100, usedMicroCents: 40 } } },
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    const usage = await fetchViaCookie(cfg)
    expect(usage.rolling?.percent).toBe(40)
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe('https://opencode.ai/console/api/go/status')
    expect((fetchSpy.mock.calls[0]?.[1] as RequestInit).headers).toMatchObject({ 'x-org-id': 'wrk_test' })
  })

  it('maps a 400 (missing workspace context) to the http400 code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Bad Request', { status: 400 }))
    await expect(fetchViaCookie(cfg)).rejects.toMatchObject({ code: 'http400' })
  })

  it('maps a rejected cookie to the auth code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"_tag":"Unauthorized"}', { status: 401 }))
    await expect(fetchViaCookie(cfg)).rejects.toMatchObject({ code: 'auth' })
  })

  it('maps a sign-in redirect to the auth code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 302, headers: { location: '/console/login' } }))
    await expect(fetchViaCookie(cfg)).rejects.toMatchObject({ code: 'auth' })
  })

  it('reports a missing cookie or workspace id before any request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await expect(fetchViaCookie({ ...cfg, cookie: undefined })).rejects.toMatchObject({ code: 'noconfig' })
    await expect(fetchViaCookie({ ...cfg, workspaceID: undefined })).rejects.toMatchObject({ code: 'noconfig' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reports a non-JSON answer as a protocol failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>shell</html>', { status: 200 }))
    await expect(fetchViaCookie(cfg)).rejects.toMatchObject({ code: 'protocol' })
  })
})
