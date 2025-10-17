import apiClient from '../api/client';
import { Customer, Project, Task, TeamMember } from '../types';

export type InvoiceDefaults = {
  invoice_number?: string;
  invoice_date: string; // YYYY-MM-DD
  due_date: string; // YYYY-MM-DD
  currency: string; // e.g., USD, AED
  payment_terms: string; // e.g., net_30
  tax_rate_percent: number; // 0-100
};

export type InvoiceOption = {
  key: 'A' | 'B' | 'C';
  label: string;
  description: string;
  total_cents: number;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number; // cents
    item_type: string;
    tax_rate: number; // basis points
    discount_rate: number; // basis points
  }>;
  project_ids?: string[];
};

export type InvoiceOptionsBundle = {
  customer: Customer | null;
  options: InvoiceOption[];
  recommended: 'A' | 'B' | 'C';
  summary: string; // pre-formatted summary for chat
  defaults: InvoiceDefaults;
};

function toNetTermsString(raw?: string): string {
  if (!raw) return 'net_30';
  const s = String(raw).trim().toLowerCase();
  if (s.includes('due') && s.includes('receipt')) return 'due_on_receipt';
  const m = s.match(/net\s*(\d{1,3})/i);
  if (m) return `net_${m[1]}`;
  return s.replace(/\s+/g, '_');
}

function daysFromTerms(terms: string): number {
  const m = terms.match(/net_(\d{1,3})/);
  if (m) return parseInt(m[1], 10);
  if (terms === 'due_on_receipt') return 0;
  return 30;
}

export function formatDateYYYYMMDD(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function nextMonday(from = new Date()): Date {
  const d = new Date(from);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (8 - (day || 7)) % 7; // days to next Monday
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getNextInvoiceNumber(): Promise<string | undefined> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    // Fetch first page of invoices and derive max sequence for this year
    const res = await apiClient.get('/invoices/', { params: { page: 1, size: 100 } as any });
    const arr: any[] = res?.data?.invoices || [];
    const re = new RegExp(`^INV-${year}-(\\d{4})$`);
    let maxSeq = 0;
    arr.forEach((inv: any) => {
      const num = String(inv.invoice_number || '');
      const m = num.match(re);
      if (m) {
        const seq = parseInt(m[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    });
    const next = String(maxSeq + 1).padStart(4, '0');
    return `INV-${year}-${next}`;
  } catch {
    return undefined;
  }
}

export async function computeInvoiceDefaults(customer: Partial<Customer> | null): Promise<InvoiceDefaults> {
  const today = new Date();
  const invoice_date = formatDateYYYYMMDD(today);
  const payment_terms = toNetTermsString(customer?.payment_terms || 'NET 30');
  const due = new Date(today);
  due.setDate(due.getDate() + daysFromTerms(payment_terms));
  const due_date = formatDateYYYYMMDD(due);
  const currency = (customer as any)?.currency || (customer as any)?.default_currency || 'USD';
  const taxRate = (customer as any)?.tax_rate ?? 0; // assume percent (e.g., 5 for 5%)
  const invoice_number = await getNextInvoiceNumber();
  return {
    invoice_number,
    invoice_date,
    due_date,
    currency: String(currency).toUpperCase(),
    payment_terms,
    tax_rate_percent: Number(taxRate) || 0,
  };
}

function groupBy<T, K extends string | number>(arr: T[], keyFn: (t: T) => K): Record<K, T[]> {
  return arr.reduce((acc: any, x: T) => {
    const k = keyFn(x);
    (acc[k] ||= []).push(x);
    return acc;
  }, {} as Record<K, T[]>);
}

export async function buildInvoiceOptionsForCustomer(customerId: string): Promise<InvoiceOptionsBundle | null> {
  try {
    // Load customer, projects and tasks
    const [custRes, projRes] = await Promise.all([
      apiClient.get(`/customers/${customerId}`),
      apiClient.get('/projects/', { params: { customer_id: customerId } as any }),
    ]);
    const customer: Customer | null = custRes?.data || null;
    const projects: Project[] = Array.isArray(projRes?.data) ? projRes.data : [];

    // Load tasks for each project and compute monetary values
    const projectRates: Record<string, number> = {};
    projects.forEach(p => { projectRates[p.id] = Math.round((Number(p.hourly_rate || 0)) * 100); });

    const allTasks: Task[] = [];
    for (const p of projects) {
      try {
        const tRes = await apiClient.get('/tasks/', { params: { project_id: p.id } as any });
        const tasks: Task[] = Array.isArray(tRes?.data) ? tRes.data : [];
        allTasks.push(...tasks);
      } catch {}
    }

    const completedTasks = allTasks.filter((t:any) => String(t.status).toLowerCase() === 'completed');
    const inProgressTasks = allTasks.filter((t:any) => String(t.status).toLowerCase() === 'in_progress');

    // Helpers to convert tasks -> invoice items grouped by task_type
    const toItems = (tasks: Task[], byProject?: string[]): { items: InvoiceOption['items']; total: number } => {
      const byType = groupBy(tasks, (t:any) => t.task_type || 'service');
      const items: InvoiceOption['items'] = [];
      let total = 0;
      Object.entries(byType).forEach(([type, arr]) => {
        // Sum hours for group
        const hours = arr.reduce((sum, t:any) => sum + (Number(t.actual_hours || t.estimated_hours || 1)), 0);
        // Derive rate: prefer project rate if single project; otherwise weighted average
        let rateCents = 0;
        if (byProject && byProject.length === 1) {
          rateCents = projectRates[byProject[0]] || 0;
        } else {
          // Average rate across tasks' projects
          const grouped = groupBy(arr, (x:any) => x.project_id);
          let sumRate = 0; let count = 0;
          Object.keys(grouped).forEach(pid => { sumRate += (projectRates[pid] || 0); count += 1; });
          rateCents = count ? Math.round(sumRate / count) : 0;
        }
        const qty = Math.max(1, Math.round(hours));
        const lineAmount = qty * rateCents;
        total += lineAmount;
        items.push({
          description: `Task Type: ${type}`,
          quantity: qty,
          unit_price: rateCents,
          item_type: 'service',
          tax_rate: 0, // set on server or by defaults later
          discount_rate: 0,
        });
      });
      return { items, total };
    };

    // Split projects by status for option logic
    const completedProjects = projects.filter((p:any) => String(p.status).toLowerCase() === 'completed');
    const completedProjectIds = completedProjects.map(p => p.id);

    // A) Completed projects only
    const completedOnlyTasks = completedTasks.filter((t:any) => completedProjectIds.includes(t.project_id));
    const A = toItems(completedOnlyTasks, completedProjectIds);

    // B) Completed + partial in-progress (completed tasks only)
    const B = toItems(completedTasks);

    // C) Custom selection (we provide everything; UI will filter)
    const C = toItems(completedTasks);

    // Defaults
    const defaults = await computeInvoiceDefaults(customer);

    const optionA: InvoiceOption = {
      key: 'A',
      label: 'Completed project only',
      description: 'Invoice fully completed projects only',
      total_cents: A.total,
      items: A.items,
      project_ids: completedProjectIds,
    };
    const optionB: InvoiceOption = {
      key: 'B',
      label: 'Include partial work from both',
      description: 'Invoice completed work across all projects',
      total_cents: B.total,
      items: B.items,
    };
    const optionC: InvoiceOption = {
      key: 'C',
      label: 'Custom selection',
      description: 'Open item picker to choose tasks',
      total_cents: C.total,
      items: C.items,
    };

    const summaryLines: string[] = [];
    summaryLines.push(`✅ Found ${(customer?.company_name || customer?.display_name || customer?.full_name || 'Customer')} (${customer?.id || ''})`);
    if (completedProjects.length > 0) {
      completedProjects.forEach((p) => {
        // Rough ready-to-invoice amount for completed projects
        const pTasks = completedOnlyTasks.filter((t:any) => t.project_id === p.id);
        const items = toItems(pTasks, [p.id]);
        const amount = (items.total / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        summaryLines.push(`\nProject: ${p.name} (#${p.id})\nStatus: ✅ Completed\nAmount: $${amount}\nReady to invoice`);
      });
    }

    const options: InvoiceOption[] = [optionA, optionB, optionC];
    // Recommended: if any project completed and A has non-zero amount, suggest A else B
    const recommended: 'A' | 'B' | 'C' = (completedProjects.length > 0 && optionA.total_cents > 0) ? 'A' : (optionB.total_cents > 0 ? 'B' : 'C');

    const summary = [
      summaryLines.join('\n'),
      '\n\nOptions:',
      `A) Completed project only - $${(optionA.total_cents/100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${recommended==='A'?'[RECOMMENDED]':''}`,
      `B) Include partial work from both - $${(optionB.total_cents/100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${recommended==='B'?'[RECOMMENDED]':''}`,
      'C) Custom selection (let me choose tasks)',
      '\nJust say "A", "B", "C" or tell me what you want.',
    ].join('\n');

    return { customer, options, recommended, summary, defaults };
  } catch (e) {
    return null;
  }
}

export async function fetchCustomerFinancialSummary(customerId: string): Promise<{ last_invoice: { id?: string; invoice_number?: string; amount_cents?: number; status?: string; invoice_date?: string } | null; overdue_invoices: Array<{ id: string; invoice_number?: string; amount_cents: number; days_overdue: number }>; total_outstanding_cents: number; }> {
  try {
    const res = await apiClient.get('/invoices/', { params: { customer_id: customerId, page: 1, size: 200 } as any });
    const invoices: any[] = res?.data?.invoices || [];
    // Last invoice by invoice_date desc
    const sorted = [...invoices].sort((a,b)=> new Date(b.invoice_date||b.created_at||0).getTime() - new Date(a.invoice_date||a.created_at||0).getTime());
    const last = sorted[0] || null;
    const last_invoice = last ? {
      id: last.id,
      invoice_number: last.invoice_number,
      amount_cents: Number(last.total_amount||0),
      status: last.status,
      invoice_date: last.invoice_date
    } : null;

    // Overdue invoices
    const overdue_invoices = invoices
      .filter((inv:any)=> String(inv.status).toLowerCase() === 'overdue' || (Number(inv.days_overdue||0) > 0))
      .map((inv:any)=> ({ id: inv.id, invoice_number: inv.invoice_number, amount_cents: Number(inv.balance_due || inv.total_amount || 0), days_overdue: Number(inv.days_overdue||0) }))
      .sort((a,b)=> b.days_overdue - a.days_overdue);

    const total_outstanding_cents = invoices.reduce((sum:number, inv:any)=> sum + (Number(inv.balance_due||0)), 0);

    return { last_invoice, overdue_invoices, total_outstanding_cents };
  } catch {
    return { last_invoice: null, overdue_invoices: [], total_outstanding_cents: 0 };
  }
}

export async function computeUnbilledForCustomer(customerId: string): Promise<{ amount_cents: number; completed_tasks: number }> {
  try {
    const tasksRes = await apiClient.get('/tasks/', { params: { customer_id: customerId } as any });
    const tasks: any[] = Array.isArray(tasksRes?.data) ? tasksRes.data : [];
    const completedNotInvoiced = tasks.filter((t:any)=> String(t.status).toLowerCase()==='completed' && !t.metadata?.invoiced);
    // Derive rate by project (fallback 0)
    const projRates: Record<string, number> = {};
    try {
      const projsRes = await apiClient.get('/projects/', { params: { customer_id: customerId } as any });
      const projects: any[] = Array.isArray(projsRes?.data) ? projsRes.data : [];
      projects.forEach(p=> projRates[p.id] = Math.round(Number(p.hourly_rate||0)*100));
    } catch {}
    const amount_cents = completedNotInvoiced.reduce((sum:number, t:any)=> sum + Math.max(1, Math.round(Number(t.actual_hours||t.estimated_hours||1))) * (projRates[t.project_id]||0), 0);
    return { amount_cents, completed_tasks: completedNotInvoiced.length };
  } catch {
    return { amount_cents: 0, completed_tasks: 0 };
  }
}

export function detectProjectPriorityFromText(text: string): 'Low' | 'Medium' | 'High' {
  const s = text.toLowerCase();
  if (/\b(urgent|asap|critical|high\s+priority)\b/.test(s)) return 'High';
  if (/\b(low\s+priority)\b/.test(s)) return 'Low';
  return 'Medium';
}

export async function computeProjectDefaults(params: {
  name: string;
  description?: string;
  currentUser?: { id: string; role: string } | null;
}): Promise<{ start_date: string; owner_id?: string | null; priority: 'Low'|'Medium'|'High'; budget_estimate_cents?: number; suggested_pm?: TeamMember | null }>
{
  const start = nextMonday();
  const start_date = formatDateYYYYMMDD(start);
  const priority = detectProjectPriorityFromText(`${params.name} ${params.description || ''}`);

  let owner_id: string | null | undefined = null;
  let suggested_pm: TeamMember | null = null;
  try {
    const role = String(params?.currentUser?.role || '').toUpperCase();
    if (role.includes('ADMIN') || role.includes('MANAGER') || role.includes('PM')) {
      owner_id = params?.currentUser?.id || null;
    } else {
      // Suggest PM with lowest workload
      const res = await apiClient.get('/teams/members');
      const members: TeamMember[] = Array.isArray(res?.data) ? res.data : [];
      const pmCandidates = members.filter((m:any) => /PM|MANAGER/i.test(String(m.role)));
      pmCandidates.sort((a:any,b:any) => (a.current_workload_hours||0) - (b.current_workload_hours||0));
      suggested_pm = pmCandidates[0] || null;
      owner_id = suggested_pm?.id || null;
    }
  } catch {}

  // Budget estimate heuristic: average budget of similar projects by name token
  let budget_estimate_cents: number | undefined = undefined;
  try {
    const q = params.name.split(/\s+/).slice(0,2).join(' ');
    const res = await apiClient.get('/projects/', { params: { q } as any });
    const arr: Project[] = Array.isArray(res?.data) ? res.data : [];
    const budgets = arr.map((p:any) => Number(p.budget || 0)).filter((x:number)=> x>0);
    if (budgets.length > 0) {
      const avg = budgets.reduce((a:number,b:number)=>a+b,0)/budgets.length;
      budget_estimate_cents = Math.round(avg);
    }
  } catch {}

  return { start_date, owner_id, priority, budget_estimate_cents, suggested_pm };
}

export async function computeTaskDefaults(params: {
  title: string;
  project?: Project | null;
  assignee?: TeamMember | null;
  project_start_date?: string;
}): Promise<{ due_date?: string; priority: 'Low'|'Medium'|'High'; status: 'todo'|'draft'; estimated_hours?: number; hourly_rate_cents?: number }>
{
  const basePriority: 'Low'|'Medium'|'High' = detectProjectPriorityFromText(params.title);
  const priority = params.project ? (String(params.project.priority||'').toLowerCase()==='high' ? 'High' : basePriority) : basePriority;
  const status: 'todo'|'draft' = 'todo';

  // Estimated hours from similar tasks
  let estimated_hours: number | undefined;
  try {
    const res = await apiClient.get('/tasks/', { params: { search: params.title } as any });
    const arr: any[] = Array.isArray(res?.data) ? res.data : [];
    const hours = arr.map(t => Number(t.estimated_hours || t.actual_hours || 0)).filter((x:number)=>x>0).sort((a:number,b:number)=>a-b);
    if (hours.length > 0) {
      const mid = Math.floor(hours.length/2);
      estimated_hours = hours[mid];
    }
  } catch {}

  const hourly_rate_cents = Math.round(Number(params.project?.hourly_rate || 0) * 100) || undefined;

  // Due date
  let due_date: string | undefined = undefined;
  try {
    const start = params.project_start_date ? new Date(params.project_start_date) : (params.project?.start_date ? new Date(params.project.start_date as any) : new Date());
    const addDays = Math.max(1, Math.round((estimated_hours || 8) / 6)); // assume ~6h productive per day
    const due = new Date(start);
    due.setDate(due.getDate() + addDays);
    due_date = formatDateYYYYMMDD(due);
  } catch {}

  return { due_date, priority, status, estimated_hours, hourly_rate_cents };
}
