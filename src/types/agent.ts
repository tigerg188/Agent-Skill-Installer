/**
 * 通用智能项目底座 - 核心数据结构与协议定义
 */

export type StepStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed';

export type ConditionType = 'model_decision' | 'input_toggle' | 'data_rule';

export interface StepCondition {
  id: string;
  type: ConditionType;
  /** 条件描述，办公用户可见，例如：“若前一步评估未发现合规风险，则跳过二级合规审查” */
  label: string;
  /** 判断提示词（如果是模型自主判断） */
  decisionPrompt?: string;
  /** 默认判定：如果无法确定是否跳过时的行为 */
  defaultSkip?: boolean;
  /** 关联的输入字段名（如果是用户输入勾选触发） */
  inputFieldKey?: string;
}

export interface SkillTool {
  id: string;
  name: string;
  description: string;
  iconName: string;
  type: 'search' | 'document_parser' | 'data_calculator' | 'format_exporter' | 'compliance_checker';
}

export interface StepDefinition {
  id: string;
  name: string;
  description: string;
  /** 任务在整体流程中的阶段标识 */
  phase: string;
  /** 系统角色或人设 */
  systemInstruction?: string;
  /** 提示词模版，支持 {input}, {previous_step}, {step_1_output} 等插值占位符 */
  promptTemplate: string;
  /** 是否是二级子任务 */
  isSubtask?: boolean;
  /** 关联的父级主任务ID */
  parentStepId?: string;
  /** 前置依赖任务ID列表 */
  dependsOn?: string[];
  /** 触发与跳过条件 */
  condition?: StepCondition;
  /** 绑定的 Skill 工具 */
  tools?: string[];
  /** 推荐预估 Token 消耗（用于跳过时计算节约 Token） */
  estimatedTokenSaving?: number;
}

export interface ProjectInputField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  placeholder?: string;
  defaultValue?: string | boolean;
  options?: { label: string; value: string }[];
  required?: boolean;
  description?: string;
}

export interface AgentProject {
  id: string;
  name: string;
  description: string;
  category: 'office_doc' | 'market_research' | 'legal_compliance' | 'data_analysis' | 'content_creation' | 'custom';
  icon: string;
  author: string;
  version: string;
  isCustom?: boolean;
  inputSchema: ProjectInputField[];
  steps: StepDefinition[];
  sampleInputs?: Record<string, any>;
}

export interface StepExecutionResult {
  stepId: string;
  stepName: string;
  status: StepStatus;
  startedAt?: number;
  completedAt?: number;
  durationMs: number;
  inputPrompt?: string;
  outputContent?: string;
  skipReason?: string;
  tokens: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    savedTokens: number;
  };
  error?: string;
  toolsUsed?: string[];
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success' | 'skip';
  stepId?: string;
  stepName?: string;
  title: string;
  message: string;
  data?: any;
}

export interface ExecutionRecord {
  id: string;
  projectId: string;
  projectName: string;
  startedAt: number;
  completedAt?: number;
  totalDurationMs: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  inputValues: Record<string, any>;
  stepResults: Record<string, StepExecutionResult>;
  totalTokens: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    savedTokens: number;
  };
  logs: LogEntry[];
  finalOutput?: string;
}

export interface ChannelQuotaInfo {
  id: string;
  name: string;
  modelKey: string;
  dailyTokenLimit: number;
  dailyRpdLimit: number;
  usedTokens: number;
  usedRequests: number;
  status: 'normal' | 'warning' | 'exhausted';
  isCurrent?: boolean;
}

export interface QuotaStats {
  todayRequests: number;
  todayPromptTokens: number;
  todayOutputTokens: number;
  todayTotalTokens: number;
  todaySavedTokens: number;
  todayFailedRequests: number;
  estimatedFreeTierDailyLimit: number;
  dailyRpdLimit: number;
  avgResponseMs: number;
  lastUpdated: number;
  activeChannelId: string;
  channels: Record<string, ChannelQuotaInfo>;
}
