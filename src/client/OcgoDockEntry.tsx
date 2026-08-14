/**
 * The composer dock entry: the OpenCode Go usage readout, mounted in the
 * composer dock band (`conversation.composer.dock`) beside the conversation
 * stats line. The chip polls the host `/api/ocgo-usage` endpoint for the
 * three usage windows (rolling 5h / weekly / monthly); clicking reveals
 * per-window reset countdowns and a manual refresh.
 * @module dsh-ocgo-usage/client/OcgoDockEntry
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { OcgoUsageView, UsageWindow, UsageWindowKind } from '../types.ts'
import { NS, type OcgoKey } from './locales.ts'
import css from './ocgo.module.css'

/** Poll interval for the host snapshot. */
const POLL_MS = 30_000

/** Same-origin JSON fetch helper. */
async function ocgoFetch<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`ocgo-usage ${path} failed: ${response.status}`)
  }
  return (await response.json()) as T
}

/** Build the request URL, carrying the session so the host can resolve visibility. */
function ocgoUrl(sessionId: string | undefined, path: string): string {
  if (sessionId === undefined || sessionId.length === 0) return path
  return `${path}?session=${encodeURIComponent(sessionId)}`
}

/** The host usage API as the browser sees it (same-origin JSON endpoints). */
const ocgoApi = {
  view: (sessionId: string | undefined) => ocgoFetch<OcgoUsageView>(ocgoUrl(sessionId, '/api/ocgo-usage')),
  refresh: (sessionId: string | undefined) => ocgoFetch<OcgoUsageView>(ocgoUrl(sessionId, '/api/ocgo-usage/refresh')),
}

/** Composed props of the dock entry (runtime + locale). */
export type OcgoDockEntryProps =
  PropsRuntime<'conversation.composer.dock'>
  & PropsLocale<typeof NS>

/** Short window label: 5h / wk / mo. */
const WINDOW_LABELS: Record<UsageWindowKind, string> = {
  rolling: '5h',
  weekly: 'wk',
  monthly: 'mo',
}

/** Full window label key for the detail panel. */
const WINDOW_TITLE_KEYS: Record<UsageWindowKind, OcgoKey> = {
  rolling: 'ocgo.rolling',
  weekly: 'ocgo.weekly',
  monthly: 'ocgo.monthly',
}

/**
 * Format a duration (seconds) compactly: 45s / 23m / 5h 23m / 4d 6h.
 */
export function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${Math.max(0, Math.floor(totalSec))}s`
  if (totalSec < 3600) return `${Math.floor(totalSec / 60)}m`
  if (totalSec < 86400) {
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  return h > 0 ? `${d}d ${h}h` : `${d}d`
}

/** Format an epoch-ms time as HH:MM. */
function formatClock(epochMs: number): string {
  const d = new Date(epochMs)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** The severity class of one window (muted → warn → err). */
function severityClass(window: UsageWindow): string | undefined {
  if (window.status === 'rate-limited' || window.percent >= 90) return css.segErr
  if (window.percent >= 80) return css.segWarn
  return undefined
}

/** Render one window segment: `· 5h 23% (3h 25m)`. */
function WindowSegment(props: { window: UsageWindow; sep: string }): React.ReactElement {
  const { window, sep } = props
  const cls = severityClass(window)
  return (
    <span className={css.seg}>
      <span className={css.segSep}>{sep}</span>
      <span className={cls ?? undefined}>
        {WINDOW_LABELS[window.kind]} {window.percent}% ({formatDuration(window.resetInSec)})
      </span>
    </span>
  )
}

/**
 * The OpenCode Go usage chip: polls the host snapshot, renders the three
 * windows inline, and expands into a detail panel on click.
 * @param props - the composed dock entry props.
 */
export function OcgoDockEntry(props: OcgoDockEntryProps): React.ReactElement | null {
  const [view, setView] = useState<OcgoUsageView | null>(null)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const sessionId = props.sessionId

  // One periodic tick: fetch the host snapshot. The response carries `visible`
  // (resolved host-side from the session's current model provider) plus the
  // usage windows. Switching models mid-session does NOT remount this dock
  // entry, so visibility is re-derived on every poll, keeping the chip honest.
  const pollNow = useCallback(() => {
    let live = true
    ocgoApi.view(sessionId).then((snapshot) => {
      if (!live) return
      setView(snapshot)
      if (!snapshot.visible) {
        // Provider is not opencode-go: hide the chip (and any open panel).
        setOpen(false)
      }
    }, () => {
      if (!live) return
      setView(null)
    })
    return () => { live = false }
  }, [sessionId])

  useEffect(() => {
    const cleanup = pollNow()
    const timer = window.setInterval(pollNow, POLL_MS)
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') pollNow()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cleanup()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [pollNow])

  // Close the detail panel when focus leaves the chip: any pointer press
  // outside the wrapper, or Escape.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node | null
      if (target !== null && wrapRef.current !== null && !wrapRef.current.contains(target)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const refresh = (): void => {
    ocgoApi.refresh(sessionId).then((snapshot) => {
      setView(snapshot)
      if (!snapshot.visible) setOpen(false)
    }, () => {
      // Ignore transport errors on manual refresh; the next poll resyncs.
    })
  }

  const t = props.t
  const sep = ` ${t('ocgo.sep')} `

  // Hidden only when the host explicitly reports `visible: false` — i.e. the
  // session's current model provider is not opencode-go. A host that has not
  // been restarted to the visibility-aware build omits the field; treat that
  // as "shown" (backward compatible) rather than dropping the chip entirely.
  if (view !== null && view.visible === false) return null

  // Error state: compact `<err:code>` chip; click to force a refresh.
  if (view === null || view.error !== undefined) {
    const code = view?.error ?? 'fetch'
    const title = view?.message ?? t('ocgo.error', { code })
    return (
      <button
        type="button"
        className={css.chip}
        onClick={refresh}
        title={`${title}\n${t('ocgo.refresh')}`}
        data-testid="ocgo-chip-error"
      >
        {t('ocgo.label')}: &lt;err:{code}&gt;
      </button>
    )
  }

  const windows: UsageWindow[] = [
    view.rolling,
    view.weekly,
    view.monthly,
  ].filter((w): w is UsageWindow => w !== undefined)

  // No windows at all (e.g. brand-new account): show unavailable, refreshable.
  if (windows.length === 0) {
    return (
      <button
        type="button"
        className={css.chip}
        onClick={refresh}
        title={t('ocgo.refresh')}
        data-testid="ocgo-chip-empty"
      >
        {t('ocgo.label')}: {t('ocgo.unavailable')}
      </button>
    )
  }

  return (
    <span className={css.wrap} ref={wrapRef} data-testid="ocgo-chip">
      <button
        type="button"
        className={open ? `${css.chip} ${css.chipOpen}` : css.chip}
        onClick={() => { setOpen((v) => !v) }}
        title={open ? t('ocgo.collapse') : t('ocgo.expand')}
      >
        <span>{t('ocgo.label')}:</span>
        {windows.map((w) => (
          <WindowSegment key={w.kind} window={w} sep={sep} />
        ))}
        {view.updatedAt !== undefined && (
          <span className={css.segSep}>{sep}{t('ocgo.fetchedAt', { time: formatClock(view.updatedAt) })}</span>
        )}
      </button>
      {open && (
        <span className={css.details}>
          {windows.map((w) => (
            <span key={w.kind} className={css.window}>
              <span className={css.windowLabel}>
                {w.status === 'rate-limited' ? t('ocgo.rateLimited') : t(WINDOW_TITLE_KEYS[w.kind])}
              </span>
              <span className={css.windowValue}>
                <span className={severityClass(w) ?? undefined}>{w.percent}%</span>
                <span className={css.windowReset}>
                  {t('ocgo.resetsIn', { duration: formatDuration(w.resetInSec) })}
                </span>
              </span>
            </span>
          ))}
          <span className={css.foot}>
            <span className={css.fetchedAt}>
              {view.updatedAt !== undefined ? t('ocgo.fetchedAt', { time: formatClock(view.updatedAt) }) : ''}
            </span>
            <button type="button" className={css.refreshBtn} onClick={refresh}>
              {t('ocgo.refresh')}
            </button>
          </span>
        </span>
      )}
    </span>
  )
}
