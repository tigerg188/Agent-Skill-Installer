import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  CornerDownRight, 
  Sparkles, 
  Save, 
  HelpCircle,
  Layers,
  Settings2
} from 'lucide-react';
import { AgentProject, StepDefinition, StepCondition } from '../../types/agent';

interface ProjectEditorModalProps {
  initialProject?: AgentProject | null;
  onSave: (project: AgentProject) => void;
  onClose: () => void;
}

export const ProjectEditorModal: React.FC<ProjectEditorModalProps> = ({
  initialProject,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(initialProject?.name || '新自定义 Agent 工作流');
  const [description, setDescription] = useState(initialProject?.description || '为办公用户定制的多步骤智能流程');
  const [category, setCategory] = useState<AgentProject['category']>(initialProject?.category || 'custom');
  const [steps, setSteps] = useState<StepDefinition[]>(
    initialProject?.steps.length ? JSON.parse(JSON.stringify(initialProject.steps)) : [
      {
        id: 'step-1',
        name: '基础信息解析与需求拆解',
        phase: '阶段一：信息抽取',
        description: '梳理用户输入的重点内容与业务诉求',
        promptTemplate: '请分析以下用户输入信息：\n{input}\n\n请提取核心事实要点：',
        estimatedTokenSaving: 0
      },
      {
        id: 'subtask-1',
        name: '二级子任务：专项深度挖掘 (按需跳过)',
        phase: '阶段二：专项深化',
        isSubtask: true,
        parentStepId: 'step-1',
        description: '仅在满足特定条件时触发，其余情况自动跳过以节约 Token',
        condition: {
          id: 'cond-subtask-1',
          type: 'model_decision',
          label: '当上一环节分析认为内容复杂且需要深度复核时触发，否则跳过',
          decisionPrompt: '请研判上一步分析结果是否足够完整，若已足够清晰则可跳过本次深度复核。',
          defaultSkip: true
        },
        promptTemplate: '基于前序基础信息：\n{step-1}\n\n请进行高阶专项深化分析并提供修改意见：',
        estimatedTokenSaving: 1500
      },
      {
        id: 'step-summary',
        name: '汇总成最终交付报告',
        phase: '阶段三：交付归档',
        description: '综合前序所有步骤输出，生成标准办公成果',
        promptTemplate: '请汇总前序各阶段的分析结论：\n{step-1}\n\n生成一份正式的办公总结报告。',
        estimatedTokenSaving: 0
      }
    ]
  );

  const handleAddStep = (isSubtask = false) => {
    const newId = `step-${Date.now().toString(36)}`;
    const newStep: StepDefinition = {
      id: newId,
      name: isSubtask ? '新二级子任务' : '新主干步骤',
      phase: isSubtask ? '阶段二：专项深化' : '阶段一：流程节点',
      description: isSubtask ? '二级子任务，支持条件跳过' : '核心流程步骤',
      isSubtask,
      parentStepId: isSubtask && steps.length > 0 ? steps[0].id : undefined,
      promptTemplate: '请根据以下内容执行处理：\n{input}',
      condition: isSubtask ? {
        id: `cond-${newId}`,
        type: 'model_decision',
        label: '根据前序结果模型智能判定是否执行',
        decisionPrompt: '若前序内容满足标准则跳过',
        defaultSkip: true
      } : undefined,
      estimatedTokenSaving: isSubtask ? 1200 : 0
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      alert('工作流至少需要保留一个节点！');
      return;
    }
    const updated = steps.filter((_, i) => i !== index);
    setSteps(updated);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    const updated = [...steps];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSteps(updated);
  };

  const handleStepChange = (index: number, field: keyof StepDefinition, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const handleConditionChange = (index: number, field: keyof StepCondition, value: any) => {
    const updated = [...steps];
    const currentCond = updated[index].condition || {
      id: `cond-${updated[index].id}`,
      type: 'model_decision',
      label: '判定规则',
    };
    updated[index].condition = { ...currentCond, [field]: value };
    setSteps(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('请输入 Agent 项目名称');
      return;
    }

    const projectToSave: AgentProject = {
      id: initialProject?.id || `custom-agent-${Date.now()}`,
      name,
      description,
      category,
      icon: initialProject?.icon || 'Bot',
      author: '用户自定义',
      version: '1.0.0',
      isCustom: true,
      inputSchema: initialProject?.inputSchema || [
        {
          key: 'input',
          label: '输入内容或资料文档',
          type: 'textarea',
          required: true,
          placeholder: '在此输入办公素材或分析材料...',
          defaultValue: '请在此输入测试材料文本...'
        }
      ],
      steps,
    };

    onSave(projectToSave);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full text-slate-100 shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings2 className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">
              {initialProject ? `二次修改项目: ${initialProject.name}` : '创建自定义 Agent 工作流'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Agent 项目名称 <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="例如：公司周报汇总 Agent"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                项目业务分类
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="office_doc">办公文档与公文处理</option>
                <option value="legal_compliance">法务合规与合同审查</option>
                <option value="market_research">行业调研与竞品分析</option>
                <option value="content_creation">内容营销与分发矩阵</option>
                <option value="data_analysis">数据提取与分析报告</option>
                <option value="custom">通用自定义</option>
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                项目描述 (办公人员可见的说明)
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="简述该 Agent 的主要功能与解决的办公痛点..."
              />
            </div>
          </div>

          {/* Steps Orchestrator Section */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm text-slate-200 flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>步进式任务链路与二级子任务编排</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  可自由增减步骤、拖拽调整顺序，或为子任务配置智能条件跳过规则
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleAddStep(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-700 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加主任务</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddStep(true)}
                  className="px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/60 text-xs font-medium text-indigo-300 rounded-lg border border-indigo-800/60 flex items-center space-x-1"
                >
                  <CornerDownRight className="w-3.5 h-3.5" />
                  <span>添加二级子任务</span>
                </button>
              </div>
            </div>

            {/* Steps List */}
            <div className="space-y-4 mt-3">
              {steps.map((step, idx) => (
                <div 
                  key={step.id} 
                  className={`bg-slate-950/80 border rounded-xl p-4 space-y-3 transition-colors ${
                    step.isSubtask ? 'ml-6 sm:ml-8 border-indigo-800/60 bg-indigo-950/10' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      {step.isSubtask && (
                        <span className="text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded flex items-center space-x-1">
                          <CornerDownRight className="w-3 h-3" />
                          <span>二级子任务</span>
                        </span>
                      )}
                      <input
                        type="text"
                        value={step.name}
                        onChange={e => handleStepChange(idx, 'name', e.target.value)}
                        className="bg-transparent font-semibold text-xs sm:text-sm text-slate-100 border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none px-1 py-0.5 w-60 sm:w-80"
                        placeholder="步骤名称..."
                      />
                    </div>

                    <div className="flex items-center space-x-1 text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleMoveStep(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 hover:text-white disabled:opacity-30"
                        title="上移"
                      >
                        <MoveUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStep(idx, 'down')}
                        disabled={idx === steps.length - 1}
                        className="p-1 hover:text-white disabled:opacity-30"
                        title="下移"
                      >
                        <MoveDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="p-1 hover:text-rose-400"
                        title="删除该节点"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Step Description & Phase */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={step.phase}
                      onChange={e => handleStepChange(idx, 'phase', e.target.value)}
                      placeholder="阶段标识 (例如: 阶段一：初筛)"
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={step.description}
                      onChange={e => handleStepChange(idx, 'description', e.target.value)}
                      placeholder="步骤职责说明"
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Condition Settings (for Subtasks) */}
                  {step.isSubtask && (
                    <div className="bg-slate-900/90 border border-amber-900/30 rounded-xl p-3 space-y-2 text-xs">
                      <div className="flex items-center space-x-1.5 text-amber-300 font-semibold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>智能条件判断与跳过规则 (满足则免除调用，节约 Token)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">判断机制类型</label>
                          <select
                            value={step.condition?.type || 'model_decision'}
                            onChange={e => handleConditionChange(idx, 'type', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200"
                          >
                            <option value="model_decision">大模型动态研判 (根据前序内容)</option>
                            <option value="input_toggle">用户输入复选框触发</option>
                            <option value="data_rule">数据分类规则</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">跳过时预估省去 Token</label>
                          <input
                            type="number"
                            value={step.estimatedTokenSaving || 1200}
                            onChange={e => handleStepChange(idx, 'estimatedTokenSaving', Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">条件规则描述 (展示给用户)</label>
                        <input
                          type="text"
                          value={step.condition?.label || ''}
                          onChange={e => handleConditionChange(idx, 'label', e.target.value)}
                          placeholder="例如：若前序初筛未发现高风险，则智能跳过二级违约专项审计"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                        />
                      </div>
                    </div>
                  )}

                  {/* Prompt Template */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>提示词模版 (Prompt Template)</span>
                      <span className="text-slate-500">可用插值变量: {'{input}'}, 前置步骤ID</span>
                    </div>
                    <textarea
                      rows={3}
                      value={step.promptTemplate}
                      onChange={e => handleStepChange(idx, 'promptTemplate', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-indigo-200/90 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                      placeholder="编写送给模型的提示词..."
                    />
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              共配置 {steps.length} 个任务节点
            </span>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>保存并应用 Agent</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
