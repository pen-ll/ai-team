---
name: ai-team-dev-pt-hm-role-reviewer
autoTrigger: false
trigger: route-only
user-invocable: false
description: |
  鸿蒙平台特化 — 代码审查角色，含 hdc 启动验证、签名检查、hilog crash 检查与设备错误码处理。
  触发场景：platform=harmony 且承担 reviewer 角色时加载。
---

# 鸿蒙平台特化 — 代码审查角色

## 触发

当 platform=harmony 时加载。

> **环境事实**：路径 / CLI 口径 / 版本决策 / 设备命令的**唯一来源是 `ai-team-dev-pt-hm-env`** —— **需要编译 / 安装 / 启动 / 取日志时 `use_skill ai-team-dev-pt-hm-env`**，本 skill 不内联副本。

## 覆盖范围

本 skill **覆盖或补充**通用 reviewer 流程中以下步骤：

| 通用步骤 | 鸿蒙特化行为 |
|----------|-------------|
| 第二步：编译验证 | 替换为 `ai-team-dev-pt-hm-build` 编译 |
| 第三步：代码质量审查 | 补充 ArkTS 安全/性能审查 |
| 第四步：问题处理 | 补充鸿蒙签名检查流程（签名未生效时通知 PM） |
| 第五步：启动验证 | 替换为 hdc 启动 + hilog 检查 + 设备错误码处理 |
| 第七步：产出交付报告 | 补充 HAP 路径等鸿蒙特有字段 |

## 鸿蒙特化流程

### 编译验证（覆盖通用 reviewer 第二步）

审查阶段如需重新编译：**[门禁] 必须显式 `use_skill ai-team-dev-pt-hm-build`**（编译命令、DEVECO_SDK_HOME 路径探测均由 build skill 提供，禁止自行猜测/内联）：

```
use_skill ai-team-dev-pt-hm-build
```

编译 BUILD SUCCESSFUL 后再继续质量审查。

### 代码质量审查（补充通用 reviewer 第三步）

对本次生成/修改的代码进行鸿蒙特有质量审查：

#### 安全审查（遵循 ai-team-dev-pt-hm-arkts-security）

- [ ] 无第三方包未经确认安装
- [ ] 无远程代码下载执行
- [ ] 无黑灰产逻辑
- [ ] 死循环检测阈值合理

#### 性能审查（遵循 ai-team-dev-pt-hm-arkts-performance）

- [ ] 无 UI 模板表达式中直接修改状态变量
- [ ] 回调已正确解注册
- [ ] 循环中无频繁读取状态变量
- [ ] 列表使用 LazyForEach

### 签名问题处理（补充通用 reviewer 第四步：问题处理）

首先检查 HAP 是否已签名。如果开发/测试阶段编译已解决签名，跳过此步。如果仍未签名：

1. **检查签名状态**：
   ```bash
   ls <module>/build/default/outputs/default/*-signed.hap 2>/dev/null
   ```

2. **如果只有 `*-unsigned.hap`**（签名未生效）：

   签名需要用户在 DevEco Studio 中手动操作，Agent 无法自行完成。直接通知 PM：

   ```
   send_message(
     type="message",
     recipient="main",
     content="审查阶段签名检查未通过 | HAP 未签名 | 需要用户操作：File > Project Structure > Signing Configs > 勾选 Automatically generate signature > Apply | 用户完成后需重新编译并重新审查",
     summary="签名未生效，请求用户手动签名"
   )
   ```

### 启动应用（覆盖通用 reviewer 第五步）

**[门禁] 必须先 `force-stop` 再 `aa start`**（`install -r` 不保证杀进程，直接 start 会跑旧代码）——命令与环境口径见 `ai-team-dev-pt-hm-env` E4：

```bash
hdc shell aa force-stop <bundleName>
hdc shell aa start -a EntryAbility -b <bundleName>
```

### 启动后验证（补充通用 reviewer 第五步：启动验证）

启动成功后，执行以下验证步骤：

```
1. aa start 返回成功
2. 检查设备日志无 crash：hdc shell "hilog -z 200 -t app -L E"
3. 界面验证：用节点树断言，不用截图 ——
   ui layout 取节点树 → 断言目标页面/关键元素存在与文案正确 → 触发主要交互 → 断言状态变化
   （UI 驱动命令见 ai-team-dev-pt-hm-ui-test —— 该 skill 是 `ui` 命令族唯一来源）
4. 若启动失败或日志报错 → 向开发 Agent 反馈，不强行交付
```

#### 启动后 crash

向开发 Agent 反馈：

```
send_message(
  type="message",
  recipient="coder-agent",
  content="启动后 crash | hilog 关键错误：{错误摘要} | 请定位修复",
  summary="启动crash，请求修复"
)
```

### 设备错误处理（补充通用 reviewer 第五步：启动验证）

启动应用时若返回错误码，按下表处理：

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| `10106102` | 设备屏幕锁定 | 弹窗"请解锁设备屏幕"，用户确认后重试 `aa start` |
| `9568297` | 设备 API 版本低于 compatibleSdkVersion | 按 `ai-team-dev-pt-hm-env` E3 下调 `compatibleSdkVersion` → **重新编译** |
| `code:16000018` | 应用已运行 | 提示用户先 `aa force-stop` 停止应用，再重试 |

### 产出交付报告（补充通用 reviewer 第七步：产出交付报告）

鸿蒙特有字段：

```markdown
## 交付物清单
| 类型 | 路径 |
|------|------|
| HAP | {path} |
```

## 配置

```yaml
platform: harmony
build_skill: ai-team-dev-pt-hm-build
env_skill: ai-team-dev-pt-hm-env    # 环境/工具链事实唯一来源，触碰环境时按需加载
security_skill: ai-team-dev-pt-hm-arkts-security
performance_skill: ai-team-dev-pt-hm-arkts-performance
```
