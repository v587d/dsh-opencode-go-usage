/**
 * dsh-ocgo-usage browser half — registers the OpenCode Go usage chip into
 * the composer tool row (`conversation.input.right`, next to the model
 * selector) and reads the host's same-origin `/api/ocgo-usage` JSON endpoints:
 * poll the host snapshot (every 10 s), refresh on demand. The chip shows the
 * three usage windows (rolling 5h / weekly / monthly) in a compact form; while
 * the host reports no usable data (missing config, cookie error, or provider
 * failure) it renders a compact `<err:code>` state with a manual refresh
 * action.
 *
 * Provider visibility is decided CLIENT-side: the chip reads the session's
 * `modelSelection` projection (a Host-computed value the client holds per
 * key), so switching models through `/model` hides or shows the chip on the
 * same render. The chip renders nothing while the current provider is not
 * `opencode-go`, mirroring pi-ocgo-usage.
 * @module dsh-ocgo-usage/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: the `modelSelection` projection key this half reads.
import type {} from '@deepseek-ai/dsh-agent/types'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ui-conversation SlotMap merge (the composer tool-row entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the renderer's Context merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the session standard props (sessionId, useProjection).
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
// Type-only: the SlotMap and LocaleNamespaceMap merge point itself.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
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

/** Required services: slots for the composer tool-row entry, locale for the copy. */
export const inject = ['slots', 'locale']

/**
 * Register the usage chip into the composer tool row next to the model selector.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ocgo-usage: dictionaries')

  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'ocgo-usage',
    order: 110,
    locale: NS,
  }, OcgoDockEntry))
}
