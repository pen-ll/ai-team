---
name: ai-team-pt-hm-template-v2
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — ArkUI V2 官方 MVVM 编码模板。
  触发场景：鸿蒙开发采用 ArkUI V2 官方模板时加载。
---

# ArkUI V2 MVVM 编码模板（ai-team 体系）

基于华为官方 V2 状态管理 Demo 提炼。**核心原理**：ViewModel 中 `@Trace` 属性变更会自动刷新 UI，开发者只管改数据，无需手动通知。

## 架构

```
model/          → @ObservedV2 数据类，需 UI 响应的属性加 @Trace
viewmodel/      → @ObservedV2 + @Trace，改数据即刷新 UI
pages/          → @ComponentV2 持有 ViewModel，组装 UI
```

> **V2 装饰器规则**：任何需要 UI 响应变化的类对象都必须加 `@ObservedV2`，其内部需要触发 UI 刷新的属性必须加 `@Trace`。包括：
> - ViewModel（直接由 Page `@Local` 持有）→ `@ObservedV2`
> - ViewModel 内 `@Trace` 引用的子对象（如 `state: CalculatorState`）→ 子对象类也必须 `@ObservedV2`，子对象属性加 `@Trace`
> - 数组元素如果是对象且属性需要响应式更新 → 元素类也必须 `@ObservedV2`

## 核心链路（只需关注这 3 步）

### 1. Model — 需 UI 响应时加 @ObservedV2 + @Trace

```typescript
// 当 Model 作为 ViewModel 的 @Trace 属性时，类本身也需要 @ObservedV2
// 仅需 UI 刷新的属性加 @Trace，不需要的（如 id）不加
@ObservedV2
export default class <Feature>Model {
  id: string = '';
  @Trace title: string = '';
}
```

> **判断规则**：按属性是否需要 UI 自动刷新来加装饰器，不是全加：
> - 需要 UI 刷新 → 类加 `@ObservedV2`，该属性加 `@Trace`（如 title、display、operator）
> - 不需要 UI 刷新（如 id、静态配置、按钮布局等）→ 不加装饰器

### 2. ViewModel — 改数据自动刷新

两种常见形态：

**列表型**（管理集合）：

```typescript
@ObservedV2
export default class <Feature>ListViewModel {
  @Trace items: <Feature>Model[] = [];

  addItem(item: <Feature>Model): void { this.items.push(item); }
  removeItem(index: number): void { this.items.splice(index, 1); }

  updateTitleByIndex(index: number, newTitle: string): void {
    if (this.items[index]) {
      this.items[index].title = newTitle;
    }
  }
}
```

**单对象型**（直接管理字段）：

```typescript
@ObservedV2
export default class <Feature>ViewModel {
  @Trace title: string = '';
  @Trace isDone: boolean = false;

  updateTitle(title: string): void { this.title = title; }
  toggleDone(): void { this.isDone = !this.isDone; }
}
```

> **这就是 V2 的核心**：`@ObservedV2` + `@Trace` 标记的属性，无论是数组 push/splice、还是单个字段赋值，**改完自动刷新 UI**。开发者只管改数据，不需要手动调 `setState` 或事件通知。

### 3. Page — 持有 ViewModel，组装 UI

```typescript
@ComponentV2
export struct <Feature>Page {
  @Local vm: <Feature>ListViewModel = new <Feature>ListViewModel();

  aboutToAppear(): void { this.vm.loadData(); }

  build() {
    Column() {
      // 列表 — 用 Repeat（V2 版 ForEach）
      // 点击修改 @Trace 属性，UI 自动刷新
      List() {
        Repeat(this.vm.items)
          .each((obj: RepeatItem<<Feature>Model>) => {
            ListItem() {
              Text(obj.item.title)
                .onClick(() => { this.vm.updateTitleByIndex(obj.index, `${obj.item.title}-✓`) })
            }
          })
          .key((item, index) => item.id || index.toString())
      }

      // 输入 + 按钮 — 直接改 ViewModel
      Button('添加').onClick(() => {
        let item = new <Feature>Model();
        item.id = Date.now().toString();
        item.title = '新项';
        this.vm.addItem(item);
      })
    }
  }
}
```

> View 组件（TitleView、ListView 等）按需拆出为 `@ComponentV2`，用 `@Param` 下传数据、`@Event` 上传事件。简单页面可直接写在 build() 里。
> 数据加载（JSON/Preferences/API）及具体业务逻辑由 AI 与用户开发过程中确认，模板只定义 MVVM 骨架。

## UI 布局规范

### 尺寸策略决策表

| 场景 | 策略 | 说明 |
|------|------|------|
| 页面根容器 | `width('100%')` + `height('100%')` | 撑满全屏 |
| 网格布局（按钮阵列等） | 用 `layoutWeight` / `flexGrow` 按比例分配，**不用固定 px/vp** | 避免不同屏幕尺寸下溢出或留白 |
| 需要精确比例的组件（如圆形按钮） | `aspectRatio(1)` + `layoutWeight` | 保持正方形同时自适应 |
| 固定间距 | `margin` / `padding` 用 vp 固定值 | 间距通常无需自适应 |
| 文本字号 | 用 `vp` 固定值或 `fontSize` 自适应函数 | 大屏可适当放大 |
| 仅一屏内必须完整显示的布局 | 使用 `Flex` / `layoutWeight` 确保不溢出 | 计算器、仪表盘等场景 |

### 常见错误

| 错误 | 后果 | 修复 |
|------|------|------|
| 多列按钮用 `width('25%')` + `margin(6)` | 4 × (25% + 12px) > 100%，溢出屏幕 | 改用 `layoutWeight(1)` 自适应列宽 |
| 按钮区域无滚动容器 | 溢出部分不可见 | 用 `layoutWeight` 确保内容在一屏内，或用 `Scroll` 包裹 |
| 只用 `aspectRatio` 无宽度约束 | 按钮可能过大或过小 | 先通过 `layoutWeight` 确定宽度，再用 `aspectRatio` 控制高宽比 |
