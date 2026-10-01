import { AgentProject, ExecutionRecord, LogEntry } from '../types/agent';
import { DEFAULT_PROJECTS } from './defaultProjects';

const STORAGE_KEY_PROJECTS = 'omni_agent_substrate_projects_v1';
const STORAGE_KEY_HISTORY = 'omni_agent_substrate_history_v1';
const STORAGE_KEY_LOGS = 'omni_agent_substrate_logs_v1';

export function getStoredProjects(): AgentProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (!raw) {
      // Initialize with default projects
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(DEFAULT_PROJECTS));
      return DEFAULT_PROJECTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_PROJECTS;
  } catch (e) {
    console.error('Failed to load projects from storage:', e);
    return DEFAULT_PROJECTS;
  }
}

export function saveProject(project: AgentProject): AgentProject[] {
  const current = getStoredProjects();
  const index = current.findIndex(p => p.id === project.id);
  let updated: AgentProject[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...project, isCustom: true };
  } else {
    updated = [{ ...project, isCustom: true }, ...current];
  }
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updated));
  return updated;
}

export function deleteCustomProject(projectId: string): AgentProject[] {
  const current = getStoredProjects();
  const updated = current.filter(p => p.id !== projectId);
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updated));
  return updated;
}

export function resetToDefaultProjects(): AgentProject[] {
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(DEFAULT_PROJECTS));
  return DEFAULT_PROJECTS;
}

export function getExecutionHistory(): ExecutionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveExecutionRecord(record: ExecutionRecord) {
  try {
    const current = getExecutionHistory();
    // Keep last 30 execution runs
    const updated = [record, ...current.filter(r => r.id !== record.id)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save execution record:', e);
  }
}

export function getStoredLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function appendLogs(newLogs: LogEntry[]) {
  try {
    const current = getStoredLogs();
    const updated = [...newLogs, ...current].slice(0, 300); // keep last 300 log entries
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to append logs:', e);
  }
}

export function clearAllLogs() {
  localStorage.removeItem(STORAGE_KEY_LOGS);
}
