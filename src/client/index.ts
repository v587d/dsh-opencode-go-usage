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
 * Provider visibility is decided by the HOST: each endpoint response carries
 * a `visible` flag the host resolves in-process from the session's current
 * model provider, so a poll stays one lightweight JSON round trip. When a
 * session's model is not `opencode-go` the host reports `visible: false` and
 * the chip hides — mirroring pi-ocgo-usage — so a DeepSeek-official (or any
 * other) user never sees OpenCode Go numbers.
 * @module dsh-ocgo-usage/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ui-conversation SlotMap merge (the composer dock entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
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

/** Required services: slots for the composer-dock entry, locale for the copy. */
export const inject = ['slots', 'locale']

/** The injected business face (empty today: visibility + usage ride `/api/ocgo-usage?session=`). */
export interface OcgoInjected {}

/**
 * Register the usage chip into the composer dock band.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ocgo-usage: dictionaries')

  ctx.inject(['slots', 'conversation'], (scope: ClientContext) => {
    scope.effect(() => scope.slots.register({
      name: 'conversation.composer.dock',
      id: 'ocgo-usage',
      order: 110,
      locale: NS,
      inject: (): OcgoInjected => ({}),
    }, OcgoDockEntry), 'dsh-ocgo-usage: chip registration')
  })
}
