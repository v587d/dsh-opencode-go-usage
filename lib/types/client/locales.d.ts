/**
 * dsh-ocgo-usage locale dictionaries (zh/en).
 * @module dsh-ocgo-usage/client/locales
 */
/** Dictionary namespace this package registers. */
export declare const NS = "ocgo";
/** Chinese copy. */
export declare const zh: {
    readonly 'ocgo.unavailable': "用量不可用";
    readonly 'ocgo.error': "查询失败：{code}";
    readonly 'ocgo.noconfig': "未配置：请设置 OPENCODE_GO_COOKIE 与 OPENCODE_GO_WORKSPACE_ID（或 $DSH_HOME/ocgo-usage.json）";
    readonly 'ocgo.refresh': "刷新";
    readonly 'ocgo.fetchedAt': "upd {time}";
    readonly 'ocgo.rolling': "5h 滚动";
    readonly 'ocgo.weekly': "每周";
    readonly 'ocgo.monthly': "每月";
    readonly 'ocgo.rateLimited': "已限流";
    readonly 'ocgo.resetsIn': "剩余 {duration}";
    readonly 'ocgo.expand': "展开用量详情";
    readonly 'ocgo.collapse': "收起";
    readonly 'ocgo.sep': "·";
    readonly 'ocgo.set': "设置";
    readonly 'ocgo.save': "保存";
    readonly 'ocgo.workspaceID': "workspace id";
    readonly 'ocgo.cookie': "cookie";
    readonly 'ocgo.setHint': "点击外部或按 Esc 保存";
};
/** English copy. */
export declare const en: {
    readonly 'ocgo.unavailable': "usage unavailable";
    readonly 'ocgo.error': "Query failed: {code}";
    readonly 'ocgo.noconfig': "Not configured: set OPENCODE_GO_COOKIE and OPENCODE_GO_WORKSPACE_ID (or $DSH_HOME/ocgo-usage.json)";
    readonly 'ocgo.refresh': "Refresh";
    readonly 'ocgo.fetchedAt': "upd {time}";
    readonly 'ocgo.rolling': "5h Rolling";
    readonly 'ocgo.weekly': "Weekly";
    readonly 'ocgo.monthly': "Monthly";
    readonly 'ocgo.rateLimited': "rate-limited";
    readonly 'ocgo.resetsIn': "resets in {duration}";
    readonly 'ocgo.expand': "Show usage details";
    readonly 'ocgo.collapse': "Collapse";
    readonly 'ocgo.sep': "·";
    readonly 'ocgo.set': "Set";
    readonly 'ocgo.save': "Save";
    readonly 'ocgo.workspaceID': "workspace id";
    readonly 'ocgo.cookie': "cookie";
    readonly 'ocgo.setHint': "click outside or press Esc to save";
};
/** Key type of the dictionary (for the LocaleNamespaceMap merge). */
export type OcgoKey = keyof typeof zh;
//# sourceMappingURL=locales.d.ts.map