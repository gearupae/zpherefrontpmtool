import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import { 
  CheckCircleIcon, PlusIcon, TrashIcon, PencilSquareIcon, 
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

interface TodoSection {
  id: string;
  name: string;
  notes: string;
  todos: TodoItem[];
  createdAt: string;
}

const STORAGE_KEY = 'zphere_todo_sections_v1';

function loadSections(): TodoSection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Default section
  return [
    {
      id: crypto.randomUUID(),
      name: 'Daily Todo',
      notes: '',
      todos: [],
      createdAt: new Date().toISOString(),
    },
  ];
}

const TodoPage: React.FC = () => {
  const [sections, setSections] = useState<TodoSection[]>(loadSections());
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || '');

  // Persist (local cache only)
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sections)); } catch {}
  }, [sections]);

  // Initial load from API
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/todo/sections');
        const serverSections = res.data || [];
        if (Array.isArray(serverSections) && serverSections.length > 0) {
          setSections(serverSections);
          setActiveId(serverSections[0].id);
        }
      } catch (e) {
        // keep local cache on error
      }
    })();
  }, []);

  const active = useMemo(() => sections.find(s => s.id === activeId) || sections[0], [sections, activeId]);

  // Section actions
  const addSection = async () => {
    const name = window.prompt('Section name?', 'New Note');
    if (!name) return;
    try {
      const res = await apiClient.post('/todo/sections', { name: name.trim(), notes: '' });
      const s = res.data as TodoSection;
      setSections(prev => [s, ...prev]);
      setActiveId(s.id);
    } catch {
      // fallback local add
      const s: TodoSection = { id: crypto.randomUUID(), name: name.trim(), notes: '', todos: [], createdAt: new Date().toISOString() } as any;
      setSections(prev => [s, ...prev]);
      setActiveId(s.id);
    }
  };

  const renameSection = async (id: string) => {
    const s = sections.find(x => x.id === id);
    const name = window.prompt('Rename section', s?.name || '');
    if (!name) return;
    try {
      const res = await apiClient.put(`/todo/sections/${id}`, { name: name.trim() });
      const updated = res.data as TodoSection;
      setSections(prev => prev.map(sec => sec.id === id ? { ...sec, name: updated.name } : sec));
    } catch {
      setSections(prev => prev.map(sec => sec.id === id ? { ...sec, name: name.trim() } : sec));
    }
  };

  const deleteSection = async (id: string) => {
    if (!window.confirm('Delete this section?')) return;
    try {
      await apiClient.delete(`/todo/sections/${id}`);
    } catch {}
    setSections(prev => {
      const next = prev.filter(s => s.id !== id);
      if (next.length > 0 && id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  // Todo actions for active section
  const [todoInput, setTodoInput] = useState('');
  const addTodo = async () => {
    const text = todoInput.trim();
    if (!text || !active) return;
    try {
      const res = await apiClient.post(`/todo/sections/${active.id}/todos`, { text, done: false, position: 0 });
      const todo = res.data as any;
      setSections(prev => prev.map(s => s.id === active.id ? { ...s, todos: [todo, ...(s.todos||[])] } : s));
    } catch {
      setSections(prev => prev.map(s => s.id === active.id ? {
        ...s,
        todos: [{ id: crypto.randomUUID(), section_id: active.id, text, done: false, createdAt: new Date().toISOString() } as any, ...s.todos]
      } : s));
    }
    setTodoInput('');
  };

  const onTodoKey: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') addTodo();
  };

  const toggleTodo = async (id: string) => {
    if (!active) return;
    const section = active;
    const current = section.todos.find(t => t.id === id);
    const nextDone = !current?.done;
    try {
      await apiClient.patch(`/todo/todos/${id}`, { done: nextDone });
    } catch {}
    setSections(prev => prev.map(s => s.id === active.id ? {
      ...s,
      todos: s.todos.map(t => t.id === id ? { ...t, done: nextDone } : t)
    } : s));
  };

  const deleteTodo = async (id: string) => {
    if (!active) return;
    try { await apiClient.delete(`/todo/todos/${id}`); } catch {}
    setSections(prev => prev.map(s => s.id === active.id ? {
      ...s,
      todos: s.todos.filter(t => t.id !== id)
    } : s));
  };

  const updateNotes: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const value = e.target.value;
    if (!active) return;
    setSections(prev => prev.map(s => s.id === active.id ? { ...s, notes: value } : s));
  };

  const remaining = active ? active.todos.filter(t => !t.done).length : 0;

  return (
    <div className="h-full min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="w-full px-0 py-0">
        <div className="bg-white border border-gray-200 rounded-none shadow-sm overflow-hidden flex h-[calc(100vh-112px)]">
          {/* Left Pane: Sections */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Notes & Sections</h2>
              <button onClick={addSection} className="inline-flex items-center text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                <PlusIcon className="w-4 h-4 mr-1" /> New
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sections.map(sec => {
                const activeCls = sec.id === active?.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50';
                const pending = sec.todos.filter(t => !t.done).length;
                return (
                  <div key={sec.id}
                    className={`px-4 py-3 border-b border-gray-100 cursor-pointer ${activeCls}`}
                    onClick={() => setActiveId(sec.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-800">{sec.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{pending}</span>
                        <button onClick={(e) => { e.stopPropagation(); renameSection(sec.id); }} className="text-gray-400 hover:text-gray-600">
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteSection(sec.id); }} className="text-gray-400 hover:text-red-600">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {sec.notes && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{sec.notes}</p>
                    )}
                  </div>
                );
              })}
              {sections.length === 0 && (
                <div className="p-4 text-sm text-gray-500">No sections. Click New to create one.</div>
              )}
            </div>
          </div>

          {/* Right Pane: Notes + To‑Dos */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{active?.name || 'Untitled'}</h1>
                <p className="text-xs text-gray-500 mt-0.5">{remaining} pending</p>
              </div>
              <button onClick={addTodo} className="inline-flex items-center text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">
                <PlusIcon className="w-4 h-4 mr-1" /> Add To‑Do
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Notes area */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={active?.notes || ''}
                  onChange={updateNotes}
                  placeholder="Write notes here..."
                  className="w-full min-h-[140px] rounded-md border border-gray-300 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* To‑Dos area */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">To‑Dos</label>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    value={todoInput}
                    onChange={e => setTodoInput(e.target.value)}
                    onKeyDown={onTodoKey}
                    placeholder="Add a to‑do and press Enter"
                    className="flex-1 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <button onClick={addTodo} className="inline-flex items-center rounded-md bg-blue-600 text-white hover:bg-blue-700">
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="divide-y divide-gray-100 rounded-md border border-gray-200">
                  {active?.todos.length === 0 && (
                    <div className="p-4 text-sm text-gray-500">No to‑dos yet.</div>
                  )}
                  {active?.todos.map(item => (
                    <div key={item.id} className="px-4 py-3 flex items-center">
                      {/* Round toggle */}
                      <button
                        onClick={() => toggleTodo(item.id)}
                        className={`mr-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          item.done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        aria-pressed={item.done}
                        aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
                      >
                        {item.done && <CheckCircleIcon className="w-4 h-4" />}
                      </button>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm break-words ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.text}</span>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => deleteTodo(item.id)}
                        className="ml-3 p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoPage;
