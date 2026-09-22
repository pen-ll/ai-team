---
name: ai-team-tool-report
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  AI 多 Agent 协同的文档沉淀规范，统一各角色产出物的元信息模板与写入路径（路径由 PM 经 artifact_dir 传入）。
  触发场景：产出物归档、需统一报告元信息模板与写入路径时取用，跨领域通用。
---

# AI 多 Agent 协同 — 文档沉淀规范

## 触发

产出物归档时取用本规范：统一写入路径、元信息模板与格式要求。

## 核心原则

**所有 AI Team 产出物必须写入项目目录 `${workspaceFolder}/{artifact_dir}/`**，确保用户在项目内可见。

`{artifact_dir}` 由 PM 经 spawn prompt 传入；未显式传入时按领域默认值推导（`{任务标识}` 由 PM 生成，格式 `{slug}-{YYMMDD}`）：

| 领域 | artifact_dir |
|------|--------------|
| 通用（`领域=generic`） | `docs/ai-team/{任务标识}` |
| 开发（`领域=development`） | `docs/ai-team-dev/{任务标识}` |
| 写作（`领域=writing`） | `docs/ai-team-write/{任务标识}` |

> artifact 目录（`brain/xxx/docs/...`）仅作为临时工作区，不应作为最终产出物路径。

---

## 一、目录与写入

```bash
mkdir -p ${workspaceFolder}/{artifact_dir}
```

所有产出物使用项目绝对路径：`${workspaceFolder}/{artifact_dir}/{文件名}`

写入后用 `list_dir` 确认文件存在。

---

## 二、统一元信息模板

所有角色报告必须包含以下元信息块（字段按角色调整，顺序保持一致）：

```markdown
## 元信息
- 角色：{角色名}
- 领域：{generic/development/writing}
- 平台/环境：{harmony/ios/android/web/server/...}   仅开发领域
- 任务标识：{slug}-{YYMMDD}（如 refactor-260901）   取自注入参数 `task_id`
- 需求来源：{本次上游产出路径}（各领域取该领域蓝图文档；具体路径由领域角色 skill 约定）
- 状态：{编辑中|定稿}
- 版本：v{N}
- 生成时间：{timestamp}
- 置信度：{XX}%
```

**字段说明**：

| 字段 | 必填 | 说明 |
|------|------|------|
| 角色 | ✅ | 角色标识（通用：角色名；开发：designer/coder/tester/reviewer） |
| 领域 | ✅ | `generic` / `development` |
| 平台/环境 | 仅 `development` | 目标运行环境标识；通用领域**省略此字段** |
| 任务标识 | ✅ | 本次任务的目录标识，格式 {主题slug}-{YYMMDD}（如 refactor-260901），同时作为产出物子目录名，避免同 workspace 多任务互相覆盖/污染 |
| 需求来源 | ✅ | 上游文档路径（designer 跳过此项） |
| 状态 | ✅ | `编辑中` / `定稿`；**只有「定稿」才可作为下游输入** |
| 版本 | ✅ | `v{N}`；每轮返工修改 **+1** |
| 生成时间 | ✅ | ISO 时间戳 |
| 置信度 | ✅ | 自评分数 |

> **任务标识隔离**：{任务标识} 由 PM 在创建团队时从需求提炼主题 slug + 拼接日期 YYMMDD 确定（如 refactor-260901），随 spawn prompt 传给所有角色。各角色产出物统一写入以 {任务标识} 命名的子目录，下游只读本任务子目录，避免同一 workspace 多任务并存时互相覆盖、互相污染。

### 落盘一致性（[门禁]）

| 规则 | 说明 |
|------|------|
| `编辑中` | 报告定稿前**不得**作为下游输入；本角色可自由改（含 `replace_in_file`） |
| `定稿` | 完成信号须声明 `状态:定稿 版本:v{N}`；下游读取后**须核对**状态与版本 |
| 定稿后修改 | **一律整份 `write_to_file` 覆盖 + 版本 +1**（禁止局部改造成半成品视图），并同步通知受影响方 |
| 读前校验 | 读到「编辑中」或版本低于通知值 → **不采用**，等待新版本（`global-rule` §十一 11.2） |

### 返工台账（[门禁]）

涉及跨角色问题的报告**必须**含台账段——**未登记 = 未发生**（计数与收敛见 `global-rule` §十一 11.3 / 11.4）：

| 角色 | 段 | 字段 |
|------|----|------|
| 提出方（审查维度） | `## 问题清单` | `issue-ID \| 判据/门禁项 \| 问题 \| 级别 \| 状态 \| 复现版本 \| 轮次` |
| 产出方 | `## 修复记录` | `issue-ID \| 修复版本 \| 改动摘要 \| 状态` |

---

## 三、各角色报告特有内容

### 通用领域（`领域=generic`）

| 报告 | 内容 |
|------|------|
| `designer-report.md` | 元信息 + 需求描述 + 详细需求（期望产出 / 范围与边界 / 成功标准 / 约束条件 / 参考材料）+ 角色清单 + 子目标拆分 + 下游建议 |
| `{role}-report.md`（动态角色） | 元信息 + 验收标准符合情况 + 产出说明 + 结论 |

### 开发领域（`领域=development`）

各报告（`designer-report.md` / `coder-report.md` / `coder-report-task-{N}.md` / `tester-report.md` / `reviewer-report.md` / `web-req-report.md`）的章节结构由**对应领域角色 skill 定义**，本节不重复。

### 写作领域（`领域=writing`）

各报告（`editor-report.md` / `writer-report.md` / `critic-report-ch{N}.md` / `reader-report-ch{N}.md` / `market-report.md` / `commercial-report.md`）与设定集五件套的章节结构由**对应领域角色 skill 定义**，本节不重复。

---

## 四、格式规范

| 规则 | 说明 |
|------|------|
| 结构化优先 | 表格 > 列表 > 段落 |
| 禁止贴代码 | 技术方案只列文件清单 + 要点，不贴完整代码 |
| 禁止诊断过程 | 编译/测试报告只写结果，不写尝试过程 |
| 禁止跨文档重复 | 交付报告引用其他报告路径，不复制内容 |

---

## 五、产出物清单

### 通用领域

| 角色 | 产出物 | 路径 |
|------|--------|------|
| designer | 需求文档 | `{artifact_dir}/designer-report.md` |
| 动态角色 | 角色报告 | `{artifact_dir}/{role}-report.md` |

### 开发领域 / 写作领域

产出物路径由**各领域角色 skill 的配置段**声明（`artifact_path` / `item_report_pattern` 等），本节不重复；目录一律为 `{artifact_dir}`。

---

## 禁止事项

| ❌ 禁止 | ✅ 正确 |
|----------|--------|
| 写入 artifact 目录 | 写入 `${workspaceFolder}/{artifact_dir}/` |
| 仅写相对路径 | 使用绝对路径 |
| 写入后不验证 | 用 `list_dir` 确认文件存在 |
| 元信息格式不一致 | 统一使用本规范的元信息模板 |
| 通用领域填写平台字段 | 通用领域省略「平台/环境」字段 |
