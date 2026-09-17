#!/usr/bin/env node
/**
 * 全站内部链接自检：扫 dist/ 下每个 HTML，把站内链接逐个对回产物文件。
 *
 *   npm run build && node scripts/check-links.mjs
 *
 * 为什么需要它：站点是静态的，死链在构建时不会报错 —— Astro 照样生成页面，
 * Netlify 照样发布，只有访客点进去才会看到 404。这个脚本把这类问题拦在推送前。
 *
 * 只检查站内链接（以 / 开头且不带协议的）。外部链接不请求网络 ——
 * 那样既慢又不稳定，外链失效交给别的工具管。
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

if (!existsSync(DIST)) {
	console.error('✖ 找不到 dist/ —— 先跑 npm run build');
	process.exit(1);
}

/** 递归收集所有 .html */
function walk(dir, out = []) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) walk(p, out);
		else if (name.endsWith('.html')) out.push(p);
	}
	return out;
}

/** 站内路径 → dist 里的产物文件 */
function resolveTarget(pathOnly) {
	const clean = pathOnly.split('?')[0].split('#')[0];
	if (clean === '' || clean === '/') return join(DIST, 'index.html');
	// /foo/ → /foo/index.html；/foo → 先试 foo/index.html 再试 foo.html
	const rel = clean.replace(/^\//, '');
	const cands = [
		join(DIST, `${rel.replace(/\/$/, '')}/index.html`),
		join(DIST, `${rel}.html`),
		join(DIST, rel),
	];
	return cands.find((c) => existsSync(c));
}

const files = walk(DIST);
const broken = [];
let checked = 0;

for (const file of files) {
	const html = readFileSync(file, 'utf8');
	const page = '/' + relative(DIST, file).replace(/\\/g, '/');

	for (const m of html.matchAll(/href="([^"]+)"/g)) {
		const href = m[1];
		// 跳过外部链接、锚点、协议链接（mailto: / javascript: 等）
		if (!href.startsWith('/') || href.startsWith('//')) continue;
		checked++;
		if (!resolveTarget(href)) {
			broken.push({ page, href });
		}
	}

	// src 也顺手查一下站内资源（图片、脚本）
	for (const m of html.matchAll(/src="([^"]+)"/g)) {
		const src = m[1];
		if (!src.startsWith('/') || src.startsWith('//')) continue;
		checked++;
		if (!resolveTarget(src)) broken.push({ page, href: `${src}  (src)` });
	}
}

console.log(`扫描 ${files.length} 个页面，检查 ${checked} 条站内链接`);

if (broken.length === 0) {
	console.log('✔ 没有死链');
	process.exit(0);
}

// 按目标聚合，同一个坏链接在很多页面出现时只报一次更易读
const byHref = new Map();
for (const b of broken) {
	if (!byHref.has(b.href)) byHref.set(b.href, []);
	byHref.get(b.href).push(b.page);
}

console.log(`\n✖ 发现 ${broken.length} 处死链（${byHref.size} 个不同目标）：\n`);
for (const [href, pages] of byHref) {
	console.log(`  ${href}`);
	console.log(`    出现在 ${pages.length} 个页面，例如：${pages.slice(0, 3).join(', ')}`);
}
process.exit(1);
