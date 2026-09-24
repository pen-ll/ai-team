# ai-team 通用多 Agent 协同内核变更日志

## 2026-09-24

### 1. `ai-team-tool-auto-tune` 新增「反馈确认门禁」——角色反馈回收后须先经用户确认，才产出报告与会话回收

- **背景**：真实复盘（task `clouddisk-16569-260924`）暴露流程缺口——角色自述的流程体验倾向于自评顺畅，可能与用户实际观察到的不一致；原流程「收集反馈 → 自检 → 直接产出报告 → 回收」无用户确认环节，用户即使发现问题也无入口补充，且会话回收在报告产出后即自动执行
- **方案**：
  - 新增 **「一.五 反馈确认门禁」[门禁]**：角色反馈全部回收（或兜底登记未回复）后，PM 必须 `ask_followup_question` 向用户①原样呈现各角色反馈要点与自检结论（不美化）；②确认口径是否与用户实际观察一致（选项：一致产出 / 不一致由用户补充观察 / 不产出报告）；③同时确认是否执行会话回收（默认确认回收）
  - 用户补充的观察点**原样写入问题清单**（来源标「用户观察」），与角色反馈矛盾时并列呈现双方口径，不丢弃、不降权
  - **未确认不回收**：确认门禁通过前 PM 不得 `shutdown_request` / `team_delete`；用户选「先保留团队」则停在报告交付
  - frontmatter description 同步更新触发口径
- **关联改动**：三个编排入口（`ai-team` 阶段4 / `ai-team-qa` 阶段3 / `ai-team-dev` 阶段3）的收尾章节复盘条目同步补充「收集反馈 → 过反馈确认门禁 → 产出报告」口径
- **改动文件**：`ai-team-tool-auto-tune/SKILL.md`、`ai-team/SKILL.md`、`ai-team-qa/SKILL.md`、`ai-team-dev/SKILL.md`

## 2026-09-17

### 1. `ai-team-tool-debug-loop` 去掉「默认打日志」——新增「定位手段选择（成本递增）」；`global-rule` 新增「用户协作成本优先」

- **背景**：两处规则缺口在本次真实调试中暴露
  - `debug-loop` 把「AI 无法自行运行应用」直接推导成「**必须加日志**」：核心问题一节断言「需用户作为操作手，通过日志数据协作定位」，主流程（步骤 1-5）全部围绕埋点→复现→读日志；且「平台日志读取参考」给的 `hdc shell "hilog -z 500"` 未经验证。实际约束是：**日志证据力最强但成本最高**（改码 → 编译 → 安装 → `force-stop` → 复现，一轮很贵），且很多 bug 靠代码推理或项目**已有日志**（hilog/埋点/请求 URL/崩溃日志）即可定性；另外「AI 无法自行复现」在鸿蒙侧已不成立（`hdc` + 真机 UI CLI 可自主驱动链路并抓请求参数）
  - `global-rule` 第七节只覆盖「**物理上只能用户做**」的事（签名、解锁、授权、制造环境条件），**缺少「双方都能做、但用户更划算」的判据**——典型如切换账号态、点一次授权弹窗、肉眼确认视觉遮挡：用户一步完成，AI 却要绕多步且定位脆弱
- **方案**：
  - `debug-loop` 新增 **「步骤 0：定位手段选择（成本递增）」表**：① 代码路径推理 → ② 已有日志（不改代码）→ ③ 自动化复现（ohosTest / 真机 UI CLI）→ ④ 新增最小化诊断日志 → ⑤ 二分/回滚。并加门禁：**不得跳过 1~3 直接埋点**、**不得停在 1 就断言根因**（1 只能提假设，需 2/3/4 提供运行时证据）
  - `debug-loop` 修正绝对化表述：核心问题改为「AI 难以自行复现**部分** bug（平台相关，鸿蒙可自主驱动）」；步骤 1 更名「分析 + 埋点（**最小化**）」并加「手段 1~3 确证不足才进入」前置；步骤 2 更名「复现（**优先 AI 自主**，其次用户）」；调试循环图补注「能靠推理/已有日志定性就不要进入埋点循环」
  - `debug-loop` 修正未验证命令：harmony 行改为实测可用链路（`hilog -b D` → `hilog -r` → 复现 → `hilog -x -n 4000` 过滤 `[DEBUG-LOOP]`）
  - `global-rule` 新增 **第十一节「用户协作成本优先」**：给出 3 条判据（用户 ≤1 步 / AI 需 ≥3 步或依赖脆弱定位 / AI 有高风险不可逆）→ 优先用 `ask_followup_question` 给选项，并说明「为什么建议你来 + 我要绕哪些路」；与第七节明确分工（第七节=物理上只能用户做；本节=用户更划算），并禁止用它推卸本职（读代码、编译、跑测试）
- **改动文件**：`ai-team-tool-debug-loop/SKILL.md`（104 → 124 行）、`ai-team-tool-global-rule/SKILL.md`（206 → 222 行；**已超 ≤200 门禁，待独立精简**）

## 2026-09-15

### 1. tester 角色补两道门禁——用例设计边界维度清单 + 结论有效性

- **背景**：搜索页重构测试（dev 领域，task `search-refactor-260915`）实测暴露通用 tester 流程的边界测试缺口。原 skill 关于边界只有 3 句同义口号（「通用测试原则」第 2 条、「Token 优化」第 2 条、检查项 3「包含边界情况测试（空数据/异常输入）」），**无可执行维度**，代价是：① 漏「状态 × 触发类型」矩阵——`onError` 的「失败态 × 首屏/刷新/加载更多」4 组只覆盖 2 组，导致失败态语义返工两轮；② 阈值类边界无来源要求——「列表不足一页不显示到底视图」由**用户提醒**才补验；③ 时序竞态边界靠偶然撞到（恢复网络瞬间点重试）；④ 无「测试有效性」要求——`hdc install -r` 后未重启进程，跑的是内存旧代码，1 条真机证据作废（与当前代码矛盾）
- **方案**：
  - 第二步新增 **[门禁] 用例设计：边界维度清单**（8 维度表：空与缺失 / 数值与分页边界 / 阈值与临界（须枚举来源：需求阈值·用户澄清·实现常量）/ 状态×触发矩阵 / 重复与幂等 / 时序与竞态 / 异常路径 / 数据可构造性），并明确「只写『覆盖边界/异常』不算执行本条」、逐维度须给结论
  - 第二步新增 **[门禁] 结论有效性**（4 条：构建产物时间 ≥ 被测源码改动时间；安装后必须确保运行新版本（重启命令由平台特化 skill 提供）；验证后代码/构建再变更 → 受影响结论必须重跑或标注失效，禁止保留与当前代码矛盾的「已验证」；设计阶段即落「需求点 → 覆盖手段 → 无法覆盖原因」矩阵）
  - 第三步产出模板新增「**边界维度覆盖表**」（缺此表视为未执行第二步门禁）与「未覆盖项清单（含不可构造边界）」
  - 第四步检查项 3、主观维度「用例设计质量」改写为对照边界维度清单的完备度
  - **去重减重**：合并原重复的「通用测试原则」与「Token 优化：测试聚焦原则」为「测试聚焦与用例数参考」，压缩产出模板与跨角色沟通协议（208 → 194 行，守住 ≤200 行门禁）
- **关联改动**：`ai-team-pt-hm-tester` 覆盖范围表补「沿用通用边界维度清单 + 鸿蒙侧环境边界（设备/签名/构建新鲜度/锁屏）」；`ai-team-tool-report` 的 tester-report 结构同步补「边界维度覆盖表 + 未覆盖项清单」，避免角色 skill 与文档规范不一致
- **改动文件**：`ai-team-role-tester/SKILL.md`、`ai-team-pt-hm-tester/SKILL.md`、`ai-team-tool-report/SKILL.md`

### 2. tester 补「依赖用户操作的环境条件」门禁——缺口径为「制造条件型」

- **背景**：原规则只覆盖**障碍型**（`global-rule` 工具降级表列了「签名、解锁设备、授权」；`pt-hm-tester` H1/H6 处理锁屏 `10106102`），即「遇到阻碍 → 请用户解除阻碍」。而**「用例本身要求人为制造环境条件」**（弱网/断网复验、杀进程、切后台、授权弹窗）不由报错触发，无任何规则约束，实测代价：① 用户操作项**未在设计期枚举**，跑到一半才发现要关 Wi-Fi；② 无合并询问要求，易多次打断用户；③ 请求用户断网后**未校验断网是否生效**即取证，可能得出伪结论；④ 复验后**未恢复并复核**，可能把用户设备留在断网态；⑤ 用户无法配合时无降级记账规则
- **方案**：
  - `ai-team-role-tester` 边界维度清单新增「环境依赖」维度，并新增 **[门禁] 依赖用户操作的环境条件**（5 条：设计期枚举用户操作清单〔操作/目的用例/副作用/生效校验/恢复方式/降级〕、合并为一次 `ask_followup_question`、执行前校验条件已生效、执行后恢复并核对、用户拒绝即列入未覆盖项禁止伪造）；第三步产出模板的未覆盖项清单同步要求含「依赖用户操作的项及其原因」
  - `ai-team-pt-hm-tester` 新增 **H7**：鸿蒙侧制造与校验命令表（断网用 `ifconfig`/`ping` 校验（零售机多不允许 down，回退用户手操）、锁屏 `power-shell wakeup`、`aa force-stop`/`aa start`、授权弹窗、弱网优先 mock），并带同款门禁
  - `ai-team-tool-global-rule` 工具降级表「告知用户」行扩展为含「制造环境条件如断网/弱网」，并要求验证类场景校验生效 + 结束后恢复
  - **去重减重**：删除 `pt-hm-tester` 中与通用 tester **完全重复的 15 行**「Token 优化：测试聚焦原则」段（改为一行指向通用），腾出空间给 H7，未增加文件总量压力
- **改动文件**：`ai-team-role-tester/SKILL.md`、`ai-team-pt-hm-tester/SKILL.md`、`ai-team-tool-global-rule/SKILL.md`

### 3. 通用内核 1.0 问答重构——「是否含需求人员」并入规模选项（每种规模两个变体）

- **背景**：原 1.0 为三问（Q1 需求人员独立开关 / Q2 执行规模 / Q3 运行模式），用户看到的选项里**没有「各规模 × 含/不含需求人员」的完整组合**，必须先选开关再选规模，组合语义被割裂（用户诉求：每种模式都直接给出「含需求者 / 不含需求者」两个选项）
- **方案**：三问合并为两问
  - Q1 `role-config`（原 `need-designer` + `scale` 合并）：4 个业务选项 = `单角色·含需求人员` / `单角色·不含需求人员` / `标准·含需求人员` / `标准·不含需求人员`，角色名由 1.0-A 填入
  - Q2 `run-mode`：全自动 / 手动确认（原 Q3 顺位前移）
  - 1.0-A 新增第 4 步「两套清单 × 含/不含 → 拼出 4 个选项文案」
  - **修正一致性隐患**：规模判据明确为「**只数执行视角，需求人员不计入**」，否则合并后「单角色·含需求人员」会被算成 2 种视角而自相矛盾（`ai-team/README.md` 原「需求人员算一种角色类型，但可通过 Q1 独立开关跳过」同步改写；并顺带修正 README 把档位误写成「轻量/标准」的不一致）
  - 路径判定改为「含需求人员 → 1.1（spawn designer）；不含 → 1.3（预估清单即最终清单）」；spawn designer 的 `初始规模` 取 Q1 规模部分、`模式` 取 Q2
  - **选项数**：4 业务选项 + 末位自定义项 = 5。同步改写 `ai-team-tool-global-rule` 第八节第 5 条——去掉「建议 2-4 个」这类近似硬约束的表述，明确「数量**没有硬性目标或建议区间**，『2-4 个』只是常见情况的大致参考、**不是约束**；组合型选项（规模 × 是否含需求人员、档位 × 平台）按业务需要列出即可，仅设安全上限 50」
- **关联改动**：`ai-team/README.md`（1.0 描述 / 规模判据 / 初始规模定义 / 「固定前置角色」措辞改为「预设前置角色」）、`ai-team-tool-role-composer`（权威判定措辞对齐「不含需求人员」；预设角色表的 `spawn 时机` 由「固定：进入动态编排后立即 spawn」改为「预设但可选：选『含需求人员』时才 spawn」，消除与用户可选性的**事实性冲突**；另两处「固定前置角色」改为「预设前置角色」以避免与可选性混淆）
- **改动文件**：`ai-team/SKILL.md`、`ai-team/README.md`、`ai-team-tool-role-composer/SKILL.md`、`ai-team-tool-global-rule/SKILL.md`

## 2026-09-11

### 1. 通用内核新增「编排规模」维度——一次 ask 多问同出 + 预估推导 + 团队调整机制

- **背景**：通用内核只有「是否需求分析」一个二元开关，用户事前看不到会拉起多少人，也缺少类似 dev「轻量/标准」的规模控制；而「等 designer 拆完才知道角色」并非技术必需（源码本就支持 PM 基于原始问题推导角色，见「跳过需求分析」分支），导致弹窗无法列出人员清单
- **方案**：
  - **阶段 0.5 + 1.0 合并为阶段 1.0「一次 ask 多问同出」**：`questions` 数组同时问三项——Q1 是否需要需求人员 / Q2 执行规模（单角色·1 种视角 / 标准·≥2 种视角）/ Q3 流程运行模式；删除原阶段 0.5 独立弹窗
  - **新增阶段 1.0-A 预估角色推导**：PM 用 `ai-team-tool-role-composer` 仅凭用户原始问题推导候选清单，用于填充 Q2 选项文字；PM 门禁开「唯一例外」——预估推导不落盘、不传给任何角色、不作为权威拆解
  - **新增阶段 1.2 团队调整机制**：designer 深挖需求后检查初始规模是否仍合适，不合适则直接向用户建议增删角色类型；完成信号新增 `最终规模` / `最终清单` 字段，**最终清单覆盖初始选择**，spawn 权仍在 PM
  - **新增阶段 0.2 确定任务标识**：通用产出目录统一为 `docs/ai-team/{任务标识}/`（原为 `docs/ai-team/`，多任务会互相覆盖）
  - **规模判据**：按「视角种类数」而非角色实例数分界；需求人员算一种角色类型，但由 Q1 独立开关控制
- **关联改动**：
  - `ai-team-tool-role-composer` 触发时机由「阶段 2.2」扩展为「1.0-A 预估 + 2.2 权威」两段，新增「预估 ≠ 权威」对照表
  - `ai-team-tool-global-rule` 选项规范新增第 4 条：自定义项中用户指定的角色必须原样纳入最终清单并标注「用户指定」
- **改动文件**：`ai-team/SKILL.md`、`ai-team/README.md`、`ai-team-tool-role-composer/SKILL.md`、`ai-team-tool-global-rule/SKILL.md`

### 2. designer 拆分——通用基座 + 开发领域扩展（对齐角色 skill 既有分层）

- **背景**：`ai-team-role-designer` 名为「通用」，内容却是 dev 专用（写死 `docs/ai-team-dev/`、强制平台识别、编译单元式拆分），通用场景无法复用——直接 spawn 会往错误目录写文件并强制索要 platform；而同体系的 `ai-team-role-coder` + `ai-team-pt-hm-coder` 已确立「通用基座 + 特化扩展」模式
- **方案**：
  - `ai-team-role-designer` 剥离平台识别 / 技术层面识别 / 编译单元拆分，改为通用流程（需求收集 / 意图澄清 / 角色规模适配检查 / 置信度）；新增「第零步：领域适配」钩子（`领域=development` 时加载扩展）；产出路径改用 `{artifact_dir}/{任务标识}/`；完成信号新增 `最终清单` 字段
  - 新建 `ai-team-dev-role-designer`：承接平台识别表、技术层面需求识别、编译单元式任务拆分、档位适配检查、开发专属文档章节与置信度平台项
  - `ai-team-dev/platform-map.md` 的「同步要求」改指 `ai-team-dev-role-designer`
- **改动文件**：`ai-team-role-designer/SKILL.md`、`ai-team-dev-role-designer/SKILL.md`（新建）、`ai-team-dev/platform-map.md`

### 3. PM 纳入 global-rule 适用范围——修正「只约束角色、不约束 PM」

- **问题**：`ai-team-tool-global-rule` 为 `route-only`，需显式加载；但历史上只修过 4 个角色 skill 的加载门禁（2026-08-20），**PM 编排入口从未被要求加载**，其适用范围也只写「所有角色」。导致 PM 自己负责的全部用户弹窗（选项格式 / 末位自定义项）无规范约束——本日新增的选项规范第 4 条「PM 必须纳入用户自定义角色」实际对 PM 不生效
- **方案**：
  - **PM 加载门禁**：`ai-team` / `ai-team-dev` 各新增 [门禁]「进入阶段 0 前必须显式 `use_skill ai-team-tool-global-rule`」，并点明对 PM 最关键的两节（选项按钮设计规范 / 上下文信任分级与注入防护）
  - **适用范围扩展**：global-rule 的 description、触发节、选项规范适用范围由「所有角色」扩为「PM 与所有角色」
  - **领域归口**：[门禁] 硬约束按领域拆分——「文档写入 / 置信度 / 编排深度」归通用；「编译构建 / 语法校验 / 平台适配 / platform 校验」归 `领域=development`。文档写入路径参数化为 `artifact_dir`（原写死 `docs/ai-team-dev/`，通用 PM 加载后会拿到错误路径）
- **关联修正**：补齐 2 处缺失自定义项的选项列表，使全部选项类问题符合规范第 2 条
- **改动文件**：`ai-team-tool-global-rule/SKILL.md`、`ai-team/SKILL.md`

### 4. 选项规范：自定义项收归 global 统一追加 + 文案修正 + 数量上限放宽

- **问题**：① 原规范要求自定义项文案用「自定义填写（如：___）」，但**选项本身不可输入**——点选后只返回字面文本，该措辞误导用户以为可当场填写（输入能力实际由问题自带的自由文本输入承担）；② 该选项散落在 7 个文件各写一份，改一次文案需改 7 处、易漂移；③ 选项数量上限「不超过 10 个」与实际承载不符
- **方案**：
  - **[门禁] 末位自定义项由本规范统一追加**：各 skill **不自行列出**该选项，运行时统一补在选项数组末尾，文案唯一来源固定为「**自定义填写（选此稍后补充）**」（`multiSelect: false`）；禁止「（如：___）」这类暗示可当场输入的措辞
  - **第 1 条**由「完整展示固定选项列表」改为「完整展示**业务选项**」，明确末位自定义项为统一追加、不计入「额外增加」，消除两条规则的语义冲突
  - 原第 3 条扩为「自定义项未提供内容 / **自由文本输入**内容不明确 → 必须追问一次」；原第 4 条扩为「自定义项或自由文本中追加的角色必须原样纳入最终清单」
  - 选项数量上限由「不超过 10 个」放宽为「**不超过 50 个**」（工具 description 建议 2-4 个，超 4 个存在 UI 承载与选择成本问题，应尽量精简）
  - **反驳表**新增一条：「选项已经列全了，不用再加自定义项」→ 自定义项是所有问题的统一出口，由规范强制追加
  - **各 skill 清理**：删除显式自定义项；依赖该选项的分支逻辑改为「用户选末位自定义项或自由文本描述时」
  - **变体清理**：一并清理 6 处换措辞的同类选项（4 个角色的「完成通知模式」中的 `需要调整（我来描述）`、coder 任务确认中的同类项、debug-loop 中的 `自定义描述（我来描述bug现象）`）
- **改动文件**：`ai-team-tool-global-rule/SKILL.md`、`ai-team/SKILL.md`、`ai-team-role-designer/SKILL.md`、`ai-team-role-coder/SKILL.md`、`ai-team-role-tester/SKILL.md`、`ai-team-role-reviewer/SKILL.md`、`ai-team-tool-debug-loop/SKILL.md`

### 5. 新增「合理质疑与风险提示」——补上角色层缺失的「质疑用户决定」约束

- **问题**：global-rule 及各全局工具均无「AI 合理质疑用户决定」的条款——现有「强制歧义处理」只管需求模糊时问清楚，「常见偷懒借口反驳表」反驳的是 AI 自身而非用户；且该偏好此前仅存在于主会话的用户级 memory，**不会进入被 spawn 的角色 Agent 上下文**，导致最需要提示"这个改动不值当"的角色层完全空白
- **方案**：
  - **新增第四节-B「合理质疑与风险提示」**：核心是"先提示、后执行"——触发条件收敛为 5 类信号（明显副作用 / 成本收益失衡 / 存在更优解 / 前提有误 / 与已确认需求冲突），避免每次都唱反调；提示须含「问题 + 具体理由 + 替代方案」，一次说清不反复劝；用户选择留痕（产出文档记录「已提示风险：…；用户确认继续」）
  - **[门禁] 用户确认即执行**：明确"提示是义务、执行是本分"，用户确认后不得打折执行、不得反复劝阻
  - **反驳表**新增 2 条：「用户已经决定了，照做就行」「我觉得不对，但用户坚持，那我敷衍做」→ 分别对应"沉默执行"与"阳奉阴违"两种失效模式
  - **覆盖范围**：因 PM 与所有角色均已加载 global-rule，一处生效即全链路覆盖，正好补齐角色层空白
- **改动文件**：`ai-team-tool-global-rule/SKILL.md`

### 6. `ai-team-tool-report` 参数化——消除通用 designer 的 dev 路径耦合

- **问题**：本日改动让通用 `ai-team-role-designer` 基座加载 `ai-team-tool-report`，但该工具是 dev 专用——写死 `docs/ai-team-dev/{任务标识}/` 路径、元信息强制 `平台/环境` 字段、报告类型仅列 dev 四角色。通用场景（写作/调研/决策）加载后会拿到错误路径与无意义的平台字段要求（与同期 global-rule 的 `docs/ai-team-dev` 写死属同类问题，但当时漏改了 report）
- **方案**：
  - 路径改用 PM 传入的 `{artifact_dir}`，并提供领域默认值（通用 `docs/ai-team/{任务标识}`；开发 `docs/ai-team-dev/{任务标识}`）
  - 元信息模板新增「领域」字段，「平台/环境」改为仅 `development` 必填（通用领域省略）
  - 「各角色报告特有内容」与「产出物清单」按通用/开发分列，通用侧补 `{role}-report.md`（动态角色）
  - 禁止事项补一条：通用领域不得填写平台字段
- **改动文件**：`ai-team-tool-report/SKILL.md`

### 7. global-rule 精修——恢复丢失的领域门禁、去 dev 耦合、压缩冗余、编号重排

- **问题**：
  - **内容丢失**：上一轮 [门禁] 按领域拆分时，误删「仅开发领域」4 条（编译/构建、语法校验、第零步平台适配、platform 字段校验）及「违反 [门禁] → 阻塞」提示行，导致"按领域生效"标题悬空
  - **dev 耦合残留**：强制歧义处理要求更新 `designer-report.md（追加 ## 开发阶段澄清记录）`；上下文信任分级写死 `docs/ai-team-dev/{任务标识}/*.md`；先思考再执行以 dev 四角色与三文档举例——通用场景会拿到错误指令
  - **冗余**：八荣八耻 8 条 100% 被下文章节覆盖；思维流程与规则 1-3 重复；反驳表 10 条 100% 是其他章节的浓缩——合计约 20 行无新增信息
  - **结构**：「四-A」「四-B」为插入修补痕迹；命令行节内部矛盾（描述"仅 Windows 生效"，表格却写"默认 PowerShell"）
- **方案**：
  - **恢复**丢失的「仅开发领域」4 条门禁与「违反 [门禁] → 阻塞」提示行
  - **去 dev 耦合**：歧义处理改为「更新本次任务的需求文档（`{artifact_dir}/designer-report.md`，追加 `## 澄清记录`）」；上下文信任分级路径改 `{artifact_dir}/*.md`；先思考再执行删除 dev 角色/文档举例，5 条压缩为 2 条
  - **压缩冗余**：八荣八耻归为 3 组「行为速记」并指向对应章节；删除思维流程流程图；软建议清单压为一行；反驳表由 10 条精编为 5 条高频借口
  - **结构整理**：「四-A」「四-B」提为独立节并全篇重排为 一~十；修正命令行节「语法基线」的矛盾表述；合并选项规范第 2/3 条重叠内容
  - **同步交叉引用**：`ai-team` / `ai-team-dev` 的 PM 加载门禁中「第六节 → 第八节」「第四节-A → 第五节」
- **结果**：正文由 215 行降至 197 行（回到 ≤200 规范内）
- **改动文件**：`ai-team-tool-global-rule/SKILL.md`、`ai-team/SKILL.md`、`ai-team-dev/SKILL.md`

## 2026-09-09

### 1. designer 由固定创建改为按需确认——PM 弹窗询问是否需要落地需求方案

- **背景**：进入 generic 动态编排后固定 spawn designer 做需求分析，需求已明确的任务也要多走一个角色（独立 context + token 开销），且用户无选择权
- **方案**：
  - **阶段 1.0 改为弹窗确认**：PM 进动态编排后先 `ask_followup_question` 询问用户是否需要先将问题分析、理解、整理完善成落地需求方案；选「需要」才按固定模板 spawn designer-agent，选「不需要」则跳过 1.1、直接以用户原始问题进入阶段 2 推导角色
  - **PM 边界不变**：无论选哪项，PM 均不自行调研、不自行拆解任务；跳过需求分析时角色推导仍由 role-composer 承担
  - 同步更新角色定位第 3 条、PM 门禁表述与 README「动态角色编排」机制说明
- **改动文件**：`ai-team/SKILL.md`、`ai-team/README.md`

## 2026-08-20

### 4. 「完成通知模式」从 global-rule 下沉到各角色 skill——角色通知 PM 前自行判断模式

- **问题**：`ai-team-tool-global-rule` 的「三-A、完成通知模式」为 `autoTrigger: false` + `route-only`，不会被自动加载；且四个角色 skill 的通知 PM 步骤未消费 `模式` 参数，导致「手动确认」规则形同虚设
- **方案**：global-rule 移除「三-A、完成通知模式」整节；四个角色 skill 的「通知 PM」步骤新增 **[门禁] 完成通知模式**——最后步骤判断 spawn prompt 的 `模式` 参数，`手动确认` 时先 `ask_followup_question` 向用户确认完成度再通知 PM
- **改动文件**：`ai-team-tool-global-rule/SKILL.md`、`ai-team-role-designer/SKILL.md`、`ai-team-role-coder/SKILL.md`、`ai-team-role-tester/SKILL.md`、`ai-team-role-reviewer/SKILL.md`、`ai-team/SKILL.md`（spawn prompt 引用同步）、`ai-team/README.md`

### 3. 新增「流程运行模式」——全自动 vs 手动确认，覆盖上下游角色接力流程

- **背景**：有上下游角色依赖的流程（designer → 多交付角色串行接力）中，默认所有角色完成即接力，用户无法在每步成果产出后把关；缺少「每步完成需用户确认」的选项
- **方案**：
  - **内核**：新增「阶段 0.5 询问模式确认」——领域判定为 generic、spawn 任何角色前用 `ask_followup_question` 询问用户运行模式：`全自动`（上游完成后直接接力）或 `手动确认`（每步完成需用户确认完成度后再继续）
  - **模式传播**：阶段 1.0 designer spawn 模板与 2.3 动态角色 spawn 模板均增加 `模式:{模式}` 参数，模式随 spawn prompt 传给每个角色
  - **门禁联动**：3.2 置信度门禁补充「模式联动」说明——手动确认下完成度确认在角色会话内完成，PM 收到信号后不重复向用户确认
  - **全局约束**：`ai-team-tool-global-rule` 新增「三-A、完成通知模式」规则，所有角色继承——`手动确认`下角色完成自评达标后先 `ask_followup_question` 向用户展示成果/完成度，用户确认后才 `send_message` 通知 PM；`全自动`或模式未传入时默认直接通知 PM
- **改动文件**：`ai-team/SKILL.md`、`ai-team-tool-global-rule/SKILL.md`

### 2. PM 调度职责再收窄——任务拆解归 designer、PM 不读角色报告全文、role-composer 仅创建未知角色加载

- **背景**：PM 若参与任务拆解就需理解需求细节（读报告/代码），违背「PM 只调度」；PM 读取每个角色报告全文 token 成本高，且产出角色置信度自评循环 + 下游角色发现问题自行沟通已能保证质量
- **方案**：
  - **任务拆解下沉 designer**：角色定位删除 PM「任务分解」职责，改为「按 designer 完成信号中的任务拆分编排角色」；1.0 designer 职责扩为「深入研究需求 + 拆解 2-5 个可独立完成/可独立验收子目标（依赖拓扑排序）」；删除原 1.2「拆解子目标」章节，1.1 改为「依据完成信号中的任务拆分与摘要决定编排」
  - **角色定位第 4 条简化**：「为每个子目标现场定义角色（职责/产出物/验收标准）」收敛为「按 designer 的任务拆分 spawn 对应角色 Agent」（四要素由 designer 在任务拆分中产出，PM 不再重复描述）
  - **PM 不读角色报告全文**：门禁明确「仅依据角色 send_message 完成信号（平台/置信度/产出路径/摘要/任务拆分）调度，不读取 designer-report 等产出文档全文」；1.0/1.1/3.2 同步更新；2.3 spawn 模板统一完成信号格式（置信度/产出路径/摘要）；报告质量由产出角色自评 + 下游角色自行沟通把关
  - **role-composer 仅创建未知角色加载**：1.0 designer spawn 模板移除 `use_skill ai-team-tool-role-composer` 依赖，designer 职责内联；`ai-team-tool-role-composer` 触发收敛为「阶段 2.2 创建未预设角色时加载」，预设前置角色定义降为职责存档参考
- **改动文件**：`ai-team/SKILL.md`、`ai-team-tool-role-composer/SKILL.md`

### 1. 通用内核强化「PM 只做调度」——固定 designer 深入研究需求，PM 禁止自行调研

- **背景**：重构类任务中 PM 收到需求后自行通读方法论文档与模块代码做调研（复杂度评估 + 边界确认），与「PM 只调度、不干活」定位冲突，且需求研究应由 designer 承担
- **方案**：
  - **PM 禁止自行调研**：角色定位与阶段 0 新增 [门禁]「PM 只做调度，禁止自行调研与产出」——除 `domain-map.md` 路由元数据与角色产出文档外，PM 不读取需求相关代码/文档，不调用执行/编码工具
  - **固定创建需求分析者**：阶段 1.0 由「需求充分性三级判定（充分跳过/轻微不足 PM 轻量澄清/严重不足才 spawn）」改为「进入动态编排后**固定** spawn `designer-agent` 深入研究需求」，删除 PM 自行判定需求充分性与轻量澄清路径，需求研究一律由 designer 完成
  - **spawn 模板**：1.0 新增固定 designer spawn 模板（读代码/文档/向用户提问 + 产出 designer-report.md）
  - **1.1 判定**：决策树入口改为「PM 读取 designer-report 后判定」，默认行为改为「designer 调研 + 单 Agent 解决 / 多角色编排」
- **关联改动**：`ai-team-tool-role-composer` 触发时机与预设前置角色同步改为「固定 spawn」（角色名注明 `designer-agent`，职责扩为可读取代码/文档深入调研）
- **改动文件**：`ai-team/SKILL.md`、`ai-team-tool-role-composer/SKILL.md`

## 2026-08-19

### 1. 优化鸿蒙 ArkTS 编码规则 skill 的 @ObservedV2 章节

- **背景**：核对官方文档（`@ObservedV2`/`@Trace` 类需 `new` 实例化后才具备观测能力）与项目实际代码（`UserBeanV2`/`AvPlayerObserved`）后，发现 `ai-team-pt-hm-arkts-coding-rules` 第四节存在措辞矛盾与类型限制缺失
- **方案**：
  - 修正「不执行构造函数体逻辑」歧义 → 「采用无参构造，带参构造里的派生赋值不执行」（4.2.1 与 4.4 措辞统一）
  - 补 `@Trace` 字段类型硬限制：禁可选类型 `?`、函数、`Symbol`，用默认值兜底（4.5）
  - 补 4.1 普通对象不响应反例代码，压缩背景解释（去冗余）
  - 收紧 4.2 转换方式表格场景描述，明确「默认批量工具，仅派生计算时改 new」
  - 澄清 `objToClass` 签名中的 `any` 仅限 `.ts` 内使用，与 1.1 的 `.ets` 禁 `any` 不冲突
- **改动文件**：`ai-team-pt-hm-arkts-coding-rules/SKILL.md`

### 2. README 补充推荐模型门槛

- **背景**：实测 `hy3` 模型下流程不通畅，PM 未正常 spawn 角色 Agent、任务直接在 PM 主会话内执行
- **方案**：README 新增「六、推荐模型」章节，明确模型评分与上下文窗口均需 ≥ `deepseek-v4-flash` 同档，低于该档不建议使用本内核；表格补参考数值（MMLU-Pro 86.2 / LiveCodeBench 91.6、1M token 上下文）
- **改动文件**：`ai-team/README.md`

### 3. coding-rules 新增字符串拼接规范（3.6）

- **背景**：`(areaItem.id as string) + areaItem.title` 这类 `+` 号拼接依赖隐式类型转换 + 谎报类型，存在 `number + number` 数字相加歧义
- **方案**：`ai-team-pt-hm-arkts-coding-rules` 三、编码规范新增 3.6「字符串拼接优先使用模板字符串」，说明 `+` 号类型歧义风险与 `undefined`/`null` 兜底写法（`?? ''`）
- **改动文件**：`ai-team-pt-hm-arkts-coding-rules/SKILL.md`

## 2026-08-18

### 5. 通用内核新增「需求收集者」机制——需求充分性路由

- **背景**：通用内核拆解子目标前缺少需求澄清环节，需求模糊时直接定角色易「垃圾进垃圾出」；且缺少与 ai-team-dev「复杂度路由」对等的按需收集机制
- **方案**：`ai-team/SKILL.md` 阶段 1 新增「1.0 需求充分性判定」，三级路由：需求充分→跳过；轻微不足→PM 直接 `ask_followup_question` 轻量澄清；严重不足→spawn 固定前置角色 `requirement-agent`（需求收集者）产出 `docs/ai-team/designer-report.md`，完成后 PM 再进入 1.1 拆解。用户提供足够详细需求时跳过
- **归属调整**：需求收集者的职责/产出/边界定义下沉到 `ai-team-tool-role-composer` 二、预设前置角色（作为唯一预设角色，其余角色均动态推导），内核只保留「需求充分性判定」流程与引用，符合分层隔离规范
- **顺带修正**：阶段 2.2 旧措辞「角色原型库 + 任务组合清单」改为「推导方法与约束」，与 role-composer 去预设化方向一致；阶段 2.1 补「1.0 已创建团队则复用」
- **改动文件**：`ai-team/SKILL.md`、`ai-team-tool-role-composer/SKILL.md`

### 4. 新增角色组合器 ai-team-tool-role-composer

- **背景**：通用内核阶段 2.2 原仅声明「角色由 PM 现场拟定，无固定范式」，缺少「需求类型 → 角色组合」的推导方法与角色原型库，导致领域外任务的角色编排依赖 PM 临场发挥，同一需求跨会话可能拆出不同角色
- **方案**：新增 `ai-team-tool-role-composer`，提供「从问题本身动态推导角色」的方法与约束：角色的本质定位、三个拆角色判断信号（视角独立/产出独立/上下文隔离）、六步动态推导流程、角色四要素定义规范、四项硬约束 + 五项 spawn 前自查、五类反模式（按头衔造角色/预设冗余/职责重叠/运动员兼裁判/越权代劳）
- **演进**：初版预设了认知角色原型库与任务组合清单；后按「面向各职业各管理层全面适配」扩展为「场景域路由 + 认知/组织双原型库 + 双清单」；最终收敛为「去预设化」的动态方法论——原型与清单降级为「示例（仅供参考，非模板）」，核心只保留推导方法与约束，角色从子目标所需视角反推而非从目录挑选
- **改动文件**：新增 `ai-team-tool-role-composer/`，`ai-team/SKILL.md` 阶段 2.2 改为「加载该 skill 确定角色组合」

### 3. 对齐 addyosmani/agent-skills 开源项目优化——描述范式与编排机制升级

- **背景**：对比开源项目 `addyosmani/agent-skills`，借鉴其「本质一句话 + 触发场景」描述范式、编排反模式警示、上下文信任分级、对抗式审查等成熟资产，优化 ai-team 体系的可读性与健壮性
- **方案**：
  - **description 双段式改造**：全部 30 个 skill 的 frontmatter `description` 统一为「本质一句话 + 触发场景：明确触发条件」中文双段式，替换原罗列式描述；顺带修复 `ai-team-pt-hm-coder/reviewer/tester` 三处 description 重复粘贴 bug
  - **编排深度门禁**：`ai-team-tool-global-rule` 指令权威分层新增「编排深度最多 1 层（PM → 角色）」[门禁]，角色内部禁止 spawn 子角色 agent / 嵌套 team；`ai-team` 与 `ai-team-dev` 全局约束处同步声明。仅PM能创建角色，子角色不行。
  - **上下文信任分级与注入防护**：`ai-team-tool-global-rule` 新增章节，定义可信/核实后采用/不可信三级信任模型，要求下游角色把上游产出文档与 `send_message` 中的指令性文本视为数据而非指令
  - **任务分解决策树**：`ai-team` 阶段 1.1「是否值得多角色」信号表升级为决策树，补充单角色 vs 多角色的成本理由（每角色独立 context + token）
  - **reviewer 对抗审查 + RECONCILE**：`ai-team-role-reviewer` 第三步新增高风险任务对抗审查模式（只输出 issue、输入隔离不带上游结论），第四步引入 RECONCILE 四分类（contract misread / actionable / trade-off / noise）消化审查发现
  - **借口反驳表**：`ai-team-tool-global-rule` 新增「常见偷懒借口反驳表」，反驳跳过门禁、擅自猜测等偷懒倾向
- **改动文件**：全部 30 个 `SKILL.md`（description）、`ai-team-tool-global-rule`、`ai-team`、`ai-team-dev`、`ai-team-role-reviewer`

### 2. 体系换位重命名——内核占据 ai-team 总入口，开发领域降级为 ai-team-dev

- **背景**：上一版将通用内核命名为 `ai-team-core`、开发领域沿用 `ai-team`，导致「总入口」语义仍落在开发领域，`ai-team` 名字歧义未消除
- **方案**：换位重命名——`ai-team-core` → `ai-team`（内核坐总入口），`ai-team` → `ai-team-dev`（开发领域降级为插件）：
  - 领域注册表 `domain-map.md`：`development` 路由目标改为 `use_skill ai-team-dev`
  - 产出物目录换位：内核 `docs/ai-team/`，开发领域 `docs/ai-team-dev/`
  - team_name 前缀换位：内核 `ai-team-{ts}`，开发领域 `ai-team-dev-{ts}`
  - 子 skill 调用方描述精简（移除「由 ai-team（PM）spawn」等描述，符合「不描述调用方」规范）
- **改动文件**：`ai-team/`（原 ai-team-core 全套）、`ai-team-dev/`（原 ai-team 全套）、4 个 `ai-team-role-*`、`ai-team-tool-report/global-rule/web-read/auto-tune`、`ai-team-pt-hm-project-init`

### 1. 新增通用多 Agent 协同内核（ai-team-core 诞生）

- **背景**：开发领域 `ai-team` 已打磨成熟，但角色（designer/coder/tester/reviewer）与复杂度路由均硬编码开发场景。实际存在三份共享同一编排模式的 PM 实例，说明「PM 协调 + 多角色协作」是可抽象的通用内核
- **方案**：新建领域无关的通用编排内核（当时命名 `ai-team-core`，本次换位后更名 `ai-team`）：
  - **领域路由**：`domain-map.md` 注册表驱动，命中已注册领域则委托对应领域 PM，未命中则通用动态编排
  - **动态角色编排**：不预设固定角色，PM 现场拆解复杂问题为 2-5 个子目标，为每个子目标即时定义「角色名/职责/产出物/验收标准」
  - **复用现有 skill 零改动**：开发领域整套作为插件挂载；`ai-team-tool-global-rule` / `auto-tune` / `report` / `web-read` 通用工具直接复用

# ai-team-dev Skill 体系变更日志

## 2026-08-21

### 1. 编译验证统一改为「[门禁] 必须显式 use_skill ai-team-pt-hm-build」——消除按需加载导致的 SDK 路径猜测

- **问题**：`ai-team-pt-hm-tester` 的编译主项目步骤、`ai-team-pt-hm-reviewer` 的编译验证步骤均写「按需加载 `ai-team-pt-hm-build`」；`ai-team-pt-hm-project-module-init` 甚至内联了编译命令。软表述导致 tester 实战中未加载 build skill，自行探测 SDK 路径（误用 `~/Library/OpenHarmony/Sdk/13` 缺 native 组件），反复试错多次才定位正确路径为 DevEco 内置 `Contents/sdk`
- **方案**：4 处编译相关步骤统一改为 **[门禁] 必须显式 `use_skill ai-team-pt-hm-build`**（编译命令、DEVECO_SDK_HOME 路径探测均由 build skill 提供，禁止自行猜测/内联）；`ai-team-role-coder` 的「通用安全规范」标题从「按需加载」改为「[门禁] 编码时必加载」（内容本就是显式加载，修正标题歧义）
- **改动文件**：`ai-team-pt-hm-tester/SKILL.md`、`ai-team-pt-hm-reviewer/SKILL.md`、`ai-team-pt-hm-coder/SKILL.md`、`ai-team-pt-hm-project-module-init/SKILL.md`、`ai-team-role-coder/SKILL.md`

## 2026-08-20

### 9. 「完成通知模式」从 global-rule 下沉到各角色 skill——角色通知 PM 前自行判断模式

- **问题**：`ai-team-tool-global-rule` 的「三-A、完成通知模式」为 `autoTrigger: false` + `route-only`，不会被自动加载；且四个角色 skill 的通知 PM 步骤未消费 `模式` 参数，导致「手动确认」规则形同虚设
- **方案**：global-rule 移除「三-A、完成通知模式」整节；四个角色 skill 的「通知 PM」步骤新增 **[门禁] 完成通知模式**——最后步骤判断 spawn prompt 的 `模式` 参数，`手动确认` 时先 `ask_followup_question` 向用户确认完成度再通知 PM
- **改动文件**：`ai-team-tool-global-rule/SKILL.md`、`ai-team-role-designer/SKILL.md`、`ai-team-role-coder/SKILL.md`、`ai-team-role-tester/SKILL.md`、`ai-team-role-reviewer/SKILL.md`、`ai-team-dev/SKILL.md`（模式传播引用同步）、`ai-team-dev/README.md`、`ai-team-dev/SHARE.md`

### 8. 四个角色 skill 全局约束改为显式 use_skill 加载

- **问题**：`ai-team-tool-global-rule` 为 `autoTrigger: false` + `route-only`，不会自动加载；四个角色 skill（designer/coder/tester/reviewer）的「全局约束」描述仅写"遵守"字样、无显式加载指令，导致全局约束规范未进入角色上下文
- **方案**：四个角色 skill 的「全局约束」描述改为 **[门禁] 必须显式 `use_skill ai-team-tool-global-rule`** 加载并全程遵守
- **改动文件**：`ai-team-role-designer/SKILL.md`、`ai-team-role-coder/SKILL.md`、`ai-team-role-tester/SKILL.md`、`ai-team-role-reviewer/SKILL.md`

### 7. designer 新增「技术层面需求识别」——重构/架构类需求按需加载平台约束/规范类资产

- **背景**：重构、架构调整、技术债清理等技术层面需求（非产品策划）中，designer 仅靠读代码难以把握平台技术边界（类型限制/性能/安全规范），任务拆分与验收标准可能脱离平台实际；但若全套加载 coder 编码工具（minimal-code/security/debug-loop 等）又会导致角色越权侵入编码职责
- **方案**：`ai-team-role-designer` 新增「步骤 1-A：技术层面需求识别」——以判定表识别重构/架构/性能优化/既有代码调整等技术层面信号；命中时仅加载命名含 `coding-rules`/`performance`/`security` 的**约束/规范类**特化 skill（如 `ai-team-pt-hm-arkts-coding-rules` 等），吸收约束章节理解技术边界，并将关键约束写入 `designer-report.md` 下游建议供 coder 参考；[门禁] 禁止加载执行类工具（minimal-code/security/debug-loop/ui-ux/build/template/平台 coder 特化等）；默认行为：无法判断按非技术层面处理跳过本节
- **改动文件**：`ai-team-role-designer/SKILL.md`

### 6. 新增「流程运行模式」——全自动 vs 手动确认，覆盖上下游角色接力流程

- **背景**：标准/完整模式存在 designer → coder → tester → reviewer 等上下游角色接力，默认所有角色完成即接力，用户无法在每步成果产出后把关；缺少「每步完成需用户确认」的选项
- **方案**：
  - **PM**：新增「阶段 0.1-A 流程运行模式确认」——复杂度判定为标准/完整、创建团队前用 `ask_followup_question` 询问用户运行模式：`全自动`（上游完成后直接接力）或 `手动确认`（每步完成需用户确认完成度后再继续）；轻量模式改动小无接力，默认全自动无需询问
  - **模式传播**：designer（1.1）/coder（2.1）/tester（3）/reviewer（4）的 spawn prompt 均增加 `模式: {模式}` 参数；轻量模式 coder 固定传 `全自动`
  - **门禁联动**：阶段 0.1-A 门禁「模式必须在创建团队前确认并随 spawn prompt 传播」；标准协同流程图补充模式询问节点
  - **全局约束**：`ai-team-tool-global-rule` 新增「三-A、完成通知模式」规则，所有角色继承——`手动确认`下角色完成自评达标后先 `ask_followup_question` 向用户展示成果/完成度，用户确认后才 `send_message` 通知 PM；`全自动`或模式未传入时默认直接通知 PM
- **改动文件**：`ai-team-dev/SKILL.md`、`ai-team-tool-global-rule/SKILL.md`

### 5. report 工具改为「产出文档时才显式加载」——消除开发阶段提前加载

- **问题**：4 个角色 skill（designer/coder/tester/reviewer）的产出文档步骤均写「**遵循** `ai-team-tool-report` 规范」——无显式 `use_skill` 加载指令、无加载时机标注。模糊表述导致 AI 可能在开发/测试/审查开始阶段就提前加载 report（文档沉淀规范，占 context 但对编码无帮助），实战中 coder 即在编码前并行加载了 report
- **方案**：4 个角色 skill 的产出文档步骤统一改为「产出文档前显式加载 `use_skill ai-team-tool-report`（统一元信息模板 + 写入路径）。**仅本步骤加载**，{前置阶段}不加载」——被动「遵循」改主动加载 + 明确时机
- **改动文件**：`ai-team-role-designer/SKILL.md`、`ai-team-role-coder/SKILL.md`、`ai-team-role-tester/SKILL.md`、`ai-team-role-reviewer/SKILL.md`

### 4. PM 不再中转需求确认——需求疑问由 designer/coder 等角色直接问用户

- **背景**：实战中 designer 将方案分叉（如「三层架构不适用，是否改去重」）经 `send_message` 上报 PM，PM 再 `ask_followup_question` 转问用户，多一层中转；而 designer 掌握更多模块信息、本可直接裁定或提问。且 designer 的「请求用户介入」协议残留「上报 PM → PM 问用户」中间层，与 coder 已有的「需求疑问直接问用户」不一致
- **方案**：
  - `ai-team-role-designer`：「跨角色沟通协议 → 请求用户介入」改为「需求疑问直接问用户」——designer 直接 `ask_followup_question` 问用户，确认后自行更新 `designer-report.md`，不绕 PM
  - `ai-team-dev`（PM）：概述职责第 6 条「用户沟通中枢」改为「冲突兜底」；门禁新增「PM 不做需求确认/方案裁决」；置信度表 <85% 措辞由「向用户提问辅助」改为「由 designer 自行追问」；「用户兜底机制」改名为「冲突兜底机制」并明确仅限角色间冲突场景
- **改动文件**：`ai-team-dev/SKILL.md`、`ai-team-role-designer/SKILL.md`

### 3. PM 调度职责再收窄——子目标拆解归 designer、PM 不读角色报告全文

- **背景**：与通用内核同步——PM 参与拆解子目标需理解需求细节（读报告/代码），违背「PM 只调度」；PM 读取角色报告全文 token 成本高，产出角色置信度自评循环 + 下游发现问题自行沟通已能保证质量
- **方案**：
  - **子目标拆解归 designer**：概述职责第 2 条扩为「深入研究需求（含平台识别）+ 拆解子目标」（`ai-team-role-designer` 已有任务拆分逻辑，无需新增）
  - **PM 不读角色报告全文**：门禁明确「不读取 designer-report 等产出文档全文，仅依据完成信号（平台/置信度/产出路径/摘要/任务拆分）调度」；1.2 门禁检查与 coder/tester/reviewer spawn prompt 的 platform 来源统一改为「从 designer 完成信号提取」
- **改动文件**：`ai-team-dev/SKILL.md`

### 2. 开发领域入口强化「PM 只做调度」——所有复杂度模式固定先 designer 深入研究需求

- **背景**：与通用内核同步——重构类任务中 PM 自行通读方法论文档与模块代码调研需求，与「PM 只调度」定位冲突；原轻量/标准模式跳过 designer 直接传原始需求给 coder，导致需求研究落在 PM 或 coder 身上
- **方案**：
  - **PM 禁止自行调研与编码**：概述新增 [门禁]，PM 不读取需求相关代码/文档（仅限 `domain-map.md`/`platform-map.md` 路由元数据与角色产出文档），需求研究一律由 designer-agent 完成
  - **所有模式固定先 designer**：复杂度路由决策表、标准/轻量模式特殊规则、标准协同流程图、阶段 1 全部改为固定 spawn designer-agent 深入研究需求（含平台识别）；PM 复杂度判定仅依据用户原始需求描述字面信息，不读取业务代码
  - **下游角色统一读 designer-report**：coder/tester/reviewer spawn prompt 的 platform 与需求统一从 `designer-report.md` 读取，删除「PM 识别 platform」「传用户原始需求」路径
  - **designer 职责升级**：`ai-team-role-designer` 新增「深入研究需求」职责——可读取项目代码/文档/参考模块，梳理现状、存量逻辑、外部契约与重构边界（用户提到参考文档/方法论文档/参考模块时**必须**读取后吸收进需求文档）
- **改动文件**：`ai-team-dev/SKILL.md`、`ai-team-role-designer/SKILL.md`

### 1. coder 新增「技术冲突先问用户」门禁——重构遇架构与第三方组件不适配须先确认

- **问题**：重构时用户要求的新架构/框架/模板与第三方组件或既有依赖不适配时，coder 易自行选择方案并直接改造第三方组件，而非先向用户确认；现有「强制歧义处理」偏需求侧歧义，未点名技术冲突的方案取舍场景
- **方案**：coder「第四步：编码执行」新增 `[门禁] 技术冲突先问用户` 小节——新架构/框架/模板与第三方组件不适配，或需在多个技术方案（改造第三方 / 绕过 / 降级 / 换方案）间取舍时，`ask_followup_question` 列出方案及利弊等确认后再动手；方案需改动第三方组件内部实现或非需求内基础模块时先确认不直接改造；用户说"随便/你定"不算确认，须给推荐方案与理由再次追问
- **改动文件**：`ai-team-role-coder/SKILL.md`

## 2026-08-18

### 1. 体系换位重命名——开发领域由 ai-team 更名为 ai-team-dev

- **背景**：通用内核（原 ai-team-core）占据 `ai-team` 总入口名，开发领域入口 `ai-team` 需降级为领域插件以消除命名歧义
- **方案**：开发领域入口 skill 由 `ai-team` 更名为 `ai-team-dev`：
  - 目录 `ai-team/` → `ai-team-dev/`
  - `platform-map.md` 运行时路径、各 `ai-team-role-*` 的映射表引用同步更新为 `ai-team-dev/`
  - 产出物目录 `docs/ai-team/` → `docs/ai-team-dev/`，team_name 前缀 `ai-team-{ts}` → `ai-team-dev-{ts}`
  - 子 skill 调用方描述精简（移除「由 ai-team（PM）spawn」等描述）
- **改动文件**：`ai-team-dev/`（原 ai-team 全套）、4 个 `ai-team-role-*`、`ai-team-tool-report/global-rule/web-read/auto-tune`、`ai-team-pt-hm-project-init`

## 2026-08-13

### 3. 模板请求写法对齐项目实际——request 改装饰器风格 + standard 补充请求/类型暴露说明

- **问题**：`ai-team-pt-hm-template-request` 模板基于 `@baby/httpbiz` 的 `HttpRequest` 基类 + 静态 `fetchData`，与 KindergartenShell 项目实际（`ShellPayRequest.ets` 等）的 `@baby/http` 装饰器风格（`@Http` 类 + `@Post` 方法 + `@Key` 参数 + `export const XxxRequest = new Request()`、一个类聚合多接口）完全不同，按旧模板生成会产出不可用代码
- **方案**：
  - `request` 模板改为**主模板 `@baby/http` 装饰器风格**（聚合多接口 + 实例导出），保留 `@baby/httpbiz` 基类写法为**备选分支**，并新增「优先复用项目已有请求文件风格」的判定
  - `standard` 模板补充 **datasources 请求文件规范**（聚合多接口、实例导出、类型放置）
- **改动文件**：`ai-team-pt-hm-template-request/SKILL.md`、`ai-team-pt-hm-template-standard/SKILL.md`

### 2. 借鉴 agency-agents 增强 reviewer——反馈分级 + 可靠性/可观测性审查

- **问题**：reviewer 的代码质量审查缺少问题分级（所有问题同等对待），反馈模板无「为什么+建议」，领域审查维度不足（参考 agency-agents code-reviewer / multi-agent-systems-architect）
- **方案**：
  - 「第四步：问题处理」新增**问题分级与反馈模板**——🔴 blocker（正确性/安全/数据丢失，阻塞交付）/ 🟡 suggestion（校验/命名/逻辑，应修复）/ 💭 nit（风格/文档，不阻塞）；每条反馈遵循「为什么 + 建议」格式（位置/问题/为什么/建议）
  - 「第三步：代码质量审查」新增**「可靠性 & 可观测性审查」**——错误处理覆盖、降级路径、重试/幂等、结构化日志（借鉴 multi-agent-systems-architect 失败模式工程）；纯展示型改动可跳过
  - 「主观补充（40 分）」动态维度示例细化：架构合规性、安全审查深度、可靠性/失败模式、可观测性、性能、可维护性、跨平台兼容性
- **改动文件**：`ai-team-role-reviewer/SKILL.md`

### 1. 借鉴 agency-agents 增强 coder——主观补充维度细化

- **问题**：coder 主观补充维度示例过粗（参考 agency-agents frontend-developer 的性能/可访问性维度）
- **方案**：「主观补充（40 分）」动态维度示例细化：性能（Core Web Vitals）、可访问性、可靠性/失败模式、可观测性、架构合规性、安全、跨模块影响
- **改动文件**：`ai-team-role-coder/SKILL.md`

## 2026-08-12

### 3. DevEco 路径探测——分平台完整路径（还原完整路径 + 新增 Windows）

- **问题**：`ai-team-pt-hm-build` / `ai-team-pt-hm-project-init` / `ai-team-pt-hm-project-package-init` 原硬编码 macOS 完整路径；上一轮改为 `<dev_eco_root>` 动态前缀 + 统一后缀，但经实测调研确认该方案不成立
- **调研结论**：macOS 根为 `.app` bundle（有 `Contents/` 层）、Windows 无该层；node 位置 macOS 为 `tools/node/bin/node`、Windows 为 `tools/node/node.exe`（无 bin 层 + `.exe` 后缀）；ohpm 为 `ohpm` vs `ohpm.bat`。后缀路径随平台不同，仅替换根前缀无法生效
- **方案**：还原为**分平台完整路径**写法，每项组件（node / hvigorw.js / SDK / devecostudio / ohpm）独立列出 macOS 与 Windows 完整路径候选，用 `[ -f ]` / `[ -d ]` 逐个探测，命中即用；全部失败则 `ask_followup_question` 让用户提供完整路径；`project-init` 的 devecostudio 命令标注仅 macOS 可用并补充 Windows 手动打开说明
- **改动文件**：`ai-team-pt-hm-build/SKILL.md`、`ai-team-pt-hm-project-init/SKILL.md`、`ai-team-pt-hm-project-package-init/SKILL.md`

### 2. tester 措辞对齐——明确「测试自身问题自己修、产品缺陷反馈 coder」

- **问题**：通用 tester 工作流「测试失败则自动修复代码」易被误解为修改产品代码，与跨角色协议「产品缺陷 → 反馈 coder-agent」冲突
- **方案**：通用 tester 与 pt-hm-tester 的失败处理步骤均改为先区分归属——测试自身问题（断言/导入/用例错误）自行修复测试，产品代码缺陷向 coder-agent 反馈、不自行修改产品代码
- **改动文件**：`ai-team-role-tester/SKILL.md`、`ai-team-pt-hm-tester/SKILL.md`

### 1. 修复 coder 残留死步骤——移除「通知 PM 同步 designer-agent」

- **问题**：coder 需求澄清后仍要求 `send_message` PM"请同步 designer-agent"，但 PM 中转机制与 designer 响应机制已于 2026-07-15/16 迭代删除，PM 收到消息后无动作可做
- **方案**：移除 coder 第二步的「通知 PM 同步」步骤，明确「designer-report.md 为全团队唯一事实源，下游直接读取最新文档」；`global-rule` 强制歧义处理第 4 条同步移除「通知 PM 同步全团队」
- **改动文件**：`ai-team-role-coder/SKILL.md`、`ai-team-tool-global-rule/SKILL.md`

## 2026-08-10

### 1. 复杂需求任务拆分 + coder 阶段式开发（PM 不改）

- **问题**：完整模式复杂需求一股脑塞给单个 coder，单会话 context 大、产出易漂移；且无法按依赖顺序组织开发
- **方案**：为「完整模式」增加任务拆分与阶段式开发能力，**PM 编排入口零改动**：
  - **Designer**：新增「第一步-A 任务拆分判定」+「第一步-B 任务清单产出 + 用户确认」——功能点 > 3 / ≥ 3 页面或跨层 / 明显前置后置依赖 / context 溢出风险时才拆；宁粗勿细（默认 2-5 个任务）；需求文档新增 `## 任务清单` 表格（任务ID/名称/范围/前置依赖/验收标准）；产出后 `ask_followup_question` 让用户确认任务划分
  - **Coder**：新增「第一步-B 阶段式开发模式」——识别任务清单后逐个串行开发（不并行，防公共代码抢占）；每任务编译验证 + 产出 `coder-report-task-{N}.md` + `ask_followup_question` 向用户汇报，确认"继续"才进入下一任务；全部完成后产出**汇总 `coder-report.md`**（下游校验依赖），一次性通知 PM
  - **Tester/Reviewer**：识别任务清单，测试/验收范围 = 全部任务；输入校验适配多任务报告；报告元信息标注覆盖任务范围
  - **Report**：产出物清单补充 `## 任务清单` 章节格式与 `coder-report-task-{N}.md` 命名约定
- **关键兼容设计**：PM 阶段 3/4 固定读 `coder-report.md`，多任务下 coder 产出汇总报告保障校验通过——PM 无需感知任务拆分
- **向后兼容**：无 `## 任务清单`（单任务）时 coder/tester/reviewer 完全走原流程
- **改动文件**：`ai-team-role-designer/SKILL.md`、`ai-team-role-coder/SKILL.md`、`ai-team-role-tester/SKILL.md`、`ai-team-role-reviewer/SKILL.md`、`ai-team-tool-report/SKILL.md`、`ai-team/README.md`、`ai-team/CHANGELOG.md`

## 2026-08-07

### 1. 合并 Ponytail 极简编码哲学 — 新增 ai-team-tool-minimal-code

- **问题**：coder 第四步「通用编码规则」仅 4 条笼统规则（实现功能点/结构清晰/边界处理/语法校验），缺乏"怎么写代码"的风格约束（最少代码、复用优先、避免过度设计），导致 AI 倾向过度构建
- **方案**：新建 `ai-team-tool-minimal-code` 工具 skill（跨平台通用），承载：
  - 懒惰阶梯 7 级：YAGNI → 复用现有 → 标准库 → 平台原生 → 已装依赖 → 一行 → 最小可行（先理解再极简）
  - `[门禁]` 根因修复：修复前 grep 所有调用方，一处修复而非每个调用点打补丁
  - `[门禁]` 不精简清单：校验/安全/可访问性/用户明确要求永不裁剪
  - `minimal:` 债务注释约定（命名上限与升级路径）
  - 过度设计审查标签：delete / stdlib / native / yagni / shrink + `net: -N lines`
  - 边界声明：只管代码层，流程/文档/对话层归 global-rule，根因定位流程归 debug-loop
- **Coder 改动**：第四步「通用编码规则」新增第 5 条加载 minimal-code；第零步-A Bug 修复模式补充"修复前 grep 所有调用方（根因修复）"
- **Reviewer 改动**：第三步「代码质量审查」新增「过度设计审查」章节，复用 minimal-code 的 5 标签逐项检查
- **清单同步**：`ai-team/SKILL.md` 全局约束、`README.md` 通用工具表 + Skill 全清单、`SHARE.md` Skill 体系概览新增 minimal-code 条目
- **不合并**：ponytail-gain/ponytail-help（纯品牌展示）、lite/full/ultra 强度分级（保留"默认执行完整阶梯"为软建议）
- **改动文件**：`ai-team-tool-minimal-code/SKILL.md`（新增）、`ai-team-role-coder/SKILL.md`、`ai-team-role-reviewer/SKILL.md`、`ai-team/SKILL.md`、`ai-team/README.md`、`ai-team/SHARE.md`

## 2026-07-23

### 8. PM 添加 allowed-tools 工具白名单

- PM 追加 `allowed-tools: Read, Glob, Grep, Agent, TeamCreate, SendMessage, AskUserQuestion`，硬限制无 Write/Edit/Bash（落实「PM 不编码」门禁）；4 角色不限制（保持灵活性）
- 改动文件：`ai-team/SKILL.md`

### 7. PM 硬约束：禁止本人编码 + 锚定用户预期

- **问题**：实战中发现 PM 在「轻量」路由下会跳过 `team_create` + `spawn coder-agent`，直接调用 `write_to_file` 写代码，违背「PM 仅做调度」原则。根因：用户表达"我想要你实现"时，PM 将用户口中的「你」理解为直接执行者（而非调度者），效率本能压过了角色纪律
- **方案**：
  - **Skill 侧**：概述新增 `[门禁] PM 本人不编写代码`——无论用户如何表达，PM 不调用编码工具，实现一律分派 coder-agent
  - **交互侧**：阶段 0.1 新增 `[门禁]`——PM 判定复杂度后必须明确告知用户"我将创建开发团队来处理"，锚定用户预期
- **改动文件**：`ai-team/SKILL.md`

### 6. 主观补充评分增加 AI 动态维度

- **问题**：4 个角色（designer/coder/tester/reviewer）的「主观补充（40 分）」均为预设固定维度表（15+15+10），等同于第二张检查清单，违背"主观"本意——AI 没有自主评估空间
- **方案**：每个角色的主观补充表前新增一行 `**AI 应酌情判断本次任务是否需要新增额外评估维度**`，并给出该角色场景下的动态维度示例；总分 40 分在预设维度与动态新增维度间按需分配
- **改动文件**：`ai-team-role-designer/SKILL.md`、`ai-team-role-coder/SKILL.md`、`ai-team-role-tester/SKILL.md`、`ai-team-role-reviewer/SKILL.md`

### 5. 遗漏技能补全：hm-project-module-init / hm-project-package-init 迁移到 ai-team-pt-hm- 体系

- **问题**：`hm-project-module-init`（HAR/HSP 模块创建）和 `hm-project-package-init`（OHPM 包预装）未纳入 ai-team-pt-hm- 命名体系，`ai-team-pt-hm-coder` 无模块创建流程，`ai-team-pt-hm-project-init` 仍引用旧名 `hm-project-package-init`
- **方案**：
  - 新增 `ai-team-pt-hm-project-module-init/SKILL.md`、`ai-team-pt-hm-project-package-init/SKILL.md`
  - `ai-team-pt-hm-coder` 覆盖范围表 + 正文新增「新模块初始化」章节，门禁触发加载 `ai-team-pt-hm-project-module-init`
  - `ai-team-pt-hm-project-init` 第 202 行引用修正：`hm-project-package-init` → `ai-team-pt-hm-project-package-init`
- **改动文件**：`ai-team-pt-hm-project-module-init/SKILL.md`（新增）、`ai-team-pt-hm-project-package-init/SKILL.md`（新增）、`ai-team-pt-hm-coder/SKILL.md`、`ai-team-pt-hm-project-init/SKILL.md`

### 4. 实战 Bug 修复 + 体验优化

- **Bug: SVG 图片不下载**：`extract.mjs` 的图片扩展名正则缺少 `svg`，导致 Axure 原型中的 SVG 设计图被跳过（实际保存了 SVG 但后缀写成 `.png`）。已修复为 `(png|jpg|jpeg|gif|webp|svg)`
- **Bug: 图片下载静默失败**：`catch(e) { /* skip */ }` 不输出任何信息，图片全部失败也无法发现。改为 `console.warn('[img-skip]' / '[img-fail]')` 输出状态码和文件路径
- **优化: 避免重复 cp**：SKILL 步骤 2.2 改为 `[ -f /tmp/run-extract.mjs ] || cp ...`，脚本未变更时跳过复制
- **优化: Cookie 重新执行命令修正**：登录处理表中 `node extract.mjs` → `cd /tmp && node run-extract.mjs`
- **优化: 临时文件清理**：步骤 3 产出后增加 `rm -f /tmp/run-extract.mjs /tmp/web-read-result.json`
- **改动文件**：`ai-team-tool-web-read/extract.mjs`、`ai-team-tool-web-read/SKILL.md`

### 3. 提取脚本沉淀为独立文件 + 运行方式优化

- **问题**：脚本内嵌在 SKILL.md 中，每次执行需 AI 复制模板、替换变量再写入 `/tmp`，冗余且易出错。独立 `.mjs` 文件运行又遇到 ESM 模块路径问题（playwright 在 `/tmp/node_modules`，skill 目录下不可解析）
- **方案**：
  - 提取脚本沉淀为 `ai-team-tool-web-read/extract.mjs`（独立维护，不随 SKILL.md 膨胀）
  - 运行时 `cp extract.mjs /tmp/run-extract.mjs && cd /tmp && node run-extract.mjs <url> <outputDir> [cookieFile]`
  - 命令行参数传参，无需模板替换
  - 单次 `execute_command` 完成全部提取（环境检测 + 页面类型检测 + Axure 四层降级 + 图片下载 + JSON 输出）
- **改动文件**：`ai-team-tool-web-read/extract.mjs`（新增）、`ai-team-tool-web-read/SKILL.md`（精简，移除内嵌脚本）

### 2. 工具实战优化 — 合并为单脚本 + 补充 Axure 降级策略

- **问题**：首次实战测试（ux2.baby-bus.com Axure 原型）时，执行了 6 次 `execute_command` 才完成提取，效率低。根因：步骤分离过细 + Axure 页面文件名与显示名不同（斜杠→下划线）
- **方案**：
  - 重构步骤 2-5 为「步骤 2 一次性提取」「步骤 3 Markdown 转换+产出」两个步骤
  - 步骤 2 脚本内置页面类型检测（Axure vs 普通），单次运行完成所有提取
  - 新增 Axure 文件名三层降级：`encodeURIComponent(pagename).html` → `pagename.replace('/', '_').html` → 从 `data/document.js` 解析真实文件名 → Axure player
  - 新增已知内网域名跳过 web_fetch 直走 Playwright（ux2.baby-bus.com、172.x/192.168.x/10.x）
- **改动文件**：`ai-team-tool-web-read/SKILL.md`

### 1. 新增网页需求文档读取工具（ai-team-tool-web-read）

- **问题**：用户在需求沟通中提供网页 URL（如内网需求文档）时，designer 无法直接读取，内网地址还需 VPN 才能访问
- **方案**：新增 `ai-team-tool-web-read` 工具 skill，实现网页内容读取 + Markdown 转换 + 图片本地化：
  - 读取策略：先尝试 `web_fetch`（公开 URL），失败后降级 Playwright headless 浏览器（内网/VPN 地址）
  - Playwright 安装：使用 npmmirror 镜像 `PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/ npx playwright install chromium`
  - 登录检测：检测到登录页 → `ask_followup_question` 让用户粘贴 Cookie / 手动截图 / 跳过
  - 内容转换：HTML → Markdown，保留标题/列表/表格结构，图片下载到 `web-req-assets/` 替换为本地路径
  - 产出文档：`docs/ai-team/web-req-report.md` + `docs/ai-team/web-req-assets/`
- **Designer 改动**：`ai-team-role-designer/SKILL.md` 新增「步骤 0-A：网页需求文档读取」——用户消息含 URL 时自动调用工具，读取结果作为需求上下文
- **Report 改动**：`ai-team-tool-report/SKILL.md` 产出物清单新增 web-req-report.md
- **改动文件**：`ai-team-tool-web-read/SKILL.md`（新增）、`ai-team-role-designer/SKILL.md`、`ai-team-tool-report/SKILL.md`

## 2026-07-21

### 1. 新增 Bug 修复协作调试循环（ai-team-tool-debug-loop）

- **问题**：Bug 修复场景下，AI 无法自行运行应用复现 bug，根因追踪困难。原有流程将 bug 修复简单归入「轻量模式」直接编码，缺少运行时数据收集环节
- **方案**：新增 `ai-team-tool-debug-loop` 工具 skill，实现 AI-用户协作调试循环：
  - AI 分析代码 → 添加诊断日志 → `ask_followup_question` 指导用户复现操作 → 用户点击「我已操作完成」/「无法复现」/「自定义描述bug现象」→ AI 读取日志文件 + 用户描述 → 诊断根因 → 修复 → 清理日志
  - 最多 3 轮迭代，超过则向 PM 报告请求用户介入
  - 平台日志读取参考表（harmony hilog / web console / node 日志文件）
- **Coder 改动**：`ai-team-role-coder/SKILL.md` 新增「第零步-A：Bug 修复模式」——coder 自行检测 bug-fix 场景（关键词触发），评估根因清晰度决定直接修复或加载 `ai-team-tool-debug-loop`，修复后跳至编译验证；更新「响应测试反馈」——测试发现缺陷且根因不明时也可加载 debug-loop
- **PM 无改动**：bug-fix 模式判定由 coder 自行完成，PM 不感知、不传 `mode` 参数
- **改动文件**：`ai-team-tool-debug-loop/SKILL.md`（新增）、`ai-team-role-coder/SKILL.md`

## 2026-07-20

### 5. `ai-team-pt-hm-project-init` — 方式 A 重构为「临时创建 → 移入」方案

- **问题（第一轮）**：ai-team 流程中 designer 先产出 `docs/ai-team/designer-report.md` 写入 workspace，导致 coder 执行项目初始化时 workspace 非空，无法走方式 A（workspace = 项目根），只能走方式 B 创建到子目录。造成项目根与 workspace 分离，MCP LSP 路径错位
- **问题（第二轮优化）**：初版用 `mktemp -d`（`/tmp/` 外部路径），后续 `mv` 从外部路径向 workspace 写入文件会触发 CodeBuddy 安全拦截，每个移动操作都需用户点「运行」，体验差
- **方案**：
  - 临时目录改为 workspace 内部 `.temp-project-init/`，所有后续操作（`mv`、`rm`、冲突检测）均为 workspace 内部操作，不触发外部文件注入警告
  - 明确标注 `requires_approval`：仅步骤 1（`npx` 执行外部 CLI）需用户点一次「运行」；步骤 2-4（冲突检测、移入、清理）均 `requires_approval: false`
  - 冲突检测排除列表新增 `.temp-project-init/`；冲突 > 3 个时一轮显示全部并支持按文件选择或批量应用
  - 检测规则更新：workspace 仅有 `.codebuddy/` 和/或 `docs/` 时也走方式 A
  - 方式 B 「由AI清理工作区后创建」选项扩展为清理非 `.codebuddy/` 和 `docs/` 的內容后转方式 A
- **改动文件**：`ai-team-pt-hm-project-init/SKILL.md`

### 4. `ai-team-tool-global-rule` — 选项按钮新增格式限制

- **问题**：`ask_followup_question` 的 `options` 使用 `{label, description}` 对象格式时（嵌套引号 JSON），作为字符串传参频繁解析失败（连续 3 次），导致问题无法展示给用户；而纯字符串数组格式每次都成功
- **方案**：在「选项按钮设计规范」第 7 条新增 `options` 格式限制——**只用纯字符串数组**，禁止 `{label, description}` 对象格式。补充说明用括号拼在选项文本内
- **改动文件**：`ai-team-tool-global-rule/SKILL.md`

### 3. `ai-team-pt-hm-project-init` — 工作区非空时先确认再创建

- **问题**：工作区非空时直接走方式 B（在父目录创建），未告知用户会换目录。用户已选择当前工作区，项目却创建到外部，需手动切换
- **方案**：工作区非空时增加 [门禁] — 先 `ask_followup_question` 让用户三选一：创建在工作区内（子目录）/ 创建在父目录 / 清理工作区后创建。确认后再执行
- **改动文件**：`ai-team-pt-hm-project-init/SKILL.md`

### 2. hdc hilog 命令优化：修正阻塞模式导致卡死（二次修正）

- **问题**：
  - 原始命令 `hdc hilog -t 5 | grep ...` 卡死。第一轮误判 `-t` 为 tag 过滤，改为 `-L 2`，但实测仍卡
  - **真正根因**：`hdc hilog` 默认是**阻塞模式**，会一直等待新日志输出，永远不会自动退出，导致 Agent 执行卡住。用户点击「继续」发送中断信号才恢复
  - 附因：`-L` 是 level 过滤（`-L E` = ERROR），不是「最近 N 分钟」
- **方案**：`hdc shell "hilog -z 500 -L E" 2>&1`
  - `-z 500` 只取最后 500 行，从源头限流
  - `-L E` 设备端按级别过滤 ERROR（含 FATAL），无需 grep
  - 无需 `head -20`：数据量已极小（最多 500 行且仅 ERROR）
- **改动文件**：
  - `ai-team-pt-hm-reviewer/SKILL.md` — 启动后验证 hilog 命令（二次修正）

### 1. 修复 PM 未纯调度问题——新项目初始化下沉到平台特化 skill

- **问题**：PM 在新项目初始化时直接加载 `ai-team-pt-hm-project-init` 并执行 `npx create`、改 SDK 版本、签名交互等操作，越界做了执行层，违背「PM 仅做调度和门禁」原则。且 HarmonyOS 与其他平台行为不一致（"PM 直接初始化" vs "开发 Agent 自行处理"）
- **方案**：初始化逻辑完全从 PM 和通用 coder 剥离，下沉到平台特化 skill 内部。PM 只传 platform + 需求文档；通用 coder 不感知初始化；平台特化 skill 加载后自行检查需求文档中的「需求类型」字段，是新项目则自动完成初始化，再进入技术选型
- **改动文件**：
  - `ai-team/SKILL.md` — 角色映射表去掉 coder「新项目初始化」职责；流程图去掉「新项目标志」和「新项目初始化」；spawn prompt 去掉 `项目类型: 新项目`；「新项目初始化」章节简化为一行说明
  - `ai-team-role-coder/SKILL.md` — 角色定位去掉初始化职责；删除「第零步-A：新项目初始化」整节
  - `ai-team-pt-hm-coder/SKILL.md` — 覆盖范围表新增「新项目初始化」；新增初始化章节，先于技术选型，自动识别需求文档「需求类型」字段

## 2026-07-16

### 3. 新增需求复杂度路由机制（轻量/标准/完整三档）

- **问题**：原有流程只有两档（全流程 / Bug修复跳过需求），粒度太粗。简单需求（改文案、调样式、小 bug）仍然走 designer → coder → tester → reviewer 全流程，过重
- **方案**：PM 在阶段 0 之前新增「需求复杂度评估」门禁，将需求路由到三档：
  - **轻量**：改文案/调样式/小 bug/改配置值 → PM → coder → (按需) tester。跳过 designer 和 reviewer，coder 不写 coder-report.md
  - **标准**：功能修改/局部重构/新增小组件 → coder → tester → (按需) reviewer。跳过 designer，coder 直接读用户原始需求
  - **完整**：新项目/新模块/新页面/需求模糊 → designer → coder → tester → reviewer。全流程
- **判定信号**：改动范围、需求歧义、涉及架构、测试必要性四个维度，取多数匹配等级，冲突取较高复杂度
- **默认行为**：无法判断时默认「标准」；PM 判定后告知用户路由结果，用户可覆盖
- **改动文件**：`ai-team/SKILL.md`
  - 概述职责新增「复杂度评估」+「按需创建角色」
  - 新增「需求复杂度评估（流程入口）」章节：判定信号表 + 路由决策表 + 轻量/标准模式特殊规则
  - 标准协同流程图拆分为完整/标准/轻量三段
  - 阶段 0 重构为「初始化 + 复杂度路由」，产出物目录按模式按需创建
  - 阶段 1 标注「仅完整模式」
  - 阶段 2 开发 spawn prompt 按三种模式分别给出
  - 阶段 3 测试标注「按需」，说明各模式触发条件
  - 阶段 4 审查标注「按需」，标准模式由 PM 判断是否触发
  - 阶段 5 收尾标注轻量模式简化处理
  - 移除旧「流程精简规则」（已被路由决策表取代），保留新项目初始化说明
  - description 核心特性新增「复杂度路由」

### 4. 清理 PM 冗余职责——产出物目录和文档同步交还各角色

- **问题**：PM SKILL.md 中存在各角色已自行处理的冗余内容，违背「轻量 PM 原则」
- **清理项**：
  - 移除阶段 0.3「创建产出物目录」——各角色在写报告时自行 `mkdir -p`（`ai-team-tool-report` 规范已定义）
  - 移除「需求文档更新同步」整节——designer skill 已明确"不响应下游澄清"，PM 中转转发无意义
  - 移除阶段 2.2 中「PM 转发给 designer-agent 备案」——同上
  - 移除全局配置中 `artifact_dir`——各角色配置中已有各自的 `artifact_path`，PM 不用
  - 角色映射表移除产出物文件名细节——PM 只需知道 skill 名，产出物由角色自行管理
  - 角色映射表移除「平台特化 skill 列表见 platform-map.md」提示——各角色自行查表，PM 不感知

### 2. 全局约束升级 + 流程机制优化（借鉴主流 AI Agent 设计规范）

**借鉴来源**：Claude Code（Anthropic）指令路由体系、Apple Siri AI 三层 Agent 架构、OpenAI Agents SDK 编排模式

- **`ai-team-tool-global-rule` 全面升级**（从 53 行扩展到 ~120 行）：
  - 新增「指令权威分层」：[门禁] 硬约束（编译/LSP/文档路径/置信度）与软建议（编码风格/测试用例数）分离
  - 新增「强制歧义处理」：禁止猜测，用户说"随便/你定/都行"不算确认，用具体选项重新追问
  - 新增「工具优先于知识」：先读文档再执行，不凭经验判断
  - 新增「异常处理标准化」：四级处理策略（自动修复/告知用户/降级继续/阻塞报告），严禁捏造结果
  - 保留原有：选项按钮设计规范、Token 优化原则、产出物文档精简规范
- **`ai-team-tool-global-rule` 移除「上下文预算管理」**：该内容属于 skill 编写设计规范（已记录在记忆体），不应出现在运行时全局约束中
- **PM SKILL.md spawn prompt 精简**：4 个角色的 spawn prompt 从多行模板精简为单行 `use_skill {skill名} | key=value` 格式，减少上下文消耗
- **PM SKILL.md 新增编排模式说明**：标注采用 Manager（集中式编排）模式，与 Handoff（去中心化）模式对比
- **各通用角色新增 [门禁] 输入校验 Guardrail**（借鉴 OpenAI Agents SDK）：
  - coder 第一步后校验 `platform` 字段、需求类型、需求描述是否存在
  - tester 第一步后校验需求文档和技术方案是否存在
  - reviewer 第一步后校验三个前置产出物是否齐全
- **4 个通用角色全局约束引用更新**：分别补充强制歧义处理、工具优先于知识、异常处理标准化等
- **README.md + AI_TEAM_SHARE.md 全面重写**：去掉"借鉴"措辞，改为「设计理念」章节统一说明思想来源与体现（同 XXX 理念一致）；README 聚焦架构设计，SHARE 聚焦使用场景；精简重复内容，全局约束速览表嵌入核心机制章节
- **创建记忆体**：Skill 编写通用规范（4 条，不含体系特定内容）

### 1. 修复 ai-team-pt-hm-reviewer 步骤号不一致 + 残留旧文件名 + platform-map 同步提示

- **问题 1**：`ai-team-pt-hm-coder` 第 43 行残留旧文件名 `tech-design.md`，应统一为 `coder-report.md`
- **问题 2**：`ai-team-pt-hm-reviewer` 覆盖范围表及正文中步骤号与通用 reviewer 不一致——引用了不存在的「第四步：签名检查」「第六步：启动后验证」「第七步：设备错误处理」「第九步：产出交付报告」
- **修复**：
  - `ai-team-pt-hm-coder`：`tech-design.md` → `coder-report.md`
  - `ai-team-pt-hm-reviewer` 覆盖范围表对齐通用 reviewer 步骤：第二步编译 → 第三步质量审查 → 第四步问题处理（含签名检查）→ 第五步启动验证（含 hdc 启动 + hilog + 设备错误码）→ 第七步产出交付报告
  - `ai-team-pt-hm-reviewer` 正文 5 处步骤引用同步修正
- **建议改进**：`ai-team/platform-map.md` 新增平台章节补充同步提示——新增平台时必须同步更新 `ai-team-role-designer` 的平台关键词识别表

## 2026-07-15

### 2. 优化跨角色沟通：下游角色直接向用户澄清需求

- **问题**：coder 有需求疑问时需 send_message → designer → 等待回复，链路长效率低
- **方案**：
  - designer 职责收窄为「仅负责初始需求收集」，不响应下游答疑
  - coder/tester/reviewer 有需求疑问时，直接 `ask_followup_question` 向用户确认
  - 确认后自行更新 `designer-report.md`，通知 PM 同步全团队
  - PM 收到通知后转发给 designer 备案
- **改动文件**：
  - `ai-team-role-coder/SKILL.md` — 第二步改为直接问用户 + 自行更新需求文档 + 通知 PM
  - `ai-team-role-designer/SKILL.md` — 删除「响应下游澄清」，角色定位收窄
  - `ai-team/SKILL.md` — spawn prompt 更新，新增「需求文档更新同步」机制

### 1. 重大重构：ai-team 通用化 + 鸿蒙平台剥离

**目标**：ai-team 从「鸿蒙专用」重构为「通用代码开发流程」，鸿蒙内容剥离为独立的平台特化 skill。

**核心改动**：

#### 新增 skill
- `ai-team/platform-map.md` — 平台适配映射表。各通用角色据此加载对应平台特化 skill
- `ai-team-pt-hm-coder` — 鸿蒙平台特化开发角色（状态管理 V1/V2、MCP LSP、编码模板、ArkTS 性能/安全）
- `ai-team-pt-hm-tester` — 鸿蒙平台特化测试角色（ohosTest 完整流程）
- `ai-team-pt-hm-reviewer` — 鸿蒙平台特化审查角色（hdc 启动、签名检查、hilog）
- `ai-team-tool-ui-ux` — 跨平台通用 UI 体验优化规则（防抖/节流、Loading/Empty/Error/Content 四态、网络请求状态处理）

#### 鸿蒙 tool skill 搬迁重命名（物理移动目录）
| 旧名称 | 新名称 |
|--------|--------|
| `ai-team-tool-template-v2` | `ai-team-pt-hm-template-v2` |
| `ai-team-tool-template-custom` | `ai-team-pt-hm-template-custom` |
| `ai-team-tool-template-standard` | `ai-team-pt-hm-template-standard` |
| `ai-team-tool-template-mvvm` | `ai-team-pt-hm-template-mvvm` |
| `ai-team-tool-template-request` | `ai-team-pt-hm-template-request` |
| `ai-team-tool-arkts-performance` | `ai-team-pt-hm-arkts-performance` |
| `ai-team-tool-arkts-security` | `ai-team-pt-hm-arkts-security` |
| `ai-team-tool-build` | `ai-team-pt-hm-build` |
| `ai-team-tool-project-init` | `ai-team-pt-hm-project-init` |

#### 通用角色改造
- `ai-team-role-designer`：新增「目标平台/系统」收集，写入需求文档元信息
- `ai-team-role-coder`：去鸿蒙化，新增「第零步：平台适配」——查 `platform-map.md` 加载对应平台特化 skill
- `ai-team-role-tester`：去鸿蒙化，新增「第零步：平台适配」
- `ai-team-role-reviewer`：去鸿蒙化，新增「第零步：平台适配」

#### PM 改造
- `ai-team/SKILL.md`：spawn 角色时传入 `platform` 参数；新项目初始化根据平台选择对应工具

#### 平台适配机制
- PM spawn 角色时传入 `platform` 参数
- 各通用角色查 `ai-team/platform-map.md` 映射表
- 命中 → 加载对应 `ai-team-pt-{platform}-{role}` 特化 skill
- 未命中 → AI 自行发挥，不加载特化

#### 保留的通用 tool skill
- `ai-team-tool-report` — 文档沉淀规范（跨平台）
- `ai-team-tool-global-rule` — 全局约束（跨平台）
- `ai-team-tool-auto-tune` — 自我优化（跨平台）

## 2026-07-01

### 5. `ai-team-tool-template-v2` + `ai-team-role-coder` — 修复 V2 装饰器规则和 UI 布局规范

- `ai-team-tool-template-v2`：
  - 修复 Model 层模板：从"纯数据类，无装饰器"改为"需 UI 响应时加 @ObservedV2 + @Trace"，增加装饰器规则说明和判断规则
  - 新增「UI 布局规范」章节：尺寸策略决策表、layoutWeight 自适应规则、常见错误对照表
- `ai-team-role-coder`：
  - 第四步编码执行中新增「V2 装饰器规则」和「UI 布局自检」门禁（LSP/编译前执行）
  - 检查项：固定尺寸溢出、layoutWeight 使用、一屏完整展示

### 4. `ai-team-role-coder` + `ai-team-role-tester` — 调整 MCP LSP 校验与编译的顺序

- `ai-team-role-coder`：将原第四步-A（编译）和第五步（MCP LSP）交换，改为 **MCP LSP → 编译**。先静态检查语法，再编译，更快发现问题
- `ai-team-role-tester`：H1 完整工作流中新增步骤 3「MCP LSP 语法校验」（编译前），后续步骤编号 +1，修复循环回到步骤 3

### 3. `ai-team-tool-build` 从"编译 Agent 专用"改为"各角色按需加载"

- 移除 PM 中单独 spawn 编译 Agent 的逻辑（删除阶段 3，后续阶段编号前移）
- `ai-team-role-coder`：编码完成后增加"第四步-A：编译验证"，按需加载 `ai-team-tool-build`
- `ai-team-role-tester`：缺陷修复循环中增加编译主项目步骤（步骤 3），按需加载 `ai-team-tool-build`
- `ai-team-role-reviewer`：新增"第二步：编译验证（按需）"，后续步骤编号 +1
- 更新 `AI_TEAM_SHARE.md`、`README.md`、`SKILL.md` 中的角色映射表和流程图，编译不再作为独立 Agent

### 2. 重命名 `ai-team-global-auto-tune` → `ai-team-tool-auto-tune`

- 目录重命名：`ai-team-global-auto-tune/` → `ai-team-tool-auto-tune/`
- 更新所有引用该 skill 名称的文件（`AI_TEAM_SHARE.md`、`README.md`、`SKILL.md`、`AI_TEAM_CHANGELOG.md`、4 个角色 SKILL.md）
- 同步更新 `ai-team-tool-project-init/SKILL.md` 中的遗留 "CodeBuddy"

### 1. 去品牌化：移除 "CodeBuddy" 专有名称

- 将 `AI_TEAM_SHARE.md`、`AI_TEAM_CHANGELOG.md`、`SKILL.md`、`ai-team-role-designer/SKILL.md`、`ai-team-role-coder/SKILL.md` 中的 "CodeBuddy" 替换为通用 "AI IDE"
- 目的：使 skill 体系可跨 IDE 使用，不绑定特定产品

## 2026-06-30

### 11. 产出物命名统一为 `{role}-report.md`

- `requirement.md` → `designer-report.md`
- `tech-design.md` → `coder-report.md`
- `test-cases.md` → `tester-report.md`
- `delivery-report.md` → `reviewer-report.md`
- `build-report.md` 保持不变
- 同步更新所有角色 skill（designer/coder/tester/reviewer）、tool-report、SKILL.md、AI_TEAM_SHARE.md、README.md 中的引用

### 10. `AI_TEAM_SHARE.md` 同步更新

- 更新角色 Skill 名称（`ai-team-role-*` / `ai-team-tool-*`）
- 交付角色升级为审查角色（`ai-team-role-reviewer`，含代码质量审查）
- 新增「工具 Skill」表格和「Skill 体系清单」章节
- 新增 auto-tune 自我优化机制说明
- 更新架构图和流程图（审查角色替换交付角色）
- 流程精简规则与 SKILL.md 保持一致（简化为 2 行）
- 新增 `ai-team-tool-project-init` 由 PM 直接调用的说明
- 补充全局约束 skill（`ai-team-tool-global-rule`）说明
- 补充自进化能力总结

### 9. 移除插件体系 + 内置 auto-tune

- 移除 `ai-team-plugin` / `ai-team-plugin-memory` / `ai-team-plugin-auto-tune`（动态加载不可行）
- 新增 `ai-team-tool-auto-tune`：自我优化工具，内置到 PM 和各角色 Agent
  - 角色流程结束后静默自检，仅置信度 < 90% 且有阻碍时向 PM 汇报
  - PM 汇总优化建议附在交付报告末尾，不中断流程、不提问用户
  - 自动管理 AI_TEAM_CHANGELOG.md
- `ai-team`（PM）阶段 0.2 插件选择步骤已删除
- PM 阶段 6 收尾增加 auto-tune 汇总和自检
- 4 个角色 skill 角色定位增加自检步骤
- 记忆体精简为仅 hm-workflow CHANGELOG 规则，ai-team 体系由 auto-tune 管理

### 8. PM 瘦身 + 全局约束独立

- 新增 `ai-team-tool-global-rule`：全局约束规范（选项按钮设计 + Token 优化原则 + 产出物文档精简）
- `ai-team`（PM）清理：
  - 删除「体系架构图」（PM 不感知角色内部工具）
  - 删除「全局规则：选项按钮设计」→ 移到 `ai-team-tool-global-rule`
  - 删除「全局规则：Token 优化原则」→ 移到 `ai-team-tool-global-rule`
  - 删除「签名相关交互规范」（签名由 build/reviewer 角色自行处理）
  - 简化「流程精简规则表」为 2 行
  - 新增「全局约束」引用 `ai-team-tool-global-rule`
- 4 个角色 skill 补充 `ai-team-tool-global-rule` 全局约束引用：
  - `ai-team-role-designer`：补选项按钮 + 文档精简
  - `ai-team-role-coder`：补全局约束引用（选项按钮/Token已有内联）
  - `ai-team-role-tester`：补选项按钮 + Token + 文档精简
  - `ai-team-role-reviewer`：补选项按钮 + Token + 文档精简

### 7. `ai-team-role-coder` — 新增技术选型模式选项

- 第三步开头新增「0. 技术选型模式」：由AI决定 / 用户介入 / 自定义详细描述
- 选"由AI决定"时整个第三步只需 1 轮交互
- 技术选型优先规则明确：AI自行决定也优先 V2，仅 V2 无法实现时才降级 V1

### 6. 全部重命名 + 脱离 hm-* 体系独立

- **角色 Agent（有置信度）**：
  - `ai-team-requirement` → `ai-team-role-designer`（内联需求收集流程）
  - `ai-team-coding` → `ai-team-role-coder`（内联编码流程 + 模板引用改为 ai-team-tool-*）
  - `ai-team-testing` → `ai-team-role-tester`（内联 ohosTest 测试流程）
  - `ai-team-delivery` → `ai-team-role-reviewer`（扩展为代码审查角色，增加置信度评估）
- **工具 Skill（无置信度）**：
  - `ai-team-build` → `ai-team-tool-build`（复制 hm-build 内容，独立维护）
  - `ai-team-report` → `ai-team-tool-report`（文档沉淀规范）
  - 新增 `ai-team-tool-project-init`（复制 hm-project-init）
  - 新增 `ai-team-tool-template-v2`（复制 hm-coding-template-v2）
  - 新增 `ai-team-tool-template-custom`（复制 hm-coding-template-custom）
  - 新增 `ai-team-tool-template-standard`（复制 hm-coding-template-custom-standard）
  - 新增 `ai-team-tool-template-mvvm`（复制 hm-coding-template-custom-mvvm）
  - 新增 `ai-team-tool-template-request`（复制 hm-coding-template-custom-request）
  - 新增 `ai-team-tool-template-auto-req-gen`（复制 hm-coding-template-custom-auto-req-gen）
  - 新增 `ai-team-tool-arkts-performance`（复制 hm-coding-arkts-performance）
  - 新增 `ai-team-tool-arkts-security`（复制 hm-coding-arkts-security）
- **`ai-team`（PM）**：角色映射表 + 架构图全部更新为新命名，所有 `use_skill hm-*` 替换为 `use_skill ai-team-*`
- 删除旧目录：ai-team-requirement / ai-team-coding / ai-team-testing / ai-team-build / ai-team-delivery / ai-team-report
- 核心原则：ai-team 体系完全独立，不依赖任何 hm-* skill，两个体系各自独立维护

### 5. `ai-team-report` → `ai-team-tool-report` — 产出物路径改为项目目录绝对路径（已合并到 #6）

### 4. `ai-team-testing` — 修正自检清单（基于 Demo15 验证）

- 第二步「编译/运行问题自检」表格：4 项修复方案全面修正
  - `10311002 Failed to resolve OhmUrl` → **删除 `oh-package.json5`**（不是改 `useNormalizedOHMUrl`）
  - `error: failed to start ability` → **安装主 HAP**（不需要 `aa start`，`aa test` 自动拉起）
  - `App died` (ResultCode: -1) → **删除多余文件**（`oh-package.json5`/`OpenHarmonyTestRunner.ets`/手动 abilities）
  - ohosTest 目录不存在 → 按 H2 创建 **3 项**（module.json5 + 目录 + 测试文件，不含 `oh-package.json5`）
- 新增核心原则：ohosTest 目录越简洁越好，仅需 module.json5 + 测试文件

### 3. `ai-team-testing` — 增加编译/运行问题自检清单（已被 #4 修正替代）

### 2. 所有角色 skill — 产出物路径改为项目目录绝对路径

- 新增 `ai-team-report` skill：统一文档沉淀规范，确保所有产出物写入项目目录 `${workspaceFolder}/docs/ai-team/`
- `ai-team-requirement`：产出物路径改为 `${workspaceFolder}/docs/ai-team/requirement.md`
- `ai-team-coding`：产出物路径改为 `${workspaceFolder}/docs/ai-team/tech-design.md`
- `ai-team-build`：产出物路径改为 `${workspaceFolder}/docs/ai-team/build-report.md`
- `ai-team-testing`：产出物路径改为 `${workspaceFolder}/docs/ai-team/test-cases.md`
- `ai-team-delivery`：产出物路径改为 `${workspaceFolder}/docs/ai-team/delivery-report.md`
- `ai-team`（PM）：阶段 0.2 增加 `ai-team-report` 引用，角色映射表增加文档沉淀角色，架构关系图更新
- 解决：报告散落在 artifact 隐藏目录，用户在项目内看不到的问题

### 1. `ai-team-report` — 新增文档沉淀规范 skill

- 创建 `/skills/ai-team-report/SKILL.md`
- 核心原则：所有产出物写入项目目录 `${workspaceFolder}/docs/ai-team/`
- 规范：目录创建、写入路径、产出物清单、文档格式、写入后验证
- 禁止写入 artifact 隐藏目录

## 2026-06-29

### 10. `ai-team` — 增加全局 Token 优化原则

- 新增"全局规则：Token 优化原则"章节
- 三大核心原则：不重复（不重复向用户提问）、不冗余（不冗余加载 skill）、不预判（不预读源码做预防性检查）
- 各角色优化要点表：开发自动推断技术选型 / 编译不预读源码 / 测试聚焦核心逻辑
- 产出物文档精简规范：结构化表格为主，不贴完整代码，不写冗长诊断过程

### 9. `ai-team-testing` — 增加测试聚焦原则

- 新增"Token 优化：测试聚焦原则"章节
- 优先测 ViewModel，Model 层适量覆盖，跳过 UI 组件和存储工具类单测
- 每个核心功能覆盖正常路径 + 边界/异常路径，不人为限制用例数
- 用例数参考（非硬性限制）：简单 CRUD 15-25 个，中等 25-40 个，复杂 40+
- 每个用例代码精简（只断言关键结果），整体 token 消耗可控

### 8. `ai-team-build` — 增加编译聚焦原则

- 新增"Token 优化：编译 Agent 聚焦原则"章节
- 首次编译直接执行，不预读源码
- 编译失败才诊断修复，修复后直接重编
- 编译报告精简，签名检查一次
- 解决问题：编译 Agent 不必要的预读和冗余检查

### 7. `ai-team-coding` — 增加基于需求文档自动推断技术选型

- 新增"Token 优化：基于需求文档自动推断技术选型"章节
- ai-team 模式下，需求文档已包含充分信息，开发 Agent 自动推断 3 项技术选型
- V2 默认选 + 存储采用需求建议 + 模板按复杂度选择，合并或省略 ask_followup_question
- 仅当需求文档有歧义时触发 1 轮交互（3 问题合并），不逐项问
- 解决问题：coding-agent token 消耗最高（79 积分），主因是 3 轮技术选型交互 + 多层 skill 加载

### 6. `ai-team-delivery` — 增加签名问题处理流程

- 新增"签名问题处理（优先检查）"章节，在检查清单之前执行
- 签名未生效时通知 PM → PM 弹窗用户，提供"已完成签名"和"跳过签名仅代码交付"两个选项
- 用户选跳过时，交付报告标注"HAP 未签名，真机安装验证未执行"，不阻塞代码交付
- 解决问题：交付 Agent 卡在签名无法推进

### 5. `ai-team-build` — 增加编译成功后签名检查

- 新增"编译成功后签名检查（必须执行）"章节，复用 hm-build 的签名检查逻辑
- 检查 `*-signed.hap` 是否存在，只有 `*-unsigned.hap` 时走签名处理流程
- 签名处理流程：通知 PM → PM 弹窗用户签名 → 用户确认 → PM 通知 build-agent 重新编译
- 增加关键原则：Agent 不可自行重试编译绕过签名，也不可卡在等待中
- 解决问题：build-agent 和 testing-agent 在签名失败时卡住，需用户手动中断

### 4. `ai-team-coding` — 增加 V2 状态管理优先规则

- 新增"技术选型优先规则"章节
- 明确状态管理 V2 优先（@ComponentV2 + @ObservedV2），默认首选无需额外确认
- 仅当用户明确要求 V1 或项目已有 V1 代码需兼容时才选 V1，并在 tech-design.md 说明原因
- 解决问题：开发 Agent 技术选型时未优先选择 V2

### 3. `ai-team` — 增加全局选项按钮设计规则

- 新增"全局规则：选项按钮设计"章节，与 hm-workflow 保持一致
- 所有 ask_followup_question 调用必须：预设 2-4 选项 + 最后一个固定为自定义填写选项
- 新增"签名相关交互规范"，PM 签名弹窗提供"已完成签名"/"跳过签名"/"自定义填写"三个选项
- 解决问题：ai-team 体系未继承 hm-workflow 的选项按钮设计规则

### 2. `ai-team` — 触发方式调整

- `autoTrigger: false` → `autoTrigger: true`
- `trigger: keyword` → `trigger: keyword-and-route`
- 目的：关键词命中后自动加载并执行团队协同流程，无需用户额外指令

### 1. 新增 `ai-team` skill 体系 — AI 多 Agent 协同开发

- **背景**：将 hm-workflow 的 6 阶段串行流程拆分为多个角色 Agent，通过 AI IDE Task 工具的 team mode 实现多会话隔离 + 跨角色沟通
- **新增 skills（6 个，不改任何现有 skill）**：
  - `ai-team`：编排入口（轻量 PM），负责创建团队、分派角色、置信度门禁、用户沟通中枢
  - `ai-team-requirement`：需求策划 Agent，复用 hm-requirement + 置信度评估 + 产出 docs/ai-team/requirement.md
  - `ai-team-coding`：开发 Agent，复用 hm-coding + 置信度评估 + 产出 docs/ai-team/tech-design.md
  - `ai-team-build`：编译 Agent，复用 hm-build + 产出 docs/ai-team/build-report.md（无置信度，二元结果）
  - `ai-team-testing`：测试 Agent，复用 hm-testing + 置信度评估 + 产出 docs/ai-team/test-cases.md
  - `ai-team-delivery`：交付 Agent，复用 hm-delivery + 产出 docs/ai-team/delivery-report.md
- **核心特性**：
  - 多会话隔离：每个角色独立 conversation（本职工作会话），send_message 做跨角色沟通（不污染本职产出）
  - 置信度门禁：各角色自评 ≥ 85% 才放行下游（阈值可调），评估方式=检查清单（60分）+ 主观补充（40分）
  - 用户兜底：角色间无法达成共识时，PM 汇总后向用户 ask_followup_question
  - 产出物传递：写入 docs/ai-team/*.md，下游角色直接读文件
- **设计决策（用户确认）**：
  - PM 轻量调度（分派+汇报），置信度由各角色自评
  - 沟通仅用 send_message 内存通道，不持久化文件
  - 产出物写文件传递，send_message 仅发摘要
  - 置信度=检查清单为主 + AI 主观补充综合算分
