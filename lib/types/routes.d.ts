/**
 * dsh-opencode-go-usage HTTP routes — the browser half talks to the host through
 * plain same-origin JSON endpoints (`/api/ocgo-usage`, `/api/ocgo-usage/refresh`
 * and the config editor `/api/ocgo-usage/config`), which the host answers from
 * the cached OpenCode Go usage read. The client never sees the cookie — the
 * config editor serves only masked tails and accepts new values to write.
 * @module dsh-opencode-go-usage/routes
 */
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import type { OcgoUsageService } from './service.ts';
/** Browser-facing base path of the usage API. */
export declare const OCGO_API_PREFIX = "/api/ocgo-usage";
/** Build the full usage API route family for one service. */
export declare function makeOcgoRoutes(service: OcgoUsageService): WebRoute[];
//# sourceMappingURL=routes.d.ts.map