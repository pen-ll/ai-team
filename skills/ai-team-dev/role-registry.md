# 开发领域角色注册表（`development`）

> `ai-team-dev` PM 据此生成编排弹窗的候选角色与**预勾选推荐**；领域角色 skill 据此声明自己的原型归属与变体名。
> **[门禁] 本表是 dev 领域角色归属的唯一权威**——从 skill 名看不出原型，一律以本表为准。

## 一、角色清单

| 原型 | 变体 | 领域扩展 skill | 预勾选条件 | 前置依赖 | 产出物 |
|------|------|----------------|-----------|----------|--------|
| planner | designer | `ai-team-dev-role-designer` | 需求模糊 / 需平台识别 / 需任务拆分 → **预勾**；用户明确"需求已清楚，直接做" → 不勾 | — | `designer-report.md` |
| maker | coder | `ai-team-dev-role-coder` | **恒预勾**（无实现者则无交付物） | planner（不勾 planner 时，PM 在 spawn prompt 内联需求原文） | `coder-report.md`（清单式另含 `coder-report-task-{N}.md`） |
| reviewer | tester | `ai-team-dev-role-tester` | 有**逻辑改动** → 预勾；纯文案 / 样式 / 配置值改动 → 不勾 | maker | `tester-report.md` |
| reviewer | reviewer | `ai-team-dev-role-reviewer` | 涉及**核心逻辑 / 安全 / 状态管理 / 数据变更** → 预勾；常规改动 → 不勾 | maker，且**测试验证完成后执行** | `reviewer-report.md` |

## 二、审查维度清单（reviewer 专用）

> 本表只补充**维度特有的执行序与依赖**；各维度的领域扩展 skill 与预勾选条件以 §一 为准。

| 维度 | 领域扩展 skill | 预勾选条件 | 前置依赖（同原型其他维度） | 产出物 |
|------|----------------|-----------|---------------------------|--------|
| 测试验证 | `ai-team-dev-role-tester` | 有逻辑改动 | — | `tester-report.md` |
| 代码审查 | `ai-team-dev-role-reviewer` | 涉及核心逻辑 / 安全 / 状态 / 数据变更 | **测试验证完成后执行** | `reviewer-report.md` |
| 产品验收 | （占位，待实现） | — | 代码审查 | — |
| UI 体验验收 | （占位，待实现） | — | 代码审查 | — |

## 三、编排规则

- **执行拓扑**：`planner → maker → reviewer`；同原型多实例**并行**，各写各报告、**不合并**
- **维度依赖**：`代码审查` 声明了「前置依赖测试验证」→ PM 须等 tester 实例完成后再 spawn reviewer 实例；未声明依赖的维度可并行
- **用户未勾选前置维度**：照常 spawn 该维度，spawn prompt 的 `depends_on` 留空，且 PM 在告知角色清单时标注「{维度}将自行完成所需验证（无上游报告可依）」
- **数量上限**：`planner` ≤ 3、`maker` ≤ 1、`reviewer` 维度 ≤ 5
- **平台参数**：命中平台时，PM 同时传 `platform` 与 `platform_map` 路径；角色「第零步-A：特化适配」据此加载平台特化 skill
- **未命中平台的预勾选**：需求未涉及具体平台（或无法识别）→ 仍按上表预勾选，但 spawn prompt 的 `platform` / `platform_map` 留空，角色按通用流程执行
- **新增角色 / 维度**：在 §一 或 §二 加一行 + 提供一个领域扩展 skill，编排逻辑零改动
