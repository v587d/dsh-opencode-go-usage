/**
 * dsh-ocgo-usage browser half — registers the OpenCode Go usage chip into
 * the composer dock band (`conversation.composer.dock`, the same seat the
 * official conversation stats line uses) and reads the host's same-origin
 * `/api/ocgo-usage` JSON endpoints: poll the host snapshot (every 10 s),
 * refresh on demand. The chip shows the three usage windows (rolling 5h /
 * weekly / monthly) with reset countdowns; while the host reports no usable
 * data (missing config, cookie error, or provider failure) it renders a
 * compact `<err:code>` state with a manual refresh action.
 *
 * Provider visibility is decided CLIENT-side from the live model selection:
 * `session.models` reads the in-memory current selection (2-3 ms warm, no
 * network), so switching models via `/model` is reflected on the very next
 * poll — the host's request-header fold lags until the next real request,
 * which is why visibility does not ride the usage endpoint. The chip renders
 * nothing while the current provider is not `opencode-go`, mirroring
 * pi-ocgo-usage.
 * @module dsh-ocgo-usage/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ui-conversation SlotMap merge (the composer dock entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import { OCGO_PROVIDER } from '../provider.ts'
import { OcgoDockEntry, type OcgoDockEntryProps } from './OcgoDockEntry.tsx'
import { en, zh, type OcgoKey } from './locales.ts'

export { OCGO_PROVIDER } from '../provider.ts'

export { OcgoDockEntry, formatDuration } from './OcgoDockEntry.tsx'
export type { OcgoDockEntryProps } from './OcgoDockEntry.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-ocgo-usage chip copy. */
    ocgo: OcgoKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'ocgo'

/** Required services: slots for the composer-dock entry, locale for the copy. */
export const inject = ['slots', 'locale']

/** The injected business face: the dock's owning session plus a live provider read. */
export interface OcgoInjected {
  /** The session this dock entry renders for (slot inject factory arg). */
  dockSessionId: string | undefined
  /**
   * Resolve the CURRENT model provider of the dock's session from the live
   * in-memory selection (`session.models`, warm ~ms). Undefined when the
   * session has no selection yet.
   */
  provider(): Promise<string | undefined>
}

/**
 * Register the usage chip into the composer dock band.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ocgo-usage: dictionaries')

  ctx.inject(['slots', 'conversation', 'connection'], (scope: ClientContext) => {
    scope.effect(() => scope.slots.register({
      name: 'conversation.composer.dock',
      id: 'ocgo-usage',
      order: 110,
      locale: NS,
      inject: (sessionId): OcgoInjected => {
        const handle = scope.get('connection') as
          | { readonly api: { sessions: { models(request: { sessionId: string }): Promise<{ result: { ok: boolean; value?: { current?: { provider?: string } } } }> } } }
          | undefined
        return {
          dockSessionId: sessionId,
          provider: async () => {
            const sessions = handle?.api?.sessions
            if (sessions === undefined) return undefined
            try {
              const { result } = await sessions.models({ sessionId })
              if (!result.ok) return undefined
              return result.value?.current?.provider
            } catch {
              return undefined
            }
          },
        }
      },
    }, OcgoDockEntry), 'dsh-ocgo-usage: chip registration')
  })
}
