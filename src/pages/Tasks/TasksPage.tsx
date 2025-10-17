import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { Task, TaskStatus, TaskPriority, TaskType, Project } from '../../types';
import { addNotification } from '../../store/slices/notificationSlice';
import { useHasPermission } from '../../utils/permissions';
import FlexibleTaskViews from '../../components/Views/FlexibleTaskViews';
import KanbanBoard from '../../components/Views/KanbanBoard';
import CalendarView from '../../components/Views/CalendarView';
import GanttChart from '../../components/Views/GanttChart';
import { fetchTasks, createTask, updateTask, deleteTask } from '../../store/slices/taskSlice';
import { fetchProjects } from '../../store/slices/projectSlice';
import { PlusIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, EyeIcon, Squares2X2Icon, CalendarIcon, ChartBarIcon, ListBulletIcon, CogIcon, ViewfinderCircleIcon, PencilIcon, TrashIcon, CheckIcon, MagnifyingGlassIcon, FunnelIcon, ArrowPathIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import DateRangeCalendar from '../../components/UI/DateRangeCalendar';
import './FilterButtons.css';
import ListenMeetingButton from '../../components/Audio/ListenMeetingButton';
import VisibleToCustomerRadio from '../../components/Tasks/VisibleToCustomerRadio';

// Portal component for rendering filter popups outside table overflow context
const FilterPortal: React.FC<{ children: React.ReactNode; buttonRect: DOMRect | null; align?: 'left' | 'right' }> = ({ children, buttonRect, align = 'left' }) => {
 if (!buttonRect) return null;
 
 // Calculate position based on alignment
 const getPosition = () => {
 if (align === 'right') {
 // Get the child element width to calculate right alignment
 // We'll use transform to shift it right-aligned
 return {
 position: 'fixed' as const,
 right: `${window.innerWidth - buttonRect.right}px`,
 top: `${buttonRect.bottom + 4}px`,
 zIndex: 99999,
 };
 }
 return {
 position: 'fixed' as const,
 left: `${buttonRect.left}px`,
 top: `${buttonRect.bottom + 4}px`,
 zIndex: 99999,
 };
 };
 
 return ReactDOM.createPortal(
 <div
 style={getPosition()}
 onClick={(e) => e.stopPropagation()}
 >
 {children}
 </div>,
 document.body
 );
};

// Portal for inline edit popovers (assignees, assigner)
const InlineEditPortal: React.FC<{ children: React.ReactNode; rect: DOMRect | null }> = ({ children, rect }) => {
 if (!rect) return null;
 return ReactDOM.createPortal(
 <div
 style={{
 position: 'fixed',
 left: `${rect.left}px`,
 top: `${rect.bottom + 4}px`,
 zIndex: 99999,
 }}
 onClick={(e) => e.stopPropagation()}
 >
 {children}
 </div>,
 document.body
 );
};

const TasksPage: React.FC = () => {
 const dispatch = useAppDispatch();
 const navigate = useNavigate();
 const { tasks, isLoading, error } = useAppSelector((state: any) => state.tasks);
 const { projects } = useAppSelector((state: any) => state.projects);
 const { user: currentUser } = useAppSelector((state: any) => state.auth);
 const [showCreateForm, setShowCreateForm] = useState(false);
 const selectedProject = '';
 const [currentView, setCurrentView] = useState<'list' | 'kanban' | 'calendar' | 'gantt'>('list');
 const [useFlexibleViews, setUseFlexibleViews] = useState(false);
 const [users, setUsers] = useState<any[]>([]);
 const hasPermission = useHasPermission();
 const canCreateTasks = hasPermission('Tasks', 'create');
 const [tasksWithAssignees, setTasksWithAssignees] = useState<any[]>([]);
 const [availability, setAvailability] = useState<Record<string, { available: boolean; conflicts: any[] }>>({});
 const [checkingAvailability, setCheckingAvailability] = useState(false);
 const [assigneesOpen, setAssigneesOpen] = useState(false);
 const [assignerOpen, setAssignerOpen] = useState(false);
 const assigneesRef = useRef<HTMLDivElement | null>(null);
 const assignerRef = useRef<HTMLDivElement | null>(null);
 const [assigneesQuery, setAssigneesQuery] = useState('');
 const [assignerQuery, setAssignerQuery] = useState('');

 // List toolbar and header filter state (align with Projects styling)
 const [taskSearch, setTaskSearch] = useState('');
 const [filterStatusHead, setFilterStatusHead] = useState<TaskStatus[]>([]);
 const [filterPriorityHead, setFilterPriorityHead] = useState<TaskPriority[]>([]);
 const [filterAssigneeIds, setFilterAssigneeIds] = useState<string[]>([]);
 const [filterAssignerIds, setFilterAssignerIds] = useState<string[]>([]);
 const [filterProjectIds, setFilterProjectIds] = useState<string[]>([]);
 const [filterDueDateFrom, setFilterDueDateFrom] = useState('');
 const [filterDueDateTo, setFilterDueDateTo] = useState('');
 const [pendingDueFrom, setPendingDueFrom] = useState('');
 const [pendingDueTo, setPendingDueTo] = useState('');
 const [headerFilterOpen, setHeaderFilterOpen] = useState<null | 'status' | 'priority' | 'due_date' | 'assignees' | 'assigner' | 'project'>(null);
 const [filterButtonRect, setFilterButtonRect] = useState<DOMRect | null>(null);
 const headerFilterRef = useRef<HTMLDivElement | null>(null);

 // Toolbar date filter state
 const [filterFromDate, setFilterFromDate] = useState('');
 const [filterToDate, setFilterToDate] = useState('');
 const [toolbarDateOpen, setToolbarDateOpen] = useState(false);
 const [pendingToolbarFrom, setPendingToolbarFrom] = useState('');
 const [pendingToolbarTo, setPendingToolbarTo] = useState('');
 const [toolbarDateButtonRect, setToolbarDateButtonRect] = useState<DOMRect | null>(null);
 const toolbarDateRef = useRef<HTMLDivElement | null>(null);

 // Inline edit state for list (match Projects inline UX)
 const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
 const [editingField, setEditingField] = useState<'status' | 'priority' | 'due_date' | null>(null);
 const [editValue, setEditValue] = useState<any>(null);
 const inlinePopoverRef = useRef<HTMLDivElement | null>(null);
 
 // Inline edit for assignees and assigner
 const [assigneesEditorOpen, setAssigneesEditorOpen] = useState<string | null>(null);
 const [assignerEditorOpen, setAssignerEditorOpen] = useState<string | null>(null);
 const [assigneesEditorRect, setAssigneesEditorRect] = useState<DOMRect | null>(null);
 const [assignerEditorRect, setAssignerEditorRect] = useState<DOMRect | null>(null);
 const [assigneesSelection, setAssigneesSelection] = useState<string[]>([]);
 const [assignerSelection, setAssignerSelection] = useState<string | null>(null);
 const [assigneesInlineFilter, setAssigneesInlineFilter] = useState('');
 const [assignerInlineFilter, setAssignerInlineFilter] = useState('');
 const assigneesEditorRef = useRef<HTMLDivElement | null>(null);
 const assignerEditorRef = useRef<HTMLDivElement | null>(null);
 // Sprint UI state
 const [showSprintPanel, setShowSprintPanel] = useState(false);
 const selectedSprint = '';
 const [newTask, setNewTask] = useState({
 title: '',
 description: '',
 project_id: '',
 status: TaskStatus.TODO,
 priority: TaskPriority.MEDIUM,
 task_type: TaskType.TASK,
 // Sprint (optional)
 sprint_name: '',
 sprint_start_date: '',
 sprint_end_date: '',
 sprint_goal: '',
 estimated_hours: 0,
 story_points: 0,
 assignee_ids: [] as string[],
 created_by_id: '',
 visible_to_customer: false,
 });

 // Recurrence state for"Repeat every"
 const [repeatEnabled, setRepeatEnabled] = useState(false);
 const [repeatPreset, setRepeatPreset] = useState<'none' | 'weekday' | '1w' | '2w' | '1m' | '3m' | 'quarterly' | 'yearly' | 'custom'>('none');
 const [customRepeat, setCustomRepeat] = useState<{ frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'; interval: number }>({
 frequency: 'weekly',
 interval: 1,
 });
 // Pending attachments during creation
 const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
 const [isDraggingFiles, setIsDraggingFiles] = useState(false);

 // Calculate task statistics
 const taskStats = React.useMemo(() => {
 if (!tasks || tasks.length === 0) {
 return {
 total: 0,
 notStarted: 0,
 inProgress: 0,
 completed: 0,
 critical: 0,
 };
 }

 return {
 total: tasks.length,
 notStarted: tasks.filter((task: Task) => task.status === TaskStatus.TODO).length,
 inProgress: tasks.filter((task: Task) => task.status === TaskStatus.IN_PROGRESS).length,
 completed: tasks.filter((task: Task) => task.status === TaskStatus.COMPLETED).length,
 critical: tasks.filter((task: Task) => task.priority === TaskPriority.CRITICAL).length,
 };
 }, [tasks]);

 useEffect(() => {
 const onDocClick = (e: MouseEvent) => {
 if (assigneesRef.current && !assigneesRef.current.contains(e.target as Node)) setAssigneesOpen(false);
 if (assignerRef.current && !assignerRef.current.contains(e.target as Node)) setAssignerOpen(false);
 if (headerFilterOpen && headerFilterRef.current && !headerFilterRef.current.contains(e.target as Node)) setHeaderFilterOpen(null);
 if (toolbarDateOpen && toolbarDateRef.current && !toolbarDateRef.current.contains(e.target as Node)) setToolbarDateOpen(false);
 if (editingTaskId && inlinePopoverRef.current && !inlinePopoverRef.current.contains(e.target as Node)) {
 setEditingTaskId(null);
 setEditingField(null);
 setEditValue(null);
 }
 if (assigneesEditorOpen && assigneesEditorRef.current && !assigneesEditorRef.current.contains(e.target as Node)) {
 setAssigneesEditorOpen(null);
 setAssigneesSelection([]);
 }
 if (assignerEditorOpen && assignerEditorRef.current && !assignerEditorRef.current.contains(e.target as Node)) {
 setAssignerEditorOpen(null);
 setAssignerSelection(null);
 }
 };
 document.addEventListener('mousedown', onDocClick);
 return () => document.removeEventListener('mousedown', onDocClick);
 }, [assigneesEditorOpen, assignerEditorOpen, editingTaskId, headerFilterOpen, toolbarDateOpen]);

  useEffect(() => {
    const toArray = (payload: any) => (
      Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload?.tasks)
                ? payload.tasks
                : []
    );

    const loadData = async () => {
      console.log('=== DEBUGGING: loadData called');
      dispatch(fetchProjects());
      
      // Load users first
      const userData = await fetchUsers();
      console.log('=== DEBUGGING: Users loaded:', userData.length);
      
      // Then load tasks
      const taskAction = await dispatch(fetchTasks(undefined));
      console.log('=== DEBUGGING: Tasks action:', taskAction.type, taskAction.payload?.length);
      
      // If tasks were successfully fetched, get their assignees
      if (taskAction.type === 'tasks/fetchTasks/fulfilled') {
        console.log('=== DEBUGGING: About to fetch assignees for tasks');
        const list = toArray(taskAction.payload);
        await fetchTaskAssignees(list);
      }
    };
    
    loadData();
  }, [dispatch]);

 // Default assigner to current user when available
 useEffect(() => {
 if (currentUser && !newTask.created_by_id) {
 setNewTask((prev) => ({ ...prev, created_by_id: currentUser.id }));
 }
 }, [currentUser]);

 // Availability check when assignees or sprint dates change
 useEffect(() => {
 const run = async () => {
 try {
 if (!newTask.assignee_ids || newTask.assignee_ids.length === 0) {
 setAvailability({});
 return;
 }
 const startStr = newTask.sprint_start_date || newTask.sprint_end_date;
 const endStr = newTask.sprint_end_date || newTask.sprint_start_date;
 if (!startStr || !endStr) {
 setAvailability({});
 return;
 }
 setCheckingAvailability(true);
 const { default: apiClient } = await import('../../api/client');
 const startIso = `${startStr}T00:00:00Z`;
 const endIso = `${endStr}T23:59:59Z`;
 const resp = await apiClient.post('/calendar/availability/', {
 user_ids: newTask.assignee_ids,
 start: startIso,
 end: endIso,
 });
 const data = resp.data || [];
 const map: Record<string, { available: boolean; conflicts: any[] }> = {};
 data.forEach((u: any) => {
 map[u.user_id] = { available: u.available !== false, conflicts: u.conflicts || [] };
 });
 setAvailability(map);
 } catch (e) {
 setAvailability({});
 } finally {
 setCheckingAvailability(false);
 }
 };
 const t = setTimeout(run, 300);
 return () => clearTimeout(t);
 }, [newTask.assignee_ids, newTask.sprint_start_date, newTask.sprint_end_date]);

 // Update tasksWithAssignees when tasks change
 useEffect(() => {
 console.log('=== DEBUGGING: tasks changed:', tasks?.length || 0, tasks);
 if (tasks && tasks.length > 0) {
 console.log('=== DEBUGGING: Sample task data:', tasks[0]);
 fetchTaskAssignees(tasks);
 } else {
 console.log('=== DEBUGGING: No tasks, setting empty array');
 setTasksWithAssignees([]);
 }
 }, [tasks]);

 const fetchUsers = async () => {
 console.log('=== DEBUGGING: fetchUsers called');
 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.get('/users/');
 const userData = response.data.users || response.data || [];
 console.log('=== DEBUGGING: Users response:', userData.length, userData);
 setUsers(userData);
 return userData;
 } catch (error) {
 console.error('=== DEBUGGING: Failed to fetch users:', error);
 setUsers([]);
 return [];
 }
 };

  const fetchTaskAssignees = async (taskList: any) => {
    const toArray = (payload: any) => (
      Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload?.tasks)
                ? payload.tasks
                : []
    );
    const list: Task[] = toArray(taskList);
    console.log('=== DEBUGGING: fetchTaskAssignees called with tasks:', list.length);
    try {
      const { default: apiClient } = await import('../../api/client');
      console.log('=== DEBUGGING: API client imported successfully');
      
      const enhancedTasks = await Promise.all(
        list.map(async (task, index) => {
          try {
 console.log(`=== DEBUGGING: Fetching assignees for task ${index + 1}/${taskList.length}: ${task.title} (ID: ${task.id})`);
 
 // Fetch assignees for this task
 const assigneesResponse = await apiClient.get(`/task-assignees/tasks/${task.id}/assignees/`);
 const assignees = assigneesResponse.data || [];
 
 console.log(`=== DEBUGGING: Task ${task.title} assignees response:`, assignees);
 
 // Add assignees data to task
 const enhancedTask = {
 ...task,
 assignees: assignees,
 assignee_ids: assignees.map((assignee: any) => assignee.user_id)
 };
 
 console.log(`=== DEBUGGING: Enhanced task ${task.title}:`, {
 id: enhancedTask.id,
 title: enhancedTask.title,
 assignee_id: enhancedTask.assignee_id,
 assignee_ids: (enhancedTask as any).assignee_ids,
 assignees: (enhancedTask as any).assignees,
 created_by_id: enhancedTask.created_by_id
 });
 
 return enhancedTask;
 } catch (error) {
 // If assignees fetch fails, just return the task as-is
 console.warn(`=== DEBUGGING: Failed to fetch assignees for task ${task.id}:`, error);
 return task;
 }
 })
 );
 
 console.log('=== DEBUGGING: All enhanced tasks:', enhancedTasks.map(t => ({
 id: t.id,
 title: t.title,
 assignees: (t as any).assignees?.length || 0,
 assignee_ids: (t as any).assignee_ids?.length || 0
 })));
 
      // Store enhanced tasks in local state
      setTasksWithAssignees(enhancedTasks);
    } catch (error) {
      console.error('=== DEBUGGING: Failed to fetch task assignees:', error);
      // Fallback to original tasks if assignees fetch fails
      setTasksWithAssignees(list);
    }
  };

 const handleCreateTask = async (e: React.FormEvent) => {
 e.preventDefault();
 console.log('=== DEBUGGING: Form submitted, checking conditions...');
 console.log('=== DEBUGGING: newTask.title.trim():', newTask.title.trim());
 console.log('=== DEBUGGING: newTask.project_id:', newTask.project_id);
 
 // Validate required fields
 const errors = [] as string[];
 if (!newTask.title.trim()) errors.push('Task title is required');
 if (!newTask.project_id) errors.push('Project selection is required');
 // created_by_id is set automatically to the logged-in user
 
 // If availability shows conflicts, warn and stop
 const conflicted = newTask.assignee_ids.some(uid => availability[uid] && availability[uid].available === false);
 if (conflicted) {
 dispatch(addNotification({
 title: 'Assignee unavailable',
 type: 'warning',
 message: 'One or more assignees are booked on the selected dates. Please adjust assignees or dates.',
 }));
 return;
 }

 if (errors.length === 0) {
 console.log('=== DEBUGGING: Creating task with data:', newTask);
 console.log('=== DEBUGGING: newTask.assignee_ids:', newTask.assignee_ids);
 console.log('=== DEBUGGING: newTask.assignee_ids.length:', newTask.assignee_ids?.length || 0);
 
 try {
 // If recurrence is enabled, create a template and generate the first task
 if (repeatPreset !== 'none') {
 const { default: apiClient } = await import('../../api/client');

 // Map preset to frequency/interval
 let frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'weekly';
 let interval_value = 1;
 if (repeatPreset === '1w') { frequency = 'weekly'; interval_value = 1; }
 else if (repeatPreset === '2w') { frequency = 'weekly'; interval_value = 2; }
 else if (repeatPreset === '1m') { frequency = 'monthly'; interval_value = 1; }
 else if (repeatPreset === '3m') { frequency = 'monthly'; interval_value = 3; }
 else if (repeatPreset === 'quarterly') { frequency = 'quarterly'; interval_value = 1; }
 else if (repeatPreset === 'yearly') { frequency = 'yearly'; interval_value = 1; }
 else if (repeatPreset === 'custom') {
 frequency = customRepeat.frequency;
 interval_value = Math.max(1, Number(customRepeat.interval) || 1);
 }

 // Handle weekday preset via days_of_week Mon-Fri => [1,2,3,4,5]
 let days_of_week: number[] | undefined = undefined;
 if (repeatPreset === 'weekday') {
 frequency = 'weekly';
 interval_value = 1;
 days_of_week = [1,2,3,4,5];
 }

 // Create recurring task template
 const templatePayload: any = {
 title: newTask.title,
 description: newTask.description || undefined,
 project_id: newTask.project_id,
 priority: newTask.priority,
 task_type: newTask.task_type,
 estimated_hours: newTask.estimated_hours || undefined,
 story_points: newTask.story_points || undefined,
 default_assignee_id: newTask.assignee_ids[0] || undefined,
 frequency,
 interval_value,
 start_date: new Date().toISOString(),
 labels: [],
 tags: [],
 custom_fields: {},
 };

 console.log('=== DEBUGGING: Creating recurring template:', templatePayload);
 // Include days_of_week when applicable
 if (days_of_week) {
 templatePayload.days_of_week = days_of_week;
 }
const templateRes = await apiClient.post('/recurring-tasks/', templatePayload);
 const template = templateRes.data;

 // Generate first task instance
const genRes = await apiClient.post(`/recurring-tasks/${template.id}/generate/`);
 const createdTaskId = genRes.data?.task_id;
 console.log('=== DEBUGGING: Generated recurring task:', createdTaskId);

 // Add all assignees via task-assignees API (including the first as primary)
 if (newTask.assignee_ids.length > 0 && createdTaskId) {
 try {
 // Add first as primary
await apiClient.post(`/task-assignees/tasks/${createdTaskId}/assignees/`, {
 user_id: newTask.assignee_ids[0],
 is_primary: true,
 });
 } catch (err) {
 console.warn('Failed to add primary assignee to recurring task', err);
 }
 // Add remaining as non-primary
 for (let i = 1; i < newTask.assignee_ids.length; i++) {
 try {
await apiClient.post(`/task-assignees/tasks/${createdTaskId}/assignees/`, {
 user_id: newTask.assignee_ids[i],
 is_primary: false,
 });
 } catch (err) {
 console.warn(`Failed to add assignee ${newTask.assignee_ids[i]} to recurring task`, err);
 }
 }
 }

 // Upload pending attachments
 if (pendingAttachments.length > 0 && createdTaskId) {
 for (const file of pendingAttachments) {
 try {
 const fd = new FormData();
 fd.append('file', file);
await apiClient.post(`/tasks/${createdTaskId}/attachments/`, fd, {
 headers: { 'Content-Type': 'multipart/form-data' },
 });
 } catch (err) {
 console.warn('Failed to upload attachment for recurring task', err);
 }
 }
 }

 dispatch(addNotification({
 title: 'Success',
 type: 'success',
 message: 'Recurring task created successfully',
 }));

 // Reset form and close
 setNewTask({
 title: '',
 description: '',
 project_id: '',
 status: TaskStatus.TODO,
 priority: TaskPriority.MEDIUM,
 task_type: TaskType.TASK,
 sprint_name: '',
 sprint_start_date: '',
 sprint_end_date: '',
 sprint_goal: '',
 estimated_hours: 0,
 story_points: 0,
 assignee_ids: [],
 created_by_id: '',
 visible_to_customer: false,
 });
 setRepeatEnabled(false);
 setRepeatPreset('none');

 // Navigate to created task and refresh list
 if (createdTaskId) {
 navigate(`/tasks/${createdTaskId}`);
 }
 const taskAction = await dispatch(fetchTasks(selectedProject || undefined));
  if (taskAction.type === 'tasks/fetchTasks/fulfilled') {
      const toArray = (payload: any) => (
        Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload?.items)
              ? payload.items
              : Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload?.tasks)
                  ? payload.tasks
                  : []
      );
      await fetchTaskAssignees(toArray(taskAction.payload));
    }
 return; // Prevent non-recurring flow
 }

 // Create the task with single assignee_id (first assignee if multiple)
 // Remove created_by_id as it's set automatically by the API
 const { created_by_id, assignee_ids, ...taskFields } = newTask;
 // Normalize sprint date fields to ISO 8601 datetimes expected by backend
 // Only include dates if they have values, and ensure proper formatting
 const taskData: any = {
 ...taskFields,
 assignee_id: assignee_ids.length > 0 ? assignee_ids[0] : undefined,
 };
 
 // Convert date strings (YYYY-MM-DD) to full ISO 8601 datetime strings
 if (taskFields.sprint_start_date) {
 taskData.sprint_start_date = `${taskFields.sprint_start_date}T00:00:00.000Z`;
 } else {
 delete taskData.sprint_start_date;
 }
 
 if (taskFields.sprint_end_date) {
 taskData.sprint_end_date = `${taskFields.sprint_end_date}T23:59:59.999Z`;
 } else {
 delete taskData.sprint_end_date;
 }
 
 console.log('=== DEBUGGING: Task data for main API:', taskData);
 console.log('=== DEBUGGING: Assignee IDs to process:', assignee_ids);
 
 const createdTask = await dispatch(createTask(taskData)).unwrap();
 console.log('=== DEBUGGING: Task created:', createdTask.id, createdTask.title);
 
 // Add ALL assignees using the task assignees API (including the first one)
 if (newTask.assignee_ids.length > 0) {
 const { default: apiClient } = await import('../../api/client');
 
 console.log('=== DEBUGGING: Adding assignees via task-assignees API');
 
 // Add first assignee as primary
 try {
await apiClient.post(`/task-assignees/tasks/${createdTask.id}/assignees/`, {
 user_id: newTask.assignee_ids[0],
 is_primary: true
 });
 console.log('=== DEBUGGING: Added primary assignee:', newTask.assignee_ids[0]);
 } catch (error) {
 console.error(`=== DEBUGGING: Failed to add primary assignee ${newTask.assignee_ids[0]}:`, error);
 }
 
 // Add additional assignees as non-primary
 for (let i = 1; i < newTask.assignee_ids.length; i++) {
 try {
await apiClient.post(`/task-assignees/tasks/${createdTask.id}/assignees/`, {
 user_id: newTask.assignee_ids[i],
 is_primary: false
 });
 console.log('=== DEBUGGING: Added additional assignee:', newTask.assignee_ids[i]);
 } catch (error) {
 console.error(`=== DEBUGGING: Failed to add assignee ${newTask.assignee_ids[i]}:`, error);
 }
 }
 }

 // Upload pending attachments
 if (pendingAttachments.length > 0) {
 const { default: apiClient } = await import('../../api/client');
 for (const file of pendingAttachments) {
 try {
 const fd = new FormData();
 fd.append('file', file);
await apiClient.post(`/tasks/${createdTask.id}/attachments/`, fd, {
 headers: { 'Content-Type': 'multipart/form-data' },
 });
 } catch (err) {
 console.warn('Failed to upload attachment for task', err);
 }
 }
 }
 
 dispatch(addNotification({
 title: 'Success',
 type: 'success',
 message: 'Task created successfully'
 }));
 
 setNewTask({
 title: '',
 description: '',
 project_id: '',
 status: TaskStatus.TODO,
 priority: TaskPriority.MEDIUM,
 task_type: TaskType.TASK,
 sprint_name: '',
 sprint_start_date: '',
 sprint_end_date: '',
 sprint_goal: '',
 estimated_hours: 0,
 story_points: 0,
 assignee_ids: [],
 created_by_id: '',
 visible_to_customer: false,
 });
 setPendingAttachments([]);
 setShowCreateForm(false);
 
 // Refresh tasks with assignees
 const taskAction = await dispatch(fetchTasks(selectedProject || undefined));
  if (taskAction.type === 'tasks/fetchTasks/fulfilled') {
      const toArray = (payload: any) => (
        Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload?.items)
              ? payload.items
              : Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload?.tasks)
                  ? payload.tasks
                  : []
      );
      await fetchTaskAssignees(toArray(taskAction.payload));
    }
 } catch (error: any) {
 console.error('=== DEBUGGING: Failed to create task:', error);
 const msg = typeof error === 'string' ? error : (error?.response?.data?.detail || 'Failed to create task');
 dispatch(addNotification({
 title: 'Error',
 type: 'error',
 message: msg
 }));
 }
 } else {
 console.log('=== DEBUGGING: Form validation failed!');
 console.log('=== DEBUGGING: Validation errors:', errors);
 console.log('=== DEBUGGING: newTask state:', newTask);
 
 addNotification({
 title: 'Validation Error',
 type: 'error',
 message: `Please fix the following: ${errors.join(', ')}`
 });
 }
 };

 const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
 try {
 await dispatch(updateTask({ id: taskId, data: { status: newStatus } })).unwrap();
 } catch (error) {
 console.error('Failed to update task status:', error);
 }
 };

 const handleDeleteTask = async (taskId: string) => {
 if (window.confirm('Are you sure you want to delete this task?')) {
 try {
 await dispatch(deleteTask(taskId)).unwrap();
 } catch (error) {
 console.error('Failed to delete task:', error);
 }
 }
 };

 const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
 try {
 await dispatch(updateTask({ id: taskId, data: updates })).unwrap();
 } catch (error) {
 console.error('Failed to update task:', error);
 }
 };

 const handleTaskClick = (taskId: string) => {
 navigate(`/tasks/${taskId}`);
 };

 const getStatusIcon = (status: TaskStatus) => {
 switch (status) {
 case TaskStatus.COMPLETED:
 return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
 case TaskStatus.IN_PROGRESS:
 return <ClockIcon className="h-5 w-5 text-yellow-600" />;
 case TaskStatus.BLOCKED:
 return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
 default:
 return <ClockIcon className="h-5 w-5 text-gray-400" />;
 }
 };

 const getStatusColor = (status: TaskStatus) => {
 switch (status) {
 case TaskStatus.COMPLETED:
 return 'bg-green-50 text-green-700 border border-green-200';
 case TaskStatus.IN_PROGRESS:
 return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
 case TaskStatus.BLOCKED:
 return 'bg-red-50 text-red-700 border border-red-200';
 case TaskStatus.IN_REVIEW:
 return 'bg-blue-50 text-blue-700 border border-blue-200';
 default:
 return 'bg-gray-50 text-gray-700 border border-gray-200';
 }
 };

 const getPriorityColor = (priority: TaskPriority) => {
 switch (priority) {
 case TaskPriority.CRITICAL:
 return 'bg-red-50 text-red-700 border border-red-200';
 case TaskPriority.HIGH:
 return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
 case TaskPriority.MEDIUM:
 return 'bg-blue-50 text-blue-700 border border-blue-200';
 case TaskPriority.LOW:
 return 'bg-gray-50 text-gray-700 border border-gray-200';
 default:
 return 'bg-gray-50 text-gray-700 border border-gray-200';
 }
 };

 const [inlineEditRect, setInlineEditRect] = useState<DOMRect | null>(null);

 const startInlineEditTask = (e: React.MouseEvent, task: Task, field: 'status' | 'priority' | 'due_date') => {
 e.stopPropagation();
 const target = e.currentTarget as HTMLElement;
 if (target && typeof target.getBoundingClientRect === 'function') {
 setInlineEditRect(target.getBoundingClientRect());
 } else {
 setInlineEditRect(null);
 }
 setEditingTaskId(task.id);
 setEditingField(field);
 if (field === 'status') setEditValue(task.status);
 if (field === 'priority') setEditValue(task.priority);
 if (field === 'due_date') {
 const d = task.due_date ? new Date(task.due_date) : null;
 const yyyyMmDd = d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '';
 setEditValue(yyyyMmDd);
 }
 };

 const saveInlineEditTask = async (taskId: string, valueOverride?: any) => {
 try {
 if (!editingField) return;
 const value = valueOverride !== undefined ? valueOverride : editValue;
 if (editingField === 'status') {
 await dispatch(updateTask({ id: taskId, data: { status: value } })).unwrap();
 } else if (editingField === 'priority') {
 await dispatch(updateTask({ id: taskId, data: { priority: value } })).unwrap();
 } else if (editingField === 'due_date') {
 const iso = value ? new Date(`${value}T00:00:00Z`).toISOString() : undefined;
 await dispatch(updateTask({ id: taskId, data: { due_date: iso } })).unwrap();
 }
 setEditingTaskId(null);
 setEditingField(null);
 setEditValue(null);
 } catch (err) {
 console.error('Inline save failed (task):', err);
 }
 };

 // Inline edit functions for assignees
 const openAssigneesInlineEditor = (e: React.MouseEvent, taskId: string) => {
 e.stopPropagation();
 const target = e.currentTarget as HTMLElement;
 if (target && typeof target.getBoundingClientRect === 'function') {
 setAssigneesEditorRect(target.getBoundingClientRect());
 } else {
 setAssigneesEditorRect(null);
 }
 setAssigneesEditorOpen(taskId);
 // Seed selection from current task assignees
 const task = tasksWithAssignees.find((t: any) => t.id === taskId);
 if (task) {
 const ids = task.assignee_ids || (task.assignee_id ? [task.assignee_id] : []);
 setAssigneesSelection(ids);
 }
 };

 const toggleAssigneesSelect = (userId: string) => {
 setAssigneesSelection(prev => (prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]));
 };

 const saveAssigneesInlineEdit = async (taskId: string) => {
 try {
 const { default: apiClient } = await import('../../api/client');
 
 // Remove all existing assignees first
 const task = tasksWithAssignees.find((t: any) => t.id === taskId);
 const existingIds = task?.assignee_ids || (task?.assignee_id ? [task.assignee_id] : []);
 for (const uid of existingIds) {
 try {
await apiClient.delete(`/task-assignees/tasks/${taskId}/assignees/${uid}/`);
 } catch (e) {
 console.warn('Failed to remove assignee:', e);
 }
 }
 
 // Add new assignees
 for (let i = 0; i < assigneesSelection.length; i++) {
 const userId = assigneesSelection[i];
await apiClient.post(`/task-assignees/tasks/${taskId}/assignees/`, {
 user_id: userId,
 is_primary: i === 0
 });
 }
 
 // Update local state
 setTasksWithAssignees((prev) => {
 return prev.map(t => {
 if (t.id === taskId) {
 return {
 ...t,
 assignee_ids: assigneesSelection,
 assignee_id: assigneesSelection[0] || null
 };
 }
 return t;
 });
 });
 
 setAssigneesEditorOpen(null);
 setAssigneesSelection([]);
 } catch (e) {
 console.error('Failed to save assignees:', e);
 }
 };

 const cancelAssigneesInlineEdit = (e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 setAssigneesEditorOpen(null);
 setAssigneesSelection([]);
 setAssigneesEditorRect(null);
 };

 // Inline edit functions for assigner
 const openAssignerInlineEditor = (e: React.MouseEvent, taskId: string) => {
 e.stopPropagation();
 const target = e.currentTarget as HTMLElement;
 if (target && typeof target.getBoundingClientRect === 'function') {
 setAssignerEditorRect(target.getBoundingClientRect());
 } else {
 setAssignerEditorRect(null);
 }
 setAssignerEditorOpen(taskId);
 // Seed selection from current task assigner
 const task = tasksWithAssignees.find((t: any) => t.id === taskId);
 if (task && task.created_by_id) {
 setAssignerSelection(task.created_by_id);
 }
 };

 const saveAssignerInlineEdit = async (taskId: string) => {
 try {
 if (!assignerSelection) return;
 await dispatch(updateTask({ id: taskId, data: { created_by_id: assignerSelection } })).unwrap();
 
 // Update local state
 setTasksWithAssignees((prev) => {
 return prev.map(t => {
 if (t.id === taskId) {
 return { ...t, created_by_id: assignerSelection };
 }
 return t;
 });
 });
 
 setAssignerEditorOpen(null);
 setAssignerSelection(null);
 } catch (e) {
 console.error('Failed to save assigner:', e);
 }
 };

 const cancelAssignerInlineEdit = (e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 setAssignerEditorOpen(null);
 setAssignerSelection(null);
 setAssignerEditorRect(null);
 };

 // Avoid blocking spinner; render the page and let data populate quietly

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex justify-between items-center">
 <div>
 <h1 className="page-title font-bold text-gray-900">Tasks</h1>
 <p className="text-secondary-600 mt-1">
 Manage and track your project tasks
 </p>
 </div>
 {!canCreateTasks && (
 <div className="text-sm text-gray-600 mr-4">You don’t have permission to create tasks.</div>
 )}
 <div className="flex space-x-3">
 {/* Listen Meeting just before sprint */}
 <ListenMeetingButton />
 {/* Sprint quick setup */}
 <button
 onClick={() => setShowSprintPanel(true)}
 className="flex items-center space-x-2.5 rounded-md text-sm font-medium transition-colors border bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
 title="Setup sprint details for new tasks"
 >
 <span>🏁 Sprint</span>
 </button>
 <button
 onClick={() => setUseFlexibleViews(!useFlexibleViews)}
 className={`flex items-center space-x-2.5 rounded-md text-sm font-medium transition-colors border ${
 useFlexibleViews
 ? 'bg-blue-50 border-blue-200 text-blue-700'
 : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
 }`}
 title={useFlexibleViews ? 'Switch to Classic Views' : 'Switch to Enhanced Views'}
 >
 {useFlexibleViews ? (
 <>
 <ViewfinderCircleIcon className="w-4 h-4" />
 <span>Enhanced Views</span>
 </>
 ) : (
 <>
 <CogIcon className="w-4 h-4" />
 <span>Classic Views</span>
 </>
 )}
 </button>
 {!useFlexibleViews && (
 <div className="flex items-center space-x-2">
 <button
 onClick={() => setCurrentView('list')}
 className={`flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border ${currentView === 'list' ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`}
 aria-pressed={currentView === 'list'}
 >
 <ListBulletIcon className="w-4 h-4" />
 <span>List</span>
 </button>
 <button
 onClick={() => setCurrentView('kanban')}
 className={`flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border ${currentView === 'kanban' ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`}
 aria-pressed={currentView === 'kanban'}
 >
 <Squares2X2Icon className="w-4 h-4" />
 <span>Kanban</span>
 </button>
 <button
 onClick={() => setCurrentView('calendar')}
 className={`flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border ${currentView === 'calendar' ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`}
 aria-pressed={currentView === 'calendar'}
 >
 <CalendarIcon className="w-4 h-4" />
 <span>Calendar</span>
 </button>
 <button
 onClick={() => setCurrentView('gantt')}
 className={`flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border ${currentView === 'gantt' ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`}
 aria-pressed={currentView === 'gantt'}
 >
 <ChartBarIcon className="w-4 h-4" />
 <span>Timeline</span>
 </button>
 </div>
 )}
 <button
 onClick={() => setShowCreateForm(true)}
 disabled={!canCreateTasks}
 title={canCreateTasks ? 'Create a new task' : 'You do not have permission to create tasks'}
 className={`btn-page-action flex items-center btn-styled btn-create-auto ${!canCreateTasks ? 'opacity-50 cursor-not-allowed' : ''}`}
 style={{ backgroundColor: 'rgb(0, 0, 0)', color: 'white', borderColor: 'rgb(0, 0, 0)', fontSize: '0.875rem', padding: '0.2rem 0.75rem' }}
 >
 <PlusIcon className="h-5 w-5" />
 <span>New Task</span>
 </button>
 </div>
 </div>

 {/* Sprint Panel */}
 {showSprintPanel && (
 <div className="bg-white shadow rounded-lg p-4 mb-4 border">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-medium text-gray-900">Sprint Settings (applies to new task form)</h3>
 <button onClick={() => setShowSprintPanel(false)} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
 <div>
 <label className="block text-xs font-medium text-gray-700">Sprint Name</label>
 <input
 type="text"
 value={newTask.sprint_name}
 onChange={(e) => setNewTask(prev => ({ ...prev, sprint_name: e.target.value }))}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 text-sm"
 placeholder="e.g. Sprint 12"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-700">Start Date</label>
 <input
 type="date"
 value={newTask.sprint_start_date || ''}
 onChange={(e) => setNewTask(prev => ({ ...prev, sprint_start_date: e.target.value }))}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 text-sm"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-700">End Date</label>
 <input
 type="date"
 value={newTask.sprint_end_date || ''}
 onChange={(e) => setNewTask(prev => ({ ...prev, sprint_end_date: e.target.value }))}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 text-sm"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-700">Sprint Goal</label>
 <input
 type="text"
 value={newTask.sprint_goal}
 onChange={(e) => setNewTask(prev => ({ ...prev, sprint_goal: e.target.value }))}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 text-sm"
 placeholder="Goal"
 />
 </div>
 </div>
 </div>
 )}

 {/* Create Task Form */}
 {showCreateForm && canCreateTasks && (
 <div className="bg-white shadow rounded-lg p-6">
 <h2 className="text-lg font-medium text-secondary-900 mb-4">Create New Task</h2>
 <form onSubmit={handleCreateTask} className="space-y-4">
 {/* Row 1: Title, Project, Assignees, Start Date */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div>
 <label htmlFor="title" className="block text-sm font-medium text-secondary-700">
 Task Title
 </label>
 <input
 type="text"
 id="title"
 value={newTask.title}
 onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
 placeholder="Enter task title"
 required
 />
 </div>
 <div>
 <label htmlFor="project_id" className="block text-sm font-medium text-secondary-700">
 Project
 </label>
 <select
 id="project_id"
 value={newTask.project_id}
 onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
 required
 >
 <option value="">Select a project</option>
 {projects?.map((project: Project) => (
 <option key={project.id} value={project.id}>
 {project.name}
 </option>
 ))}
 </select>
 </div>
 {/* Assignees */}
 <div ref={assigneesRef}>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Assign To (Assignees)
 </label>
 <div
 className="w-full border border-gray-300 rounded-md bg-white cursor-pointer"
 onClick={() => setAssigneesOpen(o => !o)}
 >
 <div className="py-2 flex flex-wrap gap-1 min-h-[40px]">
 {newTask.assignee_ids.length === 0 ? (
 <span className="text-sm text-gray-500">Select assignees</span>
 ) : (
 newTask.assignee_ids.slice(0, 4).map((userId) => {
 const user = users.find((u: any) => u.id === userId);
 return user ? (
 <span key={userId} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
 {user.first_name} {user.last_name}
 </span>
 ) : null;
 })
 )}
 {newTask.assignee_ids.length > 4 && (
 <span className="text-xs text-gray-500">+{newTask.assignee_ids.length - 4} more</span>
 )}
 </div>
 </div>
 {/* Availability warnings */}
 {newTask.assignee_ids.length > 0 && Object.keys(availability).length > 0 && (
 <div className="mt-2 text-xs">
 {newTask.assignee_ids.map((uid) => {
 const a = availability[uid];
 if (!a) return null;
 const user = users.find((u:any)=>u.id===uid);
 if (a.available) {
 return (
 <div key={uid} className="text-green-700">
 ✓ {user ? `${user.first_name} ${user.last_name}` : uid} is available
 </div>
 );
 }
 const conflicts = a.conflicts || [];
 const first = conflicts[0];
 return (
 <div key={uid} className="text-red-600">
 • {user ? `${user.first_name} ${user.last_name}` : uid} is booked ({conflicts.length} conflict{conflicts.length>1?'s':''}){first?`: ${first.title}`:''}
 </div>
 );
 })}
 </div>
 )}
 {assigneesOpen && (
 <div className="relative">
 <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto" style={{ zIndex: 99999 }}>
 <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
 <div className="relative">
 <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 value={assigneesQuery}
 onChange={(e) => setAssigneesQuery(e.target.value)}
 placeholder="Search users..."
 className="w-full pl-7 pr-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 <ul >
 {users.length === 0 && (
 <li className="py-2 text-sm text-gray-500">Loading users...</li>
 )}
 {users
 .filter((u: any) => {
 const q = assigneesQuery.toLowerCase();
 return `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
 })
 .map((user: any) => {
 const selected = newTask.assignee_ids.includes(user.id);
 return (
 <li
 key={user.id}
 className={`py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
 onClick={() => {
 setNewTask(prev => ({
 ...prev,
 assignee_ids: selected
 ? prev.assignee_ids.filter(id => id !== user.id)
 : [...prev.assignee_ids, user.id]
 }));
 }}
 >
 <div className="flex flex-col">
 <span className="text-gray-900">{user.first_name} {user.last_name}</span>
 <span className="text-xs text-gray-500">{user.email}</span>
 </div>
 {selected && <CheckIcon className="w-4 h-4 text-user-blue" />}
 </li>
 );
 })}
 {users.length === 0 && (
 <li className="py-2 text-sm text-gray-500">No users found</li>
 )}
 </ul>
 </div>
 </div>
 )}
 </div>
 <div>
 <label className="block text-sm font-medium text-secondary-700">Start Date</label>
 <input
 type="date"
 value={newTask.sprint_start_date || ''}
 onChange={(e) => setNewTask(prev => ({ ...prev, sprint_start_date: e.target.value }))}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
 />
 </div>
 </div>
 <div>
 <label htmlFor="description" className="block text-sm font-medium text-secondary-700">
 Description
 </label>
 <textarea
 id="description"
 rows={3}
 value={newTask.description}
 onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
 placeholder="Enter task description"
 />
 </div>
 
 {/* Row 3: End Date, Sprint, Goal, Assigned By */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div>
 <label className="block text-sm font-medium text-secondary-700">End Date</label>
 <input
 type="date"
 value={newTask.sprint_end_date || ''}
 onChange={(e) => setNewTask(prev => ({ ...prev, sprint_end_date: e.target.value }))}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-secondary-700">Sprint</label>
 <input
 type="text"
 value={newTask.sprint_name}
 onChange={(e) => setNewTask(prev => ({ ...prev, sprint_name: e.target.value }))}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
 placeholder="e.g. Sprint 12"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-secondary-700">Goal</label>
 <input
 type="text"
 value={newTask.sprint_goal}
 onChange={(e) => setNewTask(prev => ({ ...prev, sprint_goal: e.target.value }))}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
 placeholder="Sprint goal"
 />
 </div>
 {/* Assigner - Styled Dropdown (single-select) */}
 <div ref={assignerRef}>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Assigned By (Assigner)
 </label>
 <div
 className="w-full border border-gray-300 rounded-md bg-white cursor-pointer"
 onClick={() => setAssignerOpen(o => !o)}
 >
 <div className="py-2 min-h-[40px]">
 {(() => {
 const selectedUser = users.find((u: any) => u.id === newTask.created_by_id) || currentUser;
 return selectedUser ? (
 <span className="text-sm text-gray-900">{selectedUser.first_name} {selectedUser.last_name} <span className="text-gray-500">• {selectedUser.email}</span></span>
 ) : (
 <span className="text-sm text-gray-500">Select assigner</span>
 );
 })()}
 </div>
 </div>
 {assignerOpen && (
 <div className="relative">
 <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto" style={{ zIndex: 99999 }}>
 <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
 <div className="relative">
 <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 value={assignerQuery}
 onChange={(e) => setAssignerQuery(e.target.value)}
 placeholder="Search users..."
 className="w-full pl-7 pr-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 <ul >
 {users
 .filter((u: any) => {
 const q = assignerQuery.toLowerCase();
 return `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
 })
 .map((user: any) => (
 <li
 key={user.id}
 className={`py-2 text-sm hover:bg-gray-50 ${newTask.created_by_id === user.id ? 'bg-gray-50' : ''}`}
 onClick={() => setNewTask(prev => ({ ...prev, created_by_id: user.id }))}
 >
 <div className="flex flex-col">
 <span className="text-gray-900">{user.first_name} {user.last_name}</span>
 <span className="text-xs text-gray-500">{user.email}</span>
 </div>
 </li>
 ))}
 {users.length === 0 && (
 <li className="py-2 text-sm text-gray-500">No users found</li>
 )}
 </ul>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Row 4: Status, Repeat Every, Visible to Customer, Priority */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div>
 <label htmlFor="status" className="block text-sm font-medium text-secondary-700">
 Status
 </label>
 <select
 id="status"
 value={newTask.status}
 onChange={(e) => setNewTask({ ...newTask, status: e.target.value as TaskStatus })}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
 >
 <option value={TaskStatus.TODO}>To Do</option>
 <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
 <option value={TaskStatus.IN_REVIEW}>In Review</option>
 <option value={TaskStatus.BLOCKED}>Blocked</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-secondary-700 mb-1">Repeat Every</label>
 <select
 value={repeatPreset}
 onChange={(e) => setRepeatPreset(e.target.value as any)}
 className="block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
 >
 <option value="none">None</option>
 <option value="weekday">Every weekday (Mon-Fri)</option>
 <option value="1w">Every 1 week</option>
 <option value="2w">Every 2 weeks</option>
 <option value="1m">Every 1 month</option>
 <option value="3m">Every 3 months</option>
 <option value="quarterly">Every quarter</option>
 <option value="yearly">Every year</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-secondary-700 mb-1">Visible to Customer</label>
 <VisibleToCustomerRadio
 value={newTask.visible_to_customer}
 onChange={(val) => setNewTask((prev) => ({ ...prev, visible_to_customer: val }))}
 helperText="Customers will be able to view this task in their portal"
 />
 </div>
 <div>
 <label htmlFor="priority" className="block text-sm font-medium text-secondary-700">
 Priority
 </label>
 <select
 id="priority"
 value={newTask.priority}
 onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
 >
 <option value={TaskPriority.LOW}>Low</option>
 <option value={TaskPriority.MEDIUM}>Medium</option>
 <option value={TaskPriority.HIGH}>High</option>
 <option value={TaskPriority.CRITICAL}>Critical</option>
 </select>
 </div>
 </div>

 {/* Row 5: Est. Hours, Story Points, Attachments */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label htmlFor="estimated_hours" className="block text-sm font-medium text-secondary-700">
 Est. Hours
 </label>
 <input
 type="number"
 id="estimated_hours"
 step="0.5"
 value={newTask.estimated_hours}
 onChange={(e) => setNewTask({ ...newTask, estimated_hours: parseFloat(e.target.value) || 0 })}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
 placeholder="0"
 />
 </div>
 <div>
 <label htmlFor="story_points" className="block text-sm font-medium text-secondary-700">
 Story Points
 </label>
 <input
 type="number"
 id="story_points"
 value={newTask.story_points}
 onChange={(e) => setNewTask({ ...newTask, story_points: parseInt(e.target.value) || 0 })}
 className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
 placeholder="0"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-secondary-700 mb-1">Attachments</label>
 <div
 onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFiles(true); }}
 onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
 onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFiles(false); }}
 onDrop={(e) => {
 e.preventDefault();
 e.stopPropagation();
 setIsDraggingFiles(false);
 const files = Array.from(e.dataTransfer.files || []);
 if (files.length) {
 setPendingAttachments((prev) => [...prev, ...files]);
 }
 }}
 className={`border-2 border-dashed rounded-md p-3 text-center ${isDraggingFiles ? 'border-blue-500 bg-blue-50' : 'border-secondary-300 hover:border-secondary-400'}`}
 >
 <p className="text-xs text-secondary-600">Drag and drop files here or</p>
 <div className="mt-2">
 <label className="inline-flex items-center border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
 <input
 type="file"
 multiple
 className="hidden"
 onChange={(e) => {
 const files = Array.from(e.target.files || []);
 if (files.length) {
 setPendingAttachments((prev) => [...prev, ...files]);
 }
 // reset input
 if (e.target) {
 (e.target as HTMLInputElement).value = '';
 }
 }}
 />
 Choose Files
 </label>
 </div>
 </div>
 {pendingAttachments.length > 0 && (
 <div className="mt-2 space-y-1">
 <div className="text-xs text-secondary-700 font-medium">Selected:</div>
 <ul className="max-h-24 overflow-auto text-xs text-secondary-700 space-y-1">
 {pendingAttachments.map((f, idx) => (
 <li key={`${f.name}-${idx}`} className="flex items-center justify-between">
 <span className="truncate mr-2">{f.name}</span>
 <button
 type="button"
 className="text-red-600 hover:text-red-800"
 onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
 >
 remove
 </button>
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>
 </div>
 <div className="flex justify-end space-x-3">
 <button
 type="button"
 onClick={() => setShowCreateForm(false)}
 className="btn-cancel text-sm font-medium rounded-md"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="btn-page-action"
 >
 Create Task
 </button>
 </div>
 </form>
 </div>
 )}

 {/* Task Metrics Cards */}
 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
 <div className="metric-card metric-blue bg-white px-4 py-3 rounded-lg shadow border-t-4 border-blue-600">
 <div className="flex items-center">
 <div className="p-2 bg-blue-100 rounded-lg">
 <CheckCircleIcon className="h-6 w-6 text-blue-600" />
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-600">Total Tasks</p>
 <p className="metric-value text-2xl font-bold">{taskStats.total}</p>
 </div>
 </div>
 </div>

 <div className="metric-card metric-yellow bg-white px-4 py-3 rounded-lg shadow border-t-4 border-yellow-600">
 <div className="flex items-center">
 <div className="p-2 bg-yellow-100 rounded-lg">
 <ClockIcon className="h-6 w-6 text-yellow-600" />
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-600">Not Started</p>
 <p className="metric-value text-2xl font-bold">{taskStats.notStarted}</p>
 </div>
 </div>
 </div>

 <div className="metric-card metric-red bg-white px-4 py-3 rounded-lg shadow border-t-4 border-orange-600">
 <div className="flex items-center">
 <div className="p-2 bg-orange-100 rounded-lg">
 <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-600">In Progress</p>
 <p className="metric-value text-2xl font-bold">{taskStats.inProgress}</p>
 </div>
 </div>
 </div>

 <div className="metric-card metric-green bg-white px-4 py-3 rounded-lg shadow border-t-4 border-green-600">
 <div className="flex items-center">
 <div className="p-2 bg-green-100 rounded-lg">
 <CheckCircleIcon className="h-6 w-6 text-green-600" />
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-600">Completed</p>
 <p className="metric-value text-2xl font-bold">{taskStats.completed}</p>
 </div>
 </div>
 </div>

 <div className="metric-card metric-red bg-white px-4 py-3 rounded-lg shadow border-t-4 border-red-600">
 <div className="flex items-center">
 <div className="p-2 bg-red-100 rounded-lg">
 <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-600">Critical</p>
 <p className="metric-value text-2xl font-bold">{taskStats.critical}</p>
 </div>
 </div>
 </div>
 </div>


 {/* Error Message */}
 {error && (
 <div className="bg-error-50 border border-error-200 rounded-md p-4">
 <div className="text-error-800">{error}</div>
 </div>
 )}

 {/* Task Views */}
 {(() => {
 const sprintFilter = (task: any) => !selectedSprint || task.sprint_name === selectedSprint;
  const safeTasks = Array.isArray(tasksWithAssignees)
      ? tasksWithAssignees
      : Array.isArray((tasksWithAssignees as any)?.results)
        ? (tasksWithAssignees as any).results
        : Array.isArray((tasksWithAssignees as any)?.items)
          ? (tasksWithAssignees as any).items
          : Array.isArray((tasksWithAssignees as any)?.data)
            ? (tasksWithAssignees as any).data
            : Array.isArray((tasksWithAssignees as any)?.tasks)
              ? (tasksWithAssignees as any).tasks
              : [];
  let filteredList = safeTasks.filter(sprintFilter);
 // Apply header filters (status/priority)
 if (filterStatusHead.length > 0) {
 filteredList = filteredList.filter((t: any) => filterStatusHead.includes(t.status));
 }
 if (filterPriorityHead.length > 0) {
 filteredList = filteredList.filter((t: any) => filterPriorityHead.includes(t.priority));
 }
 // Apply assignees filter
 if (filterAssigneeIds.length > 0) {
 filteredList = filteredList.filter((t: any) => {
 const taskAssigneeIds = t.assignee_ids || (t.assignee_id ? [t.assignee_id] : []);
 return filterAssigneeIds.some(id => taskAssigneeIds.includes(id));
 });
 }
 // Apply assigner filter
 if (filterAssignerIds.length > 0) {
 filteredList = filteredList.filter((t: any) => t.created_by_id && filterAssignerIds.includes(t.created_by_id));
 }
 // Apply project filter
 if (filterProjectIds.length > 0) {
 filteredList = filteredList.filter((t: any) => t.project_id && filterProjectIds.includes(t.project_id));
 }
 // Apply toolbar date range (toolbar due date filter using filterFromDate/filterToDate)
 const withinRange = (dueStr?: string) => {
 if (!filterFromDate && !filterToDate) return true;
 if (!dueStr) return false;
 const d = new Date(dueStr);
 const start = filterFromDate ? new Date(filterFromDate) : null;
 const end = filterToDate ? new Date(filterToDate) : null;
 if (start && d < new Date(start.getFullYear(), start.getMonth(), start.getDate())) return false;
 if (end && d > new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)) return false;
 return true;
 };
 filteredList = filteredList.filter((t: any) => withinRange(t.due_date));
 
 // Apply header due date filter (filterDueDateFrom/filterDueDateTo)
 const withinHeaderRange = (dueStr?: string) => {
 if (!filterDueDateFrom && !filterDueDateTo) return true;
 if (!dueStr) return false;
 const d = new Date(dueStr);
 const start = filterDueDateFrom ? new Date(filterDueDateFrom) : null;
 const end = filterDueDateTo ? new Date(filterDueDateTo) : null;
 if (start && d < new Date(start.getFullYear(), start.getMonth(), start.getDate())) return false;
 if (end && d > new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)) return false;
 return true;
 };
 filteredList = filteredList.filter((t: any) => withinHeaderRange(t.due_date));

 // Apply search (title/description)
 if (taskSearch && taskSearch.trim()) {
 const q = taskSearch.trim().toLowerCase();
 filteredList = filteredList.filter((t: any) => (
 (t.title || '').toLowerCase().includes(q) ||
 (t.description || '').toLowerCase().includes(q)
 ));
 }
 
 if (useFlexibleViews) {
 return (
 <FlexibleTaskViews
 tasks={filteredList}
 type="tasks"
 onItemClick={(id) => navigate(`/tasks/${id}`)}
 onTaskUpdate={handleTaskUpdate}
 defaultView="list"
 />
 );
 }
 if (!filteredList || filteredList.length === 0) {
 return (
 <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
 <div className="mx-auto h-12 w-12 text-secondary-400">
 <CheckCircleIcon className="h-12 w-12" />
 </div>
 <h3 className="mt-2 text-sm font-medium text-secondary-900">No tasks</h3>
 <p className="mt-1 text-sm text-secondary-500">
 Get started by creating a new task.
 </p>
 </div>
 );
 }
 return (
 <>
 {currentView === 'list' && (
 <div className="bg-white rounded-lg shadow overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-200">
 <div className="flex items-center justify-between flex-wrap gap-2">
 <h3 className="text-lg font-medium text-gray-900">All Tasks ({filteredList.length})</h3>
 <div className="flex items-center gap-2">
 <div className="relative">
 <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
 <input
 type="text"
 placeholder="Search tasks..."
 value={taskSearch}
 onChange={(e) => setTaskSearch(e.target.value)}
 className="w-36 sm:w-48 md:w-64 pl-7 pr-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-gray-300"
 />
 </div>
 <button
 type="button"
 title="Refresh"
 className="p-1 text-gray-500 hover:text-gray-700"
 onClick={async () => {
 const taskAction = await dispatch(fetchTasks(selectedProject || undefined));
 if (taskAction.type === 'tasks/fetchTasks/fulfilled') {
 await fetchTaskAssignees(taskAction.payload);
 }
 }}
 >
 <ArrowPathIcon className="w-4 h-4" />
 </button>
 <button
 type="button"
 title="Filter by date range"
 className="p-1 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = !toolbarDateOpen;
 if (isOpening) {
 const rect = e.currentTarget.getBoundingClientRect();
 setToolbarDateButtonRect(rect);
 }
 setPendingToolbarFrom(filterFromDate || '');
 setPendingToolbarTo(filterToDate || '');
 setToolbarDateOpen((o) => !o);
 }}
 >
 <CalendarIcon className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 <div className="overflow-x-auto projects-table">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
 Task
 </th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
 <div className="inline-flex items-center gap-1">
 <span>Project</span>
 <span className="relative">
 <button
 type="button"
 className="p-0.5 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = headerFilterOpen !== 'project';
 if (isOpening) {
 const rect = e.currentTarget.getBoundingClientRect();
 setFilterButtonRect(rect);
 }
 setHeaderFilterOpen(isOpening ? 'project' : null);
 }}
 >
 <FunnelIcon className="w-3.5 h-3.5" />
 </button>
 </span>
 </div>
 </th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
 <div className="inline-flex items-center gap-1">
 <span>Assignees</span>
 <span className="relative">
 <button
 type="button"
 className="p-0.5 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = headerFilterOpen !== 'assignees';
 if (isOpening) {
 const rect = e.currentTarget.getBoundingClientRect();
 setFilterButtonRect(rect);
 }
 setHeaderFilterOpen(isOpening ? 'assignees' : null);
 }}
 >
 <FunnelIcon className="w-3.5 h-3.5" />
 </button>
 </span>
 </div>
 </th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
 <div className="inline-flex items-center gap-1">
 <span>Assigner</span>
 <span className="relative">
 <button
 type="button"
 className="p-0.5 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = headerFilterOpen !== 'assigner';
 if (isOpening) {
 const rect = e.currentTarget.getBoundingClientRect();
 setFilterButtonRect(rect);
 }
 setHeaderFilterOpen(isOpening ? 'assigner' : null);
 }}
 >
 <FunnelIcon className="w-3.5 h-3.5" />
 </button>
 </span>
 </div>
 </th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
 <div className="inline-flex items-center gap-1">
 <span>Status</span>
 <span className="relative">
 <button
 type="button"
 className="p-0.5 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = headerFilterOpen !== 'status';
 if (isOpening) {
 const rect = e.currentTarget.getBoundingClientRect();
 setFilterButtonRect(rect);
 }
 setHeaderFilterOpen(isOpening ? 'status' : null);
 }}
 >
 <FunnelIcon className="w-3.5 h-3.5" />
 </button>
 </span>
 </div>
 </th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
 <div className="inline-flex items-center gap-1">
 <span>Priority</span>
 <span className="relative">
 <button
 type="button"
 className="p-0.5 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = headerFilterOpen !== 'priority';
 if (isOpening) {
 const rect = e.currentTarget.getBoundingClientRect();
 setFilterButtonRect(rect);
 }
 setHeaderFilterOpen(isOpening ? 'priority' : null);
 }}
 >
 <FunnelIcon className="w-3.5 h-3.5" />
 </button>
 </span>
 </div>
 </th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
 Type
 </th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
 <div className="inline-flex items-center gap-1">
 <span>Due Date</span>
 <span className="relative">
 <button
 type="button"
 className="p-0.5 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = headerFilterOpen !== 'due_date';
 if (isOpening) {
 const rect = e.currentTarget.getBoundingClientRect();
 setFilterButtonRect(rect);
 setPendingDueFrom(filterDueDateFrom || '');
 setPendingDueTo(filterDueDateTo || '');
 }
 setHeaderFilterOpen(isOpening ? 'due_date' : null);
 }}
 >
 <CalendarIcon className="w-3.5 h-3.5" />
 </button>
 </span>
 </div>
 </th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
 Effort
 </th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {filteredList.map((task: Task, index: number) => {
 return (
 <tr key={task.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/tasks/${task.id}`)}>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center">
 <div className="flex-shrink-0 mr-3">
 {getStatusIcon(task.status)}
 </div>
 <div>
 <div className="text-sm font-medium text-gray-900 flex items-center flex-wrap gap-2">
 <span>{`T${index + 1}-${task.title}`}</span>
 {(task.is_recurring || (task as any).recurring_template_id) && (
 <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
 Recurring
 </span>
 )}
 {(task as any).sprint_name && (
 <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
 Sprint: {(task as any).sprint_name}
 </span>
 )}
 </div>
 {task.description && (
 <div className="text-sm text-gray-500 truncate max-w-xs">
 {task.description}
 </div>
 )}
 </div>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="text-sm text-gray-900">
 {(task.project_id && projects.find((p: Project) => p.id === task.project_id)?.name) || 'No project'}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap cursor-pointer select-none" onClick={(e) => openAssigneesInlineEditor(e, task.id)}>
 <div className="relative inline-flex items-center gap-2">
 {(() => {
 // Handle both single assignee_id and multiple assignee_ids
 let assigneeIds: string[] = [];
 const taskWithAssignees = task as Task & { assignee_ids?: string[] };
 if (taskWithAssignees.assignee_ids && Array.isArray(taskWithAssignees.assignee_ids)) {
 assigneeIds = taskWithAssignees.assignee_ids;
 } else if (task.assignee_id) {
 assigneeIds = [task.assignee_id];
 }

 if (assigneeIds.length === 0) {
 return (
 <div className="flex items-center text-gray-500">
 <span className="text-sm">Unassigned</span>
 </div>
 );
 }

 // Show loading state if users haven't loaded yet
 if (users.length === 0) {
 return (
 <span className="text-gray-400 text-sm">Loading...</span>
 );
 }
 
 const assignees = assigneeIds.map(id => {
 const user = users.find((u: any) => u.id === id);
 return user;
 }).filter(Boolean);
 
 if (assignees.length === 0) {
 return (
 <span className="text-gray-400 text-sm">Unknown User</span>
 );
 }

 return (
 <div className="flex -space-x-2">
 {assignees.slice(0, 3).map((assignee: any, index: number) => (
 <div
 key={assignee.id || index}
 className="relative inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100"
 title={`${assignee.first_name} ${assignee.last_name} (${assignee.email})`}
 >
 {assignee.avatar_url ? (
 <img
 className="h-8 w-8 rounded-full object-cover"
 src={assignee.avatar_url}
 alt={`${assignee.first_name} ${assignee.last_name}`}
 onError={(e) => {
 const target = e.target as HTMLImageElement;
 target.style.display = 'none';
 const nextSibling = target.nextElementSibling as HTMLElement;
 if (nextSibling) nextSibling.style.display = 'flex';
 }}
 />
 ) : null}
 <div className={`h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-medium ${assignee.avatar_url ? 'hidden' : 'flex'}`} style={{ display: assignee.avatar_url ? 'none' : 'flex' }}>
 {assignee.first_name ? assignee.first_name.charAt(0).toUpperCase() : 'U'}
 </div>
 </div>
 ))}
 {assignees.length > 3 && (
 <div className="relative inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center">
 <span className="text-xs font-medium text-gray-600">+{assignees.length - 3}</span>
 </div>
 )}
 </div>
 );
 })()}
 <ChevronDownIcon className="h-4 w-4 text-gray-400" />

 {assigneesEditorOpen === task.id && (
 <InlineEditPortal rect={assigneesEditorRect}>
 <div ref={assigneesEditorRef} className="w-56 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{ borderRadius: '5px' }}>
 <div className="px-2 py-0.5 border-b border-gray-100 sticky top-0 bg-white rounded-t-md">
 <div className="mt-1 relative">
 <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 value={assigneesInlineFilter}
 onChange={(e) => setAssigneesInlineFilter(e.target.value)}
 placeholder="Search assignees..."
 className="w-full pl-7 pr-2 py-0.5 text-xs border border-gray-200 rounded-sm focus:outline-none focus:ring-0 focus:border-gray-300"
 />
 </div>
 </div>
 <div className="max-h-64 overflow-auto">
 <ul className="py-1.5 text-xs space-y-1.5">
 {users
 .filter((u: any) => {
 const name = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || '').toLowerCase();
 const email = (u.email || '').toLowerCase();
 const q = (assigneesInlineFilter || '').toLowerCase();
 return !q || name.includes(q) || email.includes(q);
 })
 .map((user: any) => {
 const name = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
 const selected = assigneesSelection.includes(user.id);
 return (
 <li key={user.id} className="px-1.5 py-0.5 text-[11px]">
 <button
 type="button"
 className={`w-full flex items-center justify-between text-left px-1.5 py-0 rounded-sm border !min-h-0 h-auto leading-none ${selected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-transparent hover:bg-gray-50 text-gray-700'}`}
 style={{ minHeight: 0, paddingTop: 10 }}
 onClick={(e) => { e.stopPropagation(); toggleAssigneesSelect(user.id); }}
 >
 <div className="flex flex-col">
 <span>{name}</span>
 <span className="text-[10px] text-gray-500">{user.email}</span>
 </div>
 {selected && <CheckIcon className="w-3 h-3 text-blue-600" />}
 </button>
 </li>
 );
 })}
 {users.filter((u: any) => {
 const name = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || '').toLowerCase();
 const email = (u.email || '').toLowerCase();
 const q = (assigneesInlineFilter || '').toLowerCase();
 return !q || name.includes(q) || email.includes(q);
 }).length === 0 && (
 <li className="py-2 text-sm text-gray-500">No users found</li>
 )}
 </ul>
 </div>
 <div className="flex justify-end items-center gap-3 p-1 border-t border-gray-100 rounded-b-md">
 <button
 type="button"
 className="filter-popup-btn filter-popup-btn-clear"
 onClick={(e) => {
 e.stopPropagation();
 const ids = users
 .filter((u: any) => {
 const name = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || '').toLowerCase();
 const email = (u.email || '').toLowerCase();
 const q = (assigneesInlineFilter || '').toLowerCase();
 return !q || name.includes(q) || email.includes(q);
 })
 .map((u: any) => u.id);
 setAssigneesSelection((prev) => Array.from(new Set([...(prev || []), ...ids])));
 }}
 >
 Select all
 </button>
 <button
 type="button"
 className="filter-popup-btn filter-popup-btn-clear"
 onClick={(e) => { e.stopPropagation(); setAssigneesSelection([]); }}
 >
 Clear
 </button>
 <button
 type="button"
 className="filter-popup-btn filter-popup-btn-filter"
 onClick={(e) => { e.stopPropagation(); saveAssigneesInlineEdit(task.id); }}
 >
 Add
 </button>
 </div>
 </div>
 </InlineEditPortal>
 )}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap cursor-pointer select-none" onClick={(e) => openAssignerInlineEditor(e, task.id)}>
 <div className="relative inline-flex items-center gap-2">
 {(() => {
 // Display the assigner (created_by_id)
 if (!task.created_by_id) {
 return (
 <div className="flex items-center text-gray-500">
 <span className="text-sm">No assigner</span>
 </div>
 );
 }

 // Show loading state if users haven't loaded yet
 if (users.length === 0) {
 return (
 <span className="text-gray-400 text-sm">Loading...</span>
 );
 }
 
 const assigner = users.find((u: any) => u.id === task.created_by_id);
 
 if (!assigner) {
 return (
 <span className="text-gray-400 text-sm">Unknown User</span>
 );
 }

 return (
 <div className="flex items-center">
 <div className="relative inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100">
 {assigner.avatar_url ? (
 <img
 className="h-8 w-8 rounded-full object-cover"
 src={assigner.avatar_url}
 alt={`${assigner.first_name} ${assigner.last_name}`}
 onError={(e) => {
 const target = e.target as HTMLImageElement;
 target.style.display = 'none';
 const nextSibling = target.nextElementSibling as HTMLElement;
 if (nextSibling) nextSibling.style.display = 'flex';
 }}
 />
 ) : null}
 <div className={`h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-medium ${assigner.avatar_url ? 'hidden' : 'flex'}`} style={{ display: assigner.avatar_url ? 'none' : 'flex' }}>
 {assigner.first_name ? assigner.first_name.charAt(0).toUpperCase() : 'U'}
 </div>
 </div>
 <div className="ml-3">
 <div className="text-sm font-medium text-gray-900">
 {assigner.first_name} {assigner.last_name}
 </div>
 </div>
 </div>
 );
 })()}
 <ChevronDownIcon className="h-4 w-4 text-gray-400" />

 {assignerEditorOpen === task.id && (
 <InlineEditPortal rect={assignerEditorRect}>
 <div ref={assignerEditorRef} className="w-56 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{ borderRadius: '5px' }}>
 <div className="px-2 py-0.5 border-b border-gray-100 sticky top-0 bg-white rounded-t-md">
 <div className="mt-1 relative">
 <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 value={assignerInlineFilter}
 onChange={(e) => setAssignerInlineFilter(e.target.value)}
 placeholder="Search assigner..."
 className="w-full pl-7 pr-2 py-0.5 text-xs border border-gray-200 rounded-sm focus:outline-none focus:ring-0 focus:border-gray-300"
 />
 </div>
 </div>
 <div className="max-h-64 overflow-auto">
 <ul className="py-1.5 text-xs space-y-1.5">
 {users
 .filter((u: any) => {
 const name = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || '').toLowerCase();
 const email = (u.email || '').toLowerCase();
 const q = (assignerInlineFilter || '').toLowerCase();
 return !q || name.includes(q) || email.includes(q);
 })
 .map((user: any) => {
 const name = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
 const selected = assignerSelection === user.id;
 return (
 <li key={user.id} className="px-1.5 py-0.5 text-[11px]">
 <button
 type="button"
 className={`w-full flex items-center justify-between text-left px-1.5 py-0 rounded-sm border !min-h-0 h-auto leading-none ${selected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-transparent hover:bg-gray-50 text-gray-700'}`}
 style={{ minHeight: 0, paddingTop: 10 }}
 onClick={(e) => { e.stopPropagation(); setAssignerSelection(user.id); }}
 >
 <div className="flex flex-col">
 <span>{name}</span>
 <span className="text-[10px] text-gray-500">{user.email}</span>
 </div>
 {selected && <CheckIcon className="w-3 h-3 text-blue-600" />}
 </button>
 </li>
 );
 })}
 {users.filter((u: any) => {
 const name = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || '').toLowerCase();
 const email = (u.email || '').toLowerCase();
 const q = (assignerInlineFilter || '').toLowerCase();
 return !q || name.includes(q) || email.includes(q);
 }).length === 0 && (
 <li className="py-2 text-sm text-gray-500">No users found</li>
 )}
 </ul>
 </div>
 <div className="flex justify-end items-center gap-3 p-1 border-t border-gray-100 rounded-b-md">
 <button
 type="button"
 className="filter-popup-btn filter-popup-btn-clear"
 onClick={(e) => { e.stopPropagation(); setAssignerSelection(null); }}
 >
 Clear
 </button>
 <button
 type="button"
 className="filter-popup-btn filter-popup-btn-filter"
 onClick={(e) => { e.stopPropagation(); saveAssignerInlineEdit(task.id); }}
 >
 Set
 </button>
 </div>
 </div>
 </InlineEditPortal>
 )}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => startInlineEditTask(e, task, 'status')}>
 <div className="relative inline-block">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
 {task.status}
 </span>
 {editingTaskId === task.id && editingField === 'status' && (
 <InlineEditPortal rect={inlineEditRect}>
 <div ref={inlinePopoverRef} className="w-44 border border-gray-200 bg-white shadow-sm p-0.5" style={{borderRadius: '5px'}}>
 <ul className="text-xs">
 {[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.BLOCKED, TaskStatus.COMPLETED].map((opt) => (
 <li key={opt} className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${opt===task.status ? 'bg-gray-50' : ''}`} onClick={() => saveInlineEditTask(task.id, opt)}>
 <span className="capitalize">{String(opt).replace('_',' ')}</span>
 {opt===task.status && <CheckIcon className="w-4 h-4 text-user-blue" />}
 </li>
 ))}
 </ul>
 </div>
 </InlineEditPortal>
 )}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => startInlineEditTask(e, task, 'priority')}>
 <div className="relative inline-block">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
 {task.priority}
 </span>
 {editingTaskId === task.id && editingField === 'priority' && (
 <InlineEditPortal rect={inlineEditRect}>
 <div ref={inlinePopoverRef} className="w-40 border border-gray-200 bg-white shadow-sm p-0.5" style={{borderRadius: '5px'}}>
 <ul className="text-xs">
 {[TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.CRITICAL].map((opt) => (
 <li key={opt} className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${opt===task.priority ? 'bg-gray-50' : ''}`} onClick={() => saveInlineEditTask(task.id, opt)}>
 <span className="capitalize">{opt}</span>
 {opt===task.priority && <CheckIcon className="w-4 h-4 text-user-blue" />}
 </li>
 ))}
 </ul>
 </div>
 </InlineEditPortal>
 )}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="text-sm text-gray-900">
 {task.task_type || 'Task'}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" onClick={(e) => startInlineEditTask(e, task, 'due_date')}>
 <div className="relative inline-block">
 <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</span>
 {editingTaskId === task.id && editingField === 'due_date' && (
 <InlineEditPortal rect={inlineEditRect}>
 <div ref={inlinePopoverRef} className="w-56 border border-gray-200 bg-white shadow-sm p-1.5" style={{borderRadius: '5px'}}>
 <input
 type="date"
 value={editValue || ''}
 onChange={(e) => { saveInlineEditTask(task.id, e.target.value); }}
 className="block w-full h-8 px-2 border border-gray-300 rounded-sm shadow-none focus:outline-none focus:ring-0 focus:border-gray-400 text-xs"
 autoFocus
 />
 </div>
 </InlineEditPortal>
 )}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="text-sm text-gray-900">
 {task.estimated_hours && task.estimated_hours > 0 ? `${task.estimated_hours}h` : '-'}
 {task.story_points && task.story_points > 0 && (
 <div className="text-xs text-gray-500">
 {task.story_points} pts
 </div>
 )}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
 <div className="flex space-x-2">
 <button
 onClick={() => navigate(`/tasks/${task.id}`)}
 className="inline-flex items-center justify-center p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
 title="View Details"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => navigate(`/tasks/${task.id}?tab=edit`)}
 className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 text-black hover:bg-gray-200 transition-colors"
 title="Edit Task"
 >
 <PencilIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDeleteTask(task.id)}
 className="inline-flex items-center justify-center p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
 title="Delete Task"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 {/* Render all filter popups via portal */}
 {headerFilterOpen === 'status' && (
 <FilterPortal buttonRect={filterButtonRect}>
 <div ref={headerFilterRef} className="w-40 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
 <div className="px-1.5 text-xs text-gray-800 font-medium">Filter status</div>
 <ul className="max-h-48 overflow-auto">
 {[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.BLOCKED, TaskStatus.COMPLETED].map(st => {
 const checked = filterStatusHead.includes(st);
 const label = String(st).replace('_',' ');
 return (
 <li key={st}>
 <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
 <input type="checkbox" className="h-3.5 w-3.5" checked={checked} onChange={(e) => {
 e.stopPropagation();
 setFilterStatusHead(prev => checked ? prev.filter(x => x !== st) : [...prev, st]);
 }} />
 <span className="capitalize">{label}</span>
 </label>
 </li>
 );
 })}
 </ul>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); setFilterStatusHead([]); }}>Clear</button>
 <button className="filter-popup-btn filter-popup-btn-close" onClick={(e) => { e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
 </div>
 </div>
 </FilterPortal>
 )}
 {headerFilterOpen === 'priority' && (
 <FilterPortal buttonRect={filterButtonRect}>
 <div ref={headerFilterRef} className="w-36 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
 <div className="px-1.5 text-xs text-gray-800 font-medium">Filter priority</div>
 <ul className="max-h-48 overflow-auto">
 {[TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.CRITICAL].map(pr => {
 const checked = filterPriorityHead.includes(pr);
 return (
 <li key={pr}>
 <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
 <input type="checkbox" className="h-3.5 w-3.5" checked={checked} onChange={(e) => {
 e.stopPropagation();
 setFilterPriorityHead(prev => checked ? prev.filter(x => x !== pr) : [...prev, pr]);
 }} />
 <span className="capitalize">{pr}</span>
 </label>
 </li>
 );
 })}
 </ul>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); setFilterPriorityHead([]); }}>Clear</button>
 <button className="filter-popup-btn filter-popup-btn-close" onClick={(e) => { e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
 </div>
 </div>
 </FilterPortal>
 )}
 {headerFilterOpen === 'due_date' && (
 <FilterPortal buttonRect={filterButtonRect}>
 <div ref={headerFilterRef} className="w-64 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{borderRadius: '5px'}}>
 <div className="px-1 pb-1">
 <DateRangeCalendar size="sm"
 initialFrom={pendingDueFrom || null}
 initialTo={pendingDueTo || null}
 onChange={(from, to) => {
 if (from && !to) {
 setPendingDueFrom(from);
 setPendingDueTo(from);
 } else {
 setPendingDueFrom(from || '');
 setPendingDueTo(to || '');
 }
 }}
 />
 </div>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => {
 e.stopPropagation();
 setFilterDueDateFrom('');
 setFilterDueDateTo('');
 setHeaderFilterOpen(null);
 }}>Clear</button>
 <button className="filter-popup-btn filter-popup-btn-filter" onClick={(e) => {
 e.stopPropagation();
 const from = pendingDueFrom || '';
 const to = pendingDueTo || pendingDueFrom || '';
 setFilterDueDateFrom(from);
 setFilterDueDateTo(to);
 setHeaderFilterOpen(null);
 }}>Filter</button>
 </div>
 </div>
 </FilterPortal>
 )}
 {headerFilterOpen === 'assignees' && (
 <FilterPortal buttonRect={filterButtonRect}>
 <div ref={headerFilterRef} className="w-52 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
 <div className="px-1.5 text-xs text-gray-800 font-medium">Filter assignees</div>
 <ul className="max-h-48 overflow-auto">
 {users.map((u: any) => {
 const selected = filterAssigneeIds.includes(u.id);
 const label = u.full_name || `${u.first_name||''} ${u.last_name||''}`.trim() || u.email;
 return (
 <li key={u.id}>
 <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
 <input
 type="checkbox"
 className="h-4 w-4"
 checked={selected}
 onChange={(e) => {
 e.stopPropagation();
 setFilterAssigneeIds(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id]);
 }}
 />
 <span>{label}</span>
 </label>
 </li>
 );
 })}
 </ul>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e)=>{ e.stopPropagation(); setFilterAssigneeIds([]); }}>Clear</button>
 <button className="filter-popup-btn filter-popup-btn-close" onClick={(e)=>{ e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
 </div>
 </div>
 </FilterPortal>
 )}
 {headerFilterOpen === 'assigner' && (
 <FilterPortal buttonRect={filterButtonRect}>
 <div ref={headerFilterRef} className="w-52 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
 <div className="px-1.5 text-xs text-gray-800 font-medium">Filter assigners</div>
 <ul className="max-h-48 overflow-auto">
 {users.map((u: any) => {
 const selected = filterAssignerIds.includes(u.id);
 const label = u.full_name || `${u.first_name||''} ${u.last_name||''}`.trim() || u.email;
 return (
 <li key={u.id}>
 <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
 <input
 type="checkbox"
 className="h-4 w-4"
 checked={selected}
 onChange={(e) => {
 e.stopPropagation();
 setFilterAssignerIds(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id]);
 }}
 />
 <span>{label}</span>
 </label>
 </li>
 );
 })}
 </ul>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e)=>{ e.stopPropagation(); setFilterAssignerIds([]); }}>Clear</button>
 <button className="filter-popup-btn filter-popup-btn-close" onClick={(e)=>{ e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
 </div>
 </div>
 </FilterPortal>
 )}
 {headerFilterOpen === 'project' && (
 <FilterPortal buttonRect={filterButtonRect}>
 <div ref={headerFilterRef} className="w-52 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
 <div className="px-1.5 text-xs text-gray-800 font-medium">Filter projects</div>
 <ul className="max-h-48 overflow-auto">
 {projects.map((p: Project) => {
 const selected = filterProjectIds.includes(p.id);
 const label = p.name || 'Unnamed Project';
 return (
 <li key={p.id}>
 <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
 <input
 type="checkbox"
 className="h-4 w-4"
 checked={selected}
 onChange={(e) => {
 e.stopPropagation();
 setFilterProjectIds(prev => selected ? prev.filter(id => id !== p.id) : [...prev, p.id]);
 }}
 />
 <span>{label}</span>
 </label>
 </li>
 );
 })}
 </ul>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e)=>{ e.stopPropagation(); setFilterProjectIds([]); }}>Clear</button>
 <button className="filter-popup-btn filter-popup-btn-close" onClick={(e)=>{ e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
 </div>
 </div>
 </FilterPortal>
 )}
 {/* Toolbar date filter portal */}
 {toolbarDateOpen && (
 <FilterPortal buttonRect={toolbarDateButtonRect} align="right">
 <div ref={toolbarDateRef} className="w-64 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{borderRadius: '5px'}}>
 <div className="px-1 pb-1">
 <DateRangeCalendar
 size="sm"
 initialFrom={pendingToolbarFrom || null}
 initialTo={pendingToolbarTo || null}
 onChange={(from, to) => {
 if (from && !to) {
 setPendingToolbarFrom(from);
 setPendingToolbarTo(from);
 } else {
 setPendingToolbarFrom(from || '');
 setPendingToolbarTo(to || '');
 }
 }}
 />
 </div>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => {
 e.stopPropagation();
 setFilterFromDate('');
 setFilterToDate('');
 setToolbarDateOpen(false);
 }}>Clear</button>
 <button className="filter-popup-btn filter-popup-btn-filter" onClick={(e) => {
 e.stopPropagation();
 const from = pendingToolbarFrom || '';
 const to = pendingToolbarTo || pendingToolbarFrom || '';
 setFilterFromDate(from);
 setFilterToDate(to);
 setToolbarDateOpen(false);
 }}>Filter</button>
 </div>
 </div>
 </FilterPortal>
 )}
 </div>
 )}

 {currentView === 'kanban' && (
 <KanbanBoard
 tasks={tasks}
 type="tasks"
 onTaskUpdate={handleTaskUpdate}
 />
 )}

 {currentView === 'calendar' && (
 <CalendarView
 tasks={tasks}
 type="tasks"
 onItemClick={handleTaskClick}
 />
 )}

 {currentView === 'gantt' && (
 <GanttChart
 tasks={tasks}
 type="tasks"
 onItemClick={handleTaskClick}
 />
 )}
 </>
 );
 })()}
 </div>
 );
};

export default TasksPage;
