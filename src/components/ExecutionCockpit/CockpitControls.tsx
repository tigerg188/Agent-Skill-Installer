import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Sparkles, 
  FileText, 
  Copy, 
  Check, 
  Download, 
  BookOpen, 
  Zap,
  Info
} from 'lucide-react';
import { AgentProject, ExecutionRecord } from '../../types/agent';

interface CockpitControlsProps {
  project: AgentProject;
  inputValues: Record<string, any>;
  onInputChange: (key: string, value: any) => void;
  onLoadSample: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onReset: () => void;
  isRunning: boolean;
  isPaused: boolean;
  executionRecord: ExecutionRecord | null;
}

export const CockpitControls: React.FC<CockpitControlsProps> = ({
  project,
  inputValues,
  onInputChange,
  onLoadSample,
  onStart,
  onPause,
  onResume,
  onCancel,
  onReset,
  isRunning,
  isPaused,
  executionRecord,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyOutput = () => {
    if (!executionRecord?.finalOutput) return;
    navigator.clipboard.writeText(executionRecord.finalOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadOutput = () => {
    if (!executionRecord?.finalOutput) return;
    const blob = new Blob([executionRecord.finalOutput], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}-执行成果-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Office User Input Panel */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="font-semibold text-slate-100 text-sm flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>任务输入与业务参数设置</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              无需编写代码，只需在此填入或粘贴日常办公素材
            </p>
          </div>
          <button
            onClick={onLoadSample}
            disabled={isRunning}
            className="text-xs text-indigo-300 hover:text-indigo-200 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>载入示例办公数据</span>
          </button>
        </div>

        {/* Dynamic Form Fields */}
        <div className="space-y-4">
          {project.inputSchema.map((field) => {
            const val = inputValues[field.key];

            if (field.type === 'textarea') {
              return (
                <div key={field.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      {field.label} {field.required && <span className="text-rose-400">*</span>}
                    </label>
                    {field.description && (
                      <span className="text-[11px] text-slate-400">{field.description}</span>
                    )}
                  </div>
                  <textarea
                    rows={5}
                    value={val !== undefined ? String(val) : ''}
                    onChange={(e) => onInputChange(field.key, e.target.value)}
                    disabled={isRunning}
                    placeholder={field.placeholder}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-sans leading-relaxed disabled:opacity-60 placeholder:text-slate-600 resize-y"
                  />
                </div>
              );
            }

            if (field.type === 'select') {
              return (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {field.label} {field.required && <span className="text-rose-400">*</span>}
                  </label>
                  <select
                    value={val !== undefined ? String(val) : ''}
                    onChange={(e) => onInputChange(field.key, e.target.value)}
                    disabled={isRunning}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-60"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (field.type === 'checkbox') {
              return (
                <div key={field.key} className="bg-slate-850/60 border border-slate-800/80 rounded-xl p-3.5 flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id={`field-${field.key}`}
                    checked={Boolean(val)}
                    onChange={(e) => onInputChange(field.key, e.target.checked)}
                    disabled={isRunning}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                  <div className="flex-1">
                    <label 
                      htmlFor={`field-${field.key}`}
                      className="text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer"
                    >
                      {field.label}
                    </label>
                    {field.description && (
                      <p className="text-xs text-slate-400 mt-1">
                        {field.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            }

            // Default text input
            return (
              <div key={field.key} className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {field.label} {field.required && <span className="text-rose-400">*</span>}
                </label>
                <input
                  type="text"
                  value={val !== undefined ? String(val) : ''}
                  onChange={(e) => onInputChange(field.key, e.target.value)}
                  disabled={isRunning}
                  placeholder={field.placeholder}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-60 placeholder:text-slate-600"
                />
              </div>
            );
          })}
        </div>

        {/* Action Buttons Row */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {!isRunning ? (
              <button
                onClick={onStart}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all transform active:scale-98 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>一键启动任务</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                {!isPaused ? (
                  <button
                    onClick={onPause}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-medium rounded-xl flex items-center space-x-1.5 transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    <span>暂停</span>
                  </button>
                ) : (
                  <button
                    onClick={onResume}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium rounded-xl flex items-center space-x-1.5 transition-colors"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>继续</span>
                  </button>
                )}
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white text-xs sm:text-sm font-medium rounded-xl flex items-center space-x-1.5 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>终止</span>
                </button>
              </div>
            )}

            <button
              onClick={onReset}
              disabled={isRunning}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium rounded-xl flex items-center space-x-1.5 transition-colors disabled:opacity-40"
              title="重置当前运行状态"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置状态</span>
            </button>
          </div>

          {/* Quick info note */}
          <div className="text-[11px] text-slate-400 flex items-center space-x-1">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>智能跳过机制已开启，将自动根据条件省去不必要的二级子任务</span>
          </div>
        </div>
      </div>

      {/* 2. Output Inspection Card */}
      {executionRecord?.finalOutput && (
        <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-slate-100 text-sm">
                最终任务归档成果
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyOutput}
                className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已复制' : '复制全文'}</span>
              </button>
              <button
                onClick={handleDownloadOutput}
                className="text-xs text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出 .md 文件</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 sm:p-5 text-slate-200 text-xs sm:text-sm font-sans leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto selection:bg-indigo-600/40">
            {executionRecord.finalOutput}
          </div>
        </div>
      )}

    </div>
  );
};
