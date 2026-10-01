import { StepExecutionResult } from '../types/agent';

export interface RunStepParams {
  projectId: string;
  stepId: string;
  stepName: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  channelId?: string;
  model?: string;
}

export async function selectChannelApi(channelId: string) {
  const res = await fetch('/api/channel/select', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || '切换模型通道失败');
  }
  return json.data;
}

export async function calibrateChannelApi(channelId: string, tokens?: number, requests?: number) {
  const res = await fetch('/api/stats/calibrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId, tokens, requests }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || '校准用量失败');
  }
  return json.data;
}

export interface EvaluateConditionParams {
  ruleLabel: string;
  decisionPrompt?: string;
  contextText: string;
  userInputVal?: any;
}

export async function checkServerHealth(): Promise<{ status: string; hasKey: boolean }> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend server health check error:', err);
    return { status: 'offline', hasKey: false };
  }
}

export async function fetchServerStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error(`Fetch stats failed: ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn('Fetch server stats error:', err);
    return null;
  }
}

export async function recordTokenSaving(savedTokens: number) {
  try {
    await fetch('/api/stats/record-saving', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedTokens }),
    });
  } catch (e) {
    console.warn('Failed to record token saving:', e);
  }
}

export async function runStepApi(params: RunStepParams) {
  const res = await fetch('/api/run-step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `执行步骤失败 [HTTP ${res.status}]`);
  }
  return json.data;
}

export async function evaluateConditionApi(params: EvaluateConditionParams) {
  const res = await fetch('/api/evaluate-condition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `评估条件失败 [HTTP ${res.status}]`);
  }
  return json.data;
}

export async function architectProjectFromIntentApi(userIntent: string, structureType = 'hybrid') {
  const res = await fetch('/api/project/architect-from-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIntent, structureType }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'AI 架构生成异常');
  }
  return json.data;
}

export async function adaptExternalProjectRepoApi(params: {
  files: Record<string, string>;
  repoName?: string;
  sourceUrl?: string;
}) {
  const res = await fetch('/api/project/adapt-external', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || '开源项目自适应解析异常');
  }
  return json.data;
}
