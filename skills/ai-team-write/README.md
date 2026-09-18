# ai-team 写作领域（`writing`）设计稿

> **状态**：Phase 0 产出汇总稿，待用户确认后进入 Phase 1-4 落地
> **输入**：`docs/ai-team/write-skill-260918/` 下 7 份领域标准（合计 ~1640 行）
> **产出目标**：9 个 skill 目录（`skills/` 下）

---

## 一、领域定位

| 项 | 取值 |
|----|------|
| 领域标识 | `writing` |
| 领域名称 | 写作 |
| 路由目标 | `use_skill ai-team-write` |
| 触发特征 | 小说、网文、连载、长篇、短篇、文章、写作、大纲、世界观、人设、剧情、伏笔、章节、审稿、投稿、读者反馈 |
| 产出目录 | `docs/ai-team-write/{任务标识}/` |
| 团队命名 | `ai-team-write-{timestamp}` |
| 形态子层 | `ai-team-write/form-map.md` → `long`（首版落地）/ `short`、`article`（占位，暂由 AI 动态发挥） |

> **同步改动**：`domain-map.md` 的 `generic` 行需从示例中移除「写作」，否则该关键词仍会被 generic 吃掉。

---

## 二、阶段编排（替代「轻量/标准」档位制）

写作任务的差异是**处于哪个创作阶段**，不是改动大小。故 PM 按阶段路由 + 角色多选。

| 阶段 | 触发场景 | 默认介入角色 | 产出 | 关键决策点 |
|------|----------|-------------|------|-----------|
| **S0 立项期** | 只有模糊想法 | 主编 · 竞品顾问 · 商业化顾问 | `market-report.md`、`commercial-report.md`、`editor-report.md`(基调卡) | 题材值不值得写 |
| **S1 设定期** | 大方向已定 | 设定设计师 · 主编 ·(竞品顾问查雷同) | `world.md`、`characters.md`、`outline.md`、`foreshadow.md`、`voice.md` | 设定是否自洽、是否雷同 |
| **S2 试写期** | 设定就绪 | 执笔 · 审稿人 · 读者团 | `chapters/ch-1~3.md`、`briefs/`、`critic-report-ch1~3.md`、`reader-report-ch1~3.md` | **是否继续写**（止损点） |
| **S3 批量写作期** | 试写通过 | 执笔(批量) · 审稿人(按批) · 读者团(按批) | `chapters/ch-{N}.md`、`briefs/`、`chapter-changelog.md` | 每批是否合格 |
| **S4 收官期** | 接近完结 | 审稿人(伏笔核对) · 主编(终审) · 商业化顾问(包装) | 终稿 + 发布包 | 是否达发布标准 |

**编排询问（一次 ask，多问同出；均含 AI 推荐 + 末尾自定义项）**

| # | 问题 | 类型 |
|---|------|------|
| Q1 | 本次处于哪个阶段 | 单选 S0-S4 +「我不确定，AI 判断」（**仅用于推荐，不是硬路由**） |
| Q2 | 本次拉起哪些角色 | **多选**（按原型分组，**1 角色 / 维度 1 选项**，按注册表 §三 预勾选，可增删） |
| Q2-b | 读者口味（**仅当勾选了「审查者·读者评分」时追加**） | **多选**，每口味一个实例；选项取 `standards/reader/` 已注册模块 |
| Q3 | 运行模式 | 全自动 / 手动确认 |

> **`题材` / `平台` / `范围` 不单独设问**：先按用户原始需求**初判**，识别不出时才追加一问。`范围` 按阶段给（S2：黄金三章；S3：3-5 章一批，可在自定义项改批大小）。三者随 spawn prompt 传给角色，**下游不重复问用户**。

> **门禁例外（已获用户同意）**：PM 允许 `read_file("…/progress.md")`，**仅读取「当前阶段 / 最近完成批次」两个字段**，不读正文、不读其他产出物。用于支持断点续写。

---

## 三、角色清单（7）与权威归属

| 角色 | skill | 性质 | 介入阶段 | 核心产出 |
|------|-------|------|----------|----------|
| 主编 | `ai-team-write-role-editor` | 常态 | S0-S4 | `editor-report.md`（基调卡 + 裁决记录） |
| 设定设计师 | `ai-team-write-role-architect` | 常态 | S1、S3 | `world/characters/outline/foreshadow/voice.md` |
| 执笔 | `ai-team-write-role-writer` | 常态 | S2、S3 | `chapters/`、`briefs/`、`chapter-changelog.md` |
| 审稿人 | `ai-team-write-role-critic` | 常态 | S2、S3、S4 | `critic-report-ch{N}.md` |
| 读者团 | `ai-team-write-role-reader` | 常态（多实例） | S2、S3、S4 | `reader-report-ch{N}.md` |
| 竞品顾问 | `ai-team-write-role-market` | **按需** | S0、S1、S4 | `market-report.md` |
| 商业化顾问 | `ai-team-write-role-commercial` | **按需** | S0、S4 | `commercial-report.md` |

**权威归属（跨文档冲突时以此裁决，防止重复定义）**

| 议题 | 权威来源 | 其他角色 |
|------|----------|----------|
| 结构层（三幕/卷/章/黄金三章/张力/伏笔/崩坏模式/G1-G6） | `standards/structure.md` | 只引用编号，不重复定义 |
| 审稿维度与体裁基线（字数/节奏/断章/前 10 章/卷末） | `standards/editor.md` | — |
| 内容竞品对标（雷同度/差异化） | `standards/market.md` | 商业化只引用其「对标范围」观测 |
| 商业层（赛道/平台/密度/体量/包装） | `standards/commercial.md` | **不参与结构门禁 G1-G6 判定** |
| 逐章台账（唯一主台账） | `standards/structure.md §6.1` | 商业侧仅追加 `C:情绪类型`/`C:兑现强度(1-5)` 列组；编辑/结构侧共用 4 个接口字段：`所属幕·卷` / `章功能`(建置·升级·关系·信息·反转·呼吸·结算) / `峰值张力`(1-10) / `章末钩子类型`(悬念·期待·危机·反转，受控枚举) |
| 读者评分（驱动因子/弃书/维度/期待） | `standards/reader/{口味}.md` | 跨口味只做「引用来源」标注，不合并维度 |

> **主编 vs PM 边界**：PM 管流程（调度/门禁/回收），主编管内容取舍（改不改、往哪改）。审稿人只挑问题、读者只给感受，**必须由主编做唯一裁决**。

---

## 四、9 个 Skill 清单

| # | 路径 | 类型 | 预计行数 | 内容来源 |
|---|------|------|----------|----------|
| 1 | `skills/ai-team-write/` | 领域 PM | SKILL.md ≤190 | 阶段编排 + 角色多选 + 门禁例外 |
| 2 | ↳ `form-map.md` | 形态映射表 | ~30 | 本设计稿 §一 |
| 3 | ↳ `standards/*.md` | 领域标准库（7 份） | 160-340 各 | **Phase 0 七份标准原件迁移**（唯一事实源） |
| 4 | `skills/ai-team-write-pt-long/` | 形态特化 | ≤120 | structure §2/§3 + editor §2（按批推进、体裁基线） |
| 5 | `skills/ai-team-write-role-editor/` | 角色 | ≤140 | editor §3 裁决清单 + 基调卡 |
| 6 | `skills/ai-team-write-role-architect/` | 角色 | ≤170 | structure §1/§4 台账 + voice 卡 |
| 7 | `skills/ai-team-write-role-writer/` | 角色 | ≤160 | 上下文包机制 + brief/changelog |
| 8 | `skills/ai-team-write-role-critic/` | 角色 | ≤190 | editor §1 判据 + structure G1-G6 + 漂移校验 |
| 9 | `skills/ai-team-write-role-reader/` | 角色 | ≤150 | 通用评分流程 + 引用口味模块 |
| 10 | `skills/ai-team-write-role-market/` | 角色 | ≤150 | market §1-§4 |
| 11 | `skills/ai-team-write-role-commercial/` | 角色 | ≤150 | commercial §0-§5 |

> 计数说明：#1/#2/#3 同属 `ai-team-write/` 一个目录，故实际为 **9 个目录**。
> **关键设计**：完整标准（~1640 行）不塞进 SKILL.md（会破 ≤200 行门禁），作为**领域共享资产**放在 `ai-team-write/standards/`，角色按需 `read_file` 加载（与 `ai-team-dev/platform-map.md` 同一模式），保证**单一事实源、不漂移**。

**改动 4 个文件**：`skills/ai-team/domain-map.md`（注册 writing + 修 generic 示例）、`skills/ai-team-tool-report/SKILL.md`（追加写作领域产出物规范）、`README.md`（1.3 领域表 / 能力矩阵 / 导航 / 扩展指南）、`CHANGELOG.md`（里程碑条目）。

---

## 五、产出物结构

```
docs/ai-team-write/{任务标识}/
├── designer-report.md        需求（题材/平台/口味/明确不写什么）
├── progress.md              进度台账 + 当前阶段（断点续写；PM 受限读取）
├── world.md characters.md outline.md foreshadow.md voice.md
├── market-report.md          竞品对标（按需）
├── commercial-report.md      商业价值评估（按需）
├── editor-report.md          基调卡 + 各阶段裁决记录
├── chapters/ch-{N}.md        正文
├── briefs/ch-{N}.brief.md    章节精简（200-400 字，喂 AI）
├── chapter-changelog.md      修改日志（喂 AI）
├── critic-report-ch{N}.md    审稿（含设定漂移 + 文风一致性）
└── reader-report-ch{N}.md    读者评分（均分 + 分歧项）
```

**下一批开写前的固定上下文包**：`voice.md` → 设定集 → **最近 3 章 brief** → `chapter-changelog.md` 相关行 → 本批目标。**不读正文全文**。

---

## 六、门禁汇总（只列清单，判据以标准原文为准）

| 来源 | 门禁 | 判据出处 |
|------|------|----------|
| structure | G1-G6 | `standards/structure.md` §七 |
| editor | P0 / P1 / P2 | `standards/editor.md` §3.1 / §3.2 / §3.3 |
| readers | 一票否决 + 封顶 | 各 `standards/reader/{口味}.md` 的「评分维度与权重」「转写模板」段 |
| commercial | 数据诚实 + 密度 | `standards/commercial.md` §禁止事项 · §三 |
| market | 分析纪律 | `standards/market.md` §四 |

> **本表禁止填入通过条件与阈值**——同一判据出现三处副本必然漂移，运行时一律 `read_file` 标准原文。

---

## 七、口径归一决策（合成时统一，避免两套标准）

| 概念 | 统一口径 | 处理 |
|------|----------|------|
| 审稿 / 弃书 / 回炉严重度 | **P0 / P1 / P2** | 读者侧「致命/重/中」与 suspense 的 S/A/B 一律映射：致命→P0、重→P1、中→P2（保留原编号溯源） |
| 雷同度档位 | **S / A / B / C** | 保留（等级序列），**禁止与严重度混用** |
| 张力 | **峰值张力 1-10**（structure 权威） | 记本章峰值，非均值 |
| 情绪强度 | **1-5**（商业侧追加列） | 与张力**禁止换算/取均值** |
| 追更驱动因子强度 | **各模块采用同一套等级分** | 三口一致（具体分值以模块为准，不在本表复制） |
| 读者评分权重 | **各口味模块自带完整权重表** | 各口特有项数量不同（属正常）；**横向比较只用「口径内部相对权重」，不比绝对值** |
| 读者口味骨架 | **七段统一骨架**（画像与判定前提 / 驱动因子 / 弃书触发 / 维度权重 / 期待基线 / 扣分场景 / 转写模板） | 三口已全部按此重构，合成成本最低 |
| 数据真实性 | **不编造** | 市场/商业两侧的「未核实」纪律合并为一条统一约束 |

---

## 八、待你确认的开放项

| # | 开放项 | 我的建议 |
|---|--------|----------|
| 1 | 完整标准存放位置 | **放 `ai-team-write/standards/`**（PM 目录内、角色按需 read_file）。备选：各角色目录各自的 `references/`（会复制出多份、易漂移） |
| 2 | 首版读者口味只做 3 个（悬疑/科幻/网文爽文） | 同意，后续按需加（玄幻/历史/言情/克苏鲁…），加口味 = 加一个 `standards/reader/{口味}.md`，零改代码 |
| 3 | 商业化「平台章长/榜单数值」等 | 采纳建议：**收敛为「引用即提示核实」门禁**，不固化可能过期的具体数字 |
| 4 | editor 提出的挂接项 | 纳入：把悬疑 P0 两条（结局推翻公平性 / 欺骗式隐瞒视角）在 editor 回炉清单**加引用行**（引用编号，不复制逻辑） |
| 5 | 角色名「主编」 | 保留（比「内容负责人」更符合写作语境） |
| 6 | **跨口味判定强度差异**：suspense 判「结局推翻公平性 / 真凶为末章新登场角色」为**致命(P0)**，webnovel 同类「设定崩坏·吃书」仅判**重(P1)** | **保留双口结论 + 标注来源，不取其一**（读者 skill 输出时按口味分别给结论，汇总表列出分歧项——这恰好是「分歧项」机制的价值所在） |
| 7 | reader-scifi 是否交付 | 已交付（`reader-scifi-standards.md` 200 行，含画像前提 / 驱动 9 项 / 弃书 10 项 / 权重 40-60 / 封顶规则）；suspense 报其收件箱不可达系团队已回收所致，非未交付 |
