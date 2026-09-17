/**
 * 资源导航的数据源。
 *
 * 结构化数据（一堆链接）写成 TS 数组比写成几十个 Markdown 文件好维护：
 * 加一条资源就是往对应分组里 push 一个对象。
 */

export interface ResourceLink {
	/** 链接标题 */
	title: string;
	/** 一句话说明它是干什么的 */
	desc: string;
	href: string;
	/** 右上角的小标签，比如「官方」「必读」 */
	badge?: string;
}

export interface ResourceGroup {
	id: string;
	title: string;
	desc: string;
	icon: string;
	links: ResourceLink[];
}

export const RESOURCE_GROUPS: ResourceGroup[] = [
	{
		id: 'papers',
		title: '论文与原理',
		desc: '想搞懂「为什么」的时候，回到这几篇原始论文最有效。',
		icon: '📄',
		links: [
			{
				title: 'Attention Is All You Need',
				desc: 'Transformer 的原始论文，一切现代大模型的起点。',
				href: 'https://arxiv.org/abs/1706.03762',
				badge: '必读',
			},
			{
				title: 'The Illustrated Transformer',
				desc: 'Jay Alammar 的图解教程，注意力机制看这篇最容易懂。',
				href: 'https://jalammar.github.io/illustrated-transformer/',
			},
			{
				title: 'Training language models to follow instructions with human feedback',
				desc: 'InstructGPT 论文，RLHF 路线的奠基工作。',
				href: 'https://arxiv.org/abs/2203.02155',
			},
			{
				title: 'LoRA: Low-Rank Adaptation of Large Language Models',
				desc: '把微调成本降下来的关键论文。',
				href: 'https://arxiv.org/abs/2106.09685',
			},
			{
				title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
				desc: 'RAG 的原始论文，理解检索增强的第一站。',
				href: 'https://arxiv.org/abs/2005.11401',
			},
		],
	},
	{
		id: 'models',
		title: '模型与权重',
		desc: '动手时用得上的模型入口，从能本地跑到只走 API 的都在这里。',
		icon: '🧠',
		links: [
			{
				title: 'Hugging Face Models',
				desc: '开源权重的总入口，找基座模型先来这里。',
				href: 'https://huggingface.co/models',
				badge: '官方',
			},
			{
				title: 'Qwen',
				desc: '通义千问开源系列，中文场景表现好，尺寸覆盖全。',
				href: 'https://github.com/QwenLM/Qwen',
			},
			{
				title: 'DeepSeek',
				desc: 'DeepSeek 系列开源模型与论文。',
				href: 'https://github.com/deepseek-ai',
			},
			{
				title: 'Meta Llama',
				desc: 'Llama 系列，开源生态里被微调最多的基座之一。',
				href: 'https://github.com/meta-llama',
			},
			{
				title: 'Anthropic Claude',
				desc: 'Claude 模型与 API 文档，长上下文和工具调用值得关注。',
				href: 'https://docs.anthropic.com',
			},
		],
	},
	{
		id: 'tools',
		title: '框架与工具',
		desc: '把模型跑起来、串成应用所需要的那几件工具。',
		icon: '🛠️',
		links: [
			{
				title: 'Ollama',
				desc: '一条命令在本地跑起开源模型，试水最省事的方式。',
				href: 'https://ollama.com',
			},
			{
				title: 'vLLM',
				desc: '高吞吐推理引擎，要压测和上线时绕不开。',
				href: 'https://github.com/vllm-project/vllm',
			},
			{
				title: 'LangChain',
				desc: 'LLM 应用编排框架，把检索、工具、记忆串起来。',
				href: 'https://python.langchain.com',
			},
			{
				title: 'LlamaIndex',
				desc: '面向 RAG 的数据框架，索引与检索抽象做得很完整。',
				href: 'https://docs.llamaindex.ai',
			},
			{
				title: 'PEFT',
				desc: 'Hugging Face 的参数高效微调库，LoRA 全家桶都在这。',
				href: 'https://github.com/huggingface/peft',
			},
		],
	},
	{
		id: 'learning',
		title: '课程与教程',
		desc: '成体系的学习材料，适合按顺序啃。',
		icon: '📚',
		links: [
			{
				title: 'Hugging Face NLP Course',
				desc: '免费且质量高，从 Transformer 讲到微调和部署。',
				href: 'https://huggingface.co/learn/nlp-course',
				badge: '推荐',
			},
			{
				title: 'Karpathy: Neural Networks Zero to Hero',
				desc: '从反向传播手撸到 GPT，想彻底搞懂原理就看这个。',
				href: 'https://karpathy.ai/zero-to-hero.html',
			},
			{
				title: 'Karpathy: Let\'s build GPT',
				desc: '两小时从零实现一个 GPT，代码量小但结构完整。',
				href: 'https://www.youtube.com/watch?v=kCc8FmEb1nY',
			},
			{
				title: 'Anthropic Prompt Engineering Guide',
				desc: '提示工程的官方指南，实践性很强。',
				href: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview',
			},
		],
	},
	{
		id: 'community',
		title: '社区与资讯',
		desc: '跟进度、找人讨论、看别人怎么踩坑。',
		icon: '💬',
		links: [
			{
				title: 'Papers with Code',
				desc: '论文配实现，找复现最快的入口。',
				href: 'https://paperswithcode.com',
			},
			{
				title: 'Hugging Face Papers',
				desc: '每日热门论文，刷一圈就知道大家在关注什么。',
				href: 'https://huggingface.co/papers',
			},
			{
				title: 'r/LocalLLaMA',
				desc: '本地部署与开源模型的活跃讨论区。',
				href: 'https://www.reddit.com/r/LocalLLaMA/',
			},
		],
	},
];
