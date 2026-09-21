# 备忘

> 记「为什么没改」、实测证据与 TODO（`CHANGELOG.md` 只记「改了什么」）。后续按 `## 备忘 N：{主题}` / `## TODO N：{主题}` 追加。

---

## TODO 1：角色具备任务进度 checklist 能力

**期望**：角色（role）能在会话内维护一份任务进度清单，可见 `pending → in_progress → completed` 流转 —— 效果对标 CodeBuddy plan 模式的任务清单。

**现有障碍**：

- CodeBuddy 的 plan 模式需**人工在 IDE 手动切换**，无法由编排方触发
- `TodoWrite` 仅能授予**普通子代理**（`tools: TodoWrite` 实测有效，状态流转正常）；**PM 主会话没有该工具**
- 角色一律以**团队成员**身份启动，而团队成员**忽略 `tools` 白名单**、固定拿 33 个 IDE 层工具（不含 `todo_write`）→ 角色当前拿不到

**待验证**：团队成员 + 声明 `tools: TodoWrite` 是否同样被忽略（未单独实测；`Agent` / `task` 的声明已被证实忽略，倾向同样无效）

**候选实现路径**：

| 路径 | 说明 | 前置 |
|---|---|---|
| A. 内核支持成员白名单 | 角色定义加 `tools: TodoWrite`，改动最小 | 平台 |
| B. plan 模式可编程触发 | 不依赖人工 IDE 切换 | 平台 |
| C. 自建清单机制 | 复用 `progress.md` 断点台账（`ai-team-write` 已有）+ `send_message` 上报、PM 侧渲染 | 无 |

**附带事实**：`TodoWrite` 数据按会话落盘到 `…/globalStorage/tencent-cloud.coding-copilot/todos/{conversationId}.json`，具备跨会话恢复潜力。

**重评触发**：与「备忘 1 · 何时重新评估」同一条件（内核开放编排 / 工具能力）。

---

## 备忘 1：为什么暂不把工具做成子 Agent（2026-09-21）

**结论**：执行型工具（`tool-web-read`、`dev-pt-hm-build` 等）保持由角色内联执行，不封装为 subagent。

### 否决理由

**1. 平台硬约束（决定性）** —— `Agent` / `task` 在 IDE 内核**未注册**。实测 4 组配置（普通子代理 / 团队成员 × 内置 / 自定义声明 `tools: Agent, task`）**均无法获得**，故「角色 spawn 工具子代理」被平台封死。
> CLI 文档中「`tools: Agent` 可继续嵌套」的机制 **IDE 不成立**。

**2. 团队成员的 `tools` 白名单被忽略** —— 成员固定获得 33 个 IDE 层工具，与定义无关。连带后果：`tool-role-composer` 的「能力门禁」（纯调研可只读）在 IDE 内只是**纸面约束**。

**3. PM 代跑方向是反的** —— subagent 的 summary 必然落进 **spawner 的 context**（实测）。改由 PM 代跑等于把执行负担从**短命角色**搬到**长命 PM**，冲突 `ai-team/SKILL.md`「PM 只做调度」门禁，且 +2 次消息往返。

**4. 迭代诊断场景本质不适合隔离（针对 build / coder）** —— `编译→修复→再编译` 依赖错误细节留在同一 context；隔离后输出契约只剩一行「首错」，coder 仍需索要完整日志或重跑，**收益归零**。此条**与平台能力无关**，将来放开也不该做。

### 逐工具判定

| 工具 | 判定 |
|---|---|
| `tool-web-read` | 场景适合隔离（一次性摄入），但受理由 1 / 3 约束 → 暂不做 |
| `dev-pt-hm-build` | **本质不适合**（见理由 4） |
| `dev-pt-hm-ui-test` / `-env` / `-project-init` / `-module-init` / `-package-init` / `dev-tool-debug-loop` | 受理由 1 约束 → 暂不做 |
| `tool-report` / `tool-global-rule` / `tool-role-composer` | **不该做**（知识型，须常驻 context） |
| `tool-auto-tune` | **不该做**（强依赖团队状态） |
| 全部 `*-role-*`（21 个） | 已是 subagent |

**判据**：过程量 ≫ 结果量 + 无状态 + 不迭代 + 需要它的人能 spawn。当前第 4 条对角色**恒为否**。

### 何时重新评估

内核开放 `Agent` 工具时。验证：建 agent 定义写 `tools: Agent, Skill, Bash, Read, Glob`，spawn 后枚举工具集，出现 `Agent` 即可重评 —— **但理由 4 对 build 的否决独立成立**。

### 附：IDE 子代理能力实测

| 事实 | 结果 |
|---|---|
| 工具命名层 | 内核层用 `PascalCase`（`Skill`/`Bash`/`Read`/`Write`/`Glob`/`WebFetch`）；写 `use_skill`/`web_fetch`/`list_dir` **无效** |
| 团队成员工具集 | 固定 33 个 IDE 层工具，**忽略 `tools`** |
| 能否向用户提问 | **否**（无 `ask_followup_question`）——只能回传信号，由调用方代问 |
| 对话是否落盘 | **是**，落于 `…/Application Support/CodeBuddy CN/…/globalStorage/tencent-cloud.coding-copilot/`（`edit-sessions`/`genie-history`/日志）；`~/.codebuddy/` 下搜不到 |
| 可授予的任务类工具 | 仅 `TodoWrite`（对照实验确认）；`TaskCreate/Get/Update/List` **均未注册** |
| 团队目录回收 | 须显式 `team_delete`，否则永久残留 |
| 任务列表 | 成员提示词要求走 `TaskList`/`TaskUpdate`，但工具未挂载 → **按提示词执行会空转** |

### CHANGELOG

不记（本次仅文档备忘，`skills/` 零改动）。
