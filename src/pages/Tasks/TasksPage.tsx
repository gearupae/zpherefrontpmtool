import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchTasks, createTask, updateTask, deleteTask } from '../../store/slices/taskSlice';
import { fetchProjects } from '../../store/slices/projectSlice';
import { addNotification } from '../../store/slices/notificationSlice';
import { Task, TaskStatus, TaskPriority, TaskType, Project } from '../../types';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import FlexibleTaskViews from '../../components/Views/FlexibleTaskViews';
import KanbanBoard from '../../components/Views/KanbanBoard';
import CalendarView from '../../components/Views/CalendarView';
import GanttChart from '../../components/Views/GanttChart';
import { PlusIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, EyeIcon, Squares2X2Icon, CalendarIcon, ChartBarIcon, ListBulletIcon, CogIcon, ViewfinderCircleIcon, PencilIcon, TrashIcon, CheckIcon, MagnifyingGlassIcon, FunnelIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import DateRangeCalendar from '../../components/UI/DateRangeCalendar';

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
  const [headerFilterOpen, setHeaderFilterOpen] = useState<null | 'status' | 'priority'>(null);
  const headerFilterRef = useRef<HTMLDivElement | null>(null);

  // Toolbar date filter state
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [toolbarDateOpen, setToolbarDateOpen] = useState(false);
  const [pendingToolbarFrom, setPendingToolbarFrom] = useState('');
  const [pendingToolbarTo, setPendingToolbarTo] = useState('');
  const toolbarDateRef = useRef<HTMLDivElement | null>(null);

  // Inline edit state for list (match Projects inline UX)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'status' | 'priority' | 'due_date' | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const inlinePopoverRef = useRef<HTMLDivElement | null>(null);
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

  // Recurrence state for "Repeat every"
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatPreset, setRepeatPreset] = useState<'none' | 'weekday' | '1w' | '2w' | '1m' | '3m' | 'quarterly' | 'yearly' | 'custom'>('none');
  const [customRepeat, setCustomRepeat] = useState<{ frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'; interval: number }>({
    frequency: 'weekly',
    interval: 1,
  });

  // Calculate task statistics
  const taskStats = React.useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        total: 0,
        notStarted: 0,
        inProgress: 0,
        completed: 0
      };
    }

    return {
      total: tasks.length,
      notStarted: tasks.filter((task: Task) => task.status === TaskStatus.TODO).length,
      inProgress: tasks.filter((task: Task) => task.status === TaskStatus.IN_PROGRESS).length,
      completed: tasks.filter((task: Task) => task.status === TaskStatus.COMPLETED).length
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
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
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
        await fetchTaskAssignees(taskAction.payload);
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
        const resp = await apiClient.post('/calendar/availability', {
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

  const fetchTaskAssignees = async (taskList: Task[]) => {
    console.log('=== DEBUGGING: fetchTaskAssignees called with tasks:', taskList.length);
    try {
      const { default: apiClient } = await import('../../api/client');
      console.log('=== DEBUGGING: API client imported successfully');
      
      const enhancedTasks = await Promise.all(
        taskList.map(async (task, index) => {
          try {
            console.log(`=== DEBUGGING: Fetching assignees for task ${index + 1}/${taskList.length}: ${task.title} (ID: ${task.id})`);
            
            // Fetch assignees for this task
            const assigneesResponse = await apiClient.get(`/task-assignees/tasks/${task.id}/assignees`);
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
      setTasksWithAssignees(taskList);
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
        if (repeatEnabled && repeatPreset !== 'none') {
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
          const templateRes = await apiClient.post('/recurring-tasks', templatePayload);
          const template = templateRes.data;

          // Generate first task instance
          const genRes = await apiClient.post(`/recurring-tasks/${template.id}/generate`);
          const createdTaskId = genRes.data?.task_id;
          console.log('=== DEBUGGING: Generated recurring task:', createdTaskId);

          // Add all assignees via task-assignees API (including the first as primary)
          if (newTask.assignee_ids.length > 0 && createdTaskId) {
            try {
              // Add first as primary
              await apiClient.post(`/task-assignees/tasks/${createdTaskId}/assignees`, {
                user_id: newTask.assignee_ids[0],
                is_primary: true,
              });
            } catch (err) {
              console.warn('Failed to add primary assignee to recurring task', err);
            }
            // Add remaining as non-primary
            for (let i = 1; i < newTask.assignee_ids.length; i++) {
              try {
                await apiClient.post(`/task-assignees/tasks/${createdTaskId}/assignees`, {
                  user_id: newTask.assignee_ids[i],
                  is_primary: false,
                });
              } catch (err) {
                console.warn(`Failed to add assignee ${newTask.assignee_ids[i]} to recurring task`, err);
              }
            }
          }

          addNotification({
            title: 'Success',
            type: 'success',
            message: 'Recurring task created successfully',
          });

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
            await fetchTaskAssignees(taskAction.payload);
          }
          return; // Prevent non-recurring flow
        }

        // Create the task with single assignee_id (first assignee if multiple)
        // Remove created_by_id as it's set automatically by the API
        const { created_by_id, assignee_ids, ...taskFields } = newTask;
        const taskData = {
          ...taskFields,
          assignee_id: assignee_ids.length > 0 ? assignee_ids[0] : undefined
        };
        
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
            await apiClient.post(`/task-assignees/tasks/${createdTask.id}/assignees`, {
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
              await apiClient.post(`/task-assignees/tasks/${createdTask.id}/assignees`, {
                user_id: newTask.assignee_ids[i],
                is_primary: false
              });
              console.log('=== DEBUGGING: Added additional assignee:', newTask.assignee_ids[i]);
            } catch (error) {
              console.error(`=== DEBUGGING: Failed to add assignee ${newTask.assignee_ids[i]}:`, error);
            }
          }
        }
        
        addNotification({
          title: 'Success',
          type: 'success',
          message: 'Task created successfully'
        });
        
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
        setShowCreateForm(false);
        
        // Refresh tasks with assignees
        const taskAction = await dispatch(fetchTasks(selectedProject || undefined));
        if (taskAction.type === 'tasks/fetchTasks/fulfilled') {
          await fetchTaskAssignees(taskAction.payload);
        }
      } catch (error) {
        console.error('=== DEBUGGING: Failed to create task:', error);
        addNotification({
          title: 'Error',
          type: 'error',
          message: 'Failed to create task'
        });
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

  const startInlineEditTask = (e: React.MouseEvent, task: Task, field: 'status' | 'priority' | 'due_date') => {
    e.stopPropagation();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Tasks</h1>
            <p className="text-secondary-600 mt-1">
              Manage and track your project tasks
            </p>
          </div>
          <div className="flex space-x-3">
            {/* Sprint quick setup */}
            <button
              onClick={() => setShowSprintPanel(true)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              title="Setup sprint details for new tasks"
            >
              <span>🏁 Sprint</span>
            </button>
            <button
            onClick={() => setUseFlexibleViews(!useFlexibleViews)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
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
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCurrentView('list')}
className="px-3 py-1 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900"
            >
              <ListBulletIcon className="w-4 h-4" />
              <span>List</span>
            </button>
            <button
              onClick={() => setCurrentView('kanban')}
className="px-3 py-1 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900"
            >
              <Squares2X2Icon className="w-4 h-4" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setCurrentView('calendar')}
className="px-3 py-1 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900"
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setCurrentView('gantt')}
className="px-3 py-1 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900"
            >
              <ChartBarIcon className="w-4 h-4" />
              <span>Timeline</span>
            </button>
            </div>
          )}
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-page-action flex items-center btn-styled btn-create-auto" style={{ backgroundColor: 'rgb(0, 0, 0)', color: 'white', borderColor: 'rgb(0, 0, 0)', fontSize: '0.875rem', padding: '0.2rem 0.75rem' }}
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
      {showCreateForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-secondary-900 mb-4">Create New Task</h2>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            
            {/* Sprint (in form) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700">Sprint Name</label>
                <input
                  type="text"
                  value={newTask.sprint_name}
                  onChange={(e) => setNewTask(prev => ({ ...prev, sprint_name: e.target.value }))}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="e.g. Sprint 12"
                />
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
                <label className="block text-sm font-medium text-secondary-700">Goal</label>
                <input
                  type="text"
                  value={newTask.sprint_goal}
                  onChange={(e) => setNewTask(prev => ({ ...prev, sprint_goal: e.target.value }))}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Sprint goal"
                />
              </div>
            </div>

            {/* Customer Visibility */}
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-secondary-700">Visible to customer</label>
                <button
                  type="button"
                  onClick={() => setNewTask((prev) => ({ ...prev, visible_to_customer: !prev.visible_to_customer }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newTask.visible_to_customer ? 'bg-user-blue' : 'bg-secondary-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newTask.visible_to_customer ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* Assignment Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assignees - Styled Dropdown Multi-select */}
              <div ref={assigneesRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To (Assignees)
                </label>
                <div
                  className="w-full border border-gray-300 rounded-md bg-white cursor-pointer"
                  onClick={() => setAssigneesOpen(o => !o)}
                >
                  <div className="px-3 py-2 flex flex-wrap gap-1 min-h-[40px]">
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
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto">
                      <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                        <div className="relative">
                          <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={assigneesQuery}
                            onChange={(e) => setAssigneesQuery(e.target.value)}
                            placeholder="Search users..."
                            className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <ul className="py-1">
                        {users.length === 0 && (
                          <li className="px-3 py-2 text-sm text-gray-500">Loading users...</li>
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
                              className={`px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
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
                          <li className="px-3 py-2 text-sm text-gray-500">No users found</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
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
                  <div className="px-3 py-2 min-h-[40px]">
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
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto">
                      <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                        <div className="relative">
                          <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={assignerQuery}
                            onChange={(e) => setAssignerQuery(e.target.value)}
                            placeholder="Search users..."
                            className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <ul className="py-1">
                        {users
                          .filter((u: any) => {
                            const q = assignerQuery.toLowerCase();
                            return `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                          })
                          .map((user: any) => (
                          <li
                            key={user.id}
                            className={`px-3 py-2 text-sm hover:bg-gray-50 ${newTask.created_by_id === user.id ? 'bg-gray-50' : ''}`}
                            onClick={() => setNewTask(prev => ({ ...prev, created_by_id: user.id }))}
                          >
                            <div className="flex flex-col">
                              <span className="text-gray-900">{user.first_name} {user.last_name}</span>
                              <span className="text-xs text-gray-500">{user.email}</span>
                            </div>
                          </li>
                        ))}
                        {users.length === 0 && (
                          <li className="px-3 py-2 text-sm text-gray-500">No users found</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Assigner is stored as a single user (created_by). Multi-select not supported by backend.</p>
              </div>
            </div>

            {/* Repeat Every (Recurrence) */}
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-secondary-700">Repeat Every</label>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">Enable</span>
                  <button
                    type="button"
                    onClick={() => setRepeatEnabled((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${repeatEnabled ? 'bg-user-blue' : 'bg-secondary-200'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${repeatEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              </div>
              {repeatEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Preset</label>
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
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  {repeatPreset === 'custom' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Frequency</label>
                        <select
                          value={customRepeat.frequency}
                          onChange={(e) => setCustomRepeat((c) => ({ ...c, frequency: e.target.value as any }))}
                          className="block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">Interval</label>
                        <input
                          type="number"
                          min={1}
                          value={customRepeat.interval}
                          onChange={(e) => setCustomRepeat((c) => ({ ...c, interval: parseInt(e.target.value) || 1 }))}
                          className="block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{taskStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Not Started</p>
              <p className="text-2xl font-bold text-gray-900">{taskStats.notStarted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{taskStats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{taskStats.completed}</p>
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
        let filteredList = (tasksWithAssignees || []).filter(sprintFilter);
        // Apply header filters (status/priority)
        if (filterStatusHead.length > 0) {
          filteredList = filteredList.filter((t: any) => filterStatusHead.includes(t.status));
        }
        if (filterPriorityHead.length > 0) {
          filteredList = filteredList.filter((t: any) => filterPriorityHead.includes(t.priority));
        }
        // Apply date range (due date)
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">All Tasks ({filteredList.length})</h3>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search tasks..."
                          value={taskSearch}
                          onChange={(e) => setTaskSearch(e.target.value)}
                          className="w-48 pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-gray-300"
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
                      <div className="relative" ref={toolbarDateRef}>
                        <button
                          type="button"
                          title="Filter by date range"
                          className="p-1 text-gray-500 hover:text-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingToolbarFrom(filterFromDate || '');
                            setPendingToolbarTo(filterToDate || '');
                            setToolbarDateOpen((o) => !o);
                          }}
                        >
                          <CalendarIcon className="w-4 h-4" />
                        </button>
                        {toolbarDateOpen && (
                          <div className="absolute right-0 top-full mt-1 z-40 w-56 rounded-md border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 p-1 text-xs">
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
                            <div className="flex justify-end gap-2 px-1 py-0 border-t border-gray-100">
                              <button className="text-[13px] font-medium text-red-600 hover:underline" onClick={(e) => {
                                e.stopPropagation();
                                setFilterFromDate('');
                                setFilterToDate('');
                                setToolbarDateOpen(false);
                              }}>Clear</button>
                              <button className="text-[13px] font-medium text-black hover:underline" onClick={(e) => {
                                e.stopPropagation();
                                const from = pendingToolbarFrom || '';
                                const to = pendingToolbarTo || pendingToolbarFrom || '';
                                setFilterFromDate(from);
                                setFilterToDate(to);
                                setToolbarDateOpen(false);
                              }}>Filter</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                          Task
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                          Assignees
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                          Assigner
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                          <div className="inline-flex items-center gap-1">
                            <span>Status</span>
                            <span className="relative">
                              <button
                                type="button"
                                className="p-0.5 text-gray-500 hover:text-gray-700"
                                onClick={(e) => { e.stopPropagation(); setHeaderFilterOpen(headerFilterOpen === 'status' ? null : 'status'); }}
                              >
                                <FunnelIcon className="w-3.5 h-3.5" />
                              </button>
                              {headerFilterOpen === 'status' && (
                                <div ref={headerFilterRef} className="absolute left-0 top-full mt-1 z-40 w-48 rounded-md border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 p-2 text-xs font-medium">
                                  <div className="px-2 py-1 text-xs text-gray-800 font-medium">Filter status</div>
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
                                  <div className="flex justify-end gap-3 px-2 py-0 border-t border-gray-100">
                                    <button className="text-[13px] font-medium text-red-600 hover:underline" onClick={(e) => { e.stopPropagation(); setFilterStatusHead([]); }}>Clear</button>
                                    <button className="text-[13px] font-medium text-gray-800 hover:underline" onClick={(e) => { e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
                                  </div>
                                </div>
                              )}
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
                                onClick={(e) => { e.stopPropagation(); setHeaderFilterOpen(headerFilterOpen === 'priority' ? null : 'priority'); }}
                              >
                                <FunnelIcon className="w-3.5 h-3.5" />
                              </button>
                              {headerFilterOpen === 'priority' && (
                                <div ref={headerFilterRef} className="absolute left-0 top-full mt-1 z-40 w-48 rounded-md border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 p-2 text-xs font-medium">
                                  <div className="px-2 py-0.5 text-xs text-gray-700 font-normal">Filter priority</div>
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
                                  <div className="flex justify-end gap-3 px-2 py-0 border-t border-gray-100">
                                    <button className="text-[13px] font-medium text-red-600 hover:underline" onClick={(e) => { e.stopPropagation(); setFilterPriorityHead([]); }}>Clear</button>
                                    <button className="text-[13px] font-medium text-gray-800 hover:underline" onClick={(e) => { e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
                                  </div>
                                </div>
                              )}
                            </span>
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                          Due Date
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
                      {filteredList.map((task: Task) => {
                        return (
                          <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 mr-3">
                          {getStatusIcon(task.status)}
                        </div>
                            <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center flex-wrap gap-2">
                              <span>{task.title}</span>
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
                                                <td className="px-6 py-4 whitespace-nowrap">
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
                                <span className="text-gray-400 text-sm">Unassigned</span>
                              );
                            }

                            // Show loading state if users haven't loaded yet
                            if (users.length === 0) {
                              return (
                                <span className="text-gray-400 text-sm">Loading...</span>
                              );
                            }

                            console.log(`=== DEBUGGING: Looking up assignees for task ${task.title}:`, {
                              assigneeIds,
                              usersAvailable: users.length,
                              users: users.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }))
                            });
                            
                            const assignees = assigneeIds.map(id => {
                              const user = users.find((u: any) => u.id === id);
                              console.log(`=== DEBUGGING: Looking for user ${id}:`, user ? `${user.first_name} ${user.last_name}` : 'NOT FOUND');
                              return user;
                            }).filter(Boolean);
                            
                            console.log(`=== DEBUGGING: Found assignees for ${task.title}:`, assignees.map(a => `${a.first_name} ${a.last_name}`));
                            
                            if (assignees.length === 0) {
                              return (
                                <span className="text-gray-400 text-sm">Unknown User (ID: {assigneeIds.join(', ')}) - Users loaded: {users.length}</span>
                              );
                            }

                            return (
                              <div className="flex items-center">
                                <div className="flex -space-x-2">
                                  {assignees.slice(0, 3).map((assignee: any, index: number) => (
                                    <div
                                      key={assignee.id || index}
                                      className="relative inline-block h-8 w-8 rounded-full ring-2 ring-white"
                                      title={`${assignee.first_name} ${assignee.last_name} (${assignee.email})`}
                                    >
                                      {assignee.avatar_url ? (
                                        <img
                                          className="h-8 w-8 rounded-full object-cover"
                                          src={assignee.avatar_url}
                                          alt={`${assignee.first_name} ${assignee.last_name}`}
                                          onError={(e) => {
                                            // Fallback to initials if image fails to load
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            const nextSibling = target.nextElementSibling as HTMLElement;
                                            if (nextSibling) {
                                              nextSibling.style.display = 'flex';
                                            }
                                          }}
                                        />
                                      ) : null}
                                      <div
                                        className={`h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium ${assignee.avatar_url ? 'hidden' : 'flex'}`}
                                        style={{ display: assignee.avatar_url ? 'none' : 'flex' }}
                                      >
                                        {assignee.first_name?.[0] || 'U'}{assignee.last_name?.[0] || ''}
                                      </div>
                                    </div>
                                  ))}
                                  {assignees.length > 3 && (
                                    <div
                                      className="relative inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center"
                                      title={`+${assignees.length - 3} more assignees`}
                                    >
                                      <span className="text-xs font-medium text-gray-600">
                                        +{assignees.length - 3}
                            </span>
                                    </div>
                                  )}
                                </div>
                                {assignees.length === 1 && (
                                  <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900">
                                      {assignees[0].first_name} {assignees[0].last_name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {assignees[0].email}
                                    </div>
                                  </div>
                                )}
                                {assignees.length > 1 && (
                                  <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900">
                                      {assignees.length} assignees
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {assignees.slice(0, 2).map(a => `${a.first_name} ${a.last_name}`).join(', ')}
                                      {assignees.length > 2 && ` +${assignees.length - 2} more`}
                                    </div>
                                  </div>
                            )}
                          </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            // Display the assigner (created_by_id)
                            if (!task.created_by_id) {
                              return (
                                <span className="text-gray-400 text-sm">No assigner</span>
                              );
                            }

                            // Show loading state if users haven't loaded yet
                            if (users.length === 0) {
                              return (
                                <span className="text-gray-400 text-sm">Loading...</span>
                              );
                            }

                            console.log(`=== DEBUGGING: Looking up assigner for task ${task.title}:`, {
                              created_by_id: task.created_by_id,
                              usersAvailable: users.length
                            });
                            
                            const assigner = users.find((u: any) => u.id === task.created_by_id);
                            
                            console.log(`=== DEBUGGING: Found assigner for ${task.title}:`, assigner ? `${assigner.first_name} ${assigner.last_name}` : 'NOT FOUND');
                            
                            if (!assigner) {
                              return (
                                <span className="text-gray-400 text-sm">Unknown User (ID: {task.created_by_id}) - Users loaded: {users.length}</span>
                              );
                            }

                            return (
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  <div className="relative inline-block h-8 w-8 rounded-full">
                                    {assigner.avatar_url ? (
                                      <img
                                        className="h-8 w-8 rounded-full object-cover"
                                        src={assigner.avatar_url}
                                        alt={`${assigner.first_name} ${assigner.last_name}`}
                                        onError={(e) => {
                                          // Fallback to initials if image fails to load
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const nextSibling = target.nextElementSibling as HTMLElement;
                                          if (nextSibling) {
                                            nextSibling.style.display = 'flex';
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <div
                                      className={`h-8 w-8 rounded-full bg-gradient-to-r from-green-400 to-teal-500 flex items-center justify-center text-white text-xs font-medium ${assigner.avatar_url ? 'hidden' : 'flex'}`}
                                      style={{ display: assigner.avatar_url ? 'none' : 'flex' }}
                                    >
                                      {assigner.first_name?.[0] || 'U'}{assigner.last_name?.[0] || ''}
                        </div>
                      </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {assigner.first_name} {assigner.last_name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {assigner.email}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => startInlineEditTask(e, task, 'status')}>
                          <div className="relative inline-block">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                            {editingTaskId === task.id && editingField === 'status' && (
                              <div ref={inlinePopoverRef} className="absolute z-40 mt-1 w-44 rounded-md border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 p-0.5">
                                <ul className="text-xs">
                                  {[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.BLOCKED, TaskStatus.COMPLETED].map((opt) => (
                                    <li key={opt} className={`px-2 py-1 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${opt===task.status ? 'bg-gray-50' : ''}`} onClick={() => saveInlineEditTask(task.id, opt)}>
                                      <span className="capitalize">{String(opt).replace('_',' ')}</span>
                                      {opt===task.status && <CheckIcon className="w-4 h-4 text-user-blue" />}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => startInlineEditTask(e, task, 'priority')}>
                          <div className="relative inline-block">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {editingTaskId === task.id && editingField === 'priority' && (
                              <div ref={inlinePopoverRef} className="absolute z-40 mt-1 w-40 rounded-md border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 p-0.5">
                                <ul className="text-xs">
                                  {[TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.CRITICAL].map((opt) => (
                                    <li key={opt} className={`px-2 py-1 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${opt===task.priority ? 'bg-gray-50' : ''}`} onClick={() => saveInlineEditTask(task.id, opt)}>
                                      <span className="capitalize">{opt}</span>
                                      {opt===task.priority && <CheckIcon className="w-4 h-4 text-user-blue" />}
                                    </li>
                                  ))}
                                </ul>
                              </div>
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
                              <div ref={inlinePopoverRef} className="absolute z-40 mt-1 w-56 rounded-md border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 p-2">
                                <input
                                  type="date"
                                  value={editValue || ''}
                                  onChange={(e) => { saveInlineEditTask(task.id, e.target.value); }}
                                  className="block w-full h-8 px-2 py-1 border border-gray-300 rounded-sm shadow-none focus:outline-none focus:ring-0 focus:border-gray-400 text-xs"
                                  autoFocus
                                />
                              </div>
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
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
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
                          title="Edit Task"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-2 transition-colors"
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
