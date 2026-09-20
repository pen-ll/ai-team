---
name: ai-team-dev-pt-hm-build
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

> **环境事实**：路径探测、SDK 版本决策、设备命令的**唯一来源是 `ai-team-dev-pt-hm-env`** —— **编译前需要探测路径时 `use_skill ai-team-dev-pt-hm-env`**，本 skill 不内联副本。

## 路径探测（首次使用必做）

**[门禁] 编译前必须完成路径探测** —— 探测命令与三组件（内置 node / hvigorw.js / SDK 根）的完整候选列表**见 `ai-team-dev-pt-hm-env` E1**。

- 探测结果记作 `<node_path>` / `<hvigorw_path>` / `<sdk_path>`，供本 skill 全部编译命令引用
- 三者**独立探测**、`[ -f ]` / `[ -d ]` 短路求值、命中即用；全部失败 → `ask_followup_question` 让用户提供完整路径
- SDK 根**不含** `/default`；报 `Invalid value of 'DEVECO_SDK_HOME'` 先复核此项

## MCP 用途边界

| 场景 | 是否用 MCP |
|------|-----------|
| 首次编译 | ❌ 不需要 |
| 编译失败 | ✅ 用 `deveco-mcp` 的 `check` 工具做静态诊断（CLI 口径 / 失败分类见 `ai-team-dev-pt-hm-env` E2） |
| 编译成功，后续日常编译 | ❌ 不需要 — 直接执行编译命令 |

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

> `<project_root>` = 当前鸿蒙项目根目录，`<skill_dir>` = `ai-team-dev-pt-hm-build` skill 所在目录。

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
5. clean build 通过后继续下一阶段（受影响范围的回归验证不属本 skill 职责）
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
