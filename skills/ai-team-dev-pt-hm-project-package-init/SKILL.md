---
name: ai-team-dev-pt-hm-project-package-init
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — 项目第三方包预装。
  触发场景：需要为鸿蒙项目预装第三方依赖包时加载。
---

# 鸿蒙项目第三方包预装

## 用途

在项目初始化/模块创建完成后，引导用户选择需要预装的第三方 OHPM 包，并通过 `ohpm install` 直接安装。

## 触发条件

触发场景：
- 新项目创建完成后
- 新模块创建完成后
- 用户提到"需要引用 xxx 库"时

## 执行流程

### 1. 多选弹窗（收集用户需求）

使用 `ask_followup_question`，**必须设置 `multiSelect: true`** 让用户可以勾选多个包。最后一个选项固定为"不需要，跳过所有"。

> **⚠️ 选项展示规则**：调用 `ask_followup_question` 时，必须按下表**完整展示全部选项**，不可截断、合并、筛选或缩减选项数量。

**预设组件多选（multiSelect: true）：**

| 选项 |
|------|
| `@hadss/hmrouter` |
| `@pura/harmony-utils` |
| 不需要，跳过所有 |

### 2. 汇总与确认

收集多选结果，排除"不需要，跳过所有"，向用户展示最终要安装的包列表，确认后执行安装。

### 3. 执行安装

**重要**：Agent 的终端是非登录 shell，不会 source `.zshrc`/`.bash_profile`，因此 `ohpm` 可能不在 PATH 中。执行安装前必须先定位 ohpm 完整路径：

```bash
# 定位 ohpm：分平台完整路径探测（macOS 无后缀 ohpm；Windows 为 ohpm.bat）
OHPM="/Applications/DevEco-Studio.app/Contents/tools/ohpm/bin/ohpm"                            # macOS 默认
[ -f "$OHPM" ] || OHPM="$HOME/Applications/DevEco-Studio.app/Contents/tools/ohpm/bin/ohpm"      # macOS 用户目录
[ -f "$OHPM" ] || OHPM="/c/Program Files/Huawei/DevEco Studio/tools/ohpm/bin/ohpm.bat"          # Windows (Program Files)
[ -f "$OHPM" ] || OHPM="/d/DevEco Studio/tools/ohpm/bin/ohpm.bat"                               # Windows (D 盘自定义)
# 仍未找到 → ask_followup_question 让用户提供 ohpm 完整路径
```

> 注意：Windows 下调用 `.bat` 需通过 `cmd /c "$OHPM" <args>` 或 `"$OHPM" <args>`（Git Bash 可直接执行 .bat）。

对确认的每个包，使用完整路径执行：

```bash
cd <项目根目录> && $OHPM install <package-name>
```

> `ohpm install <包名>` 会自动拉取该包的最新版本，无需指定版本号。

安装完成后提示用户检查 `oh-package.json5` 中写入的版本号是否符合预期。

### 4. 添加模块引用

如果当前有目标模块（如新建的 HAR 模块），询问用户是否需要在模块 `oh-package.json5` 中添加这些包的依赖引用。
