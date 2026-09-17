# AI 学习园地

从原理到实战的大模型学习分享平台。基于 Astro 构建，通过 Git → Netlify 自动部署到 **[guohua0siqi.online](https://guohua0siqi.online)**。

包含六个模块：**文章博客**、**学习路线**、**学习专栏**、**资源导航**、**开发项目**、**关于 + 订阅**。

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
  name: 'AI 学习园地',
  title: 'AI 学习园地 · 大模型学习与分享',
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
├── src/
│   ├── content.config.ts     内容集合定义（blog / paths 的字段与校验）
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
│   │   └── paths/            学习路线
│   └── pages/
│       ├── index.astro       首页
│       ├── blog/             列表 / 详情 / 分类 / 标签
│       ├── paths/            学习路线
│       ├── resources.astro   资源导航
│       ├── projects.astro    开发项目
│       ├── column.astro      学习专栏
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
