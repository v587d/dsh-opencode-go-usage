/**
 * dsh-ocgo-usage browser half — registers the OpenCode Go usage chip into
 * the composer dock band (`conversation.composer.dock`, the same seat the
 * official conversation stats line uses) and reads the host's same-origin
 * `/api/ocgo-usage` JSON endpoints: poll the host snapshot (~30 s), refresh
 * on demand. The chip shows the three usage windows (rolling 5h / weekly /
 * monthly) with reset countdowns; while the host reports no usable data
 * (missing config, cookie error, or provider failure) it renders a compact
 * `<err:code>` state with a manual refresh action.
 *
 * The chip is shown ONLY while the current session's model routes through
 * the `opencode-go` provider (matching the pi-ocgo-usage extension). When
 * the user switches to any other provider (e.g. DeepSeek official), the chip
 * hides so it never misleads a non-OpenCode-Go user.
 * @module dsh-ocgo-usage/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ui-conversation SlotMap merge (the composer dock entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: the client connection handle exposing the api client.
import type {} from '@deepseek-ai/dsh-client-connection/client'
import { OcgoDockEntry, type OcgoDockEntryProps } from './OcgoDockEntry.tsx'
import { en, zh, type OcgoKey } from './locales.ts'

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

/** The provider whose model selection shows the chip. */
export const OCGO_PROVIDER = 'opencode-go'

/** Required services: slots for the composer-dock entry, locale for the copy. */
export const inject = ['slots', 'locale']

/** The injected business face: reads the current session's model provider host-side. */
export interface OcgoInjected {
  /**
   * Resolve the provider of the current session's model selection
   * (`undefined` when the session has none or the directory could not load).
   */
  provider(): Promise<string | undefined>
}

/**
 * Register the usage chip into the composer dock band.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ocgo-usage: dictionaries')

  // The connection service is a hard dependency for the model wire face.
  ctx.inject(['slots', 'conversation', 'connection'], (scope: ClientContext) => {
    scope.effect(() => scope.slots.register({
      name: 'conversation.composer.dock',
      id: 'ocgo-usage',
      order: 110,
      locale: NS,
      inject: (sessionId): OcgoInjected => {
        // The client connection handle carries the shared API client
        // (ctx.connection.api). session.models is the advisory directory;
        // current.provider is the live selection.
        const handle = scope.get('connection') as
          | { readonly api: { sessions: { models(request: { sessionId: string }): Promise<{ result: { ok: boolean; value?: { current?: { provider?: string } } } }> } } }
          | undefined
        return {
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
