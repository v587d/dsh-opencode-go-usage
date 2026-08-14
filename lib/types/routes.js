/**
 * dsh-opencode-go-usage HTTP routes — the browser half talks to the host through
 * plain same-origin JSON endpoints (`/api/ocgo-usage`, `/api/ocgo-usage/refresh`
 * and the config editor `/api/ocgo-usage/config`), which the host answers from
 * the cached OpenCode Go usage read. The client never sees the cookie — the
 * config editor serves only masked tails and accepts new values to write.
 * @module dsh-opencode-go-usage/routes
 */
import { maskedConfigView, writeConfigFile } from "./config.js";
/** Browser-facing base path of the usage API. */
export const OCGO_API_PREFIX = '/api/ocgo-usage';
/** Write one JSON response. */
function json(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
}
/** Require the method or answer 405. */
function requireMethod(req, res, method) {
    if (req.method === method)
        return true;
    json(res, 405, { ok: false, error: 'method-not-allowed' });
    return false;
}
/** Read a bounded JSON request body. */
function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > 64 * 1024) {
                reject(new Error('body-too-large'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (raw.length === 0) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(raw));
            }
            catch {
                reject(new Error('bad-json'));
            }
        });
        req.on('error', reject);
    });
}
/** Wrap one async usage read as a GET JSON route. */
function getRoute(path, run) {
    return {
        kind: 'exact',
        path,
        handler: (req, res) => {
            if (!requireMethod(req, res, 'GET'))
                return;
            Promise.resolve(run()).then((value) => json(res, 200, value), (error) => {
                json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
            });
        },
    };
}
/**
 * The config editor routes: GET the masked view, POST new values to write.
 * A successful write invalidates the usage cache so the next poll re-queries
 * with the fresh cookie/workspace immediately (bypassing any cooldown).
 */
function makeConfigRoutes(service) {
    const read = () => maskedConfigView();
    const write = async (req) => {
        const body = (await readJsonBody(req));
        // Distinguish "field absent" (keep current) from "field null/empty"
        // (clear it): only keys PRESENT in the body are touched.
        const partial = {};
        if ('cookie' in body) {
            partial.cookie = typeof body.cookie === 'string' ? body.cookie : null;
        }
        if ('workspaceID' in body) {
            partial.workspaceID = typeof body.workspaceID === 'string' ? body.workspaceID : null;
        }
        const view = writeConfigFile(partial);
        service.invalidateCache();
        return view;
    };
    return [
        {
            kind: 'exact',
            path: `${OCGO_API_PREFIX}/config`,
            handler: (req, res) => {
                if (req.method === 'GET') {
                    Promise.resolve(read()).then((value) => json(res, 200, value), (error) => {
                        json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
                    });
                    return;
                }
                if (req.method === 'POST') {
                    Promise.resolve(write(req)).then((value) => json(res, 200, value), (error) => {
                        json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
                    });
                    return;
                }
                json(res, 405, { ok: false, error: 'method-not-allowed' });
            },
        },
    ];
}
/** Build the full usage API route family for one service. */
export function makeOcgoRoutes(service) {
    return [
        getRoute(OCGO_API_PREFIX, () => service.view()),
        getRoute(`${OCGO_API_PREFIX}/refresh`, () => service.refresh()),
        ...makeConfigRoutes(service),
    ];
}
