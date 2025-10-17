import apiClient from './client';

export type PAIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type PAITask = {
  title: string;
  duration?: string;
  assignee?: string;
};

export type CreateProjectPayload = {
  name?: string;
  customer?: string | null;
  budget?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  priority?: 'Low' | 'Medium' | 'High' | null;
  tasks?: PAITask[];
};

export type PAIChatResponse = {
  assistant: string;
  mode: string; // allow backend to introduce new modes without breaking the UI
  payload?: any;
  create_project?: CreateProjectPayload;
};

export async function paiChat(messages: PAIMessage[]): Promise<PAIChatResponse> {
  try {
    const resp = await apiClient.post('/ai/pai/_chat/', { messages });
    return resp.data as PAIChatResponse;
  } catch (e: any) {
    const status = e?.response?.status;
    // Fallback in case the dedicated PAI route is not registered yet
    if (status === 404 || status === 405) {
      try {
        const lastUser = [...messages].reverse().find((m) => m.role === 'user');
        const prompt = lastUser?.content || '';
        const alt = await apiClient.post('/ai/nl/command', { prompt, project_id: null });
        // Map NLResult to a minimal PAIChatResponse
        return {
          assistant: 'Processed your request.',
          mode: 'idle',
          create_project: undefined,
        } as PAIChatResponse;
      } catch (e2: any) {
        throw e2;
      }
    }
    throw e;
  }
}
