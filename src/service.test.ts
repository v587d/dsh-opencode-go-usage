/**
 * Unit tests for the cached usage service.
 * @module dsh-ocgo-usage/service.test
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ENV_COOKIE, ENV_WORKSPACE_ID } from './config.ts'
import { OcgoUsageService } from './service.ts'

const SAVED_COOKIE = process.env[ENV_COOKIE]
const SAVED_WORKSPACE = process.env[ENV_WORKSPACE_ID]

/** The console status body the service reads, with the 5-hour window 2h from reset. */
const OK_STATUS = JSON.stringify({
  access: {
    meters: {
      fiveHour: {
        startsAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
        resetsAt: new Date(Date.now() + 2 * 3600_000).toISOString(),
        limitMicroCents: 10_000_000,
        usedMicroCents: 2_300_000,
      },
    },
  },
})

/** Mocked console status response. */
function okResponse(): Response {
  return new Response(OK_STATUS, { status: 200, headers: { 'content-type': 'application/json' } })
}

describe('OcgoUsageService', () => {
  let ctx: Context
  let tmp: string

  beforeEach(() => {
    process.env[ENV_COOKIE] = 'auth=Fe26.2*test'
    process.env[ENV_WORKSPACE_ID] = 'wrk_test'
    tmp = mkdtempSync(join(tmpdir(), 'dsh-ocgo-usage-svc-'))
    process.env.DSH_HOME = tmp
    ctx = new Context()
  })

  afterEach(() => {
    // Restore mocks FIRST so a failure below cannot leak state into the
    // next test. Cordis 4 exposes no public Context.dispose, and the service
    // owns no timers/subscriptions, so the test context is left for the
    // worker process to reclaim.
    vi.restoreAllMocks()
    if (SAVED_COOKIE === undefined) delete process.env[ENV_COOKIE]
    else process.env[ENV_COOKIE] = SAVED_COOKIE
    if (SAVED_WORKSPACE === undefined) delete process.env[ENV_WORKSPACE_ID]
    else process.env[ENV_WORKSPACE_ID] = SAVED_WORKSPACE
    delete process.env.DSH_HOME
    rmSync(tmp, { recursive: true, force: true })
  })

  it('returns the parsed windows on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse())
    const service = new OcgoUsageService(ctx)
    const view = await service.view()
    expect(view.error).toBeUndefined()
    expect(view.rolling).toEqual({
      kind: 'rolling',
      percent: 23,
      resetInSec: 7200,
      status: 'ok',
    })
    expect(view.updatedAt).toBeTypeOf('number')
  })

  it('deduplicates concurrent view() calls into one fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse())
    const service = new OcgoUsageService(ctx)
    const [a, b] = await Promise.all([service.view(), service.view()])
    expect(a.rolling?.percent).toBe(23)
    expect(b.rolling?.percent).toBe(23)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('serves the cached view within the TTL without refetching', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse())
    const service = new OcgoUsageService(ctx)
    await service.view()
    await service.view()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('returns a noconfig error when the cookie is missing', async () => {
    delete process.env[ENV_COOKIE]
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse())
    const service = new OcgoUsageService(ctx)
    const view = await service.view()
    expect(view.error).toBe('noconfig')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('maps an HTTP failure to an http<status> code and enters cooldown', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 500 }),
    )
    const service = new OcgoUsageService(ctx)
    const first = await service.view()
    expect(first.error).toBe('http500')
    // Cooldown: the second call reuses the error without fetching again.
    const second = await service.view()
    expect(second.error).toBe('http500')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('refresh() bypasses the cache window', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse())
    const service = new OcgoUsageService(ctx)
    await service.view()
    await service.refresh()
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('answers disabled when the plugin is switched off', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse())
    const service = new OcgoUsageService(ctx, { enabled: false })
    const view = await service.view()
    expect(view.error).toBe('disabled')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
