/**
 * The composer dock entry: the OpenCode Go usage readout, mounted in the
 * composer dock band (`conversation.composer.dock`) beside the conversation
 * stats line. The chip polls the host `/api/ocgo-usage` endpoint for the
 * three usage windows (rolling 5h / weekly / monthly); clicking reveals
 * per-window reset countdowns, a Set editor (masked workspace/cookie) and a
 * manual refresh. In the error state, clicking the chip opens the Set editor
 * directly so a stale credential can be replaced in place.
 * @module dsh-opencode-go-usage/client/OcgoDockEntry
 */
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
/** Composed props of the dock entry (runtime + locale + injected session/provider face). */
export type OcgoDockEntryProps = PropsRuntime<'conversation.composer.dock'> & PropsLocale<typeof NS> & {
    dockSessionId?: string | undefined;
    provider?: () => Promise<string | undefined>;
};
/**
 * Format a duration (seconds) compactly: 45s / 23m / 5h 23m / 4d 6h.
 */
export declare function formatDuration(totalSec: number): string;
/**
 * The OpenCode Go usage chip: polls the host snapshot, renders the three
 * windows inline, and expands into a detail panel on click.
 * @param props - the composed dock entry props.
 */
export declare function OcgoDockEntry(props: OcgoDockEntryProps): React.ReactElement | null;
//# sourceMappingURL=OcgoDockEntry.d.ts.map