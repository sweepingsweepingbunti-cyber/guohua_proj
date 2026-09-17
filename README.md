# 大模型学习交流平台

从原理到实战的大模型学习分享平台。基于 Astro 构建，通过 Git → Netlify 自动部署到 **[guohua0siqi.online](https://guohua0siqi.online)**。

包含八个模块：**文章博客**、**学习路线**、**学习专栏**、**资源导航**、**开发项目**、**投稿**、**社区工具**、**关于 + 订阅**。

投稿走 GitHub issue 表单 → 自动落盘到隔离区 → 人工审核 → 提升发布，见下方「投稿流程」。

---

## 快速开始

```bash
npm install     # 首次运行
npm run dev     # 本地预览 http://localhost:4321
npm run build   # 生产构建到 dist/
```

> 在 Claude Code 里跑 dev server 建议用后台模式：`npm run astro -- dev --background`，
> 配套命令 `astro dev status` / `astro dev stop` / `astro dev logs`。

---

## 怎么加一篇文章（最常用）

### 第一步：在 `src/content/blog/` 下新建一个 `.md` 文件

文件名就是网址。`rag-in-practice.md` → `https://guohua0siqi.online/blog/rag-in-practice`

### 第二步：写好 frontmatter

```markdown
---
title: '文章标题'
description: '一句话摘要。会显示在卡片上，也用作搜索引擎的描述，建议 50 到 100 字。'
pubDate: 2026-09-17
category: rag            # 必须是下面七个之一，写错会构建报错
tags: ['RAG', '向量检索']
draft: false             # true 表示草稿，不会出现在任何列表和 RSS 里
featured: false          # true 会优先出现在首页
---

正文用 Markdown 写。代码块会自动高亮：

\```python
print("hello")
\```
```

### 第三步：提交上线

```bash
git add .
git commit -m "feat: 新增 xxx 文章"
git push
```

推送后 Netlify 会在 30 秒左右自动构建并发布。

### 可用的分类（`category` 只能填这些）

| slug | 中文名 |
| --- | --- |
| `basics` | 基础原理 |
| `llm` | 大模型 |
| `prompt` | 提示工程 |
| `rag` | 检索增强 |
| `agent` | 智能体 |
| `finetune` | 微调训练 |
| `tools` | 工具实践 |

想加新分类：改 `src/data/site.ts` 里的 `CATEGORY_SLUGS` 和 `CATEGORIES`，两处要对应。

---

## 怎么加一条学习路线

在 `src/content/paths/` 下建 `.md`，用 frontmatter 描述阶段：

```markdown
---
title: 路线名称
description: 一句话说明这条路线适合谁
level: 入门          # 入门 / 进阶 / 实战
order: 4             # 数字越小越靠前
icon: 🎯
steps:
  - title: 第一步做什么
    desc: 这一步的说明
    href: /blog/某篇文章    # 可选，填了就变成链接
---

正文写这条路线为什么这么安排。这段会显示在步骤列表上方。
```

---

## 怎么加资源链接

资源导航**不用 Markdown**，直接改 `src/data/resources.ts`，往对应分组的 `links` 数组里加一条：

```ts
{
  title: 'Hugging Face Models',
  desc: '一句话说明它是干什么的',
  href: 'https://huggingface.co/models',
  badge: '官方',        // 可选，右上角的小标签
}
```

---

## 怎么加一个开发项目

改 `src/data/projects.ts`，往 `PROJECTS` 数组里加一条：

```ts
{
  id: 'my-tool',
  name: 'my-tool',
  tagline: '一句话说清它是什么',
  desc: '两三句展开：解决什么问题、怎么做的。',
  icon: '🔧',
  tags: ['Python', 'CLI'],
  // repo: 'https://github.com/你的用户名/my-tool',   // 不填就回落到 GitHub 主页
}
```

`repo` 不填时卡片链接指向 `SITE.social.github`（在 `src/data/site.ts`，也就是页脚「找到我」里那个）。
某个项目单独建了仓库之后再补 `repo` 即可，改一行。

---

## 投稿流程（访客 → 审核 → 发布）

站点是纯静态的，没有后端能接表单提交。所以投稿借 GitHub 的通道走，分三步：

```
访客填 GitHub issue 表单
      ↓
Action 自动落盘到 submissions/（隔离区）+ 开审核 PR
      ↓
你审 PR → 合并 → 本地跑 npm run promote → push → Netlify 发布
```

### 为什么要隔离区

`submissions/` **不参与构建** —— Astro 内容集合的 base 是 `src/content/blog` 和
`src/content/tools`，隔离区不在其中。所以投稿合并进来也**不会**被渲染成页面，
不会出现在任何列表或 RSS 里。真正上站必须由你手动跑提升命令，这是结构性保证。

### 你平时要做的只有两件事

```bash
# 1. 合并 PR 之后，把投稿提升成正式内容
npm run promote -- submissions/articles/issue-12.md --slug my-post-name
npm run promote -- submissions/tools/issue-12.md

# 2. 构建并推送
npm run build && git add . && git commit -m "publish: ..." && git push
```

`--slug` 不给的话会用标题自动生成；中文标题会生成中文 URL（合法，但会变成一长串
百分号编码），所以脚本会提醒你，建议给个英文的。

### ⚠️ 关于正文里的 HTML

Astro 7 默认的 Markdown 处理器**不做转义也不做剥离** —— 正文里的 `<script>` 会原样
出现在构建产物里，也就会在每个访客浏览器里执行。这是**实测确认**的，不是推测。

所以 `promote` 会扫描正文里的危险 HTML，命中就拒绝并列出具体行号，加 `--strip`
才自动删除；而且无论哪条路径，写盘前都会再扫一遍，保证**不会写出仍含危险 HTML 的文件**。

但要清楚：**这是检查，不是 sanitizer。** 真正的保证来自「发布前你亲自读过一遍正文」。

### 提交内容会不会把我自己的东西带上去

不会。隔离区只收访客通过 issue 表单提交的内容，和仓库外的本地项目、资料没有任何关系。
内容红线（见下一节）对投稿同样适用 —— 审核时按同一套标准卡。

### 改完投稿表单要自检

Issue 表单的字段名、`scripts/intake.mjs` 的字段映射、分类下拉选项，这三处是靠
字符串约定连起来的，改漏一处只会在**别人投稿时**才炸，而且炸在 GitHub 上，本地看不见：

```bash
node scripts/check-templates.mjs    # 三处是否还对得上
```

完整说明见 `submissions/README.md`。

---

## 学习专栏

`/column` 是一份 AI 学习资料的**目录框架**：14 个模块、85 个子主题，从数学基础一路到 AI-EDA。
数据在 `src/data/column.ts`，想调整模块划分就改它。

这里**只列框架，不挂资料** —— 具体文章是从 CSDN、博客园、腾讯云、知乎专栏抓下来的第三方内容，
版权不属于本站，不能公开。这是刻意的设计，不要"顺手补全"。

---

## 内容红线（改内容前必读）

站点公开、绑真实域名，仓库又推到 GitHub 上。以下三类内容**不许**写进页面，也不许提交：

| 不许出现 | 原因 |
| --- | --- |
| 任何 I3C 相关的设计、规格、代码、报告 | 工作内容，不可公开 |
| 规格书原文（MIPI / TCG 等）、本地文档库、向量索引、生成的报告 | 私有资料，且受授权约束 |
| CSDN / 博客园 / 知乎等抓下来的文章原文 | 版权不属于本站 |

配套的 `.gitignore` 已经写好了：`rag_proj/docs/`、`rag_proj/output/`、`crawler/学习资料/` 都在排除之列，
所以 `git add .` 不会把这些带上去。

---

## 改站名 / 导航 / 作者

**全部集中在 `src/data/site.ts` 一个文件**，改完全站（页头、页脚、SEO、RSS）同步生效：

```ts
export const SITE = {
  name: '大模型学习交流平台',
  title: '大模型学习交流平台 · 从原理到实战',
  description: '...',
  url: 'https://guohua0siqi.online',
  tagline: '掌握大模型，从原理到实战',
  author: { name: 'guohua', bio: '...' },
  nav: [...],
}
```

---

## 改配色

所有颜色都在 `src/styles/global.css` 顶部的 `:root` 里，改这几行就能换肤：

```css
--bg: #0b0f19;        /* 页面底色 */
--bg-elev: #131a2a;   /* 卡片底色 */
--accent: #38bdf8;    /* 主强调色（青蓝） */
--accent-2: #a78bfa;  /* 次强调色（紫） */
--grad: linear-gradient(135deg, #38bdf8 0%, #a78bfa 100%);
```

---

## 目录结构

```text
solar-series/
├── astro.config.mjs          站点地址 + Shiki 代码高亮主题
├── .github/
│   ├── ISSUE_TEMPLATE/       投稿表单（字段名被 scripts/intake.mjs 解析，改字要同步）
│   └── workflows/intake.yml  issue → 隔离区落盘 + 开 PR
├── scripts/
│   ├── intake.mjs            解析投稿表单、校验、写进隔离区
│   ├── promote.mjs           ★ 提升命令，含危险 HTML 挡板
│   ├── check-templates.mjs   表单字段 ↔ 脚本字段 ↔ 分类列表 一致性自检
│   └── check-links.mjs       全站内部链接复查（静态站死链构建时不报错）
├── submissions/              ★ 隔离区，不参与构建，见 submissions/README.md
├── src/
│   ├── content.config.ts     内容集合定义（blog / paths / tools 的字段与校验）
│   ├── data/
│   │   ├── site.ts           ★ 站点配置，改站名导航来这里
│   │   ├── resources.ts      资源导航的数据
│   │   ├── projects.ts       开发项目卡片
│   │   └── column.ts         学习专栏的模块框架
│   ├── styles/global.css     ★ 设计令牌与全局样式
│   ├── utils/content.ts      取文章、算阅读时长、格式化日期
│   ├── components/           Header / Footer / PostCard / Subscribe / PageHero
│   ├── layouts/              BaseLayout（全站骨架）/ PostLayout（文章页）
│   ├── content/
│   │   ├── blog/             文章，一篇一个 .md
│   │   ├── paths/            学习路线
│   │   └── tools/            社区工具（由 promote 写入）
│   └── pages/
│       ├── index.astro       首页
│       ├── blog/             列表 / 详情 / 分类 / 标签
│       ├── paths/            学习路线
│       ├── resources.astro   资源导航
│       ├── projects.astro    开发项目
│       ├── column.astro      学习专栏
│       ├── submit.astro      投稿指南
│       ├── tools/            社区工具展示页
│       ├── about.astro       关于
│       ├── rss.xml.ts        RSS（手写，无依赖）
│       ├── sitemap.xml.ts    Sitemap（手写，无依赖）
│       └── 404.astro
└── public/                   favicon 等静态资源
```

---

## 注意事项

- **不要重命名 `solar-series` 目录**：Netlify 的项目配置指向它，改名会导致部署失败
- **图片放 `public/`**，引用时用 `/图片名.png` 这样的绝对路径
- **构建失败先看 `npm run build` 的输出**：多数是 frontmatter 里 `category` 填了不存在的值
- **`src/content.config.ts` 的路径和文件名不能改**，Astro 只认这个位置
- **没装任何 UI 框架**：样式是原生 CSS + Astro scoped style，没有 Tailwind

---

## 技术栈

Astro 7 · Markdown Content Layer · Shiki 代码高亮 · 原生 CSS · Netlify 部署

零运行时依赖，构建产物是纯静态 HTML。
