# 平台适配映射表

> 各领域角色（变体 `coder` / `tester` / `reviewer`）收到 `platform` 参数后查此表，
> 命中则加载对应特化 skill，未命中则由 AI 自行发挥。

## 映射规则

| platform | coder 特化 | tester 特化 | reviewer 特化 | 环境特化（按需） | UI 驱动（按需） |
|----------|-----------|------------|--------------|------------------|-----------------|
| harmony | `ai-team-dev-pt-hm-role-coder` | `ai-team-dev-pt-hm-role-tester` | `ai-team-dev-pt-hm-role-reviewer` | `ai-team-dev-pt-hm-env` | `ai-team-dev-pt-hm-ui-test` |

## 使用方式

1. 领域角色收到 PM 传来的 `platform` 参数
2. 读取本文件：`read_file("{skills_dir}/ai-team-dev/platform-map.md")`
3. 查表：在 `platform` 列匹配当前平台
4. 命中 → `use_skill {本角色列对应的特化 skill}`
5. **「环境特化」列非空时不要立即加载** —— 仅在需要触碰环境时（路径探测 / 语法校验 / 编译 / 安装冒烟）再 `use_skill`，避免无谓的上下文占用
6. **「UI 驱动」列**：需要真机 UI 驱动 / 自动化取证时再 `use_skill`（同属按需，不提前加载）
7. 未命中 → AI 自行发挥，不加载特化 skill

## 新增平台

在表格中新增一行即可。格式：`| {平台标识} | {coder 特化 skill 名} | {tester 特化 skill 名} | {reviewer 特化 skill 名} | {环境特化 skill 名} | {UI 驱动 skill 名} |`

若某平台只有部分角色需要特化，对应列留空（表示 AI 自行发挥）。

> **环境事实归属**：路径 / 工具链 / 版本 / 命令等**平台特有事实由该平台的「环境特化」skill 持有**，其他平台 skill 引用节号而非复制；**不得放进 `ai-team-dev/` 通用层**（通用层保持平台无关）。

> **同步要求**：新增平台时，必须同步在 `ai-team-dev-role-designer` 的「平台识别表」中添加该平台的识别关键词，否则 designer 无法识别新平台、无法写入需求文档，下游角色将收不到正确的 `platform` 参数。
