import { AgentProject } from '../types/agent';

export const DEFAULT_PROJECTS: AgentProject[] = [
  {
    id: 'contract-compliance-auditor',
    name: '商务合同与合规风险智能审计 Agent',
    description: '面向办公用户的合同全流程质检底座：识别核心条款、权责风险，并具备二级争议与违约金智能跳过机制。',
    category: 'legal_compliance',
    icon: 'ShieldCheck',
    author: '通用底座官方预置',
    version: '1.2.0',
    inputSchema: [
      {
        key: 'contractText',
        label: '合同文本内容或核心条款',
        type: 'textarea',
        required: true,
        placeholder: '在此粘贴需要审查的商务采购、外包服务、技术开发或租赁合同正文...',
        defaultValue: `甲方（委托方）：未来科技有限公司\n乙方（服务方）：极光数据技术服务中心\n\n一、合作内容\n乙方为甲方开发企业专属协同管理系统，开发周期为签订之日起 45 个工作日内交付初验版本。\n\n二、费用与结算\n项目总金额为人民币贰拾万元整（￥200,000.00）。合同生效后 3 个工作日内甲方支付 30% 首付款；系统初验合格后支付 40% 进度款；系统上线稳定运行 30 天后支付剩余 30% 尾款。\n\n三、交付与验收\n若乙方无正当理由逾期交付超过 15 个自然日，每延期一日需向甲方支付合同总额 0.5% 的违约金。\n\n四、知识产权与保密\n本系统开发成果的所有知识产权自甲方付清全部款项之日起归甲方所有。双方在合作期间获悉的商业秘密应承担严格保密义务，保密期为合同终止后 3 年。\n\n五、争议解决\n双方发生争议应友好协商；协商不成的，任何一方均可向甲方所在地人民法院提起诉讼。`
      },
      {
        key: 'contractType',
        label: '合同类型分类',
        type: 'select',
        options: [
          { label: '技术开发/IT服务合同', value: 'tech_dev' },
          { label: '日常采购/供货合同', value: 'procurement' },
          { label: '房屋/场地租赁合同', value: 'lease' },
          { label: '劳动雇佣/竞业限制', value: 'hr' }
        ],
        defaultValue: 'tech_dev'
      },
      {
        key: 'checkHighRiskClauses',
        label: '强制深度排查霸王条款与极端违约金 (二级子任务开关)',
        type: 'checkbox',
        defaultValue: false,
        description: '未勾选时，系统将通过模型智能判定合同风险等级；若风险低则自动跳过二级审查，节省 Token。'
      }
    ],
    steps: [
      {
        id: 'step-extract',
        name: '条款梳理与权责框架拆解',
        phase: '阶段一：信息抽取',
        description: '自动结构化提取甲乙方主体、交易金额、交付周期、验收条件及保密时限。',
        promptTemplate: `请仔细审阅以下合同文本：
合同类型: {contractType}
合同全文:
{contractText}

请提取并结构化输出：
1. 签约双方主体与合作核心业务
2. 金额总额与各期付款节点比例
3. 交付期限与验收标准
4. 知识产权归属节点
5. 请以清晰的 Markdown 结构化清单输出。`,
        estimatedTokenSaving: 0
      },
      {
        id: 'step-risk-eval',
        name: '主权责对等性与风险初筛',
        phase: '阶段二：风险初筛与条件判定',
        description: '评估付款条件、交付约束与对等性，同时智能决策是否需要触发二级霸王条款与违约金复核。',
        dependsOn: ['step-extract'],
        promptTemplate: `基于上一阶段的条款抽取结果：
{step-extract}

请进行商务风险分析：
1. 识别付款条款是否存在甲乙方权利义务不对等（例如付款前置、验收周期过长或标准模糊）。
2. 分析违约金比例（如每日 0.5% 是否过高或过低）及封顶限制。
3. 重要：综合评估本合同的潜在法律纠纷风险等级（【高风险】/【中风险】/【低风险】）。并在文末明确注明判定依据。`,
        estimatedTokenSaving: 0
      },
      {
        id: 'subtask-deep-penalty',
        name: '二级子任务：高风险争议条款与极端违约金专项审计',
        phase: '阶段三：深度专项 (二级子任务)',
        isSubtask: true,
        parentStepId: 'step-risk-eval',
        dependsOn: ['step-risk-eval'],
        description: '仅在用户强制勾选或初筛判定存在高风险争议条款时触发，常规标准合同自动跳过。',
        condition: {
          id: 'cond-penalty-check',
          type: 'model_decision',
          label: '当上一环节判定为【高风险】或用户勾选强制审查时触发，否则跳过',
          decisionPrompt: '请检查上一步审查结果中是否存在高风险违约责任或严重不对等条款。如果合同规范对等且风险等级低，则可以跳过本次专项审计。',
          inputFieldKey: 'checkHighRiskClauses',
          defaultSkip: true
        },
        promptTemplate: `针对已识别的高风险违约条款与争议解决路径展开深度专项审计：
合同初筛分析：
{step-risk-eval}

请输出深度整改方案：
1. 专项比对《民法典》及相关司法解释关于违约金过高调整（超过损失30%视为过高）的标准。
2. 提出针对性的对等修改条款建议（提供原条款 vs 建议修改条款对比表格）。
3. 管辖法院约定对哪一方更为有利及风险防范策略。`,
        estimatedTokenSaving: 1850
      },
      {
        id: 'subtask-ip-protection',
        name: '二级子任务：知识产权排他性与开源协议泄密审查',
        phase: '阶段三：深度专项 (二级子任务)',
        isSubtask: true,
        parentStepId: 'step-risk-eval',
        dependsOn: ['step-risk-eval'],
        description: '仅在非技术类或低知识产权要求时自动跳过，技术研发合同按需执行。',
        condition: {
          id: 'cond-ip-check',
          type: 'data_rule',
          label: '当合同类型为技术开发/IT服务且涉及代码产权时执行',
          inputFieldKey: 'contractType'
        },
        promptTemplate: `基于本技术服务合同：
{step-extract}

请针对知识产权保护进行审查：
1. 分析“付清全部款项之日起归甲方所有”对甲方的风险（例如付清前乙方是否有权扣留源码或授权第三方）。
2. 是否缺少第三方开源代码合规审查及侵权免责保证条款。
3. 提出知识产权交付保全的补充条款。`,
        estimatedTokenSaving: 1400
      },
      {
        id: 'step-final-report',
        name: '输出综合审计意见书与法务修改建议',
        phase: '阶段四：成果归档',
        description: '整合所有前置主任务与实际触发的二级子任务结论，生成高管可直接签署参考的总结建议。',
        dependsOn: ['step-extract', 'step-risk-eval'],
        promptTemplate: `请综合前序所有审查意见，为企业业务负责人生成一份专业、简练的《合同合规审查总结报告》：
1. 核心结论：是否建议直接签署或需修改后再签
2. Top 3 核心修改要点（附修改话术，业务人员可直接发给合作方沟通）
3. 履约风险提示备忘清单`,
        estimatedTokenSaving: 0
      }
    ]
  },
  {
    id: 'market-intel-researcher',
    name: '行业与竞品情报深度研报 Agent',
    description: '多步骤情报分析底座：自动解构行业现状、研判核心趋势，并支持灵活跳过重度竞品对标子任务。',
    category: 'market_research',
    icon: 'TrendingUp',
    author: '通用底座官方预置',
    version: '1.1.0',
    inputSchema: [
      {
        key: 'industryTopic',
        label: '研究行业或产品主题',
        type: 'text',
        required: true,
        placeholder: '例如：2026年企业级AI Agent应用落地趋势 / 智能客服产品矩阵',
        defaultValue: '2026年企业无代码 AI Agent 协同工作流市场趋势'
      },
      {
        key: 'targetAudience',
        label: '研报受众定位',
        type: 'select',
        options: [
          { label: '企业高管与决策层 (侧重商业回报与战略)', value: 'executive' },
          { label: '产品与运营团队 (侧重落地功能与用户痛点)', value: 'product' },
          { label: '投资分析与投研团队 (侧重市场空间与竞争格局)', value: 'investor' }
        ],
        defaultValue: 'executive'
      },
      {
        key: 'includeCompetitorMatrix',
        label: '包含竞品横向详细对比矩阵 (二级子任务)',
        type: 'checkbox',
        defaultValue: true,
        description: '勾选后执行专门的竞品矩阵分析子任务；未勾选则专注于行业趋势本身。'
      }
    ],
    steps: [
      {
        id: 'step-macro-analysis',
        name: '行业宏观背景与驱动要素拆解',
        phase: '阶段一：宏观扫描',
        description: '系统梳理技术演进、政策环境与市场痛点，建立研报基本面框架。',
        promptTemplate: `研究主题：{industryTopic}
目标受众：{targetAudience}

请对该领域展开宏观扫描与驱动力分析：
1. 当前核心市场痛点与用户未被满足的需求。
2. 近期技术突破带来的边际变化。
3. 市场规模预估与主要推动因素。
输出要点明确、结构清晰。`,
        estimatedTokenSaving: 0
      },
      {
        id: 'step-trend-synthesis',
        name: '核心商业模式与未来 1-2 年趋势研判',
        phase: '阶段二：趋势洞察',
        description: '剖析主流商业化路径与演进路线。',
        dependsOn: ['step-macro-analysis'],
        promptTemplate: `基于宏观分析：
{step-macro-analysis}

请深入剖析：
1. 当前市场上主流的 3 种落地商业形态或变现路径。
2. 客户在采买和落地该方案时的关键决策考量指标（ROI、部署成本、上手门槛等）。
3. 未来 12-24 个月的核心演进趋势预测。`,
        estimatedTokenSaving: 0
      },
      {
        id: 'subtask-competitor-matrix',
        name: '二级子任务：主流代表产品竞争格局与能力矩阵对比',
        phase: '阶段三：竞品专题 (二级子任务)',
        isSubtask: true,
        parentStepId: 'step-trend-synthesis',
        dependsOn: ['step-trend-synthesis'],
        description: '生成竞品能力多维雷达与优缺点对比表，按需跳过。',
        condition: {
          id: 'cond-competitor',
          type: 'input_toggle',
          label: '当用户勾选“包含竞品横向详细对比矩阵”时执行，否则跳过以节省 Token',
          inputFieldKey: 'includeCompetitorMatrix'
        },
        promptTemplate: `针对行业主题【{industryTopic}】：
请筛选出当前海内外最具代表性的 3-4 款主流方案或竞品平台：
1. 制作多维度对比表格：涵盖核心优势、技术路径、适用人群、主要短板。
2. 提炼各方案的差异化护城河与竞争壁垒。
3. 对新入局企业给出攻防破局策略。`,
        estimatedTokenSaving: 2100
      },
      {
        id: 'step-action-plan',
        name: '高管行动建议与落地 Roadmap',
        phase: '阶段四：行动建议',
        description: '生成供管理层直接拍板的落地行动路线图与避坑指南。',
        dependsOn: ['step-macro-analysis', 'step-trend-synthesis'],
        promptTemplate: `受众角色：{targetAudience}
综合前序研究成果：
{step-trend-synthesis}

请输出针对高管决策的【落地行动路线图】：
1. 30天/90天/180天 推进步骤建议（轻量验证到规模化）
2. 组织落地过程中最容易踩的 3 个关键深坑及规避对策
3. 关键业务价值考核指标（KPI / OKR）设置建议`,
        estimatedTokenSaving: 0
      }
    ]
  },
  {
    id: 'office-doc-distributor',
    name: '办公长文全渠道矩阵智能分发 Agent',
    description: '单篇长文一键拆解为深度公众号推文、高赞小红书文案与高管朋友圈通报，支持渠道按需勾选跳过。',
    category: 'content_creation',
    icon: 'Share2',
    author: '通用底座官方预置',
    version: '1.0.0',
    inputSchema: [
      {
        key: 'sourceContent',
        label: '原始长文或会议纪要',
        type: 'textarea',
        required: true,
        placeholder: '输入需要转写的长文、方案汇报或产品发布稿...',
        defaultValue: '经过团队两个月的攻坚，我们的“通用智能项目底座”正式开启内测。该底座专为解决非技术人员使用开源 Agent 的痛点而设计：彻底免除复杂 Docker 与 Python 命令行配置，采用纯可视化界面；支持多阶段任务分解与二级子任务智能跳过，帮助企业节约高达 40% 的 Token 成本；同时配备毫秒级全链路调用日志与一键生成诊断报告功能，让任何运行异常都能被技术支持秒级定位。首批内测开放给 100 位办公效率先锋用户。'
      },
      {
        key: 'enableXiaohongshu',
        label: '生成小红书爆款图文笔记 (二级子任务)',
        type: 'checkbox',
        defaultValue: true
      },
      {
        key: 'enableMoments',
        label: '生成商务朋友圈极简通告 (二级子任务)',
        type: 'checkbox',
        defaultValue: true
      }
    ],
    steps: [
      {
        id: 'step-core-insights',
        name: '核心利益点提炼与受众心智分析',
        phase: '阶段一：信息蒸馏',
        description: '提炼 3 个最打动受众的核心卖点与金句。',
        promptTemplate: `请分析以下原始内容：
{sourceContent}

请完成信息蒸馏：
1. 提炼 3 个核心价值锚点（用一句话分别讲透用户利益）。
2. 找出最能引发职场人共鸣的 2 个痛点场景。
3. 提炼 3 条吸睛金句。`,
        estimatedTokenSaving: 0
      },
      {
        id: 'subtask-xiaohongshu',
        name: '二级子任务：小红书爆款网感文案与视觉分镜',
        phase: '阶段二：渠道定制 (二级子任务)',
        isSubtask: true,
        parentStepId: 'step-core-insights',
        dependsOn: ['step-core-insights'],
        description: '生成带有 Emoji、黄金 3 秒标题、互动 Hook 的小红书笔记，未勾选时跳过。',
        condition: {
          id: 'cond-xhs',
          type: 'input_toggle',
          label: '当用户勾选“生成小红书爆款图文笔记”时执行',
          inputFieldKey: 'enableXiaohongshu'
        },
        promptTemplate: `基于核心提炼结果：
{step-core-insights}

请为小红书创作一篇爆款图文笔记：
1. 【吸睛标题】：给出 5 个不同角度的备选标题（包含感叹词、数字和痛点词）。
2. 【正文结构】：采用经典的 Hook 开头 + 痛点唤醒 + 3 点解决方案干货 + 结尾互动反问。
3. 【配图分镜建议】：提供 3 张配套图片的设计文字排版建议。
4. 【热门标签】：精选 5-8 个精准引流 Tag。`,
        estimatedTokenSaving: 1200
      },
      {
        id: 'subtask-moments',
        name: '二级子任务：高管商务朋友圈/内部群通报',
        phase: '阶段二：渠道定制 (二级子任务)',
        isSubtask: true,
        parentStepId: 'step-core-insights',
        dependsOn: ['step-core-insights'],
        description: '精简干练的商务通报，适合微信朋友圈和钉钉/企业微信群。',
        condition: {
          id: 'cond-moments',
          type: 'input_toggle',
          label: '当用户勾选“生成商务朋友圈极简通告”时执行',
          inputFieldKey: 'enableMoments'
        },
        promptTemplate: `基于核心提炼结果：
{step-core-insights}

请编写 2 条不同风格的商务朋友圈文案（控制在 150 字以内）：
- 风格 A：谦逊务实型（适合发布在个人朋友圈，侧重感谢团队与邀请体验）
- 风格 B：高管号召型（适合发布在企业内网或合作伙伴社群，突出业务里程碑）`,
        estimatedTokenSaving: 800
      },
      {
        id: 'step-official-article',
        name: '企业公众号深度专栏长文',
        phase: '阶段三：深度长篇',
        description: '撰写逻辑严密、叙事饱满的官方微信公众号深度文章。',
        dependsOn: ['step-core-insights'],
        promptTemplate: `基于以下内容与核心洞察：
原文：{sourceContent}
核心洞察：{step-core-insights}

请撰写一篇适合微信公众平台的深度长文（约 800-1200 字）：
1. 吸引人的开篇：从当前办公人员的普遍痛点场景切入。
2. 核心正文：分三大部分深入展开，有理有据，排版使用清晰的二级标题与引用金句。
3. 结语：展望未来，并带有明确的行动号召（Call to Action）。`,
        estimatedTokenSaving: 0
      }
    ]
  }
];
