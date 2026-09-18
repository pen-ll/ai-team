---
name: ai-team-dev-pt-hm-arkts-performance
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — ArkUI 性能优化规则。
  触发场景：鸿蒙 UI 开发涉及渲染性能优化时加载。
---

# ArkUI 性能优化规则（ai-team 体系）

基于华为官方《组件内状态管理常见问题》文档整理。这些问题是导致线上
appfreeze、掉帧、内存泄漏的主要原因。

> **标记说明**：🔵 = V1/V2 公共规则，必须遵守；🟢 = 仅 V2 项目适用；🟠 = 仅 V1 项目适用。

---

## 🔵 1. 禁止在 UI 模板表达式中直接更新状态变量

严禁在 Text、Image 等 UI 组件的属性/内容表达式中直接修改状态变量（如 `++`、`--`、赋值等）。
这属于在 build() 渲染过程中修改状态，会触发与第 1 条相同的 appfreeze 错误。

```typescript
// ❌ 错误 — 在 UI 模板表达式中直接修改状态变量
Text(`${this.count++}`)       // 禁止！自增操作修改了状态
Text(`${this.count--}`)       // 禁止！自减操作修改了状态
Text(`${this.obj.value = 2}`) // 禁止！赋值操作修改了状态
Button(`${++this.index}`)     // 禁止！前置自增修改了状态

// ✅ 正确 — 状态更新放在事件回调或生命周期中
Text(`${this.count}`)         // 只读取，不修改
Button('+1').onClick(() => { this.count++ })  // 修改放在回调中
```

---

## 🔵 2. 注册回调必须解注册，否则内存泄漏

在 `aboutToAppear` 中注册的监听/回调，必须在 `aboutToDisappear` 中取消。

---


## 🔵 3. 循环中禁止频繁读取状态变量，且 减少对状态变量的直接赋值，使用临时变量
状态变量即对象为@Observed/@ObservedV2 代理对象的@Trace字段，读取和赋值该字段都会触发性能开销。循环中频繁读取或赋值会导致性能问题。

---

---

## 🟠 V1 特有规则

### 🟠 V1-1. 避免 `a.b(this.object)` 调用——会导致 UI 不刷新

状态变量代理对象传入普通函数后会被转为原始对象，修改原始对象不触发 UI 刷新。

```typescript
// ❌ 错误 — balloon 被转为原始对象，修改不触发刷新
this.reduceVolume(this.balloon);  // reduceVolume 内修改 balloon.volume

// ✅ 正确 — 先赋值给临时变量
let temp = this.balloon;
temp.volume--;
this.balloon = temp;
```

### 🟠 V1-2. 子组件只读时用 `@ObjectLink` 替代 `@Prop`

`@Prop` 会深拷贝数据，增加组件创建开销。子组件不需要修改数据时用 `@ObjectLink`。

---
