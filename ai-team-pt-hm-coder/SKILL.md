---
name: ai-team-pt-hm-coder
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — 开发角色，含状态管理选型（V1/V2）、MCP LSP 语法校验、编码模板与 ArkTS 性能/安全规范。
  触发场景：鸿蒙开发任务由平台映射表路由到 coder 时加载。
---

# 鸿蒙平台特化 — 开发角色

## 触发

当 platform=harmony 时加载。

## 覆盖范围

本 skill **覆盖或补充**通用 coder 流程中以下步骤：

| 通用步骤 | 鸿蒙特化行为 |
|----------|-------------|
| 第零步之后：新项目初始化 | 若需求文档 `需求类型` 为「新项目」或工作区无鸿蒙工程，则加载 `ai-team-pt-hm-project-init` 完成项目创建、签名配置、预装包 |
| 第零步之后：新模块初始化 | 若需求文档 `需求类型` 为「新模块」或编码中需创建 HAR/HSP 模块，则加载 `ai-team-pt-hm-project-module-init` 完成模块创建与注册 |
| 第三步：技术选型 | 替换为鸿蒙专用选型（状态管理 V1/V2、数据存储、编码模板） |
| 第四步：编码执行 | 补充 V2 装饰器规则 + UI 布局自检 |
| 第四步-A：语法校验 | 替换为 DevEco MCP LSP 校验流程 |
| 第五步：编译验证 | 替换为 `ai-team-pt-hm-build` 编译 |
| 第七步：置信度评估 | 补充 MCP LSP / 性能反模式等鸿蒙特有检查项 |

## 鸿蒙特化流程

### 新项目初始化（第一步，先于技术选型）

**[门禁] 若需求文档中 `需求类型` 为「新项目」或当前工作区无鸿蒙工程，必须先初始化项目工程。**

1. 检查需求文档元信息中的 `需求类型` 字段，或检查工作区是否存在 `build-profile.json5`
2. 是新项目或缺少工程 → 加载 `ai-team-pt-hm-project-init`：
   ```
   use_skill ai-team-pt-hm-project-init
   ```
3. 按其中流程：创建项目 → SDK 版本配置 → 签名配置（DevEco Studio）→ 预装包
4. 初始化过程中需用户交互时，**直接 `ask_followup_question` 与用户完成**
5. 初始化完成后继续技术选型

> **非新项目**（工作区已有鸿蒙工程）跳过此步骤。

### 新模块初始化（次优先于技术选型）

**[门禁] 若需求文档中 `需求类型` 为「新模块」，或编码过程中确定需要创建新的 HAR/HSP 模块，必须先初始化模块结构。**

1. 检查需求文档元信息中的 `需求类型` 字段，或编码过程中 AI 判断是否需要独立模块
2. 需创建新模块 → 加载 `ai-team-pt-hm-project-module-init`：
   ```
   use_skill ai-team-pt-hm-project-module-init
   ```
3. 按其中流程：创建模块目录结构 → 注册模块到项目 → 预装第三方包
4. 初始化过程中需用户交互时，**直接 `ask_followup_question` 与用户完成**
5. 模块创建完成后，继续后续编码流程

> **非新模块**（仅修改现有模块代码）跳过此步骤。

### 技术选型（覆盖通用 coder 第三步）

#### 0. 技术选型模式（优先于具体选型）

进入技术方案收集前，**先弹出选项让用户决定选型主导权**：

```
标题: "技术选型"
选项: ["由AI决定（AI 基于需求文档自动推断，无需逐项询问）", "用户介入（逐项选择状态管理/数据存储/编码模板）", "自定义详细描述"]
```

| 用户选择 | 处理方式 |
|----------|----------|
| 由AI决定 | 跳过 1-3 逐项询问，直接按自动推断规则走。推断结果在 coder-report.md 中标注"由AI决定"。 |
| 用户介入 | 进入 1-3 逐项询问，每项完整展示选项让用户选择。 |
| 自定义详细描述 | 等待用户自由描述技术偏好（如"用 V1 + Preferences + V2自定义模板"），AI 解析后采用，不确定的部分按自动推断规则补全。 |

> **关键**：此选项决定了后续流程是否需要逐项 ask_followup_question。选"由AI决定"时整个第三步只需 1 轮交互。

---

以下为选"用户介入"时的逐项收集流程：

> **⚠️ 选项展示规则**：以下每个技术选型调用 `ask_followup_question` 时，必须按原文**完整展示全部选项**，不可截断、合并、筛选或缩减选项数量（末位自定义项由 `ai-team-tool-global-rule` 统一追加，不在此列出）。

#### 1. 状态管理

```
选项: ["V2 新版（@ComponentV2 + @ObservedV2，推荐）", "V1 旧版（@Component + @State）"]
```

#### 2. 数据存储方式

根据需求收集阶段的信息，由 AI 判断数据存储场景并给出建议选项：

- 若有用户数据需持久化 → 建议 Preferences
- 若仅展示数据不保存 → 仅内存存储
- 若依赖服务端数据 → 网络 API
- 复杂场景 → 询问用户选择组合方案

```
选项: ["方案一：xxx（AI 根据需求推荐）", "方案二：xxx（备选）"]
```

#### 3. 选择编码模板

```
选项: ["官方V2状态Demo", "V2自定义模板", "无需模板AI自行发挥"]
```

- 选择"官方V2状态Demo" → `use_skill ai-team-pt-hm-template-v2`
- 选择"无需模板AI自行发挥" → 按需求描述自由编码
- 用户选末位自定义项或自由文本描述时 → AI 根据用户描述判断走哪个模板

#### 技术选型优先规则

| 技术选型 | 优先选择 | 说明 |
|----------|----------|------|
| 状态管理 | **V2 优先**（@ComponentV2 + @ObservedV2 + @Trace/@Local/@Param/@Require） | V2 是鸿蒙 Next 推荐的新版状态管理，默认首选。**AI自行决定也优先V2**。仅当用户明确要求 V1、项目已有 V1 代码需兼容、或 V2 无法实现需求时才降级 V1 |
| 编码模板 | 根据需求选择 | 官方V2状态Demo / V2自定义模板 / 无需模板AI自行发挥 |
| 数据存储 | 根据需求场景 | preferences（轻量键值对）/ relationalStore（关系型）/ 内存存储 |

#### Token 优化：基于需求文档自动推断技术选型

**自动推断规则**（"由AI决定"模式下使用）：

| 技术选型 | 推断依据（从需求文档读取） | 自动结论 |
|----------|--------------------------|----------|
| 状态管理 | 默认 V2（无特殊约束） | V2，不询问。若 V2 无法实现需求则降级 V1 |
| 数据存储 | 需求文档"数据存储方案"字段 | 直接采用需求文档建议，不询问 |
| 编码模板 | 需求复杂度 + 是否有特殊 UI 要求 | 简单 CRUD → "无需模板AI自行发挥"；复杂业务 → "V2自定义模板"；不询问 |

**仅当以下情况才触发 ask_followup_question（合并为 1 轮，3 个问题一起问）**：

1. 需求文档中数据存储方案不明确（如只写"本地存储"未指定具体技术）
2. 需求复杂度难以判断模板选择
3. 需求文档中存在矛盾或歧义

### 编码执行（补充通用 coder 第四步）

技术方案确认后，按所选模板或需求描述开始编码。编码时遵守以下规则：

**状态管理规则**：
- `ai-team-pt-hm-arkts-performance` 内已用 🔵公共/🟢V2/🟠V1 标记区分：
  - 🔵 公共规则：V1/V2 都必须遵守
  - 🟢 V2 规则：选择 V2 时遵守（默认）
  - 🟠 V1 规则：仅 V1 项目遵守

**V2 装饰器规则**（选自 `ai-team-pt-hm-template-v2`）：
- 任何需要 UI 响应变化的类对象都必须加 `@ObservedV2`，其内部需要触发 UI 刷新的属性必须加 `@Trace`
- ViewModel 内 `@Trace` 引用的子对象 → 子对象类也必须 `@ObservedV2`，子对象属性加 `@Trace`

**UI 布局自检**（编码完成后，LSP/编译前）：
- 检查是否使用了固定 px/vp 宽度 + margin 导致多列布局总宽度超出 100%
- 检查按钮网格是否用 `layoutWeight` 自适应而非 `width('25%')` 等固定百分比
- 检查需要一屏完整展示的布局是否确保不溢出

### ArkTS 语法校验 — DevEco MCP LSP（门禁，不可跳过）

编码完成后，**强制执行** MCP LSP 校验，不可静默跳过。

#### 工具信息

| 项目 | 值 |
|------|-----|
| MCP 服务名 | `deveco-mcp` |
| 工具名 | `check`（⚠️ 不是 `check_ets_files`） |
| 参数 | `files: string[]` — 相对项目根路径，如 `["entry/src/main/ets/pages/Page.ets"]` |
| 路径要求 | 相对路径，从 `PROJECT_PATH` 环境变量指定的项目根算起 |

> 不需要 `init_project_path` 工具。项目根由 MCP 配置中的 `PROJECT_PATH` 环境变量指定。

#### 执行流程

1. **先直接尝试调用 `check`** 对本次产生的 .ets 文件进行诊断
2. **若调用成功** → 正常使用，若有错误则自动修复后重新校验，直到无错误
3. **若调用失败**（工具未注册/不可用）→ **AI 默认自动执行初始化**：
   - 静默执行一键配置命令：`npx @deveco/deveco-cli@latest init --mcp`
   - **若初始化成功** → 继续步骤 4
   - **若初始化失败** → 用 `ask_followup_question` 提示用户：
     - 选项：["跳过 MCP LSP 校验，继续下一步（编译验证）", "我已重启IDE，重新校验"]
     - 选"跳过" → 直接进入编译阶段
     - 选"重启IDE" → 提示用户重启 AI IDE 使 MCP 生效，重启后重新尝试 `check`

#### 初始化后必做：修复 MCP 配置

`init --mcp` 生成的 `mcp.json` 有两个坑，必须修复：

**坑 1：`command` 字段**
生成的是 `"devecocli"`，该二进制通常不在 PATH 中导致 MCP 连不上。

**坑 2：`PROJECT_PATH` 硬编码**
生成的是 `"${workspaceFolder}"`，**MCP env 不会展开 IDE 变量**，服务收到字面字符串无法找到项目。

**统一修复**：

用 shell wrapper 动态注入 `PROJECT_PATH`：

```bash
find ~/.npm/_npx -path "*/@deveco/deveco-cli/dist/cli.js" -type f | head -1
```

将 `mcp.json` 修改为：
```json
{
  "command": "sh",
  "args": [
    "-c",
    "PROJECT_PATH=$(pwd) exec node <缓存的cli.js绝对路径> serve mcp"
  ],
  "env": {}
}
```

### 编译验证（覆盖通用 coder 第五步）

**[门禁] MCP LSP 校验通过后，必须显式 `use_skill ai-team-pt-hm-build` 进行编译验证**（编译命令、DEVECO_SDK_HOME 路径探测均由 build skill 提供，禁止自行猜测/内联）：

```
use_skill ai-team-pt-hm-build
```

编译失败则按 `ai-team-pt-hm-build` 中的诊断流程修复，直至 BUILD SUCCESSFUL。

### 置信度评估（补充通用 coder 第七步）

本 skill 在通用 coder 检查清单基础上，**追加**以下鸿蒙特有检查项：

| # | 检查项 | 得分 |
|---|--------|------|
| H1 | MCP LSP 语法校验通过（无错误） | 0 / 10 |
| H2 | 无明显 ArkUI 性能反模式（LazyForEach/状态管理正确） | 0 / 10 |
| H3 | V2 装饰器规则遵守（若选 V2） | 0 / 10 |

> 鸿蒙特有项与通用检查清单合并计算置信度。

## 安全与性能

编码过程中按需加载：

```
use_skill ai-team-pt-hm-arkts-coding-rules    # ArkTS 编码规则（类型系统/语法约束）
use_skill ai-team-tool-security              # 通用安全规范（死循环检测/黑灰产/敏感信息）
use_skill ai-team-pt-hm-arkts-security       # 鸿蒙特化安全规范（ohpm 白名单）
use_skill ai-team-pt-hm-arkts-performance    # 鸿蒙性能优化规则
```

## 配置

```yaml
platform: harmony
build_skill: ai-team-pt-hm-build
template_skills:
  v2: ai-team-pt-hm-template-v2
security_skill: ai-team-pt-hm-arkts-security
performance_skill: ai-team-pt-hm-arkts-performance
```
