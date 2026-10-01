import React, { useState } from 'react';
import { 
  Plus, 
  Download, 
  Upload, 
  RotateCcw, 
  Copy, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  TrendingUp, 
  Share2, 
  Bot, 
  Layers, 
  ExternalLink,
  Sparkles,
  FileCode
} from 'lucide-react';
import { AgentProject } from '../../types/agent';
import { ProjectEditorModal } from './ProjectEditorModal';
import { UniversalImportModal } from './UniversalImportModal';

interface ProjectHubProps {
  projects: AgentProject[];
  currentProjectId: string;
  onSelectProject: (project: AgentProject) => void;
  onSaveProject: (project: AgentProject) => void;
  onDeleteProject: (projectId: string) => void;
  onResetDefaults: () => void;
}

export const ProjectHub: React.FC<ProjectHubProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
  onSaveProject,
  onDeleteProject,
  onResetDefaults,
}) => {
  const [editingProject, setEditingProject] = useState<AgentProject | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showUniversalModal, setShowUniversalModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');

  const handleCreateNew = () => {
    setEditingProject(null);
    setShowEditor(true);
  };

  const handleEditProject = (p: AgentProject) => {
    setEditingProject(p);
    setShowEditor(true);
  };

  const handleCloneProject = (p: AgentProject) => {
    const cloned: AgentProject = {
      ...JSON.parse(JSON.stringify(p)),
      id: `cloned-${Date.now().toString(36)}`,
      name: `${p.name} (克隆版)`,
      isCustom: true,
      author: '用户自定义',
    };
    onSaveProject(cloned);
  };

  const handleExportJson = (p: AgentProject) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(p, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${p.id}-agent-manifest.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportJson = () => {
    setImportError('');
    try {
      if (!importJsonText.trim()) {
        setImportError('请输入 JSON 文本或配置内容');
        return;
      }
      const parsed = JSON.parse(importJsonText);
      if (!parsed.name || !Array.isArray(parsed.steps)) {
        setImportError('JSON 格式不符合 Agent Manifest 规范：缺少 name 或 steps 字段。');
        return;
      }
      const newProject: AgentProject = {
        ...parsed,
        id: parsed.id || `imported-${Date.now()}`,
        isCustom: true,
        author: parsed.author || '导入配置',
      };
      onSaveProject(newProject);
      onSelectProject(newProject);
      setShowImportModal(false);
      setImportJsonText('');
    } catch (err: any) {
      setImportError(`JSON 解析失败: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Hub Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>智能项目工坊与 Skill 管理中心</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            自由挑选、克隆二次修改、或从网上直接导入开源 Agent 编排模版
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowUniversalModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI 意图架构 / 开源项目导入 (3种模式)</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>粘贴 JSON</span>
          </button>
          
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>手动表单建构</span>
          </button>

          <button
            onClick={onResetDefaults}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-850 hover:bg-slate-800 rounded-xl border border-slate-700/60"
            title="恢复官方默认预置模板"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((project) => {
          const isSelected = project.id === currentProjectId;
          const subtaskCount = project.steps.filter(s => s.isSubtask).length;

          return (
            <div
              key={project.id}
              className={`bg-slate-900/80 rounded-2xl border transition-all flex flex-col justify-between p-5 relative ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-600/10'
                  : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850/60'
              }`}
            >
              <div>
                {/* Header: Icon & Category */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
                      {project.category === 'legal_compliance' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                      {project.category === 'market_research' && <TrendingUp className="w-5 h-5 text-blue-400" />}
                      {project.category === 'content_creation' && <Share2 className="w-5 h-5 text-purple-400" />}
                      {project.category === 'custom' && <Bot className="w-5 h-5 text-amber-400" />}
                      {project.category === 'office_doc' && <Bot className="w-5 h-5 text-indigo-400" />}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 block">
                        {project.category}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {project.author} · v{project.version}
                      </span>
                    </div>
                  </div>

                  {project.isCustom && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                      自定义修改版
                    </span>
                  )}
                </div>

                {/* Project Title & Description */}
                <h3 className="font-bold text-slate-100 text-sm mb-1.5 leading-snug">
                  {project.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {project.description}
                </p>

                {/* Steps & Subtask pills */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className="text-[11px] bg-slate-800 text-slate-300 border border-slate-700/80 px-2 py-0.5 rounded-md">
                    {project.steps.length} 个任务节点
                  </span>
                  {subtaskCount > 0 && (
                    <span className="text-[11px] bg-purple-950/40 text-purple-300 border border-purple-800/40 px-2 py-0.5 rounded-md flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>含 {subtaskCount} 个二级跳过子任务</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleExportJson(project)}
                    className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                    title="导出为标准 JSON 配置文件"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCloneProject(project)}
                    className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                    title="克隆此 Agent"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditProject(project)}
                    className="p-1.5 text-slate-400 hover:text-indigo-300 rounded hover:bg-slate-800"
                    title="可视化二次修改步骤与提示词"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {project.isCustom && (
                    <button
                      onClick={() => onDeleteProject(project.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                      title="删除此自定义项目"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => onSelectProject(project)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600/80 hover:bg-indigo-600 text-white'
                  }`}
                >
                  {isSelected ? '当前正在使用' : '载入工作台'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Project Editor */}
      {showEditor && (
        <ProjectEditorModal
          initialProject={editingProject}
          onSave={(p) => {
            onSaveProject(p);
            setShowEditor(false);
          }}
          onClose={() => setShowEditor(false)}
        />
      )}

      {/* Modal: Import JSON */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">导入开源 Agent 项目配置 (JSON)</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              将网上的开源项目描述或导出的 <code className="text-indigo-300 font-mono">Agent-Manifest JSON</code> 粘贴在下方，底座将自动解析出任务步骤、二级子任务及条件规则。
            </p>

            <textarea
              rows={8}
              value={importJsonText}
              onChange={e => setImportJsonText(e.target.value)}
              placeholder="在此粘贴包含 name, steps 数组的 JSON 配置..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-indigo-200/90 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />

            {importError && (
              <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800/40">
                {importError}
              </p>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                取消
              </button>
              <button
                onClick={handleImportJson}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow transition-colors cursor-pointer"
              >
                解析并导入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Universal 3-Mode Import & Architect */}
      {showUniversalModal && (
        <UniversalImportModal
          onProjectReady={(proj) => {
            onSaveProject(proj);
            onSelectProject(proj);
            setShowUniversalModal(false);
          }}
          onClose={() => setShowUniversalModal(false)}
        />
      )}

    </div>
  );
};
