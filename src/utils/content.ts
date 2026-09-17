import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/** 取所有已发布文章，按发布日期倒序（草稿自动排除） */
export async function getPublishedPosts(): Promise<Post[]> {
	const posts = await getCollection('blog', ({ data }) => !data.draft);
	return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** 取所有学习路线，按 order 升序 */
export async function getSortedPaths(): Promise<CollectionEntry<'paths'>[]> {
	const paths = await getCollection('paths');
	return paths.sort((a, b) => a.data.order - b.data.order);
}

/**
 * 估算阅读时长（分钟）。
 * 中文按 300 字/分钟、英文按 200 词/分钟，代码块也算进去但权重自然被稀释。
 */
export function readingTime(body?: string): number {
	if (!body) return 1;
	const cjk = (body.match(/[一-鿿]/g) ?? []).length;
	const words = (body.match(/[A-Za-z0-9]+/g) ?? []).length;
	return Math.max(1, Math.round(cjk / 300 + words / 200));
}

/** 2026-09-17 这种格式，中文站比 09/17/2026 好读 */
export function formatDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/** 汇总所有文章的标签，按出现次数从多到少排序 */
export function collectTags(posts: Post[]): { tag: string; count: number }[] {
	const counter = new Map<string, number>();
	for (const post of posts) {
		for (const tag of post.data.tags) {
			counter.set(tag, (counter.get(tag) ?? 0) + 1);
		}
	}
	return [...counter.entries()]
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** 统计每个分类下的文章数，用于列表页的分类筛选条 */
export function countByCategory(posts: Post[]): Record<string, number> {
	const counter: Record<string, number> = {};
	for (const post of posts) {
		const key = post.data.category;
		counter[key] = (counter[key] ?? 0) + 1;
	}
	return counter;
}
