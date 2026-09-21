---
name: ai-team-dev-pt-hm-env
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — 环境与工具链事实的唯一来源（DevEco 路径探测、CLI 口径与 MCP 配置、SDK 版本决策、构建安装与 UI 驱动命令）。
  触发场景：platform=harmony 且需要触碰环境时（项目初始化 / 语法校验 / 编译 / 安装冒烟 / UI 驱动）。
---

# 鸿蒙环境与工具链事实（平台侧唯一来源）

## 何时加载

`platform=harmony` 且**需要触碰环境**时 `use_skill ai-team-dev-pt-hm-env`；不触碰环境的步骤（角色第零步、纯编码、纯审查）**不加载**。

| 场景 | 看哪节 |
|------|--------|
| 编译前路径探测 | E1 |
| 语法校验 / MCP 配置 | E2（含 E2.1 配置模板、E2.2 失败分类） |
| SDK 版本决策 | E3 |
| 安装 / 启动 / 日志 | E4 |
| 判断环境是否可用 | E5 |
| **E1-E5 未覆盖的命令 / 参数** | **E6**（探索口径与回填规则） |

## E1 路径探测（首次使用必做）

**[门禁] 三个组件独立探测，禁止硬编码、禁止互相派生**（三者目录结构不同）。macOS 为 `.app` bundle（含 `Contents/` 层），Windows 为安装目录（无 `Contents/`）。

```bash
# ① DevEco 内置 Node.js
NODE="/Applications/DevEco-Studio.app/Contents/tools/node/bin/node"                            # macOS
[ -f "$NODE" ] || NODE="$HOME/Applications/DevEco-Studio.app/Contents/tools/node/bin/node"     # macOS 用户目录
[ -f "$NODE" ] || NODE="/c/Program Files/Huawei/DevEco Studio/tools/node/node.exe"             # Windows
[ -f "$NODE" ] || NODE="/d/DevEco Studio/tools/node/node.exe"                                  # Windows (D 盘)

# ② hvigorw.js（两侧均为 tools/hvigor/bin/hvigorw.js，仅根前缀不同）
HVIGORW="/Applications/DevEco-Studio.app/Contents/tools/hvigor/bin/hvigorw.js"                 # macOS
[ -f "$HVIGORW" ] || HVIGORW="/c/Program Files/Huawei/DevEco Studio/tools/hvigor/bin/hvigorw.js"
[ -f "$HVIGORW" ] || HVIGORW="/d/DevEco Studio/tools/hvigor/bin/hvigorw.js"

# ③ SDK 根（= DEVECO_SDK_HOME，不含 /default）
SDK="/Applications/DevEco-Studio.app/Contents/sdk"                                             # macOS
[ -d "$SDK" ] || SDK="/c/Program Files/Huawei/DevEco Studio/sdk"
[ -d "$SDK" ] || SDK="/d/DevEco Studio/sdk"
```

全部候选失败 → `ask_followup_question` 让用户提供对应完整路径。

> Windows 下终端为 Git Bash 用 `/c/...`；直接 PowerShell 执行时先探测可用路径格式。
> 实测参考：DevEco Studio 26.0.0 → SDK 在 `/Applications/DevEco-Studio.app/Contents/sdk`；`~/Library/Huawei/Sdk` 只有 `productConfig.json`，**不是**编译用 SDK。

## E2 工具链口径（DevEco CLI）

| 项 | 值 |
|------|-----|
| 首选包 | `@deveco-test/deveco-cli`（含 `ui` / `check` / `signature` / `auth`） |
| 禁用包 | `@deveco/deveco-cli` —— 实测 1.2.0 命令集仅 `build/run/update/device/emulator/skills/log/create/init/serve/docs`，**无 `ui`、无 `check`**；挂它的 `serve mcp` 必然每次 20s 拿不到诊断 |
| 安装 | `npm install -g @deveco-test/deveco-cli@latest --no-fund --no-audit` |
| 解析路径 | `node` = 绝对路径（E1 的 `$NODE` 或 `which node`）；`cli.js` = `$(npm root -g)/@deveco-test/deveco-cli/dist/cli.js` |
| **[门禁] 能力自检** | `node <cli.js> --help \| grep -E "^\s+(check\|ui)\b"` 必须**同时命中**；否则升级/换包，**不得继续依赖 MCP LSP** |
| CLI 不稳定时 | `npx -y @deveco-test/deveco-cli@latest <cmd>`（缓存目录 hash 与包名绑定，可用） |

> **禁止**用 `find ~/.npm/_npx -path "*/@deveco/deveco-cli/dist/cli.js" … | head -1` 定位 CLI —— 会命中旧包且无能力校验。

### E2.1 MCP 配置模板（`deveco-mcp`）

```json
{
  "mcpServers": {
    "deveco-mcp": {
      "type": "stdio",
      "command": "sh",
      "args": [
        "-c",
        "PROJECT_PATH=$(pwd) exec <node绝对路径> <cli.js绝对路径> serve mcp"
      ],
      "env": {}
    }
  }
}
```

三个必守点：

| # | 要点 | 原因 |
|---|------|------|
| 1 | `command` 必须是 `sh` | `devecocli` 通常不在 MCP 进程 PATH 中，直连会连不上 |
| 2 | `PROJECT_PATH` 由 shell 动态注入 | MCP `env` **不展开** IDE 变量，写 `${workspaceFolder}` 会收到字面量；`$(pwd)` = workspace 根，与 LSP 相对路径基准一致 |
| 3 | `node` / `cli.js` 用**绝对路径** | npx 缓存 hash 目录会变；全局安装路径稳定 |

改完 `mcp.json` **需重启 IDE 才生效**；重启后用 `check` 对任一 `.ets` 实测（能返回诊断即修复成功）。

### E2.2 MCP `check` 失败分类与处置

| 现象 | 判定 | 处置 |
|------|------|------|
| 工具未注册 / 调用报「not found」 | 服务未启动或包无该能力 | 按 E2 换包 + E2.1 修配置 → 重启 IDE |
| 返回 `Project is syncing, please retry in 10 seconds`（`isError: true`） | **预期预热行为，不是失败** | 等 15s 重试一次即可（实测第 2 次 703ms 返回诊断）。**不得**据此判定 MCP 不可用 |
| 返回 `received no diagnostics within 20000ms from LSP` | 服务与路径**都正常**，是 LSP 20s 内未产出诊断 —— 实测为**旧包（`@deveco/deveco-cli` 1.2.0）能力缺失** | 按 E2 能力自检；**最多重试 1 次**（共 2 次），仍超时 → 降级编译验证并登记原因，**不得静默跳过** |
| `check lint` 返回 `Files checked: 0` | 未配 lint config，扫不到文件 | 不可单独作为语法门禁替代品，只作辅助 |

> 实测基线（2026-09-20，DevEco Studio 26.0.0）：换包后 `initialize` 288ms、第 1 次 `check` 返回 syncing、第 2 次 **703ms** 返回 `xxx.ets => no diagnostics`。

## E3 SDK 版本决策（[门禁] 禁止猜版本号）

| 需要的信息 | 查询命令 |
|------------|----------|
| 合法版本字符串全集 | `node <cli.js> check compat versions`（实测含 `HarmonyOS_6.1.1(24)_Release`；**API 25 不存在，24 后直接跳到 26**） |
| 本机 SDK 版本 | `cat <SDK>/default/sdk-pkg.json` |
| 设备 API / 平台版本 | `hdc shell param get const.ohos.apiversion`；`hdc shell param get const.ohos.fullname` |

决策规则：

| 字段 | 取值 |
|------|------|
| `targetSdkVersion` | 本机 SDK 版本（如 `26.0.0`） |
| `compatibleSdkVersion` | **设备 API 对应的 Release 版本字符串**，由 `check compat versions` 原样取用（如 `6.1.1(24)`） |
| 格式 | `build-profile.json5` 中为 `<平台版本>(<API>)`，如 `5.0.3(15)`、`6.1.1(24)`；API 26 可写 `26.0.0` |
| 安装报 `9568297` | 设备 API < `compatibleSdkVersion` → 按上表下调 `compatibleSdkVersion`，**重新编译**（勿只改配置不重建） |

**升级预检（SDK / 平台版本升级前）**：

```bash
node <cli.js> check compat --source-version <旧版本> --target-version <新版本>
```

- **`target` 必须晚于 `source`**，字符串取自 `check compat versions`；违反会被直接拒绝
- 用途：预看升级到目标版本后的**破坏性变更**
- **用途边界**：它**不能**判断"当前代码是否超出设备 API 支持范围" —— 后者由 `compatibleSdkVersion` + 编译期检查兜底

## E4 安装 / 设备操作命令

| 用途 | 命令 |
|------|------|
| 安装 | `hdc install -r <module>/build/default/outputs/default/<module>-default-signed.hap` |
| **[门禁] 重启进程** | `hdc shell aa force-stop <bundle>` → `hdc shell aa start -a EntryAbility -b <bundle>`（`install -r` **不保证**杀进程，不重启会跑旧代码） |
| 唤醒 | `hdc shell "power-shell wakeup"`；`aa start` 返回 `10106102` = 屏锁 |
| 日志清缓冲 / 崩溃扫描 | `hdc shell hilog -r` → 操作 → `hdc shell hilog -x -n 2000` grep `jserror\|Exception` |

## E5 环境门槛（只做能力探测，不比对版本号）

**[门禁] 禁止用硬编码版本阈值判断环境是否满足**——IDE/SDK 版本号命名已跳变（实测 DevEco Studio = `26.0.0.821`，旧文档写 `6.1.0`），比大小必然误判。

| 能力 | 探测命令 |
|------|----------|
| CLI 可用 | `node <cli.js> --version` |
| UI 能力 | `node <cli.js> ui --help` |
| 校验能力 | `node <cli.js> check --help` |
| 设备在线 | `hdc list targets` |

探测失败后的处置**按项区分**：

| 失败项 | 处置 |
|--------|------|
| CLI / UI / 校验能力 | 升级/换包，或走降级通道并把**降级原因**写入报告 |
| 设备在线 | **不是能力问题**（`[Empty]` = 设备掉线/未连接）→ `ask_followup_question` 让用户连接设备；同时可先 `power-shell wakeup` 排除屏锁 |

> 实测：设备掉线时 `ui` 报 `No active devices found. Start an emulator or connect a physical device.` —— 这是**设备侧原因**，不要误判为 CLI 不可用。

## E6 命令探索口径（E1-E5 未覆盖时怎么办）

遇到 E1-E5 未覆盖的子命令或参数时，**按此探索，禁止凭记忆猜参数**：

| 序 | 手段 | 用途 |
|---|------|------|
| 1 | `node <cli.js> <command> --help` | **参数最权威来源**（子命令是否存在 + 参数名与取值） |
| 2 | `node <cli.js> docs search "<关键词>"` | **官方离线文档库**（含 DevEco CLI 官方文档）；CLI 自带，不需要联网 |
| 3 | `DEVECO_CLI_DEBUG=1 node <cli.js> ...` | 打印**底层命令映射**（如截图实为 `hdc snapshot_display` + `file recv`），排查利器 |
| 4 | `node <cli.js> --help` | 子命令全集（配合 E2 能力自检用） |

> **分界判据（决定"直写"还是"查"）**：**官方文档里有的 → 查**（子命令全集、参数清单、用法示例）；**官方文档里没有的 → 必写**（实测结论、建议取值、失败判据映射）。
>
> 高频命令**直写不查**——高频 = 每次任务都用，每查一次就多一轮工具调用、多一个失败面（CLI / 文档库不可用）。低频或一次性命令**用时再查**。

**[门禁] 探索结论必须回填，但只回填两类**：

| 回填 | 判据 | 例 |
|------|------|-----|
| ✅ 实测事实 | 官方文档查不到的结论 | 某包缺能力、某返回码含义、某目录不是编译用 SDK |
| ✅ 高频命令 | **≥2 个 skill 或 ≥2 类场景**会用到 | `check compat versions`、`hdc list targets` |
| ❌ 一次性命令 | 只在单一场景用一次 | 某次排查临时用的参数组合 |

> 回填位置：按主题入 E1-E5 对应节（不确定则新增子节）；**已在别处出现过的命令不重复写**，只补差异结论。不设此门禁 → 本文件无界膨胀，反而拖慢每次加载。
