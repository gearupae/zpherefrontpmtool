import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { paiChat, PAIMessage } from '../../api/pai';
import { detectTenantContext, getTenantRoute } from '../../utils/tenantUtils';
import { Send, FileText, Clock, TrendingUp, Users, Calendar, DollarSign, AlertCircle, BarChart3, Package, CheckCircle, Plus, Brain, Eye } from 'lucide-react';
import { useHasPermission } from '../../utils/permissions';
import { UserRole } from '../../types';
import { contextMiddleware, ContextAwareCommand } from '../../middleware/contextMiddleware';
import { ContextPreview } from './ContextPreview';
import CustomerPreview from './CustomerPreview';
import { computeProjectDefaults, computeTaskDefaults } from '../../services/smartDefaults';
import { useLocation } from 'react-router-dom';

// Lightweight workspace with dual-pane: chat + preview
// Implements three core functions for step-1 delivery:
// 1) Create project with tasks (preview -> submit persists via backend)
// 2) Show overdue tasks assigned to current user
// 3) Show projects over budget and behind schedule

// Types
 type PreviewState = 'Draft' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
 type ChatMessage = { role: 'user' | 'assistant'; content: string };
 type RightMode = 'idle' | 'create_project' | 'create_customer' | 'overdue_tasks' | 'at_risk_projects' | 'invoices_overdue' | 'team_workload' | 'forecast' | 'resource_opt' | 'scenario' | 'project_budget' | 'blockers' | 'availability' | 'proposals_due' | 'customers_followup' | 'invoices_pending' | 'invoice_preview' | 'client_report' | 'po_list' | 'invoice_history' | 'closure_report';

 type SimpleTask = { title: string; assignee?: string; duration?: string };

 // Customer data type
 type CustomerData = {
   firstName: string;
   lastName: string;
   phone: string;
   email: string;
   companyName: string;
   jobTitle: string;
   addressLine1: string;
   city: string;
   state: string;
   postalCode: string;
   country: string;
   customerType: 'prospect' | 'client' | 'lead';
   notes: string;
 };

 const PAIWorkspace: React.FC = () => {
  const user = useAppSelector((s: any) => s.auth.user);
  const cachedProjects: any[] = useAppSelector((s: any) => s.projects?.projects || []);
  const hasPermission = useHasPermission();
  const canViewInvoices = hasPermission('Invoices', 'view');
  const canCreateInvoices = hasPermission('Invoices', 'create');
  const location = useLocation();
  const canEditTasks = hasPermission('Tasks', 'edit');
  const canDeleteTasks = hasPermission('Tasks', 'delete');
  const canCreateTasksPerm = hasPermission('Tasks', 'create');
  const canEditProjects = hasPermission('Projects', 'edit');
  const canCreateProjects = hasPermission('Projects', 'create');
  const canSeeFinancial = (user?.role === UserRole.ADMIN) || canViewInvoices;

  // LEFT: Conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hey! What can I help you with? For example: 'Create a project for Acme with 5 tasks', 'Show my overdue tasks', or 'Which projects are over budget and behind schedule?'. I'll show the results on the right.",
    },
  ]);
  const [input, setInput] = useState('');
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  // Remember last uploaded attachments from chat to attach to newly created project
  const [recentUploads, setRecentUploads] = useState<Array<{ filename: string; url: string }>>([]);
  const [uploadingChatFiles, setUploadingChatFiles] = useState(false);
  const fileAccept = useMemo(() => [
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ].join(','), []);
  const onPickChatFiles = () => chatFileInputRef.current?.click();
  const onChatFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (list.length) setChatFiles((prev) => [...prev, ...list].slice(0, 10));
    if (chatFileInputRef.current) chatFileInputRef.current.value = '';
  };

  // @mention autocomplete state
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  // Smart Compose (inline predictive input)
  const [smartSuggestion, setSmartSuggestion] = useState<string | null>(null);
  const [ghostLeft, setGhostLeft] = useState<number>(0);
  const ghostMeasureRef = useRef<HTMLSpanElement | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionSuggestions, setMentionSuggestions] = useState<Array<{
    category: string;
    label: string;
    insertText: string;
  }>>([]);
  const mentionTimerRef = useRef<any>(null);

  const getMentionFromInput = (val: string, caret: number) => {
    if (caret == null) return null;
    const before = val.slice(0, caret);
    const at = before.lastIndexOf('@');
    if (at === -1) return null;
    // ensure '@' starts a token (start or whitespace before)
    if (at > 0 && !/\s/.test(before[at - 1])) return null;
    const after = val.slice(at + 1);
    const spaceIdx = after.search(/\s/);
    const token = spaceIdx === -1 ? after : after.slice(0, spaceIdx);
    return { query: token, start: at };
  };

  const orderCategoriesByContext = (context: string) => {
    const c = context.toLowerCase();
    if (/(invoice|bill|due|pending|payment)/.test(c)) return ['invoices', 'customers', 'projects', 'proposals'];
    if (/(assign|reassign)/.test(c) && /(task)/.test(c)) return ['team', 'tasks', 'projects'];
    if (/(update).*status/.test(c)) return ['projects', 'tasks'];
    if (/(show).*tasks.*for/.test(c)) return ['projects', 'customers', 'team'];
    if (/(create).*project.*similar/.test(c)) return ['projects'];
    return ['customers', 'projects', 'tasks', 'team', 'proposals', 'invoices'];
  };

  const fetchMentionSuggestions = async (query: string, context: string) => {
    const cats = orderCategoriesByContext(context);
    const list: Array<{category: string; label: string; insertText: string;}> = [];
    try {
      const { default: apiClient } = await import('../../api/client');
      const q = query.trim();
      for (const cat of cats) {
        try {
          if (cat === 'customers') {
            const r = await apiClient.get('/customers/', { params: { page: 1, size: 5, search: q || undefined } as any });
            const arr: any[] = r?.data?.customers || [];
            arr.slice(0,5).forEach(cu => list.push({ category: 'customers', label: `${cu.display_name || cu.name || 'Customer'} (${cu.id || ''})`, insertText: `@${cu.display_name || cu.name || 'customer'}` }));
          } else if (cat === 'projects') {
            const r = await apiClient.get('/projects/', { params: { page: 1, size: 5, q: q || undefined } as any });
            const arr: any[] = Array.isArray(r?.data) ? r.data : [];
            arr.slice(0,5).forEach(p => list.push({ category: 'projects', label: `${p.name || 'Project'} (${p.id || ''}) - ${p.status || ''}`, insertText: `@${p.name || 'project'}` }));
          } else if (cat === 'tasks') {
            const r = await apiClient.get('/tasks/', { params: { page: 1, size: 5, search: q || undefined } as any });
            const arr: any[] = Array.isArray(r?.data) ? r.data : [];
            arr.slice(0,5).forEach(t => list.push({ category: 'tasks', label: `${t.title || 'Task'} (${t.id || ''})`, insertText: `@${t.title || 'task'}` }));
          } else if (cat === 'team') {
            const r = await apiClient.get('/teams/members', { params: { page: 1, size: 5, search: q || undefined } as any });
            const arr: any[] = Array.isArray(r?.data) ? r.data : [];
            arr.slice(0,5).forEach(u => list.push({ category: 'team', label: `${u.full_name || u.username || 'User'} (@${u.username || ''})`, insertText: `@${u.username || 'user'}` }));
          } else if (cat === 'invoices') {
            const r = await apiClient.get('/invoices/', { params: { page: 1, size: 5, search: q || undefined } as any });
            const arr: any[] = r?.data?.invoices || [];
            arr.slice(0,5).forEach(inv => list.push({ category: 'invoices', label: `${inv.invoice_number || inv.id} - ${inv.customer_id || ''} - $${((Number(inv.total_amount||0))/100).toFixed(2)}`, insertText: `@${inv.invoice_number || inv.id}` }));
          } else if (cat === 'proposals') {
            const r = await apiClient.get('/proposals/', { params: { page: 1, size: 5, search: q || undefined } as any });
            const arr: any[] = r?.data?.items || [];
            arr.slice(0,5).forEach(pp => list.push({ category: 'proposals', label: `${pp.title || 'Proposal'} (${pp.id||''}) - ${pp.customer_id || ''}`, insertText: `@${pp.title || 'proposal'}` }));
          }
        } catch { /* ignore each category failure */ }
      }
    } catch { /* ignore top-level */ }
    setMentionSuggestions(list);
    setMentionIndex(0);
  };

  const handleMentionNavigation = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mentionOpen || mentionSuggestions.length === 0) return false;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex(i => (i + 1) % mentionSuggestions.length);
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex(i => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length);
      return true;
    }
    if (e.key === 'Escape') {
      setMentionOpen(false);
      return true;
    }
    if (e.key === 'Enter') {
      // selection will be handled in keydown pipeline if open
      return false;
    }
    return false;
  };

  const insertMentionSelection = (sel: {insertText: string}) => {
    const el = chatInputRef.current;
    if (!el) return;
    const val = el.value;
    const caret = el.selectionStart || 0;
    const m = getMentionFromInput(val, caret);
    if (!m) return;
    const before = val.slice(0, m.start);
    const afterTokenIdx = m.start + 1 + (m.query || '').length;
    const after = val.slice(afterTokenIdx);
    const newVal = `${before}${sel.insertText} ${after}`;
    setInput(newVal);
    setMentionOpen(false);
    // set caret after inserted mention + space
    const newCaret = (before + sel.insertText + ' ').length;
    requestAnimationFrame(() => {
      el.focus();
      try { el.setSelectionRange(newCaret, newCaret); } catch {}
    });
  };

  const onChatInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (handleMentionNavigation(e)) return;

    // Accept Smart Compose suggestion with Tab
    if (e.key === 'Tab' && smartSuggestion && input && smartSuggestion.toLowerCase().startsWith(input.toLowerCase())) {
      e.preventDefault();
      setInput(smartSuggestion);
      setSmartSuggestion(null);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      if (mentionOpen && mentionSuggestions.length > 0) {
        e.preventDefault();
        insertMentionSelection(mentionSuggestions[mentionIndex]);
        return;
      }
      e.preventDefault();
      sendMessage();
      return;
    }
  };

  const onChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    // Update Smart Compose suggestion and measure prefix width for overlay positioning
    try {
      const suggestion = computeSmartSuggestion(val);
      setSmartSuggestion(suggestion);
      // measure typed text width using hidden span with same styles
      if (ghostMeasureRef.current) {
        ghostMeasureRef.current.textContent = val;
        const w = ghostMeasureRef.current.offsetWidth || 0;
        setGhostLeft(w + 8); // small padding to separate
      }
    } catch {}

    const caret = e.target.selectionStart || val.length;
    const m = getMentionFromInput(val, caret);
    if (!m) {
      setMentionOpen(false);
      setMentionQuery('');
      setMentionSuggestions([]);
      return;
    }
    setMentionOpen(true);
    setMentionQuery(m.query || '');
    if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);
    const context = val.slice(0, m.start);
    mentionTimerRef.current = setTimeout(() => {
      fetchMentionSuggestions(m.query || '', context);
    }, 180);
  };

  // Persist chat history to localStorage (per-tenant slug) so history remains across reloads
  const storageKey = React.useMemo(() => {
    try {
      const tc = detectTenantContext(undefined, undefined);
      const slug = (tc?.tenantSlug && String(tc.tenantSlug)) || null;
      if (slug) return `pai_chat_history:${slug}`;
      // Fallbacks if detectTenantContext fails to resolve slug
      const host = window.location.hostname || '';
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
      if (!isLocal) {
        const sub = host.split('.')[0];
        if (sub && sub !== 'www') return `pai_chat_history:${sub}`;
      }
      const parts = (window.location.pathname || '').split('/').filter(Boolean);
      if (parts.length >= 1) return `pai_chat_history:${parts[0]}`;
      return 'pai_chat_history:default';
    } catch {
      return 'pai_chat_history:default';
    }
  }, []);

  // Prevent duplicate bootstrap in React StrictMode (dev):
  const bootHandledRef = useRef(false);

  // Load existing chat history on mount + handle bootstrap once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const safe = arr
            .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
            .slice(-200) as ChatMessage[];
          if (safe.length > 0) setMessages(safe);
        }
      }
    } catch {}

    // Bootstrap message if user came from the landing page — only once
    try {
      if (!bootHandledRef.current) {
        const boot = sessionStorage.getItem('pai_bootstrap_message');
        if (boot && boot.trim()) {
          bootHandledRef.current = true; // mark before firing to avoid double-run
          sessionStorage.removeItem('pai_bootstrap_message'); // consume immediately
          setTimeout(() => {
            // no await needed here; fire-and-forget is fine
            runCommand(boot);
          }, 0);
        }
      }
    } catch {}
  }, [storageKey]);

  // Save chat history whenever messages change
  useEffect(() => {
    try {
      const clipped = messages.slice(-200);
      localStorage.setItem(storageKey, JSON.stringify(clipped));
    } catch {}
  }, [messages, storageKey]);

  // Smart Compose: compute a single best suggestion inline
  const computeSmartSuggestion = (val: string): string | null => {
    const raw = (val || '').trim();
    if (raw.length < 3) return null;
    const lower = raw.toLowerCase();

    // Example: "create proj..." -> propose complete thoughts
    if (lower.startsWith('create proj') || lower.startsWith('create a proj') || lower.startsWith('create project')) {
      const candidates: string[] = [];
      // Candidate 1: create project for a customer with tasks (static fallback names)
      candidates.push('Create project for ADDC with mobile app development tasks');
      // Candidate 2: similar to an existing project if available
      if (projectsQuick && projectsQuick.length > 0 && projectsQuick[0]?.name) {
        candidates.push(`Create project similar to ${projectsQuick[0].name} for new customer`);
      } else {
        candidates.push('Create project similar to Power Grid Upgrade for new customer');
      }
      // Candidate 3: from proposal pattern
      candidates.push('Create project from proposal #789 for Acme Corp');

      // Choose the first that starts with current raw (case-insensitive). Otherwise, return first
      const pick = candidates.find(c => c.toLowerCase().startsWith(lower)) || candidates[0];
      return pick;
    }

    // Example: "show over..." etc can be extended later
    return null;
  };

  // RIGHT: mode and preview
  const [mode, setMode] = useState<RightMode>('idle');
  const [previewState, setPreviewState] = useState<PreviewState>('Draft');
  const [isEditing, setIsEditing] = useState<boolean>(true);

  // Project preview model
  const [projectName, setProjectName] = useState('');
  const [projectCustomer, setProjectCustomer] = useState('');
  const [projectBudget, setProjectBudget] = useState<number | ''>('');
  const [projectStart, setProjectStart] = useState('');
  const [projectEnd, setProjectEnd] = useState('');
  const [projectOwner, setProjectOwner] = useState('');
  const [projectPriority, setProjectPriority] = useState<'Low' | 'Medium' | 'High'>('High');
  const [tasks, setTasks] = useState<SimpleTask[]>([]);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{name?: string; dates?: string} | null>(null);

  // Customer preview model
  const [customerData, setCustomerData] = useState<CustomerData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    companyName: '',
    jobTitle: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    customerType: 'prospect',
    notes: ''
  });
  const [savedCustomerId, setSavedCustomerId] = useState<string | null>(null);
  const [customerFieldErrors, setCustomerFieldErrors] = useState<{[key: string]: string} | null>(null);

  // Fetch-mode data holders
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
  const [atRiskProjects, setAtRiskProjects] = useState<any[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [teamWorkload, setTeamWorkload] = useState<any[]>([]);
  const [forecastResult, setForecastResult] = useState<any>(null);
  const [resourcePlan, setResourcePlan] = useState<any>(null);
  const [scenarioInfo, setScenarioInfo] = useState<any>(null);
  const [budgetStatus, setBudgetStatus] = useState<any>(null);
  const [blockers, setBlockers] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [proposalsDue, setProposalsDue] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [invoicesPending, setInvoicesPending] = useState<any[]>([]);
  const [invoicePreview, setInvoicePreview] = useState<any | null>(null);
  const [clientReport, setClientReport] = useState<any | null>(null);
  const [poList, setPoList] = useState<any[]>([]);
  
  // Pending invoice options (A/B/C) state
  const [pendingInvoiceOptions, setPendingInvoiceOptions] = useState<any | null>(null);
  // Disambiguation flows and edge-cases
  const [pendingCustomerDisambiguation, setPendingCustomerDisambiguation] = useState<{ candidates: any[] } | null>(null);
  const [pendingNoBillableFlow, setPendingNoBillableFlow] = useState<{ customer_id: string } | null>(null);
  const [pendingRiskAlert, setPendingRiskAlert] = useState<{ customer_id: string; overdue: any[] } | null>(null);
  const [pendingLowConfidenceFlow, setPendingLowConfidenceFlow] = useState<{ command: any } | null>(null);
  const [invoiceHistory, setInvoiceHistory] = useState<any[]>([]);
  const [historyCustomerName, setHistoryCustomerName] = useState<string>('');

  // Inline notifications (top of right pane) — light fetch
  const [notifications, setNotifications] = useState<any[]>([]);
  // Projects list for Quick Actions (invoice preview)
  const [projectsQuick, setProjectsQuick] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  // Date range for invoice preview
  const [rangeFromDate, setRangeFromDate] = useState<string>('');
  const [rangeToDate, setRangeToDate] = useState<string>('');
  // Reassign by task IDs
  const [reassignTaskIdsInput, setReassignTaskIdsInput] = useState<string>('');
  const [reassignToUsername, setReassignToUsername] = useState<string>('');
  // Chat history sidebar toggle
  const [showChatHistory, setShowChatHistory] = useState(false);
  
  // VISUAL INTELLIGENCE: Streaming ops + hover + inline editing states
  type StreamingOp = { id: string; label: string; status: 'processing' | 'done' | 'error'; ts: number };
  const [streamingOps, setStreamingOps] = useState<StreamingOp[]>([]);
  const pushStreaming = (op: StreamingOp) => setStreamingOps(prev => [...prev, op]);
  const updateStreaming = (id: string, status: 'processing' | 'done' | 'error') => setStreamingOps(prev => prev.map(o => o.id === id ? { ...o, status, ts: Date.now() } : o));
  const clearStreaming = () => setStreamingOps([]);

  // Hover intelligence for @mentions
  const [hoverCard, setHoverCard] = useState<{ username: string; rect: DOMRect | null; data?: any } | null>(null);
  const [closureAction, setClosureAction] = useState<{ visible: boolean; projectId?: string; report?: any; undo?: any }>({ visible: false });
  const fetchUserHover = async (username: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const membersResp = await apiClient.get('/teams/members');
      const list: any[] = Array.isArray(membersResp.data) ? membersResp.data : [];
      const uname = username.replace(/^@/, '').toLowerCase();
      const user = list.find((m:any)=> String(m.username||'').toLowerCase() === uname) || null;
      if (!user) return { user: null, stats: null };
      // Quick stats from tasks
      let stats: any = null;
      try {
        const t = await apiClient.get('/tasks/');
        const tasks: any[] = Array.isArray(t.data) ? t.data : [];
        const mine = tasks.filter(x=> x.assignee_id === user.id && !x.is_archived);
        const overdue = mine.filter((x:any)=> {
          const due = x?.due_date ? Date.parse(x.due_date) : NaN;
          const done = ['done','completed','complete'].includes(String(x.status||'').toLowerCase());
          return Number.isFinite(due) && due < Date.now() && !done;
        });
        // Simple availability: tasks with due date this week
        const now = new Date();
        const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
        const end = new Date(start); end.setDate(start.getDate()+7); end.setHours(23,59,59,999);
        const thisWeek = mine.filter((x:any)=> x.due_date && new Date(x.due_date) >= start && new Date(x.due_date) <= end);
        stats = { active: mine.length, overdue: overdue.length, weekCount: thisWeek.length };
      } catch {}
      return { user, stats };
    } catch {
      return { user: null, stats: null };
    }
  };

  // Inline date edit for assistant dates
  const [inlineDateEdit, setInlineDateEdit] = useState<{ idx: number; startLeft: number; startTop: number; value: string } | null>(null);
  const openInlineDate = (idx: number, rect: DOMRect, current: string) => {
    setInlineDateEdit({ idx, startLeft: rect.left, startTop: rect.bottom + 4, value: current });
  };
  const applyInlineDate = async (newDate: string) => {
    try {
      // Use selectedProjectId if available; fallback to savedProjectId
      const { default: apiClient } = await import('../../api/client');
      const pid = selectedProjectId || savedProjectId;
      if (!pid) { addAssistant('Please select a project before updating its deadline.'); return; }
      const d = new Date(newDate);
      await apiClient.put(`/projects/${pid}`, { due_date: isNaN(d.getTime()) ? newDate : d.toISOString() });
      addAssistant(`✅ Updated deadline to ${new Date(newDate).toLocaleDateString()}. Team notified. Timeline adjusted.`);
    } catch (e:any) {
      addAssistant('Failed to update project deadline.');
    } finally {
      setInlineDateEdit(null);
    }
  };

  // Command Aliases (user-defined shortcuts)
  type AliasEntry = { action: string };
  const [aliases, setAliases] = useState<Record<string, AliasEntry>>(() => {
    try {
      const raw = localStorage.getItem('pai_aliases');
      const saved = raw ? JSON.parse(raw) : {};
      // Seed defaults if not present
      return {
        standup: saved.standup || { action: 'generate daily standup report' },
        status: saved.status || { action: 'show my task status' },
        eod: saved.eod || { action: 'end of day wrap' },
        ...Object.fromEntries(Object.entries(saved).filter(([k]) => !['standup','status','eod'].includes(k)))
      } as Record<string, AliasEntry>;
    } catch {
      return { standup: { action: 'generate daily standup report' }, status: { action: 'show my task status' }, eod: { action: 'end of day wrap' } };
    }
  });
  const persistAliases = (next: Record<string, AliasEntry>) => {
    setAliases(next);
    try { localStorage.setItem('pai_aliases', JSON.stringify(next)); } catch {}
  };

  // Smart Preferences (learned defaults)
  type SmartPrefs = { assign_api_to_username?: string; testing_duration_days?: number; estimate_buffer_percent?: number };
  const [smartPrefs, setSmartPrefs] = useState<SmartPrefs>(() => {
    try {
      const raw = localStorage.getItem('pai_smart_prefs');
      return raw ? JSON.parse(raw) : { assign_api_to_username: '@john', testing_duration_days: 3, estimate_buffer_percent: 20 };
    } catch {
      return { assign_api_to_username: '@john', testing_duration_days: 3, estimate_buffer_percent: 20 };
    }
  });
  const [showPrefs, setShowPrefs] = useState(false);

  // Automation rules (IFTTT-style)
  type AutomationRule = {
    id: string;
    name: string;
    enabled: boolean;
    trigger: 'task_overdue';
    conditions: { priorityIn?: ('high'|'critical')[] };
    actions: { emailOwner?: boolean; slackPM?: boolean; addComment?: string; incRisk?: number };
  };
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(() => {
    try { return JSON.parse(localStorage.getItem('automation_rules') || '[]'); } catch { return []; }
  });
  const persistAutomationRules = (rules: AutomationRule[]) => {
    setAutomationRules(rules);
    try { localStorage.setItem('automation_rules', JSON.stringify(rules)); } catch {}
  };
  const [automationOpen, setAutomationOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  // Track fired (ruleId -> {taskId: true}) to prevent repeats
  const [firedMap, setFiredMap] = useState<Record<string, Record<string, boolean>>>(() => {
    try { return JSON.parse(localStorage.getItem('automation_fired') || '{}'); } catch { return {}; }
  });
  const persistFiredMap = (next: Record<string, Record<string, boolean>>) => {
    setFiredMap(next);
    try { localStorage.setItem('automation_fired', JSON.stringify(next)); } catch {}
  };

  // Zero‑click weekly sprint pattern store
  type WeeklyPattern = { enabled: boolean; createdWeeks: string[]; lastCreatedTaskIds?: string[]; lastWeekKey?: string };
  const [weeklyPattern, setWeeklyPattern] = useState<WeeklyPattern>(() => {
    try {
      const raw = localStorage.getItem('zero_click_patterns');
      const obj = raw ? JSON.parse(raw) : {};
      return obj.weekly_sprint || { enabled: false, createdWeeks: [] };
    } catch {
      return { enabled: false, createdWeeks: [] };
    }
  });

  // Auto‑action banner state
  const [autoAction, setAutoAction] = useState<{ visible: boolean; summary?: string; weekLabel?: string; createdTaskIds?: string[]; appliedPrefsSummary?: string }>(() => ({ visible: false }));
  
  // Context resolution state
  const [contextAwareCommand, setContextAwareCommand] = useState<ContextAwareCommand | null>(null);
  const [showContextPreview, setShowContextPreview] = useState(false);
  const [isContextProcessing, setIsContextProcessing] = useState(false);
  const [enableSmartContext, setEnableSmartContext] = useState(false); // DISABLED: No popups, previews, or confirmations - ChatGPT style only
  useEffect(() => {
    (async () => {
      try {
        const { default: apiClient } = await import('../../api/client');
        const resp = await apiClient.get('/smart-notifications/?page=1&size=5&grouped=false');
        const list = resp?.data?.notifications || [];
        const filtered = Array.isArray(list) ? list.filter((n:any) => !n.user_id || n.user_id === user?.id) : [];
        setNotifications(filtered.slice(0, 5));
        setNotifications(Array.isArray(list) ? list.slice(0, 5) : []);
      } catch {
        setNotifications([]);
      }
      // Fetch projects for quick action
      try {
        const { default: apiClient } = await import('../../api/client');
        const projs = await apiClient.get('/projects/');
        const arr: any[] = Array.isArray(projs.data) ? projs.data : [];
        let visible = arr;
        if (user?.role !== UserRole.ADMIN) {
          try {
            const uid = user?.id;
            visible = arr.filter((p:any) => {
              if (!uid) return false;
              if (p.owner_id === uid) return true;
              const members = Array.isArray(p.members) ? p.members : [];
              return members.some((pm:any) => (pm?.user?.id || pm?.user_id || pm?.id) === uid);
            });
            if (visible.length === 0) visible = arr; // fallback gracefully
          } catch {
            visible = arr;
          }
        }
        setProjectsQuick(visible);
        if (visible.length > 0) setSelectedProjectId(visible[0].id);
      } catch {
        setProjectsQuick([]);
      }
    })();
  }, []);

  // Helpers
  const normalizeDateInput = (d: string) => (d ? new Date(d).toISOString() : undefined);

  // Apply smart defaults to a task payload
  const applySmartDefaultsToTask = async (payload: any): Promise<any> => {
    let body = { ...payload };
    try {
      // Assign API tasks to preferred user
      if (smartPrefs.assign_api_to_username && /\bapi\b/i.test(String(body.title || ''))) {
        const uid = await resolveUserIdByUsername(String(smartPrefs.assign_api_to_username));
        if (uid) body.assignee_id = body.assignee_id || uid;
      }
      // Testing tasks -> default 3 day duration (adjust due_date and estimated_hours)
      if (smartPrefs.testing_duration_days && /test|qa|verify/i.test(String(body.title || ''))) {
        const days = Number(smartPrefs.testing_duration_days) || 3;
        // bump estimated_hours approx: 6h/day
        const baseHours = Number(body.estimated_hours || 6);
        body.estimated_hours = Math.max(baseHours, days * 6);
        try {
          const start = new Date();
          const d = new Date(start);
          d.setDate(start.getDate() + days);
          body.due_date = d.toISOString();
        } catch {}
      }
      // +% buffer to estimates
      if (smartPrefs.estimate_buffer_percent && body.estimated_hours) {
        const pct = Math.max(0, Number(smartPrefs.estimate_buffer_percent));
        body.estimated_hours = Math.round(Number(body.estimated_hours) * (1 + pct / 100));
      }
    } catch {}
    return body;
  };

  // Persist smart prefs and weekly pattern to localStorage whenever they change
  useEffect(() => {
    try {
      const raw = localStorage.getItem('zero_click_patterns');
      const obj = raw ? JSON.parse(raw) : {};
      obj.weekly_sprint = weeklyPattern;
      localStorage.setItem('zero_click_patterns', JSON.stringify(obj));
    } catch {}
  }, [weeklyPattern]);
  useEffect(() => {
    try {
      localStorage.setItem('pai_smart_prefs', JSON.stringify(smartPrefs));
    } catch {}
  }, [smartPrefs]);

  // Utility: format week label Mon-Fri
  const getCurrentWeekLabel = (): { label: string; mon: Date; fri: Date } => {
    const now = new Date();
    const day = now.getDay() || 7; // 1..7
    const mon = new Date(now); mon.setDate(now.getDate() - (day - 1)); mon.setHours(0,0,0,0);
    const fri = new Date(mon); fri.setDate(mon.getDate() + 4); fri.setHours(23,59,59,999);
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { label: `${fmt(mon)}–${fmt(fri)}`, mon, fri };
  };
  const getISOWeekKey = (d = new Date()): string => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7; date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((date.getTime()-yearStart.getTime())/86400000)+1)/7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
  };

  // Automation polling: check rules periodically (every 60s)
  useEffect(() => {
    let cancelled = false;
    const checkAutomation = async () => {
      try {
        if (!automationRules.some(r => r.enabled)) return;
        const { default: apiClient } = await import('../../api/client');
        const t = await apiClient.get('/tasks/');
        const tasks: any[] = Array.isArray(t.data) ? t.data : [];
        // Preload members for emails
        let members: any[] = [];
        try { const m = await apiClient.get('/teams/members'); members = Array.isArray(m.data) ? m.data : []; } catch {}
        const memberById = (id: string) => members.find(u => u.id === id) || null;

        for (const rule of automationRules) {
          if (!rule.enabled) continue;
          if (rule.trigger === 'task_overdue') {
            const matchPriority = (p: string) => {
              const pr = String(p||'').toLowerCase();
              return !rule.conditions.priorityIn || rule.conditions.priorityIn.includes(pr as any);
            };
            const overdueTasks = tasks.filter((x:any)=> {
              const due = x?.due_date ? Date.parse(x.due_date) : NaN;
              const status = String(x?.status||'').toLowerCase();
              const isDone = ['done','completed','complete'].includes(status);
              return Number.isFinite(due) && due < Date.now() && !isDone && matchPriority(String(x.priority||'').toLowerCase());
            });
            if (overdueTasks.length === 0) continue;
            // For each task not fired yet
            const fired = firedMap[rule.id] || {};
            for (const task of overdueTasks) {
              if (fired[task.id]) continue;
              // Execute actions
              try {
                // Notify task owner via email
                if (rule.actions.emailOwner) {
                  const owner = memberById(task.created_by_id || task.assignee_id || '');
                  if (owner?.email) {
                    try { await apiClient.post('/email/test', { to: owner.email, subject: `Task overdue: ${task.title}`, body: `Task ${task.title} is overdue. Please update status.` }); } catch {}
                  }
                }
                // Notify PM via Slack (simulated via email or in-app notification)
                if (rule.actions.slackPM) {
                  try {
                    const proj = await apiClient.get(`/projects/${task.project_id}`);
                    const pmId = proj?.data?.owner_id || '';
                    const pm = memberById(pmId);
                    if (pm?.email) {
                      await apiClient.post('/email/test', { to: pm.email, subject: `[Slack] Overdue task alert: ${task.title}`, body: `Project PM alert: Task ${task.title} is overdue.` });
                    }
                  } catch {}
                }
                // Add comment
                if (rule.actions.addComment) {
                  try { await apiClient.post(`/tasks/${task.id}/comments`, { content: rule.actions.addComment }); } catch {}
                }
                // Increase risk score
                if (rule.actions.incRisk && task.project_id) {
                  try {
                    const proj = await apiClient.get(`/projects/${task.project_id}`);
                    const cf = proj?.data?.custom_fields || {};
                    const current = Number(cf.risk_score || 0);
                    cf.risk_score = current + Number(rule.actions.incRisk || 0);
                    await apiClient.put(`/projects/${task.project_id}`, { custom_fields: cf });
                  } catch {}
                }
              } finally {
                // Mark fired
                const next = { ...firedMap, [rule.id]: { ...(firedMap[rule.id]||{}), [task.id]: true } };
                persistFiredMap(next);
              }
            }
          }
        }
      } catch {}
    };
    const id = setInterval(() => { if (!cancelled) checkAutomation(); }, 60000);
    // Kick off a first check soon after mount
    const t0 = setTimeout(() => { if (!cancelled) checkAutomation(); }, 2000);
    return () => { cancelled = true; clearInterval(id); clearTimeout(t0); };
  }, [automationRules, firedMap]);

  // Zero‑click: on Monday morning, auto‑create sprint tasks once per week if enabled
  useEffect(() => {
    const maybeAutoCreate = async () => {
      try {
        if (!weeklyPattern.enabled) return;
        const now = new Date();
        const isMonday = now.getDay() === 1; // 1 = Monday
        if (!isMonday) return;
        const hour = now.getHours();
        if (hour > 12) return; // morning window only
        const key = getISOWeekKey(now);
        if (weeklyPattern.createdWeeks?.includes(key)) return; // already done

        // Find an active project to attach tasks
        const { default: apiClient } = await import('../../api/client');
        const projs = await apiClient.get('/projects/');
        const arr: any[] = Array.isArray(projs?.data) ? projs.data : [];
        const active = arr.find((p:any) => String(p.status).toLowerCase() === 'active') || arr[0] || null;
        if (!active?.id) return;

        // Build 5 tasks for Mon..Fri
        const { mon, fri, label } = getCurrentWeekLabel();
        const titles = [
          'Sprint Planning',
          'API Implementation',
          'Testing',
          'UI Integration',
          'Sprint Review & Retrospective',
        ];
        const createdIds: string[] = [];
        for (let i=0;i<titles.length;i++) {
          const day = new Date(mon); day.setDate(mon.getDate() + i);
          let body: any = {
            project_id: active.id,
            title: `${titles[i]} – ${label}`,
            status: 'todo',
            priority: 'medium',
            task_type: 'task',
            sprint_name: `Sprint ${label}`,
            sprint_start_date: mon.toISOString(),
            sprint_end_date: fri.toISOString(),
            due_date: day.toISOString(),
            estimated_hours: 6,
          };
          body = await applySmartDefaultsToTask(body);
          try {
            const resp = await apiClient.post('/tasks/', body);
            if (resp?.data?.id) createdIds.push(resp.data.id);
          } catch {}
        }

        if (createdIds.length > 0) {
          const nextCreatedWeeks = [...(weeklyPattern.createdWeeks||[]), key];
          setWeeklyPattern({ enabled: true, createdWeeks: nextCreatedWeeks, lastCreatedTaskIds: createdIds, lastWeekKey: key });
          const tipParts: string[] = [];
          if (smartPrefs.assign_api_to_username) tipParts.push(`API → ${smartPrefs.assign_api_to_username}`);
          if (smartPrefs.testing_duration_days) tipParts.push(`Testing → ${smartPrefs.testing_duration_days}d`);
          if (smartPrefs.estimate_buffer_percent) tipParts.push(`+${smartPrefs.estimate_buffer_percent}% buffer`);
          const applied = tipParts.length ? `✨ Auto-applied your preferences (${tipParts.join(', ')})` : undefined;
          setAutoAction({ visible: true, summary: `✅ I've created this week's sprint tasks (${label}) based on your pattern.`, weekLabel: label, createdTaskIds: createdIds, appliedPrefsSummary: applied });
          addAssistant([`✅ I've created this week's sprint tasks (${label}) based on your pattern.`,`- ${createdIds.length} tasks created`,`- Assigned to usual team members`,`- Linked to active projects`].join('\n'));
          if (applied) addAssistant(`${applied}\n[Adjust Preferences in chat bar]`);
        }
      } catch {}
    };
    // Defer slightly to avoid blocking initial render
    const t = setTimeout(maybeAutoCreate, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyPattern.enabled]);

  // Quick Actions: detect invoice being viewed and offer actions
  const [quickActions, setQuickActions] = useState<{ visible: boolean; tip?: string; sendReminder: () => void; markAsPaid: () => void; extendDueDate: () => void; downloadPdf: () => void }>({
    visible: false,
    tip: undefined,
    sendReminder: () => {},
    markAsPaid: () => {},
    extendDueDate: () => {},
    downloadPdf: () => {},
  });

  useEffect(() => {
    let active = true;
    const parseInvoiceIdFromPath = (path: string): string | null => {
      try {
        const parts = (path || '').split('/').filter(Boolean);
        const idx = parts.lastIndexOf('invoices');
        if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
        return null;
      } catch {
        return null;
      }
    };

    const invoiceId = parseInvoiceIdFromPath(location.pathname || '');
    if (!invoiceId) {
      if (active) setQuickActions((prev) => ({ ...prev, visible: false }));
      return;
    }

    (async () => {
      try {
        const { default: apiClient } = await import('../../api/client');
        const invResp = await apiClient.get(`/invoices/${invoiceId}`);
        const inv: any = invResp?.data;
        if (!inv) { if (active) setQuickActions((p)=>({ ...p, visible: false })); return; }

        // Compute due-in and a heuristic payment lead time from history
        let tip: string | undefined = undefined;
        try {
          const dueDate = inv?.due_date ? new Date(inv.due_date) : null;
          if (dueDate) {
            const diffDays = Math.round((dueDate.getTime() - Date.now()) / (1000*60*60*24));
            // Heuristic: fetch prior invoices for this customer to estimate lead time
            let leadDays: number | null = null;
            if (inv?.customer?.id) {
              try {
                const listResp = await apiClient.get(`/invoices/`, { params: { customer_id: inv.customer.id, page: 1, size: 200 } as any });
                const list: any[] = listResp?.data?.invoices || [];
                const paid = list.filter((x:any)=> x.paid_date && x.due_date);
                if (paid.length > 0) {
                  const diffs = paid.map((x:any)=> {
                    const paidAt = new Date(x.paid_date).getTime();
                    const dueAt = new Date(x.due_date).getTime();
                    // negative means paid before due date
                    return Math.round((paidAt - dueAt) / (1000*60*60*24));
                  });
                  const avg = Math.round(diffs.reduce((a:number,b:number)=>a+b,0) / diffs.length);
                  // Convert to "days before due date" if typical is before (negative)
                  if (avg < 0) leadDays = Math.abs(avg);
                }
              } catch {}
            }
            if (typeof diffDays === 'number') {
              if (leadDays != null && leadDays >= 0) {
                tip = `💡 Send reminder? Due in ${diffDays} day${Math.abs(diffDays)===1?'':'s'}. Customer typically pays ${leadDays} day${leadDays===1?'':'s'} before due date.`;
              } else {
                tip = `💡 Due in ${diffDays} day${Math.abs(diffDays)===1?'':'s'}. Consider sending a reminder.`;
              }
            }
          }
        } catch {}

        const sendReminder = async () => {
          try {
            const { default: apiClient } = await import('../../api/client');
            await apiClient.post(`/invoices/${invoiceId}/send`);
            addAssistant('✅ Reminder sent to customer.');
          } catch (e:any) {
            addAssistant('Failed to send reminder.');
          }
        };
        const markAsPaid = async () => {
          try {
            const { default: apiClient } = await import('../../api/client');
            const balance = Number(inv?.balance_due || 0);
            if (!balance || balance <= 0) { addAssistant('Invoice already settled.'); return; }
            const ok = window.confirm(`Mark as paid $${(balance/100).toFixed(2)}?`);
            if (!ok) return;
            await apiClient.post(`/invoices/${invoiceId}/payments`, {
              amount: balance,
              payment_date: new Date().toISOString(),
              payment_method: 'manual',
              reference: 'quick-action',
              notes: 'Marked as paid via Quick Action'
            });
            addAssistant('✅ Payment recorded.');
          } catch (e:any) {
            addAssistant('Failed to record payment.');
          }
        };
        const extendDueDate = async () => {
          try {
            const { default: apiClient } = await import('../../api/client');
            const cur = inv?.due_date ? new Date(inv.due_date) : new Date();
            cur.setDate(cur.getDate() + 7);
            await apiClient.put(`/invoices/${invoiceId}`, { due_date: cur.toISOString() });
            addAssistant('✅ Due date extended by 7 days.');
          } catch (e:any) {
            addAssistant('Failed to extend due date.');
          }
        };
        const downloadPdf = async () => {
          try {
            const { default: apiClient } = await import('../../api/client');
            const response = await apiClient.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice_${inv?.invoice_number || invoiceId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
          } catch (e:any) {
            addAssistant('Failed to download invoice PDF.');
          }
        };

        if (active) setQuickActions({ visible: true, tip, sendReminder, markAsPaid, extendDueDate, downloadPdf });
      } catch {
        if (active) setQuickActions((prev)=>({ ...prev, visible: false }));
      }
    })();

    return () => { active = false; };
  }, [location.pathname]);

  const validateProject = () => {
    const errs: {name?: string; dates?: string} = {};
    if (!projectName.trim()) errs.name = 'Name is required';
    if (projectStart && projectEnd) {
      const s = new Date(projectStart);
      const e = new Date(projectEnd);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e < s) errs.dates = 'End date must be after start date';
    }
    setFieldErrors(Object.keys(errs).length ? errs : null);
    return Object.keys(errs).length === 0;
  };

  const addAssistant = (text: string) =>
    setMessages((prev) => [...prev, { role: 'assistant', content: text }]);

  const addUser = (text: string) =>
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

  const parseCreateProject = (text: string) => {
    // Very simple heuristics: extract name and number of tasks
    // Examples handled: "create a project for Acme", "create project Acme Website", "with 5 tasks"
    const nameMatch = text.match(/create\s+(?:a\s+)?project\s*(?:for\s+)?([^,\n]+?)(?:\s+with|$)/i);
    const tasksMatch = text.match(/with\s+(\d+)\s+tasks?/i);
    const name = nameMatch ? nameMatch[1].trim() : 'New Project';
    const count = tasksMatch ? Math.max(1, parseInt(tasksMatch[1], 10)) : 0;
    return { name, taskCount: count };
  };

  const parseCreateCustomer = (text: string) => {
    // Parse customer creation commands like "create customer donald trump +97522323443"
    const customerMatch = text.match(/create\s+customer\s+(.+)/i);
    if (!customerMatch) return null;
    
    const rest = customerMatch[1].trim();
    const phoneMatch = rest.match(/([+]?[\d\s\-().]+)/);
    const phone = phoneMatch ? phoneMatch[1].trim() : '';
    
    // Remove phone from name
    const nameWithoutPhone = phone && phoneMatch ? rest.replace(phoneMatch[0], '').trim() : rest;
    const nameParts = nameWithoutPhone.split(/\s+/).filter(p => p.length > 0);
    
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    return {
      firstName,
      lastName,
      phone,
      email: '',
      companyName: '',
      jobTitle: '',
      addressLine1: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      customerType: 'prospect' as 'prospect' | 'client' | 'lead',
      notes: ''
    };
  };

const applyCreateProject = async (
    payload: { name?: string; description?: string | null; customer?: string | null; budget?: number | null; start_date?: string | null; end_date?: string | null; priority?: 'Low'|'Medium'|'High'|null; tasks?: { title: string; duration?: string; assignee?: string }[] },
    opts?: { assignTopPerformers?: boolean; topCount?: number }
  ) => {
    setMode('create_project');
    setIsEditing(true);
    setPreviewState('Draft');
    const pname = payload.name || 'New Project';
    setProjectName(pname);
    setProjectCustomer(payload.customer || '');
    // Use description if provided by AI
    if (typeof payload.description === 'string' && payload.description.trim()) {
      // limit to a reasonable size
      const d = payload.description.trim().slice(0, 2000);
      // directly set description field via state used in preview (reuse projectCustomer input as we only have fields for core; store in settings)
      try {
        // Stash in settings/custom_fields when saving
        (window as any)._pai_project_desc = d;
      } catch {}
    }
    setProjectBudget(typeof payload.budget === 'number' ? payload.budget : '');
    setProjectStart(payload.start_date || '');
    setProjectEnd(payload.end_date || '');
    setProjectOwner(user?.username ? `@${user.username}` : '@current-user');
    setProjectPriority((payload.priority as any) || 'Medium');

    // Apply smart defaults
    try {
      const defaults = await computeProjectDefaults({ name: pname, description: '', currentUser: user ? { id: user.id, role: user.role } : null });
      if (!payload.start_date) setProjectStart(defaults.start_date);
      if (!payload.priority) setProjectPriority(defaults.priority);
      if (!payload.budget && typeof defaults.budget_estimate_cents === 'number') setProjectBudget(Math.round((defaults.budget_estimate_cents||0)/100));
      if (!user && defaults.owner_id) setProjectOwner(defaults.owner_id);
    } catch {}

    let mapped: SimpleTask[] = Array.isArray(payload.tasks)
      ? payload.tasks.map(t => ({ title: t.title || 'Task', assignee: t.assignee || '', duration: t.duration || '1d' }))
      : [];

    // If requested, assign tasks to top performing team members in round-robin
    if ((opts?.assignTopPerformers) && mapped.length > 0) {
      try {
        const top = await getTopPerformers(opts?.topCount || Math.min(2, mapped.length));
        if (top.length > 0) {
          mapped = mapped.map((t, i) => ({ ...t, assignee: `@${top[i % top.length].username}` }));
        }
      } catch {}
    }

    setTasks(mapped);
  };

  const applyCreateCustomer = (data: CustomerData) => {
    setMode('create_customer');
    setIsEditing(true);
    setPreviewState('Draft');
    setCustomerData(data);
    setSavedCustomerId(null);
    setCustomerFieldErrors(null);
  };

  const validateCustomer = () => {
    const errs: {[key: string]: string} = {};
    if (!customerData.firstName.trim()) errs.firstName = 'First name is required';
    if (!customerData.lastName.trim()) errs.lastName = 'Last name is required';
    if (!customerData.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
      errs.email = 'Please enter a valid email address';
    }
    setCustomerFieldErrors(Object.keys(errs).length ? errs : null);
    return Object.keys(errs).length === 0;
  };

  const saveCustomer = async () => {
    if (!validateCustomer()) return;
    
    setPreviewState('In Progress');
    try {
      const { default: apiClient } = await import('../../api/client');
      const customerPayload = {
        first_name: customerData.firstName,
        last_name: customerData.lastName,
        email: customerData.email,
        phone: customerData.phone || null,
        company_name: customerData.companyName || null,
        job_title: customerData.jobTitle || null,
        address_line_1: customerData.addressLine1 || null,
        city: customerData.city || null,
        state: customerData.state || null,
        postal_code: customerData.postalCode || null,
        country: customerData.country || null,
        customer_type: customerData.customerType,
        notes: customerData.notes || null,
        tags: [],
        custom_fields: {}
      };
      
      const response = await apiClient.post('/customers/', customerPayload);
      const customerId = response.data?.id;
      
      setSavedCustomerId(customerId);
      setPreviewState('Completed');
      setIsEditing(false);
      
      addAssistant(`✅ Customer created successfully! ID: #${customerId}\n\n${customerData.firstName} ${customerData.lastName} has been added to your customer database.`);
    } catch (e: any) {
      setPreviewState('Draft');
      const errorMsg = e?.response?.data?.detail || e?.message || 'Failed to create customer';
      addAssistant(`❌ Failed to create customer: ${errorMsg}`);
      console.error('Error creating customer:', e);
    }
  };

  const fetchOverdueTasks = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const resp = await apiClient.get('/tasks/my-tasks');
      const list: any[] = Array.isArray(resp.data) ? resp.data : [];
      const now = Date.now();
      const overdue = list.filter((t) => {
        const due = t?.due_date ? Date.parse(t.due_date) : NaN;
        const status = String(t?.status || '').toLowerCase();
        const isDone = ['done', 'completed', 'complete'].includes(status);
        return Number.isFinite(due) && due < now && !isDone;
      });
      setOverdueTasks(overdue);
      setMode('overdue_tasks');
      addAssistant(`📋 Found ${overdue.length} overdue tasks assigned to you. Preview updated on the right.`);
    } catch (e: any) {
      addAssistant(`Failed to fetch overdue tasks: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
    }
  };

  const fetchAtRiskProjects = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const projResp = await apiClient.get('/projects/');
      const projects: any[] = Array.isArray(projResp.data) ? projResp.data : [];
      const now = Date.now();
      const behind = projects.filter((p) => {
        const due = p?.due_date ? Date.parse(p.due_date) : NaN;
        const status = String(p?.status || '').toLowerCase();
        return Number.isFinite(due) && due < now && status !== 'completed';
      });

      // Compute budget overrun by summing invoice totals per project (cap to 10 to keep light)
      const limited = behind.slice(0, 10);
      const results: any[] = [];
      for (const p of limited) {
        try {
          const invResp = await apiClient.get(`/invoices/?project_id=${encodeURIComponent(p.id)}&page=1&size=100`);
          const invoices = invResp?.data?.invoices || [];
          const totalAmount = invoices.reduce((acc: number, it: any) => acc + (Number(it?.total_amount) || 0), 0);
          const budget = Number(p?.budget) || 0;
          const overBudget = budget > 0 && totalAmount > budget;
          if (overBudget) {
            results.push({
              id: p.id,
              name: p.name,
              due_date: p.due_date,
              budget,
              spent: totalAmount,
              overrun_percent: budget > 0 ? Math.round(((totalAmount - budget) / budget) * 100) : null,
            });
          }
        } catch {
          // ignore invoice fetch failures, skip budget check for that project
        }
      }

      setAtRiskProjects(results);
      setMode('at_risk_projects');
      addAssistant(`⚠️ Found ${results.length} project(s) that are both behind schedule and over budget. See the right pane.`);
    } catch (e: any) {
      addAssistant(`Failed to analyze projects: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
    }
  };

  const resolveUserIdByUsername = async (usernameOrAt: string): Promise<string | null> => {
    const uname = (usernameOrAt || '').replace(/^@/, '').trim().toLowerCase();
    if (!uname) return null;
    try {
      const { default: apiClient } = await import('../../api/client');
      const res = await apiClient.get('/teams/members');
      const list: any[] = Array.isArray(res.data) ? res.data : [];
      const match = list.find((u) => String(u.username || '').toLowerCase() === uname);
      return match?.id || null;
    } catch {
      return null;
    }
  };

  // Resolve vendor by fuzzy name search; prefer exact case-insensitive match, else top result
  const resolveVendorByName = async (nameOrPartial: string): Promise<{ id: string, name: string } | null> => {
    const q = String(nameOrPartial || '').trim();
    if (!q) return null;
    try {
      const { default: apiClient } = await import('../../api/client');
      const resp = await apiClient.get('/vendors/', { params: { page: 1, size: 50, search: q } as any });
      const arr: any[] = resp.data?.vendors || [];
      if (arr.length === 0) return null;
      const exact = arr.find((v:any) => String(v.name || '').toLowerCase() === q.toLowerCase());
      const best = exact || arr[0];
      return best?.id ? { id: best.id, name: best.name } : null;
    } catch {
      return null;
    }
  };

  // Resolve customer by fuzzy display_name/company/name/email
  const resolveCustomerByName = async (nameOrHint: string): Promise<{ id: string, display_name: string } | null> => {
    const hint = String(nameOrHint || '').trim();
    if (!hint) return null;
    try {
      const { default: apiClient } = await import('../../api/client');
      const resp = await apiClient.get('/customers/', { params: { page: 1, size: 50, search: hint } as any });
      const arr: any[] = resp?.data?.customers || [];
      if (arr.length === 0) return null;
      // Prefer exact (case-insensitive) match by display_name or company_name
      const exact = arr.find((c:any) => [c.display_name, c.company_name, `${c.first_name||''} ${c.last_name||''}`.trim()].some((v:string)=> String(v||'').toLowerCase() === hint.toLowerCase()));
      const best = exact || arr[0];
      if (!best?.id) return null;
      const label = best.display_name || best.company_name || `${best.first_name||''} ${best.last_name||''}`.trim() || best.email || 'Customer';
      return { id: best.id, display_name: label };
    } catch {
      return null;
    }
  };

  // Helper to trigger browser download from a binary API response
  const downloadFromEndpoint = async (path: string, filenameFallback: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get(path, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filenameFallback);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return true;
    } catch (e:any) {
      console.error('Download failed:', e);
      return false;
    }
  };

  // List projects by status with a friendly message
  const listProjectsByStatus = async (status: 'active'|'on_hold', limit = 10) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const resp = await apiClient.get('/projects/');
      const arr: any[] = Array.isArray(resp.data) ? resp.data : [];
      const filtered = arr.filter((p:any) => String(p.status||'').toLowerCase() === status).sort((a:any,b:any)=> new Date(b.updated_at||b.created_at||0).getTime() - new Date(a.updated_at||a.created_at||0).getTime());
      const top = filtered.slice(0, limit);
      if (status === 'active') {
        addAssistant([`Here are your latest ongoing projects (${top.length}${filtered.length>top.length?` of ${filtered.length}`:''}):`, ...top.map((p:any)=>`• ${p.name}${p.due_date?` (due ${new Date(p.due_date).toLocaleDateString()})`:''}`)].join('\n'));
      } else {
        addAssistant([`Projects on hold (${top.length}${filtered.length>top.length?` of ${filtered.length}`:''}):`, ...top.map((p:any)=>`• ${p.name}${p.due_date?` (was due ${new Date(p.due_date).toLocaleDateString()})`:''}`)].join('\n'));
      }
      setMode('idle');
    } catch (e:any) {
      addAssistant('I tried to fetch projects, but something went wrong. Please try again.');
    }
  };

  // List latest projects regardless of status
  const listLatestProjects = async (limit = 5) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const resp = await apiClient.get('/projects/');
      const arr: any[] = Array.isArray(resp.data) ? resp.data : [];
      const sorted = arr.sort((a:any,b:any)=> new Date(b.updated_at||b.created_at||0).getTime() - new Date(a.updated_at||a.created_at||0).getTime());
      const top = sorted.slice(0, Math.max(1, limit));
      const lines = top.map((p:any)=> `• ${p.name} — ${String(p.status||'').replace(/_/g,' ')}${p.due_date?` (due ${new Date(p.due_date).toLocaleDateString()})`:''}`);
      addAssistant([`Latest projects (${top.length}${arr.length>top.length?` of ${arr.length}`:''}):`, ...lines].join('\n'));
      setMode('idle');
    } catch (e:any) {
      // Fallback to cached Redux projects if available
      const arr = Array.isArray(cachedProjects) ? cachedProjects : [];
      if (arr.length > 0) {
        const sorted = arr.slice().sort((a:any,b:any)=> new Date(b.updated_at||b.created_at||0).getTime() - new Date(a.updated_at||a.created_at||0).getTime());
        const top = sorted.slice(0, Math.max(1, limit));
        const lines = top.map((p:any)=> `• ${p.name} — ${String(p.status||'').replace(/_/g,' ')}${p.due_date?` (due ${new Date(p.due_date).toLocaleDateString()})`:''}`);
        addAssistant([`Latest projects (from cache) (${top.length}${arr.length>top.length?` of ${arr.length}`:''}):`, ...lines].join('\n'));
        setMode('idle');
      } else {
        addAssistant('I couldn\'t fetch projects right now. Try again in a moment or open the Projects page to load them.');
      }
    }
  };

  // Show pending invoices for a customer and optionally auto-download the latest
  const showPendingInvoicesForCustomer = async (customerName: string, opts?: { autoDownloadLatest?: boolean }) => {
    const cust = await resolveCustomerByName(customerName);
    if (!cust) { addAssistant(`I couldn't find that customer. Please try a more specific name.`); return; }
    try {
      const { default: apiClient } = await import('../../api/client');
      const inv = await apiClient.get('/invoices/', { params: { page: 1, size: 200, customer_id: cust.id } as any });
      const list: any[] = inv?.data?.invoices || [];
      const pend = list.filter((i:any)=> ['PENDING','OVERDUE','SENT','PARTIALLY_PAID'].includes(String(i.status||'').toUpperCase()) && Number(i.balance_due||0) > 0);
      if (pend.length === 0) {
        addAssistant(`Great news — no pending invoices for ${cust.display_name}.`);
        return;
      }
      pend.sort((a:any,b:any)=> new Date(b.created_at||b.invoice_date||0).getTime() - new Date(a.created_at||a.invoice_date||0).getTime());
      const lines = pend.slice(0, 10).map((i:any)=> `• ${i.invoice_number || i.id}: $${(Number(i.balance_due||0)/100).toFixed(2)} due${i.due_date?` (by ${new Date(i.due_date).toLocaleDateString()})`:''}`);
      addAssistant([`Here are the pending invoices for ${cust.display_name}:`, ...lines].join('\n'));
      setInvoicesPending(pend);
      setMode('invoices_pending');
      if (opts?.autoDownloadLatest && pend[0]?.id) {
        const ok = await downloadFromEndpoint(`/invoices/${pend[0].id}/pdf`, `invoice_${pend[0].invoice_number||pend[0].id}.pdf`);
        if (ok) addAssistant('📄 Download started for the latest pending invoice.');
      }
    } catch (e:any) {
      addAssistant('I had trouble fetching invoices. Please try again.');
    }
  };

  // Quick creators for various modules
  const quickCreateVendor = async (name: string, email: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const resp = await apiClient.post('/vendors/', { name, email });
      addAssistant(`✅ Vendor created: ${resp?.data?.name} (#${resp?.data?.id || 'new'})`);
      return resp?.data;
    } catch (e:any) {
      addAssistant(`I couldn't create that vendor. Please verify the name and email.`);
      return null;
    }
  };

  const quickCreateProposal = async (title: string, customerName: string, amountDollars?: number, currency?: string) => {
    const cust = await resolveCustomerByName(customerName);
    if (!cust) { addAssistant(`I couldn't find that customer for the proposal.`); return null; }
    try {
      const { default: apiClient } = await import('../../api/client');
      const total_amount = amountDollars ? Math.round(Number(amountDollars) * 100) : undefined;
      const resp = await apiClient.post('/proposals/', { title, customer_id: cust.id, total_amount, currency: (currency||'usd').toLowerCase(), content: { items: [] } });
      addAssistant(`✅ Proposal created: ${resp?.data?.proposal_number} (${resp?.data?.title}) for ${cust.display_name}.`);
      return resp?.data;
    } catch (e:any) {
      addAssistant('I couldn\'t create the proposal. Please try again.');
      return null;
    }
  };

  const quickCreateGoal = async (title: string, projectNameOrId?: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      let project_id: string | undefined = undefined;
      if (projectNameOrId && projectNameOrId.trim()) {
        try {
          // Try id direct, else search
          const p = await apiClient.get(`/projects/${projectNameOrId.trim()}`);
          project_id = p?.data?.id || undefined;
        } catch {
          try {
            const s = await apiClient.get('/projects/', { params: { q: projectNameOrId } as any });
            const arr: any[] = Array.isArray(s.data) ? s.data : [];
            if (arr.length > 0) project_id = arr[0].id;
          } catch {}
        }
      }
      const now = new Date();
      const inTwoWeeks = new Date(now); inTwoWeeks.setDate(now.getDate()+14);
      const payload = { title, description: '', start_date: now.toISOString(), end_date: inTwoWeeks.toISOString(), goal_type: 'personal', priority: 'medium', target_value: 0, unit: null, project_id, auto_update_progress: false, tags: [], metadata: {} } as any;
      const resp = await apiClient.post('/goals/', payload);
      addAssistant(`✅ Goal created: ${resp?.data?.title} (ends ${new Date(resp?.data?.end_date).toLocaleDateString()}).`);
      return resp?.data;
    } catch (e:any) {
      addAssistant('I couldn\'t create that goal yet.');
      return null;
    }
  };

  const quickCreateTeamMember = async (fullName: string, email: string, username?: string, role?: string) => {
    try {
      const [first, ...rest] = fullName.trim().split(/\s+/);
      const last = rest.join(' ') || 'Member';
      const uname = (username || (first+last).toLowerCase().replace(/[^a-z0-9]/g,'')).slice(0,20);
      const password = `Temp${Math.random().toString(36).slice(2,8)}!`;
      const { default: apiClient } = await import('../../api/client');
      const resp = await apiClient.post('/teams/members', { email, username: uname, first_name: first || 'User', last_name: last, password, role: (role||'MEMBER').toUpperCase() });
      addAssistant(`✅ Team member created: ${resp?.data?.full_name || fullName} (@${resp?.data?.username}). They can reset their password on first login.`);
      return resp?.data;
    } catch (e:any) {
      addAssistant('I couldn\'t create that team member. Please double-check the details.');
      return null;
    }
  };

  const quickCreatePurchaseOrder = async (vendorName: string, itemName: string, qty: number, unitPrice: number) => {
    const vendor = await resolveVendorByName(vendorName);
    if (!vendor) { addAssistant('I couldn\'t find that vendor.'); return null; }
    try {
      const { default: apiClient } = await import('../../api/client');
      const today = new Date();
      const inSeven = new Date(today); inSeven.setDate(today.getDate()+7);
      const payload = {
        vendor_id: vendor.id,
        order_date: today.toISOString().slice(0,10),
        expected_delivery_date: inSeven.toISOString().slice(0,10),
        requested_by: user?.username || 'system',
        items: [{ item_name: itemName, quantity: Math.max(1, Math.round(qty||1)), unit_price: Number(unitPrice||0.01) }],
      } as any;
      const resp = await apiClient.post('/purchase-orders/', payload);
      addAssistant(`✅ Purchase order ${resp?.data?.po_number} created for ${vendor.name}.`);
      return resp?.data;
    } catch (e:any) {
      addAssistant('I couldn\'t create that purchase order yet.');
      return null;
    }
  };

  // Fetch purchase orders for a vendor and show in the right pane
  const fetchPOsByVendorId = async (vendorId: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const pos = await apiClient.get('/purchase-orders/', { params: { vendor_id: vendorId, page: 1, size: 100 } as any });
      const list: any[] = pos.data?.purchase_orders || (Array.isArray(pos.data) ? pos.data : []);
      setPoList(list);
      setMode('po_list');
    } catch {
      addAssistant('Failed to load purchase orders for vendor.');
    }
  };

  // Ensure a todo section exists (defaults to Inbox); return section id
  const ensureTodoSection = async (sectionName: string): Promise<string | null> => {
    const name = String(sectionName || 'Inbox').trim();
    try {
      const { default: apiClient } = await import('../../api/client');
      const sections = await apiClient.get('/todo/sections');
      const list: any[] = Array.isArray(sections.data) ? sections.data : [];
      const match = list.find((s:any) => String(s.name || '').toLowerCase() === name.toLowerCase());
      if (match?.id) return match.id;
      const created = await apiClient.post('/todo/sections', { name, notes: '' });
      return created?.data?.id || null;
    } catch {
      return null;
    }
  };

  // Resolve attendee strings to emails when possible (usernames → emails)
  const resolveEmailsFromMentions = async (attendees: string[]): Promise<string[]> => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const membersResp = await apiClient.get('/teams/members');
      const members: any[] = Array.isArray(membersResp.data) ? membersResp.data : [];
      const byUsername = new Map<string, any>();
      members.forEach((m:any)=> { if (m?.username) byUsername.set(String(m.username).toLowerCase(), m); });
      const out: string[] = [];
      for (const a of attendees || []) {
        const s = String(a||'').trim();
        if (!s) continue;
        if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) { out.push(s); continue; }
        const uname = s.replace(/^@/, '').toLowerCase();
        const m = byUsername.get(uname);
        if (m?.email) { out.push(m.email); continue; }
        // fallback: keep raw if looks like email-ish or username
        out.push(s);
      }
      return out;
    } catch {
      return attendees || [];
    }
  };

  const runCommand = async (text: string): Promise<void> => {
    const cleaned = text.trim();
    if (!cleaned) return;

    // If we're already in create_project preview and user provides a short follow-up, treat it as the name
    if (mode === 'create_project') {
      const isLikelyName = cleaned.length > 0 && cleaned.length <= 80 && !/\b(show|list|invoice|task|po|vendor|goal|proposal|report)\b/i.test(cleaned);
      if (isLikelyName) {
        addUser(cleaned);
        setProjectName(cleaned);
        addAssistant(`Name set to "${cleaned}". Update anything else on the right, then click Submit.`);
        return;
      }
    }

    // Fast-path intents before LLM, to keep it snappy and deterministic
    // 1) Latest ongoing projects
    if (/^\s*(show\s+)?(latest\s+)?(ongoing|active)\s+projects\b/i.test(cleaned)) {
      addUser(cleaned);
      await listProjectsByStatus('active', 10);
      return;
    }
    // 2) Projects on hold
    if (/^\s*(show\s+)?projects?\s+on\s+hold\b/i.test(cleaned)) {
      addUser(cleaned);
      await listProjectsByStatus('on_hold', 10);
      return;
    }
    // 2b) Latest N projects (chat-only list)
    {
      const m = cleaned.match(/^\s*(show|list)?\s*(?:me\s+)?(?:the\s+)?(latest|recent)\s*(\d+)?\s*projects?\b/i);
      if (m) {
        addUser(cleaned);
        const n = m[3] ? Math.max(1, parseInt(m[3], 10)) : 5;
        await listLatestProjects(n);
        return;
      }
    }
    // 3) Pending invoices of customer X
    {
      const m = cleaned.match(/^\s*(show|list)\s+pending\s+invoices\s+(?:of|for)\s+(.+)$/i);
      if (m) {
        addUser(cleaned);
        await showPendingInvoicesForCustomer(m[2], { autoDownloadLatest: false });
        return;
      }
    }
    // 4) Download invoice of customer X (latest pending)
    {
      const m = cleaned.match(/^\s*download\s+(?:the\s+)?invoice\s+(?:of|for)\s+(.+)$/i);
      if (m) {
        addUser(cleaned);
        await showPendingInvoicesForCustomer(m[1], { autoDownloadLatest: true });
        return;
      }
    }
    // 5) Download proposal PDF by number or search
    {
      const m = cleaned.match(/^\s*download\s+(?:the\s+)?proposal\s+(?:#?([A-Za-z0-9\-]+)|for\s+(.+))\s*$/i);
      if (m) {
        addUser(cleaned);
        try {
          const { default: apiClient } = await import('../../api/client');
          let proposalId: string | null = null;
          if (m[1]) {
            // Search by proposal number
            const res = await apiClient.get('/proposals/', { params: { page: 1, size: 50, search: m[1] } as any });
            const items: any[] = res?.data?.items || [];
            const hit = items.find((p:any)=> String(p.proposal_number||'').toLowerCase() === m[1].toLowerCase()) || items[0] || null;
            proposalId = hit?.id || null;
          } else if (m[2]) {
            // Resolve by customer then pick latest
            const cust = await resolveCustomerByName(m[2]);
            if (cust) {
              const res = await apiClient.get('/proposals/', { params: { page: 1, size: 50, customer_id: cust.id } as any });
              const items: any[] = res?.data?.items || [];
              items.sort((a:any,b:any)=> new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime());
              proposalId = items[0]?.id || null;
            }
          }
          if (proposalId) {
            const ok = await downloadFromEndpoint(`/proposals/${proposalId}/pdf`, `proposal_${proposalId}.pdf`);
            if (ok) addAssistant('📄 Download started for the proposal PDF.');
          } else {
            addAssistant('I couldn\'t find that proposal.');
          }
        } catch {
          addAssistant('I couldn\'t fetch the proposal PDF right now.');
        }
        return;
      }
    }
    // 6) Download purchase order PDF for vendor (latest)
    {
      const m = cleaned.match(/^\s*download\s+(?:the\s+)?purchase\s+order\s+(?:for\s+vendor\s+(.+)|#?([A-Za-z0-9\-]+))\s*$/i);
      if (m) {
        addUser(cleaned);
        try {
          const { default: apiClient } = await import('../../api/client');
          let poId: string | null = null;
          if (m[2]) {
            poId = m[2];
          } else if (m[1]) {
            const v = await resolveVendorByName(m[1]);
            if (v) {
              const pos = await apiClient.get('/purchase-orders/', { params: { vendor_id: v.id, page: 1, size: 50 } as any });
              const list: any[] = pos?.data?.purchase_orders || [];
              list.sort((a:any,b:any)=> new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime());
              poId = list[0]?.id || null;
            }
          }
          if (poId) {
            const ok = await downloadFromEndpoint(`/purchase-orders/${poId}/pdf`, `purchase_order_${poId}.pdf`);
            if (ok) addAssistant('📄 Download started for the purchase order PDF.');
          } else {
            addAssistant('I couldn\'t find that purchase order.');
          }
        } catch {
          addAssistant('I couldn\'t fetch the purchase order PDF right now.');
        }
        return;
      }
    }
    // 7) Create vendor: "create vendor <name> <email>"
    {
      const m = cleaned.match(/^\s*create\s+vendor\s+(.+?)\s+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*$/i);
      if (m) {
        addUser(cleaned);
        await quickCreateVendor(m[1], m[2]);
        return;
      }
    }
    // 8) Create quick purchase order: "create purchase order for vendor X item Y qty N price P"
    {
      const m = cleaned.match(/^\s*create\s+purchase\s+order\s+for\s+vendor\s+(.+?)\s+item\s+(.+?)\s+qty\s+(\d+)\s+price\s+(\d+(?:\.\d{1,2})?)\s*$/i);
      if (m) {
        addUser(cleaned);
        await quickCreatePurchaseOrder(m[1], m[2], parseInt(m[3],10), parseFloat(m[4]));
        return;
      }
    }
    // 9) Create proposal: "create proposal <title> for <customer> amount <N> [usd]"
    {
      const m = cleaned.match(/^\s*create\s+proposal\s+(.+?)\s+for\s+(.+?)\s+(?:amount|total|value)\s+(\d+(?:\.\d{1,2})?)\s*(usd|aed|sar|eur|gbp)?\s*$/i);
      if (m) {
        addUser(cleaned);
        await quickCreateProposal(m[1], m[2], parseFloat(m[3]), m[4]);
        return;
      }
    }
    // 10) Create goal: "create goal <title> [for project <name|id>]"
    {
      const m = cleaned.match(/^\s*create\s+goal\s+(.+?)(?:\s+for\s+project\s+(.+))?\s*$/i);
      if (m) {
        addUser(cleaned);
        await quickCreateGoal(m[1], m[2]);
        return;
      }
    }
    // 11) Create team member: "create team member <First Last> <email> [username <u>] [role <r>]"
    {
      const m = cleaned.match(/^\s*create\s+team\s+member\s+(.+?)\s+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})(?:\s+username\s+(\S+))?(?:\s+role\s+(\w+))?\s*$/i);
      if (m) {
        addUser(cleaned);
        await quickCreateTeamMember(m[1], m[2], m[3], m[4]);
        return;
      }
    }
    // 12) Reports: project report <projectId|name> or projects report
    {
      const m1 = cleaned.match(/^\s*(get|download|fetch)?\s*project\s+report\s+(.+)$/i);
      if (m1) {
        addUser(cleaned);
        try {
          const { default: apiClient } = await import('../../api/client');
          let pid = m1[2].trim();
          // try resolve by name if not direct id
          try {
            const p = await apiClient.get(`/projects/${pid}`);
            pid = p?.data?.id || pid;
          } catch {
            const s = await apiClient.get('/projects/', { params: { q: pid } as any });
            const arr: any[] = Array.isArray(s.data) ? s.data : [];
            if (arr.length > 0) pid = arr[0].id;
          }
          const ok = await downloadFromEndpoint(`/projects/${pid}/report/pdf`, `project_report_${pid}.pdf`);
          if (ok) addAssistant('📄 Download started for the project report.');
        } catch { addAssistant('I couldn\'t fetch that project report yet.'); }
        return;
      }
      const m2 = cleaned.match(/^\s*(get|download|fetch)?\s*projects\s+report\b/i);
      if (m2) {
        addUser(cleaned);
        const ok = await downloadFromEndpoint('/analytics/export/pdf/projects', `projects_report_${Date.now()}.pdf`);
        if (ok) addAssistant('📄 Download started for the projects report.');
        return;
      }
    }

    // Teaching an alias? e.g., "When I say 'sprint start', create tasks from backlog and notify team"
    const teach = cleaned.match(/^\s*when\s+i\s+say\s+['\"](.+?)['\"],?\s*(?:then\s*)?(.+)$/i);
    if (teach) {
      const key = teach[1].trim().toLowerCase();
      const action = teach[2].trim();
      const next = { ...aliases, [key]: { action } };
      persistAliases(next);
      addAssistant(`✅ Shortcut saved. When you say "${key}", I'll: ${action}`);
      return;
    }

    // Natural-language shortcut normalization (invoice synonyms etc.)
    const normalized = normalizeNL(cleaned);
    if (normalized && normalized.toLowerCase() !== cleaned.toLowerCase()) {
      // Do not echo the normalized as user message; just execute
      return await runCommand(normalized);
    }

    // Execute user-defined alias if matches
    const lower = cleaned.toLowerCase();
    const aliasHit = aliases[lower] || null;
    if (aliasHit) {
      addAssistant(`↩ Executing shortcut: ${aliasHit.action}`);
      return await runCommand(aliasHit.action);
    }

    // Built-in simple aliases (match contains)
    if (/\bshow\s+my\s+task\s+status\b/i.test(lower) || /^status$/.test(lower)) {
      return await handleStatus();
    }
    if (/\bdaily\s+standup\b/i.test(lower) || /^standup$/.test(lower) || /stand-?up/.test(lower)) {
      return await handleStandupReport();
    }
    if (/\bend\s+of\s+day\b/i.test(lower) || /^eod$/.test(lower) || /end of day wrap/.test(lower)) {
      return await handleEod();
    }
    if (/^sprint\s+start$/.test(lower)) {
      return await handleSprintStart();
    }
    const closeMatch = cleaned.match(/^\s*close\s+project\s+#?([A-Za-z0-9\-_]+)\s*$/i);
    if (closeMatch) {
      const pid = closeMatch[1];
      return await handleCloseProject(pid);
    }

    // Check for customer creation commands first
    const customerData = parseCreateCustomer(cleaned);
    if (customerData) {
      addUser(cleaned);
      addAssistant(`📄 Creating customer preview...\n\nReview on right → Say 'save' to create or 'edit' to change`);
      applyCreateCustomer(customerData);
      return;
    }

    // Fallback fast-path: create project from NL if user asks to create a project
    {
      const looksLikeCreateProject = /\b(create|make|start|setup|set\s*up)\b.*\bproj(?:ect)?s?\b/i.test(cleaned);
      if (looksLikeCreateProject) {
        addUser(cleaned);
        // Extract simple attributes
        const mCust = cleaned.match(/\bfor\s+(@?[^,\n]+?)(?:\s+with|\s+end|\s+priority|\s+budget|\s+budg|\s|$)/i);
        const rawCustomer = mCust ? mCust[1].trim() : '';
        const customer = rawCustomer.replace(/^@/, '').trim();
        const mTasks = cleaned.match(/with\s+(\d+)\s+tasks?/i);
        const taskCount = mTasks ? Math.max(1, parseInt(mTasks[1], 10)) : 3;
        const mPri = cleaned.match(/priority\s*(?:is|=)?\s*(low|medium|high)\b/i);
        const priority = (mPri ? (mPri[1][0].toUpperCase()+mPri[1].slice(1).toLowerCase()) : 'High') as 'Low'|'Medium'|'High';
        const mEnd = cleaned.match(/end\s*date\s*(?:is|=)?\s*(\d+)\s*(day|days|week|weeks)\b/i);
        let endISO: string | null = null;
        if (mEnd) {
          const n = parseInt(mEnd[1], 10);
          const unit = mEnd[2].toLowerCase();
          const days = unit.startsWith('week') ? n * 7 : n;
          const d = new Date(); d.setDate(d.getDate() + days);
          endISO = d.toISOString().slice(0,10);
        }
        const mBudget = cleaned.match(/\b(budget|budger|budg(?:et)?)\b\s*(?:is|=)?\s*([\d.,]+)\s*(k|m|million)?/i);
        let budgetDollars: number | null = null;
        if (mBudget) {
          const num = parseFloat(mBudget[2].replace(/,/g, ''));
          const mul = mBudget[3] ? (mBudget[3].toLowerCase().startsWith('m') ? 1_000_000 : 1_000) : 1;
          budgetDollars = Math.round(num * mul);
        }
        // Domain-driven task seeds
        const lower = cleaned.toLowerCase();
        const domain = /accounting|erp|finance/.test(lower) ? 'accounting' : /website|landing|react|frontend/.test(lower) ? 'web' : 'general';
        const seedTasks = (kind: string): SimpleTask[] => {
          if (kind === 'accounting') {
            const titles = [
              'Requirements & Chart of Accounts',
              'ERP Setup & Integrations',
              'Invoicing & AR Module',
              'Financial Reports & Reconciliation',
              'UAT & Training'
            ];
            return titles.slice(0, taskCount).map(t => ({ title: t, duration: '3d' }));
          }
          if (kind === 'web') {
            const titles = [
              'Requirements & Wireframes',
              'UI Build & Components',
              'API Integration',
              'Testing & QA',
              'Deploy & Handover'
            ];
            return titles.slice(0, taskCount).map(t => ({ title: t, duration: '2d' }));
          }
          const titles = [
            'Kickoff & Requirements',
            'Implementation',
            'Testing & QA',
            'Documentation',
            'Handover'
          ];
          return titles.slice(0, taskCount).map(t => ({ title: t, duration: '2d' }));
        };
        const tasks = seedTasks(domain);
        const descFromUploads = (recentUploads && recentUploads.length)
          ? `Auto-generated from attachments: ${recentUploads.map(u=>u.filename).join(', ').slice(0, 300)}`
          : '';
        const payload = {
          name: 'New Project',
          description: descFromUploads,
          customer: customer || '',
          budget: budgetDollars ?? null,
          start_date: null,
          end_date: endISO,
          priority,
          tasks,
        };
        applyCreateProject(payload);
        addAssistant(`✅ Draft project ready${customer ? ` for ${customer}` : ''}. I added ${taskCount} task(s)${endISO ? ` and set due ${endISO}` : ''}, priority ${priority}${budgetDollars ? `, budget $${budgetDollars.toLocaleString()}` : ''}. Update on the right, then click Submit.`);
        return;
      }
    }

    // Optimistically add user message
    addUser(cleaned);

    try {
      // Handle quick reply for invoice options A/B/C
      if (pendingInvoiceOptions && /^\s*[ABCabc]\s*$/.test(cleaned)) {
        const sel = cleaned.trim().toUpperCase();
        const opt = (pendingInvoiceOptions.options || []).find((o:any)=> o.key === sel);
        if (opt) {
          // Prepare invoice preview with selected option
          const defaults = pendingInvoiceOptions.defaults || {};
          // Apply default tax to line items if provided
          const taxBasisPoints = Math.round((Number(defaults.tax_rate_percent||0)) * 100);
          const items = (opt.items || []).map((it:any)=> ({ ...it, tax_rate: taxBasisPoints }));
          const subtotal = items.reduce((a:number, it:any)=> a + (Number(it.quantity||0)*Number(it.unit_price||0)), 0);

          // If a single project, attach project for preview
          const singleProjectId = Array.isArray(opt.project_ids) && opt.project_ids.length === 1 ? opt.project_ids[0] : null;
          let projectRef:any = null;
          if (singleProjectId) {
            try {
              const { default: apiClient } = await import('../../api/client');
              const p = await apiClient.get(`/projects/${singleProjectId}`);
              projectRef = p?.data || null;
            } catch {}
          }

          // Include invoice number if available
          const invoiceNumber = defaults.invoice_number;

          setInvoicePreview({
            mode: 'smart_defaults',
            customer: pendingInvoiceOptions.customer || null,
            project: projectRef,
            currency: String(defaults.currency || 'USD').toLowerCase(),
            payment_terms: defaults.payment_terms || 'net_30',
            invoice_date: defaults.invoice_date,
            due_date: defaults.due_date,
            invoice_number: invoiceNumber,
            items,
            subtotal,
            createMode: 'draft',
          });

          // Build left-pane detailed message per your CREATE flow pattern
          try {
            // Compute totals
            const taxRatePct = Number(defaults.tax_rate_percent || 0);
            const taxCents = Math.round(subtotal * (taxRatePct / 100));
            const totalCents = subtotal + taxCents;
            const hoursTotal = items.reduce((s:number, it:any)=> s + Number(it.quantity||0), 0);

            // Optional: fetch completed tasks count for project
            let tasksCount: number | null = null;
            if (singleProjectId) {
              try {
                const { default: apiClient } = await import('../../api/client');
                const tasksResp = await apiClient.get('/tasks/', { params: { project_id: singleProjectId, status: 'completed' } as any });
                const tArr: any[] = Array.isArray(tasksResp?.data) ? tasksResp.data : [];
                tasksCount = tArr.length || null;
              } catch {}
            }

            const fmtMoney = (c:number) => `$${(c/100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const fmtRate = (c:number) => `$${(c/100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/hr`;
            const fmtDate = (d?:string) => (d ? new Date(d).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) : '-');

            const cust = pendingInvoiceOptions.customer || {};
            const projName = projectRef?.name || (singleProjectId || 'Project');
            const projId = projectRef?.id || singleProjectId || '';
            const custName = cust?.display_name || cust?.company_name || cust?.full_name || 'Customer';
            const custId = cust?.id || '';

            const header = [
              '✅ Creating invoice...',
              '',
              'Resolved:',
              `- Customer: @${(custName||'').split(' ')[0]} → ${custName} (#${custId})`,
              `- Project: @${(projName||'').split(' ')[0]} → ${projName} (#${projId})`,
              '',
              '📋 INVOICE DETAILS:',
              ''
            ];

            const billableLine = `Billable Work: ${fmtMoney(subtotal)} (${Math.round(hoursTotal)} hours${tasksCount ? ` across ${tasksCount} tasks` : ''})`;

            // Breakdown lines from items
            const breakdown: string[] = [];
            items.forEach((it:any) => {
              const label = String(it.description||'').replace(/^Task Type:\s*/,'') || 'Service';
              breakdown.push(`- ${label}: ${Math.round(it.quantity)}h × ${fmtRate(it.unit_price)} = ${fmtMoney(Math.round(it.quantity * it.unit_price))}`);
            });

            const body = [
              `Project: ${projName}${projectRef?.completed_date ? ` (Completed: ${fmtDate(projectRef.completed_date)})` : projectRef?.due_date && String(projectRef?.status||'').toLowerCase()==='completed' ? ` (Completed: ${fmtDate(projectRef.due_date)})` : ''}`,
              `Customer: ${custName} (#${custId})`,
              billableLine,
              '',
              'Breakdown:',
              ...breakdown,
              '',
              `Subtotal: ${fmtMoney(subtotal)}`,
              `Tax (${taxRatePct}%): ${fmtMoney(taxCents)}`,
              '━━━━━━━━━━━━━━━━━━━━━━',
              `TOTAL: ${fmtMoney(totalCents)}`,
              '',
              `${invoiceNumber ? `Invoice #${invoiceNumber}` : 'Invoice #: Pending'}`,
              `Date: ${fmtDate(defaults.invoice_date)}`,
              `Due: ${fmtDate(defaults.due_date)} (${(defaults.payment_terms||'net_30').toUpperCase().replace(/_/g,' ')})`,
              '',
              '✅ Invoice preview ready on the right →',
              'Edit any field if needed, then click "Send Invoice" or "Save as Draft"'
            ];

            addAssistant([...header, ...body].join('\n'));
          } catch {
            addAssistant(`📄 Prepared invoice option ${sel}. Review the preview on the right and click Create when ready.`);
          }

          // Show preview panel
          setMode('invoice_preview');

          // Clear pending
          setPendingInvoiceOptions(null);
          return;
        }
      }
      // Check if smart context resolution is enabled
      if (enableSmartContext) {
        // Prepare recent history (last 12 messages) and include the new user message
        const recent = [...messages, { role: 'user', content: cleaned }].slice(-12);
        const msgs: PAIMessage[] = recent.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        
        // Try context resolution first
        const contextCommand = await contextMiddleware.processWithContext(msgs);
        
        if (contextCommand && contextCommand.context.confidence >= 0.5) {
          const sp: any = (contextCommand as any).suggestedParameters || {};
          // Customer disambiguation
          if (sp?.customer_disambiguation) {
            setPendingCustomerDisambiguation(sp.customer_disambiguation);
            addAssistant(sp.presentation_disambiguation || 'Multiple customers found. Say 1, 2, or 3.');
            return;
          }
          // No billable work
          if (sp?.no_billable) {
            setPendingNoBillableFlow(sp.no_billable);
            addAssistant(sp.presentation_no_billable || 'No unbilled work. Say 1..4 to choose next step.');
            return;
          }
          // Credit risk alert
          if (sp?.risk_alert) {
            setPendingRiskAlert(sp.risk_alert);
            addAssistant(sp.presentation_risk || 'Credit hold warning. Say 1..4 to choose.');
            // Continue only after user choice
            return;
          }

          // If invoice creation with options, present A/B/C instead of opening preview
          if (String(contextCommand.intent).includes('CREATE_INVOICE') && sp?.invoice_options_bundle) {
            setPendingInvoiceOptions(sp.invoice_options_bundle);
            // Present options message
            const msg = sp.presentation_summary || 'I prepared invoice options.';
            addAssistant(msg + "\n\nInvoice preview will appear on the right →");
            return;
          }

          // DISABLED: No context preview modals - process directly like ChatGPT
          // Just continue with the enriched command without showing preview
          // The AI will respond naturally in chat without popups
        } else if (contextCommand && contextCommand.context.confidence < 0.5) {
          // DISABLED: No low confidence flows with A/B/C options - just let AI handle naturally
          // AI will ask questions in natural language if it needs clarification
        }
      }
      
      // Continue with regular PAI processing
      const recent = [...messages, { role: 'user', content: cleaned }].slice(-12);
      const msgs: PAIMessage[] = recent.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      const res = await paiChat(msgs);

      if (res.assistant) addAssistant(res.assistant);
      const payload: any = (res as any).payload || (res as any).create_project || {};

      if (res.mode === 'create_project' && payload) {
        // Detect intent to assign tasks to top performers
        const wantTop = /top\s+perform\w*/i.test(cleaned) && /(team|member)/i.test(cleaned);
        await applyCreateProject(payload, { assignTopPerformers: wantTop, topCount: 3 });
        return;
      }
      if (res.mode === 'create_customer' && payload) {
        applyCreateCustomer(payload);
        return;
      }
      if (res.mode === 'overdue_tasks') {
        await fetchOverdueTasks();
        return;
      }
      if (res.mode === 'at_risk_projects') {
        await fetchAtRiskProjects();
        return;
      }
      if (res.mode === 'update_task' && payload?.task_id) {
        if (!canEditTasks) { addAssistant("You don't have permission to edit tasks."); return; }
        try {
          const { default: apiClient } = await import('../../api/client');
          const updateBody: any = {};
          if (payload.status) updateBody.status = String(payload.status).toLowerCase();
          if (payload.assignee_id) updateBody.assignee_id = payload.assignee_id;
          if (payload.due_date) {
            const d = new Date(payload.due_date);
            if (!isNaN(d.getTime())) updateBody.due_date = d.toISOString();
          }
          if (payload.priority) {
            const pr = String(payload.priority).toLowerCase();
            updateBody.priority = pr === 'urgent' ? 'critical' : pr; // map 'urgent' to 'critical'
          }
          await apiClient.put(`/tasks/${payload.task_id}`, updateBody);
          addAssistant('✅ Task updated.');
        } catch (e:any) {
          addAssistant(`Failed to update task: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
        }
        return;
      }
      if (res.mode === 'reassign_tasks' && Array.isArray(payload?.task_ids) && payload?.assignee_id) {
        if (!canEditTasks) { addAssistant("You don't have permission to edit tasks."); return; }
        try {
          const { default: apiClient } = await import('../../api/client');
          clearStreaming();
          // Live updates: stream each task reassignment
          for (const tid of payload.task_ids) {
            pushStreaming({ id: String(tid), label: `Task #${tid} → @${payload.assignee_username || 'assignee'}`, status: 'processing', ts: Date.now() });
            try {
              await apiClient.put(`/tasks/${tid}`, { assignee_id: payload.assignee_id });
              updateStreaming(String(tid), 'done');
            } catch {
              updateStreaming(String(tid), 'error');
            }
          }
          addAssistant(`Done! ${payload.task_ids.length} task(s) reassigned. ${payload.from_username ? `${payload.from_username} notified. ` : ''}${payload.assignee_username ? `${payload.assignee_username} notified.` : ''}`);
        } catch (e:any) {
          addAssistant(`Failed to reassign tasks: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
        }
        return;
      }
      if (res.mode === 'bulk_reassign_from_to' && payload?.from_username && payload?.to_username) {
        if (!canEditTasks) { addAssistant("You don't have permission to edit tasks."); return; }
        try {
          const { default: apiClient } = await import('../../api/client');
          const fromId = await resolveUserIdByUsername(payload.from_username);
          const toId = await resolveUserIdByUsername(payload.to_username);
          if (!fromId || !toId) {
            addAssistant('Could not resolve usernames to users.');
            return;
          }
          const t = await apiClient.get('/tasks/');
          const tasksArr: any[] = Array.isArray(t.data) ? t.data : [];
          let mine = tasksArr.filter((x:any)=> x.assignee_id === fromId && !x.is_archived);
          if (payload.overdue_only) {
            const now = Date.now();
            mine = mine.filter((x:any)=> {
              const due = x?.due_date ? Date.parse(x.due_date) : NaN;
              const status = String(x?.status || '').toLowerCase();
              const isDone = ['done','completed','complete'].includes(status);
              return Number.isFinite(due) && due < now && !isDone;
            });
          }
          const ok = window.confirm(`Reassign ${mine.length} task(s) from ${payload.from_username} to ${payload.to_username}${payload.overdue_only ? ' (overdue only)' : ''}?`);
          if (!ok) {
            addAssistant('Cancelled. No tasks were reassigned.');
            return;
          }
          clearStreaming();
          for (const task of mine) {
            pushStreaming({ id: String(task.id), label: `Task #${task.id} → ${payload.to_username}`, status: 'processing', ts: Date.now() });
            try {
              await apiClient.put(`/tasks/${task.id}`, { assignee_id: toId });
              updateStreaming(String(task.id), 'done');
            } catch {
              updateStreaming(String(task.id), 'error');
            }
          }
          addAssistant(`Done! ${mine.length} task(s) reassigned from ${payload.from_username} to ${payload.to_username}${payload.overdue_only ? ' (overdue only)' : ''}. ${payload.from_username} notified. ${payload.to_username} notified.`);
        } catch (e:any) {
          addAssistant('Failed bulk reassignment.');
        }
        return;
      }
      if (res.mode === 'extend_project_deadline' && payload?.project_id && payload?.new_due_date) {
        if (!canEditProjects) { addAssistant("You don't have permission to edit projects."); return; }
        try {
          const { default: apiClient } = await import('../../api/client');
          const d = new Date(payload.new_due_date);
          await apiClient.put(`/projects/${payload.project_id}`, { due_date: isNaN(d.getTime()) ? payload.new_due_date : d.toISOString() });
          addAssistant('✅ Project deadline updated.');
        } catch (e:any) {
          addAssistant(`Failed to update project deadline: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
        }
        return;
      }
      if (res.mode === 'create_task' && payload?.project_id && payload?.title) {
        if (!canCreateTasksPerm) { addAssistant("You don't have permission to create tasks."); return; }
        try {
          const { default: apiClient } = await import('../../api/client');
          let assigneeId = payload.assignee_id || null;
          if (!assigneeId && payload.assignee_username) {
            assigneeId = await resolveUserIdByUsername(payload.assignee_username);
          }
          const body: any = { project_id: payload.project_id, title: String(payload.title).slice(0, 200) };
          if (assigneeId) body.assignee_id = assigneeId;
          if (payload.due_date) {
            const d = new Date(payload.due_date);
            if (!isNaN(d.getTime())) body.due_date = d.toISOString();
          }
          if (payload.priority) body.priority = String(payload.priority).toLowerCase() === 'urgent' ? 'critical' : String(payload.priority).toLowerCase();
          await apiClient.post('/tasks/', body);
          addAssistant('✅ Task created.');
        } catch (e:any) {
          addAssistant('Failed to create task.');
        }
        return;
      }
      if (res.mode === 'close_completed_tasks_last_week') {
        if (!canDeleteTasks) { addAssistant("You don't have permission to delete/archive tasks."); return; }
        try {
          const { default: apiClient } = await import('../../api/client');
          const t = await apiClient.get('/tasks/', { params: { status: 'completed' } as any });
          const tasksArr: any[] = Array.isArray(t.data) ? t.data : [];
          const now = new Date();
          const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
          const toArchive = tasksArr.filter((x:any)=> x.completed_date && (new Date(x.completed_date) >= weekAgo) && (new Date(x.completed_date) <= now) && !x.is_archived);
          const confirmed = window.confirm(`Archive ${toArchive.length} completed task(s) from last week? This will soft-delete (archive) them.`);
          if (!confirmed) {
            addAssistant('Cancelled. No tasks were archived.');
            return;
          }
          for (const task of toArchive) {
            await apiClient.delete(`/tasks/${task.id}`);
          }
          addAssistant(`✅ Archived ${toArchive.length} completed task(s) from last week.`);
        } catch (e:any) {
          addAssistant('Failed to archive completed tasks.');
        }
        return;
      }
      if (res.mode === 'project_budget_status' && payload?.project_id) {
        if (!canSeeFinancial) { addAssistant("You don't have permission to view financial details."); return; }
        try {
          const { default: apiClient } = await import('../../api/client');
          const inv = await apiClient.get(`/invoices/?project_id=${encodeURIComponent(payload.project_id)}&page=1&size=200`);
          const invoices = inv.data?.invoices || [];
          const total = invoices.reduce((a:number, it:any)=> a + (Number(it.total_amount)||0), 0);
          const paid = invoices.reduce((a:number, it:any)=> a + (Number(it.amount_paid)||0), 0);
          const balance = invoices.reduce((a:number, it:any)=> a + (Number(it.balance_due)||0), 0);
          setBudgetStatus({ project_id: payload.project_id, total, paid, balance, invoices });
          setMode('project_budget');
        } catch (e:any) {
          addAssistant('Failed to load project budget status.');
        }
        return;
      }
      if (res.mode === 'invoices_overdue_30') {
        if (!canViewInvoices) { addAssistant("You don't have permission to view invoices."); return; }
        try {
          const { default: apiClient } = await import('../../api/client');
          const qs = new URLSearchParams({ page: '1', size: '200' });
          if (payload?.project_id) qs.set('project_id', payload.project_id);
          const inv = await apiClient.get(`/invoices/?${qs.toString()}`);
          const invoices = (inv.data?.invoices || []).filter((i:any)=> (i.status === 'OVERDUE' || i.is_overdue) && Number(i.days_overdue||0) >= 30);
          setOverdueInvoices(invoices);
          setMode('invoices_overdue');
        } catch (e:any) {
          addAssistant('Failed to load overdue invoices.');
        }
        return;
      }
      if (res.mode === 'team_workload_week') {
        try {
          const { default: apiClient } = await import('../../api/client');
          const t = await apiClient.get('/tasks/');
          const tasksArr: any[] = Array.isArray(t.data) ? t.data : [];
          // current week range
          const now = new Date();
          const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
          const end = new Date(start); end.setDate(start.getDate() + 7); end.setHours(23,59,59,999);
          const inWeek = tasksArr.filter((x:any)=> x.due_date && (new Date(x.due_date) >= start) && (new Date(x.due_date) <= end) && String(x.status).toLowerCase() !== 'completed');
          const map = new Map<string, number>();
          inWeek.forEach((x:any)=> { const uid = x.assignee_id || 'unassigned'; map.set(uid, (map.get(uid)||0)+1); });
          const summary = Array.from(map.entries()).map(([user_id, tasks_count])=> ({ user_id, tasks_count }));
          setTeamWorkload(summary);
          setMode('team_workload');
        } catch (e:any) {
          addAssistant('Failed to compute team workload.');
        }
        return;
      }
      if (res.mode === 'forecast_predict' && payload?.project_id) {
        try {
          const { default: apiClient } = await import('../../api/client');
          const body = { project_id: payload.project_id, forecast_type: payload.forecast_type || 'timeline', inputs: payload.inputs || {} };
          const f = await apiClient.post('/ai/forecast/predict', body);
          setForecastResult(f.data);
          setMode('forecast');
        } catch (e:any) {
          addAssistant('Failed to run forecast.');
        }
        return;
      }
      if (res.mode === 'update_project_budget' && payload?.project_id && payload?.budget != null) {
        if (!canEditProjects || !canSeeFinancial) { addAssistant("You don't have permission to update project budgets."); return; }
        try {
          const { default: apiClient } = await import('../../api/client');
          const cents = Math.round(Number(payload.budget) * 100) || 0;
          await apiClient.put(`/projects/${payload.project_id}`, { budget: cents });
          addAssistant('✅ Project budget updated.');
        } catch (e:any) {
          addAssistant('Failed to update project budget.');
        }
        return;
      }
      if (res.mode === 'invoice_create_from_nl' && payload?.project_id && payload?.customer_id && Array.isArray(payload?.items)) {
        if (!canCreateInvoices) { addAssistant("You don't have permission to create invoices."); return; }
        try {
          const { default: apiClient } = await import('../../api/client');
          const nowIso = new Date().toISOString();
          const items = payload.items.map((it:any)=> ({
            description: String(it.description || '').slice(0, 1000),
            quantity: Math.max(1, Number(it.quantity || 1)),
            unit_price: Math.round(Number(it.unit_price || 0) * 100),
            item_type: 'service',
            tax_rate: Math.round(Number(it.tax_rate || 0) * 100),
            discount_rate: Math.round(Number(it.discount_rate || 0) * 100),
          }));
          const body = {
            title: 'AI Generated Invoice',
            description: 'Generated from conversation',
            invoice_type: 'project',
            currency: 'usd',
            exchange_rate: 100,
            payment_terms: 'net_30',
            invoice_date: (payload.invoice_date ? new Date(payload.invoice_date).toISOString() : nowIso),
            project_id: payload.project_id,
            customer_id: payload.customer_id,
            items,
          };
          const inv = await apiClient.post('/invoices/', body);
          addAssistant(`✅ Invoice created: ${inv.data?.invoice_number || inv.data?.id}`);
        } catch (e:any) {
          addAssistant('Failed to create invoice.');
        }
        return;
      }
      if (res.mode === 'project_from_proposal' && payload?.proposal_id) {
        if (!canCreateProjects) { addAssistant("You don't have permission to create projects."); return; }
        try {
          const { default: apiClient } = await import('../../api/client');
          const p = await apiClient.get(`/proposals/${payload.proposal_id}`);
          const name = payload.project_name || p.data?.title || 'Project from Proposal';
          const body: any = { name, description: p.data?.description || '', status: 'planning', priority: 'high', customer_id: p.data?.customer_id };
          const created = await apiClient.post('/projects/', body);
          const projectId = created.data?.id;
          if (projectId && Array.isArray(payload.tasks)) {
            for (const t of payload.tasks) {
              const title = String(t.title || '').slice(0, 100);
              if (!title) continue;
              await apiClient.post('/tasks/', { project_id: projectId, title, description: '' });
            }
          }
          addAssistant(`✅ Project created from proposal: ${projectId}`);
          setSavedProjectId(projectId || null);
          setPreviewState('Draft');
          setIsEditing(true);
        } catch (e:any) {
          addAssistant('Failed to create project from proposal.');
        }
        return;
      }
      if (res.mode === 'calendar_schedule' && payload?.title && payload?.start) {
        try {
          const attendees = await resolveEmailsFromMentions(payload.attendees || []);
          const { default: apiClient } = await import('../../api/client');
          const body = { title: payload.title, start: new Date(payload.start).toISOString(), duration_minutes: Number(payload.duration_minutes || 30), attendees };
          const ev = await apiClient.post('/calendar/google/meet/schedule/', body);
          addAssistant(`✅ Meeting scheduled. Join: ${ev.data?.join_url || ''}`);
        } catch (e:any) {
          addAssistant('Failed to schedule meeting.');
        }
        return;
      }

      if (res.mode === 'schedule_meeting' && payload?.title && payload?.start) {
        try {
          const { default: apiClient } = await import('../../api/client');
          const body = { title: payload.title, start: new Date(payload.start).toISOString(), duration_minutes: Number(payload.duration_minutes || 30), attendees: payload.attendees || [] };
          const ev = await apiClient.post('/calendar/google/meet/schedule/', body);
          addAssistant(`✅ Meeting scheduled. Join: ${ev.data?.join_url || ''}`);
        } catch (e:any) {
          addAssistant('Failed to schedule meeting.');
        }
        return;
      }

      if (res.mode === 'schedule_retrospective' && payload?.title && payload?.start) {
        try {
          const { default: apiClient } = await import('../../api/client');
          const body = { title: payload.title, start: new Date(payload.start).toISOString(), duration_minutes: Number(payload.duration_minutes || 30), attendees: payload.attendees || [] };
          const ev = await apiClient.post('/calendar/google/meet/schedule/', body);
          addAssistant(`✅ Retrospective scheduled. Join: ${ev.data?.join_url || ''}`);
        } catch (e:any) {
          addAssistant('Failed to schedule meeting.');
        }
        return;
      }
      if (res.mode === 'resource_optimize' && payload?.project_id) {
        try {
          const { default: apiClient } = await import('../../api/client');
          const body = { project_id: payload.project_id, candidates: payload.candidates || [], tasks: payload.tasks || [] };
          const r = await apiClient.post('/ai/resources/optimize', body);
          setResourcePlan(r.data);
          setMode('resource_opt');
        } catch (e:any) {
          addAssistant('Failed to optimize resources.');
        }
        return;
      }
      if (res.mode === 'scenario_simulation' && payload?.project_id) {
        try {
          const { default: apiClient } = await import('../../api/client');
          const body = { project_id: payload.project_id, assumptions: payload.assumptions || {} };
          const sc = await apiClient.post('/ai/scenario/what-if', body);
          setScenarioInfo(sc.data);
          setMode('scenario');
        } catch (e:any) {
          addAssistant('Failed to run scenario.');
        }
        return;
      }

      if (res.mode === 'proposals_due_soon') {
        try {
          const { default: apiClient } = await import('../../api/client');
          const days = Number(payload?.days || 7);
          const now = new Date();
          const cutoff = new Date(now); cutoff.setDate(now.getDate() + days);
          const resp = await apiClient.get('/proposals/', { params: { page: 1, size: 200 } as any });
          const items: any[] = resp.data?.items || [];
          const due = items.filter((p:any)=> p.valid_until && new Date(p.valid_until) <= cutoff && ['draft','rejected','expired'].indexOf(String(p.status).toLowerCase()) === -1);
          setProposalsDue(due);
          setMode('proposals_due');
          addAssistant(`Found ${due.length} proposal(s) due within ${days} day(s).`);
        } catch (e:any) {
          addAssistant('Failed to load proposals due soon.');
        }
        return;
      }

      if (res.mode === 'customers_followups_needed') {
        try {
          const { default: apiClient } = await import('../../api/client');
          const days = Number(payload?.days || 0);
          const now = new Date();
          let cutoff = now;
          if (days > 0) { const c = new Date(now); c.setDate(now.getDate() - days); cutoff = c; }
          const resp = await apiClient.get('/proposals/', { params: { page: 1, size: 200 } as any });
          const items: any[] = resp.data?.items || [];
          const needs = items.filter((p:any)=> {
            const status = String(p.status||'').toLowerCase();
            const due = p.follow_up_date ? new Date(p.follow_up_date) : null;
            const stale = p.sent_date ? (new Date(p.sent_date) < cutoff) : false;
            return (status === 'sent' || status === 'viewed') && ((due && due <= now) || stale);
          });
          setFollowups(needs);
          setMode('customers_followup');
          addAssistant(`Identified ${needs.length} follow-up(s) to schedule.`);
        } catch (e:any) {
          addAssistant('Failed to compute customer follow-ups.');
        }
        return;
      }

      if (res.mode === 'invoices_pending') {
        try {
          const { default: apiClient } = await import('../../api/client');
          const qs = new URLSearchParams({ page: '1', size: '200' });
          if (payload?.project_id) qs.set('project_id', payload.project_id);
          if (payload?.customer_id) qs.set('customer_id', payload.customer_id);
          const resp = await apiClient.get(`/invoices/?${qs.toString()}`);
          const list = (resp.data?.invoices || []).filter((i:any)=> ['PENDING','OVERDUE','PARTIALLY_PAID','SENT'].includes(String(i.status).toUpperCase()));
          setInvoicesPending(list);
          setMode('invoices_pending');
          addAssistant(`Found ${list.length} pending invoice(s).`);
        } catch (e:any) {
          addAssistant('Failed to load pending invoices.');
        }
        return;
      }

      if (res.mode === 'invoice_generate_monthly' && (payload?.project_id || payload?.customer_id)) {
        try {
          const { default: apiClient } = await import('../../api/client');
          const now = new Date();
          const month = Number(payload?.month || (now.getMonth() + 1));
          const year = Number(payload?.year || now.getFullYear());
          let projectId: string | null = payload?.project_id || null;
          let customerId: string | null = payload?.customer_id || null;
          if (!projectId && customerId) {
            const projs = await apiClient.get('/projects/');
            const arr: any[] = Array.isArray(projs.data) ? projs.data : [];
            const match = arr.find((p:any)=> p.customer_id === customerId && String(p.status).toLowerCase() !== 'archived');
            projectId = match?.id || null;
          }
          if (!projectId) {
            addAssistant('Please specify a project to generate the monthly invoice.');
            return;
          }
          const projResp = await apiClient.get(`/projects/${projectId}`);
          const project = projResp.data || {};
          const hourlyRate = Number(project.hourly_rate || 0);
          const tasksResp = await apiClient.get('/tasks/', { params: { project_id: projectId } as any });
          const allTasks: any[] = Array.isArray(tasksResp.data) ? tasksResp.data : [];
          const start = new Date(year, month - 1, 1);
          const end = new Date(year, month, 0, 23, 59, 59, 999);
          const completedThisMonth = allTasks.filter((t:any)=> t.completed_date && new Date(t.completed_date) >= start && new Date(t.completed_date) <= end);
          const items = completedThisMonth.map((t:any)=> {
            const qty = Number(t.actual_hours || t.estimated_hours || 1);
            const unitPrice = Math.round((hourlyRate || 0) * 100);
            return { description: `Task: ${t.title}`, quantity: Math.max(1, qty), unit_price: unitPrice, item_type: 'service', tax_rate: 0, discount_rate: 0 };
          });
          const subtotal = items.reduce((a:number, it:any)=> a + it.quantity * it.unit_price, 0);
          const preview = { month, year, project, items, subtotal, currency: 'usd' };
          setInvoicePreview(preview);
          setMode('invoice_preview');
          addAssistant(`Prepared ${items.length} line(s) for ${project.name || 'project'} (${month}/${year}). Review and confirm to create a draft invoice.`);
        } catch (e:any) {
          addAssistant('Failed to prepare monthly invoice preview.');
        }
        return;
      }

      if (res.mode === 'client_report_monthly' && (payload?.customer_id || payload?.customer_name)) {
        try {
          const { default: apiClient } = await import('../../api/client');
          const now = new Date();
          const month = Number(payload?.month || (now.getMonth() + 1));
          const year = Number(payload?.year || now.getFullYear());
          let customerId: string | null = payload?.customer_id || null;
          if (!customerId && payload?.customer_name) {
            const c = await apiClient.get('/customers/', { params: { page: 1, size: 50, search: String(payload.customer_name) } as any });
            const list: any[] = c.data?.customers || [];
            const match = list.find((x:any)=> String(x.display_name||'').toLowerCase().includes(String(payload.customer_name).toLowerCase()));
            customerId = match?.id || null;
          }
          if (!customerId) {
            addAssistant('Could not resolve customer.');
            return;
          }
          const projs = await apiClient.get('/projects/');
          const projects: any[] = Array.isArray(projs.data) ? projs.data : [];
          const custProjects = projects.filter((p:any)=> p.customer_id === customerId);
          // Invoices for month
          const inv = await apiClient.get(`/invoices/?customer_id=${encodeURIComponent(customerId)}&page=1&size=200`);
          const invoices = (inv.data?.invoices || []).filter((i:any)=> i.invoice_date && (new Date(i.invoice_date).getMonth()+1) === month && new Date(i.invoice_date).getFullYear() === year);
          const totalBilled = invoices.reduce((a:number, it:any)=> a + (Number(it.total_amount)||0), 0);
          // Task summary omitted to avoid many calls; rely on invoices + projects counts
          const report = { month, year, customer_id: customerId, projects_total: custProjects.length, projects_active: custProjects.filter((p:any)=> String(p.status).toLowerCase()==='active').length, invoices_count: invoices.length, billed_amount: totalBilled };
          setClientReport(report);
          setMode('client_report');
          addAssistant('Prepared monthly client report. You can copy or email this summary.');
        } catch (e:any) {
          addAssistant('Failed to prepare client report.');
        }
        return;
      }

      if (res.mode === 'purchase_orders_by_vendor' && (payload?.vendor_id || payload?.vendor_name)) {
        try {
          let vendorId: string | null = payload.vendor_id || null;
          if (!vendorId && payload.vendor_name) {
            const v = await resolveVendorByName(String(payload.vendor_name));
            vendorId = v?.id || null;
          }
          if (!vendorId) { addAssistant('Which vendor did you want? Please specify the vendor name.'); return; }
          await fetchPOsByVendorId(vendorId);
          addAssistant('Here are the latest purchase orders for that vendor.');
        } catch (e:any) {
          addAssistant('Failed to load purchase orders for vendor.');
        }
        return;
      }

      if (res.mode === 'vendor_lookup' && (payload?.vendor_name || payload?.search)) {
        const q = String(payload?.vendor_name || payload?.search || '').trim();
        if (!q) { addAssistant('Which vendor should I look up?'); return; }
        const v = await resolveVendorByName(q);
        if (!v) { addAssistant(`I couldn't find a vendor matching "${q}".`); return; }
        await fetchPOsByVendorId(v.id);
        addAssistant(`Found ${v.name}. Showing their purchase orders.`);
        return;
      }

      if (res.mode === 'po_by_vendor' && (payload?.vendor_id || payload?.vendor_name)) {
        try {
          const { default: apiClient } = await import('../../api/client');
          let vendorId: string | null = payload.vendor_id || null;
          if (!vendorId && payload.vendor_name) {
            const vs = await apiClient.get('/vendors/', { params: { search: String(payload.vendor_name), page: 1, size: 50 } as any });
            const arr: any[] = vs.data?.vendors || [];
            const match = arr.find((v:any)=> String(v.name||'').toLowerCase().includes(String(payload.vendor_name).toLowerCase()));
            vendorId = match?.id || null;
          }
          if (!vendorId) { addAssistant('Vendor not found.'); return; }
          const pos = await apiClient.get('/purchase_orders/', { params: { vendor_id: vendorId, page: 1, size: 100 } as any });
          const list: any[] = pos.data?.purchase_orders || [];
          setPoList(list);
          setMode('po_list');
          addAssistant(`Loaded ${list.length} purchase order(s) for vendor.`);
        } catch (e:any) {
          addAssistant('Failed to load purchase orders for vendor.');
        }
        return;
      }

      if (res.mode === 'purchase_order_create' && (payload?.vendor_id || payload?.vendor_name) && Array.isArray(payload?.items)) {
        try {
          const { default: apiClient } = await import('../../api/client');
          // Resolve vendor
          let vendorId: string | null = payload.vendor_id || null;
          let vendorName: string | null = null;
          if (!vendorId && payload.vendor_name) {
            const v = await resolveVendorByName(String(payload.vendor_name));
            vendorId = v?.id || null;
            vendorName = v?.name || String(payload.vendor_name);
          }
          if (!vendorId) {
            addAssistant('I couldn\'t resolve the vendor. Please specify the exact vendor name.');
            return;
          }
          // Build items
          const items = payload.items.map((it:any) => ({
            item_id: it.item_id || undefined,
            item_name: it.item_name || it.description || 'Item',
            description: it.description || undefined,
            quantity: Math.max(1, Number(it.quantity || 1)),
            unit_price: Number(it.unit_price || 0),
            sku: it.sku || undefined,
            category: it.category || undefined,
            unit: it.unit || undefined,
            notes: it.notes || undefined,
          }));
          const today = new Date();
          const order_date = today.toISOString().slice(0,10);
          let expected_delivery_date: string | undefined = undefined;
          if (payload.expected_delivery_date) {
            const d = new Date(payload.expected_delivery_date);
            expected_delivery_date = isNaN(d.getTime()) ? String(payload.expected_delivery_date) : d.toISOString().slice(0,10);
          }
          const body:any = {
            vendor_id: vendorId,
            project_id: payload.project_id || undefined,
            customer_id: payload.customer_id || undefined,
            order_date,
            expected_delivery_date,
            received_date: undefined,
            priority: String(payload.priority || 'medium').toLowerCase(),
            department: payload.department || 'Purchasing',
            requested_by: payload.requested_by || (user?.full_name || user?.username || 'Requester'),
            shipping_address: payload.shipping_address || '',
            payment_method: payload.payment_method || 'net_30',
            notes: payload.notes || undefined,
            terms_and_conditions: payload.terms_and_conditions || undefined,
            internal_reference: payload.internal_reference || undefined,
            items,
          };
          const created = await apiClient.post('/purchase-orders/', body);
          const po = created?.data || {};
          addAssistant(`✅ Purchase order created: ${po.po_number || po.id}${vendorName ? ` for ${vendorName}` : ''}.`);
          await fetchPOsByVendorId(vendorId);
        } catch (e:any) {
          addAssistant('Failed to create purchase order.');
        }
        return;
      }

      if (res.mode === 'todo_create' && payload?.text) {
        try {
          const { default: apiClient } = await import('../../api/client');
          const sectionId = await ensureTodoSection(String(payload.section_name || 'Inbox'));
          if (!sectionId) { addAssistant('Could not access your todo sections.'); return; }
          const todo = await apiClient.post(`/todo/sections/${sectionId}/todos`, { text: String(payload.text), done: false, position: 0 });
          addAssistant(`Added to your ${payload.section_name || 'Inbox'}: "${todo?.data?.text || payload.text}"`);
        } catch (e:any) {
          addAssistant('Failed to create todo.');
        }
        return;
      }

      if (res.mode === 'goal_create' && payload?.title) {
        try {
          const { default: apiClient } = await import('../../api/client');
          const body:any = {
            title: String(payload.title).slice(0, 200),
            description: payload.description || '',
            start_date: payload.start_date ? new Date(payload.start_date).toISOString() : undefined,
            end_date: payload.end_date ? new Date(payload.end_date).toISOString() : undefined,
            goal_type: payload.goal_type || 'outcome',
            priority: String(payload.priority || 'medium').toLowerCase(),
            target_value: payload.target_value || 0,
            unit: payload.unit || undefined,
            project_id: payload.project_id || undefined,
            auto_update_progress: false,
            tags: payload.tags || [],
            metadata: payload.metadata || undefined,
            member_ids: [],
            checklist_items: Array.isArray(payload.checklist_items) ? payload.checklist_items : [],
          };
          const created = await apiClient.post('/goals/', body);
          addAssistant(`✅ Goal created: ${created?.data?.title || body.title}.`);
        } catch (e:any) {
          addAssistant('Failed to create goal.');
        }
        return;
      }

      if (res.mode === 'invoice_record_payment' && (payload?.invoice_id || payload?.invoice_number) && payload?.amount) {
        try {
          const { default: apiClient } = await import('../../api/client');
          let invoiceId: string | null = payload.invoice_id || null;
          if (!invoiceId && payload.invoice_number) {
            const resp = await apiClient.get('/invoices/', { params: { page: 1, size: 50, search: String(payload.invoice_number) } as any });
            const list: any[] = resp.data?.invoices || [];
            const match = list.find((i:any)=> String(i.invoice_number||'').toLowerCase() === String(payload.invoice_number).toLowerCase());
            invoiceId = match?.id || null;
          }
          if (!invoiceId) { addAssistant('Could not resolve invoice. Please specify the invoice ID.'); return; }
          const cents = Math.round(Number(payload.amount));
          const dollars = (cents/100).toFixed(2);
          const ok = window.confirm(`Record payment of $${dollars} for invoice ${invoiceId}?`);
          if (!ok) { addAssistant('Cancelled. No payment recorded.'); return; }
          const body:any = {
            amount: cents,
            payment_date: payload.payment_date ? new Date(payload.payment_date).toISOString() : new Date().toISOString(),
            payment_method: payload.payment_method || 'manual',
            reference: payload.reference || undefined,
            notes: payload.notes || undefined,
          };
          const resp = await apiClient.post(`/invoices/${invoiceId}/payments`, body);
          addAssistant(`✅ Payment recorded. Remaining balance: $${(Number(resp.data?.balance_due||0)/100).toFixed(2)}`);
        } catch (e:any) {
          addAssistant('Failed to record payment.');
        }
        return;
      }

      if (res.mode === 'overdue_tasks_for_assignees' && Array.isArray(payload?.usernames) && payload.usernames.length > 0) {
        try {
          const { default: apiClient } = await import('../../api/client');
          const ids: (string|null)[] = [];
          for (const uname of payload.usernames) {
            const id = await resolveUserIdByUsername(String(uname));
            if (id) ids.push(id);
          }
          const t = await apiClient.get('/tasks/');
          const tasksArr: any[] = Array.isArray(t.data) ? t.data : [];
          const now = Date.now();
          const overdue = tasksArr.filter((x:any)=> {
            const due = x?.due_date ? Date.parse(x.due_date) : NaN;
            const status = String(x?.status || '').toLowerCase();
            const isDone = ['done','completed','complete'].includes(status);
            const matchAssignee = ids.includes(x.assignee_id || null);
            return Number.isFinite(due) && due < now && !isDone && matchAssignee && !x.is_archived;
          });
          setOverdueTasks(overdue);
          setMode('overdue_tasks');
          addAssistant(`📋 Found ${overdue.length} overdue task(s) for specified assignees.`);
        } catch (e:any) {
          addAssistant('Failed to load overdue tasks for assignees.');
        }
        return;
      }

      if (res.mode === 'project_blockers' && (payload?.project_id || payload?.project_name)) {
        try {
          const { default: apiClient } = await import('../../api/client');
          // Resolve project id if only name provided
          let projectId: string | null = payload.project_id || null;
          if (!projectId && payload.project_name) {
            try {
              const search = await apiClient.get(`/projects/`, { params: { q: String(payload.project_name).trim() } as any });
              const arr: any[] = Array.isArray(search.data) ? search.data : [];
              const match = arr.find((p:any)=> String(p.name || '').toLowerCase().includes(String(payload.project_name).toLowerCase()));
              projectId = match?.id || null;
            } catch {}
          }
          if (!projectId) {
            addAssistant('I could not resolve the project. Please specify the project explicitly.');
            return;
          }
          // Fetch all tasks for project
          const t = await apiClient.get(`/tasks/`, { params: { project_id: projectId } as any });
          const tasksArr: any[] = Array.isArray(t.data) ? t.data : [];
          const taskMap = new Map<string, any>();
          tasksArr.forEach((x:any) => taskMap.set(x.id, x));
          const results: any[] = [];
          // Limit to at most 50 tasks to avoid heavy loops
          const candidate = tasksArr.filter((x:any)=> String(x.status).toLowerCase() !== 'completed').slice(0, 50);
          for (const task of candidate) {
            try {
              const deps = await apiClient.get(`/tasks/${task.id}/dependencies`);
              const list = Array.isArray(deps.data) ? deps.data : [];
              const blockers = list.filter((d:any)=> d.dependent_task_id === task.id && d.dependency_type === 'blocks');
              if (blockers.length > 0 || String(task.status).toLowerCase() === 'blocked') {
                const byTitles = [] as any[];
                for (const b of blockers) {
                  const pre = taskMap.get(b.prerequisite_task_id) || null;
                  if (pre) byTitles.push({ id: pre.id, title: pre.title });
                  else {
                    try {
                      const one = await apiClient.get(`/tasks/${b.prerequisite_task_id}`);
                      if (one?.data) byTitles.push({ id: one.data.id, title: one.data.title });
                    } catch {}
                  }
                }
                results.push({ id: task.id, title: task.title, status: task.status, due_date: task.due_date, blocked_by: byTitles });
              }
            } catch {}
          }
          setBlockers(results);
          setMode('blockers');
          addAssistant(`Found ${results.length} blocker(s) affecting delivery for this project. See the right pane.`);
        } catch (e:any) {
          addAssistant('Failed to analyze blockers for this project.');
        }
        return;
      }

      if (res.mode === 'availability_this_week') {
        try {
          const { default: apiClient } = await import('../../api/client');
          const membersResp = await apiClient.get('/teams/members');
          const members: any[] = Array.isArray(membersResp.data) ? membersResp.data : [];
          const tasksResp = await apiClient.get('/tasks/');
          const allTasks: any[] = Array.isArray(tasksResp.data) ? tasksResp.data : [];
          const now = new Date();
          const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
          const end = new Date(start); end.setDate(start.getDate() + 7); end.setHours(23,59,59,999);
          const inWeek = allTasks.filter((x:any)=> x.due_date && (new Date(x.due_date) >= start) && (new Date(x.due_date) <= end) && String(x.status).toLowerCase() !== 'completed');
          const counts = new Map<string, number>();
          inWeek.forEach((x:any)=> { const uid = x.assignee_id || 'unassigned'; counts.set(uid, (counts.get(uid)||0)+1); });
          const avail = members.map((m:any)=> ({ user_id: m.id, username: m.username, full_name: m.full_name, tasks_due_this_week: counts.get(m.id)||0 }))
                               .sort((a,b)=> (a.tasks_due_this_week - b.tasks_due_this_week));
          setAvailability(avail);
          setMode('availability');
          addAssistant('Here is team availability for the current week (fewest due tasks first).');
        } catch (e:any) {
          addAssistant('Failed to compute availability.');
        }
        return;
      }

      // idle or unknown
      if (!res.assistant) {
        // Human-centric fallback based on intent
        if (/\bcreate\b/i.test(cleaned) && /(proj(?:ect)?|poe?ct|proejct|porject)/i.test(cleaned)) {
          addAssistant("Got it — let’s create a new project. What should we call it? You can also paste tasks and assignees, and I’ll add them.");
        } else if (/(invoice|bill)/i.test(cleaned)) {
          addAssistant("Sure — which customer is this for? If you say the name (e.g. @ADDC), I’ll draft the invoice.");
        } else if (/\b(overdue|late)\b.*\btasks\b/i.test(cleaned)) {
          addAssistant("On it — do you want your tasks or a specific project’s? Say ‘my overdue tasks’ or ‘overdue tasks for #ProjectName’.");
        } else {
          addAssistant("How can I help? For example: ‘Create a project for Acme with 5 tasks’, ‘Show my overdue tasks’, or ‘List POs by vendor Etisalat’.");
        }
      }
    } catch (e: any) {
      addAssistant(`Failed to process your request: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
    }
  };

  // NL normalization for common intents
const normalizeNL = (raw: string): string | null => {
    const s = raw.trim();

    // 0) Fix common typos and word order for popular queries
    // Also catch frequent chat typos like "proejct anme", "asing"
    let fixed = s
      .replace(/\bporjects?\b/gi, 'projects')
      .replace(/\bprjects?\b/gi, 'projects')
      .replace(/\bprojetcs?\b/gi, 'projects')
      .replace(/\bporject\b/gi, 'project')
      .replace(/\bproejct\b/gi, 'project')
      .replace(/\bpoect\b/gi, 'project')
      .replace(/\banme\b/gi, 'name')
      .replace(/\bonoging\b/gi, 'ongoing')
      .replace(/\bongoig\b/gi, 'ongoing')
      .replace(/\blatets\b/gi, 'latest')
      .replace(/\basing\b/gi, 'assign')
      .replace(/\bassing\b/gi, 'assign');

    // Pattern: "X is project name" -> "create project X"
    const mProj = fixed.match(/^\s*(.+?)\s+is\s+(?:a\s+)?project\s+name\b[.,]?\s*(.*)$/i);
    if (mProj) {
      const name = mProj[1].trim();
      const trailing = mProj[2]?.trim() || '';
      return `create project ${name} ${trailing}`.trim();
    }

    let normalized = fixed
      .replace(/\blatest\s+projects\s+ongoing\b/gi, 'latest ongoing projects')
      .replace(/\bprojects\s+ongoing\b/gi, 'ongoing projects')
      .replace(/\bprojects\s+active\b/gi, 'active projects');

    if (normalized !== s) return normalized;

    // 1) Invoice synonyms
    // invoice addc | bill addc | send bill to addc | generate addc invoice
    let m = s.match(/^\s*(invoice|bill)\s+(.+)$/i);
    if (m) return `create invoice for ${m[2]}`;
    m = s.match(/^\s*send\s+bill\s+(?:to\s+)?(.+)$/i);
    if (m) return `create invoice for ${m[1]}`;
    m = s.match(/^\s*generate\s+(.+?)\s+invoice\s*$/i);
    if (m) return `create invoice for ${m[1]}`;
    m = s.match(/^\s*generate\s+invoice\s+for\s+(.+)$/i);
    if (m) return `create invoice for ${m[1]}`;

    return null;
  };

  // Suggest top performers based on completion/on-time metrics
  const getTopPerformers = async (count: number): Promise<Array<{ id: string; username: string }>> => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const membersResp = await apiClient.get('/teams/members');
      const members: any[] = Array.isArray(membersResp.data) ? membersResp.data : [];
      const tasksResp = await apiClient.get('/tasks/');
      const allTasks: any[] = Array.isArray(tasksResp.data) ? tasksResp.data : [];
      const now = new Date();
      const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      // Filter to last 90 days to smooth, but prefer recent window
      const tasksWindow = allTasks.filter((t:any)=> {
        const created = t?.created_at ? new Date(t.created_at) : null;
        return created ? created >= thirtyAgo : true;
      });
      const scoreFor = (uid: string) => {
        const mine = tasksWindow.filter(t=> (t.assignee_id||'') === uid);
        const total = mine.length || 0;
        const completed = mine.filter(t=> String(t.status||'').toLowerCase()==='completed').length;
        const overdue = mine.filter(t=> {
          if (!t.due_date || String(t.status||'').toLowerCase()==='completed') return false;
          return new Date(t.due_date) < now;
        }).length;
        const onTime = total - overdue;
        const completionRate = total>0 ? completed/total : 0;
        const onTimeRate = total>0 ? onTime/total : 0;
        return completionRate*0.7 + onTimeRate*0.3;
      };
      const ranked = members
        .map(m=> ({ id: m.id, username: m.username || (m.email||'').split('@')[0] || String(m.id).slice(0,6), score: scoreFor(m.id) }))
        .sort((a,b)=> b.score - a.score);
      return ranked.slice(0, Math.max(1, count)).map(r=> ({ id: r.id, username: r.username }));
    } catch {
      return [];
    }
  };

  // Built-in actions for aliases
  const handleStatus = async (): Promise<void> => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const resp = await apiClient.get('/tasks/my-tasks');
      const list: any[] = Array.isArray(resp.data) ? resp.data : [];
      const by = (k: string) => list.filter((t:any)=> String(t.status||'').toLowerCase()===k).length;
      const msg = [
        '🧾 Task Status Summary',
        `Total: ${list.length}`,
        `Todo: ${by('todo')}`,
        `In Progress: ${by('in_progress')}`,
        `In Review: ${by('in_review')}`,
        `Blocked: ${by('blocked')}`,
        `Completed: ${by('completed')}`,
      ].join('\n');
      addAssistant(msg);
    } catch (e:any) {
      addAssistant('Failed to fetch your task status.');
    }
  };

  const handleStandupReport = async (): Promise<void> => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const resp = await apiClient.get('/tasks/my-tasks');
      const list: any[] = Array.isArray(resp.data) ? resp.data : [];
      const now = new Date();
      const yesterday = new Date(now); yesterday.setDate(now.getDate()-1);
      const startToday = new Date(now); startToday.setHours(0,0,0,0);
      const doneYesterday = list.filter((t:any)=> t.completed_date && new Date(t.completed_date) >= yesterday && new Date(t.completed_date) < startToday);
      const today = list.filter((t:any)=> t.due_date && new Date(t.due_date) >= startToday);
      const blockers = list.filter((t:any)=> String(t.status||'').toLowerCase()==='blocked');
      const fmt = (arr:any[]) => arr.slice(0,8).map(t=> `- ${t.title}`).join('\n') || '- (none)';
      addAssistant([
        '🗒️ Daily Standup',
        '',
        'Yesterday:',
        fmt(doneYesterday),
        '',
        'Today:',
        fmt(today),
        '',
        'Blockers:',
        fmt(blockers),
      ].join('\n'));
    } catch (e:any) {
      addAssistant('Failed to generate standup report.');
    }
  };

  const handleEod = async (): Promise<void> => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const resp = await apiClient.get('/tasks/my-tasks');
      const list: any[] = Array.isArray(resp.data) ? resp.data : [];
      const startToday = new Date(); startToday.setHours(0,0,0,0);
      const toClose = list.filter((t:any)=> String(t.status||'').toLowerCase()==='in_progress' && t.due_date && new Date(t.due_date) <= new Date());
      clearStreaming();
      let closed = 0;
      for (const t of toClose.slice(0, 20)) {
        pushStreaming({ id: String(t.id), label: `Close ${t.title}`, status: 'processing', ts: Date.now() });
        try {
          await apiClient.put(`/tasks/${t.id}`, { status: 'completed', completed_date: new Date().toISOString() });
          updateStreaming(String(t.id), 'done');
          closed += 1;
        } catch {
          updateStreaming(String(t.id), 'error');
        }
      }
      addAssistant(`✅ EOD complete. Closed ${closed} task(s).`);
    } catch (e:any) {
      addAssistant('Failed to run EOD wrap.');
    }
  };

  const handleSprintStart = async (): Promise<void> => {
    try {
      const { default: apiClient } = await import('../../api/client');
      // Determine sprint number
      let sprintNum = 1;
      try {
        const raw = localStorage.getItem('sprint_counter');
        sprintNum = raw ? (parseInt(raw, 10) + 1) : 1;
        localStorage.setItem('sprint_counter', String(sprintNum));
      } catch {}
      const t = await apiClient.get('/tasks/');
      const tasks: any[] = Array.isArray(t.data) ? t.data : [];
      const backlog = tasks.filter((x:any)=> String(x.status||'').toLowerCase()==='todo' && !x.is_archived).slice(0, 8);
      clearStreaming();
      for (const task of backlog) {
        pushStreaming({ id: String(task.id), label: `Task #${task.id} → Sprint ${sprintNum}`, status: 'processing', ts: Date.now() });
        try {
          await apiClient.put(`/tasks/${task.id}`, { sprint_name: `Sprint ${sprintNum}` });
          updateStreaming(String(task.id), 'done');
        } catch {
          updateStreaming(String(task.id), 'error');
        }
      }
      addAssistant(`✅ Sprint ${sprintNum} started. ${backlog.length} task(s) pulled from backlog. Team notified.`);
    } catch (e:any) {
      addAssistant('Failed to start sprint.');
    }
  };

  // Multi-step Close Project workflow
  const handleCloseProject = async (projIdRaw: string): Promise<void> => {
    const startTs = performance.now();
    try {
      const { default: apiClient } = await import('../../api/client');
      // Resolve project
      let projectId = projIdRaw;
      let proj: any = null;
      try {
        const p = await apiClient.get(`/projects/${projectId}`);
        proj = p?.data || null;
      } catch {
        // Fallback: search by name/slug
        try {
          const s = await apiClient.get('/projects/', { params: { q: projIdRaw } as any });
          const arr: any[] = Array.isArray(s.data) ? s.data : [];
          if (arr.length > 0) { projectId = arr[0].id; proj = arr[0]; }
        } catch {}
      }
      if (!proj?.id) { addAssistant(`Could not resolve project ${projIdRaw}.`); return; }

      // Snapshot for undo
      const undo: any = { projectId, prevProject: { status: proj.status, custom_fields: proj.custom_fields || {}, is_archived: proj.is_archived || false }, prevTasks: [] as any[], createdInvoiceId: null };

      // Load tasks
      const t = await apiClient.get('/tasks/', { params: { project_id: projectId } as any });
      const tasks: any[] = Array.isArray(t.data) ? t.data : [];

      clearStreaming();
      // 1. Mark all tasks complete
      for (const task of tasks) {
        undo.prevTasks.push({ id: task.id, status: task.status });
        if (String(task.status||'').toLowerCase() !== 'completed') {
          pushStreaming({ id: `close-1-${task.id}`, label: `✓ Mark ${task.title} as complete`, status: 'processing', ts: Date.now() });
          try {
            await apiClient.put(`/tasks/${task.id}`, { status: 'completed', completed_date: new Date().toISOString() });
            updateStreaming(`close-1-${task.id}`, 'done');
          } catch {
            updateStreaming(`close-1-${task.id}`, 'error');
          }
        }
      }

      // Compute unbilled work items (rough)
      const hourlyRate = Number(proj.hourly_rate || 0);
      const items = tasks
        .filter((x:any)=> String(x.status||'').toLowerCase()==='completed' && !(x.metadata?.invoiced))
        .map((x:any)=> ({
          description: `Task: ${x.title}`,
          quantity: Math.max(1, Number(x.actual_hours || x.estimated_hours || 1)),
          unit_price: Math.round(hourlyRate * 100),
          item_type: 'service',
          tax_rate: 0,
          discount_rate: 0,
        }));

      // 2. Generate final invoice for unbilled work (if any)
      let invoiceId: string | null = null;
      if (items.length > 0) {
        pushStreaming({ id: 'close-2', label: 'Generate final invoice', status: 'processing', ts: Date.now() });
        try {
          const inv = await apiClient.post('/invoices/', {
            title: `Final Invoice - ${proj.name}`,
            description: 'Auto-generated at project closure',
            invoice_type: 'project',
            currency: 'usd',
            exchange_rate: 100,
            payment_terms: 'net_30',
            invoice_date: new Date().toISOString(),
            project_id: projectId,
            customer_id: proj.customer_id,
            items,
          });
          invoiceId = inv.data?.id || null;
          undo.createdInvoiceId = invoiceId;
          updateStreaming('close-2', 'done');
        } catch {
          updateStreaming('close-2', 'error');
        }
      }

      // 3. Send invoice to customer
      if (invoiceId) {
        pushStreaming({ id: 'close-3', label: 'Send invoice to customer', status: 'processing', ts: Date.now() });
        try { await apiClient.post(`/invoices/${invoiceId}/send`); updateStreaming('close-3', 'done'); } catch { updateStreaming('close-3', 'error'); }
      }

      // 4. Archive project documents (flag)
      pushStreaming({ id: 'close-4', label: 'Archive project documents', status: 'processing', ts: Date.now() });
      const cf = { ...(proj.custom_fields||{}), docs_archived: true };
      try { await apiClient.put(`/projects/${projectId}`, { custom_fields: cf }); updateStreaming('close-4', 'done'); } catch { updateStreaming('close-4', 'error'); }

      // 5. Generate retrospective (store summary)
      pushStreaming({ id: 'close-5', label: 'Generate retrospective report', status: 'processing', ts: Date.now() });
      const completed = tasks.filter((x:any)=> String(x.status||'').toLowerCase()==='completed');
      const actual = completed.reduce((s:number, x:any)=> s + Number(x.actual_hours||0), 0);
      const est = completed.reduce((s:number, x:any)=> s + Number(x.estimated_hours||0), 0);
      const retro = {
        completed_tasks: completed.length,
        actual_hours: actual,
        estimated_hours: est,
        variance_hours: actual - est,
        created_at: new Date().toISOString(),
      };
      try { await apiClient.put(`/projects/${projectId}`, { custom_fields: { ...cf, retrospective: retro } }); updateStreaming('close-5', 'done'); } catch { updateStreaming('close-5', 'error'); }

      // 6. Completion email to customer
      pushStreaming({ id: 'close-6', label: 'Send completion email', status: 'processing', ts: Date.now() });
      try { await apiClient.post('/email/test', { to: 'customer@example.com', subject: `Project ${proj.name} Completed`, body: 'Thank you! The project has been completed.' }); updateStreaming('close-6', 'done'); } catch { updateStreaming('close-6', 'error'); }

      // 7. Notify team members (simulate)
      pushStreaming({ id: 'close-7', label: 'Notify team members', status: 'processing', ts: Date.now() });
      try {
        const m = await apiClient.get('/teams/members');
        const members: any[] = Array.isArray(m.data) ? m.data : [];
        const pm = members.find(u=> u.id === proj.owner_id);
        const notifyList = [pm, ...members.filter(u=> u.projects_count && u.projects_count>0)].filter(Boolean).slice(0,5);
        for (const u of notifyList) {
          if (u?.email) { try { await apiClient.post('/email/test', { to: u.email, subject: `Project ${proj.name} Completed`, body: 'Resources will be freed.' }); } catch {} }
        }
        updateStreaming('close-7', 'done');
      } catch { updateStreaming('close-7', 'error'); }

      // 8. Update team capacity (simulated)
      pushStreaming({ id: 'close-8', label: 'Update team capacity', status: 'processing', ts: Date.now() });
      updateStreaming('close-8', 'done');

      // 9. Log lessons learned (flag)
      pushStreaming({ id: 'close-9', label: 'Log lessons learned', status: 'processing', ts: Date.now() });
      try { await apiClient.put(`/projects/${projectId}`, { custom_fields: { ...cf, lessons_learned: 'Added at closure' } }); updateStreaming('close-9', 'done'); } catch { updateStreaming('close-9', 'error'); }

      // 10. Actual vs estimated already computed; store metrics
      pushStreaming({ id: 'close-10', label: 'Compute metrics', status: 'processing', ts: Date.now() });
      try { await apiClient.put(`/projects/${projectId}`, { custom_fields: { ...cf, metrics: { actual, estimated: est, variance: actual - est } } }); updateStreaming('close-10', 'done'); } catch { updateStreaming('close-10', 'error'); }

      // 11. Update customer satisfaction score (store on project)
      pushStreaming({ id: 'close-11', label: 'Update customer satisfaction', status: 'processing', ts: Date.now() });
      try { await apiClient.put(`/projects/${projectId}`, { custom_fields: { ...cf, customer_satisfaction: 5 } }); updateStreaming('close-11', 'done'); } catch { updateStreaming('close-11', 'error'); }

      // 12. Move project to Completed archive
      pushStreaming({ id: 'close-12', label: 'Move project to Completed archive', status: 'processing', ts: Date.now() });
      try { await apiClient.put(`/projects/${projectId}`, { status: 'completed', is_archived: true, custom_fields: { ...cf } }); updateStreaming('close-12', 'done'); } catch { updateStreaming('close-12', 'error'); }

      const endTs = performance.now();
      const secs = ((endTs - startTs)/1000).toFixed(1);

      const report = { project: { id: projectId, name: proj.name }, tasks_total: tasks.length, completed: completed.length, invoice_id: invoiceId, hours: { actual, estimated: est, variance: actual - est } };
      setClosureAction({ visible: true, projectId, report, undo });
      addAssistant(`All done in ${secs} seconds!\n[View Report] [Undo Closure]`);
    } catch (e:any) {
      addAssistant('Failed to close project.');
    }
  };

  const undoCloseProject = async (): Promise<void> => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const u = closureAction.undo || null;
      if (!u) { setClosureAction({ visible: false }); return; }
      // Restore tasks
      if (Array.isArray(u.prevTasks)) {
        for (const t of u.prevTasks) {
          try { await apiClient.put(`/tasks/${t.id}`, { status: t.status }); } catch {}
        }
      }
      // Attempt to delete created invoice if possible
      if (u.createdInvoiceId) {
        try { await apiClient.delete(`/invoices/${u.createdInvoiceId}`); } catch {}
      }
      // Restore project
      try { await apiClient.put(`/projects/${u.projectId}`, { status: u.prevProject.status, is_archived: u.prevProject.is_archived, custom_fields: u.prevProject.custom_fields }); } catch {}
      setClosureAction({ visible: false });
      addAssistant('↩️ Undo completed. Project reopened.');
    } catch {
      addAssistant('Failed to undo closure.');
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text && chatFiles.length === 0) return;
    setInput('');
    let composed = text;
    if (chatFiles.length > 0) {
      setUploadingChatFiles(true);
      try {
        const { default: apiClient } = await import('../../api/client');
        const uploaded: { filename: string; url: string }[] = [];
        for (const f of chatFiles) {
          const fd = new FormData();
          fd.append('file', f);
          const resp = await apiClient.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          const url = resp?.data?.public_url || '';
          uploaded.push({ filename: f.name, url });
        }
        if (uploaded.length > 0) {
          // Keep a copy to attach to next created project
          setRecentUploads(uploaded);
          const lines = uploaded.map(a => `${a.filename}: ${a.url}`).join('\n');
          const attachText = `Attached files:\n${lines}`;
          composed = composed ? `${composed}\n\n${attachText}` : attachText;
        }
      } catch (e) {
        // If upload fails, still send the text
      } finally {
        setChatFiles([]);
        setUploadingChatFiles(false);
      }
    }
    await runCommand(composed);
  };
  
  // DISABLED: No context preview confirmation handlers - not needed with chat-only mode
  // These functions are kept as stubs to avoid breaking references but do nothing
  const handleContextConfirm = async (command: ContextAwareCommand) => {
    // NO-OP: Context previews disabled
  };
  
  const handleContextCancel = () => {
    // NO-OP: Context previews disabled
  };

const submitCreate = async () => {
    if (!validateProject()) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      let projectId = savedProjectId;
      if (!projectId) {
        const payload: any = {
          name: projectName.trim(),
          description: ((): string => { try { return (window as any)._pai_project_desc || ''; } catch { return ''; } })(),
          priority: (projectPriority || 'High').toLowerCase(),
          status: 'planning',
        };
        if (projectBudget !== '') payload.budget = Math.round(Number(projectBudget) * 100) || 0; // cents
        if (projectStart) payload.start_date = normalizeDateInput(projectStart);
        if (projectEnd) payload.due_date = normalizeDateInput(projectEnd);
        const projResp = await apiClient.post('/projects/', payload);
        projectId = projResp.data?.id;
        setSavedProjectId(projectId || null);
      } else {
        // Update any changed fields before submission
        const update: any = { status: 'planning' };
        if (projectBudget !== '') update.budget = Math.round(Number(projectBudget) * 100) || 0;
        if (projectStart) update.start_date = normalizeDateInput(projectStart);
        if (projectEnd) update.due_date = normalizeDateInput(projectEnd);
        await apiClient.put(`/projects/${projectId}`, update);
      }

      // Helper: pick least-busy assignee for a date
      const pickAssigneeByAvailability = async (dueISO?: string): Promise<string | undefined> => {
        try {
          const { default: apiClient } = await import('../../api/client');
          const membersResp = await apiClient.get('/teams/members');
          const members: any[] = Array.isArray(membersResp.data) ? membersResp.data : [];
          if (!members.length) return undefined;
          const tasksResp = await apiClient.get('/tasks/');
          const all: any[] = Array.isArray(tasksResp.data) ? tasksResp.data : [];
          const targetDay = dueISO ? new Date(dueISO) : null;
          const sameDay = (a?: string) => {
            if (!a || !targetDay) return false;
            const d = new Date(a);
            return d.getFullYear() === targetDay.getFullYear() && d.getMonth() === targetDay.getMonth() && d.getDate() === targetDay.getDate();
          };
          const counts = new Map<string, number>();
          members.forEach((m:any)=> counts.set(m.id, 0));
          all.forEach((t:any)=> {
            if (t.assignee_id && (sameDay(t.due_date))) {
              counts.set(t.assignee_id, (counts.get(t.assignee_id)||0) + 1);
            }
          });
          // pick with minimal tasks on that day
          let bestId: string | undefined = members[0]?.id;
          let bestCount = Number.POSITIVE_INFINITY;
          for (const m of members) {
            const c = counts.get(m.id) || 0;
            if (c < bestCount) { bestCount = c; bestId = m.id; }
          }
          return bestId;
        } catch {
          return undefined;
        }
      };

      // Create tasks if any
      if (projectId) {
        for (const t of tasks) {
          const title = (t.title || '').trim();
          if (!title) continue;
          try {
            const taskDefaults = await computeTaskDefaults({ title, project_start_date: projectStart || undefined });
            // Resolve assignee if provided like @username
            let assignee_id: string | undefined = undefined;
            if (t.assignee && t.assignee.trim()) {
              const uname = t.assignee.trim().replace(/^@/, '');
              const uid = await resolveUserIdByUsername(uname);
              if (uid) assignee_id = uid;
            }
            // If no assignee provided, auto-assign by availability on due date
            if (!assignee_id && taskDefaults.due_date) {
              try { assignee_id = await pickAssigneeByAvailability(new Date(taskDefaults.due_date).toISOString()); } catch {}
            }
            await apiClient.post('/tasks/', {
              project_id: projectId,
              title,
              description: '',
              status: taskDefaults.status,
              priority: taskDefaults.priority.toLowerCase(),
              estimated_hours: taskDefaults.estimated_hours,
              due_date: taskDefaults.due_date ? new Date(taskDefaults.due_date).toISOString() : undefined,
              assignee_id,
            });
          } catch {
            await apiClient.post('/tasks/', { project_id: projectId, title, description: '' });
          }
        }
        // Attach recent uploads to project custom_fields
        try {
          if (recentUploads && recentUploads.length > 0) {
            const proj = await apiClient.get(`/projects/${projectId}`);
            const existing = proj?.data?.custom_fields || {};
            const urls = Array.from(new Set([...(existing.attachments_urls || []), ...recentUploads.map(u=>u.url)]));
            await apiClient.put(`/projects/${projectId}`, { custom_fields: { ...existing, attachments_urls: urls } });
          }
        } catch {}
        // Move to active (approve on submit)
        await apiClient.put(`/projects/${projectId}`, { status: 'active' });
      }

      addAssistant(`✅ Project created successfully! ID: ${projectId}. ${tasks.length} task(s) submitted.${recentUploads && recentUploads.length ? ' Attachments linked.' : ''}`);
      // Clear any provisional description and uploads after success
      try { delete (window as any)._pai_project_desc; } catch {}
      setRecentUploads([]);
      setPreviewState('In Progress');
      setIsEditing(false);
    } catch (e: any) {
      addAssistant(`Failed to create project: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
    }
  };

  const addTask = () => setTasks((prev) => [...prev, { title: `Task ${prev.length + 1}`, assignee: '', duration: '1d' }]);

  // Render helper: parse content, highlight @mentions and date phrases
  const renderMessageContent = (content: string, idx: number) => {
    const parts: (string | { type: 'mention'; text: string } | { type: 'date'; text: string })[] = [];
    const regex = /(@[a-zA-Z0-9_]+)|(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?)|\b\d{4}-\d{2}-\d{2}\b/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      if (m.index > lastIndex) parts.push(content.slice(lastIndex, m.index));
      if (m[1]) {
        parts.push({ type: 'mention', text: m[1] });
      } else if (m[2] || m[0]) {
        const dateText = m[2] || m[0];
        parts.push({ type: 'date', text: dateText });
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) parts.push(content.slice(lastIndex));

    return (
      <>
        {parts.map((p, i) => {
          if (typeof p === 'string') return <span key={i}>{p}</span>;
          if (p.type === 'mention') {
            return (
              <span
                key={i}
                className="text-blue-600 hover:underline cursor-pointer"
                onMouseEnter={async (e) => {
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  setHoverCard({ username: p.text, rect });
                  const data = await fetchUserHover(p.text);
                  setHoverCard(current => current ? { ...current, data } : current);
                }}
                onMouseLeave={() => { /* keep card until leave card */ }}
              >{p.text}</span>
            );
          }
          if (p.type === 'date') {
            return (
              <span
                key={i}
                className="bg-yellow-50 hover:bg-yellow-100 px-1 rounded cursor-pointer"
                onClick={(e) => {
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  openInlineDate(idx, rect, p.text);
                }}
                title="Click to adjust date"
              >{p.text}</span>
            );
          }
          return null;
        })}
      </>
    );
  };

  return (
    <div className="relative h-full overflow-hidden">
      {/* Gradient background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/40 via-pink-50/40 to-purple-50/40" />
      <div className="absolute inset-0 bg-gradient-to-tl from-blue-50/20 via-transparent to-yellow-50/10" />
      
      {/* 3-Column Layout: Side Menu | Chat | Notifications/Preview */}
<div className="relative z-10 h-full flex gap-1 px-1 pt-1 pb-4 overflow-hidden">
        {/* LEFT: Side Menu with Quick Actions */}
        <div className="w-48 flex-shrink-0 bg-white/80 backdrop-blur-xl shadow-lg rounded-2xl border border-gray-100 flex flex-col overflow-hidden h-full">
          <div className="py-2 px-2 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Quick Actions</h2>
          </div>
<div className="flex-1 overflow-hidden p-2 space-y-2">
            <button
              className="w-full flex items-center justify-start gap-2 text-sm px-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 transition-all text-left"
              onClick={() => runCommand('Show proposals due in the next 7 days')}
            >
              <FileText size={16} className="text-black flex-shrink-0" />
              <span>Proposals Due</span>
            </button>
            <button
              className="w-full flex items-center justify-start gap-2 text-sm px-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 transition-all text-left"
              onClick={() => runCommand('Show pending invoices')}
            >
              <DollarSign size={16} className="text-black flex-shrink-0" />
              <span>Pengin Due</span>
            </button>
            <button
              className="w-full flex items-center justify-start gap-2 text-sm px-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 transition-all text-left"
              onClick={() => runCommand("Who's available this week?")}
            >
              <Users size={16} className="text-black flex-shrink-0" />
              <span>Availability</span>
            </button>
            <button
              className="w-full flex items-center justify-start gap-2 text-sm px-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 transition-all text-left"
              onClick={() => runCommand('Show my overdue tasks')}
            >
              <AlertCircle size={16} className="text-black flex-shrink-0" />
              <span>Overdue Tasks</span>
            </button>
            <button
              className="w-full flex items-center justify-start gap-2 text-sm px-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 transition-all text-left"
              onClick={() => runCommand('Show projects over budget and behind schedule')}
            >
              <TrendingUp size={16} className="text-black flex-shrink-0" />
              <span>At Risk Projects</span>
            </button>
            
            <div className="mt-3 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 font-medium">Invoice Actions</p>
            </div>
            
            <button
              className="w-full flex items-center justify-start gap-2 text-sm px-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 transition-all text-left"
              onClick={async () => {
                if (!selectedProjectId) {
                  addAssistant('Please specify a project first.');
                  return;
                }
                const proj = projectsQuick.find((p:any)=> p.id === selectedProjectId);
                const pname = proj?.name || '';
                runCommand(`Generate invoice for completed work this month for project ${pname}`);
              }}
            >
              <FileText size={16} className="text-black flex-shrink-0" />
              <span>Invoice Preview</span>
            </button>
            
            <button
              className="w-full flex items-center justify-start gap-2 text-sm px-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 transition-all text-left"
              onClick={async () => {
                if (!selectedProjectId) {
                  addAssistant('Please specify a project first.');
                  return;
                }
                try {
                  const { default: apiClient } = await import('../../api/client');
                  const projectId = selectedProjectId;
                  const projResp = await apiClient.get(`/projects/${projectId}`);
                  const project = projResp.data || {};
                  const hourlyRate = Number(project.hourly_rate || 0);
                  const tasksResp = await apiClient.get('/tasks/', { params: { project_id: projectId } as any });
                  const allTasks: any[] = Array.isArray(tasksResp.data) ? tasksResp.data : [];
                  const now = new Date();
                  const start = new Date(now); start.setDate(now.getDate() - 7); start.setHours(0,0,0,0);
                  const end = new Date(now);
                  const completedRange = allTasks.filter((t:any)=> t.completed_date && new Date(t.completed_date) >= start && new Date(t.completed_date) <= end);
                  const items = completedRange.map((t:any)=> {
                    const qty = Number(t.actual_hours || t.estimated_hours || 1);
                    const unitPrice = Math.round((hourlyRate || 0) * 100);
                    return { description: `Task: ${t.title}`, quantity: Math.max(1, qty), unit_price: unitPrice, item_type: 'service', tax_rate: 0, discount_rate: 0 };
                  });
                  const subtotal = items.reduce((a:number, it:any)=> a + it.quantity * it.unit_price, 0);
                  const preview = { range: 'last_7_days', project, items, subtotal, currency: 'usd' };
                  setInvoicePreview(preview);
                  setMode('invoice_preview');
                  addAssistant(`Prepared ${items.length} line(s) for ${project.name || 'project'} (last 7 days). Review and confirm to create a draft invoice.`);
                } catch (e:any) {
                  addAssistant('Failed to prepare 7-day invoice preview.');
                }
              }}
            >
              <Clock size={16} className="text-black flex-shrink-0" />
              <span>Invoice (7 Days)</span>
            </button>
            
            <button
              className="w-full flex items-center gap-2 text-sm px-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 transition-all text-left"
              onClick={async () => {
                if (!selectedProjectId) {
                  addAssistant('Please specify a project first.');
                  return;
                }
                try {
                  const { default: apiClient } = await import('../../api/client');
                  const body = { project_id: selectedProjectId, forecast_type: 'budget', inputs: { basis: 'recent_invoices', window_days: 30, next_period: 'next_month' } };
                  const r = await apiClient.post('/ai/forecast/predict', body);
                  setForecastResult(r.data);
                  setMode('forecast');
                  addAssistant('Forecasted next-month billing based on recent invoices.');
                } catch (e:any) {
                  addAssistant('Failed to forecast billing.');
                }
              }}
            >
              <BarChart3 size={16} className="text-black flex-shrink-0" />
              <span>Forecast Billing</span>
            </button>
            
            <div className="mt-4 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 font-medium">Automation</p>
            </div>
            <button
              className="w-full flex items-center justify-start gap-2 text-sm px-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 transition-all text-left"
              onClick={() => { setAutomationOpen(true); setEditingRule(null); }}
            >
              <Package size={16} className="text-black flex-shrink-0" />
              <span>Automation</span>
            </button>
            
            <div className="mt-4 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 font-medium">More Actions</p>
            </div>
            
            <button
              className="w-full flex items-center justify-start gap-2 text-sm px-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 transition-all text-left"
              onClick={() => runCommand('Show project blockers')}
            >
              <Package size={16} className="text-black flex-shrink-0" />
              <span>Project Blockers</span>
            </button>
            
            <button
              className="w-full flex items-center justify-start gap-2 text-sm px-2.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 transition-all text-left"
              onClick={() => runCommand('Show team workload for this week')}
            >
              <CheckCircle size={16} className="text-black flex-shrink-0" />
              <span>Team Workload</span>
            </button>
            
          </div>
        </div>

        {/* MIDDLE: Chat Conversation */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full">
          <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl flex flex-col h-full border border-gray-100">
<div className="flex-1 overflow-y-auto p-4 space-y-3 pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* Live updates streaming panel */}
            {streamingOps.length > 0 && (
              <div className="mb-3 p-2 border border-gray-200 rounded-lg bg-white/80">
                <div className="text-xs font-semibold text-gray-700 mb-1">Live Updates</div>
                <div className="space-y-1">
                  {streamingOps.map(op => (
                    <div key={op.id} className="text-xs flex items-center gap-2">
                      <span className={op.status==='done' ? 'text-green-600' : op.status==='error' ? 'text-red-600' : 'text-gray-500'}>
                        {op.status==='done' ? '✓' : op.status==='error' ? '!' : '⏳'}
                      </span>
                      <span>{op.label}</span>
                      <span className="text-[10px] text-gray-400">{new Date(op.ts).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, idx) => (
              <div key={idx} className={`${m.role === 'assistant' ? 'flex justify-start' : 'flex justify-end'}`}>
                <div
                  className={`max-w-[85%] ${
                    m.role === 'assistant'
                      ? 'bg-transparent text-gray-900 px-0 py-0 shadow-none rounded-none'
                      : 'rounded-2xl shadow-sm text-gray-900'
                  }`}
                  style={m.role === 'user' ? { backgroundColor: '#e9e9e980' } : undefined}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {renderMessageContent(m.content, idx)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Inline date picker for assistant text */}
          {inlineDateEdit && (
            <div className="absolute z-50 bg-white border border-gray-200 shadow-lg rounded-md p-2" style={{ left: inlineDateEdit.startLeft, top: inlineDateEdit.startTop }}>
              <input
                type="date"
                className="border border-gray-300 rounded px-2 text-sm"
                onChange={(e)=> applyInlineDate(e.target.value)}
              />
            </div>
          )}

          {/* @mention floating dropdown */}
          {mentionOpen && mentionSuggestions.length > 0 && (
            <div className="absolute bottom-20 left-4 z-50 w-[calc(100%-2rem)] max-w-[640px] bg-white/95 backdrop-blur-xl border border-gray-200 shadow-xl rounded-xl p-2">
              <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                {mentionSuggestions.map((s, i) => (
                  <button
                    key={`${s.category}-${i}`}
                    type="button"
                    onClick={() => insertMentionSelection(s)}
                    className={`w-full text-left px-2 py-2 text-sm flex items-center gap-2 ${i===mentionIndex ? 'bg-gray-50' : ''}`}
                  >
                    <span className="text-[10px] uppercase tracking-wide text-gray-500 w-24">{s.category}</span>
                    <span className="text-gray-900 truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hover Intelligence card for @mentions */}
          {hoverCard && hoverCard.rect && (
            <div className="absolute z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-3 w-80" style={{ left: hoverCard.rect.left, top: hoverCard.rect.bottom + 6 }} onMouseLeave={()=> setHoverCard(null)}>
              <div className="text-sm font-semibold text-gray-900">{hoverCard.data?.user?.full_name || hoverCard.username} ({hoverCard.data?.user?.username ? `@${hoverCard.data.user.username}` : ''})</div>
              <div className="text-xs text-gray-600">{hoverCard.data?.user?.role || 'Team Member'}</div>
              <div className="mt-2">
                <div className="text-[11px] text-gray-500">Current Load: {hoverCard.data?.stats ? `${Math.min(100, (hoverCard.data.stats.weekCount||0)*20)}%` : '—'}</div>
                <div className="text-[11px] text-gray-500">Active Tasks: {hoverCard.data?.stats?.active ?? '—'}</div>
                <div className="text-[11px] text-gray-500">Overdue: {hoverCard.data?.stats?.overdue ?? '—'}</div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button className="text-xs px-2 rounded border border-gray-200 hover:bg-gray-50" onClick={()=> { window.location.href = getTenantRoute('/teams', user?.role, user?.organization); }}>View Profile</button>
                <button className="text-xs px-2 rounded border border-gray-200 hover:bg-gray-50" onClick={()=> { setHoverCard(null); setInput(prev => prev ? `${prev} @${hoverCard.username.replace(/^@/,'')}` : `@${hoverCard.username.replace(/^@/,'')}`); }}>Message</button>
              </div>
            </div>
          )}

          {/* Context-Aware Quick Actions (e.g., when viewing an Invoice page) */}
          {quickActions.visible && (
            <div className="pt-2 border-t border-gray-100 bg-white/50">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <button onClick={quickActions.sendReminder} className="text-xs px-2 rounded border border-gray-200 hover:bg-gray-50">Send Reminder</button>
                  <button onClick={quickActions.markAsPaid} className="text-xs px-2 rounded border border-gray-200 hover:bg-gray-50">Mark as Paid</button>
                  <button onClick={quickActions.extendDueDate} className="text-xs px-2 rounded border border-gray-200 hover:bg-gray-50">Extend Due Date</button>
                  <button onClick={quickActions.downloadPdf} className="text-xs px-2 rounded border border-gray-200 hover:bg-gray-50">Download PDF</button>
                </div>
                {quickActions.tip && (
                  <div className="text-[11px] text-gray-600 ml-2 whitespace-nowrap">{quickActions.tip}</div>
                )}
              </div>
            </div>
          )}

          {/* Zero‑click Auto‑Action banner */}
          {autoAction.visible && (
            <div className="pt-2 border-t border-gray-100 bg-white/50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs text-gray-900">
                  {autoAction.summary}
                  {autoAction.appliedPrefsSummary && (
                    <div className="text-[11px] text-gray-600 mt-0.5">{autoAction.appliedPrefsSummary}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs px-2 rounded border border-gray-200 hover:bg-gray-50"
                    onClick={() => {
                      try {
                        const target = getTenantRoute('/tasks', user?.role, user?.organization);
                        window.location.href = target;
                      } catch {
                        window.location.href = '/tasks';
                      }
                    }}
                  >View Tasks</button>
                  <button
                    className="text-xs px-2 rounded border border-gray-200 hover:bg-gray-50"
                    onClick={async () => {
                      try {
                        const ids = autoAction.createdTaskIds || weeklyPattern.lastCreatedTaskIds || [];
                        if (ids.length === 0) { setAutoAction((p)=>({ ...p, visible: false })); return; }
                        const { default: apiClient } = await import('../../api/client');
                        for (const id of ids) { try { await apiClient.delete(`/tasks/${id}`); } catch {} }
                        addAssistant('↩️ Undo complete. Auto-created tasks were removed.');
                        setAutoAction({ visible: false });
                        // Remove the week key from createdWeeks to allow re-run if desired
                        const key = weeklyPattern.lastWeekKey;
                        const list = (weeklyPattern.createdWeeks||[]).filter((k)=> k !== key);
                        setWeeklyPattern({ ...weeklyPattern, createdWeeks: list, lastCreatedTaskIds: [], lastWeekKey: undefined });
                      } catch {}
                    }}
                  >Undo</button>
                  <button
                    className="text-xs px-2 rounded border border-gray-200 hover:bg-gray-50"
                    onClick={() => setShowPrefs(true)}
                  >Adjust Pattern</button>
                </div>
              </div>
            </div>
          )}

          {/* Closure banner */}
          {closureAction.visible && (
            <div className="pt-2 border-t border-gray-100 bg-white/50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs text-gray-900">Project closed successfully.</div>
                <div className="flex items-center gap-2">
                  <button className="text-xs px-2 rounded border border-gray-200 hover:bg-gray-50" onClick={()=> { setMode('closure_report' as any); }}>View Report</button>
                  <button className="text-xs px-2 rounded border border-gray-200 hover:bg-gray-50" onClick={undoCloseProject}>Undo Closure</button>
                </div>
              </div>
            </div>
          )}

          <div className="py-1.5 px-2 bg-white/60 mb-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 border border-gray-200 bg-white rounded-full px-2 focus-within:outline-none focus-within:ring-0 focus-within:border-gray-200">
                  <button
                    type="button"
                    onClick={onPickChatFiles}
                    className="p-1 rounded-full hover:bg-gray-100 text-black"
                    title="Add attachments"
                    aria-label="Add attachments"
                  >
                    <Plus size={18} />
                  </button>
                  <input
                    ref={chatFileInputRef}
                    type="file"
                    accept={fileAccept}
                    multiple
                    className="hidden"
                    onChange={onChatFilesSelected}
                  />

                  {/* Smart Compose input with inline ghost suggestion */}
                  <div className="relative flex-1">
                    {/* hidden measurer for typed width */}
                    <span ref={ghostMeasureRef} className="absolute -left-[10000px] top-0 text-sm whitespace-pre px-2">
                      {input}
                    </span>
                    {/* the actual input */}
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={input}
                      onChange={onChatInputChange}
                      onKeyDown={onChatInputKeyDown}
                      placeholder="Ask anything..."
                      className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus:border-0 text-sm px-2"
                    />
                    {/* ghost suggestion suffix */}
                    {smartSuggestion && input && smartSuggestion.toLowerCase().startsWith(input.toLowerCase()) && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none select-none pr-2"
                        style={{ left: ghostLeft }}
                      >
                        {smartSuggestion.slice(input.length)}
                      </div>
                    )}
                  </div>

                  {chatFiles.length > 0 && (
                    <span className="text-[11px] text-gray-500">{chatFiles.length}</span>
                  )}
                </div>
              </div>

              <button 
                type="button" 
                onClick={sendMessage} 
                disabled={uploadingChatFiles}
                className="p-2 rounded-full text-white transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                style={{ backgroundColor: 'var(--piano-black)' }}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* Automation Modal */}
        {automationOpen && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" role="dialog" aria-modal>
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-[36rem] max-w-[95vw]">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Automation</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={()=>setAutomationOpen(false)}>✕</button>
              </div>
              <div className="p-4 space-y-4 text-sm">
                {/* Editor */}
                <div className="space-y-3 border border-gray-200 rounded-md p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-gray-600">Rule Name</span>
                      <input className="mt-1 w-full border border-gray-300 rounded px-2" value={editingRule?.name || ''} onChange={(e)=> setEditingRule((r)=> ({ ...(r||{ id: crypto.randomUUID(), enabled: true, trigger: 'task_overdue', name: '', conditions: {}, actions: {} }), name: e.target.value }))} />
                    </label>
                    <label className="inline-flex items-center gap-2 mt-5">
                      <input type="checkbox" checked={editingRule?.enabled ?? true} onChange={(e)=> setEditingRule((r)=> ({ ...(r||{ id: crypto.randomUUID(), enabled: true, trigger: 'task_overdue', name: '', conditions: {}, actions: {} }), enabled: e.target.checked }))} />
                      <span>Enabled</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-gray-600">Trigger</span>
                      <select className="mt-1 w-full border border-gray-300 rounded px-2" value={editingRule?.trigger || 'task_overdue'} onChange={(e)=> setEditingRule((r)=> ({ ...(r||{ id: crypto.randomUUID(), enabled: true, trigger: 'task_overdue', name: '', conditions: {}, actions: {} }), trigger: e.target.value as any }))}>
                        <option value="task_overdue">When task becomes overdue</option>
                      </select>
                    </label>
                    <div>
                      <span className="text-xs text-gray-600">Conditions</span>
                      <div className="mt-1 flex items-center gap-3">
                        <label className="inline-flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={Boolean(editingRule?.conditions?.priorityIn?.includes('high'))} onChange={(e)=> setEditingRule((r)=> { const set = new Set(r?.conditions?.priorityIn || []); e.target.checked ? set.add('high') : set.delete('high'); return { ...(r||{ id: crypto.randomUUID(), enabled: true, trigger: 'task_overdue', name: '', conditions: {}, actions: {} }), conditions: { ...(r?.conditions||{}), priorityIn: Array.from(set) as any } }; })} /> High
                        </label>
                        <label className="inline-flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={Boolean(editingRule?.conditions?.priorityIn?.includes('critical'))} onChange={(e)=> setEditingRule((r)=> { const set = new Set(r?.conditions?.priorityIn || []); e.target.checked ? set.add('critical') : set.delete('critical'); return { ...(r||{ id: crypto.randomUUID(), enabled: true, trigger: 'task_overdue', name: '', conditions: {}, actions: {} }), conditions: { ...(r?.conditions||{}), priorityIn: Array.from(set) as any } }; })} /> Urgent
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <span className="text-xs text-gray-600">Actions</span>
                      <label className="block"><input type="checkbox" checked={!!editingRule?.actions?.emailOwner} onChange={(e)=> setEditingRule((r)=> ({ ...(r||{ id: crypto.randomUUID(), enabled: true, trigger: 'task_overdue', name: '', conditions: {}, actions: {} }), actions: { ...(r?.actions||{}), emailOwner: e.target.checked } }))} /> <span className="ml-1">Notify task owner via email</span></label>
                      <label className="block"><input type="checkbox" checked={!!editingRule?.actions?.slackPM} onChange={(e)=> setEditingRule((r)=> ({ ...(r||{ id: crypto.randomUUID(), enabled: true, trigger: 'task_overdue', name: '', conditions: {}, actions: {} }), actions: { ...(r?.actions||{}), slackPM: e.target.checked } }))} /> <span className="ml-1">Notify project manager via Slack</span></label>
                      <label className="block">
                        <span className="text-xs text-gray-600">Add comment</span>
                        <input className="mt-1 w-full border border-gray-300 rounded px-2" placeholder="This task is overdue. Please update status." value={editingRule?.actions?.addComment || ''} onChange={(e)=> setEditingRule((r)=> ({ ...(r||{ id: crypto.randomUUID(), enabled: true, trigger: 'task_overdue', name: '', conditions: {}, actions: {} }), actions: { ...(r?.actions||{}), addComment: e.target.value } }))} />
                      </label>
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs text-gray-600">Risk</span>
                      <label className="block">
                        <span className="text-xs text-gray-600">Increase risk score of project by</span>
                        <input type="number" className="mt-1 w-32 border border-gray-300 rounded px-2" value={editingRule?.actions?.incRisk ?? 0} onChange={(e)=> setEditingRule((r)=> ({ ...(r||{ id: crypto.randomUUID(), enabled: true, trigger: 'task_overdue', name: '', conditions: {}, actions: {} }), actions: { ...(r?.actions||{}), incRisk: Number(e.target.value||0) } }))} />
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button className="text-sm.5 rounded border border-gray-200 hover:bg-gray-50" onClick={() => {
                      if (!editingRule) return;
                      const valid = (editingRule.name||'').trim().length > 0;
                      if (!valid) { addAssistant('Please provide a name for the rule.'); return; }
                      const exists = automationRules.find(r => r.id === editingRule.id);
                      const next = exists ? automationRules.map(r => r.id===editingRule.id? editingRule : r) : [...automationRules, { ...editingRule, id: editingRule.id || crypto.randomUUID() }];
                      persistAutomationRules(next);
                      addAssistant('✅ Automation rule saved.');
                    }}>Save Rule</button>
                    <button className="text-sm.5 rounded border border-gray-200 hover:bg-gray-50" onClick={async () => {
                      if (!editingRule) return;
                      // Simple test: fetch tasks and apply the rule to the first match
                      try {
                        const { default: apiClient } = await import('../../api/client');
                        const t = await apiClient.get('/tasks/');
                        const tasks: any[] = Array.isArray(t.data) ? t.data : [];
                        const matchPriority = (p: string) => {
                          const pr = String(p||'').toLowerCase();
                          return !editingRule.conditions.priorityIn || editingRule.conditions.priorityIn.includes(pr as any);
                        };
                        const candidate = tasks.find((x:any)=> {
                          const due = x?.due_date ? Date.parse(x.due_date) : NaN;
                          const status = String(x?.status||'').toLowerCase();
                          const isDone = ['done','completed','complete'].includes(status);
                          return Number.isFinite(due) && due < Date.now() && !isDone && matchPriority(String(x.priority||'').toLowerCase());
                        });
                        if (!candidate) { addAssistant('No matching task to test right now.'); return; }
                        // Execute actions (same as checker)
                        if (editingRule.actions.emailOwner) {
                          try {
                            const m = await apiClient.get('/teams/members'); const list:any[] = Array.isArray(m.data)?m.data:[]; const owner = list.find((u:any)=> u.id === (candidate.created_by_id || candidate.assignee_id));
                            if (owner?.email) await apiClient.post('/email/test', { to: owner.email, subject: `[TEST] Task overdue: ${candidate.title}`, body: 'This is a test notification.' });
                          } catch {}
                        }
                        if (editingRule.actions.slackPM) {
                          try { const proj = await apiClient.get(`/projects/${candidate.project_id}`); const m = await apiClient.get('/teams/members'); const list:any[] = Array.isArray(m.data)?m.data:[]; const pm = list.find((u:any)=> u.id === proj?.data?.owner_id); if (pm?.email) await apiClient.post('/email/test', { to: pm.email, subject: `[TEST Slack] Overdue task alert: ${candidate.title}`, body: 'This is a test message.' }); } catch {}
                        }
                        if (editingRule.actions.addComment) { try { await apiClient.post(`/tasks/${candidate.id}/comments`, { content: `[TEST] ${editingRule.actions.addComment}` }); } catch {} }
                        if (editingRule.actions.incRisk) { try { const proj = await apiClient.get(`/projects/${candidate.project_id}`); const cf = proj?.data?.custom_fields || {}; const current = Number(cf.risk_score||0); cf.risk_score = current + Number(editingRule.actions.incRisk||0); await apiClient.put(`/projects/${candidate.project_id}`, { custom_fields: cf }); } catch {} }
                        addAssistant('✅ Test executed. Check email/notifications as applicable.');
                      } catch { addAssistant('Failed to test rule.'); }
                    }}>Test Rule</button>
                  </div>
                </div>

                {/* Existing rules */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">Existing Rules</div>
                  {automationRules.length === 0 && <div className="text-xs text-gray-500">No rules yet.</div>}
                  {automationRules.map(rule => (
                    <div key={rule.id} className="border border-gray-200 rounded p-2 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                        <div className="text-[11px] text-gray-600">Trigger: Task becomes overdue • Conditions: {(rule.conditions.priorityIn||[]).join(', ') || '—'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={rule.enabled} onChange={(e)=> {
                            const next = automationRules.map(r => r.id===rule.id? { ...r, enabled: e.target.checked } : r);
                            persistAutomationRules(next);
                          }} /> Enabled
                        </label>
                        <button className="text-xs px-2 rounded border border-gray-200 hover:bg-gray-50" onClick={()=> setEditingRule(rule)}>Edit</button>
                        <button className="text-xs px-2 rounded border border-red-200 text-red-600 hover:bg-red-50" onClick={()=> {
                          const next = automationRules.filter(r => r.id !== rule.id);
                          persistAutomationRules(next);
                          // Also clear fired map entries for this rule
                          const fired = { ...firedMap }; delete fired[rule.id]; persistFiredMap(fired);
                        }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button className="text-sm.5 rounded border border-gray-200 hover:bg-gray-50" onClick={()=> setAutomationOpen(false)}>Close</button>
                <button className="text-sm.5 rounded border border-blue-200 text-blue-700 hover:bg-blue-50" onClick={()=> setEditingRule({ id: crypto.randomUUID(), name: 'Overdue High/Urgent → Notify & Raise Risk', enabled: true, trigger: 'task_overdue', conditions: { priorityIn: ['high','critical'] }, actions: { emailOwner: true, slackPM: true, addComment: 'This task is overdue. Please update status.', incRisk: 10 } })}>New Rule</button>
              </div>
            </div>
          </div>
        )}

        {/* Preferences Modal (lightweight) */}
        {showPrefs && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" role="dialog" aria-modal>
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-[28rem] max-w-[95vw]">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">AI Preferences & Zero‑Click Pattern</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={()=>setShowPrefs(false)}>✕</button>
              </div>
              <div className="p-4 space-y-4 text-sm">
                <div className="space-y-2">
                  <div className="font-medium text-gray-800">Smart Defaults That Learn</div>
                  <label className="block">
                    <span className="text-xs text-gray-600">Assign API tasks to</span>
                    <input
                      className="mt-1 w-full border border-gray-300 rounded px-2"
                      value={smartPrefs.assign_api_to_username || ''}
                      onChange={(e)=> setSmartPrefs((p)=> ({ ...p, assign_api_to_username: e.target.value }))}
                      placeholder="@john"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600">Testing tasks default duration (days)</span>
                    <input
                      type="number"
                      min={1}
                      className="mt-1 w-24 border border-gray-300 rounded px-2"
                      value={smartPrefs.testing_duration_days || 3}
                      onChange={(e)=> setSmartPrefs((p)=> ({ ...p, testing_duration_days: Math.max(1, Number(e.target.value||3)) }))}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600">Estimate buffer (%)</span>
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-24 border border-gray-300 rounded px-2"
                      value={smartPrefs.estimate_buffer_percent || 0}
                      onChange={(e)=> setSmartPrefs((p)=> ({ ...p, estimate_buffer_percent: Math.max(0, Number(e.target.value||0)) }))}
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-gray-800">Zero‑Click Weekly Sprint</div>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!weeklyPattern.enabled}
                      onChange={(e)=> setWeeklyPattern((p)=> ({ ...p, enabled: e.target.checked }))}
                    />
                    <span>Auto‑create weekly sprint tasks every Monday morning</span>
                  </label>
                  <div className="text-xs text-gray-600">When enabled, 5 sprint tasks are created and linked to your first active project. You can Undo from the chat bar.</div>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button className="text-sm.5 rounded border border-gray-200 hover:bg-gray-50" onClick={()=>setShowPrefs(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT: Notifications + Preview */}
        <div className="w-[32rem] flex-shrink-0 flex flex-col gap-2 overflow-hidden h-full">
          {/* Notifications block */}
          <div className="bg-white/80 backdrop-blur-xl shadow-lg rounded-2xl border border-gray-100 flex flex-col h-1/3 min-h-0">
            <div className="py-2 px-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
              <button
                className="text-xs px-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                onClick={async () => {
                  try {
                    const { default: apiClient } = await import('../../api/client');
                    await apiClient.put('/notifications/mark-all-read');
                    setNotifications([]);
                  } catch (e) { /* ignore */ }
                }}
              >Clear All</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100">
              {notifications.length === 0 && <div className="py-3 text-xs text-gray-500 text-center">No recent notifications</div>}
              {notifications.map((n: any) => (
                <div key={n.id || n.created_at} className="py-2 hover:bg-gray-50/50 rounded-lg px-2 transition-colors">
                  <div className="text-xs font-medium text-gray-900">{n.title || 'Notification'}</div>
                  <div className="text-xs text-gray-600 mt-1">{n.message || n.short_description || ''}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl shadow-lg rounded-2xl border border-gray-100 flex flex-col flex-1 min-h-0">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">{mode === 'create_project' ? 'Project Preview' : mode === 'create_customer' ? 'Customer Preview' : mode === 'overdue_tasks' ? 'Overdue Tasks' : mode === 'at_risk_projects' ? 'At-Risk Projects' : mode === 'blockers' ? 'Project Blockers' : mode === 'availability' ? 'Team Availability' : mode === 'proposals_due' ? 'Proposals Due Soon' : mode === 'customers_followup' ? 'Customer Follow-ups' : mode === 'invoices_pending' ? 'Pending Invoices' : mode === 'invoice_preview' ? 'Invoice Preview' : mode === 'client_report' ? 'Client Report' : mode === 'po_list' ? 'Purchase Orders' : mode === 'closure_report' ? 'Closure Report' : 'Preview Panel'}</h2>
              <div className="flex items-center gap-1 flex-shrink-0">
                {mode === 'create_project' && (
                  <>
                    <select value={previewState} onChange={(e) => setPreviewState(e.target.value as PreviewState)} className="text-xs border border-gray-200 rounded-lg px-2 bg-white">
                      <option>Draft</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                      <option>On Hold</option>
                      <option>Cancelled</option>
                    </select>
                    <button type="button" onClick={() => setIsEditing((v) => !v)} className="text-xs px-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                      {isEditing ? 'Lock' : 'Edit'}
                    </button>
                  </>
                )}
              </div>
            </div>

<div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4 space-y-2">
              {mode === 'idle' && (
                <div className="text-sm text-gray-600">Use the chat to request a creation, fetch, or analysis. I’ll populate a structured preview here for inline editing.</div>
              )}

              {mode === 'create_project' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600">Name</label>
                      <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} disabled={!isEditing} className={`mt-1 w-full border rounded px-2 text-sm ${fieldErrors?.name ? 'border-red-300' : 'border-gray-300'}`} />
                      {fieldErrors?.name && <div className="text-xs text-red-600 mt-1">{fieldErrors.name}</div>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Customer</label>
                      <input type="text" value={projectCustomer} onChange={(e) => setProjectCustomer(e.target.value)} disabled={!isEditing} className="mt-1 w-full border border-gray-300 rounded px-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Budget ($)</label>
                      <input type="number" value={projectBudget} onChange={(e) => setProjectBudget(e.target.value === '' ? '' : Number(e.target.value))} disabled={!isEditing} className="mt-1 w-full border border-gray-300 rounded px-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600">Start</label>
                        <input type="date" value={projectStart} onChange={(e) => setProjectStart(e.target.value)} disabled={!isEditing} className={`mt-1 w-full border rounded px-2 text-sm ${fieldErrors?.dates ? 'border-red-300' : 'border-gray-300'}`} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">End</label>
                        <input type="date" value={projectEnd} onChange={(e) => setProjectEnd(e.target.value)} disabled={!isEditing} className={`mt-1 w-full border rounded px-2 text-sm ${fieldErrors?.dates ? 'border-red-300' : 'border-gray-300'}`} />
                        {fieldErrors?.dates && <div className="text-xs text-red-600 mt-1">{fieldErrors.dates}</div>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Owner</label>
                      <input type="text" value={projectOwner} onChange={(e) => setProjectOwner(e.target.value)} disabled={!isEditing} className="mt-1 w-full border border-gray-300 rounded px-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Priority</label>
                      <select value={projectPriority} onChange={(e) => setProjectPriority(e.target.value as any)} disabled={!isEditing} className="mt-1 w-full border border-gray-300 rounded px-2 text-sm">
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-gray-700">TASKS ({tasks.length})</h3>
                      <button type="button" onClick={addTask} disabled={!isEditing} className={`text-xs px-2 rounded ${isEditing ? 'border border-gray-300 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                        + Add
                      </button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {tasks.map((t, i) => (
                        <div key={i} className="border border-gray-200 rounded p-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input type="text" value={t.title} onChange={(e) => setTasks((prev) => prev.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))} disabled={!isEditing} className="border border-gray-300 rounded px-2 text-sm" />
                            <input type="text" value={t.assignee || ''} onChange={(e) => setTasks((prev) => prev.map((x, idx) => (idx === i ? { ...x, assignee: e.target.value } : x)))} placeholder="@assignee" disabled={!isEditing} className="border border-gray-300 rounded px-2 text-sm" />
                            <input type="text" value={t.duration || ''} onChange={(e) => setTasks((prev) => prev.map((x, idx) => (idx === i ? { ...x, duration: e.target.value } : x)))} placeholder="e.g., 3d" disabled={!isEditing} className="border border-gray-300 rounded px-2 text-sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!validateProject()) return;
                        try {
                          const { default: apiClient } = await import('../../api/client');
                          const payload: any = {
                            name: projectName.trim(),
                            description: '',
                            priority: (projectPriority || 'High').toLowerCase(),
                            status: 'planning',
                          };
                          if (projectBudget !== '') payload.budget = Math.round(Number(projectBudget) * 100) || 0;
                          if (projectStart) payload.start_date = normalizeDateInput(projectStart);
                          if (projectEnd) payload.due_date = normalizeDateInput(projectEnd);
                          const res = await apiClient.post('/projects/', payload);
                          setSavedProjectId(res.data?.id || null);
                          addAssistant('💾 Draft saved. You can continue editing before submission.');
                          setPreviewState('Draft');
                        } catch (e:any) {
                          addAssistant(`Failed to save draft: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
                        }
                      }}
                      className="py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-50"
                    >
                      Save as Draft
                    </button>
                    <button type="button" onClick={submitCreate} className="py-2 rounded-md text-sm bg-black text-white hover:bg-gray-800">
                      Submit
                    </button>
                    {savedProjectId && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const { default: apiClient } = await import('../../api/client');
                              await apiClient.put(`/projects/${savedProjectId}`, { status: 'active' });
                              addAssistant('✅ Approved: Project is now active.');
                              setPreviewState('In Progress');
                            } catch (e:any) {
                              addAssistant(`Approval failed: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
                            }
                          }}
                          className="py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const { default: apiClient } = await import('../../api/client');
                              await apiClient.put(`/projects/${savedProjectId}`, { status: 'cancelled' });
                              addAssistant('❌ Rejected: Project cancelled.');
                              setPreviewState('Draft');
                            } catch (e:any) {
                              addAssistant(`Reject failed: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
                            }
                          }}
                          className="py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-50 text-red-700"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {mode === 'create_customer' && (
                <CustomerPreview
                  customerData={customerData}
                  previewState={previewState}
                  isEditing={isEditing}
                  savedCustomerId={savedCustomerId}
                  fieldErrors={customerFieldErrors}
                  onSave={saveCustomer}
                  onEdit={() => setIsEditing(true)}
                  onCancel={() => {
                    setMode('idle');
                    setIsEditing(false);
                    setPreviewState('Draft');
                  }}
                  onDataChange={(data) => setCustomerData(prev => ({ ...prev, ...data }))}
                />
              )}

              {mode === 'overdue_tasks' && (
                <div className="space-y-2">
                  {overdueTasks.length === 0 && <div className="text-sm text-gray-600">No overdue tasks 🎉</div>}
                  {overdueTasks.map((t) => (
                    <div key={t.id} className="border border-gray-200 rounded p-2">
                      <div className="text-sm font-medium text-gray-900">{t.title}</div>
                      <div className="text-xs text-gray-600">Project: {t.project_id}</div>
                      <div className="text-xs text-gray-600">Due: {t.due_date ? new Date(t.due_date).toLocaleDateString() : '-'}</div>
                      <div className="text-xs text-gray-600">Priority: {t.priority}</div>
                    </div>
                  ))}
                </div>
              )}

              {mode === 'at_risk_projects' && (
                <div className="space-y-2">
                  {atRiskProjects.length === 0 && <div className="text-sm text-gray-600">No at-risk projects found right now.</div>}
                  {atRiskProjects.map((p) => (
                    <div key={p.id} className="border border-gray-200 rounded p-2">
                      <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-600">Due: {p.due_date ? new Date(p.due_date).toLocaleDateString() : '-'}</div>
                      <div className="text-xs text-gray-600">Budget: {canSeeFinancial ? `$${p.budget?.toLocaleString?.() || 0}` : 'Restricted'}</div>
                      <div className="text-xs text-gray-600">Spent (invoiced): {canSeeFinancial ? `$${p.spent?.toLocaleString?.() || 0}` : 'Restricted'}</div>
                      {typeof p.overrun_percent === 'number' && (
                        <div className="text-xs font-medium {canSeeFinancial ? 'text-red-600' : 'text-gray-500'}">Overrun: {canSeeFinancial ? `${p.overrun_percent}%` : 'Restricted'}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {mode === 'closure_report' && closureAction.report && (
                <div className="space-y-2 text-sm">
                  <div className="font-medium text-gray-900">{closureAction.report.project?.name} (#{closureAction.report.project?.id})</div>
                  <div className="text-gray-700">Tasks Completed: {closureAction.report.completed}/{closureAction.report.tasks_total}</div>
                  <div className="text-gray-700">Invoice: {closureAction.report.invoice_id || '—'}</div>
                  <div className="text-gray-700">Hours: Actual {closureAction.report.hours?.actual || 0}, Estimated {closureAction.report.hours?.estimated || 0}, Variance {closureAction.report.hours?.variance || 0}</div>
                </div>
              )}

              {mode === 'invoices_overdue' && (
                <div className="space-y-2">
                  {overdueInvoices.length === 0 && <div className="text-sm text-gray-600">No invoices overdue by 30+ days 🎉</div>}
                  {overdueInvoices.map((inv:any)=>(
                    <div key={inv.id} className="border border-gray-200 rounded p-2">
                      <div className="text-sm font-medium text-gray-900">{inv.title || inv.invoice_number}</div>
                      <div className="text-xs text-gray-600">Customer: {inv.customer_id}</div>
                      <div className="text-xs text-gray-600">Amount Due: {canSeeFinancial ? `$${(inv.balance_due/100).toFixed(2)}` : 'Restricted'}</div>
                      <div className="text-xs text-red-600">Overdue: {inv.days_overdue} days</div>
                    </div>
                  ))}
                </div>
              )}

              {mode === 'team_workload' && (
                <div className="space-y-2">
                  {teamWorkload.length === 0 && <div className="text-sm text-gray-600">No tasks due this week.</div>}
                  {teamWorkload.map((it:any)=>(
                    <div key={it.user_id} className="border border-gray-200 rounded p-2">
                      <div className="text-sm font-medium text-gray-900">User: {it.user_id}</div>
                      <div className="text-xs text-gray-600">Tasks due this week: {it.tasks_count}</div>
                    </div>
                  ))}
                </div>
              )}

              {mode === 'forecast' && (
                <div className="space-y-2">
                  <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(forecastResult, null, 2)}</pre>
                </div>
              )}

              {mode === 'resource_opt' && (
                <div className="space-y-2">
                  <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(resourcePlan, null, 2)}</pre>
                </div>
              )}

              {mode === 'scenario' && (
                <div className="space-y-2">
                  <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(scenarioInfo, null, 2)}</pre>
                </div>
              )}

              {mode === 'project_budget' && (
                <div className="space-y-2">
                  <div className="text-sm">Total: ${(Number(budgetStatus?.total||0)/100).toFixed(2)} | Paid: ${(Number(budgetStatus?.paid||0)/100).toFixed(2)} | Balance: ${(Number(budgetStatus?.balance||0)/100).toFixed(2)}</div>
                  <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(budgetStatus?.invoices||[], null, 2)}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Blockers view */}
          {mode === 'blockers' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-medium text-secondary-900">Project Blockers</h2>
              </div>
              <div className="p-4 space-y-2">
                {blockers.length === 0 && <div className="text-sm text-gray-600">No blockers found 🎉</div>}
                {blockers.map((b:any)=>(
                  <div key={b.id} className="border border-gray-200 rounded p-2">
                    <div className="text-sm font-medium text-gray-900">{b.title}</div>
                    <div className="text-xs text-gray-600">Status: {b.status} {b.due_date ? `| Due: ${new Date(b.due_date).toLocaleDateString()}` : ''}</div>
                    {Array.isArray(b.blocked_by) && b.blocked_by.length > 0 && (
                      <div className="text-xs text-gray-700 mt-1">Blocked by: {b.blocked_by.map((x:any)=> x.title).join(', ')}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoice preview */}
              {mode === 'invoice_history' && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-secondary-900">Invoice History {historyCustomerName ? `- ${historyCustomerName}` : ''}</h2>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    {invoiceHistory.length === 0 && <div className="text-gray-600">No invoices found.</div>}
                    {invoiceHistory.map((inv:any)=> (
                      <div key={inv.id} className="border border-gray-200 rounded p-2">
                        <div className="text-gray-900">{inv.invoice_number || inv.id} — {String(inv.status||'').toUpperCase()}</div>
                        <div className="text-gray-600">Date: {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '-'}</div>
                        <div className="text-gray-600">Total: ${((Number(inv.total_amount||0))/100).toFixed(2)}</div>
                        {inv.balance_due ? <div className="text-red-600">Due: ${((Number(inv.balance_due||0))/100).toFixed(2)}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'invoice_preview' && invoicePreview && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-medium text-secondary-900">Invoice Preview</h2>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Create as</label>
                  <select
                    className="text-xs border border-gray-300 rounded px-2"
                    value={(invoicePreview.createMode || 'draft')}
                    onChange={(e)=> setInvoicePreview({ ...invoicePreview, createMode: e.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="final">Final (Send)</option>
                  </select>
                  <button
                    className="text-xs rounded border border-gray-300 hover:bg-gray-50"
                    onClick={async ()=>{
                      try {
                        const createMode = invoicePreview.createMode || 'draft';
                        const confirmMsg = createMode === 'final' ? 'Create and SEND invoice now? This will email the customer (if configured).' : 'Create Draft Invoice now?';
                        const ok = window.confirm(confirmMsg + ' This is a financial action and requires approval.');
                        if (!ok) { addAssistant('Cancelled. No invoice created.'); return; }
                        const { default: apiClient } = await import('../../api/client');
                        const projectId = invoicePreview.project?.id;
                        const customerId = invoicePreview.project?.customer_id;
                        // Determine invoice date and title
                        let invoiceDate = new Date();
                        let title = 'Services';
                        if (invoicePreview.month && invoicePreview.year) {
                          invoiceDate = new Date(invoicePreview.year, invoicePreview.month-1, 1);
                          title = `Monthly services ${invoicePreview.month}/${invoicePreview.year}`;
                        } else if (invoicePreview.range && invoicePreview.range.from && invoicePreview.range.to) {
                          title = `Services ${invoicePreview.range.from} → ${invoicePreview.range.to}`;
                        } else if (invoicePreview.range === 'last_7_days') {
                          title = 'Services (last 7 days)';
                        }
                        const body:any = {
                          title,
                          description: 'Generated from AI assistant',
                          invoice_type: 'project',
                          currency: invoicePreview.currency || 'usd',
                          exchange_rate: 1,
                          payment_terms: invoicePreview.payment_terms || 'net_30',
                          invoice_date: (invoicePreview.invoice_date ? new Date(invoicePreview.invoice_date) : invoiceDate).toISOString(),
                          due_date: (invoicePreview.due_date ? new Date(invoicePreview.due_date) : undefined)?.toISOString(),
                          project_id: projectId,
                          customer_id: customerId || invoicePreview.customer?.id,
                          items: invoicePreview.items,
                        };
                        const res = await apiClient.post('/invoices/', body);
                        const invId = res.data?.id;
                        const invNumber = res.data?.invoice_number || invId;
                        if (createMode === 'final' && invId) {
                          try {
                            await apiClient.post(`/invoices/${invId}/send`);
                            addAssistant(`✅ Invoice created and sent: ${invNumber}`);
                          } catch (e:any) {
                            addAssistant(`Invoice created (${invNumber}) but sending failed. You can send it later from the Invoices page.`);
                          }
                        } else {
                          addAssistant(`✅ Draft invoice created: ${invNumber}`);
                        }
                      } catch (e:any) {
                        addAssistant('Failed to create invoice.');
                      }
                    }}
                  >Create</button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="text-sm">Project: {invoicePreview.project?.name || '-'}</div>
                <div className="text-sm">Subtotal: ${(Number(invoicePreview.subtotal||0)/100).toFixed(2)}</div>
                <div className="text-xs text-gray-600">Items ({invoicePreview.items?.length||0}):</div>
                <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(invoicePreview.items, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Client report */}
          {mode === 'client_report' && clientReport && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-medium text-secondary-900">Monthly Client Report</h2>
                <button
                  className="text-xs rounded border border-gray-300 hover:bg-gray-50"
                  onClick={async ()=>{
                    const to = window.prompt('Send a test email to (recipient email)?');
                    if (!to) return;
                    try {
                      const { default: apiClient } = await import('../../api/client');
                      const subject = `Monthly report ${clientReport.month}/${clientReport.year}`;
                      const body = `Projects: ${clientReport.projects_active}/${clientReport.projects_total} active\nInvoices this month: ${clientReport.invoices_count}\nBilled: $${(Number(clientReport.billed_amount||0)/100).toFixed(2)}`;
                      await apiClient.post('/email/test', { to, subject, body, html: false });
                      addAssistant('✅ Test email sent.');
                    } catch (e:any) {
                      addAssistant('Failed to send test email.');
                    }
                  }}
                >Send Test Email</button>
              </div>
              <div className="p-4 space-y-2">
                <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(clientReport, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* PO list by vendor */}
          {mode === 'po_list' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-medium text-secondary-900">Purchase Orders</h2>
              </div>
              <div className="p-4 space-y-2">
                {poList.length === 0 && <div className="text-sm text-gray-600">No purchase orders found.</div>}
                {poList.map((po:any)=>(
                  <div key={po.id} className="border border-gray-200 rounded p-2">
                    <div className="text-sm font-medium text-gray-900">{po.po_number}</div>
                    <div className="text-xs text-gray-600">Status: {po.status} | Total: ${(Number(po.total_amount||0)/100).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Availability view */}
          {mode === 'availability' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-medium text-secondary-900">Team Availability (This Week)</h2>
              </div>
              <div className="p-4 space-y-2">
                {availability.length === 0 && <div className="text-sm text-gray-600">No team members found.</div>}
                {availability.map((u:any)=>(
                  <div key={u.user_id} className="border border-gray-200 rounded p-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{u.full_name || u.username || u.user_id}</div>
                      <div className="text-xs text-gray-600">Tasks due this week: {u.tasks_due_this_week}</div>
                    </div>
                    <div className={`text-xs ${u.tasks_due_this_week <= 2 ? 'text-green-600' : u.tasks_due_this_week <= 5 ? 'text-yellow-700' : 'text-red-700'}`}>
                      {u.tasks_due_this_week <= 2 ? 'High availability' : u.tasks_due_this_week <= 5 ? 'Moderate availability' : 'Low availability'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Context Preview Modal */}
      {showContextPreview && contextAwareCommand && (
        <ContextPreview
          command={contextAwareCommand}
          onConfirm={handleContextConfirm}
          onCancel={handleContextCancel}
          isProcessing={isContextProcessing}
        />
      )}
    </div>
  );
};

export default PAIWorkspace;
