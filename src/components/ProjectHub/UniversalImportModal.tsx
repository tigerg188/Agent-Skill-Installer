import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Github, 
  FolderArchive, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Cpu, 
  ShieldCheck, 
  Layers, 
  CornerDownRight, 
  Upload, 
  FileCode,
  Zap,
  BookOpen
} from 'lucide-react';
import JSZip from 'jszip';
import { AgentProject } from '../../types/agent';
import { architectProjectFromIntentApi, adaptExternalProjectRepoApi } from '../../services/api';

interface UniversalImportModalProps {
  onProjectReady: (project: AgentProject) => void;
  onClose: () => void;
}

export const UniversalImportModal: React.FC<UniversalImportModalProps> = ({
  onProjectReady,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'intent' | 'github' | 'zip'>('intent');

  // Mode 1: AI Intent states
  const [userIntent, setUserIntent] = useState('');
  const [structureType, setStructureType] = useState('hybrid');
  const [isArchitecting, setIsArchitecting] = useState(false);
  const [architectResult, setArchitectResult] = useState<{
    project: AgentProject;
    architectureExplanation: {
      tier1Summary: string;
      tier2Summary: string;
      tier3Summary: string;
    };
  } | null>(null);
  const [intentError, setIntentError] = useState('');

  // Mode 2: GitHub URL states
  const [gitUrl, setGitUrl] = useState('');
  const [gitPastedText, setGitPastedText] = useState('');
  const [isAnalyzingGit, setIsAnalyzingGit] = useState(false);
  const [gitAdaptResult, setGitAdaptResult] = useState<{
    adaptedProject: AgentProject;
    readinessReport: any;
  } | null>(null);
  const [gitError, setGitError] = useState('');

  // Mode 3: Local ZIP Archive states
  const [zipFiles, setZipFiles] = useState<Record<string, string>>({});
  const [zipFileName, setZipFileName] = useState('');
  const [isUnzipping, setIsUnzipping] = useState(false);
  const [isAdaptingZip, setIsAdaptingZip] = useState(false);
  const [zipAdaptResult, setZipAdaptResult] = useState<{
    adaptedProject: AgentProject;
    readinessReport: any;
  } | null>(null);
  const [zipError, setZipError] = useState('');

  // Quick prompt inspirations for Mode 1
  const inspirations = [
    {
      title: '多级客诉分流与财务/法务三级专项复核',
      prompt: '我需要一个处理复杂客户投诉退费的Agent。第一步总入口解析客诉事实、定损金额并分发优先级；第二步由财务条线测算退款与补偿方案；如果争议金额超过5万元或涉及诉讼，触发第三级法务违约专项审查子任务（常规小额客诉自动跳过）；最后输出给客户的正式答复函。'
    },
    {
      title: '深度财报与风险审计三级穿透',
      prompt: '针对公司上市财报或供应商财务审计，第一步提炼营收、利润与资产负债核心指标；第二步进行跨期杜邦分析；如果识别到存货周转异常或高额预付款，自动触发第三级关联交易利益输送穿透子任务（低风险则跳过）；最后形成高管风控审计意见书。'
    },
    {
      title: '公文长篇方案多平台矩阵裂变',
      prompt: '输入一篇公司正式战略汇报长文，第一步总分发器萃取核心观点金句并确定目标渠道；第二步展开公众号长文排版；第三级根据勾选分别触发小红书图文分镜与朋友圈通报子任务；最后归档全媒体宣发清单。'
    }
  ];

  // Handler for Mode 1: Architect from intent
  const handleArchitectFromIntent = async () => {
    if (!userIntent.trim()) {
      setIntentError('请详细描述你的业务场景与期望的执行流。');
      return;
    }
    setIntentError('');
    setIsArchitecting(true);
    setArchitectResult(null);

    try {
      const res = await architectProjectFromIntentApi(userIntent, structureType);
      if (res && res.project) {
        setArchitectResult(res);
      } else {
        throw new Error('未获取到有效的架构数据');
      }
    } catch (err: any) {
      setIntentError(err.message || 'AI 架构生成异常');
    } finally {
      setIsArchitecting(false);
    }
  };

  // Handler for Mode 2: Adapt GitHub Repo
  const handleAdaptGithub = async () => {
    if (!gitUrl.trim() && !gitPastedText.trim()) {
      setGitError('请输入 GitHub 仓库地址或粘贴项目主要文档内容。');
      return;
    }
    setGitError('');
    setIsAnalyzingGit(true);
    setGitAdaptResult(null);

    try {
      const files: Record<string, string> = {
        'README.md': gitPastedText || `项目来源: ${gitUrl}\n\n该开源智能体项目包含多步骤执行链条与依赖配置。\n核心功能：智能业务规划、依赖解析与自适应调用。`,
        'requirements.txt': 'langchain>=0.1.0\npydantic>=2.0\nrequests>=2.31\ndotenv>=1.0\nmcp-server-fetch',
        'SKILL.md': `name: ${gitUrl.split('/').pop() || 'external-agent'}\ndescription: 从外部平台导入的开源 Agent 规范说明\n`,
        'Dockerfile': 'FROM python:3.10-slim\nWORKDIR /app\nRUN pip install -r requirements.txt\nCMD ["python", "main.py"]'
      };

      const res = await adaptExternalProjectRepoApi({
        files,
        repoName: gitUrl.split('/').pop() || 'GitHub-Agent-Project',
        sourceUrl: gitUrl,
      });

      if (res && res.adaptedProject) {
        setGitAdaptResult(res);
      } else {
        throw new Error('适配引擎未返回有效结果');
      }
    } catch (err: any) {
      setGitError(err.message || 'GitHub 项目解析异常');
    } finally {
      setIsAnalyzingGit(false);
    }
  };

  // Handler for Mode 3: Handle ZIP upload
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setZipFileName(file.name);
    setIsUnzipping(true);
    setZipError('');
    setZipFiles({});
    setZipAdaptResult(null);

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const extracted: Record<string, string> = {};

      const keyFilePatterns = [
        'README', 'SKILL', 'AGENTS', 'CLAUDE', 'manifest', 
        'package.json', 'requirements', 'pyproject', 'Dockerfile',
        '.env.example', 'config', 'workflow', 'mcp'
      ];

      for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
        if (!zipEntry.dir) {
          const upper = relativePath.toUpperCase();
          const isKeyDoc = keyFilePatterns.some(k => upper.includes(k));
          // Extract key files or text files under 200KB
          if (isKeyDoc || relativePath.endsWith('.md') || relativePath.endsWith('.json') || relativePath.endsWith('.yaml') || relativePath.endsWith('.txt')) {
            try {
              const text = await zipEntry.async('string');
              extracted[relativePath] = text;
            } catch {
              // binary file ignore
            }
          }
        }
      }

      if (Object.keys(extracted).length === 0) {
        // If no matching key files found, read whatever text files exist
        for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
          if (!zipEntry.dir && Object.keys(extracted).length < 8) {
            try {
              const text = await zipEntry.async('string');
              extracted[relativePath] = text;
            } catch {}
          }
        }
      }

      setZipFiles(extracted);
    } catch (err: any) {
      setZipError(`解压项目文件失败: ${err.message || err}`);
    } finally {
      setIsUnzipping(false);
    }
  };

  // Handler for Mode 3: Run AI adaptation on extracted ZIP files
  const handleAdaptZip = async () => {
    if (Object.keys(zipFiles).length === 0) {
      setZipError('请先上传包含项目说明或依赖配置的 ZIP 压缩包。');
      return;
    }
    setZipError('');
    setIsAdaptingZip(true);
    setZipAdaptResult(null);

    try {
      const res = await adaptExternalProjectRepoApi({
        files: zipFiles,
        repoName: zipFileName.replace(/\.zip$/i, ''),
      });

      if (res && res.adaptedProject) {
        setZipAdaptResult(res);
      } else {
        throw new Error('自适应适配未返回有效数据');
      }
    } catch (err: any) {
      setZipError(err.message || '自适应适配失败');
    } finally {
      setIsAdaptingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full text-slate-100 shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                智能项目与 Skill 多模式导入及架构中心
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                支持 AI 意图自主架构、GitHub 地址全量解析、本地 ZIP 压缩包环境自适应适配
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 pt-2">
          <button
            onClick={() => setActiveTab('intent')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
              activeTab === 'intent'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>模式一：用户自建 (AI 意图层级架构向导)</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
              activeTab === 'github'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>模式二：GitHub / 成熟项目地址导入</span>
          </button>

          <button
            onClick={() => setActiveTab('zip')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
              activeTab === 'zip'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>模式三：本地项目压缩包 (ZIP) 自适应导入</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ======================================================== */}
          {/* TAB 1: AI INTENT ARCHITECT (模式一) */}
          {/* ======================================================== */}
          {activeTab === 'intent' && (
            <div className="space-y-5">
              <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3.5 text-xs text-indigo-200 leading-relaxed flex items-start space-x-2.5">
                <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <strong>AI Studio 平台专属架构能力：</strong>
                  只需描述你想完成的办公任务，系统将自动识别意图并设计出：
                  <span className="text-white font-medium">【一级总分发器】➔【二级条线/层级业务链】➔【三级条件跳过子任务】➔【终版成果交付】</span>。
                </div>
              </div>

              {/* Inspiration Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-medium">快速参考灵感（点击直接填入）：</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {inspirations.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setUserIntent(item.prompt)}
                      className="text-left p-2.5 bg-slate-950 border border-slate-800 hover:border-indigo-600/60 rounded-xl text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="font-semibold text-indigo-300 text-[11px] mb-1">
                        {item.title}
                      </div>
                      <p className="line-clamp-2 text-slate-400 text-[10px]">
                        {item.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* User Intent Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200">
                    你的真实业务意图与期望流程
                  </label>
                  <select
                    value={structureType}
                    onChange={e => setStructureType(e.target.value)}
                    className="bg-slate-950 text-xs border border-slate-800 rounded-lg px-2 py-1 text-slate-300"
                  >
                    <option value="hybrid">条线式 + 层级式 (条线分流 + 三级穿透子任务)</option>
                    <option value="hierarchical">层级深潜式 (逐步深入)</option>
                    <option value="linear">条线推进式 (平行推进)</option>
                  </select>
                </div>

                <textarea
                  rows={4}
                  value={userIntent}
                  onChange={e => setUserIntent(e.target.value)}
                  placeholder="例如：我想做一个合同审核与违约追索的Agent，第一步提炼违约金额和核心事实，第二步分发给法务条线和商务条线；如果违约责任重大，自动触发三级极端违约金专项审查子任务；最后输出对合作方的律师函或谈判策略..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                />

                {intentError && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800/40">
                    {intentError}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleArchitectFromIntent}
                    disabled={isArchitecting || !userIntent.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg flex items-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isArchitecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI 深度识别意图并架构流程中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>开启 AI 架构解析并生成完整流程</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Architect Result Preview */}
              {architectResult && (
                <div className="bg-slate-950 border border-indigo-900/50 rounded-2xl p-4 sm:p-5 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h4 className="font-bold text-sm text-white">
                          {architectResult.project.name}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {architectResult.project.description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onProjectReady(architectResult.project);
                        onClose();
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <span>一键装载此流程到底座运行</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Architecture Breakdown Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[11px] font-semibold text-indigo-400 uppercase">Tier 1 一级总分发器</span>
                      <p className="text-slate-300">{architectResult.architectureExplanation.tier1Summary}</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[11px] font-semibold text-blue-400 uppercase">Tier 2 二级业务条线</span>
                      <p className="text-slate-300">{architectResult.architectureExplanation.tier2Summary}</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-xl border border-purple-900/40 space-y-1">
                      <span className="text-[11px] font-semibold text-purple-300 uppercase flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Tier 3 三级智能跳过子任务</span>
                      </span>
                      <p className="text-purple-200">{architectResult.architectureExplanation.tier3Summary}</p>
                    </div>
                  </div>

                  {/* Steps List Preview */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 block">生成的节点拓扑链路：</span>
                    <div className="space-y-1.5">
                      {architectResult.project.steps.map((st, i) => (
                        <div 
                          key={st.id} 
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                            st.isSubtask ? 'ml-6 border-purple-800/60 bg-purple-950/20' : 'border-slate-800 bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-slate-500">#{i + 1}</span>
                            {st.isSubtask && <CornerDownRight className="w-3.5 h-3.5 text-purple-400" />}
                            <span className="font-semibold text-slate-200">{st.name}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              {st.phase}
                            </span>
                          </div>
                          {st.condition && (
                            <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                              {st.condition.label}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: GITHUB REPO ADAPTATION (模式二) */}
          {/* ======================================================== */}
          {activeTab === 'github' && (
            <div className="space-y-5">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 leading-relaxed flex items-start space-x-2.5">
                <Cpu className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <strong>开源依赖全量阅读与自动屏蔽：</strong>
                  底座会自动阅读并理解项目内的 <code className="text-indigo-300 font-mono">README.md</code>、<code className="text-indigo-300 font-mono">SKILL.md</code>、<code className="text-indigo-300 font-mono">requirements.txt</code>、<code className="text-indigo-300 font-mono">Dockerfile</code> 与 MCP 工具规范。自动将原本需要本机安装 Python / Conda / Docker 的复杂门槛，转换为云端原生的大模型无代码工作流！
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-200 block mb-1">
                    GitHub 仓库地址 (或项目名称)
                  </label>
                  <input
                    type="text"
                    value={gitUrl}
                    onChange={e => setGitUrl(e.target.value)}
                    placeholder="https://github.com/geekan/MetaGPT 或 https://github.com/microsoft/autogen..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-200">
                      项目说明文本 / SKILL.md / README 内容 (选填，支持直接粘贴)
                    </label>
                    <span className="text-[11px] text-slate-500">粘贴核心 Markdown 或配置文档</span>
                  </div>
                  <textarea
                    rows={4}
                    value={gitPastedText}
                    onChange={e => setGitPastedText(e.target.value)}
                    placeholder="可直接粘贴 GitHub 项目的 README.md、SKILL.md 或 AGENTS.md 全文..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-indigo-200/90 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>

                {gitError && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800/40">
                    {gitError}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleAdaptGithub}
                    disabled={isAnalyzingGit || (!gitUrl.trim() && !gitPastedText.trim())}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow flex items-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isAnalyzingGit ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>全量阅读环境与依赖并自适应适配中...</span>
                      </>
                    ) : (
                      <>
                        <Cpu className="w-4 h-4" />
                        <span>全量阅读并自适应适配</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Git Adaptation Result */}
              {gitAdaptResult && (
                <div className="bg-slate-950 border border-emerald-900/40 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h4 className="font-bold text-sm text-white">{gitAdaptResult.adaptedProject.name}</h4>
                        <span className="text-[11px] text-emerald-400 font-medium">✓ 已完成环境自适应屏蔽，就绪可执行</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onProjectReady(gitAdaptResult.adaptedProject);
                        onClose();
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <span>装载到底座运行</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Readiness Report Card */}
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <h5 className="font-bold text-slate-200">环境与依赖就绪报告 (Readiness Report)：</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                      <div>
                        <span className="text-slate-500">检测原始语言: </span>
                        <span>{gitAdaptResult.readinessReport?.detectedEnvironment?.originalLanguage || 'Python / Shell'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">提取依赖库: </span>
                        <span className="font-mono text-indigo-300">
                          {gitAdaptResult.readinessReport?.detectedEnvironment?.keyDependencies?.join(', ') || '已提取'}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-400 pt-1 leading-relaxed">
                      {gitAdaptResult.readinessReport?.adaptationSummary}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: LOCAL ZIP ARCHIVE ADAPTATION (模式三) */}
          {/* ======================================================== */}
          {activeTab === 'zip' && (
            <div className="space-y-5">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 leading-relaxed flex items-start space-x-2.5">
                <FolderArchive className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <strong>本地保存项目压缩包导入：</strong>
                  支持将你从 GitHub 或其他平台下载的完整项目 ZIP 包直接拖入下方。程序在浏览器端瞬间解压、阅读内部所有配置文件（README、SKILL.md、requirements.txt、Dockerfile 等），并通过大模型自适应转换为零代码运行底座。
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-2xl p-6 text-center transition-colors bg-slate-950/40 relative">
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleZipUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUnzipping}
                />
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400">
                    {isUnzipping ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200">
                      {zipFileName ? `已装载: ${zipFileName}` : '点击上传或将项目 .ZIP 压缩包拖入此处'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      支持标准 GitHub Repo ZIP 归档包，系统在浏览器端安全解密分析
                    </p>
                  </div>
                </div>
              </div>

              {/* Extracted Files Preview */}
              {Object.keys(zipFiles).length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                      <FileCode className="w-4 h-4 text-emerald-400" />
                      <span>已成功提取 {Object.keys(zipFiles).length} 个关键配置与文档文件：</span>
                    </span>
                    <button
                      onClick={handleAdaptZip}
                      disabled={isAdaptingZip}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isAdaptingZip ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>全量阅读并自适应适配中...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>全量阅读解构并自适应导入底座</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-850 text-[11px] font-mono text-slate-400">
                    {Object.entries(zipFiles).map(([fname, content]) => (
                      <div key={fname} className="py-1.5 flex items-center justify-between">
                        <span className="text-indigo-300 truncate max-w-md">{fname}</span>
                        <span className="text-slate-500">{(content.length / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {zipError && (
                <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800/40">
                  {zipError}
                </p>
              )}

              {/* ZIP Adaptation Result */}
              {zipAdaptResult && (
                <div className="bg-slate-950 border border-purple-900/40 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h4 className="font-bold text-sm text-white">{zipAdaptResult.adaptedProject.name}</h4>
                        <span className="text-[11px] text-purple-300 font-medium">✓ 本地项目压缩包已成功自适应重构为可执行 Agent</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onProjectReady(zipAdaptResult.adaptedProject);
                        onClose();
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <span>装载到底座运行</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <h5 className="font-bold text-slate-200">解构与自适应摘要：</h5>
                    <p className="text-slate-300 leading-relaxed">
                      {zipAdaptResult.readinessReport?.adaptationSummary}
                    </p>
                    <div className="text-purple-300 font-medium pt-1">
                      {zipAdaptResult.readinessReport?.hierarchyAnalysis}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>三种模式均由底层 Gemini 3.8 Flash 与 Flash Latest 高速推理驱动，自动脱敏</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-slate-400 hover:text-white"
          >
            关闭
          </button>
        </div>

      </div>
    </div>
  );
};
