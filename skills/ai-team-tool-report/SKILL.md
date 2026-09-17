---
name: ai-team-tool-report
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  AI 多 Agent 协同的文档沉淀规范，统一各角色产出物的元信息模板与写入路径（路径由 PM 经 artifact_dir 传入）。
  触发场景：PM 与所有 ai-team-role-* 角色产出报告时引用，跨领域通用。
---

# AI 多 Agent 协同 — 文档沉淀规范

## 触发

由 PM 与各 `ai-team-role-*` 角色 skill 在"产出物归档"步骤中引用。

## 核心原则

**所有 AI Team 产出物必须写入项目目录 `${workspaceFolder}/{artifact_dir}/`**，确保用户在项目内可见。

`{artifact_dir}` 由 PM 经 spawn prompt 传入；未显式传入时按领域默认值推导（`{任务标识}` 由 PM 生成，格式 `{slug}-{YYMMDD}`）：

| 领域 | artifact_dir |
|------|--------------|
| 通用（`领域=generic`） | `docs/ai-team/{任务标识}` |
| 开发（`领域=development`） | `docs/ai-team-dev/{任务标识}` |

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
- 领域：{generic/development}
- 平台/环境：{harmony/ios/android/web/server/...}   仅开发领域
- 任务标识：{slug}-{YYMMDD}（如 refactor-260901）
- 需求来源：{artifact_dir}/designer-report.md
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
| 生成时间 | ✅ | ISO 时间戳 |
| 置信度 | ✅ | 自评分数 |

> **任务标识隔离**：{任务标识} 由 PM 在创建团队时从需求提炼主题 slug + 拼接日期 YYMMDD 确定（如 refactor-260901），随 spawn prompt 传给所有角色。各角色产出物统一写入以 {任务标识} 命名的子目录，下游只读本任务子目录，避免同一 workspace 多任务并存时互相覆盖、互相污染。

---

## 三、各角色报告特有内容

### 通用领域（`领域=generic`）

| 报告 | 内容 |
|------|------|
| `designer-report.md` | 元信息 + 需求描述 + 详细需求（期望产出 / 范围与边界 / 成功标准 / 约束条件 / 参考材料）+ 角色清单 + 子目标拆分 + 下游建议 |
| `{role}-report.md`（动态角色） | 元信息 + 验收标准符合情况 + 产出说明 + 结论 |

### 开发领域（`领域=development`）

#### designer-report.md — 需求文档

元信息 + 需求描述 + 详细需求（运行环境/技术栈/交互要求/UI参考/明确不做）+ 下游建议

> 复杂需求（完整模式）额外包含 `## 任务清单` 表格（任务ID/名称/范围/前置依赖/验收标准），未拆分则省略该章节。

#### coder-report.md — 技术方案

元信息 + 技术选型（语言/框架/构建工具）+ 文件清单（表格）+ 实现要点 + 已知限制

> 多任务模式：coder 每任务产出 `coder-report-task-{N}.md`（元信息标注任务ID），全部任务完成后产出**汇总** `coder-report.md`（任务实现总览表 + 引用各 task 报告路径）。汇总文件必出，下游校验依赖它。

#### tester-report.md — 测试报告

元信息 + 测试用例清单（表格：#/用例名/覆盖功能/预期结果/状态）+ **边界维度覆盖表**（维度/适用性/对应用例编号或不适用原因）+ 测试结果（Tests run/Failure/Pass）+ 未覆盖项清单（含不可构造边界与原因）

#### reviewer-report.md — 交付报告

元信息 + 交付前检查清单 + 启动验证 + 交付物清单 + 总结

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

### 开发领域

| 角色 | 产出物 | 路径 |
|------|--------|------|
| designer | 需求文档 | `{artifact_dir}/designer-report.md` |
| designer | 网页需求文档（工具产出） | `{artifact_dir}/web-req-report.md` |
| coder | 技术方案 | `{artifact_dir}/coder-report.md` |
| coder（多任务） | 单任务技术方案 | `{artifact_dir}/coder-report-task-{N}.md` |
| tester | 测试报告 | `{artifact_dir}/tester-report.md` |
| reviewer | 交付报告 | `{artifact_dir}/reviewer-report.md` |

> 多任务模式（需求文档含 `## 任务清单`）命名约定：
> - coder 每任务产出 `coder-report-task-{N}.md`，全部完成后汇总为 `coder-report.md`
> - tester / reviewer 沿用 `tester-report.md` / `reviewer-report.md` 原名，元信息标注覆盖任务范围

---

## 禁止事项

| ❌ 禁止 | ✅ 正确 |
|----------|--------|
| 写入 artifact 目录 | 写入 `${workspaceFolder}/{artifact_dir}/` |
| 仅写相对路径 | 使用绝对路径 |
| 写入后不验证 | 用 `list_dir` 确认文件存在 |
| 元信息格式不一致 | 统一使用本规范的元信息模板 |
| 通用领域填写平台字段 | 通用领域省略「平台/环境」字段 |
