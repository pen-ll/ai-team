---
name: ai-team-dev-pt-hm-arkts-coding-rules
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — ArkTS 与 TypeScript 差异编码规则，约束类型系统限制、禁用语法与类型替代方案。
  触发场景：鸿蒙开发编码时由平台映射表路由加载。
---

# ArkTS 与 TypeScript 差异规则

本文档仅收录 ArkTS 与普通 TypeScript 存在**实质性差异**的编码规则。
通用的命名风格、格式化、缩进等 TS/JS 通用规范不在本文档范围内。

---

## 一、类型系统：禁止动态类型，一切必须显式定义类型

ArkTS 是强类型语言，严格类型检查**不可配置**，禁止绕过类型检查。

### 1.1 禁止 `any` / `unknown` / `@ts-ignore` / `as any`

- `any` 和 `unknown` 在 ArkTS 中不存在，跨语言调用用 `ESObject`（但也应尽量避免）
- 禁止 `@ts-ignore` 忽略类型错误，禁止 `as any` 类型转换

### 1.2 禁止运行时变更对象布局

禁止动态添加/删除对象属性或方法，禁止将任意类型赋值给对象属性。

### 1.3 对象字面量必须标注具体类型

所有对象字面量必须用 `class` 或 `interface` 标注类型，不能用内联类型或 `type` 别名。

```typescript
// ❌
type Person = { name: string, age: number }
let arr = [{ name: 'a', value: 1 }];

// ✅
interface Person { name: string; age: number }
class PermissionItem {
  public name?: string
  public value?: string
}
let arr: PermissionItem[] = [{ name: 'a', value: 1 }];
```

### 1.4 对象字面量 key 必须用 identifier（不能加引号）

```typescript
// ❌ let arr: Test[] = [{ 'value': 1 }]
// ✅ let arr: Test[] = [{ value: 1 }]
```

### 1.5 禁止 index signature，用 `Record<K, V>` 替代

```typescript
// ❌ function foo(obj: { [key: string]: string }): string { ... }
// ✅ function foo(obj: Record<string, string>): string { ... }
```

### 1.6 禁止映射类型，用 `Record<keyof T, V>` 替代

```typescript
// ❌ type OptionsFlags = { [Property in keyof C]: string }
// ✅ type OptionsFlags = Record<keyof C, string>
```

### 1.7 禁止 `this` 作为返回类型，用具体类名替代

```typescript
// ❌ getInstance(): this
// ✅ getInstance(): C
```

### 1.8 泛型调用必须显式标注泛型参数类型

```typescript
// ❌
let m: Map<string, C> = new Map(arr.map(item => [item.str, item]));
// ✅
let m: Map<string, C | null> = new Map<string, C | null>(
  arr.map<[string, C | null]>(item => [item.str, item])
);
```

### 1.9 禁止构造函数参数属性，必须显式声明类属性

```typescript
// ❌
class Person { constructor(readonly name: string) {} }
// ✅
class Person {
  public name: string
  constructor(name: string) { this.name = name; }
}
```

### 1.10 严格属性初始化

类属性必须初始化或在构造函数中赋值，否则编译报错。

### 1.11 `null` 必须显式标注联合类型

函数可能返回 `null` 时，接收变量必须标注 `| null` 并使用可选链。

```typescript
// ❌
let a: A = foo();  // foo 可能返回 null
a.bar();
// ✅
let a: A | null = foo();
a?.bar();
```

### 1.12 interface 中方法属性的写法

interface 中包含"方法"时，必须用函数类型声明，不能用方法简写。

```typescript
// ❌ interface T { foo(value: number): number }
// ✅ interface T { foo: (value: number) => number }
```

### 1.13 `export default` 必须导出实例，不能导出对象字面量

```typescript
// ❌ export default { onCreate() { ... } }
// ✅ class Test { onCreate() { ... } } export default new Test()
```

### 1.14 通过 namespace 导入获取类型时，变量需显式标注类型

```typescript
// ❌
import test from './test';
let option = { id: '', type: 0 };
// ✅
import test from './test';
let option: test.I = { id: '', type: 0 };
```

### 1.15 函数实参为对象字面量时，函数签名必须定义参数类型

```typescript
// ❌ (fn) => { fn({ value: 123, name: '' }); }
// ✅
class T { public value: number = 0; public name: string = '' }
(fn: (v: T) => void) => { fn({ value: 123, name: '' }); }
```

---

## 二、禁用的 TS/JS 语法特性

### 2.1 不支持 structural typing

ArkTS 使用 nominal typing，类型必须显式匹配，不能靠结构相似自动兼容。

### 2.2 禁止解构赋值，用索引访问代替

```typescript
// ❌
for (let [key, value] of map) { ... }
// ✅
for (let arr of map) { let key = arr[0]; let value = arr[1]; }
```

### 2.3 禁止扩展运算符 `...`，用 `Object.assign()` 或手动赋值替代

```typescript
// ❌ let t: test.I = { ...test.foo(), type: 0 }
// ✅ let t: test.I = Object.assign({}, test.foo(), { type: 0 });
```

### 2.4 禁止 `for...in`，用 `Object.entries()` + `for...of` 替代

```typescript
// ❌ for (let key in obj) { console.info(obj[key]); }
// ✅ for (let ele of Object.entries(obj)) { console.info(ele[1]); }
```

### 2.5 禁止 `in` 操作符判断属性存在，用 `Object.keys()` 替代

### 2.6 禁止 `Object.fromEntries()`，用 `forEach` 手动构建替代

### 2.7 禁止 `bind()` / `apply()`，用箭头函数或显式方法替代

```typescript
// ❌
foo: this.foo.bind(this)
a1.foo.apply(a2);
// ✅
foo: (): void => this.foo()
fooApply(a: A) { console.info(a.value); }  // apply 拆出显式参数方法
```

### 2.8 禁止 RegExp 字面量，用 `new RegExp()` 替代

```typescript
// ❌ let regex: RegExp = /\s*/g;
// ✅ let regex: RegExp = new RegExp('\\s*', 'g');
```

### 2.9 禁止一元运算符隐式类型转换

一元运算符 `+` 只能作用于数值类型，用 `Number.parseInt()` / `new Number()` 显式转换。

### 2.10 `catch` 不能标注类型，用 `as` 断言处理

```typescript
// ❌ catch (e: BusinessError) { console.error(e.message); }
// ✅
catch (error) {
  let e: BusinessError = error as BusinessError;
  console.error(e.message);
}
```

### 2.11 `throw` 必须抛出 `Error` 类型

```typescript
// ❌ throw error;
// ✅ throw error as Error;
```

---

## 三、编码规范要求（原文档"要求"级别）

### 3.1 判断 NaN 必须使用 `Number.isNaN()`

`Number.NaN` 不等于任何值（包括自身），禁止用 `==` / `!=` 比较。

### 3.2 数组遍历必须优先使用 Array 对象方法

优先 `forEach()`、`map()`、`filter()`、`find()`、`findIndex()`、`reduce()`、`some()`、`every()`，而非 `for` 循环。

### 3.3 `finally` 块中禁止 `return` / `break` / `continue` / `throw`

### 3.4 控制性条件表达式中禁止赋值

`if`、`while`、`for`、`?:` 等条件判断语句中禁止执行赋值操作。

### 3.5 每条语句只声明一个变量

禁止 `let a = 1, b = 2` 形式的多变量声明。

### 3.6 字符串拼接优先使用模板字符串，避免 `+` 号隐式转换歧义

字符串拼接优先用模板字符串 `${}`，而非 `+` 号：

```typescript
// ❌ (areaItem.id as string) + areaItem.title  // 依赖隐式转换 + 谎报类型
// ✅ `${areaItem.id}${areaItem.title}`         // 语义明确，插值自动 toString
```

原因：`+` 号在操作数类型不一致时产生歧义——`number + string` 隐式转字符串拼接，`number + number` 数字相加（`1 + 2` 得 `3` 而非 `"12"`）；配合 `as string` 谎报类型更易踩坑。模板字符串每个插值语义明确，可读性更好。

注意：模板字符串对 `undefined` / `null` 同样会转成 `"undefined"` / `"null"` 字符串（与 `+` 号一致，均不崩溃），若字段可能为空需显式兜底：

```typescript
`${areaItem.id ?? ''}${areaItem.title ?? ''}`
```

---

## 四、@ObservedV2 响应式数据能力

### 4.1 普通对象无响应式能力

`JSON.parse` 得到的普通对象（泛型仅编译期强转，运行时非类实例）字段变更**不会**触发 UI 刷新——`@Trace` 装饰器作用在类定义上，只有 `@ObservedV2` 类的 `new` 实例才具备响应式能力。

```typescript
// ❌ 普通对象（非 @ObservedV2 实例）直接交给 @Local，字段变更不刷新
// ✅ objToClass(UserBeanV2, resp) 转成 @ObservedV2 实例后再交给 @Local
```

[门禁] 接口返回数据必须转换成为 `@ObservedV2` 类实例后再交给 UI，否则 `@Trace` 字段变更不刷新。

### 4.2 转换方式：批量字段转换工具与 new 构造按场景选择

不限制固定写法（`static create` 工厂方法或实例方法均可），核心目标是**结果必须是 `@ObservedV2` 类实例**。两种方式按实际场景选择：

| 场景 | 方式 | 说明 |
|---|---|---|
| 纯字段拷贝（字段多、无派生计算） | 批量字段转换工具（见 4.2.1） | `new cls()` + `Object.assign` 拷贝同名字段 |
| 有派生计算/校验逻辑 | `new TargetClass(...)` 构造 | 构造时执行派生赋值 |

弹性规则：默认用批量转换工具；仅当有派生计算/校验时，改为 `new` 构造或转换后手动补充。

#### 4.2.1 把普通对象转成 @ObservedV2 实例（objToClass）

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

> 必须放 `.ts`：`new clazz()`（构造函数类型签名）、`Object.assign` 与签名中的 `any` 在 `.ets`（ArkTS）中受限，`.ts` 不受限且可被 ArkTS 调用。该 `any` 仅限 `.ts` 内部使用，与 1.1 的 `.ets` 禁 `any` 不冲突。

**要点**：
- 只拷贝同名字段，字段名须与接口一致；需重命名/类型转换/计算时，改用 `new` 构造或转换后手动赋值
- 采用无参构造，带参构造里的派生赋值不执行，需转换后手动补充（见 4.4）
- 不递归嵌套，嵌套 `@ObservedV2` 子对象需外部递归（见 4.3）

### 4.3 嵌套 @ObservedV2 子对象必须递归转换

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

### 4.4 批量转换后派生字段需手动补充

批量字段转换工具是无参构造 + 纯字段拷贝，**带参构造里的派生赋值不会执行**，需转换后手动补充：

```typescript
const model = objToClass(SomeModel, data)
model.isExpanded = data.style?.isExpanded // 补派生字段
return model
```

### 4.5 @Trace 使用规范（UI 不触发的字段不加）

| 字段类型 | @Trace | 示例 |
|---|---|---|
| UI 渲染直接读取 | 必须 | 页面状态、数据列表、条目选中态 `item.isSelected` |
| 父类持有 `@ObservedV2` 子对象且父组件 UI 读取/透传引用 | 必须 | `@Trace childViewModel` |
| 仅内部逻辑/事件处理使用，UI 不读取 | 不加 | 页面 ID、名称等纯数据字段 |

某属性不需要UI刷新时，不需要@Trace
类内部没有@Trace时，该类也不需要@ObserveV2

说明：UI 通过 `@ObservedV2` 对象内部 `@Trace` 属性刷新（如 `item.isSelected`）时，持有该对象引用的父字段本身无需 `@Trace`；但父组件若直接读取/透传引用（如 `@Param` 传子 VM），则必须 `@Trace`。

**`@Trace` 字段类型限制**：
- 支持：`string` / `number` / `boolean`、对象、数组、`Map` / `Set` / `Date` / `TypedArray`
- 禁止：函数、`Symbol`、可选类型 `?`、单独追踪 `undefined` / `null`

[门禁] `@Trace` 字段不能声明为可选类型 `?`，用默认值兜底（如 `nickName: string = ''`）。
