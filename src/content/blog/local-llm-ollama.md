---
title: '本地跑大模型：Ollama 上手与硬件选型'
description: '一条命令把模型跑在自己电脑上：量化等级怎么选、显存需要多少、什么时候该从 Ollama 换到 vLLM。'
pubDate: 2026-09-06
category: tools
tags: ['Ollama', '本地部署', '量化', 'vLLM']
---

把模型跑在本地有几个实在的好处：数据不出本机、不按 token 花钱、断网也能用。代价是需要一块像样的显卡。

这篇讲清楚怎么用 Ollama 最快跑起来，以及显存到底需要多少。

## 先看硬件够不够

决定能不能跑、跑得多快的是**显存**，不是算力。

一个粗略的估算方法：

```text
显存需求 ≈ 参数量 × 每参数字节数 + 上下文开销

不同量化等级下每参数字节数：
  FP16   → 2 字节
  Q8     → 1 字节
  Q4     → 约 0.5 字节
```

按这个估算：

| 模型规模 | FP16 | Q4 量化 | 能否跑在 |
| --- | --- | --- | --- |
| 3B | ~6 GB | ~2 GB | 8 GB 显卡 / 核显 |
| 7B ~ 8B | ~14 GB | ~5 GB | 8 GB 显卡 |
| 14B | ~28 GB | ~9 GB | 12 GB 显卡 |
| 32B | ~64 GB | ~20 GB | 24 GB 显卡 |
| 70B | ~140 GB | ~42 GB | 双卡 24 GB 或 48 GB 单卡 |

还要给上下文留出空间。KV cache 随上下文长度线性增长，8K 上下文大概再占 1 到 2 GB。

**显存不够时，Ollama 会自动把部分层放到内存里跑**——但速度会掉一个数量级。所以「能跑」和「能用」是两回事。

## 装好之后的第一个模型

去 [ollama.com](https://ollama.com) 下载安装包，装完后一行命令：

```bash
ollama run qwen2.5:7b
```

第一次会自动下载模型，之后就进入交互式对话了。

常用命令：

```bash
ollama list                  # 看本地有哪些模型
ollama pull llama3.1:8b      # 只下载不运行
ollama rm qwen2.5:7b         # 删除模型
ollama ps                    # 看正在运行的模型和占用的显存
ollama serve                 # 手动启动服务（默认开机自启）
```

> 模型 tag 的名字和可用规模一直在更新，具体有哪些去 [ollama.com/library](https://ollama.com/library) 看，别照着旧教程的 tag 抄。

## 量化等级怎么选

模型名字里的 `q4_K_M` 这类后缀就是量化等级。**它是在用精度换显存**。

| 后缀 | 含义 | 建议 |
| --- | --- | --- |
| `q8_0` | 8-bit | 质量几乎无损，但显存占用大 |
| `q6_K` | 6-bit | 质量很接近 8-bit，省不少显存 |
| `q5_K_M` | 5-bit | 甜点区，质量和体积平衡好 |
| `q4_K_M` | 4-bit | **最常用的默认选择**，性价比最高 |
| `q3_K_M` | 3-bit | 质量开始可感知地下降 |
| `q2_K` | 2-bit | 会明显变傻，除非实在没显存 |

**`q4_K_M` 是绝大多数情况下的正确答案。** 从 q4 降到 q3 省下的显存有限，但质量损失可能很明显。

一个判断技巧：**7B 的 q4 效果，通常好于 13B 的 q2。** 宁可要一个量化等级高的小模型，也不要一个被压得太狠的大模型。

## 用 API 调用

Ollama 在本地开了一个 HTTP 服务（默认 `11434` 端口），可以从自己的代码里调用：

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:7b",
  "prompt": "用三句话解释什么是注意力机制",
  "stream": false
}'
```

更方便的是它**同时提供 OpenAI 兼容接口**，所以已有的代码往往改一个 base_url 就能用：

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",  # 本地服务不校验，随便填
)

response = client.chat.completions.create(
    model="qwen2.5:7b",
    messages=[{"role": "user", "content": "你好"}],
)
print(response.choices[0].message.content)
```

这让「本地开发、云端部署」的切换成本变得很低——本地调试用 Ollama，上线换成真实 API，代码几乎不用动。

## 什么时候该换 vLLM

Ollama 的设计目标是**单用户本地使用**，它的调度策略是为低并发优化的。一旦要服务多个并发请求，它会成为瓶颈。

换到 vLLM 的信号：

| 信号 | 说明 |
| --- | --- |
| 并发超过 1~2 个 | Ollama 会串行处理，请求排队 |
| 需要吞吐量 | vLLM 的 PagedAttention 和连续批处理能把吞吐提升数倍 |
| 要做生产服务 | vLLM 提供更完善的指标、更稳的显存管理 |

vLLM 也提供 OpenAI 兼容接口，所以业务代码同样不用改：

```bash
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.9
```

**简单判断：自己用就 Ollama，给别人用就 vLLM。**

## 几个实用建议

**先小后大。** 别一上来就下 70B。先用 7B 跑通流程，确认有用再加码。

**注意显存碎片。** Ollama 默认会在一段时间后卸载模型释放显存。如果反复请求时总在重新加载，可以设置更长的 keep-alive：

```bash
# 让模型常驻 30 分钟（默认 5 分钟）
OLLAMA_KEEP_ALIVE=30m ollama serve
```

**本地模型更适合做这些事：** 批量处理（不花钱，慢慢跑）、隐私数据处理、开发调试（不消耗 API 额度）、以及作为 Agent 里那些高频低难度子任务的执行者。

**不适合的场景：** 需要最强推理能力的任务、对延迟敏感的实时交互、以及在弱硬件上跑大参数模型。

## 小结

- 决定能不能跑的是显存，`参数量 × 0.5 字节` 是 Q4 的粗略估算
- `q4_K_M` 是最常用的量化等级，性价比最高
- 高量化的小模型通常好于低量化的大模型
- Ollama 提供 OpenAI 兼容接口，切换成本很低
- 单用户用 Ollama，多并发上 vLLM
- 先用小模型验证流程，确认有价值再投入硬件

想系统了解模型怎么选，可以看 [大模型选型那篇](/blog/llm-model-selection)。
