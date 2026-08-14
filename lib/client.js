window.__ModuleLoader__.load({
	id: "dsh-ocgo-usage",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/provider.ts
		/**
		* Provider matching for dsh-ocgo-usage: decide when the chip should show.
		* Pure and shared so the client logic is unit-testable without a browser.
		* @module dsh-ocgo-usage/provider
		*/
		/** The provider whose model selection shows the chip. */
		const OCGO_PROVIDER = "opencode-go";
		/** True when a provider/model means "show OpenCode Go usage". */
		function isOpenCodeGo(provider) {
			return provider === "opencode-go" || provider?.startsWith(`opencode-go/`) === true;
		}
		//#endregion
		//#region \0dsh-css:/home/shawn/projects/dsh-plugin/src/client/ocgo.module.css.mjs
		const css = ".WOVdKW_wrap{display:inline-flex;position:relative}.WOVdKW_chip{border:1px solid var(--dsh-color-border,#80808059);background:var(--dsh-color-surface,transparent);height:22px;color:var(--dsh-color-text,inherit);cursor:pointer;white-space:nowrap;user-select:none;border-radius:999px;align-items:center;gap:6px;padding:0 8px;font-size:12px;line-height:1;display:inline-flex}.WOVdKW_chip:hover,.WOVdKW_chipOpen{border-color:var(--dsh-color-accent,#50a0ffb3)}.WOVdKW_seg{align-items:baseline;gap:3px;display:inline-flex}.WOVdKW_segSep{opacity:.45}.WOVdKW_segWarn{color:var(--dsh-color-warning,#d29922)}.WOVdKW_segErr{color:var(--dsh-color-danger,#e5534b)}.WOVdKW_details{z-index:40;border:1px solid var(--dsh-color-border,#80808059);background:var(--dsh-color-surface-elevated,#1f1f1f);min-width:220px;color:var(--dsh-color-text,inherit);border-radius:8px;flex-direction:column;gap:6px;padding:8px 10px;font-size:12px;display:flex;position:absolute;bottom:calc(100% + 6px);left:50%;transform:translate(-50%);box-shadow:0 4px 12px #0000004d}.WOVdKW_window{justify-content:space-between;align-items:center;gap:12px;display:flex}.WOVdKW_windowLabel{color:var(--dsh-color-text-secondary,inherit);opacity:.9;align-items:center;gap:6px;display:inline-flex}.WOVdKW_windowValue{font-variant-numeric:tabular-nums;align-items:baseline;gap:6px;display:inline-flex}.WOVdKW_windowReset{opacity:.65;font-variant-numeric:tabular-nums;font-size:11px}.WOVdKW_foot{border-top:1px solid var(--dsh-color-border,#80808040);justify-content:space-between;align-items:center;gap:8px;padding-top:6px;font-size:11px;display:flex}.WOVdKW_footRight{align-items:center;gap:8px;margin-left:auto;display:inline-flex}.WOVdKW_setBtn{color:var(--dsh-color-accent,#50a0ffe6);cursor:pointer;text-transform:lowercase;background:0 0;border:0;padding:0;font-size:11px}.WOVdKW_setBtn:hover{text-decoration:underline}.WOVdKW_fetchedAt{opacity:.6}.WOVdKW_refreshBtn{color:var(--dsh-color-accent,#50a0ffe6);cursor:pointer;background:0 0;border:0;padding:0;font-size:11px}.WOVdKW_refreshBtn:hover{text-decoration:underline}.WOVdKW_setPanel{flex-direction:column;gap:8px;min-width:260px;display:flex}.WOVdKW_field{flex-direction:column;gap:3px;display:flex}.WOVdKW_fieldLabel{color:var(--dsh-color-text-secondary,inherit);opacity:.75;font-variant-numeric:tabular-nums;font-size:11px}.WOVdKW_fieldInput{box-sizing:border-box;border:1px solid var(--dsh-color-border,#80808059);background:var(--dsh-color-surface,transparent);width:100%;color:var(--dsh-color-text,inherit);font-variant-numeric:tabular-nums;border-radius:6px;outline:none;height:26px;padding:0 8px;font-size:12px}.WOVdKW_fieldInput:focus{border-color:var(--dsh-color-accent,#50a0ffb3)}.WOVdKW_setHint{opacity:.55;font-size:11px}.WOVdKW_errorText{color:var(--dsh-color-danger,#e5534b);white-space:normal;max-width:240px;font-size:11px}";
		const tagId = "dsh-ocgo-usage/ocgo.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-ocgo-usage";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var ocgo_module_css_default = {
			"chip": "WOVdKW_chip",
			"chipOpen": "WOVdKW_chipOpen",
			"details": "WOVdKW_details",
			"errorText": "WOVdKW_errorText",
			"fetchedAt": "WOVdKW_fetchedAt",
			"field": "WOVdKW_field",
			"fieldInput": "WOVdKW_fieldInput",
			"fieldLabel": "WOVdKW_fieldLabel",
			"foot": "WOVdKW_foot",
			"footRight": "WOVdKW_footRight",
			"refreshBtn": "WOVdKW_refreshBtn",
			"seg": "WOVdKW_seg",
			"segErr": "WOVdKW_segErr",
			"segSep": "WOVdKW_segSep",
			"segWarn": "WOVdKW_segWarn",
			"setBtn": "WOVdKW_setBtn",
			"setHint": "WOVdKW_setHint",
			"setPanel": "WOVdKW_setPanel",
			"window": "WOVdKW_window",
			"windowLabel": "WOVdKW_windowLabel",
			"windowReset": "WOVdKW_windowReset",
			"windowValue": "WOVdKW_windowValue",
			"wrap": "WOVdKW_wrap"
		};
		//#endregion
		//#region src/client/OcgoDockEntry.tsx
		/**
		* The composer dock entry: the OpenCode Go usage readout, mounted in the
		* composer dock band (`conversation.composer.dock`) beside the conversation
		* stats line. The chip polls the host `/api/ocgo-usage` endpoint for the
		* three usage windows (rolling 5h / weekly / monthly); clicking reveals
		* per-window reset countdowns, a Set editor (masked workspace/cookie) and a
		* manual refresh. In the error state, clicking the chip opens the Set editor
		* directly so a stale credential can be replaced in place.
		* @module dsh-ocgo-usage/client/OcgoDockEntry
		*/
		/** Poll interval for the host snapshot and the live model provider. */
		const POLL_MS = 1e4;
		/** The masked-prefix shown before the last-4 tail of a secret. */
		const MASK = "••••";
		/** Same-origin JSON fetch helper. */
		async function ocgoFetch(path, init) {
			const response = await fetch(path, init);
			if (!response.ok) throw new Error(`ocgo-usage ${path} failed: ${response.status}`);
			return await response.json();
		}
		/** The host usage API as the browser sees it (same-origin JSON endpoints). */
		const ocgoApi = {
			view: () => ocgoFetch("/api/ocgo-usage"),
			refresh: () => ocgoFetch("/api/ocgo-usage/refresh"),
			config: () => ocgoFetch("/api/ocgo-usage/config"),
			writeConfig: (partial) => ocgoFetch("/api/ocgo-usage/config", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(partial)
			})
		};
		/** Short window label: 5h / wk / mo. */
		const WINDOW_LABELS = {
			rolling: "5h",
			weekly: "wk",
			monthly: "mo"
		};
		/** Full window label key for the detail panel. */
		const WINDOW_TITLE_KEYS = {
			rolling: "ocgo.rolling",
			weekly: "ocgo.weekly",
			monthly: "ocgo.monthly"
		};
		/**
		* Format a duration (seconds) compactly: 45s / 23m / 5h 23m / 4d 6h.
		*/
		function formatDuration(totalSec) {
			if (totalSec < 60) return `${Math.max(0, Math.floor(totalSec))}s`;
			if (totalSec < 3600) return `${Math.floor(totalSec / 60)}m`;
			if (totalSec < 86400) {
				const h = Math.floor(totalSec / 3600);
				const m = Math.floor(totalSec % 3600 / 60);
				return m > 0 ? `${h}h ${m}m` : `${h}h`;
			}
			const d = Math.floor(totalSec / 86400);
			const h = Math.floor(totalSec % 86400 / 3600);
			return h > 0 ? `${d}d ${h}h` : `${d}d`;
		}
		/** Format an epoch-ms time as HH:MM. */
		function formatClock(epochMs) {
			const d = new Date(epochMs);
			return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
		}
		/** The severity class of one window (muted → warn → err). */
		function severityClass(window) {
			if (window.status === "rate-limited" || window.percent >= 90) return ocgo_module_css_default.segErr;
			if (window.percent >= 80) return ocgo_module_css_default.segWarn;
		}
		/** Render one window segment: `· 5h 23% (3h 25m)`. */
		function WindowSegment(props) {
			const { window, sep } = props;
			const cls = severityClass(window);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: ocgo_module_css_default.seg,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: ocgo_module_css_default.segSep,
					children: sep
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: cls ?? void 0,
					children: [
						WINDOW_LABELS[window.kind],
						" ",
						window.percent,
						"% (",
						formatDuration(window.resetInSec),
						")"
					]
				})]
			});
		}
		/** The masked display text for one secret field: `••••abcd`. */
		function maskedText(secret) {
			if (secret === void 0 || !secret.set || secret.tail.length === 0) return "";
			return `${MASK}${secret.tail}`;
		}
		/**
		* The OpenCode Go usage chip: polls the host snapshot, renders the three
		* windows inline, and expands into a detail panel on click.
		* @param props - the composed dock entry props.
		*/
		function OcgoDockEntry(props) {
			const [view, setView] = (0, react.useState)(null);
			const [open, setOpen] = (0, react.useState)(false);
			const [visible, setVisible] = (0, react.useState)(true);
			const [mode, setMode] = (0, react.useState)("view");
			const [config, setConfig] = (0, react.useState)(null);
			const [wsDraft, setWsDraft] = (0, react.useState)("");
			const [cookieDraft, setCookieDraft] = (0, react.useState)("");
			const wrapRef = (0, react.useRef)(null);
			const modeRef = (0, react.useRef)("view");
			modeRef.current = mode;
			const draftsRef = (0, react.useRef)({
				ws: "",
				cookie: ""
			});
			draftsRef.current = {
				ws: wsDraft,
				cookie: cookieDraft
			};
			const configRef = (0, react.useRef)(null);
			configRef.current = config;
			const pollNow = (0, react.useCallback)(() => {
				let live = true;
				const provider = props.provider;
				(provider !== void 0 ? Promise.resolve(provider()).then((p) => p ?? void 0, () => void 0) : Promise.resolve(void 0)).then((p) => {
					if (!live) return;
					const shown = isOpenCodeGo(p);
					setVisible(shown);
					if (!shown) setOpen(false);
					if (shown) ocgoApi.view().then((snapshot) => {
						if (live) setView(snapshot);
					}, () => {
						if (live) setView(null);
					});
				}, () => {
					if (live) setVisible(false);
				});
				return () => {
					live = false;
				};
			}, [props.provider]);
			(0, react.useEffect)(() => {
				const cleanup = pollNow();
				const timer = window.setInterval(pollNow, POLL_MS);
				const onVisibility = () => {
					if (document.visibilityState === "visible") pollNow();
				};
				document.addEventListener("visibilitychange", onVisibility);
				return () => {
					cleanup();
					window.clearInterval(timer);
					document.removeEventListener("visibilitychange", onVisibility);
				};
			}, [pollNow]);
			/** Load the masked config into the editor drafts. */
			const loadConfig = (0, react.useCallback)(() => {
				ocgoApi.config().then((snapshot) => {
					setConfig(snapshot);
					setWsDraft(maskedText(snapshot.workspaceID));
					setCookieDraft(maskedText(snapshot.cookie));
				}, () => {
					setConfig(null);
					setWsDraft("");
					setCookieDraft("");
				});
			}, []);
			/** Submit any edited field; returns the write promise (fire-and-forget on blur). */
			const saveConfig = (0, react.useCallback)(() => {
				const current = configRef.current;
				const partial = {};
				if (current !== null) {
					const ws = draftsRef.current.ws.trim();
					if (ws.length > 0 && ws !== maskedText(current.workspaceID)) partial.workspaceID = ws;
					const cookie = draftsRef.current.cookie.trim();
					if (cookie.length > 0 && cookie !== maskedText(current.cookie)) partial.cookie = cookie;
				} else {
					if (draftsRef.current.ws.trim().length > 0) partial.workspaceID = draftsRef.current.ws.trim();
					if (draftsRef.current.cookie.trim().length > 0) partial.cookie = draftsRef.current.cookie.trim();
				}
				if (Object.keys(partial).length === 0) return;
				ocgoApi.writeConfig(partial).then((snapshot) => {
					setConfig(snapshot);
					setWsDraft(maskedText(snapshot.workspaceID));
					setCookieDraft(maskedText(snapshot.cookie));
					pollNow();
				}, () => {});
			}, [pollNow]);
			/** Close the panel; in set mode a blur/close acts as confirm (save). */
			const closePanel = (0, react.useCallback)(() => {
				if (modeRef.current === "set") saveConfig();
				setOpen(false);
				setMode("view");
			}, [saveConfig]);
			/** Open the editor (used by the Set button and the error chip). */
			const openSet = (0, react.useCallback)(() => {
				setMode("set");
				setOpen(true);
				loadConfig();
			}, [loadConfig]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onPointerDown = (event) => {
					const target = event.target;
					if (target !== null && wrapRef.current !== null && !wrapRef.current.contains(target)) closePanel();
				};
				const onKeyDown = (event) => {
					if (event.key === "Escape") closePanel();
				};
				document.addEventListener("pointerdown", onPointerDown);
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown);
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [open, closePanel]);
			const refresh = () => {
				ocgoApi.refresh().then((snapshot) => {
					setView(snapshot);
				}, () => {});
			};
			const t = props.t;
			const sep = ` ${t("ocgo.sep")} `;
			if (!visible) return null;
			const error = view === null ? {
				code: "fetch",
				message: t("ocgo.error", { code: "fetch" })
			} : view.error !== void 0 ? {
				code: view.error,
				message: view.message ?? t("ocgo.error", { code: view.error })
			} : null;
			if (error !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: ocgo_module_css_default.wrap,
				ref: wrapRef,
				"data-testid": "ocgo-chip-error",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: open ? `${ocgo_module_css_default.chip} ${ocgo_module_css_default.chipOpen}` : ocgo_module_css_default.chip,
					onClick: () => {
						if (open) closePanel();
						else openSet();
					},
					title: `${error.message}\n${t("ocgo.set")}`,
					children: [
						t("ocgo.label"),
						": <err:",
						error.code,
						">"
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: ocgo_module_css_default.details,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: ocgo_module_css_default.setPanel,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: ocgo_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ocgo_module_css_default.fieldLabel,
									children: t("ocgo.workspaceID")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: ocgo_module_css_default.fieldInput,
									value: wsDraft,
									placeholder: "wrk_…",
									spellCheck: false,
									autoComplete: "off",
									onChange: (e) => {
										setWsDraft(e.target.value);
									},
									onFocus: (e) => {
										if (e.target.value === maskedText(config?.workspaceID)) e.target.select();
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: ocgo_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ocgo_module_css_default.fieldLabel,
									children: t("ocgo.cookie")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: ocgo_module_css_default.fieldInput,
									value: cookieDraft,
									placeholder: "auth=…",
									spellCheck: false,
									autoComplete: "off",
									onChange: (e) => {
										setCookieDraft(e.target.value);
									},
									onFocus: (e) => {
										if (e.target.value === maskedText(config?.cookie)) e.target.select();
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: ocgo_module_css_default.foot,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ocgo_module_css_default.setHint,
									children: t("ocgo.setHint")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: ocgo_module_css_default.refreshBtn,
									onClick: closePanel,
									children: t("ocgo.save")
								})]
							})
						]
					})
				})]
			});
			const snapshot = view;
			const windows = [
				snapshot.rolling,
				snapshot.weekly,
				snapshot.monthly
			].filter((w) => w !== void 0);
			if (windows.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: ocgo_module_css_default.chip,
				onClick: refresh,
				title: t("ocgo.refresh"),
				"data-testid": "ocgo-chip-empty",
				children: [
					t("ocgo.label"),
					": ",
					t("ocgo.unavailable")
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: ocgo_module_css_default.wrap,
				ref: wrapRef,
				"data-testid": "ocgo-chip",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: open ? `${ocgo_module_css_default.chip} ${ocgo_module_css_default.chipOpen}` : ocgo_module_css_default.chip,
					onClick: () => {
						if (open) closePanel();
						else setOpen(true);
					},
					title: open ? t("ocgo.collapse") : t("ocgo.expand"),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [t("ocgo.label"), ":"] }),
						windows.map((w) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WindowSegment, {
							window: w,
							sep
						}, w.kind)),
						snapshot.updatedAt !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ocgo_module_css_default.segSep,
							children: [sep, t("ocgo.fetchedAt", { time: formatClock(snapshot.updatedAt) })]
						})
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: ocgo_module_css_default.details,
					children: mode === "set" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: ocgo_module_css_default.setPanel,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: ocgo_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ocgo_module_css_default.fieldLabel,
									children: t("ocgo.workspaceID")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: ocgo_module_css_default.fieldInput,
									value: wsDraft,
									placeholder: "wrk_…",
									spellCheck: false,
									autoComplete: "off",
									onChange: (e) => {
										setWsDraft(e.target.value);
									},
									onFocus: (e) => {
										if (e.target.value === maskedText(config?.workspaceID)) e.target.select();
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: ocgo_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ocgo_module_css_default.fieldLabel,
									children: t("ocgo.cookie")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: ocgo_module_css_default.fieldInput,
									value: cookieDraft,
									placeholder: "auth=…",
									spellCheck: false,
									autoComplete: "off",
									onChange: (e) => {
										setCookieDraft(e.target.value);
									},
									onFocus: (e) => {
										if (e.target.value === maskedText(config?.cookie)) e.target.select();
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: ocgo_module_css_default.foot,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ocgo_module_css_default.setHint,
									children: t("ocgo.setHint")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: ocgo_module_css_default.refreshBtn,
									onClick: closePanel,
									children: t("ocgo.save")
								})]
							})
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [windows.map((w) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: ocgo_module_css_default.window,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ocgo_module_css_default.windowLabel,
							children: w.status === "rate-limited" ? t("ocgo.rateLimited") : t(WINDOW_TITLE_KEYS[w.kind])
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ocgo_module_css_default.windowValue,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: severityClass(w) ?? void 0,
								children: [w.percent, "%"]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ocgo_module_css_default.windowReset,
								children: t("ocgo.resetsIn", { duration: formatDuration(w.resetInSec) })
							})]
						})]
					}, w.kind)), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: ocgo_module_css_default.foot,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: ocgo_module_css_default.setBtn,
							onClick: openSet,
							children: t("ocgo.set")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ocgo_module_css_default.footRight,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ocgo_module_css_default.refreshBtn,
								onClick: refresh,
								children: t("ocgo.refresh")
							}), snapshot.updatedAt !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ocgo_module_css_default.fetchedAt,
								children: t("ocgo.fetchedAt", { time: formatClock(snapshot.updatedAt) })
							})]
						})]
					})] })
				})]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** Chinese copy. */
		const zh = {
			"ocgo.label": "OpenCode Go",
			"ocgo.unavailable": "用量不可用",
			"ocgo.error": "查询失败：{code}",
			"ocgo.noconfig": "未配置：请设置 OPENCODE_GO_COOKIE 与 OPENCODE_GO_WORKSPACE_ID（或 $DSH_HOME/ocgo-usage.json）",
			"ocgo.refresh": "刷新",
			"ocgo.fetchedAt": "upd {time}",
			"ocgo.rolling": "5h 滚动",
			"ocgo.weekly": "每周",
			"ocgo.monthly": "每月",
			"ocgo.rateLimited": "已限流",
			"ocgo.resetsIn": "剩余 {duration}",
			"ocgo.expand": "展开用量详情",
			"ocgo.collapse": "收起",
			"ocgo.sep": "·",
			"ocgo.set": "设置",
			"ocgo.save": "保存",
			"ocgo.workspaceID": "workspace id",
			"ocgo.cookie": "cookie",
			"ocgo.setHint": "点击外部或按 Esc 保存"
		};
		/** English copy. */
		const en = {
			"ocgo.label": "OpenCode Go",
			"ocgo.unavailable": "usage unavailable",
			"ocgo.error": "Query failed: {code}",
			"ocgo.noconfig": "Not configured: set OPENCODE_GO_COOKIE and OPENCODE_GO_WORKSPACE_ID (or $DSH_HOME/ocgo-usage.json)",
			"ocgo.refresh": "Refresh",
			"ocgo.fetchedAt": "upd {time}",
			"ocgo.rolling": "5h Rolling",
			"ocgo.weekly": "Weekly",
			"ocgo.monthly": "Monthly",
			"ocgo.rateLimited": "rate-limited",
			"ocgo.resetsIn": "resets in {duration}",
			"ocgo.expand": "Show usage details",
			"ocgo.collapse": "Collapse",
			"ocgo.sep": "·",
			"ocgo.set": "Set",
			"ocgo.save": "Save",
			"ocgo.workspaceID": "workspace id",
			"ocgo.cookie": "cookie",
			"ocgo.setHint": "click outside or press Esc to save"
		};
		//#endregion
		//#region src/client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "ocgo";
		/** Required services: slots for the composer-dock entry, locale for the copy. */
		const inject = ["slots", "locale"];
		/**
		* Register the usage chip into the composer dock band.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-ocgo-usage: dictionaries");
			ctx.inject([
				"slots",
				"conversation",
				"connection"
			], (scope) => {
				scope.effect(() => scope.slots.register({
					name: "conversation.composer.dock",
					id: "ocgo-usage",
					order: 110,
					locale: NS,
					inject: (sessionId) => {
						const handle = scope.get("connection");
						return {
							dockSessionId: sessionId,
							provider: async () => {
								const sessions = handle?.api?.sessions;
								if (sessions === void 0) return void 0;
								try {
									const { result } = await sessions.models({ sessionId });
									if (!result.ok) return void 0;
									return result.value?.current?.provider;
								} catch {
									return;
								}
							}
						};
					}
				}, OcgoDockEntry), "dsh-ocgo-usage: chip registration");
			});
		}
		//#endregion
		exports.OCGO_PROVIDER = OCGO_PROVIDER;
		exports.OcgoDockEntry = OcgoDockEntry;
		exports.apply = apply;
		exports.formatDuration = formatDuration;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map