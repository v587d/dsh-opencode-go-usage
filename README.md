# dsh-ocgo-usage

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) bundle that displays [OpenCode Go](https://opencode.ai/docs/go/) subscription usage in the Web GUI's composer dock — the same seat as the built-in conversation stats line.

The Web counterpart of the [pi-ocgo-usage](https://github.com/v587d/pi-ocgo-usage) Pi extension: three usage windows (rolling 5h, weekly, monthly) with percentages and reset countdowns, color-coded so you see a window approaching exhaustion before you hit the rate limit mid-work.

```
OpenCode Go: 5h 0% (1h 23m) · wk 65% (2d 20h) · mo 83% (6d 21h) · upd 20:15
```

- **Three windows** — rolling (5h) / weekly / monthly percent + reset countdown
- **Color thresholds** — muted → warning (≥80%) → error (≥90% or rate-limited)
- **Data freshness** — `upd HH:MM` shows the last successful fetch time
- **Non-intrusive** — the chip polls the host every 30 s (and on tab refocus); the host caches for 300 s (TTL configurable) with a 60 s failure cooldown, so opencode.ai is never hammered
- **Click to expand** — per-window detail panel with reset countdowns and a manual refresh
- **Graceful degradation** — missing config shows `<err:noconfig>`, HTTP failures `<err:httpXXX>`
- **Cookie stays on the host** — the browser only ever talks to the same-origin `/api/ocgo-usage` JSON endpoint; the cookie never reaches the page

> **⚠️ Requires an OpenCode Go session cookie.** The cookie is a full user session (not an API key) and grants access to your entire OpenCode account. Treat it like a password — see [Configuration](#configuration).

## Requirements

- DeepSeek Harness `0.1.0-rc.6` or newer (web profile)
- pnpm on `PATH` (for `dsh plugin`)

## Installation

From a local checkout (development):

```sh
git clone <your-fork>/dsh-ocgo-usage.git   # or just cd into this directory
cd dsh-ocgo-usage
pnpm install
pnpm run build
dsh plugin --profile web add link:$(pwd)
```

Or from a git URL / npm once published:

```sh
dsh plugin --profile web add <git-or-npm-spec>
```

**Restart `dsh web`, then refresh the page.** The usage chip appears in the composer dock next to the conversation stats line. Verify the plugin layer is composed without booting:

```sh
dsh --profile web --dump-config   # shows a "# == dsh-ocgo-usage" layer
```

## Configuration

### Required: OpenCode Go session cookie + workspace ID

1. Open `https://opencode.ai/workspace/<your-workspace-id>/go` in a browser (sign in if prompted). The URL is your workspace ID — copy the part starting with `wrk_`.
2. Open DevTools → Application → Cookies → `https://opencode.ai`. Copy the **full value** of the `auth` cookie (looks like `Fe26.2*<base64>*<sig>*<exp>*<hmac>`).
3. Set environment variables (preferred — same names as pi-ocgo-usage):

   ```sh
   export OPENCODE_GO_COOKIE="auth=Fe26.2*...; oc_locale=zh"
   export OPENCODE_GO_WORKSPACE_ID="wrk_01XXXXXXXXXXXXXXXXXXXXXXXX"
   ```

   Or write `$DSH_HOME/ocgo-usage.json` (default `~/.dsh/ocgo-usage.json`):

   ```jsonc
   {
     "cookie": "auth=Fe26.2*...; oc_locale=zh",
     "workspaceID": "wrk_01XXXXXXXXXXXXXXXXXXXXXXXX"
   }
   ```

   ```sh
   chmod 600 ~/.dsh/ocgo-usage.json
   ```

### Optional overrides

| Env var | Default | Description |
|---|---|---|
| `OPENCODE_GO_BASE_URL` | `https://opencode.ai` | API base URL |
| `OPENCODE_GO_CACHE_TTL` | `300` | Host cache TTL in seconds, clamped to 60–3600 |
| `OPENCODE_GO_TIMEOUT_MS` | `10000` | HTTP timeout |

Composition-level config (via `~/.dsh/profiles/web/cordis.patch.yml`):

```yaml
- id: ocgo-usage
  config:
    enabled: false    # master switch, default true
```

> **Cookie expiration:** the `auth` cookie is valid for 1 year from issue. When it expires (or is revoked), the page 302-redirects to the login page; the chip then shows `<err:http302>` instead of stale numbers. Re-login to opencode.ai and update the cookie.

## How it works

- **Host half** (`src/index.ts`, `src/service.ts`, `src/api.ts`, `src/routes.ts`) — fetches `GET /workspace/<wrk>/go` with the cookie, parses the SSR-rendered `data-slot="usage-item"` blocks into `{percent, resetInSec, status}` per window, caches the result, and serves it as same-origin JSON at `/api/ocgo-usage` (+ `/api/ocgo-usage/refresh`).
- **Browser half** (`src/client/`) — registers a chip into the `conversation.composer.dock` slot, polls the host endpoint every 30 s, and renders the three windows with severity colors.

The browser never sees the cookie; all fetching and parsing happen on the host.

## Security

- The `auth` cookie is a **full OpenCode user session**. Anyone with it can access every workspace, subscription, and billing detail in your account.
- The plugin **never** logs the cookie, includes it in error messages, or sends it to the browser.
- The config file is only read (write it yourself, `chmod 600`); nothing is persisted by the plugin.

## Development

```sh
pnpm install
pnpm run build     # tsc -b && tsdown → lib/
pnpm run typecheck # tsc -b --pretty false
pnpm test          # vitest run (parser / config / service)
```

The build config (`shared/tsdown.client.ts`) is adapted from [dsh-balance-meter](https://github.com/Ghost011118/dsh-balance-meter) (BSD-3-Clause), itself a copy of the official DSH `packages/client/tsdown.client.ts` — it emits the `window.__ModuleLoader__.load({id, factory})` closure-factory artifact the web shell's module table consumes.

## License

MIT — see [LICENSE](./LICENSE).
