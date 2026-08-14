/**
 * dsh-opencode-go-usage locale dictionaries (zh/en).
 * @module dsh-opencode-go-usage/client/locales
 */
/** Dictionary namespace this package registers. */
export const NS = 'ocgo';
/** Chinese copy. */
export const zh = {
    'ocgo.label': 'OpenCode Go',
    'ocgo.unavailable': '用量不可用',
    'ocgo.error': '查询失败：{code}',
    'ocgo.noconfig': '未配置：请设置 OPENCODE_GO_COOKIE 与 OPENCODE_GO_WORKSPACE_ID（或 $DSH_HOME/ocgo-usage.json）',
    'ocgo.refresh': '刷新',
    'ocgo.fetchedAt': 'upd {time}',
    'ocgo.rolling': '5h 滚动',
    'ocgo.weekly': '每周',
    'ocgo.monthly': '每月',
    'ocgo.rateLimited': '已限流',
    'ocgo.resetsIn': '剩余 {duration}',
    'ocgo.expand': '展开用量详情',
    'ocgo.collapse': '收起',
    'ocgo.sep': '·',
    'ocgo.set': '设置',
    'ocgo.save': '保存',
    'ocgo.workspaceID': 'workspace id',
    'ocgo.cookie': 'cookie',
    'ocgo.setHint': '点击外部或按 Esc 保存',
};
/** English copy. */
export const en = {
    'ocgo.label': 'OpenCode Go',
    'ocgo.unavailable': 'usage unavailable',
    'ocgo.error': 'Query failed: {code}',
    'ocgo.noconfig': 'Not configured: set OPENCODE_GO_COOKIE and OPENCODE_GO_WORKSPACE_ID (or $DSH_HOME/ocgo-usage.json)',
    'ocgo.refresh': 'Refresh',
    'ocgo.fetchedAt': 'upd {time}',
    'ocgo.rolling': '5h Rolling',
    'ocgo.weekly': 'Weekly',
    'ocgo.monthly': 'Monthly',
    'ocgo.rateLimited': 'rate-limited',
    'ocgo.resetsIn': 'resets in {duration}',
    'ocgo.expand': 'Show usage details',
    'ocgo.collapse': 'Collapse',
    'ocgo.sep': '·',
    'ocgo.set': 'Set',
    'ocgo.save': 'Save',
    'ocgo.workspaceID': 'workspace id',
    'ocgo.cookie': 'cookie',
    'ocgo.setHint': 'click outside or press Esc to save',
};
