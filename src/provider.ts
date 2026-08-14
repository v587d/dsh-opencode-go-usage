/**
 * Provider matching for dsh-ocgo-usage: decide when the chip should show.
 * Pure and shared so the client logic is unit-testable without a browser.
 * @module dsh-ocgo-usage/provider
 */

/** The provider whose model selection shows the chip. */
export const OCGO_PROVIDER = 'opencode-go'

/** True when a provider/model means "show OpenCode Go usage". */
export function isOpenCodeGo(provider: string | undefined): boolean {
  return provider === OCGO_PROVIDER || provider?.startsWith(`${OCGO_PROVIDER}/`) === true
}
