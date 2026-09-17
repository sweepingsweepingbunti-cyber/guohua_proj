import type { APIRoute } from 'astro';
import { CATEGORY_SLUGS, SITE } from '../data/site';
import { collectTags, getPublishedPosts } from '../utils/content';

const esc = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 手写 sitemap，同样是为了不加依赖
export const GET: APIRoute = async ({ site }) => {
	const base = site ?? new URL(SITE.url);
	const posts = await getPublishedPosts();

	const urls: { loc: string; lastmod?: string; priority: string }[] = [
		{ loc: '/', priority: '1.0' },
		{ loc: '/blog', priority: '0.9' },
		{ loc: '/paths', priority: '0.8' },
		{ loc: '/resources', priority: '0.8' },
		{ loc: '/about', priority: '0.5' },
		// 分类页都生成了，即使暂时没文章也列进去
		...CATEGORY_SLUGS.map((c) => ({ loc: `/blog/category/${c}`, priority: '0.6' })),
		...collectTags(posts).map(({ tag }) => ({
			loc: `/blog/tags/${encodeURIComponent(tag)}`,
			priority: '0.4',
		})),
		...posts.map((post) => ({
			loc: `/blog/${post.id}`,
			lastmod: post.data.updatedDate?.toISOString() ?? post.data.pubDate.toISOString(),
			priority: '0.7',
		})),
	];

	const body = urls
		.map(({ loc, lastmod, priority }) => {
			const full = new URL(loc, base).href;
			const parts = [`    <loc>${esc(full)}</loc>`];
			if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
			parts.push(`    <priority>${priority}</priority>`);
			return `  <url>\n${parts.join('\n')}\n  </url>`;
		})
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' },
	});
};
