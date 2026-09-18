# 平台适配映射表

> 各领域角色（变体 `coder` / `tester` / `reviewer`）被 spawn 后，根据 PM 传入的 `platform` 参数查此表，
> 命中则加载对应特化 skill，未命中则由 AI 自行发挥。

## 映射规则

| platform | coder 特化 | tester 特化 | reviewer 特化 |
|----------|-----------|------------|--------------|
| harmony | `ai-team-dev-pt-hm-role-coder` | `ai-team-dev-pt-hm-role-tester` | `ai-team-dev-pt-hm-role-reviewer` |

## 使用方式

1. 领域角色收到 PM 传来的 `platform` 参数
2. 读取本文件：`read_file("{skills_dir}/ai-team-dev/platform-map.md")`
3. 查表：在 `platform` 列匹配当前平台
4. 命中 → `use_skill {对应的特化 skill}`
5. 未命中 → AI 自行发挥，不加载特化 skill

## 新增平台

在表格中新增一行即可。格式：`| {平台标识} | {coder 特化 skill 名} | {tester 特化 skill 名} | {reviewer 特化 skill 名} |`

若某平台只有部分角色需要特化，对应列留空（表示 AI 自行发挥）。

> **同步要求**：新增平台时，必须同步在 `ai-team-dev-role-designer` 的「平台识别表」中添加该平台的识别关键词，否则 designer 无法识别新平台、无法写入需求文档，下游角色将收不到正确的 `platform` 参数。
