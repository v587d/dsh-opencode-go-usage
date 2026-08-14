import { n as DEFAULT_TIMEOUT_MS } from "./config-KWbOD-EK.js";
//#region src/invariant.ts
/**
* Package invariants — cheap structural checks run at import time on the
* host side. Mirrors the pattern used by other dsh plugin packages.
* @module dsh-ocgo-usage/invariant
*/
/** Assert a condition; throws a descriptive Error when violated. */
function invariant(condition, message) {
	if (!condition) throw new Error(`[dsh-ocgo-usage] ${message}`);
}
/** Run every package invariant once; throws on the first violation. */
function runOcgoInvariants() {
	invariant(true, "cache TTL must be within [60, 3600]");
	invariant(DEFAULT_TIMEOUT_MS > 0, "timeout must be positive");
	invariant("https://opencode.ai".startsWith("https://"), "base URL must be http(s)");
}
runOcgoInvariants();
//#endregion
export { invariant, runOcgoInvariants };
