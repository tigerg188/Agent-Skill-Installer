import React from 'react';
import { 
  Bot, 
  Workflow, 
  Layers, 
  BarChart3, 
  Activity, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  Hourglass
} from 'lucide-react';
import { AgentProject, QuotaStats } from '../types/agent';

interface NavbarProps {
  activeTab: 'cockpit' | 'projects' | 'analytics' | 'diagnostics';
  setActiveTab: (tab: 'cockpit' | 'projects' | 'analytics' | 'diagnostics') => void;
  projects: AgentProject[];
  currentProject: AgentProject;
  onSelectProject: (project: AgentProject) => void;
  stats: QuotaStats | null;
  serverStatus: { status: string; hasKey: boolean };
  onOpenHelp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  projects,
  currentProject,
  onSelectProject,
  stats,
  serverStatus,
  onOpenHelp,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & App Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">
                  通用智能项目底座
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  零代码平台
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                开源 Agent & Skill 可视化运行底座
              </p>
            </div>
          </div>

          {/* Project Quick Switcher */}
          <div className="hidden md:flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/60">
            <span className="text-xs text-slate-400 pl-2 pr-1 font-medium">当前 Agent:</span>
            <select
              value={currentProject.id}
              onChange={(e) => {
                const found = projects.find(p => p.id === e.target.value);
                if (found) onSelectProject(found);
              }}
              aria-label="选择当前 Agent 项目"
              className="bg-slate-900 text-xs text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[220px] truncate font-medium cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isCustom ? '★' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Main Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('cockpit')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'cockpit'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Workflow className="w-4 h-4" />
              <span>工作台</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'projects'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>项目工坊</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>计量看板</span>
            </button>

            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'diagnostics'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>排障日志</span>
            </button>
          </nav>

          {/* Right Status & Quota Quick Indicators */}
          <div className="flex items-center space-x-3">
            {/* Active Channel & Quota Pill matching user design */}
            <button
              onClick={() => setActiveTab('analytics')}
              className="hidden lg:flex items-center space-x-2 text-xs bg-[#101830] hover:bg-[#142040] border border-[#203058] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="点击查看配额与频次看板"
            >
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-blue-300">
                  {stats?.channels?.[stats?.activeChannelId || 'flash-latest']?.name || 'Flash Latest'}
                </span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400 flex items-center space-x-1 font-mono">
                <Hourglass className="w-3 h-3" />
                <span>21h 57m</span>
              </span>
            </button>

            {/* Token Quick Pill */}
            <div className="hidden xl:flex items-center space-x-2 text-xs bg-slate-800/90 border border-slate-700/80 px-2.5 py-1.5 rounded-lg">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">今日消耗:</span>
              <span className="font-semibold text-slate-100">
                {(stats?.todayTotalTokens ?? 0).toLocaleString()}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 flex items-center space-x-0.5">
                <Sparkles className="w-3 h-3" />
                <span>节约 {(stats?.todaySavedTokens ?? 0).toLocaleString()}</span>
              </span>
            </div>

            {/* Server Online Status Indicator */}
            <div 
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                serverStatus.hasKey
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                  : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
              }`}
              title={serverStatus.hasKey ? 'Gemini 3.8 Flash 已就绪' : '本地仿真模式 (免配置环境体验)'}
            >
              <span className={`w-2 h-2 rounded-full animate-pulse ${serverStatus.hasKey ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="hidden sm:inline">
                {serverStatus.hasKey ? 'Gemini 在线' : '仿真就绪'}
              </span>
            </div>

            {/* Help & Capability Guide Button */}
            <button
              onClick={onOpenHelp}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              title="查看能力边界与办公使用指南"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
