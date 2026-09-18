---
name: ai-team-dev-pt-hm-ui-test
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — 真机 UI 自动化测试工具，用官方 devecocli 的 ui/log 能力在真机上驱动交互链路并抓取真实请求参数与运行日志作为证据。
  触发场景：需验证真机交互链路（页面跳转、列表渲染、tab、筛选、分页触底、空态/错误态），或需抓取接口真实参数、业务分支日志与崩溃日志时加载。
---

# 鸿蒙真机 UI 自动化测试（ai-team 体系）

## 触发

platform=harmony 且满足任一：

| 条件 | 说明 |
|------|------|
| 需验证交互链路 | 页面跳转、列表渲染、tab 切换、筛选、分页触底、空态/错误态 |
| 需运行时证据 | 抓取接口真实请求参数（URL/query/body）、业务分支日志、崩溃日志 |

> **职责边界**：本 skill **只负责真机 UI 自动化**。

## 工具链

官方 CLI 二进制名 `devecocli`（DevEco CLI）。**第一件事：确认当前 CLI 带 `ui` 子命令**：

```bash
devecocli ui --help                                    # 已全局安装
npm install -g @deveco/deveco-cli@latest               # 未安装时（官方安装方式）
npx --yes @deveco-test/deveco-cli@latest ui --help     # 免安装尝试
```

> **实测提醒**：`ui` / `docs` / `check` / `signature` / `auth` 属较新版本能力 —— 本机曾缓存一个 `@deveco/deveco-cli` 旧版本，命令集仅 `build/run/device/emulator/skills/log/create/init/serve`，**没有 `ui`**。因此不要假定「任一包名都可直接用」，一律以 `devecocli ui --help` 能否正常输出为准；不可用则升级官方最新版，或走下方降级通道。

**[门禁] 环境要求**（官方 README / `开发指南/DevEco_CLI/下载与安装`）：Node.js **≥ 18（推荐 22+）**；**DevEco Studio ≥ 6.1.0 或 Command Line Tools ≥ 26.0.0**（二者其一即可；macOS 下官方要求装在 `~/Applications` 或 `/Applications`）。不满足时走降级通道并在报告记录环境限制。

**查证一手来源**（怀疑参数/行为时先查，别猜）：

```bash
devecocli docs search "<关键词>"     # 官方离线文档库（含 DevEco CLI 三篇官方文档）
devecocli <command> --help           # 参数最权威来源
DEVECO_CLI_DEBUG=1 devecocli ...     # 打印底层命令映射（如截图实为 hdc snapshot_display + file recv），排查利器
```

备用底层通道（CLI 不可用时降级）：`hdc shell uinput`（点击/滑动/输入）+ `hdc shell hilog`（日志）。
> ⚠️ `uinput` 各版本语法不一且**本环境未实测**：降级前先 `hdc shell uinput -h` 确认可用与参数形态，并把降级原因写入报告。

## 前置准备（[门禁] 按序执行，缺一不可）

| # | 步骤 | 命令 | 失败处理 |
|---|------|------|----------|
| 1 | 确认设备 | `hdc list targets` | 无输出 → `ask_followup_question` 让用户连接设备/启动模拟器 |
| 2 | **校验构建新鲜度** | `stat -f "%Sm %N" <hap>` 与源码修改时间对比 | **HAP 早于源码改动 → 先重建再测**，否则测的是旧代码 |
| 3 | 安装最新产物 | `hdc install -r <module>/build/<product>/outputs/<target>/<module>-<target>-signed.hap` | 只有 `-unsigned.hap` → 走 `ai-team-dev-pt-hm-build` 签名检查 |
| 4 | **[门禁] 强制重启进程** | `hdc shell aa force-stop <bundleName>` → 再执行第 6 步 `aa start` | **`install -r` 不保证杀掉已在运行的进程**；不重启会继续跑内存里的旧代码，产出「看似正常却已过期」的结论（本 skill 首次实测即踩此坑，导致一条真机证据作废） |
| 5 | 唤醒设备 | `hdc shell "power-shell wakeup"` | `aa start` 返回 `10106102` = 屏锁 → `ask_followup_question` 让用户解锁 |
| 6 | 启动应用 | `hdc shell aa start -a <EntryAbility> -b <bundleName>` | 失败 → 检查 bundleName / Ability 名 |
| 7 | 放开日志级别 | `hdc shell hilog -b D` | 不放开只能抓到 I 级以上日志，业务 debug 分支会丢失 |

> 多设备时所有 CLI 命令追加 `--device <serial>`。

## 命令表

| 用途 | 命令 | 要点 |
|------|------|------|
| 取页面节点树 | `ui layout [--mode full] [--format json] [--depth <n>] [--window <id>] [--all-windows] [--id <id>]` | 默认 simplified；**Toast / 弹窗以独立顶层窗口覆盖时须加 `--all-windows`**（否则只返回顶层窗口）；`--window` 与 `--all-windows` **互斥** |
| 列出窗口 | `ui window list` | 取 `--window <id>` 所需的窗口 id |
| 点击节点（推荐） | `ui click --id <nodeId>` | 免算坐标，节点树变动时更稳（官方示例：`ui click --id submit_button`）；`--window` 可与 `--id` 搭配 |
| 点击坐标 | `ui click <x> <y>` | 坐标 = 节点框 `[left,top,right,bottom]` 中心 |
| 双击 / 长按 | `ui doubleclick <x> <y>` / `ui longclick <x> <y>` | 长按唤起菜单/多选；双击用于特定交互（两者均只支持坐标） |
| 输入文本 | `ui text "<文本>" [x] [y]` / `ui text --id <nodeId> "<文本>"` | 传坐标或 `--id` 可先聚焦；需替换原内容时先点输入框内的清除按钮节点 |
| 惯性滑动（触底首选） | `ui fling <x1> <y1> <x2> <y2> [--speed <n>]` | 向下滚动内容 = 手指由下往上（如 `630 2200 630 600`）；`--speed` 像素/秒，范围 `200~40000`；触底加载需连续多次（每次约一屏） |
| 精确滑动 | `ui swipe <x1> <y1> <x2> <y2> [--speed <n>]` | 固定轨迹时用，速度同上 |
| 拖拽 | `ui drag <x1> <y1> <x2> <y2> [--speed <n>]` | 拖拽排序等场景 |
| 方向滑动 | `ui dircfling <direction>` | 只需要方向手势时 |
| 截图留痕 | `ui screenshot --path <dir\|file.png> [--display <displayId>]` | 视觉断言/崩溃现场留证；底层为 `hdc shell snapshot_display` + `hdc file recv`（可用 `DEVECO_CLI_DEBUG=1` 查看） |
| 应用日志 | `log --bundle-name <bundle> --level D --keyword <kw> --from 30s --tail 200` | `--crash` 只看崩溃；`--follow` 实时跟随。**实测部分环境该命令无输出（仅打印 `Preparing log request…`）→ 立即回退下一行的 `hilog`**，不要因无输出而误判「无日志」 |
| 原始日志（抓请求 URL） | `hdc shell hilog -r` → 操作 → `hdc shell hilog -x -n 4000` | 清缓冲后再抓，避免被历史日志淹没 |

## 标准流程

1. **准备**：执行上文 **7 步**前置准备，确认 `ui layout` 能取到节点树
2. **定位入口**：`ui layout` → 在节点树中找目标入口节点（记录其 id 或坐标中心）
3. **驱动交互**：`click` / `text` / `fling` 逐步推进链路；**每次交互后 `sleep 2~6s`（网络请求耗时）再重新 `layout`** 确认界面变化，禁止连续盲操作
4. **抓取证据（[门禁] 每个结论必须有证据，禁止凭推测填写报告）**；
   **每个用例开始前先 `hdc shell hilog -r` 清空日志缓冲**，否则日志与操作无法对应：

| 结论类型 | 证据 |
|----------|------|
| 界面/列表渲染 | `layout` 节点树片段（区块标题、列表项文本、可见按钮） |
| 接口参数是否真实下发 | `hilog` 中的请求 URL（含 query）/ 响应体 |
| 业务分支是否触发 | 日志中该分支的 `LogUtil` 中文标记（如「不够一页，自动再请求一页」） |
| 异常/崩溃 | `log --crash` 或 `hilog` grep `jserror\|Exception`，并排除系统噪声 |

5. **判定**：断言「界面出现预期节点 / 日志出现预期标记」；未出现即判定失败，抓日志定位
6. **收尾**：`hdc shell hilog -b I` 恢复日志级别；证据摘要写入测试报告

## 日志取证用法

| 目标 | 方法 |
|------|------|
| 真实请求参数 | 多数项目 HTTP 层会打印请求 URL，`hilog` 抓出后按参数名（`pageIndex` / `pageSize` / 业务字段）提取比对——这是「参数是否真实下发」的唯一硬证据 |
| 分页/加载链路 | grep 分页运行时与业务日志标记（如「触发滑动到底-请求数据」）确认加载更多真实发生 |
| 分支覆盖 | grep 业务分支中文标记，区分「命中分支」与「未命中」 |
| 系统噪声过滤 | 排除 `light_sensor` / `inputmethod` / `render_service` / `accessibility` / `sourceMaps find fail` |

## 常见坑（实测）

| # | 现象 | 根因 | 对策 |
|---|------|------|------|
| 1 | 结论"看着正常"实为旧代码 | `install -r` 不保证杀进程 | 安装后必须 `aa force-stop` → `aa start`（前置准备第 4 步） |
| 2 | 抓不到日志 | 日志级别为 I，或缓冲未清 | 提前 `hilog -b D`；每用例前 `hilog -r`；结束 `hilog -b I` |
| 3 | Toast / 弹窗断言失败 | `layout` 默认只返回顶层窗口 | 加 `--all-windows`（与 `--window` 互斥） |
| 4 | 短时 Loading / 遮罩抓不到 | CLI 单命令约 0.5~1s，而请求可能在 ~200ms 内完成，采样窗口远大于目标窗口 | 截图紧随操作执行；仍抓不到就**如实登记「未覆盖 + 采样窗口限制」**，不得凭代码推断写成通过 |
| 5 | 贴底元素点不动 | 节点 `bottom` 等于屏幕高，落在系统手势区 | 点击位置取该节点中心**上移 40px 左右**，或改点上方的同类节点 |
| 6 | 触底次数 ≠ 请求次数 | 节流 + 「请求中 / 无更多数据」守卫 | 以 **`pageIndex` 是否递增**判断"加载更多真实发生"，并单独统计守卫日志计数 |
| 7 | 报"找不到设备" | 设备离线（USB/Wi-Fi 掉线） | 任何此类报错先 `hdc list targets` |

## 网络状态类用例（断网 / 弱网 / 失败态）

**前置事实（实测）**：`hdc shell` 以 `uid=2000(shell)` 运行、无 root；设备无 `svc` / `settings` 命令 → **AI 无法自行断网**；只能读取网卡状态（`hdc shell "ifconfig wlan0"` 是否含 `inet addr`），不能修改。

### 执行方式优先级（[门禁] 按序选择，禁止直接跳到协同断网）

| 优先级 | 方式 | 适用 | 代价 |
|--------|------|------|------|
| 1 | **mock / 失败注入**：项目 mock 能力或测试环境返回错误码，触发同一条失败分支 | 项目具备 mock 或可配置错误响应 | 0（可重复回归，首选） |
| 2 | **协同断网**：请用户在设备上开飞行模式 / 关 Wi-Fi | 无 mock 能力，必须验证真实断网 | 1 次用户交互 + 设备网络中断 |
| 3 | 记录「未覆盖 + 原因」 | 用户不方便断网 | 覆盖缺口（报告如实登记，禁止写成通过） |

> 断网由用户在**系统设置**里操作即可；不要尝试用 CLI 驱动「设置」App 开关飞行模式——系统设置页因版本/机型差异大，且飞行模式会切断用户来电，风险高于收益。

### 协同交互模板（一问一确认，不反复打扰）

`ask_followup_question`：
- **问题**：说明「下一步验证断网态（错误态 + 重试）」，并给出**当前客观状态**（如 `ifconfig wlan0` 的 IP），请用户断网后确认
- **选项**：`["我已断网，继续执行", "跳过断网用例（记为未覆盖）", "改用 mock/失败注入方式验证"]`

**[门禁] 用户确认后必须客观校验，不得只凭口头确认继续断言**：`hdc shell "ifconfig wlan0"` 应无 `inet addr`（蜂窝路径同样不可达）；若仍联网 → 告知用户并给「再确认 / 跳过」选项。

### 执行与收尾（[门禁]）

| # | 步骤 |
|---|------|
| 1 | **排序**：断网类用例**最后集中执行**，避免中途断网污染后续用例 |
| 2 | 断网后驱动被测链路（进入列表 → 下拉刷新 / 触底 / 提交请求）→ 断言错误态节点 + 「重试」节点 |
| 3 | 点「重试」→ 记录表现（仍无网 → 保持错误态；已恢复 → 正常加载） |
| 4 | **必须恢复网络**：立即提示用户恢复（关飞行模式 / 开 Wi-Fi），并以 `ifconfig wlan0` 出现 `inet addr` 作为恢复校验；未恢复不得结束角色流程 |
| 5 | **[门禁] 恢复后必须补测正向闭环**：恢复网络 → 再次触发同一入口（重试 / 触底 / 下拉刷新）→ 断言「加载成功 **且失败标记被清除**」（如整屏错误页消失、底部「加载失败」回正为「到底提示」、页码回到 0 或继续递增）。**只测失败不测恢复 = 闭环缺失** |
| 6 | 报告记录：网络状态变化时间点（正常 → 断开 → 恢复）、校验命令输出、用例结论 |

## 判定与降级

| 情况 | 处理 |
|------|------|
| 需断网才能触发的失败分支 | 按「网络状态类用例」章节执行（mock 优先 → 协同断网 → 记录未覆盖） |
| 无设备 / 设备不可连接 | `ask_followup_question`：让用户连接设备，或选择「跳过 UI 测试，按静态验证+编译门禁降级」 |
| 设备锁屏（`10106102`） | 先 `power-shell wakeup`；仍锁屏 → `ask_followup_question` 让用户解锁后重试 |
| 用例依赖登录态 | 确认设备已登录目标账号；未登录 → 请用户手动登录后继续 |
| 依赖后端数据的用例（如「已经到底了」需服务端 `hasMore=false`） | 记为「未覆盖 + 原因」（数据不可构造），禁止伪造通过 |
| CLI 不可用（npx 拉取失败 / 无网络） | 降级 `hdc shell uinput` + `hdc shell hilog`，并在报告记录降级原因 |
| 页面/服务端持续有下一页 | 不强行判「到底」通过；改为验证「加载更多真实触发 + 页码递增」 |

## 报告落盘（[门禁]）

在 `tester-report.md` 新增「运行时真机验证」章节，逐项记录：

| 列 | 要求 |
|----|------|
| 验证项 | 对应需求/建议用例编号 |
| 操作 | 实际执行的交互步骤（含定位方式） |
| 实测结果 | 观测到的节点树/请求 URL/日志标记 |
| 结论 | 通过 / 未覆盖（必须写原因） |

- **未覆盖项必须集中列出**，禁止把「未覆盖」写成「通过」
- 抓到的请求 URL 作为「接口参数正确性」的直接证据引用，不贴全量日志
