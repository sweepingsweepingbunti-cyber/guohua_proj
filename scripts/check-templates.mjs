#!/usr/bin/env node
/**
 * 一致性自检：Issue 表单的字段名 ↔ intake.mjs 的字段映射 ↔ 分类列表。
 *
 * 这三处是靠字符串约定连起来的，改一处忘了另一处就会在投稿时才炸
 * （而且是炸在 GitHub Action 里，本地根本看不见）。所以这里做成一条命令，
 * 改完表单顺手跑一下：
 *
 *   node scripts/check-templates.mjs
 *
 * 也可以挂进 npm run build 前面，但默认不挂 —— 没装 yaml 依赖，
 * 这里用的是 Astro 依赖树里正好有的 js-yaml，属于借用，不宜进构建链路。
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

let yaml;
try {
	yaml = require('js-yaml');
} catch {
	console.error('✖ 找不到 js-yaml（Astro 的依赖树里应该有）。这条自检不是构建必需品，跳过即可。');
	process.exit(1);
}

const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** 从 intake.mjs 源码里抠出某个字段映射表的所有 key */
function fieldMapKeys(source, constName) {
	const block = new RegExp(`const ${constName} = \\{([\\s\\S]*?)\\n\\};`).exec(source);
	if (!block) throw new Error(`在 intake.mjs 里找不到 ${constName}`);
	return [...block[1].matchAll(/'([^']+)':/g)].map((m) => m[1]);
}

/** 取表单里所有带 label 的字段（授权确认是纯复选框，不是字段，排除） */
function formLabels(doc) {
	return doc.body
		.map((item) => item.attributes?.label)
		.filter((label) => label && label !== '授权确认');
}

const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

const intakeSrc = read('scripts/intake.mjs');
const article = yaml.load(read('.github/ISSUE_TEMPLATE/submit-article.yml'));
const tool = yaml.load(read('.github/ISSUE_TEMPLATE/submit-tool.yml'));

const checks = [
	{
		name: '文章表单字段 ↔ intake ARTICLE_FIELDS',
		form: formLabels(article),
		code: fieldMapKeys(intakeSrc, 'ARTICLE_FIELDS'),
	},
	{
		name: '工具表单字段 ↔ intake TOOL_FIELDS',
		form: formLabels(tool),
		code: fieldMapKeys(intakeSrc, 'TOOL_FIELDS'),
	},
	{
		name: '分类下拉选项 ↔ site.ts CATEGORY_SLUGS',
		form: article.body.find((i) => i.id === 'category')?.attributes.options ?? [],
		code: /CATEGORY_SLUGS = \[([\s\S]*?)\]/
			.exec(read('src/data/site.ts'))[1]
			.match(/'([^']+)'/g)
			.map((s) => s.replace(/'/g, '')),
	},
];

let failed = 0;
for (const c of checks) {
	const ok = same(c.form, c.code);
	if (!ok) failed++;
	console.log(`${ok ? '✔' : '✖'} ${c.name}`);
	if (!ok) {
		console.log(`    表单：${c.form.join(' | ')}`);
		console.log(`    代码：${c.code.join(' | ')}`);
	}
}

// 投稿类型判断依赖这两个标签名，也顺手核对一下
const labelOk =
	article.labels?.includes('投稿-文章') && tool.labels?.includes('投稿-工具');
console.log(`${labelOk ? '✔' : '✖'} 表单自动标签（投稿-文章 / 投稿-工具）`);
if (!labelOk) failed++;

console.log(failed ? `\n✖ ${failed} 项不一致` : '\n✔ 全部一致');
process.exit(failed ? 1 : 0);
