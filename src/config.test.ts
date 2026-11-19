/**
 * Unit tests for the configuration loader.
 * @module dsh-ocgo-usage/config.test
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_BASE_URL,
  DEFAULT_CACHE_TTL,
  DEFAULT_TIMEOUT_MS,
  ENV_BASE_URL,
  ENV_CACHE_TTL,
  ENV_COOKIE,
  ENV_TIMEOUT_MS,
  ENV_WORKSPACE_ID,
  loadConfig,
  maskSecret,
  maskedConfigView,
  normalizeCookie,
  writeConfigFile,
} from './config.ts'

const ENV_KEYS = [ENV_COOKIE, ENV_WORKSPACE_ID, ENV_BASE_URL, ENV_CACHE_TTL, ENV_TIMEOUT_MS, 'DSH_HOME']

/** Clear every env var the config reads, remembering the previous values. */
function clearEnv(): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {}
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
  return saved
}

function restoreEnv(saved: Record<string, string | undefined>): void {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
}

describe('normalizeCookie', () => {
  it('keeps the auth pair and the other cookies a paste carried', () => {
    expect(normalizeCookie('auth=Fe26.2*abc; oc_locale=zh')).toBe('auth=Fe26.2*abc; oc_locale=zh')
    expect(normalizeCookie('auth=Fe26.2*abc')).toBe('auth=Fe26.2*abc')
  })

  it('prefixes auth= onto a bare auth value', () => {
    expect(normalizeCookie('Fe26.2*abc')).toBe('auth=Fe26.2*abc')
  })

  it('is order-independent and never corrupts locale-first cookies (regression)', () => {
    // The old code turned "oc_locale=zh; ...; auth=..." into
    // "auth=oc_locale=zh; ...". This must never happen.
    expect(normalizeCookie('oc_locale=zh; auth=Fe26.2*abc')).toBe('auth=Fe26.2*abc; oc_locale=zh')
    expect(normalizeCookie('oc_locale=en; desktop_promo_dismissed=1; auth=Fe26.2*abc')).toBe(
      'auth=Fe26.2*abc; oc_locale=en; desktop_promo_dismissed=1',
    )
  })

  it('accepts comma-separated cookies (Set-Cookie style)', () => {
    expect(normalizeCookie('oc_locale=zh, desktop_promo_dismissed=1, auth=Fe26.2*abc')).toBe(
      'auth=Fe26.2*abc; oc_locale=zh; desktop_promo_dismissed=1',
    )
  })

  it('accepts a quoted auth value', () => {
    expect(normalizeCookie('auth="Fe26.2*quoted"; oc_locale=en')).toBe('auth=Fe26.2*quoted; oc_locale=en')
  })

  it('rejects input with no real auth token (no fake auth=)', () => {
    // Regression: the old code fabricated "auth=oc_locale=zh; ..." from a
    // locale-only paste. Now it refuses instead.
    expect(normalizeCookie('oc_locale=zh')).toBeUndefined()
    expect(normalizeCookie('zh')).toBeUndefined()
    expect(normalizeCookie('desktop_promo_dismissed=1; auth=')).toBeUndefined()
  })

  it('normalizes whitespace and rejects empty input', () => {
    expect(normalizeCookie('  auth=Fe26.2*abc ;  oc_locale=zh  ')).toBe('auth=Fe26.2*abc; oc_locale=zh')
    expect(normalizeCookie('   ')).toBeUndefined()
    expect(normalizeCookie(undefined)).toBeUndefined()
  })
})

describe('loadConfig', () => {
  let savedEnv: Record<string, string | undefined>
  let tmp: string

  beforeEach(() => {
    savedEnv = clearEnv()
    tmp = mkdtempSync(join(tmpdir(), 'dsh-ocgo-usage-test-'))
    process.env.DSH_HOME = tmp
  })

  afterEach(() => {
    restoreEnv(savedEnv)
    rmSync(tmp, { recursive: true, force: true })
  })

  it('returns defaults when nothing is configured', () => {
    const cfg = loadConfig()
    expect(cfg.cookie).toBeUndefined()
    expect(cfg.baseUrl).toBe(DEFAULT_BASE_URL)
    expect(cfg.cacheTTL).toBe(DEFAULT_CACHE_TTL)
    expect(cfg.timeoutMs).toBe(DEFAULT_TIMEOUT_MS)
  })

  it('reads env vars and normalizes the cookie', () => {
    process.env[ENV_COOKIE] = 'Fe26.2*env'
    process.env[ENV_WORKSPACE_ID] = 'wrk_env'
    process.env[ENV_BASE_URL] = 'https://example.com'
    process.env[ENV_CACHE_TTL] = '120'
    process.env[ENV_TIMEOUT_MS] = '5000'
    const cfg = loadConfig()
    expect(cfg.cookie).toBe('auth=Fe26.2*env')
    expect(cfg.workspaceID).toBe('wrk_env')
    expect(cfg.baseUrl).toBe('https://example.com')
    expect(cfg.cacheTTL).toBe(120)
    expect(cfg.timeoutMs).toBe(5000)
  })

  it('ignores a non-positive timeout and keeps the default', () => {
    process.env[ENV_TIMEOUT_MS] = '0'
    expect(loadConfig().timeoutMs).toBe(DEFAULT_TIMEOUT_MS)
    process.env[ENV_TIMEOUT_MS] = '-1'
    expect(loadConfig().timeoutMs).toBe(DEFAULT_TIMEOUT_MS)
  })

  it('env wins over the config file', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({
      cookie: 'auth=Fe26.2*file',
      cacheTTL: 9999,
    }))
    process.env[ENV_COOKIE] = 'auth=Fe26.2*env'
    const cfg = loadConfig()
    expect(cfg.cookie).toBe('auth=Fe26.2*env')
    expect(cfg.cacheTTL).toBe(3600)
  })

  it('falls back to the config file and clamps cacheTTL', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({
      cookie: 'Fe26.2*file',
      workspaceID: 'wrk_file',
      cacheTTL: 9999,
    }))
    const cfg = loadConfig()
    expect(cfg.cookie).toBe('auth=Fe26.2*file')
    expect(cfg.workspaceID).toBe('wrk_file')
    expect(cfg.cacheTTL).toBe(3600)
    expect(cfg.timeoutMs).toBe(DEFAULT_TIMEOUT_MS)
  })

  it('tolerates a broken config file', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), '{not json')
    const cfg = loadConfig()
    expect(cfg.cookie).toBeUndefined()
    expect(cfg.baseUrl).toBe(DEFAULT_BASE_URL)
  })
})

describe('masked config view + write', () => {
  let savedEnv: Record<string, string | undefined>
  let tmp: string

  beforeEach(() => {
    savedEnv = clearEnv()
    tmp = mkdtempSync(join(tmpdir(), 'dsh-ocgo-usage-mask-'))
    process.env.DSH_HOME = tmp
  })

  afterEach(() => {
    restoreEnv(savedEnv)
    rmSync(tmp, { recursive: true, force: true })
  })

  it('masks the tail of a secret', () => {
    expect(maskSecret(undefined)).toEqual({ set: false, tail: '' })
    expect(maskSecret('abcd')).toEqual({ set: true, tail: 'abcd' })
    expect(maskSecret('Fe26.2*long-value-xyz1')).toEqual({ set: true, tail: 'xyz1' })
  })

  it('exposes only masked values in the view', () => {
    process.env[ENV_COOKIE] = 'auth=Fe26.2*secret-cookie-9abc; oc_locale=zh'
    const view = maskedConfigView()
    expect(view.cookie).toEqual({ set: true, tail: 'e=zh' })
    expect(JSON.stringify(view)).not.toContain('secret-cookie')
  })

  it('writes the cookie to the config file and normalizes it', () => {
    const view = writeConfigFile({ cookie: 'Fe26.2*new' })
    expect(view.cookie).toEqual({ set: true, tail: '*new' })
    // loadConfig now reads the written file (normalized cookie with auth=).
    expect(loadConfig().cookie).toBe('auth=Fe26.2*new')
  })

  it('preserves other fields and clears a field with null', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({
      cookie: 'auth=Fe26.2*old',
      baseUrl: 'https://example.com',
      cacheTTL: 120,
    }))
    const view = writeConfigFile({ cookie: null })
    expect(view.cookie).toEqual({ set: false, tail: '' })
    const raw = JSON.parse(readFileSync(join(tmp, 'ocgo-usage.json'), 'utf8'))
    expect(raw.baseUrl).toBe('https://example.com')
    expect(raw.cacheTTL).toBe(120)
    expect(raw.cookie).toBeUndefined()
  })

  it('leaves the file untouched when the write carries no field', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({
      cookie: 'auth=Fe26.2*keepme',
      baseUrl: 'https://example.com',
    }))
    const view = writeConfigFile({})
    expect(view.cookie).toEqual({ set: true, tail: 'epme' })
    const raw = JSON.parse(readFileSync(join(tmp, 'ocgo-usage.json'), 'utf8'))
    expect(raw.cookie).toBe('auth=Fe26.2*keepme')
    expect(raw.baseUrl).toBe('https://example.com')
  })
})
