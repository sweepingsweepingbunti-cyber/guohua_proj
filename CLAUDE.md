# 大模型学习交流平台 — 项目说明

大模型学习分享平台，Astro 静态站，部署在 Netlify，绑定域名 `guohua0siqi.online`。

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## 项目约定（改代码前先读这段）

**技术选型是刻意的，不要顺手改掉：**

- **没有 Tailwind，也没有任何 UI 框架。** 样式 = `src/styles/global.css` 里的 CSS 变量 + 组件内 `<style>` 的 scoped CSS。加样式请沿用这个模式。
- **不要新增 npm 依赖。** Netlify 自动构建对新增依赖敏感。RSS 和 sitemap 是手写的（`src/pages/rss.xml.ts`、`src/pages/sitemap.xml.ts`），就是为了避免引入 `@astrojs/rss`。
- **不要重命名 `solar-series` 目录**，Netlify 的项目配置指向它。

**内容相关代码的位置：**

| 想改什么 | 改哪里 |
| --- | --- |
| 站名 / 副标题 / 导航 / 作者 | `src/data/site.ts`（唯一的品牌信息来源） |
| 分类的中文名和 slug | `src/data/site.ts` 的 `CATEGORY_SLUGS` + `CATEGORIES`，两处必须对应 |
| 配色 / 圆角 / 字体 | `src/styles/global.css` 顶部的 `:root` |
| 资源导航的链接 | `src/data/resources.ts` |
| 开发项目卡片 | `src/data/projects.ts` |
| 学习专栏的模块框架 | `src/data/column.ts` |
| 文章 | `src/content/blog/*.md` |
| 学习路线 | `src/content/paths/*.md` |
| 社区工具 | `src/content/tools/*.md`（由 `promote` 写入，一般不用手改） |
| 投稿表单 | `.github/ISSUE_TEMPLATE/*.yml` |
| 投稿脚本 | `scripts/`（见下方「投稿流程」） |

**内容边界（重要，改内容前务必确认）：**

站点是公开的、绑在真实域名上，而且仓库推到 GitHub。以下内容**一律不许**出现在页面或提交里：

- **任何 I3C 相关的设计、规格、代码、报告** —— 属工作内容，不可公开
- **私有资料**：规格书原文（MIPI / TCG 等）、本地文档库、向量索引、由它们生成的报告
- **第三方文章原文**：从 CSDN / 博客园 / 知乎抓下来的教程，版权不属于本站

因此 `src/data/column.ts` 里只放**模块与子主题这类框架**，不挂任何具体资料 —— 这是刻意的，不要"顺手补全"。

**内容集合用的是 Content Layer API**（不是旧版 collections）：

- 配置文件必须叫 `src/content.config.ts`，位置和文件名都不能动
- loader 用 `glob()`，从 `astro/loaders` 导入
- 取值用 `getCollection` / `getEntry` / `render`，从 `astro:content` 导入
- 详情页路由参数是 `entry.id`（glob loader 生成的 slug），不是 `entry.slug`

**文章的 frontmatter 字段**（schema 定义在 `src/content.config.ts`）：

`title` / `description` / `pubDate` / `updatedDate?` / `category`（枚举，填错会构建失败）/ `tags[]` / `draft?` / `featured?` / `credit?`

`credit` 只在社区投稿的文章上填（值是投稿人的 GitHub 用户名），文章页会显示成「本文由 @xxx 投稿」；
作者自己的文章留空，显示 `SITE.author.name`。

列表页一律要过滤草稿：`getPublishedPosts()`（在 `src/utils/content.ts`）已经做好了这件事，直接用它，不要自己写 `getCollection`。

**正文里不要写 LaTeX。** 没有装 remark-math / rehype-katex，`$...$` 和 `$$...$$` 会原样显示成一堆字符。公式用 ` ```text ` 代码块或行内代码表达。

## 投稿流程（改这一块之前务必读）

访客通过 GitHub issue 表单投稿，Action 落到 `submissions/` 隔离区，人工审核后由
`npm run promote` 提升进 `src/content/` 才会发布。完整说明在 `submissions/README.md`。

**三条不能破的规矩：**

1. **`submissions/` 是隔离区，绝不能让它进构建。** 内容集合的 base 只有
   `src/content/blog` 和 `src/content/tools` —— 不要为了「方便」把 submissions 加进去，
   那等于让未经审核的投稿直接上站。

2. **`.github/workflows/intake.yml` 里绝不能把 issue 正文插值进 `run:`。**
   正文是用户可控字符串，`${{ github.event.issue.body }}` 写进 `run:` 就是脚本注入漏洞，
   投稿人写 `"; rm -rf / #` 就能执行任意命令。必须走 `env:`，脚本那边只用 `process.env` 读。

3. **Markdown 里的内嵌 HTML 不会被转义。** Astro 7 默认处理器 `@astrojs/markdown-satteri`
   原样输出 `<script>`、`onerror=` 等（**已实测确认**）。`scripts/promote.mjs` 里的扫描是
   唯一的强制挡板，不要削弱它。也别想着装 `remarkPlugins` 来解决 —— 那需要新增
   `@astrojs/markdown-remark` 依赖，违反本项目的零依赖红线。

**改了投稿表单的字段名**，必须同步改 `scripts/intake.mjs` 的字段映射表（表单 label
就是解析用的 key）。改完跑：

```bash
node scripts/check-templates.mjs    # 表单 ↔ 脚本 ↔ 分类列表 三处是否还对得上
```

这三处靠字符串约定连着，改漏一处只会在**别人投稿时**才炸，而且炸在 GitHub Action 里，本地看不见。

## 改动之后必须验证

`npm run build` 必须通过 —— 这是 Netlify 上线的唯一门槛，构建失败等于这次改动白做。改完顺手跑一下，不要只跑 dev server 就交差。

改了页面或链接的话再跑一下 `node scripts/check-links.mjs`：静态站的死链在构建时不会报错，
Astro 照样生成、Netlify 照样发布，只有访客点进去才看到 404。

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
