---
# ⚠️ 这是一份**模板**，不是真实收录的工具 —— draft: true 让它不会出现在 /tools 页面上。
#
# 真实工具由 `npm run promote -- submissions/tools/issue-<n>.md` 自动写进这个目录，
# 一般不需要你手动建文件。想手动加一个的话，把这个文件复制成 <工具名>.md，
# 把 draft 改成 false，再改下面几个字段即可。
#
# 字段说明：
#   name        工具名，也是 URL 片段（/tools/<文件名>）
#   description 一句话说明，显示在卡片上
#   repo        工具自己的仓库地址，必须是完整的 https URL —— 这是唯一的外链出口
#   author      提交人的 GitHub 用户名，不带 @
#   tags        标签数组
#   addedDate   收录日期
#   featured    true 会排在前面（可选，默认 false）
#   draft       true = 不显示（可选，默认 false）

name: example-tool
description: 这是一个模板条目，用来演示工具的 frontmatter 该怎么填。它不会出现在页面上。
repo: https://github.com/example/example-tool
author: example
tags: ['示例', '模板']
addedDate: 2026-09-17
featured: false
draft: true
---

工具页正文写在这里，用的是 Markdown。这段会显示在卡片上。

可以写使用场景、怎么接入、有什么限制：

```bash
npx example-tool --help
```

再次强调：本站只做展示和外链，不托管、不运行这里的任何代码。
