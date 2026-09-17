import type { APIRoute } from 'astro';
import { SITE } from '../data/site';
import { getPublishedPosts } from '../utils/content';

/** XML 里必须转义的五个字符 */
function esc(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

// 手写 RSS，避免为了一个 feed 引入额外依赖
export const GET: APIRoute = async ({ site }) => {
	const base = site ?? new URL(SITE.url);
	const posts = await getPublishedPosts();

	const items = posts
		.map((post) => {
			const url = new URL(`/blog/${post.id}`, base).href;
			const parts = [
				`      <title>${esc(post.data.title)}</title>`,
				`      <link>${esc(url)}</link>`,
				`      <guid isPermaLink="true">${esc(url)}</guid>`,
				`      <pubDate>${post.data.pubDate.toUTCString()}</pubDate>`,
				`      <description>${esc(post.data.description)}</description>`,
				`      <category>${esc(post.data.category)}</category>`,
				...post.data.tags.map((tag) => `      <category>${esc(tag)}</category>`),
			];
			return `    <item>\n${parts.join('\n')}\n    </item>`;
		})
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.title)}</title>
    <link>${esc(base.href)}</link>
    <description>${esc(SITE.description)}</description>
    <language>${SITE.lang}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${esc(new URL('/rss.xml', base).href)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' },
	});
};
