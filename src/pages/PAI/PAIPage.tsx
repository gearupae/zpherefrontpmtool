import React, { useMemo, useState } from 'react';
import { useAppSelector } from '../../hooks/redux';

// Simple types for local preview state
type PreviewState = 'Draft' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const PAIPage: React.FC = () => {
  const user = useAppSelector((s: any) => s.auth.user);

  // LEFT: Conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Welcome to PAI — your AI-first PM workspace. Tell me what you want to create or fetch (e.g., 'Create a project for Acme Corp with 5 tasks'). I'll generate a live preview on the right for you to edit before submission.",
    },
  ]);
  const [input, setInput] = useState('');

  // RIGHT: Live preview
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewType, setPreviewType] = useState<'none' | 'project' | 'tasks' | 'report'>('none');
  const [previewState, setPreviewState] = useState<PreviewState>('Draft');
  const [isEditing, setIsEditing] = useState<boolean>(true);

  // Project-like fields (illustrative)
  const [projectName, setProjectName] = useState('');
  const [projectCustomer, setProjectCustomer] = useState('');
  const [projectBudget, setProjectBudget] = useState<number | ''>('');
  const [projectStart, setProjectStart] = useState('');
  const [projectEnd, setProjectEnd] = useState('');
  const [projectOwner, setProjectOwner] = useState('');
  const [projectPriority, setProjectPriority] = useState<'Low' | 'Medium' | 'High'>('High');

  // Basic task list (illustrative)
  const [tasks, setTasks] = useState<{ title: string; assignee: string; duration: string }[]>([]);

  // Simple notifications stub for right pane
  const notifications = useMemo(
    () => [
      {
        id: 'n1',
        level: 'urgent' as const,
        title: 'Risk Alert',
        body: 'A high-risk project might miss its deadline. Review blockers.',
        age: '2m ago',
      },
      {
        id: 'n2',
        level: 'medium' as const,
        title: 'Task Assigned',
        body: 'A new task was assigned to you: API Integration',
        age: '15m ago',
      },
    ],
    []
  );

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    // Minimal heuristic: generate a project preview on first create-ish command
    const lower = text.toLowerCase();
    const looksLikeCreate = /\bcreate\b|\bmake\b|\bnew\b/.test(lower);

    if (previewType === 'none' && looksLikeCreate) {
      // Populate a sample project preview stub
      setPreviewType('project');
      setPreviewTitle('PROJECT PREVIEW');
      setProjectName('New Project');
      setProjectCustomer('');
      setProjectBudget(35000);
      setProjectStart('');
      setProjectEnd('');
      setProjectOwner(user?.username ? `@${user.username}` : '@current-user');
      setProjectPriority('High');
      setTasks([
        { title: 'Task 1', assignee: '@research', duration: '3d' },
        { title: 'Task 2', assignee: '@design', duration: '5d' },
      ]);
      setPreviewState('Draft');
      setIsEditing(true);

      // Assistant acknowledgement
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '✅ Draft created. Edit the preview on the right. Ready to Submit or Save as Draft? I can add dependencies, assignments, and notifications next.',
        },
      ]);
    } else {
      // Generic assistant echo for now; future steps will add parsing and data ops
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "Got it. I can generate or update the preview on the right. Tell me if this is a create, fetch, or update request, and I’ll adapt.",
        },
      ]);
    }

    setInput('');
  };

  const addTask = () => {
    setTasks((prev) => [...prev, { title: `Task ${prev.length + 1}`, assignee: '', duration: '1d' }]);
  };

  const saveAsDraft = () => {
    setPreviewState('Draft');
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '💾 Saved as Draft. You can continue editing anytime.' },
    ]);
  };

  const submit = () => {
    setPreviewState('In Progress');
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content:
          '✅ Submitted. Status set to In Progress. Next steps: notifications and scheduling can be automated in follow-up steps.',
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title font-bold text-gray-900">PAI — AI Project Assistant</h1>
          <div className="text-gray-600 mt-1 text-sm">Dual-pane workspace: chat on the left, live preview on the right</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT PANE: Conversation */}
        <div className="bg-white shadow rounded-lg flex flex-col h-[70vh]">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-medium text-secondary-900">Conversation</h2>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`${
                  m.role === 'assistant' ? 'bg-gray-50 border border-gray-200' : 'bg-blue-50 border border-blue-200'
                } p-3 rounded-md text-sm text-gray-800`}
              >
                <div className="text-xs uppercase text-gray-500 mb-1">{m.role}</div>
                <div>{m.content}</div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe what you want (create, fetch, update, analyze)…"
                className="flex-1 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={sendMessage}
                className="px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Live Preview & Edit */}
        <div className="space-y-4">
          {/* Notifications header (spec stub) */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-medium text-secondary-900">Notifications</h2>
              <button className="text-xs text-gray-600 hover:text-gray-800">Clear All</button>
            </div>
            <div className="p-3 divide-y divide-gray-100">
              {notifications.map((n) => (
                <div key={n.id} className="py-2">
                  <div className="text-sm font-medium text-gray-900">
                    {n.level === 'urgent' ? '🔴' : n.level === 'medium' ? '🟡' : '🔵'} {n.title}
                  </div>
                  <div className="text-xs text-gray-600">{n.body}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{n.age}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-medium text-secondary-900">
                {previewTitle || 'PREVIEW (awaiting instructions)'}
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">State</label>
                <select
                  value={previewState}
                  onChange={(e) => setPreviewState(e.target.value as PreviewState)}
                  className="text-xs border border-gray-300 rounded px-2"
                >
                  <option>Draft</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>On Hold</option>
                  <option>Cancelled</option>
                </select>
                <button
                  type="button"
                  onClick={() => setIsEditing((v) => !v)}
                  className="text-xs px-2 rounded border border-gray-300 hover:bg-gray-50"
                >
                  {isEditing ? 'Lock' : 'Edit'}
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {previewType === 'none' && (
                <div className="text-sm text-gray-600">
                  Use the chat to request a creation, fetch, update, or analysis. I’ll populate a structured preview here for inline editing.
                </div>
              )}

              {previewType === 'project' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600">Name</label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        disabled={!isEditing}
                        className="mt-1 w-full border border-gray-300 rounded px-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Customer</label>
                      <input
                        type="text"
                        value={projectCustomer}
                        onChange={(e) => setProjectCustomer(e.target.value)}
                        disabled={!isEditing}
                        className="mt-1 w-full border border-gray-300 rounded px-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Budget ($)</label>
                      <input
                        type="number"
                        value={projectBudget}
                        onChange={(e) => setProjectBudget(e.target.value === '' ? '' : Number(e.target.value))}
                        disabled={!isEditing}
                        className="mt-1 w-full border border-gray-300 rounded px-2 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600">Start</label>
                        <input
                          type="date"
                          value={projectStart}
                          onChange={(e) => setProjectStart(e.target.value)}
                          disabled={!isEditing}
                          className="mt-1 w-full border border-gray-300 rounded px-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">End</label>
                        <input
                          type="date"
                          value={projectEnd}
                          onChange={(e) => setProjectEnd(e.target.value)}
                          disabled={!isEditing}
                          className="mt-1 w-full border border-gray-300 rounded px-2 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Owner</label>
                      <input
                        type="text"
                        value={projectOwner}
                        onChange={(e) => setProjectOwner(e.target.value)}
                        disabled={!isEditing}
                        className="mt-1 w-full border border-gray-300 rounded px-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Priority</label>
                      <select
                        value={projectPriority}
                        onChange={(e) => setProjectPriority(e.target.value as any)}
                        disabled={!isEditing}
                        className="mt-1 w-full border border-gray-300 rounded px-2 text-sm"
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </div>
                  </div>

                  {/* TASKS */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-gray-700">TASKS ({tasks.length})</h3>
                      <button
                        type="button"
                        onClick={addTask}
                        disabled={!isEditing}
                        className={`text-xs px-2 rounded ${
                          isEditing ? 'border border-gray-300 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        + Add
                      </button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {tasks.map((t, i) => (
                        <div key={i} className="border border-gray-200 rounded p-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={t.title}
                              onChange={(e) =>
                                setTasks((prev) => prev.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))
                              }
                              disabled={!isEditing}
                              className="border border-gray-300 rounded px-2 text-sm"
                            />
                            <input
                              type="text"
                              value={t.assignee}
                              onChange={(e) =>
                                setTasks((prev) => prev.map((x, idx) => (idx === i ? { ...x, assignee: e.target.value } : x)))
                              }
                              placeholder="@assignee"
                              disabled={!isEditing}
                              className="border border-gray-300 rounded px-2 text-sm"
                            />
                            <input
                              type="text"
                              value={t.duration}
                              onChange={(e) =>
                                setTasks((prev) => prev.map((x, idx) => (idx === i ? { ...x, duration: e.target.value } : x)))
                              }
                              placeholder="e.g., 3d"
                              disabled={!isEditing}
                              className="border border-gray-300 rounded px-2 text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveAsDraft}
                  className="py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={submit}
                  className="py-2 rounded-md text-sm bg-black text-white hover:bg-gray-800"
                >
                  Submit
                </button>
                <button
                  type="button"
                  disabled
                  className="py-2 rounded-md text-sm border border-gray-200 text-gray-400 cursor-not-allowed"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled
                  className="py-2 rounded-md text-sm border border-gray-200 text-gray-400 cursor-not-allowed"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PAIPage;
