---
name: ai-team-pt-hm-project-module-init
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — 项目内新增 HAR/HSP 模块。
  触发场景：需要在鸿蒙项目中新建模块时加载。
---

# 鸿蒙项目模块初始化

## 用途

在现有 HarmonyOS 项目中创建新的 HAR（静态共享包）或 HSP（动态共享包）模块。

> **默认创建 HAR**。仅当用户明确提到"HSP"、"动态共享包"、"独立路由"时才创建 HSP。

## 触发条件

触发场景：
- 需求类型为"新模块"
- 需要创建独立的工具模块、业务模块、UI 组件库等

## 创建流程

### 1. 创建模块目录结构

模块名为 `<moduleName>`，在项目根目录下创建：

```
<moduleName>/
├── build-profile.json5     # apiType: "stageMode"
├── hvigorfile.ts           # harTasks (HAR) 或 hspTasks (HSP)
├── oh-package.json5        # name: "<moduleName>", main: "Index.ets"
├── Index.ets               # export 公共 API
├── .gitignore
├── consumer-rules.txt
├── obfuscation-rules.txt
└── src/main/
    ├── module.json5        # type: "har" 或 "hsp"
    ├── ets/                # 源代码
    └── resources/          # 资源文件
```

### 2. 配置文件模板

**build-profile.json5：**
```json5
{
  "apiType": "stageMode",
  "buildOption": {
    "arkOptions": {
      "byteCodeHar": false
    }
  },
  "targets": [{ "name": "default" }]
}
```

**hvigorfile.ts（HAR 模块）：**
```typescript
import { harTasks } from '@ohos/hvigor-ohos-plugin';
export default { system: harTasks, plugins: [] }
```

**hvigorfile.ts（HSP 模块）：**
```typescript
import { hspTasks } from '@ohos/hvigor-ohos-plugin';
export default { system: hspTasks, plugins: [] }
```

**oh-package.json5：**
```json5
{
  "name": "<moduleName>",
  "version": "1.0.0",
  "description": "",
  "main": "Index.ets",
  "author": "",
  "license": "",
  "dependencies": {}
}
```

**src/main/module.json5（HAR）：**
```json5
{
  "module": {
    "name": "<moduleName>",
    "type": "har",
    "deviceTypes": ["default", "tablet", "2in1"]
  }
}
```

> HSP 模块将 `"type"` 改为 `"hsp"`，保留 `"deliveryWithInstall": true, "installationFree": false`。

**Index.ets（入口文件）：**
```typescript
// 占位导出 — AI 编码阶段会在此追加实际 API
// 用法（编码完成后）：
//   export { <Feature>ViewModel } from './src/main/ets/viewmodels/<Feature>ViewModel';
//   export { <Feature>DataModel } from './src/main/ets/datamodels/<Feature>DataModel';
//   export type { I<Feature>Data } from './src/main/ets/model/<Feature>Types';
```

> 占位 Index.ets 可正常 build（HAR 允许空 Index.ets），功能代码在编码阶段完成后补全。

### 3. 注册模块到项目

创建完成后，必须在以下 3 个位置注册模块：

**① 根 `build-profile.json5` — modules 数组追加：**
```json5
{
  "name": "<moduleName>",
  "srcPath": "./<moduleName>",
  "targets": [{ "name": "default", "applyToProducts": ["default"] }]
}
```

**② 根 `oh-package.json5` — dependencies 追加：**
```json5
"<moduleName>": "file:./<moduleName>"
```

**③ 入口模块 `oh-package.json5`（如 `entry/oh-package.json5`）— dependencies 追加：**
```json5
"<moduleName>": "file:../<moduleName>"
```

### 4. 预装第三方包

模块注册完成后，调用 `use_skill ai-team-pt-hm-project-package-init`，让用户选择预装的 OHPM 包。

### 5. 验证编译

**[门禁] 必须显式 `use_skill ai-team-pt-hm-build`**，按其中探测的路径与编译命令验证模块可编译（BUILD SUCCESSFUL），禁止自行内联编译命令。

## HAR vs HSP 选择

| 场景 | 推荐类型 |
|------|---------|
| 工具类、通用组件、业务逻辑复用 | HAR（静态共享包） |
| 需要独立路由、独立页面 | HSP（动态共享包） |
| 模块间共享代码但不需要独立部署 | HAR |
| 需要按需加载、减少包体积 | HSP |

默认创建 HAR。
