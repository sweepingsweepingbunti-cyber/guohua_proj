import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORY_SLUGS } from './data/site';

/**
 * 内容集合定义（Astro Content Layer API）。
 * 注意：这个文件必须叫 src/content.config.ts，路径不能挪。
 */

/** 文章。一篇 Markdown 就是 src/content/blog/ 下的一个 .md 文件 */
const blog = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
	schema: z.object({
		title: z.string(),
		/** 摘要：列表卡片和 SEO description 都用它 */
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		/** 取值必须是 site.ts 里 CATEGORY_SLUGS 中的一个，写错会直接构建报错 */
		category: z.enum(CATEGORY_SLUGS),
		tags: z.array(z.string()).default([]),
		/** draft: true 的文章不会出现在任何列表和 RSS 里，方便写一半先存着 */
		draft: z.boolean().default(false),
		/** featured: true 会优先出现在首页 */
		featured: z.boolean().default(false),
		/**
		 * 投稿人署名。只在社区投稿的文章上填，作者自己的文章留空。
		 * 填了就会在文章页 meta 行显示「本文由 @xxx 投稿」。
		 * 由 scripts/promote.mjs 写入，值来自投稿 issue 的作者。
		 */
		credit: z.string().optional(),
	}),
});

/**
 * 社区工具。审核通过后由 scripts/promote.mjs 写入 src/content/tools/。
 *
 * 刻意没有「执行 / 安装 / 下载」相关字段：本站只做展示，
 * 不运行、不下载执行任何第三方代码。想加这类字段之前，先想清楚
 * 站点是否愿意为别人的代码承担运行责任。
 */
const tools = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/tools' }),
	schema: z.object({
		name: z.string(),
		description: z.string(),
		/** 工具自己的仓库地址。这是唯一的外部跳转出口 */
		repo: z.string().url(),
		/** 提交人（GitHub 用户名，不带 @） */
		author: z.string(),
		tags: z.array(z.string()).default([]),
		addedDate: z.coerce.date(),
		/** 作者本人自荐时标一下，纯展示用 */
		featured: z.boolean().default(false),
		/**
		 * 草稿。集合为空时 Astro 会在每次构建警告 "collection is empty"，
		 * 所以这里长期保留一条 draft 的示例条目当模板用 —— 它不会渲染到页面上。
		 * 有真实工具之后可以删掉 _example.md，但留着也无害。
		 */
		draft: z.boolean().default(false),
	}),
});

/** 学习路线。步骤里用 href 指向文章，把零散的文章串成一条路径 */
const paths = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/paths' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		level: z.enum(['入门', '进阶', '实战']),
		/** 数字越小越靠前 */
		order: z.number().default(0),
		/** 一个 emoji 就够，不用配图 */
		icon: z.string().default('🧭'),
		steps: z
			.array(
				z.object({
					title: z.string(),
					desc: z.string(),
					/** 站内路径，例如 /blog/transformer-attention */
					href: z.string().optional(),
				}),
			)
			.default([]),
	}),
});

export const collections = { blog, paths, tools };
