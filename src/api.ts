/**
 * HTTP fetch + response adapters for dsh-opencode-go-usage
 *
 * Cookie path (current): GET /workspace/<wrk>/go HTML SSR scrape.
 * The opencode.ai dashboard renders usage values inline in
 * `data-slot="usage-item"` blocks; this is the only cookie-authenticated
 * way to read usage today. (The proposed official API from
 * anomalyco/opencode#16513 is not merged yet; when it ships, an apikey
 * path can be added behind the same `NormalizedUsage` shape.)
 *
 * Adapted from pi-ocgo-usage/src/api.ts.
 * @module dsh-opencode-go-usage/api
 */

import type { NormalizedUsage, OcgoConfig, UsageWindow, UsageWindowKind } from './types.ts'

// ============================================================================
// Errors
// ============================================================================

/** Error thrown by the HTTP / parsing layer; carries a short code for the UI. */
export class UsageError extends Error {
  override readonly name = 'UsageError'
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
  }
}

// ============================================================================
// HTTP wrapper
// ============================================================================

/** Text fetch with structured errors (cookie SSR path). */
async function safeFetchText(url: string, headers: Record<string, string>, timeoutMs: number): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new UsageError(`HTTP ${res.status} for ${sanitizeUrl(url)}`, `http${res.status}`)
    }
    return await res.text()
  } catch (e) {
    if (e instanceof UsageError) throw e
    if (e instanceof Error && e.name === 'AbortError') {
      throw new UsageError(`Request timed out after ${timeoutMs}ms`, 'timeout')
    }
    throw new UsageError(String(e instanceof Error ? e.message : e), 'fetch')
  } finally {
    clearTimeout(timer)
  }
}

/** Strip query params from a URL for safe error messages. */
function sanitizeUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}${u.pathname}`
  } catch {
    return url
  }
}

// ============================================================================
// Cookie path: GET /workspace/<wrk>/go (SSR HTML scrape)
// ============================================================================

interface SSRUsageItem {
  readonly label: string
  readonly percent: number
  readonly resetsIn: string
}

/** Fetch usage through the cookie path. Throws UsageError on any failure. */
export async function fetchViaCookie(cfg: OcgoConfig): Promise<Omit<NormalizedUsage, 'updatedAt'>> {
  if (!cfg.cookie || !cfg.workspaceID) {
    throw new UsageError('Missing cookie or workspaceID for cookie path', 'noconfig')
  }
  const url = `${cfg.baseUrl}/workspace/${encodeURIComponent(cfg.workspaceID)}/go`
  const html = await safeFetchText(
    url,
    { Cookie: cfg.cookie, Accept: 'text/html' },
    cfg.timeoutMs,
  )
  const parsed = fromSSRHTML(html)
  // The page 302-redirects to the login page when the cookie is invalid;
  // that page parses as empty, which is indistinguishable from "no windows".
  // Only report success when at least one window was found.
  if (parsed.rolling === undefined && parsed.weekly === undefined && parsed.monthly === undefined) {
    throw new UsageError('Usage page parsed empty (cookie expired or invalid?)', 'http302')
  }
  return parsed
}

/**
 * Parse the opencode console SSR HTML page and extract the three usage
 * windows. Reset times are emitted as English phrases inside
 * `data-slot="reset-time"` (e.g. "Resets in 2 hours 29 minutes"). We parse
 * them into a coarse `resetInSec` estimate; precise second-level resets are
 * not needed for display.
 */
export function fromSSRHTML(html: string): Omit<NormalizedUsage, 'updatedAt'> {
  // Each usage-item is a `<div data-slot="usage-item">...</div>` block, but
  // the markup inside may itself contain nested divs (usage-header,
  // progress bar, ...). Instead of trying to find the block's closing tag
  // with a regex, we slice between consecutive item start tags — that keeps
  // the whole block (including any nested divs) in one piece.
  const itemStartRe = /<div[^>]*data-slot="usage-item"/g
  const starts: number[] = []
  let startMatch = itemStartRe.exec(html)
  while (startMatch !== null) {
    starts.push(startMatch.index)
    startMatch = itemStartRe.exec(html)
  }

  const items: SSRUsageItem[] = []
  for (let i = 0; i < starts.length; i++) {
    const block = html.slice(starts[i], starts[i + 1] ?? html.length)
    const labelMatch = block.match(/data-slot="usage-label"[^>]*>([^<]+)</)
    const valueMatch = block.match(/data-slot="usage-value"[\s\S]*?<!--\$-->\s*(\d+)\s*<!--\/-->/)
    const resetMatch = block.match(
      /data-slot="reset-time"[\s\S]*?Resets in(?:<!--\/-->\s*)?([\s\S]*?)(?:<!--\/-->|<\/span>)/,
    )
    if (!labelMatch || !valueMatch) continue
    const label = labelMatch[1]?.trim() ?? ''
    const percent = Number.parseInt(valueMatch[1] ?? '0', 10)
    const resetsIn = resetMatch ? stripHtmlComments(resetMatch[1] ?? '').trim() : ''
    items.push({ label, percent, resetsIn })
  }

  const result: {
    rolling?: UsageWindow
    weekly?: UsageWindow
    monthly?: UsageWindow
  } = {}
  for (const item of items) {
    const kind = labelToKind(item.label)
    if (!kind) continue
    result[kind] = {
      kind,
      percent: clampPercent(item.percent),
      resetInSec: parseDurationToSec(item.resetsIn),
      status: item.percent >= 100 ? 'rate-limited' : 'ok',
    }
  }
  return result
}

function labelToKind(label: string): UsageWindowKind | undefined {
  const lower = label.toLowerCase()
  if (lower.startsWith('rolling')) return 'rolling'
  if (lower.startsWith('weekly')) return 'weekly'
  if (lower.startsWith('monthly')) return 'monthly'
  return undefined
}

/** Strip SolidStart HTML comments `<!-- ... -->` from a string. */
function stripHtmlComments(s: string): string {
  return s.replace(/<!--[\s\S]*?-->/g, '').trim()
}

/**
 * Parse a human duration phrase into seconds. Examples:
 *   "2 hours 29 minutes" → 8940
 *   "45 minutes"          → 2700
 *   "5 days"              → 432000
 *   "30 seconds"          → 30
 *
 * Returns 0 on unrecognized input.
 */
export function parseDurationToSec(phrase: string): number {
  if (!phrase) return 0
  // Defensive: SolidStart may leave `<!--/-->` markers inside the captured
  // reset phrase; strip them before matching (see stripHtmlComments).
  const cleaned = phrase.replace(/<!--[\s\S]*?-->/g, ' ')
  const p = cleaned.trim().replace(/\s+/g, ' ').toLowerCase()
  if (!p) return 0

  const re = /(\d+)\s*(second|minute|hour|day|week|month|year)s?/g
  let total = 0
  let matched = false
  let m = re.exec(p)
  while (m !== null) {
    const n = Number.parseInt(m[1] ?? '0', 10)
    const unit = m[2] ?? ''
    matched = true
    switch (unit) {
      case 'second':
        total += n
        break
      case 'minute':
        total += n * 60
        break
      case 'hour':
        total += n * 3600
        break
      case 'day':
        total += n * 86400
        break
      case 'week':
        total += n * 604800
        break
      case 'month':
        total += n * 2592000 // 30 days; coarse but adequate for display
        break
      case 'year':
        total += n * 31536000
        break
    }
    m = re.exec(p)
  }
  return matched ? total : 0
}

// ============================================================================
// Orchestrator
// ============================================================================

/**
 * Fetch usage with the current config (cookie path only today) and stamp
 * the fetch timestamp so the UI can show data freshness.
 */
export async function fetchUsage(cfg: OcgoConfig): Promise<NormalizedUsage> {
  const data = await fetchViaCookie(cfg)
  return { ...data, updatedAt: Date.now() }
}

// ============================================================================
// Internal helpers
// ============================================================================

function clampPercent(n: number | undefined): number {
  if (n === undefined) return 0
  return Math.max(0, Math.min(100, Math.floor(n)))
}
