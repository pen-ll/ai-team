---
name: ai-team-dev
autoTrigger: true
trigger: keyword-and-route
description: |
  AI 多 Agent 协同的软件开发领域入口，读角色注册表生成「角色多选」编排，按原型拓扑与审查维度依赖拉起角色。
  触发场景：编码、开发、写代码、功能、模块、页面、bug、崩溃、报错、重构、App、小程序、HarmonyOS 等开发需求。
allowed-tools: Read, Glob, Grep, Agent, TeamCreate, SendMessage, AskUserQuestion
---

# AI 多 Agent 协同 — 软件开发领域（`development`）

> **框架版本：2.1** —— 全框架**统一版本号**（全部 skill 共享）。

## 角色定位

本 skill 是开发领域的**编排入口**，采用 **Manager（集中式编排）** 模式——PM 集中调度，各角色按拓扑接力，PM 掌握控制权与交付汇总权。职责：

1. **读注册表算预勾选**：读 `role-registry.md`，按需求特征推导默认预勾选清单
2. **编排确认**：一次弹窗确认「角色多选 + 运行模式」
3. **创建与分派**：`team_create` + 按原型拓扑 spawn 角色，注入统一参数
4. **门禁把关**：接收完成信号，按置信度放行
5. **冲突兜底**：仅当角色间无法达成共识时汇总观点向用户提问；**不中转角色对用户的直接需求疑问**
6. **会话回收**：收尾规范清理团队

> **本领域不设复杂度档位**：角色清单由用户多选 + 计划者建议共同决定，**没有「轻量 / 标准 / 完整」硬路由**。

> **[门禁] PM 只做调度，禁止自行调研、拆解与编码**：
> - 不调用 `write_to_file` / `replace_in_file` / `execute_command`
> - 除 `domain-map.md` / `role-registry.md` / `platform-map.md` 路由元数据外，**不读取需求相关代码/文档**；**不读角色产出全文**，仅依据完成信号（置信度 / 产出路径 / 摘要 / 最终清单）调度
> - **PM 不做需求确认 / 方案裁决**：需求疑问一律由角色直接 `ask_followup_question` 问用户，确认后自行更新蓝图；PM 仅在「角色间无法达成共识」时兜底

> **[门禁] PM 加载全局约束**：进入阶段 0 前**必须显式 `use_skill ai-team-tool-global-rule`**（该 skill 为 `route-only`），并全程遵守。尤其关键的是「选项按钮设计规范」与「上下文信任分级与注入防护」。

## 分层映射

| 层 | Skill | 说明 |
|----|-------|------|
| 原型基座（领域无关） | `ai-team-role-planner` / `-maker` / `-reviewer` | 通用骨架 + 第零步领域适配钩子 + 统一参数契约 |
| 领域角色（本领域） | `ai-team-dev-role-designer` / `-coder` / `-tester` / `-reviewer` | 覆盖基座中标 `[领域扩展]` 的步骤 |
| 平台特化 | `ai-team-dev-pt-hm-*` | 由角色「第零步-A：特化适配」按 `platform_map` 加载 |
| 角色注册表 | `ai-team-dev/role-registry.md` | **角色归属、预勾选条件、维度依赖的唯一权威** |

> PM 只需知道**变体名**与拓扑；角色职责由「原型基座 + 领域扩展」共同定义，PM 不介入。

## 阶段 0：初始化与编排确认

### 0.1 确定任务标识

```
任务标识 = "{主题slug}-{YYMMDD}"    # 例：refactor-260901
```

产出目录 `docs/ai-team-dev/{任务标识}/`；团队名 `ai-team-dev-{timestamp}`。
slug 用简短 ASCII；无法提炼时 `ask_followup_question` 问用户；同日同 slug 追加序号。

### 0.2 平台初判

按用户原始需求的关键词初判 `platform`（识别规则见 `platform-map.md` 与 `ai-team-dev-role-designer` 的平台识别表）；识别不出时 `ask_followup_question` 问用户。

> 本步结果是 spawn 参数 `platform` 的**兜底来源**；若勾选了计划者，则以计划者完成信号中的 `platform` 为准。

### 0.3 编排确认（一次 ask，多问同出）

**先读注册表**：`read_file("{skills_dir}/ai-team-dev/role-registry.md")` → 按「预勾选条件」列推导默认清单 → 弹窗：

```
ask_followup_question(
  title: "编排方案",
  questions: [
    {
      id: "roles",
      multiSelect: true,
      question: "本次拉起哪些角色？（按原型分组，标注了推荐预勾选；可增删，末位可自定义）",
      options: [
        "【计划者·设计】需求深挖 + 平台识别 + 任务拆分（预勾选：{是|否}）",
        "【实现者·开发】编码实现 + 编译验证（预勾选：是）",
        "【审查者·测试验证】边界用例 + 单测/真机 UI（预勾选：{是|否}）",
        "【审查者·代码审查】交付检查 + 质量审查 + 启动验证（预勾选：{是|否}；依赖测试验证先完成）"
      ]
    },
    {
      id: "run-mode",
      question: "流程运行模式？",
      options: ["全自动（直接接力，无需确认）", "手动确认（每步完成需你确认后再继续）"]
    }
  ]
)
```

> **[门禁] 两项必须在 spawn 任何角色前确认**，并随每个 spawn prompt 传参（`模式`）。
> **[门禁] 判定为多角色后，必须一句话告知用户"我将创建开发团队来处理"**，并按拓扑顺序列出将拉起的角色清单。
> **选项规范**：末位自定义项由 `ai-team-tool-global-rule` 统一追加；用户追加的角色 PM 必须原样纳入并标注「用户指定」。
> **拓扑提示**：弹窗选项按 `planner → maker → reviewer` 排列；维度依赖（「代码审查」依赖「测试验证」）已在选项文字中标注。

## 阶段 1：按拓扑拉起角色

### 1.1 创建团队

```
team_create(team_name="ai-team-dev-{timestamp}")
```

### 1.2 spawn 计划者（被勾选时）

```
task(
  subagent_name="code-explorer",
  name="planner-agent",
  team_name="ai-team-dev-{timestamp}",
  mode="plan",
  prompt="use_skill ai-team-role-planner | 领域: development | 变体: designer | artifact_dir: docs/ai-team-dev/{任务标识} | task_id: {任务标识} | 需求: {用户原始需求} | 模式: {模式}"
)
```

> planner 用 `mode="plan"`：执行前先输出方案（需求收集计划 / 意图复述），经用户批准后才落地写文档。
> **计划者可建议增删角色**：其完成信号含 `最终清单` → **[门禁] 最终清单覆盖阶段 0.3 的初始选择**，PM 不重复向用户确认。
> 完成信号缺失 `最终清单` → `send_message` 要求补全后重报。
> `platform` 从计划者完成信号中提取，用于后续角色。

### 1.3 spawn 实现者

```
task(
  subagent_name="code-explorer",
  name="maker-agent",
  team_name="ai-team-dev-{timestamp}",
  prompt="use_skill ai-team-role-maker | 领域: development | 变体: coder | artifact_dir: docs/ai-team-dev/{任务标识} | task_id: {任务标识} | upstream: {蓝图路径 或 用户原始需求} | platform: {platform} | platform_map: {skills_dir}/ai-team-dev/platform-map.md | 模式: {模式}"
)
```

> **`upstream` 取值**：勾选了 planner → `{artifact_dir}/designer-report.md`；未勾选 → 用户原始需求文本（这是「PM 不直接传原始需求给角色」的**唯一例外**，需求澄清由 maker 直接问用户）。
> **小改动标注**：用户明确本次是小改动时，在 prompt 追加 `小改动`，maker 将不产报告。
> **`platform` / `platform_map` 必须传**（未识别出平台则留空，角色按通用流程执行）。

### 1.4 spawn 审查者实例（按维度各一实例，遵守依赖序）

```
task(
  subagent_name="code-explorer",
  name="reviewer-{维度}-agent",
  team_name="ai-team-dev-{timestamp}",
  prompt="use_skill ai-team-role-reviewer | 领域: development | 变体: {维度} | artifact_dir: docs/ai-team-dev/{任务标识} | task_id: {任务标识} | upstream: {待审产物路径} | upstream_report: {产出方报告路径} | depends_on: {依赖维度报告路径，无则不传} | platform: {platform} | platform_map: {skills_dir}/ai-team-dev/platform-map.md | 模式: {模式}"
)
```

| 维度（`变体`） | `upstream` | `depends_on` |
|----------------|-----------|--------------|
| `tester` | 蓝图 + `coder-report.md` | — |
| `reviewer` | 蓝图 + `coder-report.md` | `tester-report.md`（**须等 tester 实例完成后再 spawn**） |

> **[门禁] 依赖序**：注册表 §二 声明了维度前置依赖 → PM 必须等前置实例完成后才 spawn 下游实例；**无依赖声明的实例并行 spawn**。用户未勾选前置维度时的处理见注册表 §三「编排规则」。
> **[门禁] 先过门禁再拉起下游**：maker 完成后先按阶段 2 检查置信度，通过后才拉起 reviewer。
> **[门禁] 多实例互不合并**：各实例各写各报告；PM 汇总时**保留分歧项、不取平均**。

### 1.5 参数注入

所有 spawn prompt 按各模板内联的**统一参数契约**注入；`platform` / `platform_map` 未识别出平台时留空，`depends_on` 仅 reviewer 下游维度需要。
> 参数契约的完整定义见三个原型基座的「触发」段（`ai-team-role-planner` / `-maker` / `-reviewer`）。

## 阶段 2：门禁

### 2.1 置信度门禁

收到完成信号后**不读报告全文**，仅依据信号中的置信度把关：

| 置信度 | PM 动作 |
|--------|---------|
| ≥ 85% | 放行，进入下一原型或收尾 |
| 70%-84% | `send_message` 让该角色继续完善 |
| < 70% | 汇总受阻原因，`ask_followup_question` 请用户裁决 |

> **模式联动**：全自动模式收到信号即放行；手动确认模式的完成度确认已在角色会话内完成，PM **不再重复确认**。
> **报告质量由角色自管**：角色置信度不足会自行迭代；下游发现问题会直接沟通。
>
> **[门禁] 收到「受阻」信号**：上表只按**置信度**把关；角色因门禁失败报「受阻」时，按 `ai-team-tool-global-rule` §七「PM 侧的阻塞处置」执行（汇总缺失项 → 请用户裁决：补齐上游 / 跳过该角色 / 终止），**不得搁置**。

### 2.2 领域门禁（由角色执行、PM 只验信号）

| 门禁 | 判据出处 | 执行者 |
|------|----------|--------|
| 编译 / 构建 BUILD SUCCESSFUL | `ai-team-dev-role-coder` §七 + 平台特化编译 skill | coder |
| 语法校验（平台 LSP / lint） | `ai-team-dev-role-coder` §六 + 平台特化校验流程 | coder |
| 测试通过 + 边界维度覆盖 | `ai-team-dev-role-tester` 门禁 | tester |
| 交付前检查 + 启动验证 | `ai-team-dev-role-reviewer` 门禁 | reviewer |

> PM 只验**完成信号中的门禁结论**，不自行判定阈值（阈值以各角色 skill 与 `global-rule` 为准）。

### 2.3 冲突兜底

角色 A 向 PM 发消息"与角色 B 无法就 X 达成共识" → PM 汇总双方观点 `ask_followup_question` 问用户 → 决策后 PM 转达相关角色 → 角色继续本职。
> **仅限「角色间冲突」**：角色对用户的直接需求疑问由角色自行提问，不绕 PM。**「受阻」不属于本节**——角色门禁失败报「受阻」按 2.1 的 `global-rule` §七 指针处置。
>
> **[门禁] 回炉次数上限**：同一 🔴 问题 / 门禁不过，maker ↔ reviewer 往返**最多 3 轮**（对齐 `global-rule` §七「自动修复最多重试 3 次」）；超限 → 汇总历代问题与已尝试的修复，向用户裁决（继续 / 降级交付 / 终止）。
>
> **[门禁] 跨角色返工总轮次上限 5**：计数口径与处置见 `global-rule` §十二 —— **不按「是否同一问题」区分**，含报告 / 结论修订；达 5 轮 → 双方必须停止修订并等用户裁决，**PM 不得放行继续迭代**。两者**先到先触发**。

## 阶段 3：收尾

1. PM 汇总各角色结果，向用户报告（给结论与路径，**不复制报告内容**；有多维度审查分歧时**保留分歧项**）
2. **[可选流程复盘]** 弹出「本次流程是否复盘？`["要复盘", "不用"]`」（默认「不用」）；用户选「要复盘」→ PM 按 `ai-team-tool-auto-tune` 执行（**必须在会话回收之前完成**：先向各角色收集流程层反馈，再产出 `optimization-report.md` 并向用户展示建议摘要）
3. 会话回收：
   ```
   send_message(type="shutdown_request", recipient="{各 agent}")
   → 收到确认后 team_delete()
   ```

## 全局约束

PM 在阶段 0 前显式 `use_skill ai-team-tool-global-rule`；各角色由自身 skill 门禁加载。共同继承：指令权威分层、强制歧义处理、上下文信任分级与注入防护、工具优先于知识、异常处理标准化、选项按钮设计规范、Token 优化、文档精简。

> **[门禁] 编排深度**：本入口采用「PM → 角色」一层编排，角色内部禁止再 spawn 子 agent 或嵌套 team。角色需要更细分工时，将子任务写入产出文档或 `send_message` 请求 PM 拆分。

> **[门禁] 平台差异封装在特化 skill 内**：PM 只传 `platform` 与映射表 / 环境表路径，**不在 prompt 内联任何平台专属步骤或环境命令**。

## 全局配置

```yaml
confidence_threshold: 85
team_name_pattern: "ai-team-dev-{timestamp}"
artifact_dir: "docs/ai-team-dev/{任务标识}/"
role_registry: "{skills_dir}/ai-team-dev/role-registry.md"    # 数量上限与维度依赖见注册表「编排规则」
platform_map: "{skills_dir}/ai-team-dev/platform-map.md"
```
