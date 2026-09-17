// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// 站点根地址，用于生成 canonical、Open Graph 与 RSS 的绝对链接
	site: 'https://guohua0siqi.online',
	markdown: {
		shikiConfig: {
			// 深色主题配色，与全站深空黑底一致
			theme: 'github-dark',
			wrap: true,
		},
	},
});
