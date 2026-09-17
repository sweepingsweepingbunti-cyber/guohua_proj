/**
 * 「学习专栏」的数据源 —— 一份 AI 学习资料的目录框架。
 *
 * 这里只放**框架**（模块划分和子主题），不放任何具体资料：
 * 那些是从 CSDN / 博客园 / 腾讯云 / 知乎专栏抓下来的第三方文章，
 * 版权不属于这里，只在自己本地看。
 *
 * 想调整框架就改下面的数组；想给某个子主题补一篇自己写的文章，
 * 去 src/content/blog/ 新建 .md，然后在 topics 里挂上链接即可。
 */

export interface ColumnModule {
	/** 锚点 id */
	id: string;
	/** 模块的中文名 */
	title: string;
	/** 原始目录名，用等宽字体显示，方便和本地文件夹对上 */
	dir: string;
	/** 该模块下的子主题 */
	topics: string[];
}

export const COLUMN_INTRO =
	'面向 AI-native 芯片工程师的进阶路径，按「理解 AI → 构建 AI → 差异化（AI-EDA / 硬件）」递进。下面是整理资料时定下的框架，每个子主题下对应的文章还在陆续整理，暂时只列结构。';

export const COLUMN_MODULES: ColumnModule[] = [
	{
		id: 'm01',
		title: '数学与 Python 基础',
		dir: '1_数学与python基础',
		topics: ['NumPy 与 Pandas', 'Python 基础', '微积分与优化', '概率论与统计', '线性代数'],
	},
	{
		id: 'm02',
		title: '传统机器学习',
		dir: '2_传统机器学习ML',
		topics: [
			'线性回归',
			'逻辑回归',
			'岭回归 Ridge',
			'Lasso 回归',
			'K 近邻算法',
			'朴素贝叶斯',
			'决策树 DT',
			'随机森林',
			'梯度提升 GBDT',
			'梯度提升 XGBoost',
			'梯度提升 LightGBM',
			'支持向量机 SVM',
			'半监督 SVM',
			'K-Means',
			'DBSCAN',
			'层次聚类',
			'主成分分析 PCA',
			'LDA',
			't-SNE',
			'隐马尔可夫',
			'标签传播算法',
			'ANN',
			'CNN',
			'RNN',
			'LSTM',
			'Transformer',
			'自编码器',
			'DQN',
			'Q-Learning',
			'PPO',
		],
	},
	{
		id: 'm03',
		title: '深度学习基础',
		dir: '3_深度学习基础DL',
		topics: ['神经网络基础', '反向传播算法', '损失函数与优化器', '正则化与归一化'],
	},
	{
		id: 'm04',
		title: 'PyTorch 与模型实现',
		dir: '4_pytorch与模型实现',
		topics: [
			'PyTorch 张量与 Autograd',
			'数据集与 DataLoader',
			'模型构建与训练循环',
			'GPU 训练与混合精度',
		],
	},
	{
		id: 'm05',
		title: 'NLP / CV / 多模态',
		dir: '5_NLP_CV_Multimodal',
		topics: ['词向量与 Embedding', '注意力机制', '计算机视觉基础', '多模态模型'],
	},
	{
		id: 'm06',
		title: 'Transformer 与大语言模型',
		dir: '6_Transformer_LLM',
		topics: ['Transformer 架构', '位置编码 RoPE', '多头注意力 MHA / GQA / MQA', '大模型架构 GPT 与 Llama'],
	},
	{
		id: 'm07',
		title: 'LLM 训练与后训练',
		dir: '7_LLM-traning_post-training',
		topics: ['预训练 Pre-training', '指令微调 SFT', 'LoRA 与 PEFT', 'RLHF 与 DPO 对齐'],
	},
	{
		id: 'm08',
		title: 'LLM 推理 / GPU / AI 基础设施',
		dir: '8_LLM-inference_GPU_AI-infra',
		topics: [
			'KV Cache',
			'FlashAttention',
			'并行策略 TP / PP / DP',
			'模型量化 Quantization',
			'推理框架 vLLM / SGLang',
		],
	},
	{
		id: 'm09',
		title: 'RAG / 向量数据库 / 知识',
		dir: '9_RAG_vector-db_knowledge',
		topics: ['Embedding 与向量数据库', 'RAG 基础', '文档切分与索引', '混合检索与重排'],
	},
	{
		id: 'm10',
		title: 'AI 编程 / Coding Agent',
		dir: '10_AI-coding_coding-agent',
		topics: ['提示工程 Prompt', 'AI 编程工具', '代码生成与 Review', 'Coding Agent 原理'],
	},
	{
		id: 'm11',
		title: '工具调用 / MCP',
		dir: '11_tool-calling_MCP',
		topics: ['Function Calling 函数调用', '结构化输出', 'MCP 协议', 'MCP 服务器开发'],
	},
	{
		id: 'm12',
		title: 'Agent / 多智能体',
		dir: '12_agent_multi-agent',
		topics: ['Agent 基础', '规划与推理 ReAct', '记忆 Memory', '多 Agent 协作框架'],
	},
	{
		id: 'm13',
		title: '评测 / 安全 / 可观测性',
		dir: '13_evaluation_safty_observability',
		topics: [
			'模型评测 Benchmark',
			'RAG 评测',
			'Agent 评测',
			'安全与对齐',
			'可观测性 Observability',
		],
	},
	{
		id: 'm14',
		title: 'AI-EDA / AI 硬件',
		dir: '14_AI-EDA_AI-hardware',
		topics: ['AI for EDA', 'AI 编译器 MLIR / Triton', 'RTL 生成与验证 Agent', '硬件加速器 NPU / GPU'],
	},
];

/** 子主题总数，页面顶部用来做统计 */
export const TOPIC_COUNT = COLUMN_MODULES.reduce((n, m) => n + m.topics.length, 0);
