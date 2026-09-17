---
title: 'AI Agent 的本质：一个 while 循环加几个工具'
description: '抛开框架看本质——Agent 就是「模型决定调哪个工具、你执行、把结果喂回去」的循环。附完整可跑的 Python 实现和四个必踩的坑。'
pubDate: 2026-08-28
category: agent
tags: ['Agent', '工具调用', 'Python', 'Function Calling']
---

Agent 这个词被包装得很玄，但拆开看，**核心就是一个 while 循环**：

```text
while 模型还想调用工具:
    执行工具
    把结果给它
```

模型负责决策，你负责执行，结果再回到模型——如此往复，直到它认为可以给出最终答案。

理解这一点之后，框架就没那么必要了。这篇用原生 SDK 写一个完整的 Agent，不依赖 LangChain 之类的封装。

## 为什么需要这个循环

单次调用只能靠模型参数里的知识回答。但很多事情它做不到：查实时数据、读写你的数据库、发一封邮件、跑一段代码验证猜想。

把这些能力做成**函数**暴露给模型，它就能在需要时主动调用。这就是工具调用（Tool Use / Function Calling）。

关键认知：**模型不执行任何东西**。它只是输出一个结构化的「我想调用 get_weather，参数是 city=北京」。真正执行的永远是你的代码。这意味着**安全边界在你这边**——不该让它碰的东西，不给它工具就行。

## 定义一个工具

工具就是一个 JSON Schema 描述：

```python
tools = [
    {
        "name": "get_weather",
        "description": "查询指定城市当前的天气情况。当用户询问天气、气温、是否需要带伞时使用。",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "城市名称，例如「北京」「上海」",
                }
            },
            "required": ["city"],
        },
    }
]
```

**`description` 是这里最重要的一行**，它决定了模型什么时候会想起用这个工具。写「查询天气」和写「查询指定城市当前的天气情况。当用户询问天气、气温、是否需要带伞时使用」——后者的触发准确率会明显更高。

给参数也写上 description，尤其是那些名字有歧义的参数。

## 完整的 Agent 循环

```python
import anthropic

client = anthropic.Anthropic()


def run_tool(name: str, args: dict) -> str:
    """工具的实际实现。注意：这里是你唯一的防线。"""
    if name == "get_weather":
        # 真实场景换成调天气 API
        return f"{args['city']}：多云，18°C，湿度 62%，无需带伞。"
    raise ValueError(f"未知工具: {name}")


def run_agent(user_message: str, max_turns: int = 10) -> str:
    messages = [{"role": "user", "content": user_message}]

    for _ in range(max_turns):
        response = client.messages.create(
            model="claude-opus-5",
            max_tokens=16000,
            tools=tools,
            messages=messages,
        )

        # 模型已经给出最终答案，结束循环
        if response.stop_reason != "tool_use":
            return "".join(
                block.text for block in response.content if block.type == "text"
            )

        # 关键：把 assistant 这一轮完整塞回历史（含 tool_use 块）
        messages.append({"role": "assistant", "content": response.content})

        # 执行本轮所有工具调用，结果收集到一个列表
        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            try:
                output = run_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,      # 必须对上，否则 API 报错
                    "content": output,
                })
            except Exception as exc:
                # 失败也要回传，让模型知道并自行调整
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": f"工具执行失败: {exc}",
                    "is_error": True,
                })

        # 所有结果放在同一条 user 消息里
        messages.append({"role": "user", "content": tool_results})

    return "已达到最大轮次上限，未能完成任务。"


print(run_agent("北京今天要带伞吗？"))
```

几十行，没有框架。整个 Agent 的骨架就在这里了。

## 四个必须处理的坑

### 坑一：`tool_use_id` 对不上

每个 `tool_result` 都要带 `tool_use_id`，值必须等于对应 `tool_use` 块的 `id`。这是最常见的报错来源——一次性调用多个工具时，很容易接错。

用上面的写法（在同一次遍历里取 `block.id`）就不会错。

### 坑二：并行调用必须放在一条消息里

模型经常在一次回复里同时调用多个工具。**所有 `tool_result` 必须放在同一条 user 消息的 `content` 数组里**，不能拆成多条消息。

拆开会导致一个隐蔽的后果：模型逐渐学会不再并行调用工具，你的 Agent 会变慢，而且很难查原因。上面代码里 `tool_results` 列表就是这个用途。

### 坑三：工具报错不能吞掉

工具执行失败时，**不要跳过**，而是要回传一个带 `is_error: True` 的结果。

模型看到错误信息后通常能自己调整——比如参数传错了会重试，接口挂了会换个思路。如果直接吞掉，模型会以为调用成功了，然后基于错误的前提继续推理，最后给你一个看起来合理但完全错误的答案。

### 坑四：必须有终止条件

`while True` 是个定时炸弹。模型有可能陷入「调用工具 → 结果不满意 → 再调用 → 还是不满意」的死循环，每次都在烧钱。

两个兜底：

1. **限制最大轮次**（上面用 `max_turns`），超出就返回一个明确的提示
2. **限制总 token 预算**，累计 `response.usage.output_tokens`，超了就中断

另外，退出循环前应该检查 `stop_reason`：

- `tool_use`：正常，继续循环
- `end_turn`：正常结束
- `max_tokens`：输出被截断了，`tool_use` 块可能不完整，**不要执行它**
- `refusal`：模型出于安全原因拒绝了，应该把情况告诉用户，而不是重试

## 工具设计的三条原则

Agent 好不好用，八成取决于工具设计，而不是提示词。

**工具数量别太多。** 给模型 50 个工具，它选错的概率会显著上升，而且工具定义本身会占掉大量上下文。建议**保持在 10 到 20 个以内**。工具多了就做分组，或者干脆拆成多个专职 Agent。

**一个工具只做一件事。** `manage_user(action, data)` 这种万能工具对模型很不友好——它得猜 `action` 该填什么、`data` 的结构是什么。拆成 `create_user` / `update_user` / `delete_user` 效果好得多。

**返回结果要精简。** 工具返回 5000 行 JSON，会直接把上下文撑爆，而且干扰模型判断。**只返回它需要的那几个字段**，并且带上字段名（模型看不懂裸数组）。返回结构化的、自解释的结果。

## 加个技能：让 Agent 用代码算数

一个常见需求是让 Agent 做计算。**不要让它心算**——LLM 的算术能力并不可靠。给它一个代码执行工具，让它写代码去算：

```python
{
    "name": "calculate",
    "description": "执行一段 Python 表达式并返回结果。用于任何数学计算，不要自己心算。",
    "input_schema": {
        "type": "object",
        "properties": {
            "expression": {"type": "string", "description": "要计算的 Python 表达式"}
        },
        "required": ["expression"],
    },
}
```

实现时**务必用受限的求值环境**，不要直接 `eval` 用户的输入：

```python
import ast
import operator

ALLOWED_OPS = {
    ast.Add: operator.add, ast.Sub: operator.sub,
    ast.Mult: operator.mul, ast.Div: operator.truediv,
    ast.Pow: operator.pow, ast.Mod: operator.mod,
    ast.USub: operator.neg,
}


def safe_eval(node):
    """只允许算术运算的极简求值器，杜绝任意代码执行"""
    if isinstance(node, ast.Expression):
        return safe_eval(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in ALLOWED_OPS:
        return ALLOWED_OPS[type(node.op)](safe_eval(node.left), safe_eval(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in ALLOWED_OPS:
        return ALLOWED_OPS[type(node.op)](safe_eval(node.operand))
    raise ValueError("表达式中包含不允许的操作")
```

用 `ast` 白名单而不是 `eval`，是因为 `eval` 能让模型执行任意代码——包括读文件、发网络请求。**永远不要把 `eval` 接到模型的输出上。**

## 什么时候不该用 Agent

Agent 更贵、更慢、更难调试。如果任务流程是固定的，**用代码编排的工作流就够了**：

```python
# 固定流程：不需要 Agent，直接写代码
summary = summarize(text)
keywords = extract_keywords(summary)
category = classify(keywords)
```

只有当你**无法预先确定步骤**、必须让模型根据中间结果决定下一步时，Agent 才划算。

判断标准很简单：如果你的流程图能在写代码之前就画完整，那它就不需要 Agent。

## 小结

- Agent = 模型决策 + 你的代码执行 + 结果回传，循环到结束
- 模型不执行任何东西，安全边界完全在你这边
- 一次回复里的多个 `tool_use`，结果必须放在**同一条** user 消息里
- 工具报错要回传 `is_error`，不要吞掉
- 一定要有轮次和预算上限
- 工具设计：数量少、职责单一、返回精简
- 流程固定就别用 Agent

把 Agent 和外部知识结合起来，可以接着看 [RAG 检索增强生成](/blog/rag-in-practice)。
