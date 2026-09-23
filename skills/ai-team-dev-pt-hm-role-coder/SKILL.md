---
name: ai-team-dev-pt-hm-role-coder
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — 开发角色，含状态管理选型（V1/V2）、MCP LSP 语法校验、编码模板与 ArkTS 性能/安全规范。
  触发场景：platform=harmony 且承担 coder 角色时加载。
---

# 鸿蒙平台特化 — 开发角色

## 触发

当 platform=harmony 时加载。

> **环境事实**：路径探测、CLI 口径、MCP 配置、SDK 版本决策、设备命令（安装/重启/唤醒/日志），**唯一来源是 `ai-team-dev-pt-hm-env`** —— **需要触碰环境时 `use_skill ai-team-dev-pt-hm-env`**，**禁止在本 skill 内联副本**（内联副本会漂移）。
> **UI 驱动命令**（节点树 / 点击 / 输入 / 滑动 / 截图）的**唯一来源是 `ai-team-dev-pt-hm-ui-test`**，冒烟步骤需要时加载。

## 覆盖范围

本 skill **覆盖或补充**通用 coder 流程中以下步骤：

| 通用步骤 | 鸿蒙特化行为 |
|----------|-------------|
| 第零步之后：新项目初始化 | 若需求文档 `需求类型` 为「新项目」或工作区无鸿蒙工程，则加载 `ai-team-dev-pt-hm-project-init` 完成项目创建、签名配置、预装包 |
| 第零步之后：新模块初始化 | 若需求文档 `需求类型` 为「新模块」或编码中需创建 HAR/HSP 模块，则加载 `ai-team-dev-pt-hm-project-module-init` 完成模块创建与注册 |
| 第三步：技术选型 | 替换为鸿蒙专用选型（状态管理 V1/V2、数据存储、编码模板） |
| 第四步：编码执行 | 补充 V2 装饰器规则 + UI 布局自检 |
| 返工模式（领域扩展 §二）：复现手段 | 补充鸿蒙复现策略：优先用 `ai-team-dev-pt-hm-ui-test` 驱动自主复现，无法自主时才交用户手操 |
| 第四步-A：语法校验 | 替换为 DevEco MCP LSP 校验流程（CLI 口径 / 失败分类见 `ai-team-dev-pt-hm-env` E2） |
| 第五步：编译验证 + 最小冒烟自验 | 编译替换为 `ai-team-dev-pt-hm-build`；冒烟用 `ui` 驱动 + 节点树断言（见下文「最小冒烟自验」，UI 命令见 `ai-team-dev-pt-hm-ui-test`，设备命令见 `ai-team-dev-pt-hm-env` E4） |
| 第七步：置信度评估 | 补充 MCP LSP / 性能反模式等鸿蒙特有检查项 |

## 鸿蒙特化流程

### 新项目初始化（第一步，先于技术选型）

**[门禁] 若需求文档中 `需求类型` 为「新项目」或当前工作区无鸿蒙工程，必须先初始化项目工程。**

1. 检查需求文档元信息中的 `需求类型` 字段，或检查工作区是否存在 `build-profile.json5`
2. 是新项目或缺少工程 → 加载 `ai-team-dev-pt-hm-project-init`：
   ```
   use_skill ai-team-dev-pt-hm-project-init
   ```
3. 按其中流程：创建项目 → SDK 版本配置 → 签名配置（DevEco Studio）→ 预装包
4. 初始化过程中需用户交互时，**直接 `ask_followup_question` 与用户完成**
5. 初始化完成后继续技术选型

> **非新项目**（工作区已有鸿蒙工程）跳过此步骤。

### 新模块初始化（次优先于技术选型）

**[门禁] 若需求文档中 `需求类型` 为「新模块」，或编码过程中确定需要创建新的 HAR/HSP 模块，必须先初始化模块结构。**

1. 检查需求文档元信息中的 `需求类型` 字段，或编码过程中 AI 判断是否需要独立模块
2. 需创建新模块 → 加载 `ai-team-dev-pt-hm-project-module-init`：
   ```
   use_skill ai-team-dev-pt-hm-project-module-init
   ```
3. 按其中流程：创建模块目录结构 → 注册模块到项目 → 预装第三方包
4. 初始化过程中需用户交互时，**直接 `ask_followup_question` 与用户完成**
5. 模块创建完成后，继续后续编码流程

> **非新模块**（仅修改现有模块代码）跳过此步骤。

### 技术选型（覆盖通用 coder 第三步）

**[门禁] 一轮问完，禁止分轮**：把「选型主导权」与 3 项具体选型合并为**同一次 `ask_followup_question`（4 题同出）**。

```text
ask_followup_question(
  title: "技术选型",
  questions: [
    { id: "mode",     question: "技术选型由谁决定？",
      options: ["由AI决定（AI 基于需求文档自动推断，无需逐项询问）", "用户介入（逐项选择状态管理/数据存储/编码模板）"] },
    { id: "state",    question: "状态管理方案？",
      options: ["V2 新版（@ComponentV2 + @ObservedV2，推荐）", "V1 旧版（@Component + @State）"] },
    { id: "storage",  question: "数据存储方式？",
      options: [<方案一，按下方生成规则填入>， <方案二>] },
    { id: "template", question: "编码模板？",
      options: ["官方V2状态Demo", "V2 业务自定义模板", "无需模板AI自行发挥"] }
  ]
)
```

> **选项展示规则**：每题选项必须**完整展示**，不可截断、合并、筛选或缩减（末位自定义项由 `ai-team-tool-global-rule` 统一追加，不在此列出）。

| 用户选择 `mode` | 处理方式 |
|----------|----------|
| 由AI决定 | **忽略** `state` / `storage` / `template` 作答，按「自动推断规则」执行；coder-report.md 标注"由AI决定" |
| 用户介入 | 直接采用同轮 3 项作答，**不再二次询问** |
| 自定义详细描述 | 解析用户自由描述（如"用 V1 + Preferences + V2 业务自定义模板"）后采用，不确定处按自动推断规则补全 |

**`storage` 选项生成规则**（AI 结合需求文档填入两案）：

- 有用户数据需持久化 / 数据量小 / 结构简单 → 方案一 Preferences（键值对，JSON 整体存取）
- 需查询聚合 / 数据量大 → 方案一 relationalStore
- 仅展示不保存 → 方案一 仅内存存储
- 依赖服务端数据 → 方案一 网络 API

**`template` 作答后的动作**：

- "官方V2状态Demo" → `use_skill ai-team-dev-pt-hm-template-v2`，并 `use_skill ai-team-dev-pt-hm-arkts-v2-reactive`（V2 响应式数据能力）
- "V2 业务自定义模板" → `use_skill ai-team-dev-pt-hm-template-v2-custom`，并 `use_skill ai-team-dev-pt-hm-arkts-v2-reactive`（V2 响应式数据能力）
- "无需模板AI自行发挥" → 按需求描述自由编码；若采用 V2 状态管理，则 `use_skill ai-team-dev-pt-hm-arkts-v2-reactive`
- 末位自定义项 / 自由文本 → AI 据描述判断走哪个模板

#### 技术选型优先规则

| 技术选型 | 优先选择 | 说明 |
|----------|----------|------|
| 状态管理 | **V2 优先**（@ComponentV2 + @ObservedV2 + @Trace/@Local/@Param/@Require） | V2 是鸿蒙 Next 推荐的新版状态管理，默认首选。**AI自行决定也优先V2**。仅当用户明确要求 V1、项目已有 V1 代码需兼容、或 V2 无法实现需求时才降级 V1 |
| 编码模板 | 根据需求选择 | 官方V2状态Demo / V2 业务自定义模板 / 无需模板AI自行发挥 |
| 数据存储 | 根据需求场景 | preferences（轻量键值对）/ relationalStore（关系型）/ 内存存储 |

#### Token 优化：基于需求文档自动推断技术选型

**自动推断规则**（"由AI决定"模式下使用）：

| 技术选型 | 推断依据（从需求文档读取） | 自动结论 |
|----------|--------------------------|----------|
| 状态管理 | 默认 V2（无特殊约束） | V2，不询问。若 V2 无法实现需求则降级 V1 |
| 数据存储 | 需求文档"数据存储方案"字段 | 直接采用需求文档建议，不询问 |
| 编码模板 | 需求复杂度 + 是否有特殊 UI 要求 | 简单 CRUD → "无需模板AI自行发挥"；复杂业务 → "V2 业务自定义模板"；不询问 |

> 上述推断**只在用户于 `mode` 题选「由AI决定」或自定义描述时生效**；选「用户介入」则一律以用户同轮作答为准。
> 无论哪种模式，选型交互**只有一轮**（同一次 4 题 `ask_followup_question`），**禁止**先问主导权、再问具体项。

### 编码执行（补充通用 coder 第四步）

技术方案确认后，按所选模板或需求描述开始编码。编码时遵守以下规则：

**状态管理规则**：
- `ai-team-dev-pt-hm-arkts-performance` 内已用 🔵公共/🟢V2/🟠V1 标记区分：
  - 🔵 公共规则：V1/V2 都必须遵守
  - 🟢 V2 规则：选择 V2 时遵守（默认）
  - 🟠 V1 规则：仅 V1 项目遵守

**V2 装饰器规则**（选自 `ai-team-dev-pt-hm-template-v2`）：
- 任何需要 UI 响应变化的类对象都必须加 `@ObservedV2`，其内部需要触发 UI 刷新的属性必须加 `@Trace`
- ViewModel 内 `@Trace` 引用的子对象 → 子对象类也必须 `@ObservedV2`，子对象属性加 `@Trace`

**UI 静态自检**（编码完成后，LSP/编译前 —— **本阶段只能读代码判定，不能运行**）：

*布局*：
- 检查是否使用了固定 px/vp 宽度 + margin 导致多列布局总宽度超出 100%
- 检查按钮网格是否用 `layoutWeight` 自适应而非 `width('25%')` 等固定百分比
- 检查需要一屏完整展示的布局是否确保不溢出

### ArkTS 语法校验 — DevEco MCP LSP（门禁，不可跳过）

编码完成后，**强制执行**语法校验，不可静默跳过。

#### 工具信息

| 项目 | 值 |
|------|-----|
| MCP 服务名 | `deveco-mcp` |
| 工具名 | `check`（⚠️ 不是 `check_ets_files`） |
| 参数 | `files: string[]` — 相对项目根路径，如 `["entry/src/main/ets/pages/Page.ets"]` |
| 项目根 | 由 MCP 配置的 `PROJECT_PATH` 决定，**不需** `init_project_path` 工具 |

> **[门禁] 环境事实不内联**：CLI 包口径、能力自检命令、`mcp.json` 配置模板、`check` 失败分类，**全部见 `ai-team-dev-pt-hm-env` E2 / E2.1 / E2.2**，本 skill 不重复。

#### 执行流程

1. 直接调用 `check` 诊断本次产生的 .ets 文件
2. **成功返回** → 有错误则修复后重新校验，直到无错误
3. **调用失败** → 先按 `ai-team-dev-pt-hm-env` E2.2 分类，再按下表处置：

| 失败分类 | 判据 | 处置 |
|----------|------|------|
| 工具未注册 / 不可用 | 调用报 not found | 按 `ai-team-dev-pt-hm-env` E2 做**能力自检**（`check` / `ui` 须同时命中）；不满足则换包，并按 E2.1 修 `mcp.json` → **提示用户重启 IDE** → 重启后重试 |
| 预热中（**不是失败**） | 返回 `Project is syncing, please retry in 10 seconds` | 等 15s 后重试一次即正常（实测第 2 次 <1s 返回诊断），**不要**据此换包或跳过 |
| 无返回（超时） | 返回 `received no diagnostics within 20000ms` | **[门禁] 最多重试 1 次（共 2 次）**；仍超时 → 降级到编译验证，并在 `coder-report.md` 登记「LSP 未生效 + 原因」 |

> **[门禁] 禁止**用 `find ~/.npm/_npx … "@deveco/deveco-cli" … | head -1` 定位 CLI —— 会命中**无 `check`/`ui` 能力的旧包**（真实事故：MCP LSP 每次 20s 超时）。包名与自检命令以 `ai-team-dev-pt-hm-env` E2 为准。
> **[门禁] 不得静默跳过**：任何跳过都必须落到 `coder-report.md` 的「已知限制」，并在置信度评估中如实扣分。

### 编译验证（覆盖通用 coder 第五步）

**[门禁] 语法校验通过后，必须显式 `use_skill ai-team-dev-pt-hm-build` 进行编译验证**（编译命令、DEVECO_SDK_HOME 路径探测均由 build skill 提供，禁止自行猜测/内联）：

```
use_skill ai-team-dev-pt-hm-build
```

**[门禁] 首次编译前先核对 SDK 版本**：按 `ai-team-dev-pt-hm-env` E3 用权威查询确定 `targetSdkVersion` / `compatibleSdkVersion`（**禁止猜版本号**），否则会在安装阶段才暴露 `9568297`。

编译失败则按 `ai-team-dev-pt-hm-build` 中的诊断流程修复，直至 BUILD SUCCESSFUL。

### 最小冒烟自验（补充通用 coder 第五步）

编译 BUILD SUCCESSFUL 后，安装产物并在真机上**驱动核心链路走通一次**（证明产物可用，而非仅可编译）。

> **命令来源分工**：设备 / 环境层命令（安装 / 重启 / 唤醒 / 日志）见 `ai-team-dev-pt-hm-env` E4；**UI 驱动命令（节点树 / 点击 / 输入 / 滑动）唯一来源是 `ai-team-dev-pt-hm-ui-test`**，本步骤需 `use_skill` 加载它。

| # | 步骤 | 要点 |
|---|------|------|
| 1 | 确认设备 | `hdc list targets`；无输出 → `ask_followup_question` 让用户连接设备 |
| 2 | 校验构建新鲜度 | 产物时间戳须晚于源码最后修改时间，否则先重建（否则测的是旧代码） |
| 3 | 安装 signed HAP | 只有 `-unsigned.hap` → 走 `ai-team-dev-pt-hm-build` 签名检查 |
| 4 | **[门禁] 强制重启进程** | `force-stop` → `aa start`；`install -r` 不保证杀进程 |
| 5 | 唤醒设备 | `power-shell wakeup`；`10106102` = 屏锁 → 问用户解锁 |
| 6 | **[门禁] 驱动核心链路 + 断言** | `hilog -r` 清缓冲 → `ui layout` 取节点树 → **从节点 bounds 取中心坐标** `ui click <x> <y>` / `ui text` 逐步走通核心流程（节点不带 `id`，`--id` 仅在应用设了 `.id()` 时可用）→ **每步以节点树断言**（元素存在 / 文案 / 完成态 / 空态切换）；每次交互后**轮询等待**目标节点出现（本地渲染上限 2s），**禁止连续盲操作** |
| 7 | 崩溃扫描 | `hilog -x -n 2000` grep `jserror\|Exception`，匹配数应为 0（排除系统噪声） |

> **[门禁] 断言用节点树，不用截图**：`ui layout` 是文本（含 `[left,top,right,bottom]` 边界），能断言"元素存在 / 文案 / 状态 / 布局位置"，token 成本远低于截图（实测 simplified 模式约 5 行/屏）。
> **截图仅限**：视觉类结论（配色、渐变、毛玻璃观感）留证，或节点树无法表达时的崩坏现场。**不得**用截图代替可断言的元素检查。
> **降级**：按 `ai-team-dev-pt-hm-env` E5 探测到 `ui` 不可用 → 请用户手动走一遍核心链路，我方以 `hilog` + 用户描述复核。**降级原因必须登记**。

> **[门禁] 手动模式下的 UI 观感确认**：当 `模式: 手动确认` **且**需求含 UI / 视觉类验收项时，把应用**实际运行起来**后，必须 `ask_followup_question` 请用户**直接确认观感**（如「当前顶部玻璃效果是否符合预期？」），不得仅凭 AI 自行看图 / 看节点树就判定通过。`全自动` 模式保持原有自检流程不变。

> **[门禁] 只冒烟、不写测试**：本步骤**不编写测试代码、不建 `ohosTest` 目录、不产测试用例** —— 测试工程归 tester 维度（见 `ai-team-dev-pt-hm-role-tester` / `ai-team-dev-pt-hm-ui-test`）。
> **边界澄清**：用 `ui` 命令**驱动一次冒烟链路并断言**是 coder 本步骤的职责，**不算**"写测试"；写用例 / 建测试目录 / 出测试报告才是 tester 职责。
> **无设备 / 无法安装**：如实登记「未做冒烟自验（原因）」，继续后续流程，**不得伪造**，也不得为凑验证改去写测试。

### 置信度评估（补充通用 coder 第七步）

本 skill 在通用 coder 检查清单基础上，**追加**以下鸿蒙特有检查项：

| # | 检查项 | 得分 |
|---|--------|------|
| H1 | 语法校验通过（MCP LSP 无错误；若 LSP 不可用，则为「已按 `ai-team-dev-pt-hm-env` E2.2 分类降级 + 编译无错 + 原因已登记」） | 0 / 10 |
| H2 | 无明显 ArkUI 性能反模式（LazyForEach/状态管理正确） | 0 / 10 |
| H3 | V2 装饰器规则遵守（若选 V2） | 0 / 10 |

> 鸿蒙特有项与通用检查清单合并计算置信度。

### 复现手段（**分支，非主线步骤** —— 返工 / 排查 bug 时使用；补充领域扩展 §二：返工模式分流）

排查 bug 需复现时**优先 AI 自主复现**：`use_skill ai-team-dev-pt-hm-ui-test` 驱动链路（`ui layout` → `ui click` / `ui text`）并抓日志与崩溃栈，**不要默认把复现甩给用户**。

仅当无法自主驱动时才交用户手操：需人脸 / 支付 / 外部 App 交互、依赖用户独占账号态等。

> 日志取用：清缓冲 / 崩溃扫描命令见 `ai-team-dev-pt-hm-env` E4；放开日志级别与等待策略见 `ai-team-dev-pt-hm-ui-test`。

## 安全与性能

**[门禁] 按需加载，禁止开局全量灌入** ：

| 何时加载 | 加载项 |
|----------|--------|
| 涉及类型系统 / 语法不确定 / ArkTS 类型报错时 | `ai-team-dev-pt-hm-arkts-coding-rules` |
| 涉及渲染性能 / 长列表 / 动效流畅度时 | `ai-team-dev-pt-hm-arkts-performance`（⚠️ 该 skill **只含性能规则，不含任何观感 / 材质规范**） |
| 选用 V2 状态管理 / V2 模板，涉及 `@ObservedV2` / `@Trace` 响应式数据时 | `ai-team-dev-pt-hm-arkts-v2-reactive` |
| 涉及敏感信息 / 网络 / 依赖安装时 | `ai-team-dev-tool-security` + `ai-team-dev-pt-hm-arkts-security` |

```
use_skill ai-team-dev-pt-hm-arkts-coding-rules    # ArkTS 编码规则（类型系统/语法约束）
use_skill ai-team-dev-pt-hm-arkts-v2-reactive     # V2 响应式数据能力（@ObservedV2/@Trace）
use_skill ai-team-dev-tool-security                   # 通用安全规范（死循环检测/黑灰产/敏感信息）
use_skill ai-team-dev-pt-hm-arkts-security        # 鸿蒙特化安全规范（ohpm 白名单）
use_skill ai-team-dev-pt-hm-arkts-performance     # 鸿蒙性能优化规则
```

## 配置

```yaml
platform: harmony
build_skill: ai-team-dev-pt-hm-build
env_skill: ai-team-dev-pt-hm-env    # 需要触碰环境时 use_skill 加载（路径/CLI/版本/命令的事实唯一来源）
template_skills:
  v2: ai-team-dev-pt-hm-template-v2
  v2_custom: ai-team-dev-pt-hm-template-v2-custom        # 业务自定义模板入口（分派 standard / mvvm / request 子模板）
v2_reactive_skill: ai-team-dev-pt-hm-arkts-v2-reactive   # 选 V2 状态管理 / V2 模板时按需加载
security_skill: ai-team-dev-pt-hm-arkts-security
performance_skill: ai-team-dev-pt-hm-arkts-performance
```
