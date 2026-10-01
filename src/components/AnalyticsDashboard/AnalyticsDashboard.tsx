import React from 'react';
import { 
  Zap, 
  BarChart3, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  ShieldCheck, 
  RefreshCw, 
  Layers 
} from 'lucide-react';
import { ExecutionRecord, QuotaStats } from '../../types/agent';
import { QuotaCockpitCard } from '../QuotaCockpitCard';

interface AnalyticsDashboardProps {
  stats: QuotaStats | null;
  history: ExecutionRecord[];
  onRefreshStats: () => void;
  onLoadHistoryRecord: (record: ExecutionRecord) => void;
  onChannelChanged?: (channelId: string) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  stats,
  history,
  onRefreshStats,
  onLoadHistoryRecord,
  onChannelChanged,
}) => {
  const dailyLimit = stats?.estimatedFreeTierDailyLimit || 4000000;
  const usedTokens = stats?.todayTotalTokens || 0;
  const usagePercentage = Math.min(100, Math.round((usedTokens / dailyLimit) * 10000) / 100);
  const savedTokens = stats?.todaySavedTokens || 0;

  return (
    <div className="space-y-6">
      
      {/* 1. Dedicated Multi-channel Quota & RPD Cockpit Card (from user design) */}
      <QuotaCockpitCard 
        stats={stats} 
        onRefreshStats={onRefreshStats} 
        onChannelChanged={onChannelChanged}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>全量综合计量大盘 (Analytics Overview)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            实时汇总所有模型通道的总 Token 消耗、节省比率及历史任务明细
          </p>
        </div>
        <button
          onClick={onRefreshStats}
          className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 self-start sm:self-center transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>刷新数据</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Today's Total Tokens */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>今日消耗 Tokens</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {usedTokens.toLocaleString()}
          </div>
          <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-400">
            <span>输入: {(stats?.todayPromptTokens || 0).toLocaleString()}</span>
            <span>·</span>
            <span>输出: {(stats?.todayOutputTokens || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Card 2: Saved Tokens (Anti-waste) */}
        <div className="bg-slate-900/70 border border-purple-900/40 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>智能跳过节省 Tokens</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-300 mt-2">
            +{savedTokens.toLocaleString()}
          </div>
          <div className="text-[11px] text-purple-300/80 mt-2">
            ⚡ 避免无意义的二级子任务调用
          </div>
        </div>

        {/* Card 3: Today's Requests */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>今日调用次数</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {stats?.todayRequests || 0} 次
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>成功率 {stats?.todayRequests ? Math.round(((stats.todayRequests - stats.todayFailedRequests) / stats.todayRequests) * 100) : 100}%</span>
          </div>
        </div>

        {/* Card 4: Avg Response Time */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>平均响应延迟</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {stats?.avgResponseMs ? `${(stats.avgResponseMs / 1000).toFixed(2)}s` : '0.82s'}
          </div>
          <div className="text-[11px] text-emerald-400 mt-2">
            Gemini 3.8 Flash 极速引擎
          </div>
        </div>

      </div>

      {/* Free Tier Health Meter Card */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              当日免费额度健康指示条 (Daily Free Tier Health)
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            额度充裕 · 正常
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-slate-950 rounded-full h-3.5 border border-slate-800 overflow-hidden p-0.5">
            <div 
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(1, usagePercentage)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              已使用: <strong className="text-slate-200">{usedTokens.toLocaleString()}</strong> Tokens ({usagePercentage}%)
            </span>
            <span>
              基准配额: <strong className="text-slate-200">{dailyLimit.toLocaleString()}</strong> Tokens / 天
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 leading-relaxed">
          💡 <strong>办公用户省心建议：</strong>本底座默认搭载 Google Gemini 3.8 Flash 模型，每日具备海量免费配额。平台内的“二级子任务智能跳过机制”会自动识别不需要执行的非核心步骤，确保全天稳定顺畅，不会因单次过量调用而耗尽配额。
        </div>
      </div>

      {/* Recent Execution Records Table */}
      <div className="bg-slate-900/70 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              历史任务运行记录 (最近 {history.length} 次)
            </h3>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            暂无历史任务执行记录，前往工作台点击“一键启动任务”即可生成。
          </div>
        ) : (
          <div className="divide-y divide-slate-850">
            {history.map((record) => (
              <div 
                key={record.id} 
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-850/40 transition-colors"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-200">
                      {record.projectName}
                    </span>
                    <span 
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        record.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                        record.status === 'failed' ? 'bg-rose-500/20 text-rose-300' :
                        'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {record.status === 'completed' ? '成功完成' : record.status === 'failed' ? '发生异常' : '已取消'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-3">
                    <span>{new Date(record.startedAt).toLocaleString()}</span>
                    <span>·</span>
                    <span>耗时: {(record.totalDurationMs / 1000).toFixed(2)}s</span>
                    <span>·</span>
                    <span>消耗: {record.totalTokens.totalTokens.toLocaleString()} Tokens</span>
                    {record.totalTokens.savedTokens > 0 && (
                      <span className="text-purple-300">
                        (省 ~{record.totalTokens.savedTokens.toLocaleString()} Tokens)
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onLoadHistoryRecord(record)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-white border border-slate-700 rounded-lg text-xs font-medium transition-colors self-start sm:self-center"
                >
                  查看成果与链路
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
