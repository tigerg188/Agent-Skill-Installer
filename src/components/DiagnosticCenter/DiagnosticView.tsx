import React, { useState } from 'react';
import { 
  Activity, 
  Search, 
  Trash2, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Sparkles, 
  Clock, 
  Copy, 
  Check, 
  Share2,
  FileSpreadsheet,
  Terminal
} from 'lucide-react';
import { LogEntry, ExecutionRecord, AgentProject } from '../../types/agent';

interface DiagnosticViewProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  currentProject: AgentProject;
  lastExecution: ExecutionRecord | null;
}

export const DiagnosticView: React.FC<DiagnosticViewProps> = ({
  logs,
  onClearLogs,
  currentProject,
  lastExecution,
}) => {
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'skip' | 'success' | 'info'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.title.toLowerCase().includes(q) ||
        log.message.toLowerCase().includes(q) ||
        (log.stepName && log.stepName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Generate standardized diagnostic bundle for developer inspection
  const generateDiagnosticBundle = (): string => {
    const errorLog = logs.find(l => l.level === 'error');
    const skippedLogs = logs.filter(l => l.level === 'skip');

    return `### 【通用智能项目底座 - 故障排查与运行诊断报告】
- **生成时间**: ${new Date().toISOString()}
- **项目名称**: ${currentProject.name} (ID: \`${currentProject.id}\`)
- **当前执行状态**: ${lastExecution?.status || '无运行记录'}
- **总耗时**: ${lastExecution ? (lastExecution.totalDurationMs / 1000).toFixed(2) + 's' : 'N/A'}
- **Token 消耗**: 总计 ${lastExecution?.totalTokens.totalTokens.toLocaleString() || 0} Tokens (智能跳过省去: ${lastExecution?.totalTokens.savedTokens.toLocaleString() || 0} Tokens)

#### 1. 核心异常定位 (Error Trace)
${
  errorLog
    ? `- **异常步骤**: ${errorLog.stepName || '全局调度器'} (\`${errorLog.stepId || 'unknown'}\`)
- **异常原因**: ${errorLog.message}
- **详细信息**: \`\`\`json\n${JSON.stringify(errorLog.data || {}, null, 2)}\n\`\`\``
    : '✅ 当前链路未捕获到阻塞性致命错误。'
}

#### 2. 条件跳过审计 (Condition Skip Audit)
${
  skippedLogs.length > 0
    ? skippedLogs.map(s => `- 步骤 [${s.stepName}]: ${s.message}`).join('\n')
    : '无跳过节点。'
}

#### 3. 最近 10 条执行流日志
\`\`\`text
${logs.slice(0, 10).map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] ${l.title} - ${l.message}`).join('\n')}
\`\`\`

---
*提示：用户已复制此诊断代码块，可直接粘贴给工程师查验原因。*`;
  };

  const handleCopyReport = () => {
    const report = generateDiagnosticBundle();
    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner with One-Click Diagnostic Export */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 rounded-2xl border border-indigo-900/40 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">
              飞行记录仪与全链路排障诊断中心
            </h2>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
              毫秒级溯源
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            记录每个节点的输入参数、模型调度耗时、条件跳过理由与底层通信状态。遇到任何疑问时，一键生成诊断报告，发给开发者即可秒级查验。
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/30 flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>一键生成排障报告</span>
          </button>
          <button
            onClick={onClearLogs}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-300 text-xs rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-colors"
            title="清空当前日志"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">清空日志</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { key: 'all', label: '全部事件' },
              { key: 'error', label: '异常/报错' },
              { key: 'skip', label: '条件跳过' },
              { key: 'success', label: '成功节点' },
              { key: 'info', label: '调度流' },
            ] as const
          ).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterLevel(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                filterLevel === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索节点名称或日志内容..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Logs Table / Stream */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Terminal className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-sm">暂无匹配的运行日志</p>
            <p className="text-xs text-slate-600 mt-1">在工作台执行任务后，系统将自动记录全流程流水</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-850 max-h-[600px] overflow-y-auto">
            {filteredLogs.map(log => {
              const timeStr = new Date(log.timestamp).toLocaleTimeString();

              return (
                <div 
                  key={log.id} 
                  className={`p-4 transition-colors ${
                    log.level === 'error' ? 'bg-rose-950/20 hover:bg-rose-950/30' :
                    log.level === 'skip' ? 'bg-purple-950/15 hover:bg-purple-950/25' :
                    log.level === 'success' ? 'bg-emerald-950/10 hover:bg-emerald-950/20' :
                    'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      
                      {/* Icon */}
                      <div className="mt-0.5">
                        {log.level === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                        {log.level === 'skip' && <Sparkles className="w-4 h-4 text-purple-400" />}
                        {log.level === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        {log.level === 'info' && <Info className="w-4 h-4 text-blue-400" />}
                        {log.level === 'warn' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                      </div>

                      {/* Content */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-slate-200">
                            {log.title}
                          </span>
                          {log.stepName && (
                            <span className="text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded">
                              {log.stepName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {log.message}
                        </p>

                        {/* Optional JSON payload */}
                        {log.data && (
                          <pre className="mt-2 text-[11px] font-mono bg-slate-950 p-2 rounded border border-slate-800/80 text-slate-400 overflow-x-auto max-w-2xl">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-500 whitespace-nowrap font-mono">
                      {timeStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Diagnostic Export */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">一键生成排障诊断报告</h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              遇到步骤异常或模型生成不符合预期时，点击下方按钮复制完整报告并直接发送给技术支持或开发者即可秒级溯源。
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-indigo-200/90 max-h-72 overflow-y-auto whitespace-pre-wrap">
              {generateDiagnosticBundle()}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                已自动脱敏，不包含敏感私钥
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  关闭
                </button>
                <button
                  onClick={handleCopyReport}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReport ? '已成功复制诊断代码块！' : '复制诊断代码块'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
