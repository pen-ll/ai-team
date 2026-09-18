---
name: ai-team-dev-pt-hm-arkts-security
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — ArkTS 安全编码规范，通用安全规范见 ai-team-tool-security。
  触发场景：鸿蒙开发涉及安全场景时加载。
---

# ArkTS 安全编码规范（鸿蒙特化）

本 skill 仅包含鸿蒙特有安全规则。通用安全规范（死循环检测、黑灰产禁止、敏感信息保护等）见 `ai-team-tool-security`。

---

## 第三方包安装白名单

AI **不得**自行执行 `ohpm install`，除非满足以下任一条件：

- 包名在预设白名单中（`@hadss/`、`@pura/`、`@ohos/` 开头）
- 用户**主动明确要求**安装该包

其他任何包（包括 `@ohos/` 以外的官方包、三方包、不确定来源的包），AI 必须先**列出包名和来源**，等待用户确认后才能安装。

```
❌ 错误：AI 自行 ohpm install some-package
✅ 正确：AI 提示"检测到需要安装 some-package，来源为 xxx，是否继续？"
```
