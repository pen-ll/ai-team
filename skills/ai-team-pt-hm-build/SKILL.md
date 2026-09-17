---
name: ai-team-pt-hm-build
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — 编译构建工具。
  触发场景：鸿蒙项目需要编译/构建验证时加载。
---

# 鸿蒙项目构建（ai-team 体系）

## 触发

编码完成后执行，编译整个项目或单独模块。

## DevEco 路径探测（首次使用必做）

> DevEco Studio 安装路径因系统/安装方式而异，**所有编译命令必须先探测路径，禁止硬编码**。
> 分平台完整路径逐项探测：macOS（.app bundle，有 `Contents/` 层）与 Windows（无 `Contents/` 层）目录结构不同，**不能共用动态前缀**，需按平台各写完整路径。

```bash
# ① 探测 DevEco Studio 内置 Node.js（<node_path>）
NODE="/Applications/DevEco-Studio.app/Contents/tools/node/bin/node"          # macOS 默认
[ -f "$NODE" ] || NODE="$HOME/Applications/DevEco-Studio.app/Contents/tools/node/bin/node"  # macOS 用户目录
[ -f "$NODE" ] || NODE="/c/Program Files/Huawei/DevEco Studio/tools/node/node.exe"          # Windows (Program Files)
[ -f "$NODE" ] || NODE="/d/DevEco Studio/tools/node/node.exe"                               # Windows (D 盘自定义)
# 仍未找到 → ask_followup_question 让用户提供 node 可执行文件完整路径

# ② 探测 hvigorw.js（<hvigorw_path>，bin 层两侧一致，仅根前缀不同）
HVIGORW="/Applications/DevEco-Studio.app/Contents/tools/hvigor/bin/hvigorw.js"              # macOS
[ -f "$HVIGORW" ] || HVIGORW="/c/Program Files/Huawei/DevEco Studio/tools/hvigor/bin/hvigorw.js"   # Windows
[ -f "$HVIGORW" ] || HVIGORW="/d/DevEco Studio/tools/hvigor/bin/hvigorw.js"                  # Windows (D 盘)
# 仍未找到 → ask_followup_question 让用户提供 hvigorw.js 完整路径

# ③ 探测 SDK 根（<sdk_path> = DEVECO_SDK_HOME，不含 default）
SDK="/Applications/DevEco-Studio.app/Contents/sdk"                            # macOS
[ -d "$SDK" ] || SDK="/c/Program Files/Huawei/DevEco Studio/sdk"              # Windows
[ -d "$SDK" ] || SDK="/d/DevEco Studio/sdk"                                   # Windows (D 盘)
# 仍未找到 → ask_followup_question 让用户提供 SDK 根目录完整路径
```

- **探测原则**：每个组件独立探测（node / hvigorw.js / SDK 三者路径结构不同，不能互相派生），`[ -f ]` / `[ -d ]` 短路求值逐个尝试，命中即用；全部失败则 `ask_followup_question` 让用户提供对应完整路径
- **macOS vs Windows 结构差异**：macOS 根为 `.app` bundle（含 `Contents/` 层），node 位于 `tools/node/bin/node`；Windows 根为安装目录（无 `Contents/`），node 位于 `tools/node/node.exe`（无 bin 层 + `.exe` 后缀）。hvigor 两侧均为 `tools/hvigor/bin/hvigorw.js`，SDK 两侧均为 `sdk`（macOS 在 `Contents/sdk`）
- **Windows 路径格式**：AI 终端为 Git Bash 时用 `/c/...`、`/d/...` 格式；直接 PowerShell 执行时需先探测可用路径格式
- 后续编译命令中的 `<node_path>` / `<hvigorw_path>` / `<sdk_path>` 均为本探测结果

## MCP 编译前检查（仅编译失败时）

| 场景 | 是否用 MCP |
|------|-----------|
| 首次编译 | ❌ 不需要 |
| 编译失败 | ✅ 必须用 — 排查错误、定位问题 |
| 编译成功，后续日常编译 | ❌ 不需要 — 直接用 `build_project` |

## 编译命令

使用 DevEco Studio 内置的 Node.js + hvigorw.js，绕过 bash wrapper。

### 编译整个项目（HAP）

```bash
DEVECO_SDK_HOME=<sdk_path> <node_path> <hvigorw_path> \
  --mode module \
  -p product=default \
  -p buildMode=debug \
  assembleHap \
  --analyze=normal --parallel --incremental --daemon
```

### 仅编译单个模块（HAR/HSP）

当只需要编译新增的 HAR/HSP 模块时，使用 `assembleHar`：

```bash
DEVECO_SDK_HOME=<sdk_path> <node_path> <hvigorw_path> \
  --mode module \
  -p product=default \
  -p buildMode=debug \
  -p module=<moduleName>@default \
  assembleHar \
  --analyze=normal --parallel --incremental --daemon
```

> **场景区分**：编译整个项目用 `assembleHap`；新增模块后快速验证用 `assembleHar` 单独编译该模块。

> **为什么不用 `./hvigorw` wrapper**：需要项目本地的 `hvigor-wrapper.js` → 版本不匹配崩溃；需要 `.npmrc` → 配置错误。直接调 Node + hvigorw.js 零依赖项目 wrapper 文件。

### 关键规则

1. `DEVECO_SDK_HOME` 指向 SDK 根目录，**不是** `.../sdk/default`
2. 必须使用 DevEco Studio 自带的 Node.js（`<node_path>`，探测结果），不用系统 Node
3. 不用复制 `hvigor-wrapper.js` 或 `hvigorw`，`--mode module` 模式下不需要

## 编译前准备：`.gitignore` 检查

编译前**必须检查项目根目录是否存在 `.gitignore`**，若不存在则从模板创建：

```bash
[ -f <project_root>/.gitignore ] || cp <skill_dir>/references/gitignore-template <project_root>/.gitignore
```

> `<project_root>` = 当前鸿蒙项目根目录，`<skill_dir>` = `ai-team-tool-build` skill 所在目录。

## 编译前检查

编译失败时按顺序排查：

| 检查项 | 命令（基于探测的 `<node_path>` / `<hvigorw_path>` / `<sdk_path>`） |
|--------|------|
| Node.js 存在 | `ls <node_path>` |
| hvigorw.js 存在 | `ls <hvigorw_path>` |
| SDK 存在 | `ls <sdk_path>/default/openharmony/ets/api/` |
| SDK 版本匹配 | `cat <sdk_path>/default/openharmony/ets/oh-uni-package.json` |

## 编译失败诊断流程

编译失败时按以下步骤处理，不猜测、不跳过：

```
1. 停止新增功能，保留完整编译错误输出
2. 清理缓存后重新编译，确认是否稳定复现：
   DEVECO_SDK_HOME=<sdk_path> <node_path> <hvigorw_path> \
     --mode module -p product=default clean
   # 然后重新编译
3. 定位到具体层：
   ├── 语法/类型错误 → 具体 .ets 文件 + 行号
   ├── 依赖错误 → oh-package.json5 / hvigor 配置
   ├── SDK 错误 → API version 不匹配 / SDK 组件缺失
   └── 环境错误 → Node.js / hvigorw.js 路径
4. 修根因，不修症状：
   症状修复（❌）：编译报错 ArkUI 组件不存在 → 删除该组件引用
   根因修复（✅）：缺少对应模块依赖 → 在 oh-package.json5 中添加依赖
5. 补单元测试覆盖该编译错误场景（如导入路径、API 版本校验）
6. clean build + 全量测试通过后再继续下一阶段
```

### 定位策略

**按错误类型分类定位**：

| 错误类别 | 定位方法 |
|----------|----------|
| ArkTS 语法错误 | 直接看编译器输出的文件路径 + 行号，优先修第一个报错（后续可能是级联错误） |
| 模块/依赖找不到 | `cat <module>/oh-package.json5` 检查 dependencies；`cat <project>/oh-package.json5` 检查 devDependencies |
| SDK API 不存在 | 对比代码中的 API version 与 `oh-uni-package.json` 中的 SDK 版本 |
| hvigor 构建错误 | 检查 `hvigorfile.ts`、`build-profile.json5` 语法 |

### 常见编译错误

| 错误 | 原因 | 修复 |
|------|------|------|
| `Invalid value of 'DEVECO_SDK_HOME'` | SDK 路径指向了 `.../sdk/default` | 改为 `.../sdk`（不要 default） |
| `SDK component missing` | SDK 未安装或路径错误 | DevEco Studio → Settings → SDK 确认 |
| `hvigor depends on the npmrc file` | 用了 bash wrapper | 用本 skill 的 `node .../hvigorw.js --mode module` 命令 |

## 清理编译

```bash
DEVECO_SDK_HOME=<sdk_path> <node_path> <hvigorw_path> \
  --mode module -p product=default clean
```

## 编译成功后签名检查

编译 BUILD SUCCESSFUL 后，**必须检查产出的 HAP 是否已签名**：

```bash
ls <module>/build/default/outputs/default/*-signed.hap 2>/dev/null
```

- 若存在 `*-signed.hap` → 签名正常，可以安装
- 若只有 `*-unsigned.hap` → **签名未生效**，弹出提示：
  > ⚠️ 签名有问题，请重新签名。
  > 操作：File > Project Structure > Signing Configs > 勾选 Automatically generate signature > Apply

  用选项按钮"我已完成签名"让用户确认后，重新编译（清理缓存后编译）：
  ```bash
  DEVECO_SDK_HOME=<sdk_path> <node_path> <hvigorw_path> \
    --mode module -p product=default clean
  ```
  然后再执行编译命令。

## 编译变体

| 变体 | 参数 |
|------|------|
| Debug | `-p buildMode=debug` |
| Release | `-p buildMode=release` |
| 无 daemon（调试用） | 去掉 `--daemon` |
