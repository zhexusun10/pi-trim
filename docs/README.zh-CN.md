# pi-trim

**Less Pi in Pi.** 精简 Pi 自身的身份说明与文档指引，并支持通过 `/pi-trim mode` 进一步裁掉冗余的 `<tools>` 摘要列表，同时保留编程助手、工具 schema、`<rules>` 和你的项目指令。已兼容 **Pi 1.5.0** 及旧版（`1.0.0`、`1.4.0`）。

Pi 1.5.0 默认系统提示词实测：`default` 模式减少 **56.6%**（`459 → 199` tokens），`aggressive` 模式减少 **70.4%**（`459 → 136` tokens）。

[English](../README.md) · [完整测量与方法](../benchmarks/README.md)

## 安装

从 npm 安装：

```bash
pi install npm:pi-trim
# 更新已安装的 npm 版本：
pi update npm:pi-trim
```

或直接从 GitHub 安装：

```bash
pi install git:github.com/zhexusun10/pi-trim
```

安装后重新启动 Pi，或在当前会话输入 `/reload`。

## 删除哪些内容？

默认模式（`default`）删除三类 Pi 自身样板文本：

- 去掉默认身份句中的 `operating inside pi, a coding agent harness`（旧版）或 `running inside pi, a coding agent harness`（Pi 1.5 新版），保留原有的助手描述。
- 删除 Pi 默认的 `<docs>` 文档指引段落。
- 删除提示模型查看 `PI_*` 环境变量的特定规则。

工具声明、其他规则、项目指令、skills、自定义段落和聊天消息保留。不匹配的内容原样通过，不会清除所有 `pi` 或 `docs` 字样。做 Pi SDK 或扩展开发时，可能需要自己提供文档路径。

通过 `/pi-trim mode` 切换到 `aggressive` 模式后，还会在保留 API 工具 schema 与 `<rules>` 的前提下，进一步删除系统提示词中 Pi 默认生成的 `<tools>` 摘要列表（含 `Additional tools may be available.`，自定义 `<tools>` 段落不受影响）。

## 查看与切换模式

```text
/pi-trim status
/pi-trim diff
/pi-trim mode
/pi-trim mode default|aggressive
```

`status` 显示当前模式（`default` 或 `aggressive`）、字符数量、按字符数除以 4 计算的 token **估算值**，以及处理过的段落；`diff` 显示具体删除或替换的文本；`/pi-trim mode` 可在 `default` 和 `aggressive` 之间切换（或直接指定模式）并在当前会话分支持久化。首次请求前是基础提示词预览，之后是最近一次请求中所有系统消息的文本，不包括工具 schema。后执行的其他扩展仍可能继续修改消息。

## 实测

Pi 1.5.0 默认系统提示词：
- `default` 模式：**459 → 199 tokens，减少 260 tokens（56.6%）**
- `aggressive` 模式（额外移除 `<tools>`）：**459 → 136 tokens，减少 323 tokens（70.4%）**

使用 `gpt-tokenizer` 4.0.0 的 `o200k_base` 编码，默认 read/bash/edit/write 工具指引，无项目指令、skills 或附加指令。安装路径统一为 `/opt/pi`，工作目录为 `/workspace`。不包括工具 schema 和 provider 包装，也不是 API 账单数据。加入项目上下文后，节省比例通常更小。

这不代表模型更聪明、延迟更低或任务成本必然更低。完整编程任务对照结果与复现命令见 [benchmark 文档](../benchmarks/README.md)。

历史对照中使用 Pi 1.0 实跑十个小型 JavaScript 任务（同一 `gpt-6-sol`，每组一轮）：两组均 10/10 通过，工具调用总数一致；含缓存的总输入 tokens 减少 20.7%，但 Pi 的模型价格成本估算增加 5.5%。缓存条件未控制，延迟有异常值，不据此声称性能或成本改善。

## 实现与兼容性

只在内存中处理发给模型的系统消息，使用 `context_with_system` 钩子。扩展本身没有网络请求、遥测、模型调用或文件读写，也不会改写 Pi 安装目录。Pi 自身的行为不受此声明约束。

已测试 Pi 1.0.0、1.4.0、1.5.0 生成的默认提示词，使用 Node.js 22.19+。没有 `context_with_system` 接口的旧版本不支持。项目以英文文档为主，这份中文说明为次选。

更新或卸载：

```bash
# npm 版本
pi update npm:pi-trim
pi remove npm:pi-trim

# GitHub 版本
pi update git:github.com/zhexusun10/pi-trim
pi remove git:github.com/zhexusun10/pi-trim
```

更新或卸载后重启 Pi 或执行 `/reload`。

旧版 `strip-pi-docs.ts` 用户请先阅读[迁移说明](migration.md)：旧版写入 Pi 安装目录的修改不会因卸载扩展自动恢复。

MIT 开源，非 Pi 官方产品。
