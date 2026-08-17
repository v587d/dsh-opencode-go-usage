/**
 * The composer tool-row entry: the OpenCode Go usage readout, mounted in the
 * composer tool row (`conversation.input.right`) next to the model selector.
 * The chip polls the host `/api/ocgo-usage` endpoint for the three usage
 * windows (rolling 5h / weekly / monthly);
 * clicking reveals per-window reset countdowns, a Set editor (masked
 * workspace/cookie) and a manual refresh. In the error state, clicking the
 * chip opens the Set editor directly so a stale credential can be replaced in
 * place.
 * @module dsh-ocgo-usage/client/OcgoDockEntry
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { isOpenCodeGo } from '../provider.ts'
import type { MaskedConfigView, OcgoUsageView, UsageWindow, UsageWindowKind } from '../types.ts'
import { NS, type OcgoKey } from './locales.ts'
import css from './ocgo.module.css'

/** Poll interval for the host snapshot and the live model provider. */
const POLL_MS = 10_000

/** The masked-prefix shown before the last-4 tail of a secret. */
const MASK = '••••'

/** Same-origin JSON fetch helper. */
async function ocgoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  if (!response.ok) {
    throw new Error(`ocgo-usage ${path} failed: ${response.status}`)
  }
  return (await response.json()) as T
}

/** The host usage API as the browser sees it (same-origin JSON endpoints). */
const ocgoApi = {
  view: () => ocgoFetch<OcgoUsageView>('/api/ocgo-usage'),
  refresh: () => ocgoFetch<OcgoUsageView>('/api/ocgo-usage/refresh'),
  config: () => ocgoFetch<MaskedConfigView>('/api/ocgo-usage/config'),
  writeConfig: (partial: { cookie?: string; workspaceID?: string }) => ocgoFetch<MaskedConfigView>(
    '/api/ocgo-usage/config',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(partial),
    },
  ),
}

/** Composed props of the dock entry (runtime + locale + injected session/provider face). */
export type OcgoDockEntryProps =
  PropsRuntime<'conversation.input.right'>
  & PropsLocale<typeof NS>
  & { dockSessionId?: string | undefined; provider?: () => Promise<string | undefined> }

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

/** The severity class of one window (muted → escalating warn → err). */
function severityClass(window: UsageWindow): string | undefined {
  if (window.status === 'rate-limited' || window.percent >= 90) return css.segCrit90
  if (window.percent >= 80) return css.segErr80
  if (window.percent >= 70) return css.segWarn70
  if (window.percent >= 60) return css.segWarn60
  if (window.percent >= 50) return css.segWarn50
  return undefined
}

/** Detect dark mode via DSH body attribute. */
function useDarkMode(): boolean {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false
    return document.body.hasAttribute('data-ds-dark-theme')
  })
  useEffect(() => {
    const el = document.body
    if (!el) return
    const observer = new MutationObserver(() => {
      setDark(el.hasAttribute('data-ds-dark-theme'))
    })
    observer.observe(el, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
    return () => observer.disconnect()
  }, [])
  return dark
}

/** The official OpenCode Go logo mark, inlined to avoid extra asset requests. */
function OcgoLogo(): React.ReactElement {
  const dark = useDarkMode()
  if (dark) {
    return (
      <svg className={css.logo} width="22" height="12" viewBox="0 0 54 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="100%" height="100%" fill="#2c2c2e" />
        <path d="M24 30H0V0H24V6H6V24H18V18H12V12H24V30Z" fill="#B0B0B0" />
        <path d="M12 18H18V24H6V12H12V18Z" fill="#FFFFFF" />
        <path d="M48 12V24H36V12H48Z" fill="#FFFFFF" />
        <path d="M54 30H30V0H54V30ZM36 24H48V6H36V24Z" fill="#B0B0B0" />
      </svg>
    )
  }
  return (
    <svg className={css.logo} width="22" height="12" viewBox="0 0 54 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M24 30H0V0H24V6H6V24H18V18H12V12H24V30Z" fill="#211E1E" />
      <path d="M12 18H18V24H6V12H12V18Z" fill="#CFCECD" />
      <path d="M48 12V24H36V12H48Z" fill="#CFCECD" />
      <path d="M54 30H30V0H54V30ZM36 24H48V6H36V24Z" fill="#211E1E" />
    </svg>
  )
}

/** Render one window segment: compact `· 5h 23%`, full `· 5h 23% (3h 25m)`. */
function WindowSegment(props: { window: UsageWindow; sep: string; compact?: boolean }): React.ReactElement {
  const { window, sep, compact = false } = props
  const cls = severityClass(window)
  return (
    <span className={css.seg}>
      <span className={css.segSep}>{sep}</span>
      <span className={cls ?? undefined}>
        {WINDOW_LABELS[window.kind]} {window.percent}%
        {!compact ? ` (${formatDuration(window.resetInSec)})` : ''}
      </span>
    </span>
  )
}

/** The masked display text for one secret field: `••••abcd`. */
function maskedText(secret: { set: boolean; tail: string } | undefined): string {
  if (secret === undefined || !secret.set || secret.tail.length === 0) return ''
  return `${MASK}${secret.tail}`
}

/**
 * The OpenCode Go usage chip: polls the host snapshot, renders the three
 * windows inline, and expands into a detail panel on click.
 * @param props - the composed dock entry props.
 */
export function OcgoDockEntry(props: OcgoDockEntryProps): React.ReactElement | null {
  const [view, setView] = useState<OcgoUsageView | null>(null)
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  // Panel mode: 'view' = windows + footer; 'set' = workspace/cookie editor.
  const [mode, setMode] = useState<'view' | 'set'>('view')
  const [config, setConfig] = useState<MaskedConfigView | null>(null)
  const [wsDraft, setWsDraft] = useState('')
  const [cookieDraft, setCookieDraft] = useState('')
  const wrapRef = useRef<HTMLSpanElement>(null)
  const modeRef = useRef<'view' | 'set'>('view')
  modeRef.current = mode
  const draftsRef = useRef({ ws: '', cookie: '' })
  draftsRef.current = { ws: wsDraft, cookie: cookieDraft }
  const configRef = useRef<MaskedConfigView | null>(null)
  configRef.current = config

  // One periodic tick:
  //   1. resolve the session's CURRENT provider from the live in-memory
  //      selection (session.models, warm ~ms) and toggle `visible`;
  //   2. only while visible, fetch the usage snapshot.
  const pollNow = useCallback(() => {
    let live = true
    const provider = props.provider
    const resolveProvider = provider !== undefined
      ? Promise.resolve(provider()).then((p) => p ?? undefined, () => undefined)
      : Promise.resolve(undefined)
    resolveProvider.then((p) => {
      if (!live) return
      const shown = isOpenCodeGo(p)
      setVisible(shown)
      if (!shown) setOpen(false)
      if (shown) {
        ocgoApi.view().then((snapshot) => {
          if (live) setView(snapshot)
        }, () => {
          if (live) setView(null)
        })
      }
    }, () => {
      if (live) setVisible(false)
    })
    return () => { live = false }
  }, [props.provider])

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

  /** Load the masked config into the editor drafts. */
  const loadConfig = useCallback(() => {
    ocgoApi.config().then((snapshot) => {
      setConfig(snapshot)
      setWsDraft(maskedText(snapshot.workspaceID))
      setCookieDraft(maskedText(snapshot.cookie))
    }, () => {
      // Editor still opens; drafts stay empty.
      setConfig(null)
      setWsDraft('')
      setCookieDraft('')
    })
  }, [])

  /** Submit any edited field; returns the write promise (fire-and-forget on blur). */
  const saveConfig = useCallback((): void => {
    const current = configRef.current
    const partial: { cookie?: string; workspaceID?: string } = {}
    if (current !== null) {
      const ws = draftsRef.current.ws.trim()
      if (ws.length > 0 && ws !== maskedText(current.workspaceID)) partial.workspaceID = ws
      const cookie = draftsRef.current.cookie.trim()
      if (cookie.length > 0 && cookie !== maskedText(current.cookie)) partial.cookie = cookie
    } else {
      // No baseline loaded (fetch failed): send whatever was typed.
      if (draftsRef.current.ws.trim().length > 0) partial.workspaceID = draftsRef.current.ws.trim()
      if (draftsRef.current.cookie.trim().length > 0) partial.cookie = draftsRef.current.cookie.trim()
    }
    if (Object.keys(partial).length === 0) return
    ocgoApi.writeConfig(partial).then((snapshot) => {
      setConfig(snapshot)
      setWsDraft(maskedText(snapshot.workspaceID))
      setCookieDraft(maskedText(snapshot.cookie))
      // New credentials are live now (host invalidated its cache): poll now.
      pollNow()
    }, () => {
      // Ignore; the next poll resyncs and the editor keeps the drafts.
    })
  }, [pollNow])

  /** Close the panel; in set mode a blur/close acts as confirm (save). */
  const closePanel = useCallback((): void => {
    if (modeRef.current === 'set') saveConfig()
    setOpen(false)
    setMode('view')
  }, [saveConfig])

  /** Open the editor (used by the Set button and the error chip). */
  const openSet = useCallback((): void => {
    setMode('set')
    setOpen(true)
    loadConfig()
  }, [loadConfig])

  // Close the detail panel when focus leaves the chip: any pointer press
  // outside the wrapper, or Escape. In set mode this CONFIRMS (saves).
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node | null
      if (target !== null && wrapRef.current !== null && !wrapRef.current.contains(target)) {
        closePanel()
      }
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') closePanel()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, closePanel])

  const refresh = (): void => {
    ocgoApi.refresh().then((snapshot) => {
      setView(snapshot)
    }, () => {
      // Ignore transport errors on manual refresh; the next poll resyncs.
    })
  }

  const t = props.t
  const sep = ` ${t('ocgo.sep')} `

  // Hidden whenever the live provider is not opencode-go — the pi-ocgo-usage
  // behaviour: switching to e.g. DeepSeek official hides the chip within one
  // poll interval, so no other provider's user sees OpenCode Go numbers.
  if (!visible) return null

  const error = view === null ? { code: 'fetch' as const, message: t('ocgo.error', { code: 'fetch' }) }
    : view.error !== undefined
      ? { code: view.error, message: view.message ?? t('ocgo.error', { code: view.error }) }
      : null

  // Error state: the chip opens the Set editor directly so a stale cookie can
  // be replaced in place; clicking outside (or Esc) confirms the write.
  if (error !== null) {
    return (
      <span className={css.wrap} ref={wrapRef} data-testid="ocgo-chip-error">
        <button
          type="button"
          className={open ? `${css.chip} ${css.chipOpen}` : css.chip}
          onClick={() => { if (open) closePanel(); else openSet() }}
          title={`${error.message}\n${t('ocgo.set')}`}
        >
          <OcgoLogo /> &lt;err:{error.code}&gt;
        </button>
        {open && (
          <span className={css.details}>
            <span className={css.setPanel}>
              <label className={css.field}>
                <span className={css.fieldLabel}>{t('ocgo.workspaceID')}</span>
                <input
                  className={css.fieldInput}
                  value={wsDraft}
                  placeholder="wrk_…"
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => { setWsDraft(e.target.value) }}
                  onFocus={(e) => { if (e.target.value === maskedText(config?.workspaceID)) e.target.select() }}
                />
              </label>
              <label className={css.field}>
                <span className={css.fieldLabel}>{t('ocgo.cookie')}</span>
                <input
                  className={css.fieldInput}
                  value={cookieDraft}
                  placeholder="auth=…"
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => { setCookieDraft(e.target.value) }}
                  onFocus={(e) => { if (e.target.value === maskedText(config?.cookie)) e.target.select() }}
                />
              </label>
              <span className={css.foot}>
                <span className={css.setHint}>{t('ocgo.setHint')}</span>
                <button type="button" className={css.refreshBtn} onClick={closePanel}>
                  {t('ocgo.save')}
                </button>
              </span>
            </span>
          </span>
        )}
      </span>
    )
  }

  // TS: after the error early-return, `view` is a non-null success snapshot.
  const snapshot = view as OcgoUsageView
  const windows: UsageWindow[] = [
    snapshot.rolling,
    snapshot.weekly,
    snapshot.monthly,
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
        <OcgoLogo /> {t('ocgo.unavailable')}
      </button>
    )
  }

  return (
    <span className={css.wrap} ref={wrapRef} data-testid="ocgo-chip">
      <button
        type="button"
        className={open ? `${css.chip} ${css.chipOpen}` : css.chip}
        onClick={() => { if (open) closePanel(); else setOpen(true) }}
        title={open ? t('ocgo.collapse') : t('ocgo.expand')}
      >
        <OcgoLogo />
        {windows.map((w) => (
          <WindowSegment key={w.kind} window={w} sep={sep} compact />
        ))}
        <span className={open ? `${css.chevron} ${css.chevronOpen}` : css.chevron} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open && (
        <span className={css.details}>
          {mode === 'set' ? (
            <span className={css.setPanel}>
              <label className={css.field}>
                <span className={css.fieldLabel}>{t('ocgo.workspaceID')}</span>
                <input
                  className={css.fieldInput}
                  value={wsDraft}
                  placeholder="wrk_…"
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => { setWsDraft(e.target.value) }}
                  onFocus={(e) => { if (e.target.value === maskedText(config?.workspaceID)) e.target.select() }}
                />
              </label>
              <label className={css.field}>
                <span className={css.fieldLabel}>{t('ocgo.cookie')}</span>
                <input
                  className={css.fieldInput}
                  value={cookieDraft}
                  placeholder="auth=…"
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => { setCookieDraft(e.target.value) }}
                  onFocus={(e) => { if (e.target.value === maskedText(config?.cookie)) e.target.select() }}
                />
              </label>
              <span className={css.foot}>
                <span className={css.setHint}>{t('ocgo.setHint')}</span>
                <button type="button" className={css.refreshBtn} onClick={closePanel}>
                  {t('ocgo.save')}
                </button>
              </span>
            </span>
          ) : (
            <>
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
                <button type="button" className={css.setBtn} onClick={openSet}>
                  {t('ocgo.set')}
                </button>
                <span className={css.footRight}>
                  <button type="button" className={css.refreshBtn} onClick={refresh}>
                    {t('ocgo.refresh')}
                  </button>
                  {snapshot.updatedAt !== undefined && (
                    <span className={css.fetchedAt}>
                      {t('ocgo.fetchedAt', { time: formatClock(snapshot.updatedAt) })}
                    </span>
                  )}
                </span>
              </span>
            </>
          )}
        </span>
      )}
    </span>
  )
}
