#!/usr/bin/env node
/**
 * 投稿落盘脚本 —— 在 GitHub Action 里运行。
 *
 * 读一个 GitHub Issue 表单的正文，解析成字段，写进「隔离区」：
 *
 *   submissions/articles/issue-<n>.md   文章投稿
 *   submissions/tools/issue-<n>.md      工具提交
 *
 * 隔离区不参与 Astro 构建（content collection 的 base 是 src/content/blog
 * 和 src/content/tools），所以落到这里的文件不会被渲染成页面。
 * 想真正上站，必须再由人跑 scripts/promote.mjs 提升。
 *
 * ⚠️ 安全要点：issue 正文一律从环境变量读，绝不拼进 shell。
 *    调用方（workflow）必须用 env: 传入，不能把 ${{ }} 写进 run:。
 *
 * 本地演练：
 *   ISSUE_NUMBER=999 ISSUE_AUTHOR=someone ISSUE_LABELS=投稿-文章 \
 *     ISSUE_BODY="$(cat /tmp/body.md)" node scripts/intake.mjs
 */

import { writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 正文上限。超过就拒收 —— 防止有人拿 issue 当网盘 */
const MAX_BODY_BYTES = 200 * 1024;

/** 合法分类，必须和 src/data/site.ts 的 CATEGORY_SLUGS 保持一致 */
const CATEGORY_SLUGS = ['basics', 'llm', 'prompt', 'rag', 'agent', 'finetune', 'tools'];

/** 表单字段名 → 内部字段名。label 必须和 .github/ISSUE_TEMPLATE 里的完全一致 */
const ARTICLE_FIELDS = {
	'文章标题': 'title',
	'一句话摘要': 'description',
	'分类': 'category',
	'标签': 'tags',
	'正文': 'body',
};

const TOOL_FIELDS = {
	'工具名称': 'name',
	'一句话说明': 'description',
	'它是做什么的': 'body',
	'仓库地址': 'repo',
	'标签': 'tags',
};

/** GitHub 对留空的可选字段填的占位符 */
const NO_RESPONSE = /^_no response_$/i;

function fail(msg) {
	console.error(`\n✖ 投稿未通过：${msg}\n`);
	process.exit(1);
}

/** 把字符串转成安全的文件名片段。保留中文，其余只留字母数字和连字符 */
export function slugify(input) {
	const s = String(input)
		.normalize('NFKC')
		.toLowerCase()
		.replace(/[\s_]+/g, '-')
		.replace(/[^a-z0-9一-鿿-]/g, '')
		.replace(/-{2,}/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
	return s || 'post';
}

/**
 * 解析 GitHub Issue 表单正文。
 *
 * 表单渲染出来的结构就是若干个 `### 字段名` 小节，所以我们按 `### ` 切块。
 * 值里如果本身带 `### ` 开头的一行会被误切 —— 这是已知取舍，
 * 真出现了人工审核时能一眼看出来。
 */
export function parseIssueForm(body) {
	const fields = {};
	// 统一换行符，否则 Windows 上跑本地演练会切不开
	const normalized = String(body).replace(/\r\n/g, '\n');
	const parts = normalized.split(/^###[ \t]+/m);

	for (const part of parts) {
		if (!part.trim()) continue;
		const nl = part.indexOf('\n');
		if (nl === -1) continue;
		const label = part.slice(0, nl).trim();
		let value = part.slice(nl + 1).trim();
		if (NO_RESPONSE.test(value)) value = '';
		fields[label] = value;
	}
	return fields;
}

/** 按字段映射表取出值；缺必填项直接失败 */
function collect(raw, mapping, required) {
	const out = {};
	for (const [label, key] of Object.entries(mapping)) {
		out[key] = raw[label] ?? '';
	}
	const missing = required.filter((k) => !out[k]);
	if (missing.length) {
		const labels = Object.entries(mapping)
			.filter(([, k]) => missing.includes(k))
			.map(([l]) => `「${l}」`);
		fail(`这些必填项是空的：${labels.join('、')}`);
	}
	return out;
}

/** 逗号 / 顿号 / 空格分隔的标签串 → 数组 */
function parseTags(s) {
	return String(s || '')
		.split(/[,，、\s]+/)
		.map((t) => t.replace(/^#/, '').trim())
		.filter(Boolean)
		.slice(0, 8);
}

/** YAML 标量。JSON 的双引号转义是 YAML 双引号标量的子集，所以直接复用 */
const y = (v) => JSON.stringify(String(v));

function main() {
	const body = process.env.ISSUE_BODY ?? '';
	const number = process.env.ISSUE_NUMBER ?? '';
	const author = (process.env.ISSUE_AUTHOR ?? '').trim();
	const labels = (process.env.ISSUE_LABELS ?? '').trim();

	if (!body.trim()) fail('issue 正文是空的');
	if (!/^\d+$/.test(number)) fail(`issue 编号不是数字：${JSON.stringify(number)}`);
	if (!author) fail('拿不到 issue 作者');
	if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
		fail(`正文超过 ${Math.round(MAX_BODY_BYTES / 1024)}KB 上限`);
	}

	const raw = parseIssueForm(body);

	// 判断投稿类型。首选标签（表单里配的自动标签），但标签不一定存在
	// —— 所以再用「表单里出现了哪一组字段」兜底。两条路都走不通才拒收。
	let isTool = labels.includes('投稿-工具');
	let isArticle = labels.includes('投稿-文章');
	if (isTool === isArticle) {
		const hasToolFields = Boolean(raw['工具名称']);
		const hasArticleFields = Boolean(raw['文章标题']);
		if (hasToolFields !== hasArticleFields) {
			isTool = hasToolFields;
			isArticle = hasArticleFields;
			console.warn('⚠ 标签无法判断类型，改用表单字段推断');
		} else {
			fail(
				`无法判断投稿类型（标签：${JSON.stringify(labels)}，` +
					'表单里也没找到「文章标题」或「工具名称」）。请从投稿表单入口提交',
			);
		}
	}
	const submittedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

	let frontmatter;
	let outPath;
	let kind;

	if (isArticle) {
		kind = 'article';
		const f = collect(raw, ARTICLE_FIELDS, ['title', 'description', 'category', 'body']);
		if (!CATEGORY_SLUGS.includes(f.category)) {
			fail(`分类 ${JSON.stringify(f.category)} 不在允许列表里：${CATEGORY_SLUGS.join(' / ')}`);
		}
		const allTags = parseTags(f.tags);
		// 「投稿」标签方便你在 GitHub 上筛，同时正文里也标一下来源
		frontmatter = [
			'---',
			'submission: article',
			`issue: ${number}`,
			`author: ${y(author)}`,
			`submittedAt: ${submittedAt}`,
			`slug: ${y(slugify(f.title))}`,
			`title: ${y(f.title)}`,
			`description: ${y(f.description)}`,
			`category: ${f.category}`,
			`tags: ${JSON.stringify([...new Set([...allTags, '投稿'])])}`,
			'---',
		];
		outPath = join(ROOT, 'submissions', 'articles', `issue-${number}.md`);
	} else {
		kind = 'tool';
		const f = collect(raw, TOOL_FIELDS, ['name', 'description', 'body', 'repo']);
		if (!/^https?:\/\//i.test(f.repo)) {
			fail(`仓库地址必须以 http(s):// 开头，现在是 ${JSON.stringify(f.repo)}`);
		}
		frontmatter = [
			'---',
			'submission: tool',
			`issue: ${number}`,
			`author: ${y(author)}`,
			`submittedAt: ${submittedAt}`,
			`name: ${y(f.name)}`,
			`description: ${y(f.description)}`,
			`repo: ${y(f.repo)}`,
			`tags: ${JSON.stringify(parseTags(f.tags))}`,
			'---',
		];
		outPath = join(ROOT, 'submissions', 'tools', `issue-${number}.md`);
	}

	if (existsSync(outPath)) fail(`${outPath} 已存在，可能是重复提交`);

	mkdirSync(dirname(outPath), { recursive: true });
	const file = `${frontmatter.join('\n')}\n\n${raw[isArticle ? '正文' : '它是做什么的']}\n`;
	writeFileSync(outPath, file, 'utf8');

	console.log(`✔ 已落盘（${kind}）：${outPath}`);
	console.log(`  作者：${author}`);

	// 给 workflow 用，决定 commit message 和 PR 文案
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `path=${outPath}\nkind=${kind}\n`);
	}
}

// 只有直接执行才跑 main，被 import 时（比如跑测试）不跑
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main();
}
