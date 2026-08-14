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
import { OcgoDockEntry } from "./OcgoDockEntry.js";
import { en, zh } from "./locales.js";
export { OCGO_PROVIDER } from "../provider.js";
export { OcgoDockEntry, formatDuration } from "./OcgoDockEntry.js";
/** Dictionary namespace owned by this plugin. */
const NS = 'ocgo';
/** Required services: slots for the composer-dock entry, locale for the copy. */
export const inject = ['slots', 'locale'];
/**
 * Register the usage chip into the composer dock band.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ocgo-usage: dictionaries');
    ctx.inject(['slots', 'conversation', 'connection'], (scope) => {
        scope.effect(() => scope.slots.register({
            name: 'conversation.composer.dock',
            id: 'ocgo-usage',
            order: 110,
            locale: NS,
            inject: (sessionId) => {
                const handle = scope.get('connection');
                return {
                    dockSessionId: sessionId,
                    provider: async () => {
                        const sessions = handle?.api?.sessions;
                        if (sessions === undefined)
                            return undefined;
                        try {
                            const { result } = await sessions.models({ sessionId });
                            if (!result.ok)
                                return undefined;
                            return result.value?.current?.provider;
                        }
                        catch {
                            return undefined;
                        }
                    },
                };
            },
        }, OcgoDockEntry), 'dsh-ocgo-usage: chip registration');
    });
}
