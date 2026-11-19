/**
 * Unit tests for the usage severity tiers.
 * @module dsh-ocgo-usage/client/severity.test
 */

import { describe, expect, it } from 'vitest'
import { ERROR_AT, severityTier, WARN_AT } from './severity.ts'

describe('severityTier', () => {
  it('keeps low usage ok', () => {
    expect(severityTier({ percent: 0, status: 'ok' })).toBe('ok')
    expect(severityTier({ percent: WARN_AT - 1, status: 'ok' })).toBe('ok')
  })

  it('warns from the warn threshold up to the error threshold', () => {
    expect(severityTier({ percent: WARN_AT, status: 'ok' })).toBe('warn')
    expect(severityTier({ percent: ERROR_AT - 1, status: 'ok' })).toBe('warn')
  })

  it('errors at the error threshold and beyond', () => {
    expect(severityTier({ percent: ERROR_AT, status: 'ok' })).toBe('err')
    expect(severityTier({ percent: 100, status: 'ok' })).toBe('err')
  })

  it('errors on a rate-limited window whatever its percent', () => {
    expect(severityTier({ percent: 0, status: 'rate-limited' })).toBe('err')
  })
})
