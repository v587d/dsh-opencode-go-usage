/**
 * Unit tests for the SSR usage page parser.
 * @module dsh-ocgo-usage/api.test
 */

import { describe, expect, it } from 'vitest'
import { fromSSRHTML, parseDurationToSec } from './api.ts'

/** A full opencode.ai SSR usage page with all three windows. */
const FULL_PAGE = `
<!doctype html>
<html><head><title>OpenCode</title></head><body>
<div data-slot="usage-header">OpenCode Go</div>
<div data-slot="usage-item">
  <div data-slot="usage-header"><span data-slot="usage-label">Rolling Usage</span></div>
  <span data-slot="usage-value"><!--$-->23<!--/-->%</span>
  <span data-slot="reset-time"><!--$-->Resets in<!--/-->2 hours 29 minutes<!--/--></span>
</div>
<div data-slot="usage-item">
  <span data-slot="usage-label">Weekly Usage</span>
  <span data-slot="usage-value"><!--$-->80<!--/-->%</span>
  <span data-slot="reset-time"><!--$-->Resets in<!--/-->4 days 6 hours<!--/--></span>
</div>
<div data-slot="usage-item">
  <span data-slot="usage-label">Monthly Usage</span>
  <span data-slot="usage-value"><!--$-->100<!--/-->%</span>
  <span data-slot="reset-time"><!--$-->Resets in<!--/-->12 days 4 hours<!--/--></span>
</div>
</body></html>
`

describe('fromSSRHTML', () => {
  it('parses all three windows with percent and reset seconds', () => {
    const parsed = fromSSRHTML(FULL_PAGE)
    expect(parsed.rolling).toEqual({
      kind: 'rolling',
      percent: 23,
      resetInSec: 2 * 3600 + 29 * 60,
      status: 'ok',
    })
    expect(parsed.weekly).toEqual({
      kind: 'weekly',
      percent: 80,
      resetInSec: 4 * 86400 + 6 * 3600,
      status: 'ok',
    })
    expect(parsed.monthly).toEqual({
      kind: 'monthly',
      percent: 100,
      resetInSec: 12 * 86400 + 4 * 3600,
      status: 'rate-limited',
    })
  })

  it('omits missing windows (new account / trial outside window)', () => {
    const page = `
      <div data-slot="usage-item">
        <span data-slot="usage-label">Weekly Usage</span>
        <span data-slot="usage-value"><!--$-->10<!--/-->%</span>
        <span data-slot="reset-time"><!--$-->Resets in<!--/-->1 day<!--/--></span>
      </div>`
    const parsed = fromSSRHTML(page)
    expect(parsed.rolling).toBeUndefined()
    expect(parsed.weekly).toEqual({
      kind: 'weekly',
      percent: 10,
      resetInSec: 86400,
      status: 'ok',
    })
    expect(parsed.monthly).toBeUndefined()
  })

  it('returns an empty result for a login-redirect page', () => {
    const parsed = fromSSRHTML('<html><body>Sign in to continue</body></html>')
    expect(parsed.rolling).toBeUndefined()
    expect(parsed.weekly).toBeUndefined()
    expect(parsed.monthly).toBeUndefined()
  })

  it('ignores unknown usage labels', () => {
    const page = `
      <div data-slot="usage-item">
        <span data-slot="usage-label">Something Else</span>
        <span data-slot="usage-value"><!--$-->50<!--/-->%</span>
      </div>`
    const parsed = fromSSRHTML(page)
    expect(parsed.rolling).toBeUndefined()
    expect(parsed.weekly).toBeUndefined()
    expect(parsed.monthly).toBeUndefined()
  })

  it('clamps percent into [0, 100]', () => {
    const page = `
      <div data-slot="usage-item">
        <span data-slot="usage-label">Monthly Usage</span>
        <span data-slot="usage-value"><!--$-->150<!--/-->%</span>
      </div>`
    const parsed = fromSSRHTML(page)
    expect(parsed.monthly?.percent).toBe(100)
  })

  it('parses a zh-locale page (Chinese labels and reset phrases)', () => {
    const zhPage = `
      <div data-slot="usage-item">
        <span data-slot="usage-label">滚动用量</span>
        <span data-slot="usage-value"><!--$-->27<!--/-->%</span>
        <span data-slot="reset-time"><!--$-->重置于<!--/-->3 小时 37 分钟<!--/--></span>
      </div>
      <div data-slot="usage-item">
        <span data-slot="usage-label">每周用量</span>
        <span data-slot="usage-value"><!--$-->15<!--/-->%</span>
        <span data-slot="reset-time"><!--$-->重置于<!--/-->6 天 15 小时<!--/--></span>
      </div>
      <div data-slot="usage-item">
        <span data-slot="usage-label">每月用量</span>
        <span data-slot="usage-value"><!--$-->20<!--/-->%</span>
        <span data-slot="reset-time"><!--$-->重置于<!--/-->15 天 17 小时<!--/--></span>
      </div>`
    const parsed = fromSSRHTML(zhPage)
    expect(parsed.rolling).toEqual({
      kind: 'rolling',
      percent: 27,
      resetInSec: 3 * 3600 + 37 * 60,
      status: 'ok',
    })
    expect(parsed.weekly).toEqual({
      kind: 'weekly',
      percent: 15,
      resetInSec: 6 * 86400 + 15 * 3600,
      status: 'ok',
    })
    expect(parsed.monthly).toEqual({
      kind: 'monthly',
      percent: 20,
      resetInSec: 15 * 86400 + 17 * 3600,
      status: 'ok',
    })
  })
})

describe('parseDurationToSec', () => {
  it.each([
    ['2 hours 29 minutes', 2 * 3600 + 29 * 60],
    ['45 minutes', 45 * 60],
    ['5 days', 5 * 86400],
    ['30 seconds', 30],
    ['1 week', 604800],
    ['1 month', 2592000],
    ['1 year', 31536000],
    ['2 小时 29 分钟', 2 * 3600 + 29 * 60],
    ['45 分钟', 45 * 60],
    ['5 天', 5 * 86400],
    ['30 秒', 30],
    ['1 周', 604800],
    ['1 个月', 2592000],
    ['1 年', 31536000],
    ['', 0],
    ['garbage text', 0],
  ])('parses %j → %i', (phrase, expected) => {
    expect(parseDurationToSec(phrase)).toBe(expected)
  })

  it('handles embedded SolidStart comment markers', () => {
    expect(parseDurationToSec('2<!--/--> hours 29<!--/--> minutes')).toBe(2 * 3600 + 29 * 60)
  })
})
