---
title: 'LoRA 微调实战：什么时候该微调，以及 4 个关键超参怎么调'
description: 'LoRA 的低秩分解到底省了什么、r 和 alpha 怎么配、QLoRA 能省多少显存，以及微调之前你应该先确认的三件事。'
pubDate: 2026-08-14
category: finetune
tags: ['微调', 'LoRA', 'QLoRA', 'PEFT']
---

「效果不好就微调一下」是新手最常犯的错误之一。微调成本高、见效慢，而且**很多时候你要的效果用提示工程或 RAG 就能达到**。

这篇先讲清楚什么情况下才该微调，再讲 LoRA 怎么调。

## 先确认这三件事

在动手之前，按顺序问自己：

**1. 是「不知道」还是「不会」？**
模型缺的是**知识**（不知道你公司的产品参数），那就上 RAG——知识更新快，不用重训。
模型缺的是**行为和格式**（输出总是不符合你的规范、语气不对、不会调用你的私有工具），那才是微调的用武之地。

> 判断口诀：**知识问题找 RAG，行为问题找微调。**

**2. 提示工程真的调到头了吗？**
先写一个精心设计的提示词，配上 3 到 5 个少样本示例。如果这样能达到 80 分的水平，微调通常能把剩下的提到 90，但要花掉十倍的时间。80 分够不够用，取决于场景。

**3. 有数据吗？**
微调需要**几百到几千条高质量的「输入-输出」对**。数据质量比数量重要得多——100 条精心构造的样本，效果往往好过 5000 条从日志里直接扒出来的脏数据。

如果这三个问题都通过了，再往下看。

## LoRA 省了什么

全量微调的代价在于：模型有多少参数，就要存多少份梯度、优化器状态和副本。一个 7B 模型用 Adam 全量微调，光优化器状态就要几十 GB 显存。

LoRA（Low-Rank Adaptation）的洞察是：**微调时权重的变化量本身是低秩的**。

于是它不去动原权重 `W`，而是把变化量分解成两个小矩阵的乘积：

```text
原始:  h = W·x
LoRA:  h = W·x + (B·A)·x

其中 W 是 d×d，A 是 r×d，B 是 d×r，r << d
```

原权重 `W` 冻结不动，只训练 `A` 和 `B`。参数量从 `d²` 降到 `2·d·r`。

举个例子，`d = 4096`、`r = 8` 时：

- 全量微调这个矩阵：16,777,216 个参数
- LoRA：65,536 个参数

**降到原来的 0.4%。**

初始化时 `A` 用高斯噪声、`B` 全零，保证训练开始时 `B·A = 0`——也就是从原始模型的行为出发，不会一上来就把模型带偏。

另一个好处是**可插拔**：训练产出的是一个几十 MB 的适配器文件，推理时挂到基座上就能用。一个基座可以配多个适配器，按场景切换。

## 四个关键超参

### r：秩，决定容量

`r` 越大，能表达的变化越复杂，但参数也越多、越容易过拟合。

| r | 适用场景 |
| --- | --- |
| 4 ~ 8 | 风格、格式、语气调整 |
| 16 ~ 32 | 学习新任务、领域适配 |
| 64+ | 接近全量微调的效果，但收益递减 |

**从 r=8 开始试。** 大多数情况下 r 从 8 提到 64 带来的提升，远小于数据质量提升带来的提升。

### lora_alpha：缩放系数

LoRA 的输出会乘上 `alpha / r`。所以 `alpha` 控制的是**新学到的变化相对于原权重的强度**。

一个流传很广的经验法则是 **`alpha = 2 * r`**（r=8 配 alpha=16，r=16 配 alpha=32）。这个起点很稳，但注意：如果你改了 `r` 而没改 `alpha`，实际学习率相当于被隐式改了。

### lora_dropout：防过拟合

数据量少于 1000 条时开 0.05 到 0.1；数据多的时候可以关掉。

### target_modules：挂在哪些层上

这可能是**最影响效果**的一个参数。

- 只挂 `q_proj`、`v_proj`：最省，是原始论文的配置
- 挂全部注意力层：`q_proj`、`k_proj`、`v_proj`、`o_proj`
- 再包含 MLP 层：加上 `gate_proj`、`up_proj`、`down_proj`

经验上，**加上 MLP 层带来的提升很明显**，参数量增加也还能接受。如果显存和效果要平衡，至少把 `o_proj` 和 `down_proj` 带上。

## 代码

用 Hugging Face 的 PEFT 库，核心就几行：

```python
from peft import LoraConfig, get_peft_model, TaskType

lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    bias="none",
)

model = get_peft_model(base_model, lora_config)
model.print_trainable_parameters()
# 输出类似：trainable params: 20,185,088 || all params: 6,758,404,096
#            trainable%: 0.30
```

### QLoRA：显存不够时的选择

QLoRA 在 LoRA 基础上多做一件事：**把冻结的基座模型量化成 4-bit 存储**，计算时临时反量化。

显存占用大幅下降——一个 7B 模型从需要几十 GB 降到 6 到 8 GB 左右，单张消费级显卡就能跑。代价是训练速度慢一些，效果相比 16-bit 的 LoRA 通常只有轻微损失。

```python
import torch
from transformers import BitsAndBytesConfig
from peft import prepare_model_for_kbit_training

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",            # 4-bit NormalFloat，比 fp4 更适合正态分布的权重
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,       # 二次量化，再省一点显存
)

model = AutoModelForCausalLM.from_pretrained(
    "your-base-model",
    quantization_config=bnb_config,
    device_map="auto",
)

# 这一步是必须的：让模型适配 k-bit 训练
model = prepare_model_for_kbit_training(model)
model = get_peft_model(model, lora_config)
```

`prepare_model_for_kbit_training` 这个调用**不能省**，它会处理层归一化的精度、开启梯度检查点等，少了它训练很容易发散。

## 数据格式

指令微调的数据通常是「指令-输入-输出」三元组：

```json
{
  "instruction": "把下面的句子翻译成英文",
  "input": "今天天气很好",
  "output": "The weather is nice today."
}
```

然后套进基座模型的对话模板。**这一步很容易出错**：不同模型的模板不一样（Qwen、Llama、Mistral 各不相同），用错模板会让模型学不到东西。

如果用的是对话格式的数据，直接套模型的 `chat_template` 最稳妥：

```python
text = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=False,
)
```

同时**一定要把 prompt 部分的 label 设成 -100**，让它不参与 loss 计算。否则模型会去学习「怎么生成问题」，浪费容量：

```python
labels = input_ids.copy()
# prompt 部分的 token 屏蔽掉，只对回答部分计算损失
labels[:len(prompt_ids)] = [-100] * len(prompt_ids)
```

## 常见的坑

**过拟合。** 训练 loss 一直降但验证效果变差，这是最常见的失败。表现为模型开始复读训练集里的句子，泛化能力下降。对策是减少 epoch（通常 1 到 3 轮就够）、加 dropout、减 r、或者补数据。

**灾难性遗忘。** 学新任务把通用能力搞坏了。LoRA 因为不动原权重，这个问题比全量微调轻得多，但仍然存在。对策是混合一部分通用指令数据一起训。

**只学格式不学能力。** 训练集都是简单样本，模型学会了输出格式但没学会推理。对策是数据里要有一定比例的困难样本。

**忘了 eval。** 从训练集里留 5% 到 10% 做验证，不要用训练 loss 判断效果。

## 小结

- 知识问题用 RAG，行为问题才微调
- LoRA 冻结原权重、只训练低秩增量，参数量能降到 0.5% 以下
- `r` 从 8 起步，`alpha` 取 `2r`，`target_modules` 尽量带上 MLP 层
- 显存不够就上 QLoRA，4-bit 量化后 7B 模型单卡可训
- 数据质量和对话模板的正确性，比超参重要得多

想按顺序系统学，可以走[大模型应用开发路线](/paths)。
