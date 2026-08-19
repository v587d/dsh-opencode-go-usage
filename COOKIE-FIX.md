# Cookie 解析修复记录（COOKIE-FIX）

> 分支：`fix/cookie-parse`（rebase 到最新 `origin/main` = `721dfeb`）
> 日期：2026-08-19（首次），2026-08-19（rebase + 调整）
> 性质：**只修 cookie 解析错误**；不新增本地化，但兼容已合入的中文解析

## 背景与决策（更新）

- 原项目（v587d，Shawn 维护）已通过 **PR #2**（`waknow/fix/zh-locale-parsing`）合并了**中文页面解析**（`滚动/每周/每月` 标签、`重置于` 短语），且另有 PR #3/#4 的 README 改动。最新 main = `721dfeb`。
- 本分支 `fix/cookie-parse` 已 **rebase 到最新 main**，在其之上再叠一个 cookie 解析修复。
- **只修 `normalizeCookie` 的解析错误**，不引入额外功能。解析层维持原项目（含其中文解析）。

## Bug 描述（根因）

原 `normalizeCookie`（`src/config.ts`）用 `/^auth=/` 判断整个字符串是否以 `auth=` 开头：

- 若以 `auth=` 开头 → 正常透传。
- 否则 → **把第一个分号段当成 auth 值**，拼成 `auth=<第一段>; ...`。

真实浏览器拷出的 cookie 通常带 locale 且 locale 可能排在前：

```
oc_locale=zh; desktop_promo_dismissed=1; auth=Fe26.2*...
```

它**不以 `auth=` 开头** → 原代码把 `oc_locale=zh` 当 auth → 写入 `auth=oc_locale=zh; oc_locale=en` → opencode.ai 拒绝 → 触发登录页重定向 → 插件报 `http302`（"页面解析空"）。

> 这个 bug 与原项目是否含中文解析**无关**：任何"auth 不在第一段"的 cookie 都会写坏（纯英文 cookie、带 `desktop_promo_dismissed` 等无关段的 cookie 同样触发）。PR #2 只修了解析层，**从未修过写入层的这个 bug**。

## 修复内容

`src/config.ts` → `normalizeCookie` 重写为**顺序无关 + 拒绝假值 + 保留用户 locale**：

1. **顺序无关**：在整串中查找 `auth=` 段（不再假设它在第一个）；找不到时，若存在"裸 opaque token"（无 `=` 且长度 ≥ 8），自动补 `auth=`。
2. **拒绝假 cookie**：两者都没有 → 返回 `undefined`，调用方（`writeConfigFile`）拒绝写入，**绝不**拼出 `auth=oc_locale=zh`。
3. **保留用户 locale**：提取粘贴 cookie 里的 `oc_locale` 并原样保留（`zh` 保持 `zh`），缺省或非法（非 2-3 字母）时回退 `en`。
   - 设计说明：既然解析层已支持中文页，保留 `oc_locale=zh` 可让 zh 用户继续看中文页（而非被强制英文）。若想强制英文页，可把这里改成固定 `en`。
4. 分隔符 `;` 与 `,` 都支持（浏览器 Cookie 头 / Set-Cookie 风格）；丢弃无关 UI 段（`desktop_promo_dismissed` 等）。

## 验证

- `pnpm test`：44/44 通过（含新增回归用例：locale 在前的真实 cookie 不被污染、纯 locale 拒绝写入、逗号分隔、引号值、locale 保留/回退）。
- `pnpm typecheck` 通过。
- 真实验证（独立脚本，同 URL+同 cookie）：`oc_locale=zh` cookie → opencode 返回中文页（`滚动用量`…），解析器可读；写坏修复后不再 302。

## 后续同步指引

- 分支 `fix/cookie-parse` 即本修复的载体，后续改动直接在此分支上做，或从此分支 cherry-pick / rebase 到目标。
- 已放弃的历史分支（`rebase-work` / `feat/cookie-robustness` / `pr-zh` / `pr2`）已删除；仅存的 `main` 与 `fix/cookie-parse`。
- dsh 安装目录同步：`repo-tmp/lib` → `~/.dsh/profiles/web/node_modules/dsh-ocgo-usage/lib`（构建后覆盖）。
