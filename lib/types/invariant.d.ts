/**
 * Package invariants — cheap structural checks run at import time on the
 * host side. Mirrors the pattern used by other dsh plugin packages.
 * @module dsh-ocgo-usage/invariant
 */
/** Assert a condition; throws a descriptive Error when violated. */
export declare function invariant(condition: unknown, message: string): asserts condition;
/** Run every package invariant once; throws on the first violation. */
export declare function runOcgoInvariants(): void;
//# sourceMappingURL=invariant.d.ts.map