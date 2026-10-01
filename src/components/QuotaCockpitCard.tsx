import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  ChevronUp, 
  ChevronDown, 
  Zap, 
  Hourglass, 
  RotateCcw, 
  Sliders, 
  Check, 
  Sparkles,
  Info
} from 'lucide-react';
import { ChannelQuotaInfo, QuotaStats } from '../types/agent';
import { selectChannelApi, calibrateChannelApi } from '../services/api';

interface QuotaCockpitCardProps {
  stats: QuotaStats | null;
  onRefreshStats: () => void;
  onChannelChanged?: (channelId: string) => void;
}

export function getPstResetCountdown(): { hours: number; minutes: number; text: string } {
  const now = new Date();
  // Get time in US Pacific Time (America/Los_Angeles)
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour12: false,
      hour: 'numeric',
      minute: 'numeric',
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

    let remainingMinutes = (24 * 60) - (hour * 60 + minute);
    if (remainingMinutes <= 0) remainingMinutes += 24 * 60;

    const remHours = Math.floor(remainingMinutes / 60);
    const remMins = remainingMinutes % 60;
    return {
      hours: remHours,
      minutes: remMins,
      text: `${remHours}小时 ${remMins}分`,
    };
  } catch {
    return { hours: 21, minutes: 57, text: '21小时 57分' };
  }
}

export const QuotaCockpitCard: React.FC<QuotaCockpitCardProps> = ({
  stats,
  onRefreshStats,
  onChannelChanged,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [countdown, setCountdown] = useState(getPstResetCountdown());
  const [showCalibrateModal, setShowCalibrateModal] = useState(false);
  const [calibratingChannelId, setCalibratingChannelId] = useState<string>('flash-latest');
  const [calibTokens, setCalibTokens] = useState<number>(0);
  const [calibRequests, setCalibRequests] = useState<number>(0);

  // Update countdown every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getPstResetCountdown());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const activeChannelId = stats?.activeChannelId || 'flash-latest';
  const defaultChannels: Record<string, ChannelQuotaInfo> = {
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
      dailyTokenLimit: 1000000,
      dailyRpdLimit: 1500,
      usedTokens: 0,
      usedRequests: 0,
      status: 'normal',
    },
  };

  const channels = stats?.channels || defaultChannels;
  const currentChannel = channels[activeChannelId] || channels['flash-latest'] || defaultChannels['flash-latest'];

  const usedTokens = currentChannel.usedTokens || 0;
  const tokenLimit = currentChannel.dailyTokenLimit || 4000000;
  const tokenUsagePct = Math.min(100, Math.round((usedTokens / tokenLimit) * 10000) / 100);
  const tokenRemainPct = Math.max(0, Math.round((100 - tokenUsagePct) * 10) / 10);

  const totalUsedRequests = stats?.todayRequests || 0;
  const totalRpdLimit = stats?.dailyRpdLimit || 1500;
  const rpdUsagePct = Math.min(100, Math.round((totalUsedRequests / totalRpdLimit) * 1000) / 10);

  const handleSelectChannel = async (channelId: string) => {
    try {
      await selectChannelApi(channelId);
      if (onChannelChanged) onChannelChanged(channelId);
      onRefreshStats();
    } catch (e) {
      console.error('Failed to select channel:', e);
    }
  };

  const handleOpenCalibrate = (channelId: string) => {
    setCalibratingChannelId(channelId);
    const ch = channels[channelId];
    setCalibTokens(ch?.usedTokens || 0);
    setCalibRequests(ch?.usedRequests || 0);
    setShowCalibrateModal(true);
  };

  const handleSaveCalibrate = async () => {
    try {
      await calibrateChannelApi(calibratingChannelId, calibTokens, calibRequests);
      setShowCalibrateModal(false);
      onRefreshStats();
    } catch (e) {
      console.error('Failed to calibrate:', e);
    }
  };

  const overallTokens = stats?.todayTotalTokens || 0;
  const overallTokenLimit = 4000000;
  const overallTokenPct = Math.min(100, Math.round((overallTokens / overallTokenLimit) * 100));

  return (
    <div className="bg-[#0b1329] border border-[#1b2644] rounded-2xl p-5 text-slate-100 shadow-2xl relative overflow-hidden backdrop-blur-md">
      
      {/* 1. Header Bar matching screenshot */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#1b2644]/70">
        
        {/* Left: Icon, Title & Tokens Summary */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#14203d] border border-[#233560] flex items-center justify-center p-2 shadow-inner">
            <div className="flex items-end space-x-0.5 h-5">
              <div className="w-1 h-3 bg-red-400 rounded-xs" />
              <div className="w-1 h-5 bg-emerald-400 rounded-xs" />
              <div className="w-1 h-4 bg-blue-400 rounded-xs" />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-base text-white tracking-wide">
                配额与频次看板
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-600/50">
                正常通畅
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1 font-mono">
              <span>Tokens:</span>
              <strong className="text-white">{(overallTokens / 1000000).toFixed(2)}M</strong>
              <span>/ 4.00M ({overallTokenPct}%)</span>
              <span className="text-slate-600 mx-1">|</span>
              <span>调用:</span>
              <strong className="text-white">{totalUsedRequests}次</strong>
              <span>/ {totalRpdLimit}</span>
            </div>
          </div>
        </div>

        {/* Right: Countdown Hourglass Box + Toggle button */}
        <div className="flex items-center space-x-2">
          <div className="bg-[#131d38] border border-[#233560] rounded-xl px-3 py-1.5 flex items-center space-x-1.5 text-xs text-indigo-200">
            <Hourglass className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <div className="flex flex-col text-left leading-tight">
              <span className="font-mono font-semibold text-slate-100">{countdown.hours}小时</span>
              <span className="text-[10px] text-slate-400">{countdown.minutes}分</span>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? '收起看板' : '展开看板'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2647] transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* 2. Expanded Body */}
      {isExpanded && (
        <div className="space-y-4 pt-4">
          
          {/* Section: Current Channel */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400 font-medium">当前通道:</span>
                <select
                  value={activeChannelId}
                  onChange={(e) => handleSelectChannel(e.target.value)}
                  aria-label="选择模型通道"
                  className="bg-[#111a36] text-blue-400 font-semibold border border-[#203058] rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {Object.values(channels).map(ch => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} ({ch.dailyTokenLimit >= 4000000 ? '4.00M大额度' : '旗舰精算'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-emerald-400 font-semibold text-xs">
                Token 剩余 <span className="font-mono">{tokenRemainPct}%</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#101830] rounded-full h-2.5 border border-[#1d2a4d] overflow-hidden p-0.5">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(1, tokenUsagePct)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Token 消耗: <strong className="text-slate-200">{usedTokens.toLocaleString()}</strong></span>
              <span>日上限: <strong className="text-slate-200">{tokenLimit.toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Section: RPD Frequency Monitor Card */}
          <div className="bg-[#0f1730] border border-[#1e2c50] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 text-blue-300 font-medium">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold">API 调用频次 (RPD 监控):</span>
              </div>
              <div className="text-xs font-mono text-slate-300">
                今日累计 <strong className="text-cyan-300">{totalUsedRequests}</strong> / {totalRpdLimit} 次 ({rpdUsagePct}%)
              </div>
            </div>

            {/* RPD Progress Bar */}
            <div className="w-full bg-[#0b1124] rounded-full h-2 border border-[#192544] overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(1, rpdUsagePct)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-400">
                当前模型: <strong className="text-slate-200 font-mono">{currentChannel.usedRequests} 次调用</strong>
              </span>
              <span className="text-emerald-400 font-medium flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>智能跳过节省 ~50% 调用</span>
              </span>
            </div>
          </div>

          {/* Section: Channel Quota Buckets Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">
                各通道独立配额状态 (分桶隔离):
              </span>
              <button
                onClick={() => handleOpenCalibrate(activeChannelId)}
                className="text-indigo-400 hover:text-indigo-300 transition-colors text-[11px] underline underline-offset-2 flex items-center space-x-1 cursor-pointer"
              >
                <Sliders className="w-3 h-3" />
                <span>校准本模型用量</span>
              </button>
            </div>

            {/* 4 Cards Grid matching screenshot */}
            <div className="grid grid-cols-2 gap-2.5">
              {Object.values(channels).map((ch) => {
                const isCurrent = ch.id === activeChannelId;
                const isExhausted = ch.status === 'exhausted';
                const isWarning = ch.status === 'warning';

                return (
                  <div
                    key={ch.id}
                    onClick={() => handleSelectChannel(ch.id)}
                    className={`rounded-xl p-3 border transition-all cursor-pointer relative ${
                      isCurrent
                        ? 'bg-[#121c3b] border-blue-500/80 shadow-md shadow-blue-500/10'
                        : 'bg-[#0f1730]/80 border-[#1c2a4c] hover:border-[#2a3c6b] hover:bg-[#131d3d]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-100">
                        {ch.name}
                      </span>
                      {/* Status indicator dot */}
                      <span 
                        className={`w-2.5 h-2.5 rounded-full ${
                          isExhausted ? 'bg-rose-500' :
                          isWarning ? 'bg-amber-400' :
                          'bg-emerald-400'
                        }`}
                        title={isExhausted ? '已达上限' : isWarning ? '接近上限' : '正常'}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-slate-400">
                      <span>{ch.usedTokens.toLocaleString()} · {ch.usedRequests}次</span>
                      {isCurrent ? (
                        <span className="text-[10px] text-blue-400 font-bold bg-blue-950/80 border border-blue-800/60 px-1.5 py-0.2 rounded">
                          当前
                        </span>
                      ) : isExhausted ? (
                        <span className="text-[10px] text-rose-400 font-medium">
                          已达上限
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer: PST Reset Countdown */}
          <div className="pt-2 border-t border-[#1b2644]/70 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>重置周期: 每日 00:00 PST (美西)</span>
            <span className="text-indigo-300 font-semibold">约 {countdown.text} 后刷新</span>
          </div>

        </div>
      )}

      {/* Calibration Modal */}
      {showCalibrateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 text-slate-100">
          <div className="bg-[#0e1733] border border-[#203058] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#203058]">
              <h3 className="font-bold text-sm text-white">校准模型通道用量与 RPD</h3>
              <button 
                onClick={() => setShowCalibrateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">目标模型通道</label>
                <select
                  value={calibratingChannelId}
                  onChange={(e) => {
                    setCalibratingChannelId(e.target.value);
                    const ch = channels[e.target.value];
                    setCalibTokens(ch?.usedTokens || 0);
                    setCalibRequests(ch?.usedRequests || 0);
                  }}
                  className="w-full bg-[#0a1024] border border-[#203058] rounded-lg p-2 text-white"
                >
                  {Object.values(channels).map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">今日已消耗 Token 数</label>
                <input
                  type="number"
                  value={calibTokens}
                  onChange={e => setCalibTokens(Number(e.target.value))}
                  className="w-full bg-[#0a1024] border border-[#203058] rounded-lg p-2 font-mono text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">今日已调用次数 (RPD)</label>
                <input
                  type="number"
                  value={calibRequests}
                  onChange={e => setCalibRequests(Number(e.target.value))}
                  className="w-full bg-[#0a1024] border border-[#203058] rounded-lg p-2 font-mono text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setCalibTokens(0);
                  setCalibRequests(0);
                }}
                className="text-[11px] text-amber-400 hover:underline flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>清零当前通道</span>
              </button>
              
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCalibrateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveCalibrate}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow"
                >
                  保存校准
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
