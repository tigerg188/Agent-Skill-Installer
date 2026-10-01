import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { 
  executeAgentStep, 
  evaluateStepCondition, 
  globalStats, 
  setActiveChannel, 
  calibrateChannel,
  architectProjectFromIntent,
  adaptExternalProjectRepo
} from './src/server/geminiService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: Date.now(),
  });
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      ...globalStats,
      avgResponseMs: globalStats.todayRequests > 0 
        ? Math.round(globalStats.totalLatencyMs / globalStats.todayRequests) 
        : 0,
      lastUpdated: Date.now(),
    },
  });
});

// Select active channel
app.post('/api/channel/select', (req, res) => {
  const { channelId } = req.body;
  if (channelId) {
    setActiveChannel(channelId);
  }
  res.json({
    success: true,
    activeChannelId: globalStats.activeChannelId,
    data: globalStats,
  });
});

// Calibrate channel
app.post('/api/stats/calibrate', (req, res) => {
  const { channelId, tokens, requests } = req.body;
  if (channelId) {
    calibrateChannel(channelId, tokens, requests);
  }
  res.json({
    success: true,
    data: globalStats,
  });
});

app.post('/api/stats/record-saving', (req, res) => {
  const savedTokens = Number(req.body.savedTokens) || 0;
  globalStats.todaySavedTokens += savedTokens;
  res.json({ success: true, savedTokens: globalStats.todaySavedTokens });
});

// Run Agent Step
app.post('/api/run-step', async (req, res) => {
  try {
    const { projectId, stepId, stepName, prompt, systemInstruction, temperature, channelId, model } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: '缺少必需的 prompt 参数' });
    }
    const result = await executeAgentStep({
      projectId: projectId || 'custom',
      stepId: stepId || 'unknown',
      stepName: stepName || '执行步骤',
      prompt,
      systemInstruction,
      temperature,
      channelId,
      model,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || '模型执行异常' });
  }
});

// Evaluate Step Condition
app.post('/api/evaluate-condition', async (req, res) => {
  try {
    const { ruleLabel, decisionPrompt, contextText, userInputVal } = req.body;
    const result = await evaluateStepCondition({
      ruleLabel: ruleLabel || '',
      decisionPrompt,
      contextText: contextText || '',
      userInputVal,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || '条件评估异常' });
  }
});

// 模式一：AI 意图架构生成
app.post('/api/project/architect-from-intent', async (req, res) => {
  try {
    const { userIntent, structureType } = req.body;
    if (!userIntent) {
      return res.status(400).json({ success: false, error: '缺少用户意图描述' });
    }
    const result = await architectProjectFromIntent(userIntent, structureType);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'AI 架构生成异常' });
  }
});

// 模式二 & 三：开源项目自适应适配
app.post('/api/project/adapt-external', async (req, res) => {
  try {
    const { files, repoName, sourceUrl } = req.body;
    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({ success: false, error: '未提供可解析的项目文件' });
    }
    const result = await adaptExternalProjectRepo({ files, repoName, sourceUrl });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || '开源项目自适应解析异常' });
  }
});

// Serve frontend in production
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[通用智能项目底座] Server running on port ${PORT}`);
});
