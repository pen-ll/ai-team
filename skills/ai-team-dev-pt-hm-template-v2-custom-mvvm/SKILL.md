---
name: ai-team-dev-pt-hm-template-v2-custom-mvvm
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — MVVM 架构模板（Page + ViewModel + DataModel + Model 四层分离）。
  触发场景：鸿蒙开发选择 MVVM 架构模板时加载。
---

# MVVM 架构模板（ai-team 体系）

基于 `@ObservedV2` / `@Trace` / `@ComponentV2`，**Model 与 DataModel 分层**：
- `Model` 放纯 `interface` / `type` 定义，无装饰器
- `DataModel` 放可观察数据类（`@ObservedV2` + `@Trace`），负责数据格式化 + 网络请求

## 架构分层（四层）

```
model/<Feature>Types.ets          → 纯类型定义（interface / type），无装饰器
pages/<Feature>Page.ets           → View 层，纯 UI
viewmodels/<Feature>ViewModel.ets → 交互逻辑
datamodels/<Feature>DataModel.ets → 数据格式化 + 请求
```

> **为什么 model/ 和 datamodels/ 分开**：
> - `model/`：纯接口定义（`IItem` / `IResponse`），可在 TS/ETS 任意位置复用
> - `datamodels/`：可观察的数据类（`@ObservedV2` + `@Trace`），负责数据格式化 + 请求调用
> - ViewModel 只做交互逻辑，不涉及数据格式化与请求调用

## 核心响应链路

```
DataModel.@Trace 字段变更
        ↓ 自动触发
ViewModel.@Trace dm 变更
        ↓ 自动触发
Page UI 刷新
```

> **这就是 V2 的核心**：`@ObservedV2` 嵌套 `@Trace` 字段形成自动响应链，开发者只管改数据。

## 1. Model — 类型定义

```typescript
// model/<Feature>Types.ets
export interface I<Feature>Item {
  id: string;
  name: string;
}

export interface I<Feature>PageData {
  someInfo?: { title: string };
  list?: I<Feature>Item[];
}

export interface I<Feature>PageParams {
  // 页面入参
}

export interface I<Feature>RequestParams extends I<Feature>PageParams {
  // 请求参数
}
```

> 纯 `interface` / `type`，不带任何装饰器。需在 `Index.ets` 中 `export type` 出去供其他模块引用。

## 2. DataModel — 数据 + 请求

```typescript
// datamodels/<Feature>DataModel.ets
import { I<Feature>Item, I<Feature>PageData } from '../model/<Feature>Types';
import { <Feature>Request } from '../datasources/<Feature>Request';

@ObservedV2
export class <Feature>DataModel {
  @Trace someInfo?: { title: string } = undefined;
  @Trace list: I<Feature>Item[] = [];

  private static create(data: I<Feature>PageData): <Feature>DataModel | null {
    if (!data) return null;
    const dm = new <Feature>DataModel();
    dm.someInfo = data.someInfo;
    dm.list = data.list ?? [];
    return dm;
  }

  static async load(params: I<Feature>RequestParams): Promise<<Feature>DataModel | null> {
    const data = await <Feature>Request.fetchData(params);
    return <Feature>DataModel.create(data);
  }
}
```

> `@ObservedV2` 让 DataModel 可被观察，`@Trace` 字段变更自动触发上层刷新。

## 3. ViewModel — 持有 DataModel，处理交互

```typescript
// viewmodels/<Feature>ViewModel.ets
import { <Feature>DataModel } from '../datamodels/<Feature>DataModel';
import { I<Feature>Item, I<Feature>PageParams } from '../model/<Feature>Types';

@ObservedV2
export class <Feature>ViewModel {
  @Trace dm: <Feature>DataModel | null = null;
  pageParams: I<Feature>PageParams;

  constructor(params: I<Feature>PageParams) {
    this.pageParams = params;
  }

  async load(): Promise<void> {
    const dm = await <Feature>DataModel.load(this.pageParams as any);
    if (dm) this.dm = dm;
  }

  onItemClick(item: I<Feature>Item): void { /* 处理点击 */ }
}
```

> `@Trace dm` 是关键——DataModel 任何 `@Trace` 字段变更，都会传递到此，触发 Page 刷新。

## 4. Page — 持有 ViewModel，纯 UI

```typescript
// pages/<Feature>Page.ets
import { <Feature>ViewModel } from '../viewmodels/<Feature>ViewModel';
import { I<Feature>Item } from '../model/<Feature>Types';

@ComponentV2
export struct <Feature>Page {
  @Local vm: <Feature>ViewModel = new <Feature>ViewModel(this.getParams());

  aboutToAppear(): void { this.vm.load(); }

  build() {
    Column() {
      Text(this.vm.dm?.someInfo?.title)
      List() {
        Repeat(this.vm.dm?.list ?? [])
          .each((obj: RepeatItem<I<Feature>Item>) => {
            ListItem() { Text(obj.item.name) }
          })
          .key((item, index) => item.id || index.toString())
      }
    }
  }
}
```

> Page 只管 UI 渲染，通过 `this.vm.dm.xxx` 读取数据。DataModel 字段变更 → UI 自动刷新，无需手动 setState。
>
> **列表 key 规则**：`List` + `Repeat`（或 `ForEach`）必须给 `.key()`，用数据模块的唯一标识（如 `item.id`）保证渲染正确，兜底用 `JSON.stringify(item)`。
