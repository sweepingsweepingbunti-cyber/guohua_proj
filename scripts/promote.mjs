#!/usr/bin/env node
/**
 * 把隔离区里的投稿提升成正式内容 —— 由你本人在合并 PR 之后手动运行。
 *
 *   npm run promote -- submissions/articles/issue-12.md
 *   npm run promote -- submissions/articles/issue-12.md --strip
 *   npm run promote -- submissions/tools/issue-12.md
 *
 * 文章：写进 src/content/blog/<slug>.md，然后删掉隔离区那份
 * 工具：写进 src/content/tools/<slug>.md，同上
 *
 * ⚠️ 这里是全流程唯一的强制挡板，请认真读下面这段。
 *
 * Astro 7 默认的 Markdown 处理器（@astrojs/markdown-satteri）**不做转义、
 * 不做剥离** —— 正文里的 `<script>` / `onerror=` 会原样出现在构建产物里，
 * 也就是说会在每个访客的浏览器里执行。这是实测结论，不是推测。
 *
 * 所以本脚本在写入前会扫描危险 HTML：
 *   · 默认：命中就拒绝，列出文件名和行号，不写任何东西
 *   · --strip：删掉命中的整行后再写（只处理整行独占的情况）
 *   · 无论哪种，写盘前都会**再扫一遍**，只要还剩危险片段就拒绝。
 *     也就是说：本脚本永远不会写出一个仍含危险 HTML 的文件。
 *
 * 但要说清楚：**这是检查，不是 sanitizer。** 它挡得住明显的注入，
 * 挡不住所有绕过手法（比如把标签拆到多行、或用 Markdown 语法构造链接）。
 * 真正的保证来自「上站前你亲自读过一遍正文」这个流程本身 ——
 * 别把 --strip 当成免责按钮。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
// slugify 和投稿落盘共用一套规则，避免两边生成的文件名对不上
import { slugify } from './intake.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CATEGORY_SLUGS = ['basics', 'llm', 'prompt', 'rag', 'agent', 'finetune', 'tools'];

/**
 * 危险片段。写成正则是为了大小写不敏感和容忍标签里的空白，
 * 例如 `< script` 这种写法浏览器虽然不认，但 `<SCRIPT` 是认的。
 */
const DANGEROUS = [
	{ name: 'script 标签', re: /<\s*\/?\s*script\b/i },
	{ name: 'iframe 标签', re: /<\s*\/?\s*iframe\b/i },
	{ name: 'object / embed 标签', re: /<\s*\/?\s*(object|embed|applet)\b/i },
	{ name: 'form / input / button 标签', re: /<\s*\/?\s*(form|input|button|textarea|select)\b/i },
	{ name: 'style / link / meta / base 标签', re: /<\s*\/?\s*(style|link|meta|base)\b/i },
	{ name: 'svg 标签', re: /<\s*\/?\s*svg\b/i },
	{ name: '内联事件属性', re: /\bon[a-z]+\s*=/i },
	{ name: 'javascript: URL', re: /javascript\s*:/i },
	{ name: 'data:text/html URL', re: /data\s*:\s*text\/html/i },
];

function die(msg) {
	console.error(`\n✖ ${msg}\n`);
	process.exit(1);
}

/**
 * 扫描危险 HTML，返回命中列表。
 * @returns {{line:number, name:string, text:string}[]}
 */
function scanDangerous(text) {
	const hits = [];
	const lines = text.replace(/\r\n/g, '\n').split('\n');
	lines.forEach((line, i) => {
		for (const { name, re } of DANGEROUS) {
			if (re.test(line)) hits.push({ line: i + 1, name, text: line.trim().slice(0, 120) });
		}
	});
	return hits;
}

function reportHits(hits) {
	console.error(`  命中 ${hits.length} 处危险 HTML：\n`);
	for (const h of hits) {
		console.error(`   第 ${h.line} 行  [${h.name}]`);
		console.error(`      ${h.text}`);
	}
	console.error('');
}

/** 删掉命中危险片段的整行。只处理整行独占的情况，行内的留给人工 */
function stripDangerousLines(text) {
	const lines = text.replace(/\r\n/g, '\n').split('\n');
	const kept = lines.filter((line) => !DANGEROUS.some(({ re }) => re.test(line)));
	return { text: kept.join('\n'), removed: lines.length - kept.length };
}

/** 极简 frontmatter 解析。只认「key: value」和「key: [a, b]」，够用了 */
function parseFrontmatter(raw) {
	const text = raw.replace(/\r\n/g, '\n');
	if (!text.startsWith('---\n')) die('文件开头不是 frontmatter');
	const end = text.indexOf('\n---', 4);
	if (end === -1) die('frontmatter 没有闭合的 ---');

	const head = text.slice(4, end);
	const body = text.slice(text.indexOf('\n', end + 1) + 1);
	const data = {};

	for (const line of head.split('\n')) {
		const m = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
		if (!m) continue;
		const [, key, rawValue] = m;
		let value = rawValue.trim();
		if (value.startsWith('[') && value.endsWith(']')) {
			// 数组：用 JSON 解析（写的时候就是 JSON.stringify 出来的）
			try {
				value = JSON.parse(value);
			} catch {
				value = value
					.slice(1, -1)
					.split(',')
					.map((s) => s.trim().replace(/^["']|["']$/g, ''))
					.filter(Boolean);
			}
		} else if (value.startsWith('"')) {
			try {
				value = JSON.parse(value);
			} catch {
				/* 解析不了就原样留着，后面校验会兜住 */
			}
		}
		data[key] = value;
	}
	return { data, body };
}

const y = (v) => JSON.stringify(String(v));

function main() {
	const args = process.argv.slice(2);
	const strip = args.includes('--strip');

	// --slug 用来覆盖自动生成的 slug（比如把中文标题换成英文）
	const slugIdx = args.findIndex((a) => a === '--slug' || a.startsWith('--slug='));
	let slugOverride = null;
	const consumed = new Set();

	if (slugIdx !== -1) {
		const flag = args[slugIdx];
		if (flag.includes('=')) {
			slugOverride = flag.slice(flag.indexOf('=') + 1);
			consumed.add(slugIdx);
		} else {
			slugOverride = args[slugIdx + 1];
			consumed.add(slugIdx).add(slugIdx + 1);
		}
		if (!slugOverride || slugOverride.startsWith('--')) die('--slug 后面要跟一个值');
	}

	const paths = args.filter((a, i) => !a.startsWith('--') && !consumed.has(i));

	if (paths.length !== 1) {
		die('用法：npm run promote -- <隔离区文件路径> [--slug <英文-slug>] [--strip]');
	}

	const source = resolve(ROOT, paths[0]);

	// 只允许提升 submissions/ 下的文件，避免手滑把别的东西搬走
	const quarantine = join(ROOT, 'submissions');
	const rel = relative(quarantine, source);
	if (rel.startsWith('..') || !existsSync(source)) {
		die(`只能提升 submissions/ 下的文件，找不到：${paths[0]}`);
	}

	const { data, body: rawBody } = parseFrontmatter(readFileSync(source, 'utf8'));
	const kind = data.submission;

	if (kind !== 'article' && kind !== 'tool') {
		die(`不认识的内容类型：${JSON.stringify(kind)}（应为 article 或 tool）`);
	}

	// ---- 校验字段 ----
	let slug;
	if (kind === 'article') {
		if (!data.title) die('缺 title');
		if (!data.description) die('缺 description');
		if (!CATEGORY_SLUGS.includes(data.category)) {
			die(`分类 ${JSON.stringify(data.category)} 不在允许列表里：${CATEGORY_SLUGS.join(' / ')}`);
		}
		slug = data.slug || '';
	} else {
		if (!data.name) die('缺 name');
		if (!data.description) die('缺 description');
		if (!/^https?:\/\//i.test(String(data.repo || ''))) {
			die(`仓库地址不合法：${JSON.stringify(data.repo)}`);
		}
		slug = slugify(data.name);
	}

	if (slugOverride) slug = slugOverride;

	// 关键：slug 会被拼进写盘路径，必须挡住路径穿越
	if (!/^[a-z0-9一-鿿-]+$/.test(slug)) {
		die(`slug ${JSON.stringify(slug)} 含非法字符，只允许小写字母、数字、连字符和中文`);
	}
	if (slug === '.' || slug === '..' || slug.length > 80) die(`slug 不合法：${slug}`);

	const targetDir = kind === 'article' ? join(ROOT, 'src', 'content', 'blog') : join(ROOT, 'src', 'content', 'tools');
	const target = join(targetDir, `${slug}.md`);
	if (!resolve(target).startsWith(resolve(targetDir))) die('目标路径越界');
	if (existsSync(target)) die(`目标已存在，不会覆盖：${relative(ROOT, target)}`);

	// ---- HTML 检查（强制挡板）----
	console.log(`\n▸ 检查 ${relative(ROOT, source)}`);
	let body = rawBody;
	let hits = scanDangerous(body);

	if (hits.length > 0 && !strip) {
		reportHits(hits);
		die(
			'正文里有内嵌 HTML，已拒绝提升。\n' +
				'  请手动改干净（推荐），或确认风险后加 --strip 自动删除这些行：\n' +
				`    npm run promote -- ${paths[0]} --strip`,
		);
	}

	if (hits.length > 0 && strip) {
		reportHits(hits);
		const { text, removed } = stripDangerousLines(body);
		body = text;
		console.log(`  已删除 ${removed} 行，重新扫描…`);
	}

	// 写盘前的最后一道：不管走哪条路径，这里必须干净
	hits = scanDangerous(body);
	if (hits.length > 0) {
		reportHits(hits);
		die(
			'删除整行之后仍然有危险片段残留（多半是行内写法，删行没用）。\n' +
				'  请手动改干净再提升。',
		);
	}
	console.log('  ✔ 没有危险 HTML');

	// 投稿人写的是中文标题，自动生成的 slug 也就是中文的。这能跑，但 URL 会变成
	// 一长串百分号编码，而且和站内既有的英文 slug 不一致。不强制拦住（中文 URL
	// 本身合法），但每次都提醒一句。
	if (!slugOverride && /[^\x00-\x7F]/.test(slug)) {
		console.log(`\n⚠ slug 是「${slug}」，含非 ASCII 字符，URL 会被百分号编码。`);
		console.log('  想换成英文的话，重跑时加 --slug <英文名>，例如：');
		console.log(`    npm run promote -- ${paths[0]} --slug my-post-name`);
	}

	// ---- 写目标文件 ----
	const today = new Date().toISOString().slice(0, 10);
	const credit = data.author ? `credit: ${y(data.author)}` : null;

	let out;
	if (kind === 'article') {
		const tags = Array.isArray(data.tags) ? data.tags : [];
		out = [
			'---',
			`title: ${y(data.title)}`,
			`description: ${y(data.description)}`,
			`pubDate: ${today}`,
			`category: ${data.category}`,
			`tags: ${JSON.stringify(tags)}`,
			'draft: false',
			'featured: false',
			...(credit ? [credit] : []),
			'---',
			'',
			body.trim(),
			'',
		].join('\n');
	} else {
		const tags = Array.isArray(data.tags) ? data.tags : [];
		out = [
			'---',
			`name: ${y(data.name)}`,
			`description: ${y(data.description)}`,
			`repo: ${y(data.repo)}`,
			`author: ${y(data.author || 'anonymous')}`,
			`tags: ${JSON.stringify(tags)}`,
			`addedDate: ${today}`,
			'---',
			'',
			body.trim(),
			'',
		].join('\n');
	}

	mkdirSync(targetDir, { recursive: true });
	writeFileSync(target, out, 'utf8');
	unlinkSync(source);

	console.log(`\n✔ 已提升：${relative(ROOT, target)}`);
	console.log(`  隔离区文件已删除：${basename(source)}`);
	console.log('\n下一步：');
	console.log('  1. 打开文件读一遍正文 —— 这一步不能省');
	console.log('  2. npm run build');
	console.log('  3. git add . && git commit && git push（Netlify 会自动发布）\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main();
}
