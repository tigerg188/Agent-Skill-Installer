import { AgentProject, ExecutionRecord, LogEntry, StepDefinition, StepExecutionResult, StepStatus } from '../types/agent';
import { runStepApi, evaluateConditionApi, recordTokenSaving } from './api';

export type WorkflowCallback = (event: {
  type: 'step_start' | 'step_progress' | 'step_complete' | 'step_skip' | 'step_fail' | 'workflow_complete';
  stepId?: string;
  stepResult?: StepExecutionResult;
  log?: LogEntry;
  record?: ExecutionRecord;
}) => void;

export class WorkflowEngine {
  private project: AgentProject;
  private inputValues: Record<string, any>;
  private stepResults: Record<string, StepExecutionResult> = {};
  private logs: LogEntry[] = [];
  private isCancelled = false;
  private isPaused = false;
  private onEvent?: WorkflowCallback;
  private executionRecord: ExecutionRecord;
  private channelId?: string;

  constructor(
    project: AgentProject, 
    inputValues: Record<string, any>, 
    onEvent?: WorkflowCallback,
    channelId?: string
  ) {
    this.project = project;
    this.inputValues = inputValues;
    this.onEvent = onEvent;
    this.channelId = channelId;

    // Initialize blank results for all steps
    for (const step of project.steps) {
      this.stepResults[step.id] = {
        stepId: step.id,
        stepName: step.name,
        status: 'pending',
        durationMs: 0,
        tokens: {
          promptTokens: 0,
          candidatesTokens: 0,
          totalTokens: 0,
          savedTokens: 0,
        },
      };
    }

    this.executionRecord = {
      id: 'exec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      projectId: project.id,
      projectName: project.name,
      startedAt: Date.now(),
      totalDurationMs: 0,
      status: 'running',
      inputValues,
      stepResults: this.stepResults,
      totalTokens: {
        promptTokens: 0,
        candidatesTokens: 0,
        totalTokens: 0,
        savedTokens: 0,
      },
      logs: [],
    };
  }

  public cancel() {
    this.isCancelled = true;
    this.addLog('warn', '用户终止执行', '工作流已被操作人员手动终止。');
  }

  public pause() {
    this.isPaused = true;
    this.addLog('info', '工作流已暂停', '当前步骤完成后将暂停流转，等待继续指令。');
  }

  public resume() {
    this.isPaused = false;
    this.addLog('info', '工作流恢复执行', '继续推进后续链路节点。');
  }

  private addLog(level: LogEntry['level'], title: string, message: string, stepId?: string, data?: any): LogEntry {
    const entry: LogEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      level,
      stepId,
      stepName: stepId ? this.project.steps.find(s => s.id === stepId)?.name : undefined,
      title,
      message,
      data,
    };
    this.logs.push(entry);
    this.executionRecord.logs = [...this.logs];
    if (this.onEvent) {
      this.onEvent({ type: 'step_progress', log: entry, record: this.executionRecord });
    }
    return entry;
  }

  // Format prompt template with input variables and outputs of prior steps
  private interpolatePrompt(step: StepDefinition): string {
    let result = step.promptTemplate;

    // Replace user inputs: {inputKey}
    for (const [k, v] of Object.entries(this.inputValues)) {
      const reg = new RegExp(`\\{${k}\\}`, 'g');
      result = result.replace(reg, String(v ?? ''));
    }

    // Replace preceding step outputs: {stepId}
    for (const [sid, sRes] of Object.entries(this.stepResults)) {
      if (sRes.outputContent) {
        const reg = new RegExp(`\\{${sid}\\}`, 'g');
        result = result.replace(reg, sRes.outputContent);
      }
    }

    // Default placeholder for general {input}
    if (result.includes('{input}')) {
      const firstTextKey = this.project.inputSchema.find(f => f.type === 'textarea' || f.type === 'text')?.key;
      const textVal = firstTextKey ? this.inputValues[firstTextKey] : '';
      result = result.replace(/\{input\}/g, String(textVal || ''));
    }

    return result;
  }

  // Execute full workflow sequentially through DAG steps
  public async execute(): Promise<ExecutionRecord> {
    const startTime = Date.now();
    this.addLog('info', '工作流初始化', `启动任务 [${this.project.name}]，已载入 ${this.project.steps.length} 个编排节点。`);

    try {
      for (const step of this.project.steps) {
        if (this.isCancelled) {
          this.executionRecord.status = 'cancelled';
          break;
        }

        // Wait if paused
        while (this.isPaused && !this.isCancelled) {
          await new Promise(r => setTimeout(r, 200));
        }

        // Check condition before executing step
        const shouldSkip = await this.checkStepCondition(step);

        if (shouldSkip.skip) {
          // Mark step as skipped
          const savedEstimate = step.estimatedTokenSaving || 1200;
          this.stepResults[step.id] = {
            ...this.stepResults[step.id],
            status: 'skipped',
            skipReason: shouldSkip.reason,
            tokens: {
              promptTokens: 0,
              candidatesTokens: 0,
              totalTokens: 0,
              savedTokens: savedEstimate,
            },
          };
          this.executionRecord.totalTokens.savedTokens += savedEstimate;
          await recordTokenSaving(savedEstimate);

          this.addLog('skip', `已跳过: ${step.name}`, shouldSkip.reason, step.id, {
            savedTokens: savedEstimate,
            isSubtask: step.isSubtask,
          });

          if (this.onEvent) {
            this.onEvent({
              type: 'step_skip',
              stepId: step.id,
              stepResult: this.stepResults[step.id],
              record: this.executionRecord,
            });
          }
          continue;
        }

        // Execute step
        await this.runSingleStep(step);
      }

      if (!this.isCancelled) {
        this.executionRecord.status = 'completed';
        this.addLog('success', '工作流执行圆满完成', `所有节点逻辑处理完毕，共节约约 ${this.executionRecord.totalTokens.savedTokens} Tokens。`);
      }
    } catch (err: any) {
      this.executionRecord.status = 'failed';
      this.addLog('error', '工作流执行发生异常', err?.message || String(err));
    } finally {
      this.executionRecord.totalDurationMs = Date.now() - startTime;
      this.executionRecord.completedAt = Date.now();

      // Find final output from the last non-skipped completed step
      const completedSteps = Object.values(this.stepResults).filter(s => s.status === 'completed' && s.outputContent);
      if (completedSteps.length > 0) {
        this.executionRecord.finalOutput = completedSteps[completedSteps.length - 1].outputContent;
      }

      if (this.onEvent) {
        this.onEvent({
          type: 'workflow_complete',
          record: this.executionRecord,
        });
      }
    }

    return this.executionRecord;
  }

  private async checkStepCondition(step: StepDefinition): Promise<{ skip: boolean; reason: string }> {
    if (!step.condition) {
      return { skip: false, reason: '' };
    }

    const cond = step.condition;
    this.addLog('info', `条件检查: ${step.name}`, `正在评估触发规则: "${cond.label}"...`, step.id);

    // 1. Direct Input Toggle Condition
    if (cond.type === 'input_toggle' && cond.inputFieldKey) {
      const isChecked = Boolean(this.inputValues[cond.inputFieldKey]);
      if (!isChecked) {
        return {
          skip: true,
          reason: `用户选项 [${cond.label}] 未勾选，已自动跳过此二级子任务以节省处理耗时与 Token。`,
        };
      }
      return { skip: false, reason: '用户已勾选启用' };
    }

    // 2. Data Rule Condition
    if (cond.type === 'data_rule' && cond.inputFieldKey) {
      const val = this.inputValues[cond.inputFieldKey];
      if (step.id === 'subtask-ip-protection' && val !== 'tech_dev') {
        return {
          skip: true,
          reason: `合同类型不是技术开发类（当前为: ${val}），知识产权专项审计不适用，已自动跳过。`,
        };
      }
      return { skip: false, reason: '符合数据规则' };
    }

    // 3. Model Decision Condition (Smart evaluation based on prior step results)
    if (cond.type === 'model_decision') {
      const parentStepId = step.parentStepId || (step.dependsOn && step.dependsOn[0]);
      const parentOutput = parentStepId ? this.stepResults[parentStepId]?.outputContent || '' : '';

      const evalResult = await evaluateConditionApi({
        ruleLabel: cond.label,
        decisionPrompt: cond.decisionPrompt,
        contextText: parentOutput,
        userInputVal: cond.inputFieldKey ? this.inputValues[cond.inputFieldKey] : undefined,
      });

      if (evalResult.shouldSkip) {
        return {
          skip: true,
          reason: `【智能跳过】${evalResult.rationale}`,
        };
      }
      return { skip: false, reason: evalResult.rationale };
    }

    return { skip: false, reason: '' };
  }

  private async runSingleStep(step: StepDefinition): Promise<void> {
    const stepStartTime = Date.now();
    this.stepResults[step.id] = {
      ...this.stepResults[step.id],
      status: 'running',
      startedAt: stepStartTime,
    };

    if (this.onEvent) {
      this.onEvent({
        type: 'step_start',
        stepId: step.id,
        stepResult: this.stepResults[step.id],
        record: this.executionRecord,
      });
    }

    this.addLog('info', `开始执行: ${step.name}`, `正在向智能体模型调度指令 (${step.phase})...`, step.id);

    try {
      const finalPrompt = this.interpolatePrompt(step);

      const apiResult = await runStepApi({
        projectId: this.project.id,
        stepId: step.id,
        stepName: step.name,
        prompt: finalPrompt,
        systemInstruction: step.systemInstruction,
        channelId: this.channelId,
      });

      const durationMs = Date.now() - stepStartTime;

      this.stepResults[step.id] = {
        stepId: step.id,
        stepName: step.name,
        status: 'completed',
        startedAt: stepStartTime,
        completedAt: Date.now(),
        durationMs,
        inputPrompt: finalPrompt,
        outputContent: apiResult.output,
        tokens: {
          promptTokens: apiResult.tokens?.promptTokens || 0,
          candidatesTokens: apiResult.tokens?.candidatesTokens || 0,
          totalTokens: apiResult.tokens?.totalTokens || 0,
          savedTokens: 0,
        },
      };

      // Accumulate totals
      this.executionRecord.totalTokens.promptTokens += apiResult.tokens?.promptTokens || 0;
      this.executionRecord.totalTokens.candidatesTokens += apiResult.tokens?.candidatesTokens || 0;
      this.executionRecord.totalTokens.totalTokens += apiResult.tokens?.totalTokens || 0;

      this.addLog(
        'success',
        `完成节点: ${step.name}`,
        `耗时 ${durationMs}ms，消耗 ${apiResult.tokens?.totalTokens || 0} Tokens。`,
        step.id,
        { tokens: apiResult.tokens }
      );

      if (this.onEvent) {
        this.onEvent({
          type: 'step_complete',
          stepId: step.id,
          stepResult: this.stepResults[step.id],
          record: this.executionRecord,
        });
      }
    } catch (err: any) {
      const durationMs = Date.now() - stepStartTime;
      this.stepResults[step.id] = {
        ...this.stepResults[step.id],
        status: 'failed',
        durationMs,
        error: err?.message || String(err),
      };

      this.addLog('error', `节点执行失败: ${step.name}`, err?.message || String(err), step.id);

      if (this.onEvent) {
        this.onEvent({
          type: 'step_fail',
          stepId: step.id,
          stepResult: this.stepResults[step.id],
          record: this.executionRecord,
        });
      }

      throw err;
    }
  }
}
