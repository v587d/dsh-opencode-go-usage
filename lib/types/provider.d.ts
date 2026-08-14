/**
 * Provider matching for dsh-opencode-go-usage: decide when the chip should show.
 * Pure and shared so the client logic is unit-testable without a browser.
 * @module dsh-opencode-go-usage/provider
 */
/** The provider whose model selection shows the chip. */
export declare const OCGO_PROVIDER = "opencode-go";
/** True when a provider/model means "show OpenCode Go usage". */
export declare function isOpenCodeGo(provider: string | undefined): boolean;
//# sourceMappingURL=provider.d.ts.map