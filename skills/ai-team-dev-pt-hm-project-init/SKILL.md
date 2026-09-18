---
name: ai-team-dev-pt-hm-project-init
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — 项目初始化与设备适配。
  触发场景：新建鸿蒙项目或适配新设备时加载。
---

# 鸿蒙项目初始化（ai-team 体系）

## 新项目创建

默认目标 SDK 为 `5.0.3`（API Level 15），直接通过 `--api-level` 指定。

### 创建方式选择（根据工作区内容决定）

**检测规则**：用 `list_dir` 扫描 `${workspaceFolder}`，区分以下三类场景：

| 工作区内容 | 走哪条路 |
|-----------|---------|
| 仅有 `.codebuddy/` 和/或 `docs/`（ai-team 体系产生的目录） | → **方式 A（推荐）** |
| 有其他内容（`.git`、`package.json`、项目文件等） | → **方式 B** |
| 完全为空 | → **方式 A** |

---

**方式 A：临时创建 → 移入工作区（`${workspaceFolder}` = 项目根）**

适用：工作区仅有 ai-team 体系文件（`.codebuddy/`、`docs/`），或完全为空。

**核心思路**：不在 workspace 中直接创建（避免 CLI 拒绝非空目录），而是在 workspace 内建一个临时子目录，创建完成后移出内容并清理。

> **安全说明**：临时目录建在 workspace 内部（`.temp-project-init/`），所有文件操作（`mv`、`rm`）均为 workspace 内部操作，不触发外部文件注入警告。

---

**1. 创建项目到 workspace 内部临时目录**（需用户点「运行」确认 — `npx` 执行外部 CLI）：

```bash
mkdir -p <workspace>/.temp-project-init
npx @deveco-test/deveco-cli@latest create \
  --app-name <Name> --bundle-name <bundle> \
  --project-path <workspace绝对路径>/.temp-project-init \
  --api-level 15
```

---

**2. 冲突检测**（`requires_approval: false` — 纯读取操作）：

[门禁] 移入前，检查临时目录中项目文件与 workspace 已有文件的冲突（排除 `.codebuddy/`、`docs/`、`.temp-project-init/`）：

```bash
find <workspace>/.temp-project-init -mindepth 1 -maxdepth 1 -exec basename {} \; | \
while read f; do
  if [ -e "<workspace>/$f" ]; then
    echo "CONFLICT: $f"
  fi
done
```

| 检测结果 | 动作 |
|---------|------|
| 无冲突 | 直接进入步骤 3（移入） |
| 有冲突 | **阻塞**：`ask_followup_question` 让用户逐文件决定 |

**冲突处理选项**：

```
标题: "文件冲突"
问题: "项目文件「{文件名}」与工作区已有文件同名，如何处理？"
选项: [
  "覆盖——用项目文件替换现有文件",
  "跳过——保留现有文件，不移入该项目文件",
  "全部覆盖——所有冲突均用项目文件替换",
  "全部跳过——所有冲突均保留现有文件",
  "终止——取消本次项目创建，保留所有现有文件"
]
```

> 用户选"终止" → 清理 `rm -rf <workspace>/.temp-project-init`（`requires_approval: false`，workspace 内部清理），退出流程。

**逐文件策略**：冲突列表 ≤ 3 个时逐个询问，> 3 个时一轮显示全部并让用户按文件选择或批量应用。

---

**3. 移入工作区**（`requires_approval: false` — workspace 内部文件移动）：

```bash
# 将项目文件移入 workspace 根目录
find <workspace>/.temp-project-init -mindepth 1 -maxdepth 1 -exec mv {} <workspace>/ \;
# 清理临时目录（workspace 内部，安全）
rm -rf <workspace>/.temp-project-init
```

---

**4. 清理移植残留**（`requires_approval: false`）：

移除 DevEco CLI 可能残留的 `sdk.dir=` 路径：

```bash
sed -i '' '/sdk\.dir=/d' <workspace>/local.properties 2>/dev/null
```

---

> **结果**：`${workspaceFolder}` = 项目根，`docs/ai-team-dev/{任务标识}/` 在项目内，MCP LSP 路径天然正确。
>
> **权限总结**：步骤 1（`npx` 外部命令）需用户点一次「运行」，后续步骤 2-4 全部 `requires_approval: false`。

---

**方式 B：工作区有其他内容 — 先确认再创建**

[门禁] 若当前工作区有项目文件（`.git`、`package.json`、`build-profile.json5` 等），**禁止直接创建到当前工作区**。必须先 `ask_followup_question` 让用户决定：

```
标题: "工作区已有项目内容"
问题: "当前工作区已有其他项目文件，无法直接在此创建。如何处理？"
选项: [
  "创建在当前工作区内（子目录）—— 需切换到该子目录后继续",
  "创建在父目录（同级目录）—— 需切换工作区",
  "由AI清理工作区后创建（删除现有内容，风险操作）"
]
```

| 用户选择 | 执行方式 |
|----------|----------|
| 创建在当前工作区内（子目录） | `cd <工作区> && npx ... create`（不加 `--project-path`），会在工作区内创建 `<Name>/` 子目录，提示用户打开 `<工作区>/<Name>/` |
| 创建在父目录（同级目录） | `cd <工作区父目录> && npx ... create`（不加 `--project-path`），提示用户切换工作区到 `<父目录>/<Name>/` |
| 由AI清理工作区后创建 | 删除工作区中非 `.codebuddy/` 和 `docs/` 的所有内容，转回方式 A 流程 |

> **关键原则**：用户选择当前工作区是有意图的，不能未经确认就换目录。确认后再执行创建，并告知最终路径。

### API 15 创建失败的处理

**如果创建失败**（通常是 SDK 中未安装 API 15 组件），不要降级 api-level 重试。按以下步骤处理：

1. 去掉 `--api-level 15` 重新执行创建（使用 SDK 当前版本）
2. 创建成功后，手动修改 `build-profile.json5` 中的 SDK 版本：
   ```json5
   "targetSdkVersion": "5.0.3(15)",
   "compatibleSdkVersion": "5.0.3(15)",
   ```
3. 弹出确认按钮"我已修改 SDK 版本"，用户确认后继续

## 创建后必做（立即执行，不要等到编译失败再试）

### 0. 并行预检（项目目录创建后立即执行）

项目目录创建完成后，以下 3 个预检项**互不依赖、可并行执行**（用 `read_file` / `execute_command` 多工具并行调用）：

| 预检项 | 检查内容 | 工具 | 期望结果 |
|--------|----------|------|----------|
| 签名配置 | `build-profile.json5` 中 `signingConfigs` 是否非空 | `grep -c '"signingConfigs"'` | ≥ 1（用户后续在 IDE 中配置） |
| SDK 路径 | `local.properties` 是否残留 `sdk.dir=` | `read_file` | 不应存在（让 hvigor 自动发现 SDK） |
| 设备连接 | 是否有可用真机 | `hdc list targets` | 至少 1 个 device 在线 |

**预检失败的提示**：

| 预检项 | 失败处理 |
|--------|----------|
| 签名配置 | 仅记录日志，**不阻塞**流程，由"步骤 2 签名配置"统一处理 |
| SDK 路径 | 自动删除 `sdk.dir=` 行（步骤 1 处理） |
| 设备连接 | 仅记录日志，提示用户后续可继续；**不阻塞**流程 |

> **串行 vs 并行的边界**：
> - **并行**（步骤 0）：3 项预检
> - **串行**（步骤 1 → 2 → 3）：local.properties 处理 → 签名配置 → 预装包选择

### 1. local.properties 处理

删除 `sdk.dir=` 行（让 hvigor 自动发现 SDK），保留文件头部注释即可。

### 2. 签名配置

HAP 未签名无法安装到真机。**先用命令自动打开 DevEco Studio 并加载当前项目**（仅 macOS 可用——`.app` bundle 内的 GUI 启动命令；Windows 无此命令）：

```bash
# macOS（探测完整路径，命中即用）
DEVECOSTUDIO="/Applications/DevEco-Studio.app/Contents/MacOS/devecostudio"
[ -f "$DEVECOSTUDIO" ] || DEVECOSTUDIO="$HOME/Applications/DevEco-Studio.app/Contents/MacOS/devecostudio"
# 仍未找到 → ask_followup_question 让用户提供 devecostudio 完整路径
"$DEVECOSTUDIO" <项目根绝对路径> &
```

> 此命令直接打开 DevEco Studio 并加载指定项目，用户无需手动 File > Open 选择路径。
>
> **Windows**：无对应 GUI 启动命令，提示用户手动打开 DevEco Studio → File > Open 选择项目路径。

然后在 DevEco Studio 中完成签名：

- 操作：File > Project Structure > Signing Configs > 勾选 Automatically generate signature > Apply
- 用选项按钮显示"我已完成签名"，等待用户点击确认后继续

**签名验证**：用户确认后，必须验证 `build-profile.json5` 中 `signingConfigs` 是否非空：

```bash
grep -c '"signingConfigs"' <项目根>/build-profile.json5
```

- 若 `signingConfigs` 仍为空数组 `[]` → 签名未生效，弹出提示"签名配置未生效，请重新在 DevEco Studio 中配置签名"，用选项按钮让用户重新确认
- 若 `signingConfigs` 包含配置内容 → 签名已生效，继续下一步

### 3. 预装第三方包

签名确认后，调用 `use_skill ai-team-dev-pt-hm-project-package-init`，让用户选择预装的 OHPM 包。

## 常见安装错误

| 错误码 | 原因 | 解决 |
|---|---|---|
| `code:9568297` | 设备 API 版本低于 compatibleSdkVersion | 降低 compatibleSdkVersion |
| 签名失败 | 未配置签名 | 在 DevEco Studio 中配置签名 |
