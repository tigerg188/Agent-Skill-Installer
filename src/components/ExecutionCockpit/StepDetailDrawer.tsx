import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Terminal, 
  Sparkles, 
  Clock, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  CornerDownRight,
  ShieldCheck,
  Code
} from 'lucide-react';
import { StepDefinition, StepExecutionResult } from '../../types/agent';

interface StepDetailDrawerProps {
  step: StepDefinition | null;
  result?: StepExecutionResult;
  onClose: () => void;
}

export const StepDetailDrawer: React.FC<StepDetailDrawerProps> = ({
  step,
  result,
  onClose,
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [activeTab, setActiveTab] = useState<'output' | 'prompt' | 'trace'>('output');

  if (!step) return null;

  const copyToClipboard = (text: string, type: 'prompt' | 'output') => {
    navigator.clipboard.writeText(text);
    if (type === 'prompt') {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } else {
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-xs flex justify-end">
      <div 
        className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                {step.phase}
              </span>
              {step.isSubtask && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                  <CornerDownRight className="w-3 h-3" />
                  <span>二级子任务</span>
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-1">
              {step.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status & Metrics Bar */}
        <div className="bg-slate-850 px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">当前状态:</span>
            {result?.status === 'completed' && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>已完成</span>
              </span>
            )}
            {result?.status === 'skipped' && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>智能跳过 (节省Token)</span>
              </span>
            )}
            {result?.status === 'running' && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                模型正在生成...
              </span>
            )}
            {result?.status === 'failed' && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                异常中断
              </span>
            )}
            {(!result || result.status === 'pending') && (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                待执行
              </span>
            )}
          </div>

          {result?.status === 'completed' && (
            <div className="flex items-center space-x-4 text-slate-300">
              <span className="flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Token: <strong className="text-white">{result.tokens.totalTokens.toLocaleString()}</strong></span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>耗时: <strong className="text-white">{(result.durationMs / 1000).toFixed(2)}s</strong></span>
              </span>
            </div>
          )}

          {result?.status === 'skipped' && (
            <div className="flex items-center space-x-1 text-purple-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>已免除消耗: ~{result.tokens.savedTokens.toLocaleString()} Tokens</span>
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900 px-5 pt-2">
          <button
            onClick={() => setActiveTab('output')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'output'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>执行产出内容</span>
          </button>
          <button
            onClick={() => setActiveTab('prompt')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'prompt'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>实际投递 Prompt</span>
          </button>
          <button
            onClick={() => setActiveTab('trace')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'trace'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>条件机制与节点元数据</span>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: OUTPUT */}
          {activeTab === 'output' && (
            <div className="space-y-4">
              {result?.status === 'skipped' ? (
                <div className="bg-purple-950/20 border border-purple-800/40 rounded-xl p-4 text-purple-200 text-sm space-y-2">
                  <div className="font-semibold flex items-center space-x-2 text-purple-300">
                    <Sparkles className="w-4 h-4" />
                    <span>本步骤已被系统自动跳过</span>
                  </div>
                  <p className="text-xs text-purple-200/90 leading-relaxed">
                    跳过原因：{result.skipReason || '前置条件不满足或根据业务规则无需额外耗费算力。'}
                  </p>
                  <div className="text-[11px] text-purple-300/80 pt-2 border-t border-purple-800/30">
                    💡 提示：二级子任务的跳过机制有效保护了每日免费 API 额度，避免无意义的无效循环调用。
                  </div>
                </div>
              ) : result?.outputContent ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">模型生成成果：</span>
                    <button
                      onClick={() => copyToClipboard(result.outputContent || '', 'output')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 px-2 py-1 bg-slate-800 rounded border border-slate-700"
                    >
                      {copiedOutput ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedOutput ? '已复制到剪贴板' : '复制内容'}</span>
                    </button>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 font-sans leading-relaxed whitespace-pre-wrap selection:bg-indigo-600/40">
                    {result.outputContent}
                  </div>
                </div>
              ) : result?.status === 'running' ? (
                <div className="text-center py-12 text-slate-400">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-300">模型思考与生成中...</p>
                  <p className="text-xs text-slate-500 mt-1">正处理上下文与专业提示词</p>
                </div>
              ) : result?.status === 'failed' ? (
                <div className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-4 text-rose-200 text-sm">
                  <div className="font-semibold flex items-center space-x-2 text-rose-300 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>执行异常信息</span>
                  </div>
                  <pre className="text-xs font-mono bg-rose-950/60 p-3 rounded text-rose-200 overflow-x-auto whitespace-pre-wrap">
                    {result.error || '未知错误'}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">
                  此节点尚未执行，请在工作台点击“一键启动任务”。
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROMPT */}
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  {result?.inputPrompt ? '已插值完成的最终 Prompt' : '未插值的原始模版'}
                </span>
                <button
                  onClick={() => copyToClipboard(result?.inputPrompt || step.promptTemplate, 'prompt')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 px-2 py-1 bg-slate-800 rounded border border-slate-700"
                >
                  {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPrompt ? '已复制' : '复制 Prompt'}</span>
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-indigo-200/90 leading-relaxed whitespace-pre-wrap selection:bg-indigo-600/40 overflow-x-auto">
                {result?.inputPrompt || step.promptTemplate}
              </div>

              {step.systemInstruction && (
                <div className="mt-3">
                  <span className="text-xs text-slate-400 font-medium block mb-1">系统人设角色 (System Instruction)：</span>
                  <div className="bg-slate-850 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300">
                    {step.systemInstruction}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRACE & CONFIG */}
          {activeTab === 'trace' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-850 rounded-xl border border-slate-800 p-4 space-y-3">
                <h4 className="font-semibold text-slate-200 text-sm flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>条件判断机制 (Condition Engine)</span>
                </h4>
                {step.condition ? (
                  <div className="space-y-2 text-slate-300">
                    <div>
                      <span className="text-slate-500">条件类型: </span>
                      <span className="font-mono text-indigo-300">
                        {step.condition.type === 'model_decision' ? '大模型动态判断 (Model Decision)' : 
                         step.condition.type === 'input_toggle' ? '用户输入开关 (Input Toggle)' : '业务数据规则 (Data Rule)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">判断规则: </span>
                      <span>{step.condition.label}</span>
                    </div>
                    {step.condition.decisionPrompt && (
                      <div>
                        <span className="text-slate-500">决策提示词: </span>
                        <span className="text-slate-400">{step.condition.decisionPrompt}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500">预估节约算力: </span>
                      <span className="text-emerald-400 font-semibold">~{step.estimatedTokenSaving || 1200} Tokens</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400">此步骤为主干必需流程节点，无需条件判断，默认无条件顺序执行。</p>
                )}
              </div>

              <div className="bg-slate-850 rounded-xl border border-slate-800 p-4 space-y-2">
                <h4 className="font-semibold text-slate-200 text-sm">节点拓扑属性</h4>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-500">节点 ID: </span>
                    <span className="font-mono">{step.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">所属阶段: </span>
                    <span>{step.phase}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">是否子任务: </span>
                    <span>{step.isSubtask ? '是 (二级子任务)' : '否 (主流程)'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">父级依赖: </span>
                    <span className="font-mono">{step.parentStepId || (step.dependsOn ? step.dependsOn.join(', ') : '无')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            关闭详情面板
          </button>
        </div>
      </div>
    </div>
  );
};
