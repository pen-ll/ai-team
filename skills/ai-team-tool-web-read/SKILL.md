---
name: ai-team-tool-web-read
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  AI 多 Agent 协同的网页文档读取工具，将网页需求文档转换为 Markdown 存入项目目录并下载图片为本地文件。
  触发场景：需求文档来自公开或内网 URL 时加载（自动切换 Playwright 浏览器）。
---

# 网页文档读取工具

## 触发

当需求收集阶段用户提供 URL 时自动触发。

## 读取策略

| 场景 | 方式 | 触发条件 |
|------|------|----------|
| 公开 URL | `web_fetch` | 默认先尝试 |
| 内网/VPN/超时 | Playwright headless | `web_fetch` 失败后降级 |

> 跳过 web_fetch 的域名： 内网 IP（`172.x` / `192.168.x` / `10.x`）。

## 流程

### 步骤 1：尝试 web_fetch

跳过条件命中 → 直接进入步骤 2。否则：
```
web_fetch(url, "以 Markdown 格式完整提取页面正文内容...")
```
- 返回有效内容 → 步骤 3
- 失败/超时 → 步骤 2

### 步骤 2：Playwright 提取

**一次性执行，不拆分子步骤。**

#### 2.1 环境准备（首次或 playwright 不可用时）

```bash
cd /tmp && npx playwright --version 2>/dev/null || (npm init -y && npm install playwright && PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/ npx playwright install chromium)
```

#### 2.2 部署 + 运行提取脚本

首次或脚本更新后，复制到 `/tmp`（确保 playwright 模块路径可解析）。已存在则跳过复制：

```bash
[ -f /tmp/run-extract.mjs ] || cp {skills_dir}/ai-team-tool-web-read/extract.mjs /tmp/run-extract.mjs
cd /tmp && node run-extract.mjs "{url}" "{output_dir}" [cookie文件路径]
```

> `{output_dir}` 由调用方经 **`output_dir` 参数**注入（**不得硬编码领域路径**）；调用方通常传 `{artifact_dir}`。
> 复制到 `/tmp` 是因为 playwright 包安装在该目录，ESM 模块需在同级或子级 `node_modules` 下解析。

脚本功能（单次执行完成所有提取，不拆步子）：
- 登录检测（LOGIN_REQUIRED → exit 1）
- 自动检测页面类型（Axure 原型 / 普通页面）
- Axure 四层降级：`encodeURIComponent(pagename).html` → `pagename.replace('/', '_').html` → 从 `data/document.js` 解析 → Axure player
- 图片下载到 `web-req-assets/`
- 结果写入 `/tmp/web-read-result.json`

> **退出码 1 + stdout 含 `LOGIN_REQUIRED`** → 进入登录处理流程（见下文）。
> **stdout 含 `===ERROR===`** → 按异常处理表执行。

### 步骤 3：转换为 Markdown + 产出文档

读取 `/tmp/web-read-result.json`，转换为 Markdown 写入 `{output_dir}/web-req-report.md`：

**多页面（Axure）**：
```markdown
# 网页需求文档
## 元信息
- 来源 URL：{url}
- 读取方式：playwright
- 页面类型：axure
- 读取时间：{ISO timestamp}

## {页面1名称}
{文本内容，图片引用 web-req-assets/{screenshot} + web-req-assets/{img.local}}

## {页面2名称}
...
```

**单页面**：
```markdown
# 网页需求文档
## 元信息
- 来源 URL：{url}
- 读取方式：{web_fetch / playwright}
- 读取时间：{ISO timestamp}

## 正文内容
{Markdown 内容}
```

转换规则：保留标题/列表/表格结构 → 忽略导航/页脚/脚本 → 图片引用本地路径。

写入后用 `list_dir` 确认文件存在，清理临时文件：

```bash
rm -f /tmp/run-extract.mjs /tmp/web-read-result.json
```

## 登录处理

提取脚本 exit 1 且 stdout 含 `LOGIN_REQUIRED` 时：

```
ask_followup_question(questions=[{
  question: "该页面需要登录才能访问。请选择处理方式：",
  options: [
    "我来粘贴 Cookie（浏览器开发者工具 → Application → Cookies 复制）",
    "我手动登录后截图给你",
    "跳过该网页，我直接描述需求"
  ]
}])
```

| 用户选择 | 处理 |
|----------|------|
| 粘贴 Cookie | 将 Cookie 写入 `/tmp/web-read-cookies.json`，重新执行 `cd /tmp && node run-extract.mjs ... /tmp/web-read-cookies.json` |
| 手动截图 | 用户提供截图 → `read_file` 读取 → AI 理解后产出文档 |
| 跳过 | 返回"URL 读取失败"，designer 继续对话 |

## 异常处理

| 异常 | 处理 |
|------|------|
| Playwright 安装失败 | 告知用户，降级为用户截图方案 |
| 页面加载超时 | 重试 1 次（`extract.mjs` 内已含 timeout），仍失败告知用户 |
| 图片下载失败 | 跳过，Markdown 中保留原始 URL |
