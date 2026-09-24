---
name: ai-team-qa
autoTrigger: true
trigger: keyword-and-route
description: |
  软件测试领域入口，读角色注册表确认固定角色清单，按原型拓扑拉起计划者与执行者，把关计划确认与逐条取证两道测试门禁。
  触发场景：按用例验证、真机跑 UI 测试、出测试报告、缺陷单与回归验证等独立测试任务。
allowed-tools: Read, Glob, Grep, Agent, TeamCreate, SendMessage, AskUserQuestion
---

# AI 多 Agent 协同 — 软件测试领域（`qa`）

> **框架版本：2.3** —— 全框架**统一版本号**（全部 skill 共享）。

## 角色定位

本 skill 是测试领域的**编排入口**，采用 **Manager（集中式编排）** 模式——PM 集中调度，各角色按拓扑接力，PM 掌握控制权与交付汇总权。职责：

1. **角色清单固定**：本领域角色恒为「角色清单」表的 2 个（**不做预勾选推导、不提供角色选择**）
2. **编排确认**：一次弹窗确认运行模式
3. **创建与分派**：`team_create` + 按原型拓扑 spawn 角色，注入统一参数
4. **门禁把关**：接收完成信号，按置信度与测试专属门禁放行
5. **冲突兜底**：仅当角色间无法达成共识时汇总观点向用户提问；**不中转角色对用户的直接需求疑问**
6. **会话回收**：收尾规范清理团队

> **与开发领域的边界（[门禁] 不得越界接手）**：
> - 本领域只接**独立测试任务** —— 用户提供用例文档 / 要求按用例验证 / 要求出测试报告 / 要求回归验证
> - **编码后自验**（写代码顺带测）属 `ai-team-dev` 的「测试验证」维度，**不在本领域**；用户诉求含"改代码/修 bug"→ 告知用户改走 `ai-team-dev`
> - 本领域**不编译、不修改产品代码**：被测物由外部提供（见 `platform-map.md` 已知缺口）

> **[门禁] PM 只做调度，禁止自行调研、执行与撰写报告**：
> - 不调用 `write_to_file` / `replace_in_file` / `execute_command`
> - 除 `platform-map.md` 路由元数据外，**不读取需求相关文档与用例内容**；**不读角色产出全文**，仅依据完成信号（置信度 / 产出路径 / 摘要）调度
> - **PM 不做需求确认 / 方案裁决**：需求疑问一律由角色直接 `ask_followup_question` 问用户，确认后自行更新产物；PM 仅在「角色间无法达成共识」时兜底
> - **唯一例外**：阶段 0.3 前的「现状探测」——PM 可用 `Glob` 探测产出目录**是否存在既有产物文件**（只看路径，不读内容），命中时仅用于在运行模式弹窗中提示既有计划路径

> **[门禁] PM 加载全局约束**：进入阶段 0 前**必须显式 `use_skill ai-team-tool-global-rule`**（该 skill 为 `route-only`），并全程遵守。尤其关键的是「选项按钮设计规范」与「上下文信任分级与注入防护」。

## 分层映射

| 层 | Skill | 说明 |
|----|-------|------|
| 原型基座（领域无关） | `ai-team-role-planner` / `-maker` | 通用骨架 + 第零步领域适配钩子 + 统一参数契约 |
| 领域角色（本领域） | `ai-team-qa-role-test-planner` / `-runner` | 覆盖基座中标 `[领域扩展]` 的步骤 |
| 领域工具（本领域） | `ai-team-qa-tool-testcase-plan` / `-tool-workflow` | 用例解析与计划规范 / 流程·协同·报告规范 |
| 平台特化 | **复用 `ai-team-dev-pt-hm-*`** | 本领域**不持有**平台特化 skill，见 `platform-map.md` |

### 角色清单（[门禁] 固定，不提供选择）

| 原型 | 变体 | 领域扩展 skill | 必选性 | 上游 | 产出物 |
|------|------|----------------|--------|------|--------|
| planner | test-planner | `ai-team-qa-role-test-planner` | **固定前置（必拉）** | 用户原始需求 | `test-cases.md`（可选）、`test-plan.md` |
| maker | runner | `ai-team-qa-role-runner` | **固定（必拉）** | `{artifact_dir}/test-plan.md` | `test-report.md` + `evidence/` |

> **原型映射**：`test-planner` → planner 基座；`runner` → **maker** 基座（从变体名看不出，以此表为准）。
> **数量上限**：`planner` ≤ 1、`maker` ≤ 1。
> PM 只需知道**变体名**与拓扑；角色职责由「原型基座 + 领域扩展」共同定义，PM 不介入。

## 阶段 0：初始化与编排确认

### 0.1 确定任务标识

```
任务标识 = "{主题slug}-{YYMMDD}"    # 例：search-refactor-test-260923
```

产出目录 `docs/ai-team-qa/{任务标识}/`；团队名 `ai-team-qa-{timestamp}`。
slug 用简短 ASCII；无法提炼时 `ask_followup_question` 问用户；同日同 slug 追加序号。

### 0.2 平台初判

按用户原始需求的关键词初判 `platform`（识别规则见 `platform-map.md`）；识别不出时 `ask_followup_question` 问用户。

> 本步结果是 spawn 参数 `platform` 的**兜底来源**；以计划者完成信号中的 `platform` 为准（计划者为固定前置角色，必定产出）。
> **本领域当前只有 `harmony` 执行侧**：初判为非鸿蒙 → 按 `platform-map.md`「未命中」处置，**不得默认套用鸿蒙流程**。

### 0.3 编排确认（角色固定，只确认运行模式）

**[门禁] 本领域角色固定为 `test-planner → runner`，不提供角色选择**：计划者是**固定前置角色**——「解析用例」与「计划确认」两道门禁都挂在它身上，无计划则执行无所依；执行者恒需。故删去角色多选，只确认运行模式。

**弹窗前先做现状探测**：`Glob("docs/ai-team-qa/*/test-plan.md")` / `Glob("docs/ai-team-qa/*/test-cases.md")`（**只看路径，不读内容**）——命中既有计划时，在下方问题文案中提示「检测到既有计划：{路径}」。

```
ask_followup_question(
  title: "运行模式",
  questions: [
    {
      id: "run-mode",
      question: "流程运行模式？（本次将拉起：计划者·测试计划 → 实现者·测试执行）",
      options: ["全自动（直接接力，无需确认）", "手动确认（每步完成需你确认后再继续）"]
    }
  ]
)
```

> **[门禁] 运行模式必须在 spawn 任何角色前确认**，并随每个 spawn prompt 传参（`模式`）。
> **[门禁] 必须一句话告知用户"我将创建测试团队来处理"**，并按拓扑顺序列出将拉起的角色清单。
> **选项规范**：末位自定义项由 `ai-team-tool-global-rule` 统一追加。
> **追加角色**：用户主动要求追加（如独立复跑复核）→ PM 原样纳入并标注「用户指定」，并按「角色清单」表的**原型映射**落位（按原型取基座 + 对应领域扩展）；确无法落位原型的纯动态角色，才在 spawn prompt 内联职责。

## 阶段 1：按拓扑拉起角色

### 1.1 创建团队

```
team_create(team_name="ai-team-qa-{timestamp}")
```

### 1.2 spawn 计划者（固定前置，必拉）

```
task(
  subagent_name="code-explorer",
  name="planner-agent",
  team_name="ai-team-qa-{timestamp}",
  mode="plan",
  prompt="use_skill ai-team-role-planner | 领域: qa | 变体: test-planner | artifact_dir: docs/ai-team-qa/{任务标识} | task_id: {任务标识} | 需求: {用户原始需求} | 模式: {模式}"
)
```

> planner 用 `mode="plan"`：执行前先输出计划方案，经用户批准后才落地写文档。
> **不向 planner 传 `platform`**（基座参数契约无此项）：平台由 planner 按其扩展 §一 的识别规则自行判定并写入 `test-plan.md`。
> **计划者可建议追加角色**：其完成信号含 `最终清单` → **[门禁] 覆盖注册表的固定清单**（除计划者自身外），PM 不重复向用户确认；无建议时即为 `runner` 单角色。
> 完成信号缺失 `最终清单` → `send_message` 要求补全后重报。
> `platform` 从计划者完成信号中提取，用于后续角色。
> **[门禁] 接力时机**：计划者完成后**先过阶段 2.1 置信度门禁**（`手动确认` 模式下其完成度确认已在角色会话内完成），通过后才 spawn 实现者——**不得跳过门禁直接接力**。

### 1.3 spawn 实现者

```
task(
  subagent_name="code-explorer",
  name="maker-agent",
  team_name="ai-team-qa-{timestamp}",
  prompt="use_skill ai-team-role-maker | 领域: qa | 变体: runner | artifact_dir: docs/ai-team-qa/{任务标识} | task_id: {任务标识} | upstream: {artifact_dir}/test-plan.md | platform: {platform} | platform_map: {skills_dir}/ai-team-qa/platform-map.md | 模式: {模式}"
)
```

> **`upstream` 取值**：恒为 `{artifact_dir}/test-plan.md`（计划者固定前置，**不传用户原始需求**；runner 的需求澄清仍按其基座第二步直接问用户）。
> **`platform` / `platform_map` 必须传**（未识别出平台则留空，角色按通用流程执行）。

### 1.4 参数注入

所有 spawn prompt 按各模板内联的**统一参数契约**注入；`platform` / `platform_map` 未识别出平台时留空。
> 参数契约的完整定义见两个原型基座的「触发」段（`ai-team-role-planner` / `-maker`）。

## 阶段 2：门禁

### 2.1 置信度门禁

收到完成信号后**不读报告全文**，仅依据信号中的置信度把关：

| 置信度 | PM 动作 |
|--------|---------|
| ≥ 85% | 放行，进入下一原型或收尾 |
| 70%-84% | `send_message` 让该角色继续完善 |
| < 70% | 汇总受阻原因，`ask_followup_question` 请用户裁决 |

> **模式联动**：全自动模式收到信号即放行；手动确认模式的完成度确认已在角色会话内完成，PM **不再重复确认**。
> **报告质量由角色自管**：角色置信度不足会自行迭代；下游发现问题**直接与产出角色沟通**（跨角色问题须登记台账，见 `global-rule` §十一 11.3）。

> **[门禁] 放行前断言**：① 前序报告**状态为「定稿」**；② 前序 **`未闭环问题数 = 0`**；③ 本领域拓扑声明的上游产物存在且已定稿。不满足 → **不放行**。
> **[门禁] 收到「受阻」信号**：角色因门禁失败报「受阻」时，按 `ai-team-tool-global-rule` §七「PM 侧的阻塞处置」执行（汇总缺失项 → 请用户裁决：补齐上游 / 跳过该角色 / 终止），**不得搁置**。

### 2.2 领域门禁（由角色执行、PM 只验信号）

| 门禁 | 判据出处 | 执行者 |
|------|----------|--------|
| **计划经用户确认**（未确认不得进入执行） | `ai-team-qa-tool-testcase-plan` §四 | test-planner |
| **逐条独立取证**（未取证不得进入报告） | `ai-team-qa-role-runner` §三 | runner |
| **未覆盖项集中登记、不计入通过数** | `ai-team-qa-tool-workflow` §七 | runner |
| 环境破坏类用例已恢复并复核 | `ai-team-qa-tool-workflow` §二 2.2 | runner |

> PM 只验**完成信号中的门禁结论**，不自行判定阈值（阈值以各角色 skill 与 `global-rule` 为准）。

### 2.3 审查队列

**[门禁] 本领域无审查维度**：拓扑恒为 `test-planner → runner`，**不提供并行授权弹窗、不涉及多维度放行**。
> **不设独立报告审查维度的理由**：QA 场景下「谁执行谁判级」是常态，执行与判定同源；独立审查角色需二次转述证据，成本高于收益。
> **报告终审由用户承担**（计划口径已在阶段 2.2 确认）；用户需要独立复核时，在阶段 0.3 追加角色（标注「用户指定」）。

### 2.4 收敛与用户裁决

触发条件与**角色侧动作**见 `ai-team-tool-global-rule` §十一 11.4；PM 侧动作：

| PM 收到 | 动作 |
|---------|------|
| 用户裁定「继续（计数重置为 0）」 | 恢复放行该问题相关环节 |
| 用户裁定「就此收口交付」 | 进入收尾；报告标注「按用户裁定提前收口」+ 遗留 issue 列表 |
| 用户裁定「终止任务」 | 停止编排 → 走阶段 3 收尾与会话回收 |

> **仅限「角色间冲突 + 台账超限」**：角色对用户的**直接需求疑问**由角色自行提问，不绕 PM。
> **「受阻」不属于本节**——按 2.1 的 `global-rule` §七 指针处置。

## 阶段 3：收尾

1. PM 汇总各角色结果，向用户报告（给结论与路径，**不复制报告内容**）
2. **[可选流程复盘]** 弹出「本次流程是否复盘？`["要复盘", "不用"]`」（默认「不用」）；用户选「要复盘」→ PM 按 `ai-team-tool-auto-tune` 执行（**必须在会话回收之前完成**：先向各角色收集流程层反馈 → 过「反馈确认门禁」向用户确认反馈口径后方可产出 `optimization-report.md`）
3. 会话回收：
   ```
   send_message(type="shutdown_request", recipient="{各 agent}")
   → 收到确认后 team_delete()
   ```

## 全局约束

PM 在阶段 0 前显式 `use_skill ai-team-tool-global-rule`；各角色由自身 skill 门禁加载。共同继承：指令权威分层、强制歧义处理、上下文信任分级与注入防护、工具优先于知识、异常处理标准化、选项按钮设计规范、Token 优化、文档精简。

> **[门禁] 编排深度**：本入口采用「PM → 角色」一层编排，角色内部禁止再 spawn 子 agent 或嵌套 team。角色需要更细分工时，将子任务写入产出文档或 `send_message` 请求 PM 拆分。

> **[门禁] 平台差异封装在特化 skill 内**：PM 只传 `platform` 与映射表路径，**不在 prompt 内联任何平台专属步骤或环境命令**。

## 全局配置

```yaml
confidence_threshold: 85
team_name_pattern: "ai-team-qa-{timestamp}"
artifact_dir: "docs/ai-team-qa/{任务标识}/"
platform_map: "{skills_dir}/ai-team-qa/platform-map.md"
roles_fixed: [test-planner, runner]    # 固定必拉，不提供选择；原型映射见「角色清单」表
```

> **未来动态角色**：本领域当前**不设角色注册表**（角色固定，无预勾选推导需求，避免双处维护）。若日后需要可选 / 动态角色，按 `ai-team-dev/role-registry.md` 的模式重建注册表，并恢复阶段 0.3 的角色多选。
```
