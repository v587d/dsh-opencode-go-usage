/**
 * Unit tests for the provider matcher.
 * @module dsh-opencode-go-usage/provider.test
 */

import { describe, expect, it } from 'vitest'
import { isOpenCodeGo, OCGO_PROVIDER } from './provider.ts'

describe('isOpenCodeGo', () => {
  it('accepts the exact provider', () => {
    expect(isOpenCodeGo(OCGO_PROVIDER)).toBe(true)
  })

  it('accepts the opencode-go/ model prefix', () => {
    expect(isOpenCodeGo('opencode-go/deepseek-v4-flash')).toBe(true)
  })

  it('rejects other providers and empty input', () => {
    expect(isOpenCodeGo('deepseek-official')).toBe(false)
    expect(isOpenCodeGo('deepseek')).toBe(false)
    expect(isOpenCodeGo(undefined)).toBe(false)
    expect(isOpenCodeGo('')).toBe(false)
  })

  it('does not treat a plain-prefixed unrelated provider as opencode-go', () => {
    expect(isOpenCodeGo('opencode-go-evil')).toBe(false)
  })
})
