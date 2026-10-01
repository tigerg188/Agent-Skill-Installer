import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { 
  executeAgentStep, 
  evaluateStepCondition, 
  globalStats, 
  setActiveChannel, 
  calibrateChannel,
  architectProjectFromIntent,
  adaptExternalProjectRepo
} from './geminiService';

// Helper to parse JSON body from incoming Node.js request
function readJsonBody<T = any>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve({} as T);
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function apiServerPlugin(): Plugin {
  return {
    name: 'universal-agent-base-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // API Route: Health check
        if (url === '/api/health' && req.method === 'GET') {
          return sendJson(res, 200, {
            status: 'ok',
            hasKey: Boolean(process.env.GEMINI_API_KEY),
            timestamp: Date.now(),
          });
        }

        // API Route: Get Token & Quota stats
        if (url === '/api/stats' && req.method === 'GET') {
          return sendJson(res, 200, {
            success: true,
            data: {
              ...globalStats,
              avgResponseMs: globalStats.todayRequests > 0 
                ? Math.round(globalStats.totalLatencyMs / globalStats.todayRequests) 
                : 0,
              lastUpdated: Date.now(),
            },
          });
        }

        // API Route: Select active model channel
        if (url === '/api/channel/select' && req.method === 'POST') {
          try {
            const body = await readJsonBody(req);
            if (body.channelId) {
              setActiveChannel(body.channelId);
            }
            return sendJson(res, 200, {
              success: true,
              activeChannelId: globalStats.activeChannelId,
              data: globalStats,
            });
          } catch (err: any) {
            return sendJson(res, 400, { success: false, error: err.message });
          }
        }

        // API Route: Calibrate channel usage
        if (url === '/api/stats/calibrate' && req.method === 'POST') {
          try {
            const body = await readJsonBody(req);
            const { channelId, tokens, requests } = body;
            if (channelId) {
              calibrateChannel(channelId, tokens, requests);
            }
            return sendJson(res, 200, {
              success: true,
              data: globalStats,
            });
          } catch (err: any) {
            return sendJson(res, 400, { success: false, error: err.message });
          }
        }

        // API Route: Record Token savings from skipping
        if (url === '/api/stats/record-saving' && req.method === 'POST') {
          try {
            const body = await readJsonBody(req);
            const savedTokens = Number(body.savedTokens) || 0;
            globalStats.todaySavedTokens += savedTokens;
            return sendJson(res, 200, { success: true, savedTokens: globalStats.todaySavedTokens });
          } catch (err: any) {
            return sendJson(res, 400, { success: false, error: err.message });
          }
        }

        // API Route: Run single Agent Step
        if (url === '/api/run-step' && req.method === 'POST') {
          try {
            const body = await readJsonBody(req);
            if (!body.prompt) {
              return sendJson(res, 400, { success: false, error: '缺少必需的 prompt 参数' });
            }
            const result = await executeAgentStep({
              projectId: body.projectId || 'custom',
              stepId: body.stepId || 'unknown',
              stepName: body.stepName || '执行步骤',
              prompt: body.prompt,
              systemInstruction: body.systemInstruction,
              temperature: body.temperature,
              channelId: body.channelId,
              model: body.model,
            });
            return sendJson(res, 200, { success: true, data: result });
          } catch (err: any) {
            console.error('API /api/run-step error:', err);
            return sendJson(res, 500, { success: false, error: err.message || '模型执行异常' });
          }
        }

        // API Route: Evaluate subtask condition (smart skip)
        if (url === '/api/evaluate-condition' && req.method === 'POST') {
          try {
            const body = await readJsonBody(req);
            const result = await evaluateStepCondition({
              ruleLabel: body.ruleLabel || '',
              decisionPrompt: body.decisionPrompt,
              contextText: body.contextText || '',
              userInputVal: body.userInputVal,
            });
            return sendJson(res, 200, { success: true, data: result });
          } catch (err: any) {
            console.error('API /api/evaluate-condition error:', err);
            return sendJson(res, 500, { success: false, error: err.message || '条件评估异常' });
          }
        }

        // 模式一：AI 意图架构生成
        if (url === '/api/project/architect-from-intent' && req.method === 'POST') {
          try {
            const body = await readJsonBody(req);
            if (!body.userIntent) {
              return sendJson(res, 400, { success: false, error: '缺少用户意图描述' });
            }
            const result = await architectProjectFromIntent(body.userIntent, body.structureType);
            return sendJson(res, 200, { success: true, data: result });
          } catch (err: any) {
            console.error('API /api/project/architect-from-intent error:', err);
            return sendJson(res, 500, { success: false, error: err.message || 'AI 架构生成异常' });
          }
        }

        // 模式二 & 三：全量阅读外部项目并自适应
        if (url === '/api/project/adapt-external' && req.method === 'POST') {
          try {
            const body = await readJsonBody(req);
            if (!body.files || Object.keys(body.files).length === 0) {
              return sendJson(res, 400, { success: false, error: '未提供可解析的项目文件' });
            }
            const result = await adaptExternalProjectRepo({
              files: body.files,
              repoName: body.repoName,
              sourceUrl: body.sourceUrl,
            });
            return sendJson(res, 200, { success: true, data: result });
          } catch (err: any) {
            console.error('API /api/project/adapt-external error:', err);
            return sendJson(res, 500, { success: false, error: err.message || '开源项目自适应解析异常' });
          }
        }

        next();
      });
    },
  };
}
