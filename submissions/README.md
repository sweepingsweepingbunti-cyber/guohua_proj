# 隔离区（submissions/）

**这里的文件不会出现在网站上。** 这是整个投稿流程里最关键的一条约定。

## 为什么需要隔离区

站点是纯静态的 Astro 站，没有后端、没有数据库 —— 服务器上没有任何进程能接收表单提交。
所以投稿走的是 GitHub：访客填 issue 表单，机器人把内容落到这里，人工审核后再决定要不要发布。

隔离区就是「已经收到、但还没决定要不要发」的中间地带。

## 为什么这里不会被渲染

Astro 的内容集合在 `src/content.config.ts` 里定义，两个 loader 的 base 分别是：

```
src/content/blog     ← 文章
src/content/tools    ← 工具
```

`submissions/` 不在其中，所以这里放多少个 `.md` 都不会被构建、不会被渲染成页面、
不会出现在任何列表或 RSS 里。**这是个结构性保证，不是靠自觉。**

## 目录结构

```
submissions/
├── articles/issue-<编号>.md   文章投稿
└── tools/issue-<编号>.md      工具提交
```

文件名里的编号对应 GitHub issue 号 —— 出问题能一路追回原始投稿。

## 完整流程

```
访客填 GitHub issue 表单
      ↓
Action 跑 scripts/intake.mjs：校验 + 落盘到这里 + 开 PR
      ↓
人工审 PR ── 不合适 → 关掉 PR 和 issue，删掉文件，结束
      ↓ 合适，合并
文件留在隔离区（仍然没有上线）
      ↓
本地跑 npm run promote -- submissions/articles/issue-<n>.md
      ↓
提升成 src/content/blog/<slug>.md → git push → Netlify 发布
```

注意合并 PR 只是「同意收下」，**不等于发布**。真正上线必须经过本地那条提升命令。

## 提升命令

```bash
# 文章。--slug 用来指定英文 URL（不给就用标题自动生成，中文标题会生成中文 URL）
npm run promote -- submissions/articles/issue-12.md --slug my-post-name

# 工具
npm run promote -- submissions/tools/issue-12.md
```

提升时会做这些事：

1. 校验字段（分类必须在允许列表里、仓库地址必须是 https、slug 不能含路径穿越字符）
2. **扫描正文里的危险 HTML** —— `<script>`、`<iframe>`、`onerror=` 之类
3. 命中就拒绝并列出**具体行号**；确认风险后可以加 `--strip` 自动删掉那些行
4. 无论哪条路径，写盘前都会**再扫一遍**，只要有残留就拒绝
5. 写入 `src/content/`，并删除隔离区里那份

⚠️ **这是检查，不是 sanitizer。** 它挡得住明显的注入，挡不住所有绕过手法。
真正的保证来自「发布前你亲自读过一遍正文」这个流程本身 —— 别把 `--strip` 当免责按钮。

背景：Astro 7 默认的 Markdown 处理器 `@astrojs/markdown-satteri` **不做转义也不做剥离**，
正文里的 `<script>` 会原样出现在构建产物里，也就会在每个访客浏览器里执行。
这一点是实测确认的，不是推测。

## 相关文件

| 文件 | 作用 |
| --- | --- |
| `.github/ISSUE_TEMPLATE/submit-*.yml` | 投稿表单。字段名被 `intake.mjs` 解析，改字要同步改脚本 |
| `.github/workflows/intake.yml` | issue → 落盘 + 开 PR。**正文只走 env，绝不能拼进 run** |
| `scripts/intake.mjs` | 解析表单、校验、写文件 |
| `scripts/promote.mjs` | 提升命令，含 HTML 挡板 |
| `scripts/check-templates.mjs` | 自检：表单字段 ↔ 脚本字段 ↔ 分类列表是否还对得上 |

改完表单记得跑一下 `node scripts/check-templates.mjs` ——
那三处的对应关系是靠字符串约定的，改漏了只会在别人投稿时才炸，而且炸在 GitHub 上，本地看不见。
