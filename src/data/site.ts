/**
 * 全站唯一的品牌信息来源。
 *
 * 想改站名、副标题、导航、作者、分类？只改这个文件就够了，
 * 页头、页脚、SEO meta、RSS 都会跟着变。
 */

/** 文章分类的 slug（英文，用于 URL 和 frontmatter） */
export const CATEGORY_SLUGS = [
	'basics',
	'llm',
	'prompt',
	'rag',
	'agent',
	'finetune',
	'tools',
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

/** 分类的中文名与说明。key 必须和 CATEGORY_SLUGS 一一对应 */
export const CATEGORIES: Record<CategorySlug, { label: string; desc: string }> = {
	basics: { label: '基础原理', desc: 'Transformer、注意力机制、分词与训练范式' },
	llm: { label: '大模型', desc: '主流模型的能力边界、评测与选型' },
	prompt: { label: '提示工程', desc: 'Prompt 设计、结构化输出与上下文管理' },
	rag: { label: '检索增强', desc: 'RAG 的切分、召回、重排与工程落地' },
	agent: { label: '智能体', desc: 'Agent 架构、工具调用与多步规划' },
	finetune: { label: '微调训练', desc: 'LoRA、QLoRA 与指令微调的实战细节' },
	tools: { label: '工具实践', desc: '框架、部署与提效工具' },
};

/** 取分类中文名，未知分类直接回落到 slug 本身，避免页面崩掉 */
export function categoryLabel(slug: string): string {
	return CATEGORIES[slug as CategorySlug]?.label ?? slug;
}

export const SITE = {
	name: 'AI 学习园地',
	/** 浏览器标题栏 / SEO title */
	title: 'AI 学习园地 · 大模型学习与分享',
	description:
		'从原理到实战的大模型学习笔记：Transformer、提示工程、RAG、Agent 与微调，配有结构化的学习路线和精选资源。',
	url: 'https://guohua0siqi.online',
	lang: 'zh-CN',
	/** 首页大标题 */
	tagline: '掌握大模型，从原理到实战',
	subTagline:
		'把 Transformer、提示工程、RAG、Agent 和微调这些绕不开的主题，整理成一条能走完的学习路径。',
	author: {
		name: 'guohua', // ← 改成你的名字或昵称
		bio: '在这里记录大模型的学习过程与工程实践，希望这些笔记能帮你少走一点弯路。',
	},
	nav: [
		{ href: '/', label: '首页' },
		{ href: '/blog', label: '文章' },
		{ href: '/paths', label: '学习路线' },
		{ href: '/column', label: '专栏' },
		{ href: '/resources', label: '资源导航' },
		{ href: '/projects', label: '项目' },
		{ href: '/about', label: '关于' },
	],
	/** 留空字符串的项不会渲染 */
	social: {
		github: 'https://github.com/sweepingsweepingbunti-cyber',
		email: '',
	},
} as const;
