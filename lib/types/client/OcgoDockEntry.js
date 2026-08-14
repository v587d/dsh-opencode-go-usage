import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The composer dock entry: the OpenCode Go usage readout, mounted in the
 * composer dock band (`conversation.composer.dock`) beside the conversation
 * stats line. The chip polls the host `/api/ocgo-usage` endpoint for the
 * three usage windows (rolling 5h / weekly / monthly); clicking reveals
 * per-window reset countdowns, a Set editor (masked workspace/cookie) and a
 * manual refresh. In the error state, clicking the chip opens the Set editor
 * directly so a stale credential can be replaced in place.
 * @module dsh-ocgo-usage/client/OcgoDockEntry
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { isOpenCodeGo } from "../provider.js";
import css from './ocgo.module.css';
/** Poll interval for the host snapshot and the live model provider. */
const POLL_MS = 10_000;
/** The masked-prefix shown before the last-4 tail of a secret. */
const MASK = '••••';
/** Same-origin JSON fetch helper. */
async function ocgoFetch(path, init) {
    const response = await fetch(path, init);
    if (!response.ok) {
        throw new Error(`ocgo-usage ${path} failed: ${response.status}`);
    }
    return (await response.json());
}
/** The host usage API as the browser sees it (same-origin JSON endpoints). */
const ocgoApi = {
    view: () => ocgoFetch('/api/ocgo-usage'),
    refresh: () => ocgoFetch('/api/ocgo-usage/refresh'),
    config: () => ocgoFetch('/api/ocgo-usage/config'),
    writeConfig: (partial) => ocgoFetch('/api/ocgo-usage/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(partial),
    }),
};
/** Short window label: 5h / wk / mo. */
const WINDOW_LABELS = {
    rolling: '5h',
    weekly: 'wk',
    monthly: 'mo',
};
/** Full window label key for the detail panel. */
const WINDOW_TITLE_KEYS = {
    rolling: 'ocgo.rolling',
    weekly: 'ocgo.weekly',
    monthly: 'ocgo.monthly',
};
/**
 * Format a duration (seconds) compactly: 45s / 23m / 5h 23m / 4d 6h.
 */
export function formatDuration(totalSec) {
    if (totalSec < 60)
        return `${Math.max(0, Math.floor(totalSec))}s`;
    if (totalSec < 3600)
        return `${Math.floor(totalSec / 60)}m`;
    if (totalSec < 86400) {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    return h > 0 ? `${d}d ${h}h` : `${d}d`;
}
/** Format an epoch-ms time as HH:MM. */
function formatClock(epochMs) {
    const d = new Date(epochMs);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}
/** The severity class of one window (muted → warn → err). */
function severityClass(window) {
    if (window.status === 'rate-limited' || window.percent >= 90)
        return css.segErr;
    if (window.percent >= 80)
        return css.segWarn;
    return undefined;
}
/** Render one window segment: `· 5h 23% (3h 25m)`. */
function WindowSegment(props) {
    const { window, sep } = props;
    const cls = severityClass(window);
    return (_jsxs("span", { className: css.seg, children: [_jsx("span", { className: css.segSep, children: sep }), _jsxs("span", { className: cls ?? undefined, children: [WINDOW_LABELS[window.kind], " ", window.percent, "% (", formatDuration(window.resetInSec), ")"] })] }));
}
/** The masked display text for one secret field: `••••abcd`. */
function maskedText(secret) {
    if (secret === undefined || !secret.set || secret.tail.length === 0)
        return '';
    return `${MASK}${secret.tail}`;
}
/**
 * The OpenCode Go usage chip: polls the host snapshot, renders the three
 * windows inline, and expands into a detail panel on click.
 * @param props - the composed dock entry props.
 */
export function OcgoDockEntry(props) {
    const [view, setView] = useState(null);
    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(true);
    // Panel mode: 'view' = windows + footer; 'set' = workspace/cookie editor.
    const [mode, setMode] = useState('view');
    const [config, setConfig] = useState(null);
    const [wsDraft, setWsDraft] = useState('');
    const [cookieDraft, setCookieDraft] = useState('');
    const wrapRef = useRef(null);
    const modeRef = useRef('view');
    modeRef.current = mode;
    const draftsRef = useRef({ ws: '', cookie: '' });
    draftsRef.current = { ws: wsDraft, cookie: cookieDraft };
    const configRef = useRef(null);
    configRef.current = config;
    // One periodic tick:
    //   1. resolve the session's CURRENT provider from the live in-memory
    //      selection (session.models, warm ~ms) and toggle `visible`;
    //   2. only while visible, fetch the usage snapshot.
    const pollNow = useCallback(() => {
        let live = true;
        const provider = props.provider;
        const resolveProvider = provider !== undefined
            ? Promise.resolve(provider()).then((p) => p ?? undefined, () => undefined)
            : Promise.resolve(undefined);
        resolveProvider.then((p) => {
            if (!live)
                return;
            const shown = isOpenCodeGo(p);
            setVisible(shown);
            if (!shown)
                setOpen(false);
            if (shown) {
                ocgoApi.view().then((snapshot) => {
                    if (live)
                        setView(snapshot);
                }, () => {
                    if (live)
                        setView(null);
                });
            }
        }, () => {
            if (live)
                setVisible(false);
        });
        return () => { live = false; };
    }, [props.provider]);
    useEffect(() => {
        const cleanup = pollNow();
        const timer = window.setInterval(pollNow, POLL_MS);
        const onVisibility = () => {
            if (document.visibilityState === 'visible')
                pollNow();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            cleanup();
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [pollNow]);
    /** Load the masked config into the editor drafts. */
    const loadConfig = useCallback(() => {
        ocgoApi.config().then((snapshot) => {
            setConfig(snapshot);
            setWsDraft(maskedText(snapshot.workspaceID));
            setCookieDraft(maskedText(snapshot.cookie));
        }, () => {
            // Editor still opens; drafts stay empty.
            setConfig(null);
            setWsDraft('');
            setCookieDraft('');
        });
    }, []);
    /** Submit any edited field; returns the write promise (fire-and-forget on blur). */
    const saveConfig = useCallback(() => {
        const current = configRef.current;
        const partial = {};
        if (current !== null) {
            const ws = draftsRef.current.ws.trim();
            if (ws.length > 0 && ws !== maskedText(current.workspaceID))
                partial.workspaceID = ws;
            const cookie = draftsRef.current.cookie.trim();
            if (cookie.length > 0 && cookie !== maskedText(current.cookie))
                partial.cookie = cookie;
        }
        else {
            // No baseline loaded (fetch failed): send whatever was typed.
            if (draftsRef.current.ws.trim().length > 0)
                partial.workspaceID = draftsRef.current.ws.trim();
            if (draftsRef.current.cookie.trim().length > 0)
                partial.cookie = draftsRef.current.cookie.trim();
        }
        if (Object.keys(partial).length === 0)
            return;
        ocgoApi.writeConfig(partial).then((snapshot) => {
            setConfig(snapshot);
            setWsDraft(maskedText(snapshot.workspaceID));
            setCookieDraft(maskedText(snapshot.cookie));
            // New credentials are live now (host invalidated its cache): poll now.
            pollNow();
        }, () => {
            // Ignore; the next poll resyncs and the editor keeps the drafts.
        });
    }, [pollNow]);
    /** Close the panel; in set mode a blur/close acts as confirm (save). */
    const closePanel = useCallback(() => {
        if (modeRef.current === 'set')
            saveConfig();
        setOpen(false);
        setMode('view');
    }, [saveConfig]);
    /** Open the editor (used by the Set button and the error chip). */
    const openSet = useCallback(() => {
        setMode('set');
        setOpen(true);
        loadConfig();
    }, [loadConfig]);
    // Close the detail panel when focus leaves the chip: any pointer press
    // outside the wrapper, or Escape. In set mode this CONFIRMS (saves).
    useEffect(() => {
        if (!open)
            return;
        const onPointerDown = (event) => {
            const target = event.target;
            if (target !== null && wrapRef.current !== null && !wrapRef.current.contains(target)) {
                closePanel();
            }
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape')
                closePanel();
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, closePanel]);
    const refresh = () => {
        ocgoApi.refresh().then((snapshot) => {
            setView(snapshot);
        }, () => {
            // Ignore transport errors on manual refresh; the next poll resyncs.
        });
    };
    const t = props.t;
    const sep = ` ${t('ocgo.sep')} `;
    // Hidden whenever the live provider is not opencode-go — the pi-ocgo-usage
    // behaviour: switching to e.g. DeepSeek official hides the chip within one
    // poll interval, so no other provider's user sees OpenCode Go numbers.
    if (!visible)
        return null;
    const error = view === null ? { code: 'fetch', message: t('ocgo.error', { code: 'fetch' }) }
        : view.error !== undefined
            ? { code: view.error, message: view.message ?? t('ocgo.error', { code: view.error }) }
            : null;
    // Error state: the chip opens the Set editor directly so a stale cookie can
    // be replaced in place; clicking outside (or Esc) confirms the write.
    if (error !== null) {
        return (_jsxs("span", { className: css.wrap, ref: wrapRef, "data-testid": "ocgo-chip-error", children: [_jsxs("button", { type: "button", className: open ? `${css.chip} ${css.chipOpen}` : css.chip, onClick: () => { if (open)
                        closePanel();
                    else
                        openSet(); }, title: `${error.message}\n${t('ocgo.set')}`, children: [t('ocgo.label'), ": <err:", error.code, ">"] }), open && (_jsx("span", { className: css.details, children: _jsxs("span", { className: css.setPanel, children: [_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('ocgo.workspaceID') }), _jsx("input", { className: css.fieldInput, value: wsDraft, placeholder: "wrk_\u2026", spellCheck: false, autoComplete: "off", onChange: (e) => { setWsDraft(e.target.value); }, onFocus: (e) => { if (e.target.value === maskedText(config?.workspaceID))
                                            e.target.select(); } })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('ocgo.cookie') }), _jsx("input", { className: css.fieldInput, value: cookieDraft, placeholder: "auth=\u2026", spellCheck: false, autoComplete: "off", onChange: (e) => { setCookieDraft(e.target.value); }, onFocus: (e) => { if (e.target.value === maskedText(config?.cookie))
                                            e.target.select(); } })] }), _jsxs("span", { className: css.foot, children: [_jsx("span", { className: css.setHint, children: t('ocgo.setHint') }), _jsx("button", { type: "button", className: css.refreshBtn, onClick: closePanel, children: t('ocgo.save') })] })] }) }))] }));
    }
    // TS: after the error early-return, `view` is a non-null success snapshot.
    const snapshot = view;
    const windows = [
        snapshot.rolling,
        snapshot.weekly,
        snapshot.monthly,
    ].filter((w) => w !== undefined);
    // No windows at all (e.g. brand-new account): show unavailable, refreshable.
    if (windows.length === 0) {
        return (_jsxs("button", { type: "button", className: css.chip, onClick: refresh, title: t('ocgo.refresh'), "data-testid": "ocgo-chip-empty", children: [t('ocgo.label'), ": ", t('ocgo.unavailable')] }));
    }
    return (_jsxs("span", { className: css.wrap, ref: wrapRef, "data-testid": "ocgo-chip", children: [_jsxs("button", { type: "button", className: open ? `${css.chip} ${css.chipOpen}` : css.chip, onClick: () => { if (open)
                    closePanel();
                else
                    setOpen(true); }, title: open ? t('ocgo.collapse') : t('ocgo.expand'), children: [_jsxs("span", { children: [t('ocgo.label'), ":"] }), windows.map((w) => (_jsx(WindowSegment, { window: w, sep: sep }, w.kind))), snapshot.updatedAt !== undefined && (_jsxs("span", { className: css.segSep, children: [sep, t('ocgo.fetchedAt', { time: formatClock(snapshot.updatedAt) })] }))] }), open && (_jsx("span", { className: css.details, children: mode === 'set' ? (_jsxs("span", { className: css.setPanel, children: [_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('ocgo.workspaceID') }), _jsx("input", { className: css.fieldInput, value: wsDraft, placeholder: "wrk_\u2026", spellCheck: false, autoComplete: "off", onChange: (e) => { setWsDraft(e.target.value); }, onFocus: (e) => { if (e.target.value === maskedText(config?.workspaceID))
                                        e.target.select(); } })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('ocgo.cookie') }), _jsx("input", { className: css.fieldInput, value: cookieDraft, placeholder: "auth=\u2026", spellCheck: false, autoComplete: "off", onChange: (e) => { setCookieDraft(e.target.value); }, onFocus: (e) => { if (e.target.value === maskedText(config?.cookie))
                                        e.target.select(); } })] }), _jsxs("span", { className: css.foot, children: [_jsx("span", { className: css.setHint, children: t('ocgo.setHint') }), _jsx("button", { type: "button", className: css.refreshBtn, onClick: closePanel, children: t('ocgo.save') })] })] })) : (_jsxs(_Fragment, { children: [windows.map((w) => (_jsxs("span", { className: css.window, children: [_jsx("span", { className: css.windowLabel, children: w.status === 'rate-limited' ? t('ocgo.rateLimited') : t(WINDOW_TITLE_KEYS[w.kind]) }), _jsxs("span", { className: css.windowValue, children: [_jsxs("span", { className: severityClass(w) ?? undefined, children: [w.percent, "%"] }), _jsx("span", { className: css.windowReset, children: t('ocgo.resetsIn', { duration: formatDuration(w.resetInSec) }) })] })] }, w.kind))), _jsxs("span", { className: css.foot, children: [_jsx("button", { type: "button", className: css.setBtn, onClick: openSet, children: t('ocgo.set') }), _jsxs("span", { className: css.footRight, children: [_jsx("button", { type: "button", className: css.refreshBtn, onClick: refresh, children: t('ocgo.refresh') }), snapshot.updatedAt !== undefined && (_jsx("span", { className: css.fetchedAt, children: t('ocgo.fetchedAt', { time: formatClock(snapshot.updatedAt) }) }))] })] })] })) }))] }));
}
