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
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type OcgoKey } from './locales.ts';
export { OCGO_PROVIDER } from '../provider.ts';
export { OcgoDockEntry, formatDuration } from './OcgoDockEntry.tsx';
export type { OcgoDockEntryProps } from './OcgoDockEntry.tsx';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** dsh-ocgo-usage chip copy. */
        ocgo: OcgoKey;
    }
}
/** Required services: slots for the composer tool-row entry, locale for the copy. */
export declare const inject: string[];
/**
 * Register the usage chip into the composer tool row next to the model selector.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map