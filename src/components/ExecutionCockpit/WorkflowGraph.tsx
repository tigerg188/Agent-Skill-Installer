import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  CornerDownRight, 
  GitBranch, 
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  ArrowDown
} from 'lucide-react';
import { AgentProject, StepDefinition, StepExecutionResult, StepStatus } from '../../types/agent';

interface WorkflowGraphProps {
  project: AgentProject;
  stepResults: Record<string, StepExecutionResult>;
  activeStepId: string | null;
  onSelectStep: (step: StepDefinition) => void;
  isRunning: boolean;
}

export const WorkflowGraph: React.FC<WorkflowGraphProps> = ({
  project,
  stepResults,
  activeStepId,
  onSelectStep,
  isRunning,
}) => {
  return (
    <div className="w-full bg-slate-900/60 rounded-2xl border border-slate-800 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-slate-100 text-sm">
            任务执行拓扑与动态分支链路 (DAG)
          </h3>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700/60">
            共 {project.steps.length} 个节点
          </span>
        </div>
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>已完成</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            <span>智能跳过 (省Token)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block animate-pulse" />
            <span>运行中</span>
          </span>
        </div>
      </div>

      {/* Steps Pipeline Visualizer */}
      <div className="space-y-3 relative">
        {project.steps.map((step, index) => {
          const result = stepResults[step.id] || { status: 'pending', durationMs: 0, tokens: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0, savedTokens: 0 } };
          const isSelected = activeStepId === step.id;
          const isSubtask = Boolean(step.isSubtask);

          return (
            <div key={step.id} className="relative">
              {/* Vertical connector guide */}
              {index > 0 && !isSubtask && (
                <div className="absolute -top-3 left-6 w-0.5 h-3 bg-slate-800 z-0" />
              )}

              <div
                onClick={() => onSelectStep(step)}
                className={`group relative rounded-xl border transition-all cursor-pointer p-4 z-10 ${
                  isSubtask ? 'ml-6 sm:ml-8 border-dashed' : ''
                } ${
                  isSelected
                    ? 'ring-2 ring-indigo-500 border-indigo-400 bg-slate-800/90 shadow-md shadow-indigo-500/10'
                    : result.status === 'running'
                    ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50'
                    : result.status === 'completed'
                    ? 'border-emerald-800/70 bg-slate-800/40 hover:bg-slate-800/70'
                    : result.status === 'skipped'
                    ? 'border-purple-800/60 bg-purple-950/20 hover:bg-purple-950/30'
                    : result.status === 'failed'
                    ? 'border-rose-800/80 bg-rose-950/20'
                    : 'border-slate-800 bg-slate-850/50 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Step Info & Badges */}
                  <div className="flex items-start space-x-3">
                    
                    {/* Status Icon */}
                    <div className="mt-0.5">
                      {result.status === 'completed' && (
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      {result.status === 'running' && (
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center animate-spin">
                          <Loader2 className="w-4 h-4" />
                        </div>
                      )}
                      {result.status === 'skipped' && (
                        <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}
                      {result.status === 'failed' && (
                        <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                      )}
                      {result.status === 'pending' && (
                        <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-500 border border-slate-700/80 flex items-center justify-center">
                          <Clock className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Step Title, Subtask tag, Phase & Description */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                          {step.phase}
                        </span>

                        {isSubtask && (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-medium px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            <CornerDownRight className="w-3 h-3" />
                            <span>二级子任务</span>
                          </span>
                        )}

                        <span className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                          {step.name}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {step.description}
                      </p>

                      {/* Condition badge if present */}
                      {step.condition && (
                        <div className="mt-2 flex items-center space-x-1.5 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md inline-flex">
                          <span className="font-medium">判定机制:</span>
                          <span className="truncate max-w-[280px] sm:max-w-md">
                            {step.condition.label}
                          </span>
                        </div>
                      )}

                      {/* Skip Reason summary if skipped */}
                      {result.status === 'skipped' && result.skipReason && (
                        <div className="mt-2 text-xs bg-purple-900/30 text-purple-200 border border-purple-700/40 rounded-md p-2">
                          <span className="font-medium text-purple-300">跳过依据：</span>
                          {result.skipReason}
                        </div>
                      )}

                      {/* Error message preview if failed */}
                      {result.status === 'failed' && result.error && (
                        <div className="mt-2 text-xs bg-rose-900/40 text-rose-200 border border-rose-700/50 rounded-md p-2">
                          <span className="font-semibold text-rose-300">报错异常：</span>
                          {result.error}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Metrics & Inspection Link */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                    {result.status === 'completed' && (
                      <div className="text-right">
                        <div className="text-xs font-semibold text-emerald-400">
                          {result.tokens.totalTokens.toLocaleString()} Tokens
                        </div>
                        <div className="text-[11px] text-slate-400">
                          耗时 {(result.durationMs / 1000).toFixed(2)}s
                        </div>
                      </div>
                    )}

                    {result.status === 'skipped' && (
                      <div className="text-right">
                        <div className="text-xs font-semibold text-purple-300 flex items-center space-x-1 justify-end">
                          <Sparkles className="w-3 h-3" />
                          <span>节约 ~{result.tokens.savedTokens.toLocaleString()} Tokens</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          免除模型消耗
                        </div>
                      </div>
                    )}

                    {result.status === 'running' && (
                      <div className="text-xs text-blue-400 font-medium flex items-center space-x-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                        <span>调度执行中...</span>
                      </div>
                    )}

                    {result.status === 'pending' && (
                      <div className="text-xs text-slate-500">
                        等待前置节点
                      </div>
                    )}

                    <div className="mt-1 text-slate-500 group-hover:text-indigo-300 flex items-center text-[11px]">
                      <span>查看详情</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
