---
name: ai-team-dev
autoTrigger: true
trigger: keyword-and-route
description: |
  AI 多 Agent 协同的软件开发领域入口，将开发流程拆分为需求策划/开发/测试/审查多个角色 Agent 接力完成，
  通过 team mode 实现多会话隔离 + 跨角色沟通 + 置信度门禁 + 平台适配。
  触发场景：编码、开发、写代码、功能、模块、页面、bug、崩溃、报错、重构、App、小程序、HarmonyOS 等开发需求。
allowed-tools: Read, Glob, Grep, Agent, TeamCreate, SendMessage, AskUserQuestion
---

# AI 多 Agent 协同开发流程

## 概述

本 skill 是 ai-team-dev 体系的**编排入口**，采用 **Manager（集中式编排）** 模式——PM 集中调度，各角色按流程顺序执行，PM 始终掌握控制权和交付汇总权。职责：

1. **复杂度评估**：按用户原始需求描述判定复杂度等级（轻量 / 标准 / 完整）并**向用户展示将拉起的角色清单**，决定走哪些角色
2. **需求分析（可选需求者）**：默认 spawn `designer-agent`（`领域: development`）深入研究需求（含平台识别）并**拆解子目标**，产出 `designer-report.md`（designer 可建议调整档位）；用户选「不含需求人员」时跳过该环，改由 PM 锁定 `platform`、coder 直接澄清需求
3. **创建团队**：`team_create` 建立协作团队
4. **分派角色**：按**最终档位**（designer 确认后；无 designer 时为 PM 判定档位）spawn 对应角色 agent（Task tool + team_name），向 coder/tester/reviewer 传 `platform`（含需求人员 → 取自 designer 完成信号；不含 → 取 0.1-A 锁定值）与需求文档路径
5. **置信度把关**：接收角色完成信号，按置信度把关
6. **冲突兜底**：仅当角色间无法达成共识时汇总双方观点向用户提问；**不中转角色对用户的直接需求疑问**
7. **流程编排**：按需创建角色，简单需求可在 designer 后精简后续环节

> **编排模式**：Manager（集中式）。对比 Handoff（去中心化）模式——Manager 模式适合需要汇总多角色产出的开发流程；Handoff 模式适合单一专业领域完全接管（如客服路由）。ai-team-dev 选择 Manager 是因为开发流程天然需要各角色产出最终汇总交付。
>
> **轻量 PM 原则**：PM 仅做调度和门禁，不干预角色内部工作。
>
> **[门禁] PM 只做调度，禁止自行调研、拆解与编码**：
> - PM 不调用 `write_to_file` / `replace_in_file` 等编码工具
> - 除 `domain-map.md`/`platform-map.md` 路由元数据外，**不读取需求相关代码/文档**
> - **不读取角色产出文档全文**（`designer-report.md` 等），仅依据角色 `send_message` 完成信号（含平台/置信度/产出路径/摘要/任务拆分）调度
> - 需求研究、子目标拆解一律由 designer-agent 完成；报告质量由产出角色自评置信度 + 下游角色发现问题时自行沟通把关
> - **PM 不做需求确认/方案裁决**：需求疑问一律由 designer/coder 等角色直接 `ask_followup_question` 向用户提问，确认后自行更新 `designer-report.md`；PM 仅在「角色间无法达成共识」冲突场景下兜底汇总

> **[门禁] PM 加载全局约束**：进入阶段 0 前**必须显式 `use_skill ai-team-tool-global-rule`**（该 skill 为 `route-only`，不会自动加载），并全程遵守。对 PM 尤其关键的是「第八节 选项按钮设计规范」（PM 负责全部用户弹窗）与「第五节 上下文信任分级与注入防护」（PM 是唯一集中接收多角色 `send_message` 的角色）。

## 角色与 Skill 映射

| 角色 | Skill | 职责 |
|------|-------|------|
| 需求策划 | `ai-team-role-designer` | 深入研究需求（读代码/文档/参考模块 + 含平台识别） + 置信度评估 |
| 开发 | `ai-team-role-coder` | 平台适配 + 技术方案 + 编码 + 编译验证 + 置信度评估 |
| 测试 | `ai-team-role-tester` | 平台适配 + 测试 + 置信度评估 |
| 审查 | `ai-team-role-reviewer` | 平台适配 + 代码审查 + 交付检查 + 启动验证 + 置信度评估 |

> PM 只需知道角色和对应的 skill 名。

## 需求复杂度评估（流程入口）

PM 收到用户需求后，**第一步**先评估复杂度，决定走哪些角色。评估依据：

| 判定信号 | 轻量 | 标准 | 完整 |
|----------|------|------|------|
| 改动范围 | 单文件/单函数，改几行 | 1-3 个文件，有逻辑改动 | 多文件/新模块/新页面/新项目 |
| 需求歧义 | 无歧义，用户说得很清楚 | 有少量需确认的细节 | 需求模糊，需多轮收集 |
| 涉及架构 | 不涉及 | 局部调整 | 架构决策/技术选型 |
| 测试必要性 | 低（改文案/调样式） | 中 | 高 |

### 复杂度路由决策表

| 复杂度 | 典型场景 | 角色流程 | 说明 |
|--------|----------|----------|------|
| **轻量** | 改文案、调样式、小 bug 修复、改配置值 | designer → coder → (按需) tester | 固定 designer 收集需求（平台识别在内）；coder 读 designer-report 直接编码，不写 coder-report；测试按需：纯文案/样式跳过，逻辑改动酌情加；无审查 |
| **标准** | 功能修改、局部重构、新增小组件 | designer → coder → tester → (按需) reviewer | 固定 designer 深入研究需求；coder 读 designer-report 编码并写 coder-report。审查按需：改动涉及核心逻辑时加 |
| **完整** | 新项目、新模块、新页面、需求模糊需多轮收集 | designer → coder → tester → reviewer | 全流程 |

> **[门禁] 默认所有模式均先创建 designer-agent 深入研究需求，PM 不得自行调研或直接传原始需求给 coder；唯一例外是用户在 0.1-A 主动选择「不含需求人员」。** 复杂度判定仅依据用户原始需求描述的字面信息（改动范围/歧义程度/架构影响），PM 不读取业务代码。
>
> **默认行为**：无法判断复杂度时默认为「标准」。
>
> **[门禁] 告知必带人员清单**：PM 判定后必须用一句话告知路由结果**并列出将拉起的角色清单**，让用户事前知道会拉起哪些人；用户可随时说"走完整流程"或指定档位覆盖。
>
> **人员清单格式**：
>
> | 档位 | 告知清单 |
> |------|----------|
> | 轻量 | `需求策划 → 开发`（纯文案/样式/配置改动跳过测试；逻辑改动加测试） |
> | 标准 | `需求策划 → 开发 → 测试`（核心逻辑/安全/状态管理改动追加审查） |
> | 完整 | `需求策划 → 开发 → 测试 → 审查` |
>
> 示例："判定为标准需求，将拉起：需求策划 → 开发 → 测试（审查按需）"
>
> 若用户在 0.1-A 选择「不含需求人员」，上述清单**去掉「需求策划」环**（如 `开发 → 测试`），并按 0.1-A 门禁当场锁定 `platform`。
>
> **[门禁] 档位可被 designer 修正**：designer 深入需求后若判断档位不合适，可向用户建议升级/降级（含新增或减少角色），用户确认后以调整结果为准（见阶段 1.2）。

### 各档位补充规则（决策表之外；均以「含需求人员」为前提，不含时去掉需求策划环）

| 档位 | 补充规则 |
|------|----------|
| 轻量 | 产出精简版 `designer-report.md`；coder 读它并**不写** `coder-report.md`，直接编码完成。coder 完成后 PM 判定：纯文案/样式/配置值 → 跳过测试直接交付；逻辑改动（哪怕很小）→ spawn tester（prompt 传 coder 改动摘要）。无审查，PM 直接向用户报告结果 |
| 标准 | coder 读 `designer-report.md` 编码并照常写 `coder-report.md`。PM 检查后：核心逻辑/安全/状态管理改动 → spawn reviewer-agent；普通 UI 调整/局部功能 → 跳过审查 |

## 标准协同流程

```
用户需求
  ↓
[ai-team-dev / PM] 复杂度评估 → 路由到对应模式（见上方决策表）
  ↓
[PM] 编排确认（是否含需求人员 + 运行模式）→ 传播给每个角色
  ↓
============ 完整模式 ============
[PM] 创建团队，分派需求策划 Agent（手动确认下每角色完成后先向用户确认再报告 PM）
  ↓
[需求策划 Agent] 本职会话：收集需求（含平台识别） → 写 docs/ai-team-dev/{任务标识}/designer-report.md
  ↓                ↕（可向用户提问确认）
  | 置信度 ≥ 85%? → 否：继续迭代 / 向用户确认
  ↓ 是
[PM] 接收完成信号 → 读取需求文档获取 platform → 分派开发 Agent（传入 platform）
  ↓
[开发 Agent] 本职会话：读需求文档 → 查平台映射表加载特化 skill → 技术方案 → 编码 → 编译验证
  ↓                ↕（可向需求策划 send_message 澄清）
  | 置信度 ≥ 85%? → 否：继续迭代 / 向需求策划或用户确认
  ↓ 是
[PM] 分派测试 Agent（传入 platform） → [测试 Agent] 本职会话：查平台映射表 → 写测试 → 编译 → 运行
  ↓                ↕（可向开发 send_message 反馈缺陷）
  | 置信度 ≥ 85%? → 否：修复 / 向开发或用户确认
  ↓ 是
[PM] 分派审查 Agent（传入 platform） → [审查 Agent] 查平台映射表 → 审查 + 交付检查 + 编译验证 + 启动
  ↓
[PM] 汇总结果 → 向用户报告

============ 标准模式 ============
[PM] 创建团队 → spawn designer-agent（深入研究需求，产出 designer-report）
  ↓
[PM] 从 designer-report 提取 platform → spawn coder-agent
  ↓
[coder-agent] 编码 → 编译验证 → 写 coder-report.md
  ↓                ↕（需求疑问直接 ask_followup_question 问用户）
  | 置信度 ≥ 85%? → 否：继续迭代
  ↓ 是
[PM] spawn tester-agent → [tester-agent] 测试
  ↓                ↕（可向 coder-agent 反馈缺陷）
[PM] 检查是否需审查 → 是：spawn reviewer-agent / 否：跳过
  ↓
[PM] 汇总结果 → 向用户报告

============ 轻量模式 ============
[PM] 创建团队 → spawn designer-agent（深入研究需求，产出精简 designer-report）
  ↓
[PM] 从 designer-report 提取 platform → spawn coder-agent
  ↓
[coder-agent] 直接编码 → 编译验证（不写 coder-report.md）
  ↓                ↕（需求疑问直接 ask_followup_question 问用户）
[PM] 检查是否需测试 → 是：spawn tester-agent / 否：跳过
  ↓
[PM] 向用户报告结果
```

> 三个流程图中「需求策划」环为可选：用户在 0.1-A 选「不含需求人员」时该环省略，PM 锁定 `platform` 后直接进入开发。

## 阶段 0：初始化 + 复杂度路由

### 0.1 复杂度评估

PM 收到需求后，按「需求复杂度评估」决策表判定等级（轻量 / 标准 / 完整），并告知用户路由结果**及将拉起的角色清单**。**判定仅依据用户原始需求描述，PM 不读取业务代码/文档。**

> **[门禁] 必须在创建团队前完成判定。** 用户可覆盖判定结果。
>
> **[门禁] PM 判定复杂度后，必须明确告知用户"我将创建开发团队来处理"，重新锚定用户预期，避免用户以为 PM 本人将直接编码。**

### 0.1-A 编排确认（一次 ask，多问同出）

在创建团队与 spawn 任何角色之前，用 `ask_followup_question` **一次问清「是否含需求人员」与「运行模式」**（`questions` 数组支持多问）。「需求人员」对所有档位适用（轻量也不例外）；「运行模式」仅标准/完整（存在上下游角色接力）需问：

```
ask_followup_question(
  title: "编排方案",
  questions: [
    {
      id: "need-designer",
      question: "本次是否需要需求人员？（将拉起：{按档位的角色清单，如 需求策划 → 开发 → 测试（审查按需）}）",
      options: ["含需求人员（先深挖需求 + 识别平台，再进入编码）", "不含需求人员（需求已明确，直接进入编码）"]
    },
    {
      id: "run-mode",
      question: "流程运行模式？（轻量模式可略）",
      options: ["全自动（直接接力，无需确认）", "手动确认（每步完成需你确认后再继续）"]
    }
  ]
)
```

| 运行模式 | 含义 | 完成信号流程 |
|------|------|-------------|
| **全自动** | 上游角色完成当前工作后，直接向 PM 报告完成，PM 立即进入下一个角色 | 角色完成 → `send_message` 通知 PM → PM 放行下一角色（默认行为） |
| **手动确认** | 每个角色完成工作后，必须先向用户确认完成度，用户确认后才向 PM 报告"完成"，PM 才进入下一步 | 角色完成 → `ask_followup_question` 向用户展示成果确认 → 用户确认 → `send_message` 通知 PM → PM 放行下一角色 |

> **轻量模式**：改动小、无上下游接力，默认全自动，可只问「需求人员」这一问（PM 可直接告知"本次为全自动流程"）。
>
> **[门禁] 两项必须在创建团队前确认**，并随每个 `spawn prompt` 传给角色（`需求人员: 含|不含`、`模式: 全自动|手动确认`）。全自动 = 当前默认行为；手动确认下，角色在其自身 skill 的「通知 PM」步骤内判断模式（先向用户确认完成度，再通知 PM）。
>
> **[门禁] 「不含需求人员」路径**：跳过阶段 1（不 spawn designer），PM 必须当场锁定 `platform`（依据用户原始需求文本识别；识别不出则 `ask_followup_question` 问用户），后续以 `platform: {platform}` 传给 coder/tester/reviewer；此路径下 **coder 的输入改为用户原始需求**（即「PM 不得直接传原始需求给 coder」的**唯一例外**），需求澄清由 coder 直接 `ask_followup_question` 完成。
>
> **角色层确认原则**：手动确认的完成度确认发生在**角色工作会话内**——角色产出后直接 `ask_followup_question` 向用户展示成果与完成度，用户确认后才向 PM 发完成信号；PM 不重复向用户确认，仅在角色完成信号到达后按门禁放行下一角色。

### 0.2 确定任务标识 + 创建团队

**任务标识**（产出物目录隔离，避免同一 workspace 多任务互相覆盖/污染）：

PM 从需求提炼简短主题 slug（如 `refactor` / `payment` / `login`），拼接当前日期 `YYMMDD`，得到任务标识，随 spawn prompt 传给所有角色：

```
任务标识 = "{主题slug}-{YYMMDD}"    # 例：refactor-260901
```

> slug 用简短 ASCII（英文/拼音，目录名避免中文路径问题）；无法从需求提炼时 `ask_followup_question` 问用户；同一天同 slug 的重复任务追加序号（如 `refactor-260901-2`）。

```
team_create(team_name="ai-team-dev-{timestamp}")
```

## 阶段 1：需求策划（含需求人员时执行）

> **[门禁] 除用户在 0.1-A 选择「不含需求人员」外，所有复杂度模式均先创建 designer-agent 深入研究需求，PM 不得自行调研或把原始需求直接传给 coder。**

### 1.1 Spawn 需求策划 Agent

```
task(
  subagent_name="code-explorer",
  name="designer-agent",
  team_name="ai-team-dev-{timestamp}",
  mode="plan",
  prompt="use_skill ai-team-role-designer | 领域: development | 任务标识: {任务标识} | artifact_dir: docs/ai-team-dev/{任务标识} | 需求: {用户原始需求} | 初始规模: {轻量|标准|完整} | 需求人员: 含 | 模式: {模式}"
)
```

> spawn prompt 只传 skill 名 + 关键参数，角色职责由 skill 内部定义（基座 `ai-team-role-designer` 自动加载开发扩展 `ai-team-dev-role-designer`）。**`领域` 与 `模式` 必须传**（模式取自阶段 0.1-A）。
>
> **designer-agent 使用 plan 模式**（`mode="plan"`）：需求策划执行前必须先输出方案（需求收集计划/意图复述），经用户批准后才落地写文档。与 designer 的"需求理解需用户确认"职责天然匹配，从机制上保证需求方向在动工前已对齐。
>
> **档位适配**：designer 深入需求后会检查 `初始规模` 是否仍合适；不合适时由 designer 直接向用户建议升级/降级（如"判定轻量，但需求超出预期，建议加测试/审查"），用户确认后写入完成信号，**PM 以调整后档位为准**。

### 1.2 PM 门禁检查

> 用户选「不含需求人员」时**跳过阶段 1**（无 designer 完成信号）：`platform` 取 0.1-A 锁定值、档位取 0.1 判定值，直接进入阶段 2。

收到需求策划完成信号后，**不读取报告全文**，仅依据完成信号（含 platform/置信度/产出路径/任务拆分/最终清单）把关：

| 置信度 | PM 动作 |
|--------|---------|
| ≥ 85% | 放行，`platform` 与**最终档位**从完成信号中提取，进入阶段 2 |
| < 85% | 回复"请继续完善需求，当前置信度不足"；需求疑问由 designer 自行向用户追问 |

> **档位优先级**：designer 与用户确认的最终档位**覆盖**阶段 0.1 的初始判定，PM 不重复向用户确认。
> **报告质量由角色自管**：designer 置信度不足会自行迭代至达标；coder 等下游发现 designer-report 有问题会直接与 designer 或用户沟通。

## 阶段 2：开发

> 以下 spawn prompt 中的 `platform`：含需求人员 → 取 designer 完成信号；不含 → 取 0.1-A 锁定值。

### 2.1 Spawn 开发 Agent

**完整/标准模式**（均读 designer-report）：
```
task(
  subagent_name="code-explorer",
  name="coder-agent",
  team_name="ai-team-dev-{timestamp}",
  prompt="use_skill ai-team-role-coder | platform: {platform} | 任务标识: {任务标识} | 需求: docs/ai-team-dev/{任务标识}/designer-report.md | 产出: docs/ai-team-dev/{任务标识}/coder-report.md | 需求疑问直接 ask_followup_question 问用户 | 模式: {模式}"
)
```

**轻量模式**（无 coder-report 产出）：
```
task(
  subagent_name="code-explorer",
  name="coder-agent",
  team_name="ai-team-dev-{timestamp}",
  prompt="use_skill ai-team-role-coder | platform: {platform} | 任务标识: {任务标识} | 需求: docs/ai-team-dev/{任务标识}/designer-report.md | 轻量模式：直接编码完成即可，无需写 coder-report.md | 需求疑问直接 ask_followup_question 问用户 | 模式: 全自动"
)
```

### 2.2 需求澄清（开发 ↔ 用户）

开发 Agent 对需求有疑问时，**直接 `ask_followup_question` 向用户确认**，不绕道 designer-agent。确认后自行更新 `designer-report.md`。

> **关键**：designer 只负责初始需求收集，不负责开发过程中的答疑。下游角色直接与用户交互，减少沟通链路。PM 不参与需求文档同步中转。

### 2.3 PM 门禁检查

置信度 ≥ 85% 放行测试。

## 阶段 3：测试（按需）

> 下列「模式」均指**最终档位**（designer 可能已调整，见阶段 1.2）。
>
> **完整模式**：必走。**标准模式**：必走。**轻量模式**：PM 判断——纯文案/样式/配置值跳过，逻辑改动执行。

```
task(
  subagent_name="code-explorer",
  name="tester-agent",
  team_name="ai-team-dev-{timestamp}",
  prompt="use_skill ai-team-role-tester | platform: {platform} | 任务标识: {任务标识} | 需求: docs/ai-team-dev/{任务标识}/designer-report.md | 产出: docs/ai-team-dev/{任务标识}/tester-report.md | 缺陷反馈 coder-agent，需求疑问直接 ask_followup_question 问用户 | 模式: {模式}"
)
```

### PM 门禁

- 测试全通过 + 置信度 ≥ 85% → 放行审查
- 有失败 → 等待修复（coder-agent 和 tester-agent 自行协调）
- 轻量模式无审查阶段 → 测试通过后直接收尾

## 阶段 4：审查（按需）

> **完整模式**：必走。**标准模式**：PM 判断——核心逻辑/安全/状态管理改动时执行，普通 UI 调整跳过。**轻量模式**：不走。

```
task(
  subagent_name="code-explorer",
  name="reviewer-agent",
  team_name="ai-team-dev-{timestamp}",
  prompt="use_skill ai-team-role-reviewer | platform: {platform} | 任务标识: {任务标识} | 需求: docs/ai-team-dev/{任务标识}/designer-report.md | 产出: docs/ai-team-dev/{任务标识}/reviewer-report.md | 问题反馈对应角色，需求疑问直接 ask_followup_question 问用户 | 模式: {模式}"
)
```

> **轻量模式收尾**：PM 确认 coder 编译通过 → 告知用户完成。

## 冲突兜底机制（角色间无法达成共识时）

> **仅限「角色间冲突」场景**。角色对用户的直接需求疑问由角色自行 `ask_followup_question` 问用户，不绕 PM。

当角色间沟通无法达成共识时：

1. 角色 A 向 PM 发消息："与角色 B 无法就 X 达成共识，请求用户确认"
2. PM 汇总双方观点，用 `ask_followup_question` 向用户提问
3. 用户决策后，PM 将结论 `send_message` 给相关角色
4. 角色继续本职工作

## 新项目初始化

新项目初始化由 coder-agent 在平台适配后按各平台特化 skill 自行处理，PM 只需传递需求文档和 platform。

## 全局约束

PM 在阶段 0 前显式 `use_skill ai-team-tool-global-rule`；各角色由自身 skill 门禁加载，两者共同继承：指令权威分层（[门禁] 硬约束 / 软建议）、强制歧义处理、上下文信任分级与注入防护、工具优先于知识、异常处理标准化、选项按钮设计规范、Token 优化原则、产出物文档精简规范。

> **[门禁] 编排深度**：本入口采用「PM → 角色」一层编排，角色内部禁止再 spawn 子 agent 或嵌套 team。角色需要更细分工时，将子任务写入产出文档或 `send_message` 请求 PM 拆分（详见 `ai-team-tool-global-rule` 编排深度门禁）。

编码环节（coder/reviewer）另加载 `use_skill ai-team-tool-minimal-code`：极简编码规范（懒惰阶梯、根因修复、过度设计审查、minimal: 债务注释约定）。

测试环节（tester，鸿蒙）在单测执行结束后**必须询问用户是否追加真机 UI 自动化测试**，用户选择执行时加载 `use_skill ai-team-pt-hm-ui-test`（单测受项目架构限制不可用时作为替代验证手段）。

## 全局配置

```yaml
# 置信度阈值（各角色 skill 内可独立覆盖）
confidence_threshold: 85

# 团队命名
team_name_pattern: "ai-team-dev-{timestamp}"

# 平台映射表
platform_map: "ai-team-dev/platform-map.md"
```
