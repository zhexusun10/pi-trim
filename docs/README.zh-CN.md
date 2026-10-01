# pi-trim

**Less Pi in Pi.** 精简 Pi 自身的身份说明和文档指引，保留编程助手、工具和你的指令。

[English](../README.md) · [完整测量与方法](../benchmarks/README.md)

```bash
pi install npm:pi-trim
```

也可以通过 GitHub 安装：

```bash
pi install git:github.com/zhexusun10/pi-trim
```

安装后重新启动 Pi，或在当前会话输入 `/reload`。

## 删除哪些内容？

- 将默认身份句中的 `operating inside pi, a coding agent harness` 去掉。
- 删除 Pi 默认的 `<docs>` 文档指引段落。
- 删除提示模型查看 `PI_*` 环境变量的特定规则。

工具声明、其他规则、项目指令、skills、自定义段落和聊天消息保留。不匹配的内容原样通过，不会清除所有 `pi` 或 `docs` 字样。做 Pi SDK 或扩展开发时，可能需要自己提供文档路径。

## 查看处理结果

```text
/pi-trim status
/pi-trim diff
```

`status` 显示字符数量、按字符数除以 4 计算的 token **估算值**，以及处理过的段落；`diff` 显示具体删除或替换的文本。首次请求前是基础提示词预览，之后是最近一次请求中所有系统消息的文本，不包括工具 schema。后执行的其他扩展仍可能继续修改消息。

## 实测

Pi 0.99.2 默认系统提示词：**540 → 274 tokens，减少 266 tokens（49.3%）**。

使用 `gpt-tokenizer` 4.0.0 的 `o200k_base` 编码，默认 read/bash/edit/write 工具指引，无项目指令、skills 或附加指令。安装路径统一为 `/opt/pi`，工作目录为 `/workspace`。不包括工具 schema 和 provider 包装，也不是 API 账单数据。加入项目上下文后，节省比例通常更小。

这不代表模型更聪明、延迟更低或任务成本必然更低。完整编程任务对照结果与复现命令见 [benchmark 文档](../benchmarks/README.md)。

实跑十个小型 JavaScript 任务（同一 `gpt-6-sol`，每组一轮）：两组均 10/10 通过，工具调用总数一致；含缓存的总输入 tokens 减少 20.7%，但 Pi 的模型价格成本估算增加 5.5%。缓存条件未控制，延迟有异常值，不据此声称性能或成本改善。

## 实现与兼容性

只在内存中处理发给模型的系统消息，使用 `context_with_system` 钩子。扩展本身没有网络请求、遥测、模型调用或文件读写，也不会改写 Pi 安装目录。Pi 自身的行为不受此声明约束。

已测试 Pi 0.99.2，Node.js 22.19+。没有 `context_with_system` 接口的旧版本不支持。项目以英文文档为主，这份中文说明为次选。

```bash
pi update npm:pi-trim
pi remove npm:pi-trim
```

旧版 `strip-pi-docs.ts` 用户请先阅读[迁移说明](migration.md)：旧版写入 Pi 安装目录的修改不会因卸载扩展自动恢复。

MIT 开源，非 Pi 官方产品。
