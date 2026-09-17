---
title: 'Transformer 与注意力机制：把「注意力」这件事讲清楚'
description: '从 QKV 的直觉、缩放点积注意力公式，到多头注意力和位置编码，用一段不到 40 行的 PyTorch 代码把 Transformer 的核心部件实现出来。'
pubDate: 2026-05-18
category: basics
tags: ['Transformer', '注意力机制', 'PyTorch']
featured: true
---

现在几乎所有大模型都建立在 Transformer 之上。但很多人第一次读《Attention Is All You Need》时会卡在同一个地方：**Q、K、V 到底是什么，为什么要除以 `sqrt(d_k)`？**

这篇笔记不讲论文结构，只把注意力机制这一件事拆开讲清楚。看完你应该能自己手写出来。

## 先丢掉公式，从「查字典」说起

注意力机制本质上是**一次软性的查字典**。

想象一本字典，里面有 N 个词条。你拿一个查询词去查，字典不会只返回一个精确匹配的词条，而是返回**所有词条的加权平均**——和查询词越像的词条，权重越高。

- **Query（Q）**：你要查的那个词
- **Key（K）**：字典里每个词条的索引
- **Value（V）**：字典里每个词条的内容

所以整个计算分三步：

1. 拿 Query 和每个 Key 做相似度计算，得到一组分数
2. 把分数归一化成权重（softmax）
3. 用权重对所有的 Value 做加权求和

换成矩阵形式，就是那个著名的公式：

```text
Attention(Q, K, V) = softmax( Q · Kᵀ / sqrt(d_k) ) · V
```

## 逐项拆解这个公式

### `Q · Kᵀ` 在算什么

矩阵乘法在这里就是批量算点积。点积衡量两个向量的相似度，越相似值越大。结果是一个 `N × N` 的矩阵——第 `i` 行第 `j` 列表示「第 `i` 个词对第 `j` 个词的关注程度」。

这个 `N × N` 矩阵就是所谓的**注意力权重矩阵**，也是 Transformer 可解释性研究的入口。

### 为什么要除以 `sqrt(d_k)`

这是最容易被忽略、但最影响训练稳定性的一步。

假设 Q 和 K 的每个分量都是均值 0、方差 1 的独立随机变量，那么它们的点积（`d_k` 项求和）方差会变成 `d_k`。当 `d_k = 512` 时，点积的取值可能达到 ±20 量级。

点积一大，softmax 就会**饱和**——最大的那一项接近 1，其余接近 0。此时 softmax 的梯度几乎为零，反向传播推不动参数。

除以 `sqrt(d_k)` 把方差拉回 1，softmax 就工作在梯度健康的区间里。

> 一句话记忆：**缩放不是为了数值好看，是为了让梯度活下来。**

### 为什么最后要乘 V

softmax 输出的权重矩阵负责「分配注意力」，乘 V 才是真正把信息取出来。权重矩阵的每一行和为 1，所以输出是 Value 的凸组合——**每个位置的输出，都是全序列信息的一个加权摘要**。

## 用 PyTorch 写出来

核心其实不到 40 行：

```python
import math
import torch
import torch.nn as nn
import torch.nn.functional as F


def scaled_dot_product_attention(q, k, v, mask=None):
    """
    q, k, v: (batch, n_heads, seq_len, d_k)
    mask:    (batch, 1, seq_len, seq_len)，True 表示需要屏蔽的位置
    """
    d_k = q.size(-1)

    # 1. 相似度打分，并做缩放
    scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(d_k)

    # 2. 屏蔽不该看的位置（比如 padding，或解码时的未来 token）
    if mask is not None:
        scores = scores.masked_fill(mask, float("-inf"))

    # 3. 归一化 + 加权求和
    attn = F.softmax(scores, dim=-1)
    return torch.matmul(attn, v), attn


class MultiHeadAttention(nn.Module):
    def __init__(self, d_model=512, n_heads=8):
        super().__init__()
        assert d_model % n_heads == 0, "d_model 必须能被 n_heads 整除"
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_k = d_model // n_heads

        # 一次线性变换同时产出 Q、K、V，比写三个 Linear 快
        self.qkv = nn.Linear(d_model, 3 * d_model)
        self.out = nn.Linear(d_model, d_model)

    def forward(self, x, mask=None):
        B, T, _ = x.shape

        # (B, T, 3 * d_model) -> 3 个 (B, n_heads, T, d_k)
        qkv = self.qkv(x).chunk(3, dim=-1)
        q, k, v = [t.view(B, T, self.n_heads, self.d_k).transpose(1, 2) for t in qkv]

        # 每个头独立做注意力
        out, _ = scaled_dot_product_attention(q, k, v, mask)

        # 把多头拼回去：(B, n_heads, T, d_k) -> (B, T, d_model)
        out = out.transpose(1, 2).contiguous().view(B, T, self.d_model)
        return self.out(out)
```

几个容易写错的地方：

- `transpose(1, 2)` 之后**必须** `contiguous()`，否则 `view` 会报错
- 多头不是把 `d_model` 拆小了算，而是让**每个头在低维子空间里独立地看一遍全序列**，最后再拼起来
- mask 用 `-inf` 而不是 0，因为后面要过 softmax；填 0 会变成「有权重但不表达信息」，填 `-inf` 才是真的不看

## 多头到底在「多」什么

把单头换成多头，参数量没变（`d_model` 被均分给各个头），但表达能力变强了。

直觉是：**不同的头会自发分工**。在实际训练好的模型里，经常能观察到一些头专门盯紧邻词、一些头负责找语法上的主谓关系、还有一些头在追踪长距离的指代。如果只有一个头，它必须在同一组权重里同时表达所有这些关系，很难。

代价是每个头的维度变小了。所以这是一个「宽度换多样性」的权衡，`d_k` 取 64 左右是个经验上的甜点。

## 位置编码：Transformer 其实看不见顺序

注意力是**置换等变**的——把输入序列打乱，输出也只是跟着打乱，模型无法感知原始顺序。

所以必须显式地把位置信息注入进去。几种主流做法：

| 方案 | 代表模型 | 特点 |
| --- | --- | --- |
| 正弦位置编码 | 原始 Transformer | 固定、不占参数，外推能力有限 |
| 可学习位置嵌入 | BERT、GPT-2 | 简单，但长度上限被训练时的最大长度锁死 |
| 旋转位置编码 RoPE | Llama、Qwen 等 | 把位置编码进 Q/K 的旋转角度，相对位置表达自然 |

现在的新模型基本都转向了 RoPE，原因是它在**相对位置**的建模上更自然：两个 token 的注意力分数主要取决于它们的相对距离，而不依赖各自的绝对位置。

## 小结

- 注意力 = 用 Query 和 Key 算相似度，softmax 归一化后对 Value 加权求和
- 除以 `sqrt(d_k)` 是为了避免 softmax 饱和导致梯度消失，不是为了「归一化好看」
- 多头让模型在不同的子空间里并行关注不同类型的关系
- Transformer 本身没有顺序概念，位置编码是必需品

下一篇可以接着看 [提示工程的实用技巧](/blog/prompt-engineering)，或者从[学习路线](/paths)按顺序往下走。
