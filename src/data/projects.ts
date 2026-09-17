/**
 * 「开发项目」页的数据源。
 *
 * 这里放的都是已经整理干净、可以公开的项目：只有代码和思路，
 * 不含任何内部设计文档、规格书或私有资料。
 *
 * 加一个新项目 = 往 PROJECTS 里 push 一个对象。
 * 之后某个项目单独建了 GitHub 仓库，就给它加上 repo 字段覆盖默认链接。
 */

import { SITE } from './site';

export interface Project {
	/** 锚点 id，也是卡片在页面上的定位标识 */
	id: string;
	name: string;
	/** 一句话说清它是什么 */
	tagline: string;
	/** 两三句展开：解决什么问题、怎么做的 */
	desc: string;
	icon: string;
	/** 技术栈标签，越具体越好 */
	tags: string[];
	/** 仓库地址。不填就回落到 GitHub 主页 */
	repo?: string;
	/** 右上角小标签，比如「可复用」「练手」 */
	badge?: string;
}

export const PROJECTS: Project[] = [
	{
		id: 'keytype',
		name: 'keytype',
		tagline: '把文本"打"进远端 gvim 的键盘注入工具',
		desc: '远端环境只有内网、没法粘贴的时候，上传代码就只能手敲。这个工具在本机把文本当作真实键盘敲击逐字"打"进当前焦点窗口 —— 也就是你的 SSH 终端或 X11 转发的 gvim。走 Win32 SendInput，不装任何依赖，Win10/11 自带的 PowerShell 就能跑。',
		icon: '⌨️',
		tags: ['PowerShell', 'Win32 API', '零依赖'],
	},
	{
		id: 'crawler',
		name: 'crawler',
		tagline: '一键把技术教程抓成排版好的 PDF',
		desc: '在网站上读教程时按一下 Ctrl+Alt+P，自动认出当前浏览器标签页的地址、抓下正文、剔除广告和推荐位，排版成 A4 的 PDF，再按关键词归到对应目录。用真实 Chromium 渲染，能等 JS 加载完，也能复用浏览器登录态，所以反爬和动态内容都不太成问题。',
		icon: '📄',
		tags: ['Python', 'Playwright', 'PDF 排版'],
	},
	{
		id: 'game_demo',
		name: 'game_demo',
		tagline: '「QQ 梦幻海底」网页复刻',
		desc: '用纯 HTML/CSS/JS 加 Canvas 复刻的 2D 休闲养成游戏。没有构建工具、没有框架，双击 index.html 就能离线跑起来 —— 刻意做成这样，是为了验证"一个完整的游戏能有多轻"。',
		icon: '🎮',
		tags: ['HTML5', 'Canvas', '无构建'],
	},
	{
		id: 'webgame-toolkit',
		name: 'webgame-toolkit',
		tagline: '从游戏项目里复盘抽出的开发工具包',
		desc: '做完上面那个游戏之后，把其中可复用的部分抽成了四件套：把 CSS/JS 全内联进单文件的打包器、不启动浏览器就能测核心逻辑的无头冒烟测试器、可直接复制开新的 2D 养成游戏脚手架，以及一份设计规范。',
		icon: '🧰',
		tags: ['Node.js', '工具链', '脚手架'],
		badge: '可复用',
	},
	{
		id: 'rag_proj',
		name: 'rag_proj',
		tagline: '本地文档问答助手',
		desc: '给一个固定的文档库做本地问答：文档解析切块后，用本地 BGE 模型向量化、建立本地索引；提问时检索出最相关的几段拼进 prompt，交给大模型生成带出处的回答。向量化完全在本地跑，不需要额外的 embedding API。',
		icon: '🔍',
		tags: ['Python', 'RAG', '向量检索', 'Claude API'],
	},
];

/** 取项目的仓库地址：优先用项目自己的，否则回落到 GitHub 主页 */
export function projectRepo(project: Project): string {
	return project.repo ?? SITE.social.github;
}
