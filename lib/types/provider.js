/**
 * Provider matching for dsh-opencode-go-usage: decide when the chip should show.
 * Pure and shared so the client logic is unit-testable without a browser.
 * @module dsh-opencode-go-usage/provider
 */
/** The provider whose model selection shows the chip. */
export const OCGO_PROVIDER = 'opencode-go';
/** True when a provider/model means "show OpenCode Go usage". */
export function isOpenCodeGo(provider) {
    return provider === OCGO_PROVIDER || provider?.startsWith(`${OCGO_PROVIDER}/`) === true;
}
