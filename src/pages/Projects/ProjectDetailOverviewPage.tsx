import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux';
import { Project, Task, ProjectInvoice as Invoice, Customer, User, ProjectStatus, ProjectPriority, UserRole } from '../../types';
import { addNotification } from '../../store/slices/notificationSlice';
import ProjectComments from '../../components/Comments/ProjectComments';
import ProjectChat from '../../components/Chat/ProjectChat';
import ContextCardsWidget from '../../components/Knowledge/ContextCardsWidget';
import DragDropUpload from '../../components/FileUpload/DragDropUpload';
import {
 FolderIcon,
 UserGroupIcon,
 CalendarIcon,
 CurrencyDollarIcon,
 ClockIcon,
 CheckCircleIcon,
 ExclamationTriangleIcon,
 PlusIcon,
 ArrowLeftIcon,
 PencilIcon,
 TrashIcon,
 EyeIcon,
 UserIcon,
 ChartBarIcon,
 BanknotesIcon,
 ListBulletIcon,
 FlagIcon,
 CalendarDaysIcon,
 DocumentArrowDownIcon,
 ShareIcon,
 ChatBubbleLeftRightIcon,
 CheckIcon,
 MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import apiClient from '../../api/client';
import { getApiBaseUrl } from '../../utils/tenantUtils';
import EntityCustomFieldsEditor from '../../components/CustomFields/EntityCustomFieldsEditor';
import { setCustomFieldValues } from '../../api/customFields';

interface ProjectStats {
 totalTasks: number;
 completedTasks: number;
 inProgressTasks: number;
 pendingTasks: number;
 totalHours: number;
 totalInvoices: number;
 totalRevenue: number;
 outstandingAmount: number;
 completionPercentage: number;
 taskStatusDistribution: Record<string, number>;
 taskPriorityDistribution: Record<string, number>;
}

const ProjectDetailOverviewPage: React.FC = () => {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const dispatch = useAppDispatch();
 const [searchParams] = useSearchParams();
 
 const [project, setProject] = useState<Project | null>(null);
 const [tasks, setTasks] = useState<Task[]>([]);
 const [invoices, setInvoices] = useState<Invoice[]>([]);
 const [customer, setCustomer] = useState<Customer | null>(null);
 const [customers, setCustomers] = useState<Customer[]>([]);
 const [teamMembers, setTeamMembers] = useState<User[]>([]);
 const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
 const [projectMembersByUserId, setProjectMembersByUserId] = useState<Record<string, string>>({});
 const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
 const [teamFilter, setTeamFilter] = useState('');
 const teamDropdownRef = useRef<HTMLDivElement | null>(null);
 const [stats, setStats] = useState<ProjectStats>({
 totalTasks: 0,
 completedTasks: 0,
 inProgressTasks: 0,
 pendingTasks: 0,
 totalHours: 0,
 totalInvoices: 0,
 totalRevenue: 0,
 outstandingAmount: 0,
 completionPercentage: 0,
 taskStatusDistribution: {},
 taskPriorityDistribution: {}
 });
 const [isLoading, setIsLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'invoices' | 'team' | 'collaboration' | 'edit' | 'roadmap' | 'requirements'>('overview');
 // Remove unused isEditing state
 const [editForm, setEditForm] = useState<Partial<Project>>({});
 // Roadmap state
 const [roadmap, setRoadmap] = useState<{ id: string; title: string; done: boolean }[]>([]);
 const [newRoadmapTitle, setNewRoadmapTitle] = useState('');
 
 // Requirements state (supports multiple headings/sections)
 type RequirementItem = { id: string; title: string; done: boolean };
 type RequirementSection = { id: string; heading: string; items: RequirementItem[] };
 const [requirementsSections, setRequirementsSections] = useState<RequirementSection[]>([]);
 const [newRequirementHeading, setNewRequirementHeading] = useState('');
 const [newItemBySection, setNewItemBySection] = useState<Record<string, string>>({});
 const [editTags, setEditTags] = useState<string>('');
 const [showTaskForm, setShowTaskForm] = useState(false);
 const [showInvoiceForm, setShowInvoiceForm] = useState(false);
 // Client (public) comments captured from shared page
 const [clientComments, setClientComments] = useState<Array<{ id: string; content: string; author_name: string; created_at: string }>>([]);
 // Custom fields state for project entity
 const [customFieldValues, setCustomFieldValuesState] = useState<Record<string, any>>({});
 const [showTeamMemberForm, setShowTeamMemberForm] = useState(false);
 const [newTask, setNewTask] = useState({
 title: '',
 description: '',
 status: 'todo',
 priority: 'medium',
 estimated_hours: '',
 due_date: '',
 assigned_to: ''
 });
 const [newInvoice, setNewInvoice] = useState({
 title: '',
 description: '',
 invoice_type: 'project',
 invoice_date: new Date().toISOString().split('T')[0],
 due_date: '',
 payment_terms: 'net_30',
 currency: 'usd',
 notes: '',
 terms_and_conditions: '',
 items: [{
 description: '',
 quantity: 1,
 unit_price: 0,
 tax_rate: 0,
 discount_rate: 0
 }]
 });
 const [availableUsers, setAvailableUsers] = useState<User[]>([]);
 const userNameById = useMemo(() => {
 const m: Record<string, string> = {};
 (availableUsers || []).forEach((u: any) => {
 const name = u?.full_name || `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || u?.email || u?.username || 'User';
 if (u?.id) m[u.id] = name;
 });
 return m;
 }, [availableUsers]);

 const userAvatarById = useMemo(() => {
 const m: Record<string, string | null> = {};
 (availableUsers || []).forEach((u: any) => {
 if (u?.id) m[u.id] = (u?.avatar_url || null);
 });
 return m;
 }, [availableUsers]);

 // Derived count for requirements items across all sections
 const requirementsCount = useMemo(() => {
 try {
 return (requirementsSections || []).reduce((sum, s) => sum + ((s.items || []).length), 0);
 } catch {
 return 0;
 }
 }, [requirementsSections]);

 const getInitials = (name: string) => {
 const parts = (name || '').trim().split(/\s+/).filter(Boolean);
 if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
 return (parts[0] || name || 'U').slice(0, 2).toUpperCase();
 };

 useEffect(() => {
 console.log('ProjectDetailOverviewPage useEffect - id:', id);
 if (id) {
 fetchProjectData();
 fetchAvailableUsers();
 fetchCustomers();
  // Fetch client comments left on the public shared page (via share link)
  (async () => {
    try {
      const shareRes = await apiClient.post(`/analytics/reports/share/project/${id}`);
      const shareId = shareRes.data?.share_id || shareRes.data?.shareId || (shareRes.data?.share_url ? String(shareRes.data.share_url).split('/').pop() : undefined);
      if (!shareId) { setClientComments([]); return; }
      const pubRes = await fetch(`${getApiBaseUrl()}/analytics/shared/project/${shareId}`, { headers: { Accept: 'application/json' } });
      if (!pubRes.ok) { setClientComments([]); return; }
      const shared = await pubRes.json();
      const list = Array.isArray(shared?.project_comments) ? shared.project_comments : [];
      const onlyPublic = list.filter((c: any) => c && c.is_public);
      setClientComments(onlyPublic);
    } catch (err) {
      setClientComments([]);
    }
  })();
 }
 }, [id]);

 // Handle URL tab parameter
 useEffect(() => {
 const tabParam = searchParams.get('tab');
 if (tabParam === 'edit') {
 setActiveTab('edit');
 // Edit mode is now handled by activeTab state
 }
 }, [searchParams]);

 // Always refresh invoices when the Invoices tab becomes active
 useEffect(() => {
 if (activeTab === 'invoices' && id) {
 fetchProjectInvoices();
 }
 }, [activeTab, id]);

 const setTeamFromProject = (proj: any) => {
 try {
 const pms = Array.isArray(proj?.members) ? proj.members : [];
 const users = pms.map((pm: any) => pm.user).filter(Boolean);
 const mapping: Record<string, string> = {};
 pms.forEach((pm: any) => {
 const uid = pm.user_id || pm.user?.id;
 if (uid && pm.id) mapping[uid] = pm.id;
 });
 setTeamMembers(users);
 setProjectMembersByUserId(mapping);
 setSelectedMemberIds(users.map((u: any) => u.id));
 } catch (e) {
 console.warn('Failed to set team from project payload', e);
 }
 };

 const fetchProjectData = async () => {
 if (!id) return;
 
 console.log('fetchProjectData called with id:', id);
 setIsLoading(true);
 try {
 // Fetch project details
 const { default: apiClient } = await import('../../api/client');
 console.log('Making API call to:', `/projects/${id}`);
 const projectResponse = await apiClient.get(`/projects/${id}`);
 console.log('API response:', projectResponse);
 const projectData = projectResponse.data;
 setProject(projectData);
 // Initialize roadmap from custom_fields if present
 try {
 const rm = Array.isArray((projectData?.custom_fields as any)?.roadmap)
 ? ((projectData!.custom_fields as any).roadmap as any[])
 : [];
 const normalized = rm.map((it: any) => ({
 id: String(it.id || it._id || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`),
 title: String(it.title || ''),
 done: Boolean(it.done),
 }));
 setRoadmap(normalized);
 } catch (e) {
 setRoadmap([]);
 }
 
 // Initialize requirements from custom_fields if present (supports both flat list and sections)
 try {
 const raw = Array.isArray((projectData?.custom_fields as any)?.requirements)
 ? ((projectData!.custom_fields as any).requirements as any[])
 : [];

 const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
 let sections: RequirementSection[] = [];

 if (raw.length > 0 && (raw[0]?.heading !== undefined || Array.isArray(raw[0]?.items))) {
 // Already in sections format
 sections = raw.map((sec: any) => ({
 id: String(sec.id || sec._id || genId()),
 heading: String(sec.heading || 'Untitled'),
 items: Array.isArray(sec.items)
 ? sec.items.map((it: any) => ({
 id: String(it.id || it._id || genId()),
 title: String(it.title || ''),
 done: Boolean(it.done),
 }))
 : [],
 }));
 } else {
 // Backward-compat: flat list -> single section
 const items = raw.map((it: any) => ({
 id: String(it.id || it._id || genId()),
 title: String(it.title || ''),
 done: Boolean(it.done),
 }));
 sections = items.length ? [{ id: genId(), heading: 'Requirements', items }] : [];
 }
 setRequirementsSections(sections);
 } catch (e) {
 setRequirementsSections([]);
 }
 // Normalize date fields to YYYY-MM-DD for date inputs and extract tags for edit UI
 const normalizedEdit: Partial<Project> = {
 ...projectData,
 start_date: projectData.start_date ? String(projectData.start_date).split('T')[0] : '',
 due_date: projectData.due_date ? String(projectData.due_date).split('T')[0] : '',
 };
 setEditForm(normalizedEdit);
 const existingTags = Array.isArray((projectData.custom_fields as any)?.tags)
 ? ((projectData.custom_fields as any).tags as string[]).join(', ')
 : '';
 setEditTags(existingTags);
 // Prefill team from project.members
 setTeamFromProject(projectData);

 // Fetch related data (tasks and invoices only; team is derived from project payload)
 await Promise.all([
 fetchProjectTasks(),
 fetchProjectInvoices()
 ]);
 
 // Fetch customer data after project is set
 if (projectData.customer_id) {
 // Pass the customer_id directly to avoid dependency on project state
 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.get(`/customers/${projectData.customer_id}`);
 setCustomer(response.data);
 } catch (error) {
 console.error('Failed to fetch customer:', error);
 }
 }

 // Calculate stats after all data is fetched
 calculateStats();
 } catch (error) {
 console.error('Failed to fetch project data:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: 'Failed to load project data',
 duration: 5000,
 }));
 } finally {
 setIsLoading(false);
 }
 };

 const buildMembersPayload = () => {
 if (!project) return [] as any[];
 const existingByUserId: Record<string, any> = {};
 const pms = Array.isArray((project as any).members) ? (project as any).members : [];
 pms.forEach((pm: any) => {
 const uid = pm.user_id || pm.user?.id;
 if (uid) existingByUserId[uid] = pm;
 });
 const payload = selectedMemberIds.map((uid) => {
 const existing = existingByUserId[uid];
 if (existing) {
 return {
 user_id: uid,
 role: existing.role || 'member',
 can_edit_project: !!existing.can_edit_project,
 can_create_tasks: existing.can_create_tasks !== undefined ? !!existing.can_create_tasks : true,
 can_assign_tasks: !!existing.can_assign_tasks,
 can_delete_tasks: !!existing.can_delete_tasks,
 };
 }
 return {
 user_id: uid,
 role: 'member',
 can_edit_project: false,
 can_create_tasks: true,
 can_assign_tasks: false,
 can_delete_tasks: false,
 };
 });
 // Ensure owner remains
 const ownerId = project.owner_id;
 if (ownerId && !selectedMemberIds.includes(ownerId)) {
 const existing = existingByUserId[ownerId];
 payload.push({
 user_id: ownerId,
 role: existing?.role || 'owner',
 can_edit_project: true,
 can_create_tasks: true,
 can_assign_tasks: true,
 can_delete_tasks: true,
 });
 }
 return payload;
 };

 const fetchProjectTasks = async () => {
 if (!id) return;
 
 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.get(`/tasks/?project_id=${id}`);
 setTasks(response.data || []); // Backend returns array directly
 } catch (error) {
 console.error('Failed to fetch tasks:', error);
 }
 };
 
 const handleDeleteTaskFromProject = async (taskId: string) => {
 if (!window.confirm('Are you sure you want to delete this task?')) return;
 try {
 const { default: apiClient } = await import('../../api/client');
 await apiClient.delete(`/tasks/${taskId}/`);
 await fetchProjectTasks();
 dispatch(addNotification({
 type: 'success',
 title: 'Success',
 message: 'Task deleted successfully',
 duration: 3000,
 }));
 } catch (error: any) {
 console.error('Failed to delete task:', error);
 const msg = error?.response?.data?.detail || 'Failed to delete task';
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: msg,
 duration: 5000,
 }));
 }
 };

 const fetchProjectInvoices = async () => {
 if (!id) return;
 
 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.get(`/invoices/?project_id=${id}`);
 setInvoices(response.data.invoices || []); // Backend returns ProjectInvoiceList with invoices property
 } catch (error) {
 console.error('Failed to fetch invoices:', error);
 }
 };

 // Roadmap helpers
 const saveRoadmap = async (items: { id: string; title: string; done: boolean }[]) => {
 if (!project) return;
 try {
 const payload: any = {
 custom_fields: {
 ...(project.custom_fields || {}),
 roadmap: items,
 },
 };
 const { default: client } = await import('../../api/client');
 const res = await client.put(`/projects/${project.id}`, payload);
 const updated = res.data;
 setProject(updated);
 setRoadmap(items);
 dispatch(addNotification({ type: 'success', title: 'Roadmap Saved', message: 'Your roadmap has been updated.', duration: 2000 }));
 } catch (e: any) {
 console.error('Failed to save roadmap', e);
 const detail = e?.response?.data?.detail;
 dispatch(addNotification({ type: 'error', title: 'Save Failed', message: typeof detail === 'string' ? detail : 'Could not save roadmap. Try again.', duration: 5000 }));
 }
 };

 const addRoadmapItem = async () => {
 const title = newRoadmapTitle.trim();
 if (!title) return;
 const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, title, done: false };
 await saveRoadmap([item, ...roadmap]);
 setNewRoadmapTitle('');
 };

 const toggleRoadmapItem = async (id: string) => {
 const next = roadmap.map(it => it.id === id ? { ...it, done: !it.done } : it);
 await saveRoadmap(next);
 };

 const deleteRoadmapItem = async (id: string) => {
 const next = roadmap.filter(it => it.id !== id);
 await saveRoadmap(next);
 };

 // Requirements helpers (sections)
 const saveRequirementsSections = async (sections: RequirementSection[]) => {
 if (!project) return;
 try {
 const payload: any = {
 custom_fields: {
 ...(project.custom_fields || {}),
 requirements: sections,
 },
 };
 const { default: client } = await import('../../api/client');
 const res = await client.put(`/projects/${project.id}`, payload);
 const updated = res.data;
 setProject(updated);
 setRequirementsSections(sections);
 dispatch(addNotification({ type: 'success', title: 'Requirements Saved', message: 'Your requirements have been updated.', duration: 2000 }));
 } catch (e: any) {
 console.error('Failed to save requirements', e);
 const detail = e?.response?.data?.detail;
 dispatch(addNotification({ type: 'error', title: 'Save Failed', message: typeof detail === 'string' ? detail : 'Could not save requirements. Try again.', duration: 5000 }));
 }
 };

 const addRequirementHeading = async () => {
 const heading = newRequirementHeading.trim();
 if (!heading) return;
 const section: RequirementSection = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, heading, items: [] };
 await saveRequirementsSections([section, ...requirementsSections]);
 setNewRequirementHeading('');
 };

 const deleteRequirementHeading = async (sectionId: string) => {
 const next = requirementsSections.filter(s => s.id !== sectionId);
 await saveRequirementsSections(next);
 };

 const addRequirementItem = async (sectionId: string) => {
 const title = (newItemBySection[sectionId] || '').trim();
 if (!title) return;
 const item: RequirementItem = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, title, done: false };
 const next = requirementsSections.map(s => s.id === sectionId ? { ...s, items: [item, ...(s.items || [])] } : s);
 await saveRequirementsSections(next);
 setNewItemBySection(prev => ({ ...prev, [sectionId]: '' }));
 };

 const toggleRequirementItem = async (sectionId: string, itemId: string) => {
 const next = requirementsSections.map(s => s.id === sectionId ? { ...s, items: (s.items || []).map(it => it.id === itemId ? { ...it, done: !it.done } : it) } : s);
 await saveRequirementsSections(next);
 };

 const deleteRequirementItem = async (sectionId: string, itemId: string) => {
 const next = requirementsSections.map(s => s.id === sectionId ? { ...s, items: (s.items || []).filter(it => it.id !== itemId) } : s);
 await saveRequirementsSections(next);
 };

 const handleDeleteInvoiceFromProject = async (invoiceId: string) => {
 if (!window.confirm('Are you sure you want to delete this invoice? Only draft invoices can be deleted.')) return;
 try {
 const { default: apiClient } = await import('../../api/client');
 await apiClient.delete(`/invoices/${invoiceId}`);
 await fetchProjectInvoices();
 dispatch(addNotification({
 type: 'success',
 title: 'Success',
 message: 'Invoice deleted successfully',
 duration: 3000,
 }));
 } catch (error: any) {
 console.error('Failed to delete invoice:', error);
 const msg = error?.response?.data?.detail || 'Failed to delete invoice. Make sure it is in draft status.';
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: msg,
 duration: 5000,
 }));
 }
 };

 // fetchProjectCustomer is no longer used since we fetch customer data directly in fetchProjectData

 useEffect(() => {
 const onDocClick = (e: MouseEvent) => {
 if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target as Node)) {
 setIsTeamDropdownOpen(false);
 }
 };
 document.addEventListener('mousedown', onDocClick);
 return () => document.removeEventListener('mousedown', onDocClick);
 }, []);

 const toggleMember = (id: string) => {
 setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
 };

 const fetchProjectTeam = async () => {
 if (!id) return;
 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.get(`/projects/${id}`);
 const proj = response.data;
 setTeamFromProject(proj);
 } catch (error) {
 console.error('Failed to fetch team members (via project):', error);
 }
 };

 const fetchCustomers = async () => {
 try {
 const { default: apiClient } = await import('../../api/client');
 // Use trailing slash and handle both wrapped and raw array responses
 const response = await apiClient.get('/customers/');
 const data = response.data;
 const list = Array.isArray(data) ? data : (data?.customers || []);
 setCustomers(list || []);
 } catch (error) {
 console.error('Failed to fetch customers:', error);
 setCustomers([]);
 }
 };

 const calculateStats = () => {
 const newStats: ProjectStats = {
 totalTasks: tasks.length,
 completedTasks: 0,
 inProgressTasks: 0,
 pendingTasks: 0,
 totalHours: 0,
 totalInvoices: invoices.length,
 totalRevenue: 0,
 outstandingAmount: 0,
 completionPercentage: 0,
 taskStatusDistribution: {},
 taskPriorityDistribution: {}
 };

 // Calculate task stats
 tasks.forEach(task => {
 const status = task.status;
 // Count by status
 newStats.taskStatusDistribution[status] = (newStats.taskStatusDistribution[status] || 0) + 1;
 
 // Count by priority
 const priority = task.priority;
 newStats.taskPriorityDistribution[priority] = (newStats.taskPriorityDistribution[priority] || 0) + 1;
 
 // Buckets
 if (status === 'completed') {
 newStats.completedTasks++;
 } else if (status === 'in_progress' || status === 'in_review') {
 newStats.inProgressTasks++;
 } else if (status === 'todo' || status === 'blocked') {
 newStats.pendingTasks++;
 }
 
 // Sum hours: prefer actual_hours, fallback to estimated_hours
 const actual = (task as any).actual_hours || 0;
 if (actual) {
 newStats.totalHours += actual;
 } else if (task.estimated_hours) {
 newStats.totalHours += task.estimated_hours;
 }
 });

 // Calculate invoice stats
 invoices.forEach(invoice => {
 const paid = (invoice as any).amount_paid || 0;
 const balance = (invoice as any).balance_due || 0;
 newStats.totalRevenue += paid;
 newStats.outstandingAmount += balance;
 });

 // Calculate completion percentage
 newStats.completionPercentage = tasks.length > 0 
 ? Math.round((newStats.completedTasks / tasks.length) * 100)
 : 0;

 setStats(newStats);
 };

 // Keep stats in sync whenever tasks or invoices change
 useEffect(() => {
 calculateStats();
 // We intentionally only depend on tasks and invoices so stats always reflect latest data
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [tasks, invoices]);

 const handleUpdateProject = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!project) return;

 try {
 const { default: apiClient } = await import('../../api/client');
 const membersPayload = buildMembersPayload();

 // Prepare payload: ensure dates are ISO strings and tags go into custom_fields.tags
 const payload: any = { ...editForm, members: membersPayload };

 // Normalize tags from editTags string
 const tagArray = (editTags || '')
 .split(',')
 .map(t => t.trim())
 .filter(Boolean);
 // Merge custom_fields from current project to avoid clobbering sections like roadmap/requirements
 payload.custom_fields = {
 ...(project?.custom_fields || {}),
 ...(editForm.custom_fields || {}),
 tags: tagArray,
 };

 // Convert date-only values to ISO strings if present
 if (payload.start_date) {
 const sd = String(payload.start_date);
 payload.start_date = sd.includes('T') ? sd : new Date(sd).toISOString();
 }
 if (payload.due_date) {
 const dd = String(payload.due_date);
 payload.due_date = dd.includes('T') ? dd : new Date(dd).toISOString();
 }

 // Normalize empty customer selection to null to clear
 if (payload.customer_id === '') {
 payload.customer_id = null;
 }
 const res = await apiClient.put(`/projects/${project.id}`, payload);
 const updated = res.data;

 // Save custom field values after updating project core data
 try {
 if (project?.id) {
 await setCustomFieldValues('project', project.id, customFieldValues);
 }
 } catch (e) {
 console.warn('Failed to save custom field values', e);
 }

 setProject(updated);
 setTeamFromProject(updated);

 // Reflect saved values back into the edit form immediately
 try {
 const normalizedEditAfterUpdate: Partial<Project> = {
 ...updated,
 start_date: updated.start_date ? String(updated.start_date).split('T')[0] : '',
 due_date: updated.due_date ? String(updated.due_date).split('T')[0] : '',
 };
 setEditForm(normalizedEditAfterUpdate);
 // Refresh customer info panel if customer changed
 if (typeof updated.customer_id !== 'undefined') {
 if (updated.customer_id) {
 const { default: apiClient } = await import('../../api/client');
 const custRes = await apiClient.get(`/customers/${updated.customer_id}`);
 setCustomer(custRes.data);
 } else {
 setCustomer(null);
 }
 }
 } catch (e) {
 console.warn('Failed to refresh edit state after update', e);
 }

 setActiveTab('overview');

 dispatch(addNotification({
 type: 'success',
 title: 'Success',
 message: 'Project updated successfully',
 duration: 3000,
 }));
 } catch (error: any) {
 console.error('Failed to update project:', error);
 const detail = error?.response?.data?.detail;
 const message = typeof detail === 'string' ? detail : 'Failed to update project';
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message,
 duration: 6000,
 }));
 }
 };

 const handleDeleteProject = async () => {
 if (!project || !window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
 return;
 }

 try {
 const { default: apiClient } = await import('../../api/client');
 await apiClient.delete(`/projects/${project.id}`);
 
 dispatch(addNotification({
 type: 'success',
 title: 'Success',
 message: 'Project deleted successfully',
 duration: 3000,
 }));
 
 navigate('/projects');
 } catch (error) {
 console.error('Failed to delete project:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: 'Failed to delete project',
 duration: 5000,
 }));
 }
 };

 // Remove unused handleAddTeamMember function - using handleAddTeamMemberToProject instead

 const fetchAvailableUsers = async () => {
 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.get('/teams/members');
 setAvailableUsers(response.data || []);
 } catch (error) {
 console.error('Failed to fetch available users:', error);
 }
 };

 const handleCreateTask = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!project) return;

 try {
 const { default: apiClient } = await import('../../api/client');
 
 // Prepare task data according to TaskCreate schema
 const taskData: any = {
 title: newTask.title,
 description: newTask.description || undefined,
 project_id: project.id,
 status: newTask.status,
 priority: newTask.priority,
 estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : undefined,
 assignee_id: newTask.assigned_to || undefined, // Use assignee_id not assigned_to
 due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : undefined
 };
 
 await apiClient.post('/tasks/', taskData);
 
 // Reset form and close
 setNewTask({
 title: '',
 description: '',
 status: 'todo',
 priority: 'medium',
 estimated_hours: '',
 due_date: '',
 assigned_to: ''
 });
 setShowTaskForm(false);
 
 // Refresh tasks
 await fetchProjectTasks();
 
 dispatch(addNotification({
 type: 'success',
 title: 'Success',
 message: 'Task created successfully',
 duration: 3000,
 }));
 } catch (error) {
 console.error('Failed to create task:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: 'Failed to create task',
 duration: 5000,
 }));
 }
 };

 const handleCreateInvoice = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!project) return;

 // Validate form
 if (!newInvoice.title.trim()) {
 dispatch(addNotification({
 type: 'error',
 title: 'Validation Error',
 message: 'Invoice title is required',
 duration: 5000,
 }));
 return;
 }

 if (!project.customer_id) {
 dispatch(addNotification({
 type: 'error',
 title: 'Validation Error',
 message: 'Project must have a customer assigned to create invoices',
 duration: 5000,
 }));
 return;
 }

 const validItems = newInvoice.items.filter(item => item.description.trim());
 if (validItems.length === 0) {
 dispatch(addNotification({
 type: 'error',
 title: 'Validation Error',
 message: 'At least one invoice item is required',
 duration: 5000,
 }));
 return;
 }

 try {
 const { default: apiClient } = await import('../../api/client');
 
 // Debug: Check current user info
 console.log('Current project:', project);
 console.log('Project customer_id:', project.customer_id);
 
 // Calculate total amount from items (using calculateInvoiceTotal helper)
 const totalAmount = calculateInvoiceTotal();
 
 // Prepare invoice data according to ProjectInvoiceCreate schema
 const invoiceData = {
 title: newInvoice.title || `Invoice for ${project.name}`,
 description: newInvoice.description || undefined,
 project_id: project.id,
 customer_id: project.customer_id,
 invoice_type: newInvoice.invoice_type, // lowercase enum
 invoice_date: new Date(newInvoice.invoice_date).toISOString(),
 due_date: newInvoice.due_date ? new Date(newInvoice.due_date).toISOString() : undefined,
 payment_terms: newInvoice.payment_terms,
 currency: (newInvoice.currency || 'usd').toLowerCase(),
 exchange_rate: 100, // basis points
 notes: newInvoice.notes || undefined,
 terms_and_conditions: newInvoice.terms_and_conditions || undefined,
 is_recurring: false,
 recurring_interval: undefined,
 next_invoice_date: undefined,
 tags: [],
 custom_fields: {},
 items: newInvoice.items.filter(item => (item.description || '').trim()).map(item => ({
 description: item.description,
 quantity: Number(item.quantity) || 1,
 unit_price: Math.round(Number(item.unit_price || 0) * 100),
 item_type: 'service',
 tax_rate: Math.round(Number(item.tax_rate || 0) * 100),
 discount_rate: Math.round(Number(item.discount_rate || 0) * 100)
 }))
 };
 
 console.log('Sending invoice data:', JSON.stringify(invoiceData, null, 2));
 const createRes = await apiClient.post('/invoices/', invoiceData);

 // Optimistically add to local list so it appears immediately
 try {
 const created = createRes.data;
 if (created && created.project_id === project.id) {
 setInvoices(prev => [created, ...prev]);
 }
 } catch {}
 
 // Reset form and close
 setNewInvoice({
 title: '',
 description: '',
 invoice_type: 'project',
 invoice_date: new Date().toISOString().split('T')[0],
 due_date: '',
 payment_terms: 'net_30',
 currency: 'usd',
 notes: '',
 terms_and_conditions: '',
 items: [{
 description: '',
 quantity: 1,
 unit_price: 0,
 tax_rate: 0,
 discount_rate: 0
 }]
 });
 setShowInvoiceForm(false);
 
 // Refresh invoices and show the invoices tab
 await fetchProjectInvoices();
 setActiveTab('invoices');
 
 dispatch(addNotification({
 type: 'success',
 title: 'Success',
 message: 'Invoice created successfully',
 duration: 3000,
 }));
 } catch (error: any) {
 console.error('Failed to create invoice:', error);
 let errorMessage = 'Failed to create invoice';
 
 if (error.response?.status === 422) {
 errorMessage = 'Validation error: ' + (error.response?.data?.detail || 'Invalid data provided');
 } else if (error.response?.status === 403) {
 errorMessage = 'Permission denied: Manager role required';
 } else if (error.response?.data?.detail) {
 errorMessage = error.response.data.detail;
 }
 
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: errorMessage,
 duration: 5000,
 }));
 }
 };

 // Invoice item management functions
 const addInvoiceItem = () => {
 setNewInvoice({
 ...newInvoice,
 items: [...newInvoice.items, {
 description: '',
 quantity: 1,
 unit_price: 0,
 tax_rate: 0,
 discount_rate: 0
 }]
 });
 };

 const removeInvoiceItem = (index: number) => {
 if (newInvoice.items.length > 1) {
 const updatedItems = newInvoice.items.filter((_, i) => i !== index);
 setNewInvoice({ ...newInvoice, items: updatedItems });
 }
 };

 const updateInvoiceItem = (index: number, field: string, value: any) => {
 const updatedItems = newInvoice.items.map((item, i) => 
 i === index ? { ...item, [field]: value } : item
 );
 setNewInvoice({ ...newInvoice, items: updatedItems });
 };

 const calculateInvoiceTotal = () => {
 return newInvoice.items.reduce((sum, item) => {
 const itemTotal = item.quantity * item.unit_price;
 const taxAmount = itemTotal * (item.tax_rate / 100);
 const discountAmount = itemTotal * (item.discount_rate / 100);
 return sum + itemTotal + taxAmount - discountAmount;
 }, 0);
 };

 const handleAddTeamMemberToProject = async (userId: string, role: string = 'member') => {
 if (!project) return;

 try {
 const { default: apiClient } = await import('../../api/client');
 // Update local selection
 setSelectedMemberIds(prev => {
 const next = prev.includes(userId) ? prev : [...prev, userId];
 return next;
 });

 // Build and send members-only update
 const nextSelected = selectedMemberIds.includes(userId) ? selectedMemberIds : [...selectedMemberIds, userId];
 const existingByUserId: Record<string, any> = {};
 const pms = Array.isArray((project as any).members) ? (project as any).members : [];
 pms.forEach((pm: any) => {
 const uid = pm.user_id || pm.user?.id;
 if (uid) existingByUserId[uid] = pm;
 });
 const membersPayload = nextSelected.map((uid) => {
 const existing = existingByUserId[uid];
 if (existing) {
 return {
 user_id: uid,
 role: existing.role || 'member',
 can_edit_project: !!existing.can_edit_project,
 can_create_tasks: existing.can_create_tasks !== undefined ? !!existing.can_create_tasks : true,
 can_assign_tasks: !!existing.can_assign_tasks,
 can_delete_tasks: !!existing.can_delete_tasks,
 };
 }
 return {
 user_id: uid,
 role: role || 'member',
 can_edit_project: role === 'manager' || role === 'admin',
 can_create_tasks: true,
 can_assign_tasks: role === 'manager' || role === 'admin',
 can_delete_tasks: role === 'manager' || role === 'admin',
 };
 });
 // Ensure owner remains
 const ownerId = project.owner_id;
 if (ownerId && !nextSelected.includes(ownerId)) {
 const existing = existingByUserId[ownerId];
 membersPayload.push({
 user_id: ownerId,
 role: existing?.role || 'owner',
 can_edit_project: true,
 can_create_tasks: true,
 can_assign_tasks: true,
 can_delete_tasks: true,
 });
 }

 const res = await apiClient.put(`/projects/${project.id}`, { members: membersPayload });
 const updated = res.data;
 setProject(updated);
 setTeamFromProject(updated);
 setShowTeamMemberForm(false);

 dispatch(addNotification({
 type: 'success',
 title: 'Success',
 message: 'Team member added successfully',
 duration: 3000,
 }));
 } catch (error) {
 console.error('Failed to add team member:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: 'Failed to add team member',
 duration: 5000,
 }));
 }
 };

 const formatCurrency = (amount: number) => {
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: 'USD',
 }).format(amount / 100); // Assuming amount is in cents
 };

 const formatDate = (dateString: string) => {
 return new Date(dateString).toLocaleDateString();
 };

 const getStatusColor = (status: string) => {
 const statusColors: Record<string, string> = {
 active: 'bg-green-100 text-green-800',
 completed: 'bg-blue-100 text-blue-800',
 planning: 'bg-yellow-100 text-yellow-800',
 on_hold: 'bg-orange-100 text-orange-800',
 cancelled: 'bg-red-100 text-red-800',
 paid: 'bg-green-100 text-green-800',
 pending: 'bg-yellow-100 text-yellow-800',
 overdue: 'bg-red-100 text-red-800',
 draft: 'bg-gray-100 text-gray-800',
 sent: 'bg-blue-100 text-blue-800',
 in_progress: 'bg-blue-100 text-blue-800',
 not_started: 'bg-gray-100 text-gray-800'
 };
 return statusColors[status] || 'bg-gray-100 text-gray-800';
 };

 const getPriorityColor = (priority: string) => {
 const priorityColors: Record<string, string> = {
 low: 'bg-gray-100 text-gray-800',
 medium: 'bg-yellow-100 text-yellow-800',
 high: 'bg-orange-100 text-orange-800',
 critical: 'bg-red-100 text-red-800'
 };
 return priorityColors[priority] || 'bg-gray-100 text-gray-800';
 };

 const getProjectHealthStatus = () => {
 if (!project || !project.due_date) return { status: 'No Due Date', color: 'bg-gray-500', textColor: 'text-gray-600' };
 
 const today = new Date();
 const dueDate = new Date(project.due_date);
 const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
 
 if (daysUntilDue < 0) {
 return { status: 'Overdue', color: 'bg-red-500', textColor: 'text-red-600' };
 } else if (daysUntilDue <= 7) {
 return { status: 'Due Soon', color: 'bg-orange-500', textColor: 'text-orange-600' };
 } else if (daysUntilDue <= 30) {
 return { status: 'On Track', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
 } else {
 return { status: 'Plenty of Time', color: 'bg-green-500', textColor: 'text-green-600' };
 }
 };

 // Do not block the UI with a centered loading spinner. While loading, render nothing.
 if (!project) {
 if (isLoading) {
 return <div />;
 }
 return (
 <div className="text-center2">
 <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h2>
 <p className="text-gray-600 mb-6">The project you're looking for doesn't exist.</p>
 <button
 onClick={() => navigate('/projects')}
 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
 >
 Back to Projects
 </button>
 </div>
 );
 }

 console.log('ProjectDetailOverviewPage rendering - project:', project, 'isLoading:', isLoading, 'id:', id);
 
 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-4">
 <button
 onClick={() => navigate('/projects')}
 className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <ArrowLeftIcon className="h-5 w-5" />
 </button>
 <div>
 <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
 <p className="text-gray-600">
 {project.status} • {project.priority} priority • Created {formatDate(project.created_at)}
 </p>
 {Array.isArray((project.custom_fields as any)?.tags) && (project.custom_fields as any).tags.length > 0 && (
 <p className="text-sm text-gray-600 mt-1">
 Tags: {(project.custom_fields as any).tags.join(', ')}
 </p>
 )}
 {/* Project Health Indicator */}
 {project && (
 <div className="flex items-center space-x-2 mt-2">
 <div className={`h-2 w-2 rounded-full ${getProjectHealthStatus().color}`}></div>
 <span className={`text-sm ${getProjectHealthStatus().textColor}`}>
 {getProjectHealthStatus().status}
 </span>
 {project.due_date && (
 <span className="text-xs text-gray-500">
 • Due in {Math.ceil((new Date(project.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
 </span>
 )}
 </div>
 )}
 </div>
 </div>
 <div className="flex space-x-3">
      <button
        onClick={async () => {
          try {
            const response = await apiClient.get(`/projects/${project!.id}/report/pdf`, {
              responseType: 'blob',
              headers: { Accept: 'application/pdf' },
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `project_${project!.name}_${new Date().toISOString().slice(0,10)}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
          } catch (err) {
            let message = 'Unable to export PDF. Please try again.';
            let triedPublicFallback = false;
            try {
              const status = (err as any)?.response?.status;
              const data = (err as any)?.response?.data;
              let detail: string | undefined;
              if (data instanceof Blob) {
                const text = await data.text();
                try { detail = JSON.parse(text)?.detail; } catch { detail = text; }
              } else if (typeof data === 'object' && data?.detail) {
                detail = data.detail;
              }
              if (status === 401 || (typeof detail === 'string' && detail.toLowerCase().includes('not authenticated'))) {
                // Fallback: create a share link and download the public PDF
                triedPublicFallback = true;
                try {
                  const shareRes = await apiClient.post(`/analytics/reports/share/project/${project!.id}`);
                  const shareId = shareRes.data?.share_id;
                  if (shareId) {
                    const res = await fetch(`${getApiBaseUrl()}/analytics/shared/project/${shareId}/pdf`, { headers: { Accept: 'application/pdf' } });
                    if (!res.ok) throw new Error('Failed to fetch shared PDF');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `project_${project!.name}_${new Date().toISOString().slice(0,10)}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    return;
                  }
                } catch (fallbackErr) {
                  // ignore, will show original error message below
                }
              }
              if (detail) message = detail;
            } catch {}
            console.error('PDF export failed:', err);
            dispatch(addNotification({
              type: 'error',
              title: 'Export Failed',
              message,
              duration: 8000,
            }));
          }
        }}
        className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
      >
        <DocumentArrowDownIcon className="h-4 w-4" />
        Export PDF
      </button>

 {/* Added actions next to Export PDF */}
 <button
 onClick={() => setActiveTab('tasks')}
 className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
 >
 <ListBulletIcon className="h-4 w-4" />
 View Task
 </button>
 <button
 onClick={() => setActiveTab('team')}
 className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
 >
 <UserGroupIcon className="h-4 w-4" />
 Manage Team
 </button>
 <button
 onClick={() => setActiveTab('invoices')}
 className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
 >
 <BanknotesIcon className="h-4 w-4" />
 View Invoice
 </button>
 
 <button
 onClick={async () => {
 try {
 const response = await apiClient.post(`/analytics/reports/share/project/${project!.id}`);
 const data = response.data;
 const shareUrl = `${window.location.origin}${data.share_url}`;
 await navigator.clipboard.writeText(shareUrl);
 dispatch(addNotification({
 type: 'success',
 title: 'Share Link Copied',
 message: `Project \"${project!.name}\" report link copied to clipboard`,
 duration: 5000,
 }));
 } catch (error) {
 dispatch(addNotification({
 type: 'error',
 title: 'Share Failed',
 message: 'Unable to create share link. Please try again.',
 duration: 5000,
 }));
 }
 }}
 className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
 >
 <ShareIcon className="h-4 w-4" />
 Share Project
 </button>
 
 <button
 onClick={() => setActiveTab('edit')}
 className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
 >
 <PencilIcon className="h-4 w-4" />
 Edit
 </button>
 
 <button
 onClick={handleDeleteProject}
 className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
 >
 <TrashIcon className="h-4 w-4" />
 Delete
 </button>
 </div>
 </div>

 {/* Navigation Tabs */}
 <div className="border-b border-gray-200">
 <nav className="flex space-x-8">
 {[
 { id: 'overview', name: 'Overview', icon: ChartBarIcon },
 { id: 'tasks', name: 'Tasks', icon: ListBulletIcon, count: tasks.length },
 { id: 'invoices', name: 'Invoices', icon: BanknotesIcon, count: invoices.length },
 { id: 'team', name: 'Team', icon: UserGroupIcon, count: teamMembers.length },
 { id: 'collaboration', name: 'Collaboration', icon: ChatBubbleLeftRightIcon },
 { id: 'roadmap', name: 'Roadmap', icon: FlagIcon, count: roadmap.length },
 { id: 'requirements', name: 'Requirements', icon: ListBulletIcon, count: requirementsCount },
 { id: 'edit', name: 'Edit', icon: PencilIcon }
 ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
                activeTab === tab.id
                  ? 'text-indigo-600'
                  : 'text-black hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
                {tab.count !== undefined && (
                  <span className="bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </div>
 </button>
 ))}
 </nav>
 </div>

 {/* Split Layout */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Main Content */}
 <div className="lg:col-span-2 space-y-8">
 {/* Tab Content */}
 {activeTab === 'overview' && project && (
 <div className="space-y-6">
 {/* Project Information */}
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Project Information</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 <div className="flex items-center space-x-3">
 <FolderIcon className="h-5 w-5 text-gray-400" />
 <div>
 <p className="text-sm font-medium text-gray-900">Project Name</p>
 <p className="text-sm text-gray-600">{project.name}</p>
 </div>
 </div>
 <div className="flex items-center space-x-3">
 <FlagIcon className="h-5 w-5 text-gray-400" />
 <div>
 <p className="text-sm font-medium text-gray-900">Status</p>
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
 {project.status}
 </span>
 </div>
 </div>
 <div className="flex items-center space-x-3">
 <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />
 <div>
 <p className="text-sm font-medium text-gray-900">Priority</p>
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
 {project.priority}
 </span>
 </div>
 </div>
 </div>
 <div className="space-y-4">
 {project.budget && (
 <div className="flex items-center space-x-3">
 <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
 <div>
 <p className="text-sm font-medium text-gray-900">Budget</p>
 <p className="text-sm text-gray-600">{formatCurrency(project.budget)}</p>
 </div>
 </div>
 )}
 {project.start_date && (
 <div className="flex items-center space-x-3">
 <CalendarIcon className="h-5 w-5 text-gray-400" />
 <div>
 <p className="text-sm font-medium text-gray-900">Start Date</p>
 <p className="text-sm text-gray-600">{formatDate(project.start_date)}</p>
 </div>
 </div>
 )}
 {project.due_date && (
 <div className="flex items-center space-x-3">
 <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
 <div>
 <p className="text-sm font-medium text-gray-900">Due Date</p>
 <p className="text-sm text-gray-600">{formatDate(project.due_date)}</p>
 </div>
 </div>
 )}
 </div>
 </div>
 {project.description && (
 <div className="mt-6 pt-6 border-t border-gray-200">
 <p className="text-sm font-medium text-gray-900 mb-2">Description</p>
 <p className="text-sm text-gray-600">{project.description}</p>
 </div>
 )}
 </div>

 {/* Customer Information */}
 {customer && (
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
 <div className="flex items-center space-x-4">
 <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
 <UserIcon className="h-6 w-6 text-user-blue" />
 </div>
 <div>
 <h4 className="text-lg font-medium text-gray-900">{customer.full_name}</h4>
 <p className="text-gray-600">{customer.company_name || 'No company'}</p>
 <p className="text-sm text-gray-500">{customer.email}</p>
 </div>
 <button
 onClick={() => navigate(`/customers/${customer.id}`)}
 className="ml-auto px-4 py-2 text-sm text-user-blue hover:text-primary-800 border border-primary-300 rounded-md hover:bg-primary-50"
 >
 View Customer
 </button>
 </div>
 </div>
 )}

 {/* Budget Overview */}
 {project && (project.budget || project.hourly_rate || project.estimated_hours) && (
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Budget & Time Overview</h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {project.budget && (
 <div className="text-center">
 <div className="text-2xl font-bold text-user-blue">{formatCurrency(project.budget)}</div>
 <div className="text-sm text-gray-500">Total Budget</div>
 {stats.totalRevenue > 0 && (
 <div className="text-xs text-gray-400 mt-1">
 {Math.round((stats.totalRevenue / project.budget) * 100)}% used
 </div>
 )}
 </div>
 )}
 {project.hourly_rate && (
 <div className="text-center">
 <div className="text-2xl font-bold text-green-600">{formatCurrency(project.hourly_rate)}</div>
 <div className="text-sm text-gray-500">Hourly Rate</div>
 </div>
 )}
 {project.estimated_hours && (
 <div className="text-center">
 <div className="text-2xl font-bold text-blue-600">{project.estimated_hours}h</div>
 <div className="text-sm text-gray-500">Estimated Hours</div>
 {stats.totalHours > 0 && (
 <div className="text-xs text-gray-400 mt-1">
 {Math.round((stats.totalHours / project.estimated_hours) * 100)}% used
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 )}

 {/* Key Metrics */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <div className="bg-white overflow-hidden shadow rounded-lg">
 <div className="p-5">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <ListBulletIcon className="h-6 w-6 text-blue-400" />
 </div>
 <div className="ml-5 w-0 flex-1">
 <dl>
 <dt className="text-sm font-medium text-gray-500 truncate">Total Tasks</dt>
 <dd className="text-lg font-medium text-gray-900">{stats.totalTasks}</dd>
 </dl>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-white overflow-hidden shadow rounded-lg">
 <div className="p-5">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <CheckCircleIcon className="h-6 w-6 text-green-400" />
 </div>
 <div className="ml-5 w-0 flex-1">
 <dl>
 <dt className="text-sm font-medium text-gray-500 truncate">Completion</dt>
 <dd className="text-lg font-medium text-gray-900">{stats.completionPercentage}%</dd>
 </dl>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-white overflow-hidden shadow rounded-lg">
 <div className="p-5">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <ClockIcon className="h-6 w-6 text-orange-400" />
 </div>
 <div className="ml-5 w-0 flex-1">
 <dl>
 <dt className="text-sm font-medium text-gray-500 truncate">Total Hours</dt>
 <dd className="text-lg font-medium text-gray-900">{stats.totalHours}</dd>
 </dl>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-white overflow-hidden shadow rounded-lg">
 <div className="p-5">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <BanknotesIcon className="h-6 w-6 text-purple-400" />
 </div>
 <div className="ml-5 w-0 flex-1">
 <dl>
 <dt className="text-sm font-medium text-gray-500 truncate">Revenue</dt>
 <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.totalRevenue)}</dd>
 </dl>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Progress Overview */}
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Progress Overview</h3>
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-gray-700">Overall Progress</span>
 <span className="text-sm font-medium text-gray-900">{stats.completionPercentage}%</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div 
 className="bg-blue-600 h-2 rounded-full transition-all duration-300"
 style={{ width: `${stats.completionPercentage}%` }}
 ></div>
 </div>
 <div className="grid grid-cols-3 gap-4 text-center">
 <div>
 <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
 <div className="text-sm text-gray-500">Completed</div>
 </div>
 <div>
 <div className="text-2xl font-bold text-blue-600">{stats.inProgressTasks}</div>
 <div className="text-sm text-gray-500">In Progress</div>
 </div>
 <div>
 <div className="text-2xl font-bold text-gray-600">{stats.pendingTasks}</div>
 <div className="text-sm text-gray-500">Pending</div>
 </div>
 </div>
 </div>
 </div>

 {/* Recent Activity */}
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
 <div className="space-y-4">
 {tasks.length > 0 ? (
 <div className="space-y-3">
 {tasks.slice(0, 5).map((task) => (
 <div key={task.id} className="flex items-center space-x-3 p-3 bg-secondary-50 rounded-lg">
 <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
 <ListBulletIcon className="h-4 w-4 text-user-blue" />
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-gray-900">
 Task"{task.title}" was {task.status === 'completed' ? 'completed' : 'updated'}
 </p>
 <p className="text-xs text-gray-500">
 {task.due_date ? `Due: ${formatDate(task.due_date)}` : 'No due date'}
 </p>
 </div>
 <span className={`inline-flex items-center px-2 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
 {task.status}
 </span>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-8">
 <ClockIcon className="mx-auto h-8 w-8 text-gray-400" />
 <p className="text-sm text-gray-500 mt-2">No recent activity</p>
 </div>
 )}
 </div>
 </div>

 {/* Client Comments */}
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Client Comments</h3>
 {clientComments.length === 0 ? (
   <p className="text-sm text-gray-500">No client comments yet.</p>
 ) : (
   <div className="space-y-3">
     {clientComments.slice(0, 5).map((c) => (
       <div key={c.id} className="p-3 border border-gray-200 rounded-md">
         <div className="flex items-start justify-between gap-3">
           <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{c.content}</p>
           <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(c.created_at)}</span>
         </div>
         <div className="mt-1 text-xs uppercase tracking-wide text-gray-600 font-medium">{c.author_name}</div>
       </div>
     ))}
   </div>
 )}
 </div>

 {/* Context Cards */}
 {project && (
 <ContextCardsWidget projectId={project.id} />
 )}

 {/* Project Timeline */}
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Project Timeline</h3>
 <div className="space-y-4">
 <div className="flex items-center space-x-4">
 <div className="flex-shrink-0">
 <div className="h-3 w-3 bg-green-500 rounded-full"></div>
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-gray-900">Project Created</p>
 <p className="text-xs text-gray-500">{formatDate(project.created_at)}</p>
 </div>
 </div>
 
 {project.start_date && (
 <div className="flex items-center space-x-4">
 <div className="flex-shrink-0">
 <div className="h-3 w-3 bg-blue-600 rounded-full"></div>
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-gray-900">Project Started</p>
 <p className="text-xs text-gray-500">{formatDate(project.start_date)}</p>
 </div>
 </div>
 )}
 
 {project.due_date && (
 <div className="flex items-center space-x-4">
 <div className="flex-shrink-0">
 <div className="h-3 w-3 bg-orange-500 rounded-full"></div>
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-gray-900">Project Due</p>
 <p className="text-xs text-gray-500">{formatDate(project.due_date)}</p>
 </div>
 </div>
 )}
 
 {project.completed_date && (
 <div className="flex items-center space-x-4">
 <div className="flex-shrink-0">
 <div className="h-3 w-3 bg-purple-500 rounded-full"></div>
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-gray-900">Project Completed</p>
 <p className="text-xs text-gray-500">{formatDate(project.completed_date)}</p>
 </div>
 </div>
 )}
 
 <div className="flex items-center space-x-4">
 <div className="flex-shrink-0">
 <div className="h-3 w-3 bg-gray-500 rounded-full"></div>
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-gray-900">Last Updated</p>
 <p className="text-xs text-gray-500">{formatDate(project.updated_at)}</p>
 </div>
 </div>
 </div>
 </div>

 {/* Project Completion Prediction */}
 {project && project.due_date && project.start_date && (
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Completion Prediction</h3>
 <div className="space-y-4">
 {(() => {
 const today = new Date();
 const startDate = new Date(project.start_date);
 const dueDate = new Date(project.due_date);
 const totalDuration = dueDate.getTime() - startDate.getTime();
 const elapsed = today.getTime() - startDate.getTime();
 const progress = stats.completionPercentage / 100;
 const expectedProgress = elapsed / totalDuration;
 const isOnTrack = progress >= expectedProgress;
 
 return (
 <>
 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-gray-700">Expected Progress</span>
 <span className="text-sm font-medium text-gray-900">{Math.round(expectedProgress * 100)}%</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div 
 className="bg-blue-600 h-2 rounded-full transition-all duration-300"
 style={{ width: `${Math.min(expectedProgress * 100, 100)}%` }}
 ></div>
 </div>
 
 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-gray-700">Actual Progress</span>
 <span className="text-sm font-medium text-gray-900">{stats.completionPercentage}%</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div 
 className={`h-2 rounded-full transition-all duration-300 ${
 isOnTrack ? 'bg-green-600' : 'bg-red-600'
 }`}
 style={{ width: `${stats.completionPercentage}%` }}
 ></div>
 </div>
 
 <div className={`text-center p-3 rounded-lg ${
 isOnTrack ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
 }`}>
 <p className="text-sm font-medium">
 {isOnTrack ? '🎯 Project is on track!' : '⚠️ Project is behind schedule'}
 </p>
 <p className="text-xs mt-1">
 {isOnTrack 
 ? `You're ${Math.round((progress - expectedProgress) * 100)}% ahead of schedule`
 : `You're ${Math.round((expectedProgress - progress) * 100)}% behind schedule`
 }
 </p>
 </div>
 </>
 );
 })()}
 </div>
 </div>
 )}
 </div>
 )}

 {/* Roadmap Tab */}
 {activeTab === 'roadmap' && project && (
 <div className="space-y-6">
 <div className="bg-white shadow rounded-lg p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-medium text-gray-900">Project Roadmap</h3>
 </div>
 <div className="flex items-center gap-2">
 <input
 type="text"
 value={newRoadmapTitle}
 onChange={(e) => setNewRoadmapTitle(e.target.value)}
 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRoadmapItem(); } }}
 className="flex-1 border border-gray-300 rounded-md py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Add a new feature or milestone..."
 />
<button
onClick={addRoadmapItem}
className="btn-page-action flex items-center btn-styled btn-create-auto"
>
Add
</button>
 </div>
 <div className="mt-4 space-y-2">
          {roadmap.length === 0 ? (
            <div className="text-sm text-gray-500">No items yet. Add your first roadmap item above.</div>
          ) : (
            roadmap.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-md bg-white">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleRoadmapItem(item.id)}
                    className="h-4 w-4"
                  />
                  <span className={`text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.title}</span>
                </label>
                <button
                  onClick={() => deleteRoadmapItem(item.id)}
                  className="text-red-600 hover:text-red-800 text-xs"
                  title="Remove"
                >
                  Remove
                </button>
              </div>
            ))
          )}
 </div>
 </div>
 </div>
 )}

 {/* Requirements Tab */}
 {activeTab === 'requirements' && project && (
 <div className="space-y-6">
 <div className="bg-white shadow rounded-lg p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-medium text-gray-900">Requirements</h3>
 </div>

 {/* Add heading */}
 <div className="flex items-center gap-2 mb-4">
 <input
 type="text"
 value={newRequirementHeading}
 onChange={(e) => setNewRequirementHeading(e.target.value)}
 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRequirementHeading(); } }}
 className="flex-1 border border-gray-300 rounded-md py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Add a new heading (e.g., Authentication, Payments)..."
 />
<button
onClick={addRequirementHeading}
className="btn-page-action flex items-center btn-styled btn-create-auto"
>
Add Heading
</button>
 </div>

 {/* Sections */}
 <div className="space-y-4">
 {requirementsSections.length === 0 ? (
 <div className="text-sm text-gray-500">No requirement sections yet. Add a heading above.</div>
 ) : (
 requirementsSections.map((section) => (
 <div key={section.id} className="border border-gray-200 rounded-md p-4 bg-white">
 <div className="flex items-center justify-between mb-2">
 <h4 className="text-md font-semibold text-gray-900">{section.heading}</h4>
 <button
 onClick={() => deleteRequirementHeading(section.id)}
 className="text-red-600 hover:text-red-800 text-xs"
 title="Remove heading"
 >
 Remove Heading
 </button>
 </div>

 {/* Add item in this section */}
 <div className="flex items-center gap-2 mb-2">
 <input
 type="text"
 value={newItemBySection[section.id] || ''}
 onChange={(e) => setNewItemBySection(prev => ({ ...prev, [section.id]: e.target.value }))}
 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRequirementItem(section.id); } }}
 className="flex-1 border border-gray-300 rounded-md py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Add a new requirement item..."
 />
<button
onClick={() => addRequirementItem(section.id)}
className="btn-page-action flex items-center btn-styled btn-create-auto"
>
Add
</button>
 </div>

 {/* Items */}
 <div className="space-y-2">
 {section.items.length === 0 ? (
 <div className="text-sm text-gray-500">No items yet in this section.</div>
 ) : (
 section.items.map(item => (
 <div key={item.id} className="flex items-center justify-between px-2 rounded-md bg-white">
 <label className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={item.done}
 onChange={() => toggleRequirementItem(section.id, item.id)}
 className="h-4 w-4"
 />
 <span className={`text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.title}</span>
 </label>
 <button
 onClick={() => deleteRequirementItem(section.id, item.id)}
 className="p-1 text-red-600 hover:text-red-800"
 title="Delete"
 aria-label="Delete requirement"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 ))
 )}
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 )}

 {/* Tasks Tab */}
 {activeTab === 'tasks' && project && (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
 <div className="space-x-2">
<button
onClick={() => setShowTaskForm((v) => !v)}
className="btn-page-action flex items-center btn-styled btn-create-auto"
>
 <PlusIcon className="h-4 w-4 mr-2" />
 {showTaskForm ? 'Close' : 'New Task'}
 </button>
 </div>
 </div>

 {showTaskForm && (
 <div className="bg-white rounded-lg shadow border p-6">
 <h4 className="text-md font-semibold text-gray-900 mb-4">Create New Task</h4>
 <form onSubmit={handleCreateTask} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700">Task Title</label>
 <input
 type="text"
 value={newTask.title}
 onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2"
 required
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700">Assign To</label>
 <select
 value={newTask.assigned_to}
 onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2"
 >
 <option value="">Select a team member</option>
 {availableUsers.map((user) => (
 <option key={user.id} value={user.id}>
 {user.full_name || `${user.first_name} ${user.last_name}`}
 </option>
 ))}
 </select>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700">Description</label>
 <textarea
 value={newTask.description}
 onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2"
 rows={3}
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700">Status</label>
 <select
 value={newTask.status}
 onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2"
 >
 <option value="todo">To Do</option>
 <option value="in_progress">In Progress</option>
 <option value="in_review">In Review</option>
 <option value="completed">Completed</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700">Priority</label>
 <select
 value={newTask.priority}
 onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2"
 >
 <option value="low">Low</option>
 <option value="medium">Medium</option>
 <option value="high">High</option>
 <option value="critical">Critical</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700">Due Date</label>
 <input
 type="date"
 value={newTask.due_date}
 onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700">Estimated Hours</label>
 <input
 type="number"
 value={newTask.estimated_hours}
 onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2"
 />
 </div>
 </div>

 <div className="flex justify-end space-x-3">
 <button
 type="button"
 onClick={() => setShowTaskForm(false)}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
 >
 Create Task
 </button>
 </div>
 </form>
 </div>
 )}
 
 <div className="bg-white rounded-lg shadow overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-200">
 <h3 className="text-lg font-medium text-gray-900">
 Tasks ({tasks.length})
 </h3>
 </div>
 
 {tasks.length === 0 ? (
 <div className="text-center2">
 <ListBulletIcon className="mx-auto h-12 w-12 text-gray-400" />
 <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
 <p className="mt-1 text-sm text-gray-500">Get started by creating a new task.</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-secondary-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Task
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Status
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Priority
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Assignee
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Due Date
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Hours
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {tasks.map((task) => (
 <tr key={task.id} className="hover:bg-gray-50">
 <td className="px-6 py-4 whitespace-nowrap">
 <div>
 <div className="text-sm font-medium text-gray-900">{task.title}</div>
 {task.description && (
 <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
 )}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
 {task.status}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
 {task.priority}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 {(() => {
 const ids = Array.isArray((task as any).assignee_ids) && (task as any).assignee_ids.length > 0
 ? (task as any).assignee_ids as string[]
 : (task as any).assignee_id
 ? [String((task as any).assignee_id)]
 : [];
 if (ids.length === 0) {
 return <span className="text-sm text-gray-500">Unassigned</span>;
 }
 return (
 <div className="flex flex-col gap-1">
 {ids.map((uid) => {
 const name = userNameById[uid] || uid;
 const avatar = userAvatarById[uid] || null;
 const initials = getInitials(name);
 return (
 <div key={uid} className="flex items-center gap-2">
 {avatar ? (
 <img src={avatar} alt={name} className="h-6 w-6 rounded-full object-cover" />
 ) : (
 <div className="h-6 w-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-medium" title={name}>
 {initials}
 </div>
 )}
 <span className="text-sm text-gray-900">{name}</span>
 </div>
 );
 })}
 </div>
 );
 })()}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 {task.due_date ? formatDate(task.due_date) : 'Not set'}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 {task.estimated_hours || 'Not set'}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
 <div className="flex space-x-2">
 <button
 onClick={() => navigate(`/tasks/${task.id}`)}
 className="bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full p-2 transition-colors"
 title="View Details"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => navigate(`/tasks/${task.id}?tab=edit`)}
 className="bg-green-100 hover:bg-green-200 text-green-600 rounded-full p-2 transition-colors"
 title="Edit"
 >
 <PencilIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDeleteTaskFromProject(task.id)}
 className="bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-2 transition-colors"
 title="Delete"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Invoices Tab */}
 {activeTab === 'invoices' && project && (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h3 className="text-lg font-medium text-gray-900">Invoices</h3>
 <button
 onClick={() => {
 setNewInvoice(prev => ({
 ...prev,
 title: prev.title || (project ? `Invoice for ${project.name}` : ''),
 invoice_date: new Date().toISOString().split('T')[0],
 currency: (prev.currency || 'usd'),
 }));
 setShowInvoiceForm(true);
 }}
className="btn-page-action flex items-center btn-styled btn-create-auto"
 >
 <PlusIcon className="h-4 w-4 mr-2" />
 New Invoice
 </button>
 </div>

 {showInvoiceForm && (
 <div className="bg-white rounded-lg shadow border p-6">
 <h4 className="text-md font-semibold text-gray-900 mb-4">Create New Invoice</h4>
 <form onSubmit={handleCreateInvoice} className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700">Title *</label>
 <input
 type="text"
 value={newInvoice.title}
 onChange={(e) => setNewInvoice({ ...newInvoice, title: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Invoice title"
 required
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700">Invoice Date *</label>
 <input
 type="date"
 value={newInvoice.invoice_date}
 onChange={(e) => setNewInvoice({ ...newInvoice, invoice_date: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 required
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700">Due Date</label>
 <input
 type="date"
 value={newInvoice.due_date}
 onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
 <select
 value={newInvoice.payment_terms}
 onChange={(e) => setNewInvoice({ ...newInvoice, payment_terms: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="net_15">Net 15</option>
 <option value="net_30">Net 30</option>
 <option value="net_60">Net 60</option>
 <option value="due_on_receipt">Due on Receipt</option>
 </select>
 </div>
 <div>
<label className="block text-sm font-medium text-gray-700">Currency</label>
 <select
 value={newInvoice.currency}
 onChange={(e) => setNewInvoice({ ...newInvoice, currency: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="usd">USD ($)</option>
 <option value="eur">EUR (€)</option>
 <option value="gbp">GBP (£)</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700">Description</label>
 <textarea
 value={newInvoice.description}
 onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 rows={2}
 placeholder="Invoice description"
 />
 </div>

 {/* Items */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h4 className="text-md font-medium text-gray-900">Invoice Items</h4>
 <button type="button" onClick={addInvoiceItem} className="btn btn-secondary">
 <PlusIcon className="h-4 w-4 mr-1" /> Add Item
 </button>
 </div>
 <div className="space-y-3">
 {newInvoice.items.map((item, index) => (
 <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 border border-gray-200 rounded-md">
 <div className="md:col-span-2">
 <label className="block text-xs font-medium text-gray-700">Description</label>
 <input
 type="text"
 value={item.description}
 onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
 className="mt-1 block w-full border border-gray-300 rounded-md px-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
 placeholder="Item description"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-700">Qty</label>
 <input
 type="number"
 min="1"
 value={item.quantity}
 onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 1)}
 className="mt-1 block w-full border border-gray-300 rounded-md px-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-700">Unit Price ($)</label>
 <input
 type="number"
 step="0.01"
 min="0"
 value={item.unit_price}
 onChange={(e) => updateInvoiceItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
 className="mt-1 block w-full border border-gray-300 rounded-md px-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-700">Tax (%)</label>
 <input
 type="number"
 step="0.01"
 min="0"
 max="100"
 value={item.tax_rate}
 onChange={(e) => updateInvoiceItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
 className="mt-1 block w-full border border-gray-300 rounded-md px-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-700">Discount (%)</label>
 <input
 type="number"
 step="0.01"
 min="0"
 max="100"
 value={item.discount_rate}
 onChange={(e) => updateInvoiceItem(index, 'discount_rate', parseFloat(e.target.value) || 0)}
 className="mt-1 block w-full border border-gray-300 rounded-md px-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 <div className="flex items-end">
 {newInvoice.items.length > 1 && (
 <button type="button" onClick={() => removeInvoiceItem(index)} className="btn btn-danger">
 <TrashIcon className="h-4 w-4 mx-auto" />
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 <div className="flex justify-end">
 <div className="text-right">
 <div className="text-lg font-semibold text-gray-900">Total: ${calculateInvoiceTotal().toFixed(2)}</div>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700">Notes</label>
 <textarea
 value={newInvoice.notes}
 onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 rows={3}
 placeholder="Internal notes"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700">Terms and Conditions</label>
 <textarea
 value={newInvoice.terms_and_conditions}
 onChange={(e) => setNewInvoice({ ...newInvoice, terms_and_conditions: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 rows={3}
 placeholder="Terms and conditions"
 />
 </div>
 </div>

 <div className="flex justify-end space-x-3">
 <button type="button" onClick={() => setShowInvoiceForm(false)} className="btn btn-secondary">Cancel</button>
 <button type="submit" className="btn btn-primary">Create Invoice</button>
 </div>
 </form>
 </div>
 )}
 
 <div className="bg-white rounded-lg shadow overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-200">
 <h3 className="text-lg font-medium text-gray-900">
 Invoices ({invoices.length})
 </h3>
 </div>
 
 {invoices.length === 0 ? (
 <div className="text-center2">
 <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
 <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
 <p className="mt-1 text-sm text-gray-500">Get started by creating a new invoice.</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-secondary-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Invoice
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Amount
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Status
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Due Date
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Created
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {invoices.map((invoice) => (
 <tr key={invoice.id} className="hover:bg-gray-50">
 <td className="px-6 py-4 whitespace-nowrap">
 <div>
 <div className="text-sm font-medium text-gray-900">{invoice.title}</div>
 {invoice.description && (
 <div className="text-sm text-gray-500 truncate max-w-xs">{invoice.description}</div>
 )}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
 {formatCurrency(invoice.total_amount || 0)}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
 {invoice.status}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 {invoice.due_date ? formatDate(invoice.due_date) : 'Not set'}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 {formatDate(invoice.created_at)}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
 <div className="flex space-x-2">
 <button
 onClick={() => navigate(`/invoices/${invoice.id}`)}
 className="btn btn-icon btn-view"
 title="View"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => navigate(`/invoices/${invoice.id}?tab=edit`)}
 className="btn btn-icon btn-edit"
 title="Edit"
 >
 <PencilIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDeleteInvoiceFromProject(invoice.id)}
 className="btn btn-icon btn-delete"
 title="Delete"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Team Tab */}
 {activeTab === 'team' && project && (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
 <button
 onClick={() => setShowTeamMemberForm(true)}
className="btn-page-action flex items-center btn-styled btn-create-auto"
 >
 <PlusIcon className="h-4 w-4 mr-2" />
 Add Member
 </button>
 </div>

 {showTeamMemberForm && (
 <div className="bg-white rounded-lg shadow border p-6">
 <div className="flex items-center justify-between mb-4">
 <h4 className="text-md font-semibold text-gray-900">Add Team Member</h4>
 <button onClick={() => setShowTeamMemberForm(false)} className="text-gray-500 hover:text-gray-700 text-sm">Close</button>
 </div>
 <div className="space-y-2 max-h-64 overflow-y-auto">
 {availableUsers.filter(u => !teamMembers.find(tm => tm.id === u.id)).map((user) => (
 <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
 <div>
 <p className="font-medium">{user.full_name || `${user.first_name} ${user.last_name}`}</p>
 <p className="text-sm text-gray-500">{user.email}</p>
 </div>
 <div className="flex space-x-2">
 <button
 onClick={() => handleAddTeamMemberToProject(user.id, 'member')}
 className="text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
 >
 Add as Member
 </button>
 <button
 onClick={() => handleAddTeamMemberToProject(user.id, 'manager')}
 className="text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
 >
 Add as Manager
 </button>
 </div>
 </div>
 ))}
 {availableUsers.filter(u => !teamMembers.find(tm => tm.id === u.id)).length === 0 && (
 <p className="text-gray-500 text-sm">All users are already team members.</p>
 )}
 </div>
 </div>
 )}
 
 <div className="bg-white rounded-lg shadow overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-200">
 <h3 className="text-lg font-medium text-gray-900">
 Team Members ({teamMembers.length})
 </h3>
 </div>
 
 {teamMembers.length === 0 ? (
 <div className="text-center2">
 <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
 <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
 <p className="mt-1 text-sm text-gray-500">Get started by adding team members.</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-secondary-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Member
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Contact
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Role
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Status
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Last Login
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {teamMembers.map((member) => (
 <tr key={member.id} className="hover:bg-gray-50">
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center">
 <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
 <span className="text-sm font-medium text-user-blue">
 {member.first_name?.[0]}{member.last_name?.[0]}
 </span>
 </div>
 <div className="ml-4">
 <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
 <div className="text-sm text-gray-500">{member.username}</div>
 </div>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="text-sm text-gray-900">{member.email}</div>
 {member.phone && (
 <div className="text-sm text-gray-500">{member.phone}</div>
 )}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 member.role === UserRole.ADMIN ? 'bg-red-100 text-red-800' :
 member.role === UserRole.MEMBER ? 'bg-blue-100 text-blue-800' :
 'bg-gray-100 text-gray-800'
 }`}>
 {member.role}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
 }`}>
 {member.is_active ? 'Active' : 'Inactive'}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 {member.last_login ? formatDate(member.last_login) : 'Never'}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
 <div className="flex space-x-2">
 <button
 onClick={() => navigate(`/teams/${member.id}`)}
 className="bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full p-2 transition-colors"
 title="View Details"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 <button
 className="bg-green-100 hover:bg-green-200 text-green-600 rounded-full p-2 transition-colors"
 title="Edit"
 >
 <PencilIcon className="h-4 w-4" />
 </button>
 <button
 className="bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-2 transition-colors"
 title="Remove from Project"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Collaboration Tab */}
 {activeTab === 'collaboration' && project && (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h3 className="text-lg font-medium text-gray-900">Team Collaboration</h3>
 </div>
 
 {/* Project Comments */}
 <ProjectComments projectId={project.id} />
 
 {/* File Upload */}
 <div className="bg-white rounded-lg shadow">
 <div className="px-6 py-4 border-b border-gray-200">
 <h4 className="text-lg font-medium text-gray-900">File Attachments</h4>
 </div>
 <div className="px-6 py-4">
 <DragDropUpload 
 projectId={project.id}
 maxFiles={20}
 maxSizeM={100}
 onFileUpload={(files) => {
 console.log('Files uploaded:', files);
 // Handle file upload completion
 }}
 onCloudImport={(source) => {
 console.log('Cloud import from:', source);
 // Handle cloud import
 }}
 />
 </div>
 </div>
 </div>
 )}

 {/* Edit Tab */}
 {activeTab === 'edit' && project && (
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-6">Edit Project</h3>
 <form onSubmit={handleUpdateProject} className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Project Name *
 </label>
 <input
 type="text"
 required
 value={editForm.name || ''}
 onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Customer
 </label>
 <select
 value={editForm.customer_id || ''}
 onChange={(e) => setEditForm({ ...editForm, customer_id: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 >
 <option value="">Select a customer</option>
 {customers.map((customer) => (
 <option key={customer.id} value={customer.id}>
 {customer.display_name}
 </option>
 ))}
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Status
 </label>
 <select
 value={editForm.status || 'planning'}
 onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ProjectStatus })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 >
 <option value="planning">Planning</option>
 <option value="active">Active</option>
 <option value="on_hold">On Hold</option>
 <option value="completed">Completed</option>
 <option value="cancelled">Cancelled</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Priority
 </label>
 <select
 value={editForm.priority || 'medium'}
 onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as ProjectPriority })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 >
 <option value="low">Low</option>
 <option value="medium">Medium</option>
 <option value="high">High</option>
 <option value="critical">Critical</option>
 </select>
 </div>

 {/* Tags (comma-separated) */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
 <input
 type="text"
 value={editTags}
 onChange={(e) => setEditTags(e.target.value)}
 placeholder="e.g. internal, urgent"
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 />
 <p className="text-xs text-gray-500 mt-1">Comma-separated. Saved to custom_fields.tags</p>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Budget
 </label>
 <input
 type="number"
 step="0.01"
 value={editForm.budget || ''}
 onChange={(e) => setEditForm({ ...editForm, budget: parseFloat(e.target.value) || 0 })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Start Date
 </label>
 <input
 type="date"
 value={editForm.start_date || ''}
 onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Due Date
 </label>
 <input
 type="date"
 value={editForm.due_date || ''}
 onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 />
 </div>
 </div>

 <div ref={teamDropdownRef}>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Team Members
 </label>
 <div
 className="w-full border border-gray-300 rounded-md bg-white cursor-pointer"
 onClick={() => setIsTeamDropdownOpen(o => !o)}
 >
 <div className="py-2 flex flex-wrap gap-1 min-h-[40px]">
 {selectedMemberIds.length === 0 ? (
 <span className="text-sm text-gray-500">Select team members</span>
 ) : (
 selectedMemberIds.slice(0, 4).map((userId) => {
 const user = availableUsers.find(u => u.id === userId);
 return user ? (
 <span key={userId} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
 {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
 </span>
 ) : null;
 })
 )}
 {selectedMemberIds.length > 4 && (
 <span className="text-xs text-gray-500">+{selectedMemberIds.length - 4} more</span>
 )}
 </div>
 </div>
 {isTeamDropdownOpen && (
 <div className="relative">
 <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto">
 <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
 <div className="relative">
 <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 value={teamFilter}
 onChange={(e) => setTeamFilter(e.target.value)}
 placeholder="Search members..."
 className="w-full pl-7 pr-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 <ul >
 {availableUsers
 .filter((u) => {
 const name = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase();
 return name.includes(teamFilter.toLowerCase()) || (u.email || '').toLowerCase().includes(teamFilter.toLowerCase());
 })
 .map((user) => {
 const selected = selectedMemberIds.includes(user.id);
 const name = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
 return (
 <li
 key={user.id}
 className={`py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
 onClick={() => toggleMember(user.id)}
 >
 <div className="flex flex-col">
 <span className="text-gray-900">{name}</span>
 <span className="text-xs text-gray-500">{user.email}</span>
 </div>
 {selected && <CheckIcon className="w-4 h-4 text-user-blue" />}
 </li>
 );
 })}
 {availableUsers.length === 0 && (
 <li className="py-2 text-sm text-gray-500">No team members found</li>
 )}
 </ul>
 </div>
 </div>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Description
 </label>
 <textarea
 rows={4}
 value={editForm.description || ''}
 onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 placeholder="Add a description for this project..."
 />
 </div>
 
 {/* Custom Fields */}
 <div className="pt-2">
 <EntityCustomFieldsEditor
 entityType="project"
 entityId={project.id}
 values={customFieldValues}
 onChange={(vals) => setCustomFieldValuesState(vals)}
 />
 </div>

 <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
 <button
 type="button"
 onClick={() => setActiveTab('overview')}
 className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-50 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
className="btn-page-action flex items-center btn-styled btn-create-auto"
 >
 Update Project
 </button>
 </div>
 </form>
 </div>
 )}
 </div>

 {/* Sidebar */}
 <div className="space-y-8">
 {/* Quick Stats */}
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:p-6">
 <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Stats</h3>
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-500">Total Tasks</span>
 <span className="text-sm font-medium text-gray-900">{stats.totalTasks}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-500">Roadmap Items</span>
 <span className="text-sm font-medium text-gray-900">{roadmap.length}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-500">Requirements Items</span>
 <span className="text-sm font-medium text-gray-900">{requirementsCount}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-500">Team Members</span>
 <span className="text-sm font-medium text-gray-900">{teamMembers.length}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-500">Invoices</span>
 <span className="text-sm font-medium text-gray-900">{invoices.length}</span>
 </div>
 </div>
 </div>
 </div>

 {/* Project Status */}
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:p-6">
 <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Project Status</h3>
 <div className="space-y-3">
 <div className="flex items-center space-x-2">
 <div className={`h-2 w-2 rounded-full ${getProjectHealthStatus().color}`}></div>
 <span className="text-sm text-gray-600">Health: {getProjectHealthStatus().status}</span>
 </div>
 <div className="space-y-2">
 <div className="flex justify-between text-sm">
 <span className="text-gray-500">Progress</span>
 <span className="font-medium">{stats.completionPercentage}%</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div 
 className="bg-blue-600 h-2 rounded-full transition-all duration-300"
 style={{ width: `${stats.completionPercentage}%` }}
 ></div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Recent Activity */}
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:p-6">
 <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
 <div className="space-y-3">
 {tasks.slice(0, 3).map((task) => (
 <div key={task.id} className="flex items-center space-x-3">
 <div className={`h-2 w-2 rounded-full ${
 task.status === 'completed' ? 'bg-green-400' :
 task.status === 'in_progress' ? 'bg-blue-400' : 'bg-gray-400'
 }`}></div>
 <div className="flex-1 min-w-0">
 <p className="text-sm text-gray-900 truncate">{task.title}</p>
 <p className="text-xs text-gray-500">{task.status.replace('_', ' ')}</p>
 </div>
 </div>
 ))}
 {tasks.length === 0 && (
 <p className="text-sm text-gray-500">No recent activity</p>
 )}
 </div>
 </div>
 </div>

 </div>
 </div>
 
 {/* Floating Chat Component */}
 {project && (
 <ProjectChat 
 projectId={project.id}
 projectName={project.name}
 currentUser={{
 id: 'current-user-id', // You would get this from your auth state
 username: 'current-user',
 full_name: 'Current User'
 }}
 />
 )}

 {/* Task Creation Form Modal (disabled) */}
 {false && (
 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
 <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-medium text-gray-900">Create New Task</h3>
 <button
 onClick={() => setShowTaskForm(false)}
 className="text-gray-400 hover:text-gray-600"
 >
 ×
 </button>
 </div>
 
 <form onSubmit={handleCreateTask} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700">Task Title</label>
 <input
 type="text"
 value={newTask.title}
 onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2"
 required
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700">Description</label>
 <textarea
 value={newTask.description}
 onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2"
 rows={3}
 />
 </div>
 
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700">Status</label>
 <select
 value={newTask.status}
 onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2"
 >
 <option value="todo">To Do</option>
 <option value="in_progress">In Progress</option>
 <option value="in_review">In Review</option>
 <option value="completed">Completed</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700">Priority</label>
 <select
 value={newTask.priority}
 onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2"
 >
 <option value="low">Low</option>
 <option value="medium">Medium</option>
 <option value="high">High</option>
 <option value="critical">Critical</option>
 </select>
 </div>
 </div>
 
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700">Estimated Hours</label>
 <input
 type="number"
 value={newTask.estimated_hours}
 onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700">Due Date</label>
 <input
 type="date"
 value={newTask.due_date}
 onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2"
 />
 </div>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700">Assign To</label>
 <select
 value={newTask.assigned_to}
 onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2"
 >
 <option value="">Select a team member</option>
 {availableUsers.map((user) => (
 <option key={user.id} value={user.id}>
 {user.full_name || `${user.first_name} ${user.last_name}`}
 </option>
 ))}
 </select>
 </div>
 
 <div className="flex justify-end space-x-3">
 <button
 type="button"
 onClick={() => setShowTaskForm(false)}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
 >
 Create Task
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Invoice Creation Form Modal (disabled) */}
 {false && (
 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
 <div className="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
 <BanknotesIcon className="h-6 w-6 text-blue-500" />
 <span>Create New Invoice</span>
 </h3>
 <button
 onClick={() => setShowInvoiceForm(false)}
 className="text-gray-400 hover:text-gray-600"
 >
 ×
 </button>
 </div>
 
 <form onSubmit={handleCreateInvoice} className="space-y-6">
 {/* Basic Information */}
 <div className="space-y-4">
 <h4 className="text-lg font-medium text-gray-900">Invoice Details</h4>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700">Title *</label>
 <input
 type="text"
 value={newInvoice.title}
 onChange={(e) => setNewInvoice({ ...newInvoice, title: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Invoice title"
 required
 />
 </div>
 
 {/* Customer (auto from project) */}
 <div>
 <label className="block text-sm font-medium text-gray-700">Customer</label>
 <input
 type="text"
value={(customer?.full_name || customer?.email || customer?.id) ? `${customer?.full_name ?? customer?.email ?? customer?.id}${customer?.company_name ? ` (${customer?.company_name})` : ''}` : 'No customer assigned'}
 readOnly
 className="mt-1 block w-full border border-gray-200 bg-gray-50 text-gray-700 rounded-md py-2"
 />
 <p className="mt-1 text-xs text-gray-500">Customer is auto-selected from the project and cannot be changed here.</p>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700">Invoice Type</label>
 <select
 value={newInvoice.invoice_type}
 onChange={(e) => setNewInvoice({ ...newInvoice, invoice_type: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="project">Project Invoice</option>
 <option value="hourly">Hourly Invoice</option>
 <option value="fixed_price">Fixed Price</option>
 <option value="time_and_materials">Time & Materials</option>
 <option value="recurring">Recurring Invoice</option>
 <option value="expense">Expense Invoice</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700">Invoice Date *</label>
 <input
 type="date"
 value={newInvoice.invoice_date}
 onChange={(e) => setNewInvoice({ ...newInvoice, invoice_date: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 required
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700">Due Date</label>
 <input
 type="date"
 value={newInvoice.due_date}
 onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
 <select
 value={newInvoice.payment_terms}
 onChange={(e) => setNewInvoice({ ...newInvoice, payment_terms: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="net_15">Net 15</option>
 <option value="net_30">Net 30</option>
 <option value="net_60">Net 60</option>
 <option value="due_on_receipt">Due on Receipt</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700">Currency</label>
 <select
 value={newInvoice.currency}
 onChange={(e) => setNewInvoice({ ...newInvoice, currency: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="usd">USD ($)</option>
 <option value="eur">EUR (€)</option>
 <option value="gbp">GBP (£)</option>
 </select>
 </div>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700">Description</label>
 <textarea
 value={newInvoice.description}
 onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 rows={2}
 placeholder="Invoice description"
 />
 </div>
 </div>

 {/* Invoice Items */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h4 className="text-lg font-medium text-gray-900">Invoice Items</h4>
 <button
 type="button"
 onClick={addInvoiceItem}
 className="btn btn-secondary"
 >
 <PlusIcon className="h-4 w-4 mr-1" />
 Add Item
 </button>
 </div>
 
 <div className="space-y-3">
 {newInvoice.items.map((item, index) => (
 <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 border border-gray-200 rounded-md">
 <div className="md:col-span-2">
 <label className="block text-xs font-medium text-gray-700">Description</label>
 <input
 type="text"
 value={item.description}
 onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
 className="mt-1 block w-full border border-gray-300 rounded-md px-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
 placeholder="Item description"
 />
 </div>
 
 <div>
 <label className="block text-xs font-medium text-gray-700">Quantity</label>
 <input
 type="number"
 min="1"
 value={item.quantity}
 onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 1)}
 className="mt-1 block w-full border border-gray-300 rounded-md px-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 
 <div>
 <label className="block text-xs font-medium text-gray-700">Unit Price ($)</label>
 <input
 type="number"
 step="0.01"
 min="0"
 value={item.unit_price}
 onChange={(e) => updateInvoiceItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
 className="mt-1 block w-full border border-gray-300 rounded-md px-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 
 <div>
 <label className="block text-xs font-medium text-gray-700">Tax (%)</label>
 <input
 type="number"
 step="0.01"
 min="0"
 max="100"
 value={item.tax_rate}
 onChange={(e) => updateInvoiceItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
 className="mt-1 block w-full border border-gray-300 rounded-md px-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 
 <div>
 <label className="block text-xs font-medium text-gray-700">Discount (%)</label>
 <input
 type="number"
 step="0.01"
 min="0"
 max="100"
 value={item.discount_rate}
 onChange={(e) => updateInvoiceItem(index, 'discount_rate', parseFloat(e.target.value) || 0)}
 className="mt-1 block w-full border border-gray-300 rounded-md px-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
 />
 </div>
 
 <div className="flex items-end">
 {newInvoice.items.length > 1 && (
 <button
 type="button"
 onClick={() => removeInvoiceItem(index)}
 className="btn btn-danger"
 >
 <TrashIcon className="h-4 w-4 mx-auto" />
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 
 {/* Total Display */}
 <div className="flex justify-end">
 <div className="text-right">
 <div className="text-lg font-semibold text-gray-900">
 Total: ${calculateInvoiceTotal().toFixed(2)}
 </div>
 </div>
 </div>
 </div>

 {/* Additional Information */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700">Notes</label>
 <textarea
 value={newInvoice.notes}
 onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 rows={3}
 placeholder="Internal notes"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700">Terms and Conditions</label>
 <textarea
 value={newInvoice.terms_and_conditions}
 onChange={(e) => setNewInvoice({ ...newInvoice, terms_and_conditions: e.target.value })}
 className="mt-1 block w-full border border-gray-300 rounded-md py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 rows={3}
 placeholder="Terms and conditions"
 />
 </div>
 </div>
 
 <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
 <button
 type="button"
 onClick={() => setShowInvoiceForm(false)}
 className="btn btn-secondary"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="btn btn-primary"
 >
 Create Invoice
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Team Member Addition Form Modal (disabled) */}
 {false && (
 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
 <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-medium text-gray-900">Add Team Member</h3>
 <button
 onClick={() => setShowTeamMemberForm(false)}
 className="text-gray-400 hover:text-gray-600"
 >
 ×
 </button>
 </div>
 
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700">Select User</label>
 <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
 {availableUsers.filter(user => !teamMembers.find(tm => tm.id === user.id)).map((user) => (
 <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
 <div>
 <p className="font-medium">{user.full_name || `${user.first_name} ${user.last_name}`}</p>
 <p className="text-sm text-gray-500">{user.email}</p>
 </div>
 <div className="flex space-x-2">
 <button
 onClick={() => handleAddTeamMemberToProject(user.id, 'member')}
 className="text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
 >
 Add as Member
 </button>
 <button
 onClick={() => handleAddTeamMemberToProject(user.id, 'manager')}
 className="text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
 >
 Add as Manager
 </button>
 </div>
 </div>
 ))}
 </div>
 {availableUsers.filter(user => !teamMembers.find(tm => tm.id === user.id)).length === 0 && (
 <p className="text-gray-500 text-sm">All users are already team members.</p>
 )}
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

export default ProjectDetailOverviewPage;
