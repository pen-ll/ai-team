---
name: ai-team-dev-pt-hm-arkts-v2-reactive
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — ArkTS V2 响应式数据能力（@ObservedV2 / @Trace）与普通对象转换规范。
  触发场景：选用 V2 状态管理 / V2 模板，涉及 @ObservedV2 / @Trace 响应式数据链路时加载。
---

# ArkTS V2 响应式数据能力（@ObservedV2 / @Trace）

## 一、普通对象无响应式能力

`JSON.parse` 得到的普通对象（泛型仅编译期强转，运行时非类实例）字段变更**不会**触发 UI 刷新——`@Trace` 装饰器作用在类定义上，只有 `@ObservedV2` 类的 `new` 实例才具备响应式能力。

```typescript
// ❌ 普通对象（非 @ObservedV2 实例）直接交给 @Local，字段变更不刷新
// ✅ objToClass(UserBeanV2, resp) 转成 @ObservedV2 实例后再交给 @Local
```

[门禁] 接口返回数据必须转换成为 `@ObservedV2` 类实例后再交给 UI，否则 `@Trace` 字段变更不刷新。

## 二、转换方式：批量字段转换工具与 new 构造按场景选择

不限制固定写法（`static create` 工厂方法或实例方法均可），核心目标是**结果必须是 `@ObservedV2` 类实例**。两种方式按实际场景选择：

| 场景 | 方式 | 说明 |
|---|---|---|
| 纯字段拷贝（字段多、无派生计算） | 批量字段转换工具（见 2.1） | `new cls()` + `Object.assign` 拷贝同名字段 |
| 有派生计算/校验逻辑 | `new TargetClass(...)` 构造 | 构造时执行派生赋值 |

弹性规则：默认用批量转换工具；仅当有派生计算/校验时，改为 `new` 构造或转换后手动补充。

### 2.1 把普通对象转成 @ObservedV2 实例（objToClass）

[门禁] 目标：接口返回的普通对象 → 转成 `@ObservedV2` 类实例。做法二选一：

- **已引用 `@pura/harmony-utils`**：直接用 `ObjectUtil.objToClass(cls, data)`（内部即 `new cls()` + `Object.assign` 拷贝同名字段）
- **未引用该库**：新建 `utils/ObjToClass.ts` 自实现同款方法，注释注明「实现等同 @pura/harmony-utils 的 ObjectUtil.objToClass」：

```typescript
// utils/ObjToClass.ts
export function objToClass<T>(clazz: Constructor<T>, obj: any): T {
  const instance = new clazz()
  Object.assign(instance, obj)
  return instance
}
```

> 必须放 `.ts`：`new clazz()`（构造函数类型签名）、`Object.assign` 与签名中的 `any` 在 `.ets`（ArkTS）中受限，`.ts` 不受限且可被 ArkTS 调用。该 `any` 仅限 `.ts` 内部使用，与 `arkts-coding-rules` §1.1 的 `.ets` 禁 `any` 不冲突。

**要点**：
- 只拷贝同名字段，字段名须与接口一致；需重命名/类型转换/计算时，改用 `new` 构造或转换后手动赋值
- 采用无参构造，带参构造里的派生赋值不执行，需转换后手动补充（见 §四）
- 不递归嵌套，嵌套 `@ObservedV2` 子对象需外部递归（见 §三）

## 三、嵌套 @ObservedV2 子对象必须递归转换

批量字段转换工具只浅转换当前层，**不会自动递归**嵌套对象。若嵌套子对象（如数组元素）也是 `@ObservedV2` 类且 UI 需要监听其 `@Trace` 字段，必须先手动遍历递归转换子对象，再转换当前层：

```typescript
static create(data: ParentModel): ParentModel {
  data.children = data.children.map((child: ChildModel) => {
    return ChildModel.create(child)! // 嵌套先递归转换
  })
  return objToClass(ParentModel, data) // 当前层再转换（工具名按项目实际）
}
```

[门禁] 嵌套子对象是 `@ObservedV2` 且 UI 读取其 `@Trace` 字段时，**必须**逐层递归转换，否则内部字段变更不刷新。

## 四、批量转换后派生字段需手动补充

批量字段转换工具是无参构造 + 纯字段拷贝，**带参构造里的派生赋值不会执行**，需转换后手动补充：

```typescript
const model = objToClass(SomeModel, data)
model.isExpanded = data.style?.isExpanded // 补派生字段
return model
```

## 五、@Trace 使用规范（UI 不触发的字段不加）

| 字段类型 | @Trace | 示例 |
|---|---|---|
| UI 渲染直接读取 | 必须 | 页面状态、数据列表、条目选中态 `item.isSelected` |
| 父类持有 `@ObservedV2` 子对象且父组件 UI 读取/透传引用 | 必须 | `@Trace childViewModel` |
| 仅内部逻辑/事件处理使用，UI 不读取 | 不加 | 页面 ID、名称等纯数据字段 |

某属性不需要 UI 刷新时，不需要 `@Trace`。
类内部没有 `@Trace` 时，该类也不需要 `@ObservedV2`。

说明：UI 通过 `@ObservedV2` 对象内部 `@Trace` 属性刷新（如 `item.isSelected`）时，持有该对象引用的父字段本身无需 `@Trace`；但父组件若直接读取/透传引用（如 `@Param` 传子 VM），则必须 `@Trace`。

**`@Trace` 字段类型限制**：
- 支持：`string` / `number` / `boolean`、对象、数组、`Map` / `Set` / `Date` / `TypedArray`
- 禁止：函数、`Symbol`、可选类型 `?`、单独追踪 `undefined` / `null`

[门禁] `@Trace` 字段不能声明为可选类型 `?`，用默认值兜底（如 `nickName: string = ''`）。
