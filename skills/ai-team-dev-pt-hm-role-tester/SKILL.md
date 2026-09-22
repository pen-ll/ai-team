---
name: ai-team-dev-pt-hm-role-tester
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — 测试角色，含 ohosTest 完整测试流程。
  触发场景：platform=harmony 且承担 tester 角色时加载。
---

# 鸿蒙平台特化 — 测试角色

## 触发

当 platform=harmony 时加载。

> **环境事实**：路径 / CLI 口径 / 版本决策 / 设备与 UI 驱动命令的**唯一来源是 `ai-team-dev-pt-hm-env`** —— **需要构建 / 安装 / 启动 / UI 驱动 / 日志时 `use_skill ai-team-dev-pt-hm-env`**，本 skill 不内联副本。

## 覆盖范围

本 skill **覆盖或补充**通用 tester 流程中以下步骤：

| 通用步骤 | 鸿蒙特化行为 |
|----------|-------------|
| 第二步：测试流程 | 替换为 ohosTest 完整流程（H0-H7） |
| 第二步：用例设计 | 沿用通用「边界维度清单」；鸿蒙侧额外检查设备/签名/构建新鲜度/锁屏等环境边界，环境条件制造与校验见 H7 |
| 第二步：测试流程（单测结束后） | **[门禁] 询问用户是否追加真机 UI 自动化测试**；选执行则加载 `ai-team-dev-pt-hm-ui-test`，并在单测不可用时作为替代验证 |
| 第三步：产出文档 | 补充测试结果格式 |
| 第四步：置信度评估 | 补充测试 HAP 编译等鸿蒙特有检查项 |

## ohosTest 测试流程

### H0. 前序任务判断：测试目录位置

**必须根据前序任务类型决定测试文件的存放目录：**

| 前序任务 | 测试目录 | 编译命令 |
|----------|----------|----------|
| 新项目 | `entry/src/ohosTest/ets/test/` | `npx @deveco-test/deveco-cli@latest build --modules entry@ohosTest` |
| 新 HAR/HSP 模块 | `<module>/src/ohosTest/ets/test/` | `genOnDeviceTestHap` |

> **关键原则**：模块自己的单元测试必须留在模块自己的 `src/ohosTest/` 目录下，不能写到 entry 里。

### H1. 单元测试由 tester 编写并自动运行

**[门禁] 代码归属**：被测产品代码由 coder 交付；**单元测试代码（ohosTest）由 tester 编写与维护**，覆盖 Model、ViewModel、工具方法等非 UI 逻辑。coder **不产测试代码** —— 工作区若已存在 coder 遗留的测试代码，视为**待维护产物**：tester 复核、按需修正或扩充，**不因「非我编写」而跳过**。

**完整工作流（自动执行，无需用户催促）：**
1. 读产品代码（Model / ViewModel / 工具方法）与 `coder-report.md`，梳理可测面
2. 编写 / 补全单元测试
3. **MCP LSP 语法校验**（不可跳过）：
   - 对本次产生的 .ets 文件调用 MCP `deveco-mcp` / `check` 进行诊断
   - 若有错误则自动修复后重新校验，直到无错误
   - 失败处置（工具未注册 / 无返回超时 / 重试上限）**按 `ai-team-dev-pt-hm-env` E2.2 分类执行**，环境路径与包口径见 E2 / E2.1（**禁止内联副本**）
4. 编译主项目：**[门禁] 必须显式 `use_skill ai-team-dev-pt-hm-build`**（编译命令、DEVECO_SDK_HOME 路径探测均由 build skill 提供，禁止自行猜测/内联），确保 BUILD SUCCESSFUL
5. 编译测试 HAP：`npx @deveco-test/deveco-cli@latest build --modules <module>@ohosTest`
6. 安装并运行测试：`hdc install` + `aa test`
7. 屏幕锁定时报错 `10106102`，弹交互按钮让用户解锁后继续步骤 6
8. 测试失败时先区分问题归属（同通用 tester「跨角色沟通协议」）：
   - **测试自身问题**（断言写错 / 导入错误 / 用例设计错误）→ 自行修复测试代码，回到步骤 3（先 MCP 校验，再编译主项目，再编译测试 HAP）
   - **产品代码缺陷** → **直接反馈 coder**（附 issue-ID 并登记本报告「问题清单」），等待修复后重新测试，不自行修改产品代码
9. 单测执行结束（全部通过 / 因环境或架构限制无法执行，均如实记录，禁止伪造）
10. **[门禁] 询问真机 UI 自动化测试**（单测执行结束后执行，含「单测因架构/环境限制无法执行」的情况，不可跳过）：`ask_followup_question` 询问「是否追加真机 UI 自动化测试？」——选项 `["执行真机 UI 自动化测试", "跳过，直接交付"]`（末位自定义项由 `ai-team-tool-global-rule` 统一追加）
    - 用户选执行 → `use_skill ai-team-dev-pt-hm-ui-test`，按其流程执行，并把「运行时真机验证」章节写入 `tester-report.md`
    - 用户选跳过 → 在报告标注「用户选择跳过 UI 自动化测试」
    - 单测不可用时**必须先完成本询问**再收口，不得以「单测不可用」直接结束流程
    - **[门禁] `手动确认` 模式下合并收口问（判据：中间无可变状态）**：本询问与通用 tester「通知 PM」的收口确认**仅在「跳过」分支满足**该判据 → 选项合并为 `["执行真机 UI 自动化测试", "跳过 UI 测试并直接收口"]`；用户选「**跳过**」→ 视为已完成收口确认，**不再单独弹收口问**；用户选「**执行**」→ UI 测试会产生新证据（缺陷 / 置信度 / 报告内容均可能变化），**必须在 UI 测试完成后另做一次收口确认**（`全自动` 模式不受影响）

### H2. 测试目录与配置

```
<module>/src/ohosTest/
  ├── module.json5          # 必须存在
  └── ets/test/
      ├── List.test.ets     # 测试入口
      └── Xxx.test.ets      # 具体测试
```

> **重要原则**：ohosTest 目录**仅需 module.json5 + ets/test/ + 测试文件**，其他文件 hvigor 会自动生成。多放文件反而可能导致编译错误。

module.json5 模板：
```json5
{ "module": { "name": "<module>_test", "type": "feature", "deviceTypes": ["default","tablet","2in1","car"], "deliveryWithInstall": true, "installationFree": false } }
```

**以下文件绝对不要手动创建：**

| 文件 | 原因 |
|------|------|
| `oh-package.json5` | 导致 hvigor 将其当独立模块解析，引发 OhmUrl 解析失败 |
| `OpenHarmonyTestRunner.ets` | hvigor 自动生成，手动创建会冲突 |
| `abilities` 配置 | hvigor 自动生成 TestAbility，手动添加导致 App died |

### H3. 测试文件模板

**新项目场景**（测试在 entry 内，使用相对路径导入）：

> **重要**：确保 ohosTest 目录下**没有** `oh-package.json5`。

```ts
import { describe, it, expect } from '@ohos/hypium'
import XxxModel from '../../../main/ets/model/XxxModel'

export default function XxxTest() {
  describe('XxxModelTest', () => {
    it('assertFeature', 0, () => {
      let model: XxxModel = new XxxModel()
      expect(expected).assertEqual(actual)
    })
  })
}
```

List.test.ets 入口：
```ts
import XxxTest from './Xxx.test'
export default function testsuite() { XxxTest() }
```

### H4. 命令行构建、安装、测试

| 步骤 | 命令 |
|------|------|
| 1. 编译测试 HAP | `npx @deveco-test/deveco-cli@latest build --modules <module>@ohosTest`（HAP 模块如 entry 同命令） |
| 2. 安装主 HAP（仅首次） | `hdc install <module>/build/default/outputs/default/<module>-default-signed.hap` |
| 3. 安装测试 HAP | `hdc install <module>/build/default/outputs/ohosTest/<module>-ohosTest-signed.hap` |
| 4. 运行测试 | `hdc shell aa test -b <bundleName> -m <module>_test -s unittest OpenHarmonyTestRunner` |

> **[门禁] HAR/HSP 模块的测试 HAP 限制**：依赖 HAR 引用了 app 级资源（`$r('app.color.x')` 等）或存在传递依赖时，`genOnDeviceTestHap` 必然编译失败（项目架构限制，非本次改动引入，实测 5 种命令路径均不可行）。此时**不得伪造执行结果** → 走步骤 10 的 UI 自动化询问，用「静态等价性比对 + 编译门禁 + 真机 UI 自动化」替代，并在报告写明限制原因。

### H5. Assert API 差异

| 常见写法 | ArkTS 正确写法 |
|----------|---------------|
| assertLargerThan(n) | assertLarger(n) |
| assertLessThan(n) | assertLess(n) |
| assertNotEqual(n) | not().assertEqual(n) |
| assertCloseTo(n, d) | assertClose(n, d) |

### H6. 编译问题自动修复

#### OhmUrl 解析失败

**症状**：编译 ohosTest 时大量 `10311002 Failed to resolve OhmUrl` 错误。
**根因**：ohosTest 目录下误创建了 `oh-package.json5`。
**修复**：删除 `oh-package.json5`，重新编译。

#### `aa test` 运行异常

| 报错 | 排查 |
|------|------|
| `error: failed to start ability` | ① 主 HAP 是否已安装 ② 应用是否已启动（`hdc shell aa start -a EntryAbility -b <bundleName>`） |
| `App died` | ① 是否误创建 `oh-package.json5` / `OpenHarmonyTestRunner.ets` ② `module.json5` 是否误加 `abilities` |
| `10106102` | 设备屏锁 → 先 `hdc shell "power-shell wakeup"`，仍锁屏则 `ask_followup_question` 让用户解锁后重跑 |

### H7. 依赖用户操作的环境条件（鸿蒙制造与校验）

> 通用门禁见 `ai-team-dev-role-tester` §3.2「依赖用户操作的环境条件」；测试聚焦与用例数参考同节（优先 ViewModel，跳过 UI 组件与设备 API 工具类）。

需人为制造条件时，**优先用 hdc 自动制造并校验**，不可行才请求用户手操：

| 条件 | 制造 / 生效校验 | 恢复 |
|------|----------------|------|
| 断网 | 校验：`hdc shell "ifconfig wlan0"` 无 IP，或 `hdc shell "ping -c 1 -W 2 114.114.114.114"` 不通；制造多需用户手机侧关 Wi-Fi（`ifconfig wlan0 down` 多数零售机不允许） | 复验后跑同一校验确认已通网，必要时提示用户开回 |
| 锁屏 | `hdc shell "power-shell wakeup"`；仍锁屏则请用户解锁 | 无需恢复 |
| 后台 / 杀进程 | `hdc shell "aa force-stop <bundleName>"` | `hdc shell "aa start -a EntryAbility -b <bundleName>"` 并确认在前台 |
| 授权弹窗 / 权限 | 请用户点按授权（自动化不可代点） | 复测前提示用户在设置中撤销授权 |
| 弱网 / 超时 | 优先调测试参数或 mock 延时，不依赖真实弱网 | — |

> **[门禁]** 用户确认操作后，**必须先运行上表校验命令确认条件生效**再取证；复验结束**必须恢复并复核**（尤其网络）。用户无法配合 → 记未覆盖项 + 原因，禁止伪造结果。

## 置信度评估（补充通用 tester 第四步）

本 skill 在通用 tester 检查清单基础上，**追加**以下鸿蒙特有检查项：

| # | 检查项 | 得分 |
|---|--------|------|
| H1 | 测试 HAP 编译成功 | 0 / 10 |
| H2 | ohosTest 目录结构正确（无多余文件） | 0 / 10 |

> 鸿蒙特有项与通用检查清单合并计算置信度。

## 配置

```yaml
platform: harmony
build_skill: ai-team-dev-pt-hm-build
ui_test_skill: ai-team-dev-pt-hm-ui-test   # 单测结束后询问用户，选执行时加载
```
