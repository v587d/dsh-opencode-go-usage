/**
 * Package invariants — cheap structural checks run at import time on the
 * host side. Mirrors the pattern used by other dsh plugin packages.
 * @module dsh-opencode-go-usage/invariant
 */

import { DEFAULT_BASE_URL, DEFAULT_CACHE_TTL, DEFAULT_TIMEOUT_MS } from './config.ts'

/** Assert a condition; throws a descriptive Error when violated. */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[dsh-opencode-go-usage] ${message}`)
  }
}

/** Run every package invariant once; throws on the first violation. */
export function runOcgoInvariants(): void {
  invariant(DEFAULT_CACHE_TTL >= 60 && DEFAULT_CACHE_TTL <= 3600, 'cache TTL must be within [60, 3600]')
  invariant(DEFAULT_TIMEOUT_MS > 0, 'timeout must be positive')
  invariant(
    DEFAULT_BASE_URL.startsWith('https://') || DEFAULT_BASE_URL.startsWith('http://'),
    'base URL must be http(s)',
  )
}

// Run once on import (host half only; cheap and side-effect free).
runOcgoInvariants()
