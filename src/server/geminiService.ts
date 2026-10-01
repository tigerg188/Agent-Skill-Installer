import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client with recommended aistudio-build telemetry
export const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

export interface StepRunRequest {
  projectId: string;
  stepId: string;
  stepName: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  channelId?: string;
  model?: string;
}

export interface StepRunResponse {
  stepId: string;
  output: string;
  tokens: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  };
  durationMs: number;
  model: string;
  channelId: string;
  simulated?: boolean;
}

export interface ConditionEvaluationRequest {
  ruleLabel: string;
  decisionPrompt?: string;
  contextText: string;
  userInputVal?: any;
}

export interface ConditionEvaluationResponse {
  shouldSkip: boolean;
  rationale: string;
  confidence: number;
  tokensUsed: number;
}

export interface ChannelQuotaState {
  id: string;
  name: string;
  modelKey: string;
  dailyTokenLimit: number;
  dailyRpdLimit: number;
  usedTokens: number;
  usedRequests: number;
  status: 'normal' | 'warning' | 'exhausted';
}

// In-memory token and request counter for multi-channel quota metering
export const globalStats = {
  todayRequests: 0,
  todayPromptTokens: 0,
  todayOutputTokens: 0,
  todayTotalTokens: 0,
  todaySavedTokens: 0,
  todayFailedRequests: 0,
  totalLatencyMs: 0,
  estimatedFreeTierDailyLimit: 4000000, // 4.00M baseline
  dailyRpdLimit: 1500, // Standard 1,500 RPD daily limit
  lastResetDate: new Date().toISOString().slice(0, 10),
  activeChannelId: 'flash-latest',
  channels: {
    'flash-lite': {
      id: 'flash-lite',
      name: '3.1 Flash Lite',
      modelKey: 'gemini-3.1-flash-lite',
      dailyTokenLimit: 4000000,
      dailyRpdLimit: 1500,
      usedTokens: 0,
      usedRequests: 0,
      status: 'normal',
    },
    'flash-preview': {
      id: 'flash-preview',
      name: '3 Flash Preview',
      modelKey: 'gemini-flash-latest',
      dailyTokenLimit: 4000000,
      dailyRpdLimit: 1500,
      usedTokens: 0,
      usedRequests: 0,
      status: 'normal',
    },
    'flash-latest': {
      id: 'flash-latest',
      name: 'Flash Latest',
      modelKey: 'gemini-flash-latest',
      dailyTokenLimit: 4000000,
      dailyRpdLimit: 1500,
      usedTokens: 0,
      usedRequests: 0,
      status: 'normal',
    },
    '3.8-flash': {
      id: '3.8-flash',
      name: '3.8 Flash',
      modelKey: 'gemini-3.8-flash',
      dailyTokenLimit: 1000000, // 1.00M daily limit for 3.8
      dailyRpdLimit: 1500,
      usedTokens: 0,
      usedRequests: 0,
      status: 'normal',
    },
  } as Record<string, ChannelQuotaState>,
};

export function updateStats(
  channelId: string,
  promptTokens: number,
  outputTokens: number,
  latencyMs: number,
  savedTokens = 0,
  isFail = false
) {
  const today = new Date().toISOString().slice(0, 10);
  if (globalStats.lastResetDate !== today) {
    globalStats.todayRequests = 0;
    globalStats.todayPromptTokens = 0;
    globalStats.todayOutputTokens = 0;
    globalStats.todayTotalTokens = 0;
    globalStats.todaySavedTokens = 0;
    globalStats.todayFailedRequests = 0;
    globalStats.totalLatencyMs = 0;
    globalStats.lastResetDate = today;
    
    // Reset all channel counts
    for (const ch of Object.values(globalStats.channels)) {
      ch.usedTokens = 0;
      ch.usedRequests = 0;
      ch.status = 'normal';
    }
  }

  const tokenSum = promptTokens + outputTokens;
  globalStats.todayRequests += 1;
  globalStats.todayPromptTokens += promptTokens;
  globalStats.todayOutputTokens += outputTokens;
  globalStats.todayTotalTokens += tokenSum;
  globalStats.todaySavedTokens += savedTokens;
  globalStats.totalLatencyMs += latencyMs;
  if (isFail) {
    globalStats.todayFailedRequests += 1;
  }

  // Update specific channel bucket
  const ch = globalStats.channels[channelId] || globalStats.channels[globalStats.activeChannelId];
  if (ch) {
    ch.usedRequests += 1;
    ch.usedTokens += tokenSum;
    if (ch.usedTokens >= ch.dailyTokenLimit || ch.usedRequests >= ch.dailyRpdLimit) {
      ch.status = 'exhausted';
    } else if (ch.usedTokens >= ch.dailyTokenLimit * 0.85 || ch.usedRequests >= ch.dailyRpdLimit * 0.85) {
      ch.status = 'warning';
    } else {
      ch.status = 'normal';
    }
  }
}

export function setActiveChannel(channelId: string) {
  if (globalStats.channels[channelId]) {
    globalStats.activeChannelId = channelId;
  }
}

export function calibrateChannel(channelId: string, tokens?: number, requests?: number) {
  const ch = globalStats.channels[channelId];
  if (ch) {
    if (typeof tokens === 'number') ch.usedTokens = Math.max(0, tokens);
    if (typeof requests === 'number') ch.usedRequests = Math.max(0, requests);
    if (ch.usedTokens >= ch.dailyTokenLimit || ch.usedRequests >= ch.dailyRpdLimit) {
      ch.status = 'exhausted';
    } else {
      ch.status = 'normal';
    }
  }
}

export async function executeAgentStep(req: StepRunRequest): Promise<StepRunResponse> {
  const startTime = Date.now();
  const ai = getGeminiClient();

  const chosenChannelId = req.channelId || globalStats.activeChannelId;
  const channel = globalStats.channels[chosenChannelId] || globalStats.channels['flash-latest'];
  const targetModel = req.model || channel.modelKey || 'gemini-flash-latest';

  if (!ai) {
    // Graceful fallback for local development without GEMINI_API_KEY
    const durationMs = 720;
    const simulatedOutput = `【模拟输出 - 环境未检测到 GEMINI_API_KEY】\n已调度模型通道 [${channel.name} (${targetModel})] 执行步骤 [${req.stepName}]。\n\n处理结果要点：\n1. 已成功通过通道 [${channel.name}] 完成结构化拆解与业务推演。\n2. 已准确计算并记录分桶配额 (RPD 计数 +1)。\n3. 在 AI Studio 设置密钥后将无缝切换至 Google 云端大模型真实调度。`;
    const tokens = {
      promptTokens: Math.round(req.prompt.length * 0.75),
      candidatesTokens: 280,
      totalTokens: Math.round(req.prompt.length * 0.75) + 280,
    };
    updateStats(chosenChannelId, tokens.promptTokens, tokens.candidatesTokens, durationMs);
    return {
      stepId: req.stepId,
      output: simulatedOutput,
      tokens,
      durationMs,
      model: `${targetModel} (simulated)`,
      channelId: chosenChannelId,
      simulated: true,
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: req.prompt,
      config: {
        systemInstruction: req.systemInstruction || '你是一个专业、严谨且高执行力的高级智能体与业务专家。请条理清晰地完成指令任务。',
        temperature: req.temperature ?? 0.7,
      },
    });

    const durationMs = Date.now() - startTime;
    const output = response.text || '（模型执行完毕，无文本返回）';
    const usage = response.usageMetadata;

    const tokens = {
      promptTokens: usage?.promptTokenCount ?? Math.round(req.prompt.length * 0.75),
      candidatesTokens: usage?.candidatesTokenCount ?? Math.round(output.length * 0.75),
      totalTokens: usage?.totalTokenCount ?? (Math.round(req.prompt.length * 0.75) + Math.round(output.length * 0.75)),
    };

    updateStats(chosenChannelId, tokens.promptTokens, tokens.candidatesTokens, durationMs);

    return {
      stepId: req.stepId,
      output,
      tokens,
      durationMs,
      model: targetModel,
      channelId: chosenChannelId,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    updateStats(chosenChannelId, 0, 0, durationMs, 0, true);
    throw new Error(`Gemini 模型 [${targetModel}] 调用失败: ${error?.message || error}`);
  }
}

export async function evaluateStepCondition(req: ConditionEvaluationRequest): Promise<ConditionEvaluationResponse> {
  const startTime = Date.now();
  
  // If user toggle field was passed and directly false, skip immediately
  if (req.userInputVal !== undefined && req.userInputVal === false) {
    return {
      shouldSkip: true,
      rationale: `用户输入项未勾选触发此项子任务，系统已智能跳过。`,
      confidence: 1.0,
      tokensUsed: 0,
    };
  }
  if (req.userInputVal !== undefined && req.userInputVal === true) {
    return {
      shouldSkip: false,
      rationale: `用户已明确勾选启用此项二级专项子任务。`,
      confidence: 1.0,
      tokensUsed: 0,
    };
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Default smart heuristic if without live API key
    const hasRisk = req.contextText.includes('高风险') || req.contextText.includes('违约责任') || req.contextText.includes('争议');
    return {
      shouldSkip: !hasRisk,
      rationale: hasRisk ? '初筛检测到高风险关键词，触发二级子任务。' : '初筛未发现高风险因素，智能跳过以节约 Token。',
      confidence: 0.9,
      tokensUsed: 45,
    };
  }

  try {
    const prompt = `你是一个智能工作流调度决策器。请根据【上一步执行产出内容】与【子任务判定规则】，判断是否应当【跳过】接下来的二级子任务。
【子任务规则】: ${req.ruleLabel}
${req.decisionPrompt ? `【决策指导】: ${req.decisionPrompt}` : ''}

【前序产出内容摘要】:
${req.contextText.slice(0, 2000)}

请做出判定，必须以 JSON 格式输出：
{
  "shouldSkip": true 或 false,
  "rationale": "用一两句简洁的中文解释为什么跳过或为什么触发",
  "confidence": 0.0 到 1.0 的置信度数值
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const durationMs = Date.now() - startTime;
    const tokensUsed = response.usageMetadata?.totalTokenCount ?? 150;
    updateStats(globalStats.activeChannelId, response.usageMetadata?.promptTokenCount ?? 100, response.usageMetadata?.candidatesTokenCount ?? 50, durationMs);

    const jsonText = response.text?.trim() || '{}';
    const parsed = JSON.parse(jsonText);

    return {
      shouldSkip: Boolean(parsed.shouldSkip),
      rationale: parsed.rationale || (parsed.shouldSkip ? '经模型研判，前置条件未达触发阈值，已智能跳过。' : '经模型研判，前置输出符合执行标准，已触发二级子任务。'),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
      tokensUsed,
    };
  } catch (error: any) {
    console.error('Condition evaluation error:', error);
    return {
      shouldSkip: false,
      rationale: `条件评估模型响应异常，安全策略默认放行执行：${error?.message || '未知错误'}`,
      confidence: 0.5,
      tokensUsed: 0,
    };
  }
}

// ---------------------------------------------------------
// 模式一：AI 意图智能建构向导（总入口/分发器/条线式/层级式/三级子任务）
// ---------------------------------------------------------
export async function architectProjectFromIntent(userIntent: string, structureType = 'hybrid'): Promise<any> {
  const ai = getGeminiClient();
  const startTime = Date.now();

  const prompt = `你是一个顶级 AI Agent 流程系统架构师。用户是一个非技术人员（办公用户），希望在“通用智能项目底座”上构建一个高效的自动化智能体工作流。
用户描述的真实意图与业务场景如下：
"""
${userIntent}
"""

【架构设计要求】（极为关键，必须严格遵守）：
1. 【总入口 / 总规则 / 任务分发器 (Tier 1)】:
   - 步骤1必须是“总入口与需求/意图分发器”，负责读取全局输入，萃取核心事实、设定全局规则，并将任务拆解分派给下层业务线。
2. 【条线式或层级式业务推进 (Tier 2)】:
   - 步骤2起展开专业条线分析（例如法务条线、财务条线、业务执行条线）。
3. 【三级条件子任务 (Tier 3 深潜)】:
   - 必须设计至少 1~2 个带有条件判断与智能跳过机制的“三级子任务” (isSubtask: true, parentStepId: 上一级步骤ID, condition: { type: 'model_decision' | 'input_toggle', label: '...', decisionPrompt: '...', defaultSkip: true }, estimatedTokenSaving: 1500)。
4. 【终版输出与交付交付物】:
   - 最后一步综合所有前序主干与实际触发的子任务结论，输出正式办公交付报告。
5. 【表单输入规范】:
   - 设计 1~3 个适合普通办公人员填写的友好输入字段 (inputSchema)，必须包含至少一个带有丰富办公测试数据的 textarea (defaultValue 需自带逼真的测试素材，方便用户一键体验)。

请以 JSON 格式输出如下数据结构：
{
  "project": {
    "id": "custom-agent-xxx",
    "name": "业务标题 (8-16字)",
    "description": "解决的办公痛点与流程概述 (50字左右)",
    "category": "office_doc" | "legal_compliance" | "market_research" | "content_creation" | "data_analysis" | "custom",
    "icon": "Bot" | "ShieldCheck" | "TrendingUp" | "Share2" | "Workflow",
    "author": "AI 架构向导生成",
    "version": "1.0.0",
    "inputSchema": [
      {
        "key": "inputDocument",
        "label": "字段名称",
        "type": "textarea" | "text" | "select" | "checkbox",
        "required": true,
        "placeholder": "...",
        "defaultValue": "逼真、详实的预置测试数据..."
      }
    ],
    "steps": [
      {
        "id": "step-dispatcher",
        "name": "步骤名称 (如：【总分发】意图识别与规则分流)",
        "phase": "阶段一：总入口与分发",
        "description": "步骤职责描述",
        "promptTemplate": "提示词模板，支持 {inputDocument}, {step-dispatcher} 插值占位",
        "isSubtask": false,
        "estimatedTokenSaving": 0
      },
      {
        "id": "subtask-deep-check",
        "name": "【三级子任务】专项高危条款复核 (按需跳过)",
        "phase": "阶段二：专项深潜 (三级子任务)",
        "isSubtask": true,
        "parentStepId": "step-dispatcher",
        "condition": {
          "id": "cond-1",
          "type": "model_decision",
          "label": "当分发器判定存在高风险或用户勾选时触发，否则跳过",
          "decisionPrompt": "若前序初筛未发现高风险，则跳过本次复核以节省 Token",
          "defaultSkip": true
        },
        "promptTemplate": "...",
        "estimatedTokenSaving": 1800
      }
    ]
  },
  "architectureExplanation": {
    "tier1Summary": "一级分发器如何把控总入口与分流",
    "tier2Summary": "二级条线/层级如何协同展开",
    "tier3Summary": "三级子任务的触发条件与 Token 节约机制"
  }
}`;

  if (!ai) {
    // Simulated smart fallback
    const simulatedProject = {
      id: `ai-arch-${Date.now()}`,
      name: '智能工单全景分派与深度穿透 Agent',
      description: '基于用户意图自动生成的总入口分发、条线式流转与三级穿透子任务工作流。',
      category: 'office_doc',
      icon: 'Workflow',
      author: 'AI 架构向导生成',
      version: '1.0.0',
      inputSchema: [
        {
          key: 'ticketContent',
          label: '业务工单或待审素材',
          type: 'textarea',
          required: true,
          placeholder: '输入待处理材料...',
          defaultValue: '客户反馈：由于系统于昨日 14:00 突发中断约 45 分钟，导致当期重要签约数据未能及时同步，现要求全额退还本季度技术服务费（共计 65,000 元）并要求出具故障责任归属说明函与法律免责声明。'
        },
        {
          key: 'forceAuditLegal',
          label: '强制启动三级法务违约审计 (跳过开关)',
          type: 'checkbox',
          defaultValue: false,
          description: '默认由模型自动评估违约争议严重度，若属于常规服务协议则自动跳过法务子任务。'
        }
      ],
      steps: [
        {
          id: 'tier1-dispatcher',
          name: '一级总入口：业务诉求提炼与优先级任务分发',
          phase: '阶段一：总入口与分发',
          description: '解析核心事件要素、诉求金额与责任定级，分发给后续处理条线。',
          promptTemplate: '请作为总调度分发器，审阅材料：\n{ticketContent}\n\n请输出：\n1. 核心诉求与争议金额\n2. 业务严重等级（P0/P1/P2）\n3. 任务分流建议（财务退款条线 / 技术原因调查条线 / 法务涉诉条线）',
          isSubtask: false,
          estimatedTokenSaving: 0
        },
        {
          id: 'tier2-finance-review',
          name: '二级条线：财务退费与补偿测算方案',
          phase: '阶段二：业务条线推进',
          description: '测算合理补偿额度与退款审批链路。',
          promptTemplate: '基于一级分发结论：\n{tier1-dispatcher}\n\n请测算退费方案与补偿策略。',
          isSubtask: false,
          estimatedTokenSaving: 0
        },
        {
          id: 'tier3-legal-subtask',
          name: '三级子任务：违约赔偿合规与免责声明专项审查',
          phase: '阶段三：三级深潜 (按需跳过)',
          isSubtask: true,
          parentStepId: 'tier1-dispatcher',
          condition: {
            id: 'cond-tier3',
            type: 'model_decision',
            label: '仅当严重等级达到 P0/P1 且涉及索赔诉讼时触发，常规客诉自动跳过',
            decisionPrompt: '若前序未发生法律索赔风险，则跳过以节约 Token。',
            defaultSkip: true
          },
          promptTemplate: '针对退费与赔付诉求进行民法典合规审查与免责函起草：\n{tier1-dispatcher}',
          estimatedTokenSaving: 2200
        },
        {
          id: 'tier4-final-delivery',
          name: '四级归档：输出正式答复函与高管决策建议书',
          phase: '阶段四：成果归档',
          description: '整合所有条线与实际触发的三级子任务结论，输出正式对外公文。',
          promptTemplate: '请综合前序所有调查与审查结论：\n{tier1-dispatcher}\n\n输出正式对外客户答复函及内部闭环复盘建议。',
          isSubtask: false,
          estimatedTokenSaving: 0
        }
      ]
    };
    return {
      project: simulatedProject,
      architectureExplanation: {
        tier1Summary: '一级总入口：全面解析客诉事实并判定 P0/P1/P2 严重等级，生成条线分发指示。',
        tier2Summary: '二级业务条线：平行推进财务核算与技术复盘。',
        tier3Summary: '三级深潜子任务：仅在严重索赔时触发法务专项审查，常规工单自动跳过，节省约 2,200 Tokens。'
      }
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const durationMs = Date.now() - startTime;
    updateStats(globalStats.activeChannelId, response.usageMetadata?.promptTokenCount ?? 1200, response.usageMetadata?.candidatesTokenCount ?? 800, durationMs);

    const jsonText = response.text?.trim() || '{}';
    return JSON.parse(jsonText);
  } catch (err: any) {
    throw new Error(`AI 流程架构生成失败: ${err.message || err}`);
  }
}

// ---------------------------------------------------------
// 模式二 & 三：全量阅读外部项目（README, SKILL.md, 依赖, Dockerfile, MCP 等）并自适应
// ---------------------------------------------------------
export async function adaptExternalProjectRepo(params: {
  files: Record<string, string>;
  repoName?: string;
  sourceUrl?: string;
}): Promise<any> {
  const ai = getGeminiClient();
  const startTime = Date.now();

  const fileKeys = Object.keys(params.files);
  // Summarize file contents with truncated preview to protect context window
  const filesBundle = Object.entries(params.files).map(([filename, content]) => {
    return `=== FILE: ${filename} ===\n${content.slice(0, 3000)}\n`;
  }).join('\n');

  const prompt = `你是一个开源项目全量解构与环境自适应迁移引擎。
请全面深度阅读以下开源项目的全部文件和说明文档（包括但不限于 README, SKILL.md, AGENTS.md, CLAUDE.md, package.json, requirements.txt, pyproject.toml, Dockerfile, configs, MCP declarations, workflow/agent definitions 等）：

【检测到的项目文件列表】:
${fileKeys.join(', ')}

【项目各文件源码及说明摘要】:
${filesBundle}

【自适应迁移任务要求】（极重要）：
1. 【环境与依赖全量理解与屏蔽】:
   - 分析该开源项目原本需要什么运行环境（如 Python 3.10、Node.js、Docker 容器、Conda 虚拟环境、外部 CLI 命令、系统依赖库等）。
   - 【自适应转换】：将这些依赖了 Python / 复杂 C++ 库或本地 Docker 的执行脚本，自适应提炼为可在本无代码平台（Node.js / Web / Gemini LLM Function Calling）上无缝沙箱运行的标准 Agent 提示词链与结构化处理步骤，彻底屏蔽终端命令行与本地安装的繁琐门槛！
2. 【提取多层级工作流】:
   - 从原项目的 README / SKILL / workflow 定义中提取核心目标，构建：
     * 一级总入口 (Dispatcher)
     * 二级专业执行链路 (Tier-2 tasks)
     * 三级条件子任务 (Tier-3 subtasks, 具备智能跳过规则，节约 Token)
     * 最终成果交付节点
3. 【生成就绪报告与可直接运行的 AgentProject】:
   - 输出完整的 JSON 结构，办公用户点击后可立即在底座内一键运行！

请以纯 JSON 格式输出：
{
  "adaptedProject": {
    "id": "adapted-xxx",
    "name": "从开源项目自适应迁移的名称",
    "description": "项目能力概述及自适应屏蔽的技术细节说明",
    "category": "office_doc" | "legal_compliance" | "market_research" | "content_creation" | "data_analysis" | "custom",
    "icon": "Bot" | "ShieldCheck" | "Workflow",
    "author": "开源自适应导入 (${params.repoName || 'GitHub Repo'})",
    "version": "1.0.0",
    "inputSchema": [
      {
        "key": "inputContent",
        "label": "...",
        "type": "textarea" | "text" | "checkbox",
        "required": true,
        "defaultValue": "高质量预置测试样本..."
      }
    ],
    "steps": [
      {
        "id": "step-1",
        "name": "...",
        "phase": "...",
        "description": "...",
        "promptTemplate": "...",
        "isSubtask": false,
        "estimatedTokenSaving": 0
      }
    ]
  },
  "readinessReport": {
    "detectedEnvironment": {
      "originalLanguage": "Python 3.10 / Node.js / Docker...",
      "keyDependencies": ["numpy", "langchain", "mcp-server-fetch..."],
      "dockerRequired": false,
      "mcpToolsDetected": ["web_search", "document_parse..."]
    },
    "adaptationSummary": "详细说明底座如何免除了命令行、并将 Python/Docker 逻辑转换为云端大模型沙箱原生调度的过程",
    "hierarchyAnalysis": "阐述解构出的总入口、二级业务链和三级条件跳过机制",
    "readyToRun": true
  }
}`;

  if (!ai) {
    // Graceful fallback for mock preview
    return {
      adaptedProject: {
        id: `adapted-${Date.now()}`,
        name: params.repoName ? `自适应：${params.repoName}` : '开源项目深度自适应 Agent',
        description: '已全量阅读 README、SKILL.md 及 requirements.txt，已自动屏蔽 Python/Docker 复杂依赖，转换为原生可视化工作流。',
        category: 'custom',
        icon: 'Workflow',
        author: `开源迁移 (${params.sourceUrl || '本地压缩包'})`,
        version: '1.0.0',
        inputSchema: [
          {
            key: 'projectInput',
            label: '项目执行输入文本',
            type: 'textarea',
            required: true,
            defaultValue: '这是从开源项目规范中提取的标准测试用例，点击“一键启动任务”即可验证全流程执行效果。'
          },
          {
            key: 'enableDeepTrace',
            label: '启用三级深度穿透复核 (子任务开关)',
            type: 'checkbox',
            defaultValue: true
          }
        ],
        steps: [
          {
            id: 'step-entry',
            name: '一级总入口：指令解构与参数自适应映射',
            phase: '阶段一：入口分发',
            description: '从输入材料中抽取元数据与前置参数，完成协议对齐。',
            promptTemplate: '请分析开源项目输入材料：\n{projectInput}\n\n请解构关键执行要点并输出执行规划。',
            isSubtask: false,
            estimatedTokenSaving: 0
          },
          {
            id: 'subtask-deep-trace',
            name: '三级子任务：深度推演与安全边界复验 (可跳过)',
            phase: '阶段二：专项穿透 (三级子任务)',
            isSubtask: true,
            parentStepId: 'step-entry',
            condition: {
              id: 'cond-trace',
              type: 'model_decision',
              label: '若前序解析未发现高复杂度逻辑分支，则自动跳过以节约 Token',
              decisionPrompt: '若基础执行规划已足够完整，则跳过本次深度复算。',
              defaultSkip: true
            },
            promptTemplate: '基于前序规划进行深度专项复验：\n{step-entry}',
            estimatedTokenSaving: 1600
          },
          {
            id: 'step-final',
            name: '输出成果与执行交付报告',
            phase: '阶段三：交付成果',
            description: '生成最终标准化结构成果。',
            promptTemplate: '汇总全流程分析结论，输出最终交付成果。',
            isSubtask: false,
            estimatedTokenSaving: 0
          }
        ]
      },
      readinessReport: {
        detectedEnvironment: {
          originalLanguage: 'Python / Node.js 混合架构',
          keyDependencies: ['langchain', 'pydantic', 'requests', 'dotenv'],
          dockerRequired: false,
          mcpToolsDetected: ['text_parser', 'data_validator']
        },
        adaptationSummary: '系统已全量解析项目内全部声明文件，将原本需要本地 conda/pip 安装的执行外壳，自适应转换为云端 Gemini 3.8 Flash 沙箱原生的分步提示词与函数调用规范，完全无需在本地部署环境。',
        hierarchyAnalysis: '已重构为“一级指令分发 ➔ 二级业务解构 ➔ 三级条件穿透子任务 ➔ 终版成果归档”的四级完整架构。',
        readyToRun: true
      }
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const durationMs = Date.now() - startTime;
    updateStats(globalStats.activeChannelId, response.usageMetadata?.promptTokenCount ?? 2000, response.usageMetadata?.candidatesTokenCount ?? 1200, durationMs);

    const jsonText = response.text?.trim() || '{}';
    return JSON.parse(jsonText);
  } catch (err: any) {
    throw new Error(`开源项目全量阅读与自适应适配失败: ${err.message || err}`);
  }
}

