# 写作领域角色注册表（`writing`）

> `ai-team-write` PM 据此生成编排弹窗的候选角色与**预勾选推荐**（由 S0-S4 阶段知识推导）；领域角色 skill 据此声明原型归属与变体名。
> **[门禁] 本表是 writing 领域角色归属的唯一权威**——从 skill 名看不出原型，一律以本表为准。

## 一、角色清单

| 原型 | 变体 | 领域扩展 skill | 预勾选条件 | 前置依赖 | 产出物 |
|------|------|----------------|-----------|----------|--------|
| planner | editor | `ai-team-write-role-editor` | **常态预勾**（基调卡约束全局且是内容争议裁决权威）；纯补写单章时可去掉 | — | `editor-report.md` |
| planner | architect | `ai-team-write-role-architect` | 需要设定 / 大纲 / 伏笔台账 / 文风卡时预勾（S1 设定期、S3 补设定）；单章精修可不勾 | editor（读基调卡） | `world.md` / `characters.md` / `outline.md` / `foreshadow.md` / `voice.md` |
| maker | writer | `ai-team-write-role-writer` | **恒预勾**（无执笔则无正文） | editor + architect | 正文章节 + `briefs/` + `chapter-changelog.md` + `writer-report.md` |
| reviewer | critic | `ai-team-write-role-critic` | 有正文产出时预勾 | writer | `critic-report-ch{N}.md` |
| reviewer | reader | `ai-team-write-role-reader` | 需要读者视角反馈时预勾（S2 试写期必备）；**按口味多实例**，每个口味一个实例 | writer，且**审稿完成后执行** | `reader-report-ch{N}.md` |
| reviewer | market | `ai-team-write-role-market` | S0 立项期（题材是否值得写）/ S1 查雷同 / S4 收官 | — | `market-report.md` |
| reviewer | commercial | `ai-team-write-role-commercial` | S0 立项期（赛道值不值得写）/ S4 收官（发布包装） | — | `commercial-report.md` |

## 二、审查维度清单（reviewer 专用）

> 本表只补充**维度特有的执行序与依赖**；各维度的领域扩展 skill 与预勾选条件以 §一 为准。

| 维度 | 领域扩展 skill | 预勾选条件 | 前置依赖（同原型其他维度） | 产出物 |
|------|----------------|-----------|---------------------------|--------|
| 内容审稿（七维 + 结构门禁） | `ai-team-write-role-critic` | 有正文产出 | — | `critic-report-ch{N}.md` |
| 读者评分（按口味，每口味一实例） | `ai-team-write-role-reader` | 需要读者视角时 | **审稿完成后执行** | `reader-report-ch{N}.md` |
| 内容竞品对标 | `ai-team-write-role-market` | S0 / S1 查雷同 / S4 | — | `market-report.md` |
| 商业评估 | `ai-team-write-role-commercial` | S0 / S4 | — | `commercial-report.md` |

## 三、预勾选推荐：S0-S4 阶段知识

> 阶段**不再是硬路由**，仅用于推导上表的默认预勾选；用户可在弹窗中任意增删。

| 阶段 | 触发场景 | 默认预勾选 |
|------|----------|-----------|
| S0 立项期 | 只有模糊想法 | editor · market · commercial |
| S1 设定期 | 大方向已定 | editor · architect（+ market 查雷同） |
| S2 试写期 | 设定就绪 | editor · architect · writer · critic · reader（≥1 口味） |
| S3 批量写作期 | 试写通过 | editor · writer · critic · reader（按批） |
| S4 收官期 | 接近完结 | editor · critic（伏笔回收核对）· commercial（包装）· market（如需） |

> 阶段由用户在编排弹窗中指定，或 AI 按需求描述推断；**无法推断时的默认**：`editor · writer · critic · reader`。

## 四、编排规则

- **执行拓扑**：`planner → maker → reviewer`；同原型多实例**并行**，各写各报告、**不合并**
- **维度依赖**：`读者评分` 声明「前置依赖审稿」→ PM 须等该批 `critic` 实例完成后再 spawn `reader` 实例（先审硬伤再送评，避免浪费评分）
- **用户未勾选前置维度**：照常 spawn 该维度，`depends_on` 留空，且 PM 在告知角色清单时标注「{维度}将自行完成所需验证（无上游报告可依）」
- **数量上限**：`planner` ≤ 3、`maker` ≤ 1、`reviewer` 维度 ≤ 5
- **形态参数**：PM 传 `form` 与 `form_map` 路径；角色「第零步-A：特化适配」据此加载形态特化 skill
- **额外参数**：`口味`（仅 reader）——领域扩展可在统一契约之外声明额外参数
- **新增角色 / 维度**：在 §一 或 §二 加一行 + 提供一个领域扩展 skill，编排逻辑零改动
- **新增读者口味**：新增 `standards/reader/{口味}.md` 模块 + 在 §二 对应维度下增加一个实例
