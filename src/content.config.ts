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

export const collections = { blog, paths };
