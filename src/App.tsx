import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { WorkflowGraph } from './components/ExecutionCockpit/WorkflowGraph';
import { CockpitControls } from './components/ExecutionCockpit/CockpitControls';
import { StepDetailDrawer } from './components/ExecutionCockpit/StepDetailDrawer';
import { ProjectHub } from './components/ProjectHub/ProjectHub';
import { AnalyticsDashboard } from './components/AnalyticsDashboard/AnalyticsDashboard';
import { DiagnosticView } from './components/DiagnosticCenter/DiagnosticView';
import { CapabilityGuideModal } from './components/CapabilityGuideModal';
import { QuotaCockpitCard } from './components/QuotaCockpitCard';

import { 
  AgentProject, 
  ExecutionRecord, 
  LogEntry, 
  QuotaStats, 
  StepDefinition, 
  StepExecutionResult 
} from './types/agent';
import { 
  getStoredProjects, 
  saveProject, 
  deleteCustomProject, 
  resetToDefaultProjects, 
  getExecutionHistory, 
  saveExecutionRecord, 
  getStoredLogs, 
  appendLogs, 
  clearAllLogs 
} from './services/storage';
import { checkServerHealth, fetchServerStats } from './services/api';
import { WorkflowEngine } from './services/workflowEngine';
import { Sparkles, Bot, ArrowRight, Sliders, BarChart2 } from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState<AgentProject[]>([]);
  const [currentProject, setCurrentProject] = useState<AgentProject | null>(null);
  const [activeTab, setActiveTab] = useState<'cockpit' | 'projects' | 'analytics' | 'diagnostics'>('cockpit');
  
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [stepResults, setStepResults] = useState<Record<string, StepExecutionResult>>({});
  const [executionRecord, setExecutionRecord] = useState<ExecutionRecord | null>(null);
  const [history, setHistory] = useState<ExecutionRecord[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<QuotaStats | null>(null);
  const [serverStatus, setServerStatus] = useState<{ status: string; hasKey: boolean }>({ status: 'checking', hasKey: false });

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedStepForDrawer, setSelectedStepForDrawer] = useState<StepDefinition | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showQuotaCard, setShowQuotaCard] = useState(true);

  const engineRef = useRef<WorkflowEngine | null>(null);

  // Initialize data on mount
  useEffect(() => {
    const loadedProjects = getStoredProjects();
    setProjects(loadedProjects);
    if (loadedProjects.length > 0) {
      setCurrentProject(loadedProjects[0]);
      initProjectInputs(loadedProjects[0]);
    }

    setHistory(getExecutionHistory());
    setLogs(getStoredLogs());

    // Health and stats check
    checkServerHealth().then(setServerStatus);
    fetchServerStats().then(setStats);
  }, []);

  // Update input values when project switches
  const initProjectInputs = (project: AgentProject) => {
    const initialVals: Record<string, any> = {};
    for (const field of project.inputSchema) {
      if (field.defaultValue !== undefined) {
        initialVals[field.key] = field.defaultValue;
      }
    }
    setInputValues(initialVals);
    setStepResults({});
    setExecutionRecord(null);
  };

  const handleSelectProject = (project: AgentProject) => {
    setCurrentProject(project);
    initProjectInputs(project);
  };

  const handleInputChange = (key: string, value: any) => {
    setInputValues(prev => ({ ...prev, [key]: value }));
  };

  const handleLoadSample = () => {
    if (!currentProject) return;
    initProjectInputs(currentProject);
  };

  const handleStart = async () => {
    if (!currentProject || isRunning) return;

    setIsRunning(true);
    setIsPaused(false);

    const engine = new WorkflowEngine(
      currentProject, 
      inputValues, 
      (event) => {
        if (event.record) {
          setExecutionRecord({ ...event.record });
          setStepResults({ ...event.record.stepResults });
        }
        if (event.log) {
          setLogs(prev => [event.log!, ...prev]);
          appendLogs([event.log!]);
        }
      },
      stats?.activeChannelId || 'flash-latest'
    );

    engineRef.current = engine;

    try {
      const record = await engine.execute();
      setExecutionRecord(record);
      setStepResults(record.stepResults);
      saveExecutionRecord(record);
      setHistory(getExecutionHistory());

      // Refresh server stats
      const updatedStats = await fetchServerStats();
      if (updatedStats) setStats(updatedStats);
    } catch (err) {
      console.error('Workflow execution error:', err);
    } finally {
      setIsRunning(false);
      setIsPaused(false);
      engineRef.current = null;
    }
  };

  const refreshStats = () => {
    fetchServerStats().then(setStats);
  };

  const handlePause = () => {
    if (engineRef.current && isRunning) {
      engineRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleResume = () => {
    if (engineRef.current && isRunning) {
      engineRef.current.resume();
      setIsPaused(false);
    }
  };

  const handleCancel = () => {
    if (engineRef.current && isRunning) {
      engineRef.current.cancel();
      setIsRunning(false);
      setIsPaused(false);
    }
  };

  const handleReset = () => {
    if (isRunning) return;
    setStepResults({});
    setExecutionRecord(null);
  };

  const handleSaveProject = (savedProj: AgentProject) => {
    const updated = saveProject(savedProj);
    setProjects(updated);
    setCurrentProject(savedProj);
    initProjectInputs(savedProj);
  };

  const handleDeleteProject = (projId: string) => {
    if (confirm('确认删除此自定义项目吗？')) {
      const updated = deleteCustomProject(projId);
      setProjects(updated);
      if (currentProject?.id === projId && updated.length > 0) {
        setCurrentProject(updated[0]);
        initProjectInputs(updated[0]);
      }
    }
  };

  const handleResetDefaults = () => {
    if (confirm('是否确认恢复官方默认预置模板？')) {
      const defs = resetToDefaultProjects();
      setProjects(defs);
      setCurrentProject(defs[0]);
      initProjectInputs(defs[0]);
    }
  };

  const handleClearLogs = () => {
    clearAllLogs();
    setLogs([]);
  };

  const handleLoadHistoryRecord = (record: ExecutionRecord) => {
    const proj = projects.find(p => p.id === record.projectId);
    if (proj) {
      setCurrentProject(proj);
    }
    setInputValues(record.inputValues || {});
    setStepResults(record.stepResults || {});
    setExecutionRecord(record);
    setActiveTab('cockpit');
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-sm text-slate-400">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent animate-spin rounded-full" />
          <span>正在装载通用智能项目底座...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600/40">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projects={projects}
        currentProject={currentProject}
        onSelectProject={handleSelectProject}
        stats={stats}
        serverStatus={serverStatus}
        onOpenHelp={() => setShowGuideModal(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* TAB 1: WORKFLOW COCKPIT */}
        {activeTab === 'cockpit' && (
          <div className="space-y-6">
            
            {/* Top Project Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/20 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {currentProject.name}
                  </h1>
                  {currentProject.isCustom && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      用户自定义
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                  {currentProject.description}
                </p>
              </div>

              {/* Status Chip & Quota Toggle Button */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {executionRecord?.totalTokens.savedTokens ? (
                  <div className="bg-purple-950/40 border border-purple-800/50 text-purple-300 px-3 py-1.5 rounded-xl flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>本轮智能跳过已节约: ~{executionRecord.totalTokens.savedTokens.toLocaleString()} Tokens</span>
                  </div>
                ) : null}

                <button
                  onClick={() => setShowQuotaCard(!showQuotaCard)}
                  className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 font-medium transition-colors cursor-pointer ${
                    showQuotaCard
                      ? 'bg-[#101934] text-blue-300 border-[#223663] shadow-sm'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title="展开/隐藏配额与频次监控看板"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    配额看板: {stats?.channels?.[stats?.activeChannelId || 'flash-latest']?.name || 'Flash Latest'}
                  </span>
                </button>
              </div>
            </div>

            {/* Quota & Frequency Cockpit Card matching screenshot */}
            {showQuotaCard && (
              <QuotaCockpitCard
                stats={stats}
                onRefreshStats={refreshStats}
                onChannelChanged={() => {
                  refreshStats();
                }}
              />
            )}

            {/* Split Layout: Controls on Left, Graph on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Form inputs and execution actions (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <CockpitControls
                  project={currentProject}
                  inputValues={inputValues}
                  onInputChange={handleInputChange}
                  onLoadSample={handleLoadSample}
                  onStart={handleStart}
                  onPause={handlePause}
                  onResume={handleResume}
                  onCancel={handleCancel}
                  onReset={handleReset}
                  isRunning={isRunning}
                  isPaused={isPaused}
                  executionRecord={executionRecord}
                />
              </div>

              {/* Right Column: Visual DAG Step Pipeline (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <WorkflowGraph
                  project={currentProject}
                  stepResults={stepResults}
                  activeStepId={selectedStepForDrawer?.id || null}
                  onSelectStep={(step) => setSelectedStepForDrawer(step)}
                  isRunning={isRunning}
                />
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: PROJECT & SKILL HUB */}
        {activeTab === 'projects' && (
          <ProjectHub
            projects={projects}
            currentProjectId={currentProject.id}
            onSelectProject={(proj) => {
              handleSelectProject(proj);
              setActiveTab('cockpit');
            }}
            onSaveProject={handleSaveProject}
            onDeleteProject={handleDeleteProject}
            onResetDefaults={handleResetDefaults}
          />
        )}

        {/* TAB 3: ANALYTICS & QUOTA DASHBOARD */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            stats={stats}
            history={history}
            onRefreshStats={() => {
              fetchServerStats().then(setStats);
            }}
            onLoadHistoryRecord={handleLoadHistoryRecord}
            onChannelChanged={refreshStats}
          />
        )}

        {/* TAB 4: FLIGHT RECORDER & DIAGNOSTICS */}
        {activeTab === 'diagnostics' && (
          <DiagnosticView
            logs={logs}
            onClearLogs={handleClearLogs}
            currentProject={currentProject}
            lastExecution={executionRecord}
          />
        )}

      </main>

      {/* Step Detail Drawer */}
      {selectedStepForDrawer && (
        <StepDetailDrawer
          step={selectedStepForDrawer}
          result={stepResults[selectedStepForDrawer.id]}
          onClose={() => setSelectedStepForDrawer(null)}
        />
      )}

      {/* Capability & User Guide Modal */}
      {showGuideModal && (
        <CapabilityGuideModal onClose={() => setShowGuideModal(false)} />
      )}

    </div>
  );
}
