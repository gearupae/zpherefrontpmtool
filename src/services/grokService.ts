import apiClient from '../api/client';

export interface TranscriptionResult {
  text: string;
  language?: string;
  segments?: { id?: number; start: number; end: number; text: string }[];
  duration?: number;
}

export interface ProjectSummaryResult {
  description: string;
  details?: {
    name?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    due_date?: string; // ISO string
    tags?: string[];
  };
}

export interface ExtractedTask {
  title: string;
  description: string;
  priority?: string;
  due_date?: string;
}

export async function transcribeAudio(blob: Blob): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append('audio', blob, 'meeting.webm');
  const resp = await apiClient.post('/transcribe', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp.data as TranscriptionResult;
}

export async function summarizeProject(text: string): Promise<ProjectSummaryResult> {
  const resp = await apiClient.post('/summarize', { mode: 'project', text });
  const result = resp.data?.result || {};
  return {
    description: result.description || '',
    details: result.details || {},
  } as ProjectSummaryResult;
}

export async function extractTasks(text: string, projectId?: string): Promise<ExtractedTask[]> {
  const resp = await apiClient.post('/summarize', { mode: 'tasks', text, project_id: projectId });
  const result = resp.data?.result || {};
  const tasks = Array.isArray(result.tasks) ? result.tasks : [];
  return tasks as ExtractedTask[];
}
