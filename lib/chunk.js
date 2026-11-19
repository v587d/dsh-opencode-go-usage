import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
//#region src/config.ts
/**
* Configuration loader for dsh-ocgo-usage
*
* Priority: env vars > config file ($DSH_HOME/ocgo-usage.json) > built-in defaults
*
* The cookie is NEVER logged. If the config file is missing or unparseable,
* we silently fall back to env vars + defaults — the browser readout shows a
* clean `noconfig` error if neither source provides a usable value.
*
* Env var names match the pi-ocgo-usage extension so one shell profile works
* for both agents.
*
* The browser config editor (`/api/ocgo-usage/config`) reads a MASKED view
* (never the full cookie) and writes back through {@link writeConfigFile}.
* @module dsh-ocgo-usage/config
*/
const ENV_COOKIE = "OPENCODE_GO_COOKIE";
const ENV_WORKSPACE_ID = "OPENCODE_GO_WORKSPACE_ID";
const ENV_CACHE_TTL = "OPENCODE_GO_CACHE_TTL";
const ENV_TIMEOUT_MS = "OPENCODE_GO_TIMEOUT_MS";
const DEFAULT_BASE_URL = "https://opencode.ai";
const DEFAULT_TIMEOUT_MS = 2e4;
const MAX_CACHE_TTL = 3600;
/** Resolve the DSH home directory ($DSH_HOME or ~/.dsh). */
function dshHome() {
	const explicit = process.env.DSH_HOME;
	if (typeof explicit === "string" && explicit.length > 0) return explicit;
	return join(homedir(), ".dsh");
}
/** Resolved location of the plugin config file. */
function configFilePath() {
	return join(dshHome(), "ocgo-usage.json");
}
/**
* Load and merge config from file + env vars.
* Returns a fully resolved OcgoConfig; never throws.
*/
function loadConfig() {
	const fileConfig = readFileConfig();
	const cookie = normalizeCookie(pickString(process.env[ENV_COOKIE], asString(fileConfig?.cookie)));
	const workspaceID = pickString(process.env[ENV_WORKSPACE_ID], asString(fileConfig?.workspaceID));
	const baseUrl = pickString(process.env["OPENCODE_GO_BASE_URL"], asString(fileConfig?.baseUrl)) || "https://opencode.ai";
	const cacheTTL = clamp(pickNumber(process.env[ENV_CACHE_TTL], asNumber(fileConfig?.cacheTTL), 300), 60, MAX_CACHE_TTL);
	const configuredTimeout = pickNumber(process.env[ENV_TIMEOUT_MS], asNumber(fileConfig?.timeoutMs), DEFAULT_TIMEOUT_MS);
	return {
		cookie,
		workspaceID,
		baseUrl,
		cacheTTL,
		timeoutMs: configuredTimeout > 0 ? configuredTimeout : DEFAULT_TIMEOUT_MS
	};
}
/** Mask the last 4 characters of a secret for the browser (full value when ≤ 4 chars). */
function maskSecret(value) {
	if (value === void 0 || value.length === 0) return {
		set: false,
		tail: ""
	};
	return {
		set: true,
		tail: value.length <= 4 ? value : value.slice(-4)
	};
}
/** The browser-facing masked config view (never reveals the full cookie). */
function maskedConfigView() {
	const cfg = loadConfig();
	return {
		workspaceID: maskSecret(cfg.workspaceID),
		cookie: maskSecret(cfg.cookie)
	};
}
/**
* Write the cookie into the config file (preserving any other fields),
* chmod 600, and return the updated masked view. The value is normalized like
* env input (a bare token gets `auth=` prefixed). An absent field is left
* untouched; pass `null` to clear it.
*/
function writeConfigFile(partial) {
	const next = { ...readFileConfig() ?? {} };
	if (partial.workspaceID !== void 0) {
		const v = typeof partial.workspaceID === "string" ? partial.workspaceID.trim() : "";
		if (v.length > 0) next.workspaceID = v;
		else delete next.workspaceID;
	}
	if (partial.cookie !== void 0) {
		const v = typeof partial.cookie === "string" ? normalizeCookie(partial.cookie) : void 0;
		if (v !== void 0 && v.length > 0) next.cookie = v;
		else delete next.cookie;
	}
	const path = configFilePath();
	try {
		writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, { mode: 384 });
	} catch {
		return maskedConfigView();
	}
	return {
		workspaceID: maskSecret(typeof next.workspaceID === "string" ? next.workspaceID : void 0),
		cookie: maskSecret(typeof next.cookie === "string" ? next.cookie : void 0)
	};
}
function readFileConfig() {
	const path = configFilePath();
	if (!existsSync(path)) return null;
	try {
		const raw = readFileSync(path, "utf8");
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === "object") return parsed;
		return null;
	} catch {
		return null;
	}
}
function pickString(envVal, fileVal) {
	if (envVal && envVal.length > 0) return envVal;
	if (fileVal && fileVal.length > 0) return fileVal;
}
/**
* Normalize a user-provided cookie string into the `Cookie:` header value the
* console API read sends.
*
* Accepts the whole header as a browser copies it (`oc_locale=zh;
* desktop_promo_dismissed=1; auth=Fe26.2*...`), the bare `auth` pair, or the
* bare opaque token. Then:
*  - The `auth=` pair is located anywhere in the string — assuming the first
*    segment is the token corrupted such headers into `auth=oc_locale=zh`, a
*    fake cookie the site rejects.
*  - Every other pair the paste carried is KEPT: the console validates its own
*    cookie set, so dropping pairs the browser sends can fail authentication
*    for reasons this plugin cannot predict. Unknown pairs are inert.
*
* @param input - the pasted cookie header or token.
* @returns a `Cookie:` header value, or undefined when no auth token can be
* found (the caller refuses to persist a broken cookie rather than fabricating
* one).
*/
function normalizeCookie(input) {
	if (!input) return void 0;
	const trimmed = input.trim();
	if (!trimmed) return void 0;
	const segments = trimmed.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
	let auth = segments.find((s) => /^auth=/i.test(s));
	if (auth === void 0) {
		const bare = segments.find((s) => !s.includes("=") && s.length >= 8);
		if (bare !== void 0) auth = `auth=${bare}`;
	}
	if (auth === void 0) return void 0;
	const authValue = auth.slice(auth.indexOf("=") + 1).trim().replace(/^"|"$/g, "");
	if (authValue.length === 0) return void 0;
	const pairs = [`auth=${authValue}`];
	for (const segment of segments) {
		if (segment === auth) continue;
		if (!segment.includes("=")) continue;
		if (/^auth=/i.test(segment)) continue;
		pairs.push(segment);
	}
	return pairs.join("; ");
}
function pickNumber(envVal, fileVal, fallback) {
	const fromEnv = envVal ? Number.parseInt(envVal, 10) : NaN;
	if (Number.isFinite(fromEnv)) return fromEnv;
	if (fileVal !== void 0 && Number.isFinite(fileVal)) return fileVal;
	return fallback;
}
function asString(v) {
	return typeof v === "string" && v.length > 0 ? v : void 0;
}
function asNumber(v) {
	if (typeof v === "number" && Number.isFinite(v)) return v;
	if (typeof v === "string") {
		const n = Number.parseInt(v, 10);
		if (Number.isFinite(n)) return n;
	}
}
function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n));
}
//#endregion
export { maskedConfigView as a, loadConfig as i, DEFAULT_TIMEOUT_MS as n, normalizeCookie as o, configFilePath as r, writeConfigFile as s, DEFAULT_BASE_URL as t };
