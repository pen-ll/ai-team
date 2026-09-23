---
name: ai-team-dev-pt-hm-template-v2-custom
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — V2 业务自定义模板入口，按业务场景组合目录规范 / MVVM 骨架 / 请求模板。
  触发场景：鸿蒙开发选择「V2 业务自定义模板」时加载。
---

# 个性化业务模板（ai-team 体系）

根据需求场景，分发到对应的子模板 skill。

## 子模板清单

| Skill | 用途 | 调用时机 | 说明 |
|-------|------|---------|------|
|`ai-team-dev-pt-hm-template-v2-custom-mvvm` | MVVM 架构（Page + ViewModel + DataModel 三层） | **始终加载** | 提供三层骨架 |

> 各子模板按需通过 `use_skill` 加载，详见下方编码流程。



