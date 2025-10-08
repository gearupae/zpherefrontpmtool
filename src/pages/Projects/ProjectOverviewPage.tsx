import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchProjects, createProject, updateProject, deleteProject } from '../../store/slices/projectSlice';
import { Project, ProjectStatus, ProjectPriority, Customer, User } from '../../types';
import { addNotification } from '../../store/slices/notificationSlice';
import { detectTenantContext } from '../../utils/tenantUtils';
import KanbanBoard from '../../components/Views/KanbanBoard';
import CalendarView from '../../components/Views/CalendarView';
import GanttChart from '../../components/Views/GanttChart';
import {
  FolderIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PauseIcon,
  ArchiveBoxIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  Squares2X2Icon,
  ListBulletIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  RectangleStackIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import DateRangeCalendar from '../../components/UI/DateRangeCalendar';
import './FilterButtons.css';
import ListenMeetingButton from '../../components/Audio/ListenMeetingButton';

interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  planning: number;
  onHold: number;
  cancelled: number;
  archived: number;
  totalBudget: number;
  totalHours: number;
  averageDuration: number;
  priorityDistribution: Record<ProjectPriority, number>;
  statusDistribution: Record<ProjectStatus, number>;
}



// Portal component for rendering filter popups outside table overflow context
const FilterPortal: React.FC<{ children: React.ReactNode; buttonRect: DOMRect | null }> = ({ children, buttonRect }) => {
  if (!buttonRect) return null;
  
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        left: `${buttonRect.left}px`,
        top: `${buttonRect.bottom + 4}px`,
        zIndex: 99999,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
};

// Portal for inline edit popovers (status, priority, dates, team)
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

const ProjectOverviewPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, isLoading, error } = useAppSelector((state) => state.projects) as { projects: Project[], isLoading: boolean, error: string | null };
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [stats, setStats] = useState<ProjectStats>({
    total: 0,
    active: 0,
    completed: 0,
    planning: 0,
    onHold: 0,
    cancelled: 0,
    archived: 0,
    totalBudget: 0,
    totalHours: 0,
    averageDuration: 0,
    priorityDistribution: {
      [ProjectPriority.LOW]: 0,
      [ProjectPriority.MEDIUM]: 0,
      [ProjectPriority.HIGH]: 0,
      [ProjectPriority.CRITICAL]: 0,
    },
    statusDistribution: {
      [ProjectStatus.PLANNING]: 0,
      [ProjectStatus.ACTIVE]: 0,
      [ProjectStatus.ON_HOLD]: 0,
      [ProjectStatus.COMPLETED]: 0,
      [ProjectStatus.CANCELLED]: 0,
      [ProjectStatus.ARCHIVED]: 0,
    },
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    status: ProjectStatus.PLANNING,
    priority: ProjectPriority.MEDIUM,
    start_date: '',
    due_date: '',
    budget: '',
    hourly_rate: '',
    estimated_hours: '',
    customer_id: '',
    tags: '',
    notes: '',
    custom_fields: {}
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const teamDropdownRef = useRef<HTMLDivElement | null>(null);
  const inlinePopoverRef = useRef<HTMLDivElement | null>(null);
  const teamEditorRef = useRef<HTMLDivElement | null>(null);
  const headerFilterRef = useRef<HTMLDivElement | null>(null);
  const toolbarDateRef = useRef<HTMLDivElement | null>(null);
  const [teamFilter, setTeamFilter] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'kanban' | 'calendar' | 'gantt'>('table');
  const [projectData, setProjectData] = useState<Record<string, { 
    members: any[], 
    pendingTasks: number, 
    completionPercentage: number,
    totalTasks: number,
    completedTasks: number
  }>>({});
  const [projectDataLoading, setProjectDataLoading] = useState(false);

  // Inline editing state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'status' | 'priority' | 'start_date' | 'due_date' | 'team' | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [teamEditorOpen, setTeamEditorOpen] = useState<string | null>(null);
  const [teamSelection, setTeamSelection] = useState<string[]>([]);
  const [teamInlineFilter, setTeamInlineFilter] = useState('');

  // Inline edit anchoring rects
  const [inlineEditRect, setInlineEditRect] = useState<DOMRect | null>(null);
  const [teamEditorRect, setTeamEditorRect] = useState<DOMRect | null>(null);

  // Header filters
  const [filterStatus, setFilterStatus] = useState<ProjectStatus[]>([]);
  const [filterPriority, setFilterPriority] = useState<ProjectPriority[]>([]);
  const [filterTeamUserIds, setFilterTeamUserIds] = useState<string[]>([]);
  const [filterClientIds, setFilterClientIds] = useState<string[]>([]);
  const [teamFilterQuery, setTeamFilterQuery] = useState('');
  // Header date filters
  const [startFilterFrom, setStartFilterFrom] = useState('');
  const [startFilterTo, setStartFilterTo] = useState('');
  const [dueFilterFrom, setDueFilterFrom] = useState('');
  const [dueFilterTo, setDueFilterTo] = useState('');
  // Pending selections (apply on Update)
  const [pendingStartFrom, setPendingStartFrom] = useState('');
  const [pendingStartTo, setPendingStartTo] = useState('');
  const [pendingDueFrom, setPendingDueFrom] = useState('');
  const [pendingDueTo, setPendingDueTo] = useState('');
  const [pendingToolbarFrom, setPendingToolbarFrom] = useState('');
  const [pendingToolbarTo, setPendingToolbarTo] = useState('');
  // Toolbar date popover
  const [toolbarDateOpen, setToolbarDateOpen] = useState(false);

  // Inline tag input state (for "Add tag")
  const [showTagInput, setShowTagInput] = useState(false);
  const tagEditRef = useRef<HTMLSpanElement | null>(null);
  const commitTagFromRef = () => {
    const clean = (tagEditRef.current?.innerText || '').trim();
    if (clean) {
      const prev = (newProject.tags || '').trim();
      const newTags = prev ? `${prev}${prev.endsWith(',') ? ' ' : ', '}${clean}` : clean;
      setNewProject({ ...newProject, tags: newTags });
    }
    if (tagEditRef.current) tagEditRef.current.innerText = '';
    setShowTagInput(false);
  };
  useEffect(() => {
    if (showTagInput) {
      // Focus the contentEditable span when shown
      setTimeout(() => tagEditRef.current?.focus(), 0);
    }
  }, [showTagInput]);
 
// Table sorting state
  const [sortField, setSortField] = useState<'created_at' | 'name' | 'status' | 'priority' | 'team' | 'start_date' | 'due_date' | 'tasks' | 'time_log' | 'completion' | 'budget'>('created_at');
  const [headerFilterOpen, setHeaderFilterOpen] = useState<null | 'status' | 'priority' | 'team' | 'client' | 'start_date' | 'due_date'>(null);
  const [filterButtonRect, setFilterButtonRect] = useState<DOMRect | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const onHeaderDblClick = (field: 'created_at' | 'name' | 'status' | 'priority' | 'start_date' | 'due_date' | 'tasks' | 'time_log' | 'completion' | 'budget') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Default to desc for created_at, asc otherwise
      setSortDir(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startInlineEdit = (e: React.MouseEvent, project: Project, field: 'status' | 'priority' | 'start_date' | 'due_date') => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    if (target && typeof target.getBoundingClientRect === 'function') {
      setInlineEditRect(target.getBoundingClientRect());
    } else {
      setInlineEditRect(null);
    }
    setEditingProjectId(project.id);
    setEditingField(field);
    if (field === 'status') setEditValue(project.status);
    if (field === 'priority') setEditValue(project.priority);
    if (field === 'due_date') {
      // Normalize to yyyy-mm-dd for input type=date
      const d = project.due_date ? new Date(project.due_date) : null;
      const yyyyMmDd = d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '';
      setEditValue(yyyyMmDd);
    }
    if (field === 'start_date') {
      // Normalize to yyyy-mm-dd for input type=date
      const s = project.start_date ? new Date(project.start_date) : null;
      const yyyyMmDd = s ? new Date(s.getTime() - s.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '';
      setEditValue(yyyyMmDd);
    }
  };

  const saveInlineEdit = async (projectId: string, valueOverride?: any) => {
    try {
      if (!editingField) return;
      const value = valueOverride !== undefined ? valueOverride : editValue;
      if (editingField === 'status') {
        await dispatch(updateProject({ id: projectId, data: { status: value } })).unwrap();
      } else if (editingField === 'priority') {
        await dispatch(updateProject({ id: projectId, data: { priority: value } })).unwrap();
      } else if (editingField === 'due_date') {
        const iso = value ? new Date(`${value}T00:00:00Z`).toISOString() : undefined;
        await dispatch(updateProject({ id: projectId, data: { due_date: iso } })).unwrap();
      } else if (editingField === 'start_date') {
        const iso = value ? new Date(`${value}T00:00:00Z`).toISOString() : undefined;
        await dispatch(updateProject({ id: projectId, data: { start_date: iso } })).unwrap();
      }
      setEditingProjectId(null);
      setEditingField(null);
      setEditValue(null);
    } catch (err) {
      console.error('Inline save failed:', err);
    }
  };

  const cancelInlineEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProjectId(null);
    setEditingField(null);
    setEditValue(null);
    setInlineEditRect(null);
  };

  const openTeamInlineEditor = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    if (target && typeof target.getBoundingClientRect === 'function') {
      setTeamEditorRect(target.getBoundingClientRect());
    } else {
      setTeamEditorRect(null);
    }
    setTeamEditorOpen(projectId);
    // Seed selection from current members if available
    const current = projectData[projectId]?.members || [];
    const ids = current.map((m: any) => m.id).filter(Boolean);
    setTeamSelection(ids);
  };

  const toggleTeamSelect = (userId: string) => {
    setTeamSelection(prev => (prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]));
  };

  const saveTeamInlineEdit = async (projectId: string) => {
    try {
      const membersPayload = teamSelection.map(uid => ({ user_id: uid, role: 'member', can_create_tasks: true }));
      await dispatch(updateProject({ id: projectId, data: { members: membersPayload as any } })).unwrap();
      // Optimistically update local team bubbles for immediate feedback
      setProjectData((prev) => {
        const selectedUsers = availableUsers
          .filter(u => teamSelection.includes(u.id))
          .map(u => ({
            id: u.id,
            name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
            avatar: u.avatar_url,
          }));
        return {
          ...prev,
          [projectId]: {
            ...(prev[projectId] || {}),
            members: selectedUsers,
          },
        } as any;
      });
      setTeamEditorOpen(null);
    } catch (e) {
      console.error('Failed to save team members:', e);
    }
  };

  const cancelTeamInlineEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTeamEditorOpen(null);
    setTeamSelection([]);
    setTeamEditorRect(null);
  };

  useEffect(() => {
    dispatch(fetchProjects({}));
    fetchCustomers();
    fetchAvailableUsers();
  }, [dispatch]);

  // Re-fetch when the path changes (e.g., switching to /zphere-admin/...)
  useEffect(() => {
    dispatch(fetchProjects({}));
    fetchCustomers();
  }, [dispatch, location.pathname]);

  useEffect(() => {
    if (!hasLoadedOnce) setHasLoadedOnce(true);
    if (projects.length > 0) {
      fetchProjectsData();
    }
  }, [projects, hasLoadedOnce]);

  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(fetchProjects({
        q: projectSearch || undefined,
        from_date: filterFromDate || undefined,
        to_date: filterToDate || undefined,
      }));
    }, 300);
    return () => clearTimeout(t);
  }, [dispatch, projectSearch, filterFromDate, filterToDate]);

  const fetchProjectsData = async () => {
    if (projectDataLoading) return; // Prevent concurrent calls
    
    setProjectDataLoading(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      const { detectTenantContext } = await import('../../utils/tenantUtils');
      const ctx = detectTenantContext();
      const data: Record<string, any> = {};
      
      // Fetch real data for each project
      await Promise.all(
        projects.map(async (project) => {
          try {
            // Prefer embedded members if present
            let members: any[] = Array.isArray((project as any).members)
              ? (project as any).members.map((pm: any) => ({
                  id: pm.user?.id || pm.user_id || pm.id,
                  name: pm.user?.full_name || `${pm.user?.first_name || ''} ${pm.user?.last_name || ''}`.trim(),
                  avatar: pm.user?.avatar_url,
                  role: pm.role || 'member',
                }))
              : [];

            // Fallback: fetch members from API when not embedded
            if (members.length === 0) {
              try {
const membersEndpoint = `/teams/projects/${project.id}/members`;
                const membersRes = await apiClient.get(membersEndpoint);
                const rawMembers = Array.isArray(membersRes.data)
                  ? membersRes.data
                  : (membersRes.data?.members || []);
                members = rawMembers.map((pm: any) => ({
                  id: pm.user?.id || pm.user_id || pm.id,
                  name: pm.user?.full_name || `${pm.user?.first_name || ''} ${pm.user?.last_name || ''}`.trim() || pm.name,
                  avatar: pm.user?.avatar_url,
                  role: pm.role || 'member',
                }));
              } catch (mErr) {
                // Silently ignore, we'll show empty members for this project
              }
            }

            // Fetch project tasks to calculate pending tasks and completion
const tasksEndpoint = `/tasks?project_id=${project.id}`;
            const tasksResponse = await apiClient.get(tasksEndpoint);
            const tasks = tasksResponse.data || [];
            
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter((task: any) => task.status === 'completed').length;
            const pendingTasks = tasks.filter((task: any) => 
              ['todo', 'in_progress', 'in_review', 'blocked'].includes(task.status)
            ).length;
            
            const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            data[project.id] = {
              members,
              pendingTasks,
              completionPercentage,
              totalTasks,
              completedTasks
            };
          } catch (projectError) {
            console.error(`Failed to fetch data for project ${project.id}:`, projectError);
            // Fallback to empty data for this project
            data[project.id] = {
              members: [],
              pendingTasks: 0,
              completionPercentage: 0,
              totalTasks: 0,
              completedTasks: 0
            };
          }
        })
      );
      
      setProjectData(data);
    } catch (error) {
      console.error('Failed to fetch project data:', error);
      // Set empty data for all projects on error
      const emptyData: Record<string, any> = {};
      projects.forEach(project => {
        emptyData[project.id] = {
          members: [],
          pendingTasks: 0,
          completionPercentage: 0,
          totalTasks: 0,
          completedTasks: 0
        };
      });
      setProjectData(emptyData);
    } finally {
      setProjectDataLoading(false);
    }
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      // Close create-form team dropdown
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(target)) {
        setIsTeamDropdownOpen(false);
      }
      // Close inline edit popovers (status/priority/date) when clicking outside
      if (editingProjectId && inlinePopoverRef.current && !inlinePopoverRef.current.contains(target)) {
        cancelInlineEdit();
      }
      // Close inline team editor when clicking outside
      if (teamEditorOpen && teamEditorRef.current && !teamEditorRef.current.contains(target)) {
        setTeamEditorOpen(null);
      }
      // Close header filter popover
      if (headerFilterOpen && headerFilterRef.current && !headerFilterRef.current.contains(target)) {
        setHeaderFilterOpen(null);
      }
      // Close toolbar date popover
      if (toolbarDateOpen && toolbarDateRef.current && !toolbarDateRef.current.contains(target)) {
        setToolbarDateOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [editingProjectId, teamEditorOpen, headerFilterOpen, toolbarDateOpen]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const fetchCustomers = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      // Prefer trailing slash to avoid redirect edge-cases under proxies
// Always use tenant customers endpoint
      const response = await apiClient.get('/customers/');
      const list = Array.isArray(response.data)
        ? (response.data as unknown as Customer[])
        : (response.data?.customers as Customer[]) || [];
      setCustomers(list || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/teams/members');
      setAvailableUsers(Array.isArray(response.data) ? (response.data as unknown as User[]) : []);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      setAvailableUsers([]);
    }
  };

  const calculateStats = useCallback(() => {
    const stats: ProjectStats = {
      total: projects.length,
      active: projects.filter(p => p.status === ProjectStatus.ACTIVE).length,
      completed: projects.filter(p => p.status === ProjectStatus.COMPLETED).length,
      planning: projects.filter(p => p.status === ProjectStatus.PLANNING).length,
      onHold: projects.filter(p => p.status === ProjectStatus.ON_HOLD).length,
      cancelled: projects.filter(p => p.status === ProjectStatus.CANCELLED).length,
      archived: projects.filter(p => p.status === ProjectStatus.ARCHIVED).length,
      totalBudget: projects.reduce((sum, p) => sum + (parseFloat(p.budget?.toString() || '0') || 0), 0),
      totalHours: projects.reduce((sum, p) => sum + (parseFloat(p.estimated_hours?.toString() || '0') || 0), 0),
      averageDuration: 0,
      priorityDistribution: {
        [ProjectPriority.LOW]: projects.filter(p => p.priority === ProjectPriority.LOW).length,
        [ProjectPriority.MEDIUM]: projects.filter(p => p.priority === ProjectPriority.MEDIUM).length,
        [ProjectPriority.HIGH]: projects.filter(p => p.priority === ProjectPriority.HIGH).length,
        [ProjectPriority.CRITICAL]: projects.filter(p => p.priority === ProjectPriority.CRITICAL).length,
      },
      statusDistribution: {
        [ProjectStatus.PLANNING]: projects.filter(p => p.status === ProjectStatus.PLANNING).length,
        [ProjectStatus.ACTIVE]: projects.filter(p => p.status === ProjectStatus.ACTIVE).length,
        [ProjectStatus.ON_HOLD]: projects.filter(p => p.status === ProjectStatus.ON_HOLD).length,
        [ProjectStatus.COMPLETED]: projects.filter(p => p.status === ProjectStatus.COMPLETED).length,
        [ProjectStatus.CANCELLED]: projects.filter(p => p.status === ProjectStatus.CANCELLED).length,
        [ProjectStatus.ARCHIVED]: projects.filter(p => p.status === ProjectStatus.ARCHIVED).length,
      },
    };
    setStats(stats);
  }, [projects]);

  useEffect(() => {
    if (projects.length > 0) {
      calculateStats();
      setRecentProjects(projects.slice(0, 5));
    }
  }, [projects, calculateStats]);

const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
      try {
        const projectData: any = {
          ...newProject,
          budget: newProject.budget ? parseFloat(newProject.budget) : undefined,
          hourly_rate: newProject.hourly_rate ? parseFloat(newProject.hourly_rate) : undefined,
          estimated_hours: newProject.estimated_hours ? parseFloat(newProject.estimated_hours) : undefined,
          start_date: newProject.start_date ? new Date(newProject.start_date).toISOString() : undefined,
          due_date: newProject.due_date ? new Date(newProject.due_date).toISOString() : undefined,
        };
        // Include selected members in create payload
        if (selectedMemberIds.length > 0) {
          projectData.members = selectedMemberIds.map((userId) => ({
            user_id: userId,
            role: 'member',
            can_create_tasks: true,
          }));
        }

        // Normalize tags into custom_fields.tags as an array
        if ((newProject.tags || '').trim()) {
          const tagArray = (newProject.tags || '')
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
          projectData.custom_fields = {
            ...(projectData.custom_fields || {}),
            tags: tagArray,
          };
          // also remove plain string tags from root to avoid backend rejecting unknown fields
          delete projectData.tags;
        }

        const created = await dispatch(createProject(projectData)).unwrap();

        dispatch(addNotification({
          type: 'success',
          title: 'Project Created',
          message: 'Your project has been created successfully.',
          duration: 3000,
        }));

        setShowCreateForm(false);
        setNewProject({
          name: '',
          description: '',
          status: ProjectStatus.PLANNING,
          priority: ProjectPriority.MEDIUM,
          start_date: '',
          due_date: '',
          budget: '',
          hourly_rate: '',
          estimated_hours: '',
          customer_id: '',
          tags: '',
          notes: '',
          custom_fields: {}
        });
        setSelectedMemberIds([]);
      } catch (error) {
        dispatch(addNotification({
          type: 'error',
          title: 'Creation Failed',
        message: error as string,
          duration: 5000,
        }));
      }
  };

  const handleProjectUpdate = async (projectId: string, updates: Partial<Project>) => {
    try {
      await dispatch(updateProject({ id: projectId, data: updates })).unwrap();
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleEditProject = (projectId: string) => {
    // Navigate to project detail page with edit tab active
    navigate(`/projects/${projectId}?tab=edit`);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await dispatch(deleteProject(projectId)).unwrap();
      dispatch(addNotification({
        type: 'success',
        title: 'Project Deleted',
        message: 'Project has been successfully deleted.',
        duration: 3000,
      }));
    } catch (error) {
      console.error('Failed to delete project:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Deletion Failed',
        message: 'Failed to delete project. Please try again.',
        duration: 5000,
      }));
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    // Use standard pastel tag colors used across the app
    switch (status) {
      case ProjectStatus.PLANNING:
        return 'bg-gray-100 text-gray-800';
      case ProjectStatus.ACTIVE:
        return 'bg-blue-100 text-blue-800';
      case ProjectStatus.ON_HOLD:
        return 'bg-yellow-100 text-yellow-800';
      case ProjectStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case ProjectStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      case ProjectStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: ProjectPriority) => {
    // Use standard pastel tag colors used across the app
    switch (priority) {
      case ProjectPriority.LOW:
        return 'bg-green-100 text-green-600';
      case ProjectPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-600';
      case ProjectPriority.HIGH:
        return 'bg-orange-100 text-orange-600';
      case ProjectPriority.CRITICAL:
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Vibrant, mid-dark mappings for table badges only
  const getStatusColorBold = (status: ProjectStatus) => {
    // Light (pastel) badges for table
    switch (status) {
      case ProjectStatus.PLANNING:
        return 'bg-orange-100 text-orange-700';
      case ProjectStatus.ACTIVE:
        return 'bg-green-100 text-green-700';
      case ProjectStatus.ON_HOLD:
        return 'bg-yellow-100 text-yellow-700';
      case ProjectStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case ProjectStatus.CANCELLED:
        return 'bg-red-100 text-red-700';
      case ProjectStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColorBold = (priority: ProjectPriority) => {
    // Light (pastel) badges for table
    switch (priority) {
      case ProjectPriority.LOW:
        return 'bg-green-100 text-green-700';
      case ProjectPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-700';
      case ProjectPriority.HIGH:
        return 'bg-orange-100 text-orange-700';
      case ProjectPriority.CRITICAL:
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: ProjectStatus) => {
    // Color the leading icon based on status
    const colorClass = (() => {
      switch (status) {
        case ProjectStatus.PLANNING:
          return 'text-orange-600';
        case ProjectStatus.ACTIVE:
          return 'text-green-600';
        case ProjectStatus.ON_HOLD:
          return 'text-yellow-600';
        case ProjectStatus.COMPLETED:
          return 'text-green-700';
        case ProjectStatus.CANCELLED:
          return 'text-red-600';
        case ProjectStatus.ARCHIVED:
          return 'text-gray-500';
        default:
          return 'text-gray-500';
      }
    })();

    const cls = `h-5 w-5 ${colorClass}`;
    switch (status) {
      case ProjectStatus.ACTIVE:
        return <ArrowTrendingUpIcon className={cls} />;
      case ProjectStatus.COMPLETED:
        return <CheckCircleIcon className={cls} />;
      case ProjectStatus.PLANNING:
        return <ClockIcon className={cls} />;
      case ProjectStatus.ON_HOLD:
        return <PauseIcon className={cls} />;
      case ProjectStatus.CANCELLED:
        return <ExclamationTriangleIcon className={cls} />;
      case ProjectStatus.ARCHIVED:
        return <ArchiveBoxIcon className={cls} />;
      default:
        return <FolderIcon className={cls} />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Derived: sorted projects for table
  const displayedProjects = useMemo(() => {
    const startOfDayLocal = (dStr: string) => {
      const d = new Date(dStr);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    };
    const endOfDayLocal = (dStr: string) => {
      const d = new Date(dStr);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    };
    // Apply header filters first
    let arr = [...projects];
    if (filterStatus.length > 0) {
      arr = arr.filter(p => filterStatus.includes(p.status));
    }
    if (filterPriority.length > 0) {
      arr = arr.filter(p => filterPriority.includes(p.priority));
    }
    if (filterTeamUserIds && filterTeamUserIds.length > 0) {
      arr = arr.filter(p => {
        const members = (projectData[p.id]?.members && projectData[p.id].members.length > 0)
          ? projectData[p.id].members
          : (((p as any).members || []).map((pm: any) => ({ id: pm.user?.id || pm.user_id || pm.id })));
        return Array.isArray(members) && members.some((m: any) => filterTeamUserIds.includes(m.id));
      });
    }
    if (filterClientIds && filterClientIds.length > 0) {
      arr = arr.filter(p => (p as any).customer_id && filterClientIds.includes((p as any).customer_id));
    }
    // Start date header filters
    if (startFilterFrom) {
      const from = startOfDayLocal(startFilterFrom);
      arr = arr.filter(p => p.start_date && new Date(p.start_date) >= from);
    }
    if (startFilterTo) {
      const to = endOfDayLocal(startFilterTo);
      arr = arr.filter(p => p.start_date && new Date(p.start_date) <= to);
    }
    // Due date header filters
    if (dueFilterFrom) {
      const from = startOfDayLocal(dueFilterFrom);
      arr = arr.filter(p => p.due_date && new Date(p.due_date) >= from);
    }
    if (dueFilterTo) {
      const to = endOfDayLocal(dueFilterTo);
      arr = arr.filter(p => p.due_date && new Date(p.due_date) <= to);
    }

    // Apply sorting
    const statusOrder: Record<string, number> = { planning: 1, active: 2, on_hold: 3, completed: 4, cancelled: 5, archived: 6 };
    const priorityOrder: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

    arr.sort((a, b) => {
      let av: any = 0;
      let bv: any = 0;
      switch (sortField) {
        case 'created_at':
          av = a.created_at ? new Date(a.created_at).getTime() : 0;
          bv = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
        case 'name':
          av = (a.name || '').toLowerCase();
          bv = (b.name || '').toLowerCase();
          break;
        case 'status':
          av = statusOrder[a.status] ?? 0;
          bv = statusOrder[b.status] ?? 0;
          break;
        case 'priority':
          av = priorityOrder[a.priority] ?? 0;
          bv = priorityOrder[b.priority] ?? 0;
          break;
        case 'team': {
          const ac = (projectData[a.id]?.members?.length) ?? (((a as any).members || []).length) ?? 0;
          const bc = (projectData[b.id]?.members?.length) ?? (((b as any).members || []).length) ?? 0;
          av = ac; bv = bc;
          break;
        }
        case 'start_date':
          av = a.start_date ? new Date(a.start_date).getTime() : 0;
          bv = b.start_date ? new Date(b.start_date).getTime() : 0;
          break;
        case 'due_date':
          av = a.due_date ? new Date(a.due_date).getTime() : 0;
          bv = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        case 'tasks': {
          const at = projectData[a.id]?.pendingTasks ?? 0;
          const bt = projectData[b.id]?.pendingTasks ?? 0;
          av = at; bv = bt;
          break;
        }
        case 'time_log':
          av = a.actual_hours || 0;
          bv = b.actual_hours || 0;
          break;
        case 'completion': {
          const ap = projectData[a.id]?.completionPercentage ?? 0;
          const bp = projectData[b.id]?.completionPercentage ?? 0;
          av = ap; bv = bp;
          break;
        }
        case 'budget':
          av = a.budget || 0;
          bv = b.budget || 0;
          break;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [projects, projectData, sortField, sortDir, filterStatus, filterPriority, filterTeamUserIds, filterClientIds, startFilterFrom, startFilterTo, dueFilterFrom, dueFilterTo]);

  // Avoid blocking spinner; render the page and let data populate without an overlay
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <div className="flex-[0.35]">
          <h1 className="page-title font-bold text-gray-900">Project Overview</h1>
          <div className="text-gray-600 mt-1 text-sm">Plan, track, and deliver projects efficiently</div>
        </div>
        <div className="flex-[0.65] flex justify-end">
          <div className="flex space-x-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border ${viewMode === 'cards' ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`}
              aria-pressed={viewMode === 'cards'}
            >
              <FolderIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border ${viewMode === 'table' ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`}
              aria-pressed={viewMode === 'table'}
            >
              <ListBulletIcon className="w-4 h-4" />
              <span className="text-sm font-medium">List</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border ${viewMode === 'kanban' ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`}
              aria-pressed={viewMode === 'kanban'}
            >
              <Squares2X2Icon className="w-4 h-4" />
              <span className="text-sm font-medium">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border ${viewMode === 'calendar' ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`}
              aria-pressed={viewMode === 'calendar'}
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border ${viewMode === 'gantt' ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`}
              aria-pressed={viewMode === 'gantt'}
            >
              <ChartBarIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Timeline</span>
            </button>
          </div>
          
            {/* Listen Meeting button next to view controls */}
            <ListenMeetingButton />

            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-page-action flex items-center btn-styled btn-create-auto" style={{ backgroundColor: 'rgb(0, 0, 0)', color: 'white', borderColor: 'rgb(0, 0, 0)', fontSize: '0.875rem', padding: '0.2rem 0.75rem' }}
            >
            <PlusIcon className="h-5 w-5" />
            <span>New Project</span>
          </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Create Project Form */}
      {showCreateForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-secondary-900 mb-4">Create New Project</h2>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-secondary-700">
                  Project Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="customer_id" className="block text-sm font-medium text-secondary-700">
                    Customer
                  </label>
                  <div className="flex items-center gap-2">
                    {newProject.tags?.trim() && (
                      <span className="text-sm text-gray-800">{newProject.tags}</span>
                    )}
                    {!showTagInput ? (
                      <span
                        className="text-sm text-gray-600 hover:text-black cursor-text select-none"
                        onClick={() => setShowTagInput(true)}
                      >
                        add tag
                      </span>
                    ) : (
                      <span
                        ref={tagEditRef}
                        contentEditable
                        role="textbox"
                        aria-label="Add tag"
                        className="text-sm bg-transparent border-none outline-none focus:outline-none px-0 py-0 min-w-[1ch]"
                        onBlur={commitTagFromRef}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitTagFromRef(); }
                          if (e.key === 'Escape') { e.preventDefault(); if (tagEditRef.current) tagEditRef.current.innerText = ''; setShowTagInput(false); }
                        }}
                      />
                    )}
                  </div>
                </div>
                <select
                  id="customer_id"
                  value={newProject.customer_id}
                  onChange={(e) => setNewProject({ ...newProject, customer_id: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
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
                <label htmlFor="status" className="block text-sm font-medium text-secondary-700">
                  Status
                </label>
                <select
                  id="status"
                  value={newProject.status}
                  onChange={(e) => setNewProject({ ...newProject, status: e.target.value as ProjectStatus })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value={ProjectStatus.PLANNING}>Planning</option>
                  <option value={ProjectStatus.ACTIVE}>Active</option>
                  <option value={ProjectStatus.ON_HOLD}>On Hold</option>
                  <option value={ProjectStatus.COMPLETED}>Completed</option>
                  <option value={ProjectStatus.CANCELLED}>Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-secondary-700">
                  Priority
                </label>
                <select
                  id="priority"
                  value={newProject.priority}
                  onChange={(e) => setNewProject({ ...newProject, priority: e.target.value as ProjectPriority })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value={ProjectPriority.LOW}>Low</option>
                  <option value={ProjectPriority.MEDIUM}>Medium</option>
                  <option value={ProjectPriority.HIGH}>High</option>
                  <option value={ProjectPriority.CRITICAL}>Critical</option>
                </select>
              </div>
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-secondary-700">
                  Start Date
                </label>
                <input
                  type="date"
                  id="start_date"
                  value={newProject.start_date}
                  onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-secondary-700">
                  Due Date
                </label>
                <input
                  type="date"
                  id="due_date"
                  value={newProject.due_date}
                  onChange={(e) => setNewProject({ ...newProject, due_date: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Team Members moved near budget row */}
            <div className="grid grid-cols-1">
              <div ref={teamDropdownRef}>
                <label className="block text-sm font-medium text-secondary-700">
                  Team Members
                </label>
                <div
                  className="mt-1 w-full border border-secondary-300 rounded-md bg-white cursor-pointer"
                  onClick={() => setIsTeamDropdownOpen((o) => !o)}
                >
                  <div className="px-3 py-2 flex flex-wrap gap-1 min-h-[40px]">
                    {selectedMemberIds.length === 0 ? (
                      <span className="text-sm text-gray-500">Select team members</span>
                    ) : (
                      availableUsers
                        .filter(u => selectedMemberIds.includes(u.id))
                        .slice(0, 4)
                        .map(u => (
                          <span key={u.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                            {u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim()}
                          </span>
                        ))
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
                            className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <ul className="py-1">
                        {availableUsers
                          .filter((u) => {
                            const name = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase();
                            return name.includes(teamFilter.toLowerCase()) || (u.email || '').toLowerCase().includes(teamFilter.toLowerCase());
                          })
                          .map((user) => {
                            const name = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
                            const selected = selectedMemberIds.includes(user.id);
                            return (
                              <li
                                key={user.id}
                                className={`px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
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
                          <li className="px-3 py-2 text-sm text-gray-500">No team members found</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-secondary-700">
                  Budget ($)
                </label>
                <input
                  type="number"
                  id="budget"
                  min="0"
                  step="0.01"
                  value={newProject.budget}
                  onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="hourly_rate" className="block text-sm font-medium text-secondary-700">
                  Hourly Rate ($)
                </label>
                <input
                  type="number"
                  id="hourly_rate"
                  min="0"
                  step="0.01"
                  value={newProject.hourly_rate}
                  onChange={(e) => setNewProject({ ...newProject, hourly_rate: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="estimated_hours" className="block text-sm font-medium text-secondary-700">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  id="estimated_hours"
                  min="0"
                  value={newProject.estimated_hours}
                  onChange={(e) => setNewProject({ ...newProject, estimated_hours: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-secondary-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Brief description of the project..."
                />
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-secondary-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={newProject.notes}
                  onChange={(e) => setNewProject({ ...newProject, notes: e.target.value })}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewProject({
                    name: '',
                    description: '',
                    status: ProjectStatus.PLANNING,
                    priority: ProjectPriority.MEDIUM,
                    start_date: '',
                    due_date: '',
                    budget: '',
                    hourly_rate: '',
                    estimated_hours: '',
                    customer_id: '',
                    tags: '',
                    notes: '',
                    custom_fields: {}
                  });
                  setSelectedMemberIds([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-page-action btn-no-minh"
              >
                Create Project
              </button>
            </div>
              </form>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="metric-card metric-blue bg-white px-4 py-3 rounded-lg shadow border-t-4 border-blue-600">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FolderIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="metric-value text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="metric-card metric-green bg-white px-4 py-3 rounded-lg shadow border-t-4 border-green-600">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="metric-value text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="metric-card metric-yellow bg-white px-4 py-3 rounded-lg shadow border-t-4 border-yellow-600">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="metric-value text-2xl font-bold">{formatCurrency(stats.totalBudget)}</p>
            </div>
          </div>
        </div>

        <div className="metric-card metric-purple bg-white px-4 py-3 rounded-lg shadow border-t-4 border-purple-600">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg">
              <ClockIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="metric-value text-2xl font-bold">{stats.totalHours}</p>
            </div>
          </div>
        </div>

        <div className="metric-card metric-red bg-white px-4 py-3 rounded-lg shadow border-t-4 border-red-600">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Critical Projects</p>
              <p className="metric-value text-2xl font-bold">{stats.priorityDistribution[ProjectPriority.CRITICAL]}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects View */}
      {projects.length === 0 && hasLoadedOnce ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No projects yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first project.
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-green-100 rounded-lg">
                          {getStatusIcon(project.status)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">{project.name}</h3>
                        <p className="text-sm text-gray-500">
                          Created {new Date(project.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {project.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(project.priority)}`}>
                          {project.priority}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div>
                        {project.budget && (
                          <span className="font-medium text-gray-900">{formatCurrency(project.budget)}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4">
                        {project.due_date && (
                          <span>Due {new Date(project.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'table' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                All Projects ({projects.length})
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-40 pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-gray-300"
                  />
                </div>
                <button
                  type="button"
                  title="Refresh"
                  className="p-1 text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    // Close any open popovers
                    setHeaderFilterOpen(null);
                    setToolbarDateOpen(false);

                    // Reset search
                    setProjectSearch('');

                    // Reset sorting to default: latest created first
                    setSortField('created_at');
                    setSortDir('desc');

                    // Reset header filters
                    setFilterStatus([]);
                    setFilterPriority([]);
setFilterTeamUserIds([]);
                    setTeamFilterQuery('');

                    // Reset all date filters (toolbar + header)
                    setFilterFromDate('');
                    setFilterToDate('');
                    setStartFilterFrom('');
                    setStartFilterTo('');
                    setDueFilterFrom('');
                    setDueFilterTo('');

                    // Reset any pending selections
                    setPendingToolbarFrom('');
                    setPendingToolbarTo('');
                    setPendingStartFrom('');
                    setPendingStartTo('');
                    setPendingDueFrom('');
                    setPendingDueTo('');

                    // Fetch unfiltered list
                    dispatch(fetchProjects({}));
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
                    <div className="absolute right-0 top-full mt-1 z-40 w-64 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{borderRadius: '5px'}}>
                      <div className="px-1 pb-1">
<DateRangeCalendar size="sm"
                          initialFrom={pendingToolbarFrom || null}
                          initialTo={pendingToolbarTo || null}
                          onChange={(from, to) => {
                            if (from && !to) {
                              setPendingToolbarFrom(from);
                              setPendingToolbarFrom(from);
                            } else {
                              setPendingToolbarFrom(from || '');
                              setPendingToolbarTo(to || '');
                            }
                          }}
                        />
                      </div>
<div className="flex justify-end gap-2 px-1.5 py-1 border-t border-gray-100 mt-1">
<button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); const newFrom = ''; const newTo = ''; setFilterFromDate(newFrom); setFilterToDate(newTo); setToolbarDateOpen(false); const fromCandidates = [newFrom, startFilterFrom, dueFilterFrom].filter(Boolean) as string[]; const toCandidates = [newTo, startFilterTo, dueFilterTo].filter(Boolean) as string[]; const toDateObj = (s: string) => new Date(s); const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; const minFrom = fromCandidates.length > 0 ? ymd(new Date(Math.min(...fromCandidates.map(s => toDateObj(s).getTime())))) : ''; const maxTo = toCandidates.length > 0 ? ymd(new Date(Math.max(...toCandidates.map(s => toDateObj(s).getTime())))) : ''; const params: { q?: string; from_date?: string; to_date?: string } = {}; if (projectSearch && projectSearch.trim()) params.q = projectSearch.trim(); if (minFrom) params.from_date = minFrom; if (maxTo) params.to_date = maxTo; dispatch(fetchProjects(Object.keys(params).length ? params : undefined)); }}>Clear</button>
<button className="filter-popup-btn filter-popup-btn-filter" onClick={(e) => {
                          e.stopPropagation();
                          const from = pendingToolbarFrom || '';
                          const to = pendingToolbarTo || pendingToolbarFrom || '';
                          setFilterFromDate(from);
                          setFilterToDate(to);
                          setToolbarDateOpen(false);
                          const fromCandidates = [from, startFilterFrom, dueFilterFrom].filter(Boolean) as string[];
                          const toCandidates = [to, startFilterTo, dueFilterTo].filter(Boolean) as string[];
                          const toDateObj = (s: string) => new Date(s);
                          const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                          const minFrom = fromCandidates.length > 0 ? ymd(new Date(Math.min(...fromCandidates.map(s => toDateObj(s).getTime())))) : '';
                          const maxTo = toCandidates.length > 0 ? ymd(new Date(Math.max(...toCandidates.map(s => toDateObj(s).getTime())))) : '';
                          const params: { q?: string; from_date?: string; to_date?: string } = {};
                          if (projectSearch && projectSearch.trim()) params.q = projectSearch.trim();
                          if (minFrom) params.from_date = minFrom;
                          if (maxTo) params.to_date = maxTo;
                          dispatch(fetchProjects(Object.keys(params).length ? params : undefined));
                        }}>Filter</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
      </div>
            <div className="overflow-x-auto projects-table" style={{backgroundColor: 'rgb(249, 250, 251)'}}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th onDoubleClick={() => onHeaderDblClick('name')} className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none" title="Double‑click to sort by Project Name">
                      <div className="inline-flex items-center gap-1">
                        <span>Project</span>
                        {sortField === 'name' && (
                          sortDir === 'asc' ? (
                            <ChevronUpIcon className="w-3.5 h-3.5 text-gray-600" />
                          ) : (
                            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-600" />
                          )
                        )}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                      <div className="inline-flex items-center gap-1">
                        <span>Client</span>
                        <span className="relative">
                          <button
                            type="button"
                            className="p-0.5 text-gray-500 hover:text-gray-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              const isOpening = headerFilterOpen !== 'client';
                              if (isOpening) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setFilterButtonRect(rect);
                              }
                              setHeaderFilterOpen(isOpening ? 'client' : null);
                            }}
                          >
                            <FunnelIcon className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </div>
                    </th>
                    <th onDoubleClick={() => onHeaderDblClick('status')} className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
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
                    <th onDoubleClick={() => onHeaderDblClick('priority')} className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
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
                    <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                      <div className="inline-flex items-center gap-1">
                        <span>Team</span>
                        <span className="relative">
                          <button
                            type="button"
                            className="p-0.5 text-gray-500 hover:text-gray-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              const isOpening = headerFilterOpen !== 'team';
                              if (isOpening) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setFilterButtonRect(rect);
                              }
                              setHeaderFilterOpen(isOpening ? 'team' : null);
                            }}
                          >
                            <FunnelIcon className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </div>
                    </th>
                    <th onDoubleClick={() => onHeaderDblClick('start_date')} className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                      <div className="inline-flex items-center gap-1">
                        <span>Start Date</span>
                        <span className="relative">
                          <button
                            type="button"
                            className="p-0.5 text-gray-500 hover:text-gray-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              const isOpening = headerFilterOpen !== 'start_date';
                              if (isOpening) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setFilterButtonRect(rect);
                                setPendingStartFrom(startFilterFrom || '');
                                setPendingStartTo(startFilterTo || '');
                              }
                              setHeaderFilterOpen(isOpening ? 'start_date' : null);
                            }}
                          >
                            <CalendarIcon className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </div>
                    </th>
                    <th onDoubleClick={() => onHeaderDblClick('due_date')} className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
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
                                setPendingDueFrom(dueFilterFrom || '');
                                setPendingDueTo(dueFilterTo || '');
                              }
                              setHeaderFilterOpen(isOpening ? 'due_date' : null);
                            }}
                          >
                            <CalendarIcon className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </div>
                    </th>
                    <th onDoubleClick={() => onHeaderDblClick('tasks')} className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none" title="Double‑click to sort by Tasks">
                      <div className="inline-flex items-center gap-1">
                        <span>Tasks</span>
                        {sortField === 'tasks' && (
                          sortDir === 'asc' ? (
                            <ChevronUpIcon className="w-3.5 h-3.5 text-gray-600" />
                          ) : (
                            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-600" />
                          )
                        )}
                      </div>
                    </th>
                    <th onDoubleClick={() => onHeaderDblClick('time_log')} className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                      Time Log
                    </th>
                    <th onDoubleClick={() => onHeaderDblClick('completion')} className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                      Completion
                    </th>
                    <th onDoubleClick={() => onHeaderDblClick('budget')} className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                      Budget
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedProjects.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-3 py-8 text-center text-sm text-gray-500">
                        No projects found
                      </td>
                    </tr>
                  )}
                  {displayedProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {getStatusIcon(project.status)}
                          </div>
                          <div className="ml-4">
                            <div className="text-base font-semibold text-black">
                              {project.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Customer */}
                      <td className="px-3 py-2 whitespace-nowrap text-base text-black">
                        {customers.find((c) => c.id === (project as any).customer_id)?.company_name || '—'}
                      </td>
<td className="px-3 py-2 whitespace-nowrap" onClick={(e) => { e.stopPropagation(); startInlineEdit(e, project, 'status'); }}>
                        <div className="relative inline-block">
<span className={`inline-flex px-1.5 pt-0 pb-0.5 text-xs font-light rounded-sm ${getStatusColorBold(project.status)}`}>
                            {project.status.replace('_', ' ')}
                          </span>
                          {editingProjectId === project.id && editingField === 'status' && (
                            <InlineEditPortal rect={inlineEditRect}>
                              <div ref={inlinePopoverRef} className="w-44 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
                                <ul className="max-h-64 overflow-auto">
                                  {['planning','active','on_hold','completed','cancelled'].map((opt) => (
                                    <li
                                      key={opt}
                                      className={`px-2 py-1 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${opt===project.status ? 'bg-gray-50' : ''}`}
                                      onClick={() => { saveInlineEdit(project.id, opt); }}
                                    >
                                      <span className="capitalize">{opt.replace('_',' ')}</span>
                                      {opt===project.status && <CheckIcon className="w-4 h-4 text-user-blue" />}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </InlineEditPortal>
                          )}
                        </div>
                      </td>
<td className="px-3 py-2 whitespace-nowrap" onClick={(e) => { e.stopPropagation(); startInlineEdit(e, project, 'priority'); }}>
                        <div className="relative inline-block">
<span className={`inline-flex px-1.5 pt-0 pb-0.5 text-xs font-light rounded-sm ${getPriorityColorBold(project.priority)}`}>
                            {project.priority}
                          </span>
                          {editingProjectId === project.id && editingField === 'priority' && (
                            <InlineEditPortal rect={inlineEditRect}>
                              <div ref={inlinePopoverRef} className="w-40 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
                                <ul className="max-h-64 overflow-auto">
                                  {['low','medium','high','critical'].map((opt) => (
                                    <li
                                      key={opt}
                                      className={`px-2 py-1 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${opt===project.priority ? 'bg-gray-50' : ''}`}
                                      onClick={() => { saveInlineEdit(project.id, opt); }}
                                    >
                                      <span className="capitalize">{opt}</span>
                                      {opt===project.priority && <CheckIcon className="w-4 h-4 text-user-blue" />}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </InlineEditPortal>
                          )}
                        </div>
                      </td>
                      
                      {/* Team Members */}
<td className="px-3 py-2 whitespace-nowrap cursor-pointer select-none" onClick={(e) => openTeamInlineEditor(e, project.id)}>
                        <div className="relative inline-flex items-center gap-2">
                          {(projectData[project.id]?.members?.length > 0 || (project as any)?.members?.length > 0) ? (
                            <div className="flex items-center -space-x-2">
                              {((projectData[project.id]?.members?.length ? projectData[project.id].members : ((project as any).members || []).map((pm: any) => ({ id: pm.user?.id || pm.user_id || pm.id, name: pm.user?.full_name || `${pm.user?.first_name || ''} ${pm.user?.last_name || ''}`.trim() || pm.name, avatar: pm.user?.avatar_url }))))
                                .slice(0,3)
                                .map((member: any, index: number) => (
                                  <div
                                    key={member.id || index}
                                    className="relative inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100"
                                    title={member.name || `Team Member ${index + 1}`}
                                  >
                                    {member.avatar ? (
                                      <img
                                        className="h-8 w-8 rounded-full object-cover"
                                        src={member.avatar}
                                        alt={member.name || 'Team Member'}
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          const nextSibling = e.currentTarget.nextElementSibling as HTMLElement;
                                          if (nextSibling) nextSibling.style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <div className={`h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-medium ${member.avatar ? 'hidden' : 'flex'}`} style={{ display: member.avatar ? 'none' : 'flex' }}>
                                      {member.name ? member.name.charAt(0).toUpperCase() : 'T'}
                                    </div>
                                  </div>
                                ))}
                              {(((projectData[project.id]?.members?.length ? projectData[project.id].members : ((project as any).members || []))).length > 3) && (
                                <div className="relative inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600">+{((projectData[project.id]?.members?.length ? projectData[project.id].members : ((project as any).members || [])).length - 3)}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-500">
                              <UserGroupIcon className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-sm">No members</span>
                            </div>
                          )}
                          <ChevronDownIcon className="h-4 w-4 text-gray-400" />

                          {teamEditorOpen === project.id && (
                            <InlineEditPortal rect={teamEditorRect}>
                              <div ref={teamEditorRef} className="w-56 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{ borderRadius: '5px' }}>
                                <div className="px-2 py-0.5 border-b border-gray-100 sticky top-0 bg-white rounded-t-md">
                                  <div className="mt-1 relative">
                                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                      type="text"
                                      value={teamInlineFilter}
                                      onChange={(e) => setTeamInlineFilter(e.target.value)}
                                      placeholder="Search members..."
                                      className="w-full pl-7 pr-2 py-0.5 text-xs border border-gray-200 rounded-sm focus:outline-none focus:ring-0 focus:border-gray-300"
                                    />
                                  </div>
                                </div>
                                <div className="max-h-64 overflow-auto">
                                  <ul className="py-1.5 text-xs space-y-1.5">
                                    {availableUsers
                                      .filter((u) => {
                                        const name = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || '').toLowerCase();
                                        const email = (u.email || '').toLowerCase();
                                        const q = (teamInlineFilter || '').toLowerCase();
                                        return !q || name.includes(q) || email.includes(q);
                                      })
                                      .map((user) => {
                                        const name = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
                                        const selected = teamSelection.includes(user.id);
                                        return (
                                          <li key={user.id} className="px-1.5 py-0.5 text-[11px]">
                                            <button
                                              type="button"
                                              className={`w-full flex items-center justify-between text-left px-1.5 py-0 rounded-sm border !min-h-0 h-auto leading-none ${selected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-transparent hover:bg-gray-50 text-gray-700'}`}
                                              style={{ minHeight: 0, paddingTop: 10 }}
                                              onClick={(e) => { e.stopPropagation(); toggleTeamSelect(user.id); }}
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
                                    {availableUsers.length === 0 && (
                                      <li className="px-3 py-2 text-sm text-gray-500">No team members found</li>
                                    )}
                                  </ul>
                                </div>
                                <div className="flex justify-end items-center gap-3 p-1 border-t border-gray-100 rounded-b-md">
                                  <button
                                    type="button"
                                    className="filter-popup-btn filter-popup-btn-clear"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const ids = availableUsers
                                        .filter((u) => {
                                          const name = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || '').toLowerCase();
                                          const email = (u.email || '').toLowerCase();
                                          const q = (teamInlineFilter || '').toLowerCase();
                                          return !q || name.includes(q) || email.includes(q);
                                        })
                                        .map((u) => u.id);
                                      setTeamSelection((prev) => Array.from(new Set([...(prev || []), ...ids])));
                                    }}
                                  >
                                    Select all
                                  </button>
                                  <button
                                    type="button"
                                    className="filter-popup-btn filter-popup-btn-clear"
                                    onClick={(e) => { e.stopPropagation(); setTeamSelection([]); }}
                                  >
                                    Clear
                                  </button>
                                  <button
                                    type="button"
                                    className="filter-popup-btn filter-popup-btn-filter"
                                    onClick={(e) => { e.stopPropagation(); saveTeamInlineEdit(project.id); }}
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            </InlineEditPortal>
                          )}
                        </div>
                      </td>
                      
                      {/* Start Date */}
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500" onClick={(e) => { e.stopPropagation(); startInlineEdit(e, project, 'start_date'); }}>
                        <div className="relative inline-block">
                          {project.start_date ? (
                            <span className={`flex items-center ${project.status === 'cancelled' ? 'text-red-600' : project.status === 'on_hold' ? 'text-yellow-600' : ((project.status === 'active') || (new Date(project.start_date).getTime() <= Date.now())) ? 'text-green-600' : 'text-gray-500'}`}>
                              <CalendarIcon className={`h-4 w-4 mr-1 ${project.status === 'cancelled' ? 'text-red-500' : project.status === 'on_hold' ? 'text-yellow-500' : ((project.status === 'active') || (new Date(project.start_date).getTime() <= Date.now())) ? 'text-green-500' : 'text-gray-400'}`} />
                              {new Date(project.start_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className={`${project.status === 'cancelled' ? 'text-red-600' : project.status === 'on_hold' ? 'text-yellow-600' : 'text-gray-500'}`}>Open</span>
                          )}
                          {editingProjectId === project.id && editingField === 'start_date' && (
                            <InlineEditPortal rect={inlineEditRect}>
                              <div ref={inlinePopoverRef} className="w-56 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{ borderRadius: '5px' }}>
                                <input
                                  type="date"
                                  value={editValue || ''}
                                  onChange={(e) => { saveInlineEdit(project.id, e.target.value); }}
                                  className="block w-full h-8 px-2 py-1 border border-gray-300 rounded-sm shadow-none focus:outline-none focus:ring-0 focus:border-gray-400 text-xs"
                                  autoFocus
                                />
                              </div>
                            </InlineEditPortal>
                          )}
                        </div>
                      </td>
                      
                      {/* Due Date */}
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500" onClick={(e) => { e.stopPropagation(); startInlineEdit(e, project, 'due_date'); }}>
                        <div className="relative inline-block">
                          {project.due_date ? (
                            <span className={`flex items-center ${project.due_date && ((new Date(project.due_date).getTime() - Date.now()) / 86400000 <= 3) ? 'text-red-600' : ''}`}>
                              <CalendarIcon className={`h-4 w-4 mr-1 ${project.due_date && ((new Date(project.due_date).getTime() - Date.now()) / 86400000 <= 3) ? 'text-red-500' : 'text-gray-400'}`} />
                              {new Date(project.due_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">No due date</span>
                          )}
                          {editingProjectId === project.id && editingField === 'due_date' && (
                            <InlineEditPortal rect={inlineEditRect}>
                              <div ref={inlinePopoverRef} className="w-56 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{ borderRadius: '5px' }}>
                                <input
                                  type="date"
                                  value={editValue || ''}
                                  onChange={(e) => { saveInlineEdit(project.id, e.target.value); }}
                                  className="block w-full h-8 px-2 py-1 border border-gray-300 rounded-sm shadow-none focus:outline-none focus:ring-0 focus:border-gray-400 text-xs"
                                  autoFocus
                                />
                              </div>
                            </InlineEditPortal>
                          )}
                        </div>
                        </td>
                      
                      {/* Pending Tasks */}
<td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <RectangleStackIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">
                            {projectDataLoading ? '...' : (projectData[project.id]?.pendingTasks || 0)}
                          </span>
                        </div>
                      </td>
                      
                      {/* Hours Worked */}
<td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-900">
                            {project.actual_hours || 0}h
                          </span>
                          {project.estimated_hours && (
                            <span className="text-xs text-gray-500 ml-1">
                              / {project.estimated_hours}h
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* Completion Percentage */}
<td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          {projectDataLoading ? (
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2" style={{minWidth: '60px'}}>
                                <div className="bg-gray-400 h-2 rounded-full animate-pulse" style={{ width: '30%' }}></div>
                              </div>
                              <span className="text-sm font-medium text-gray-500">...</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2" style={{minWidth: '60px'}}>
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${projectData[project.id]?.completionPercentage || 0}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {projectData[project.id]?.completionPercentage || 0}%
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      
                      {/* Budget */}
<td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {project.budget ? formatCurrency(project.budget) : 'N/A'}
                      </td>
<td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects/${project.id}`);
                            }}
className="inline-flex items-center justify-center p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                              title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditProject(project.id);
                              }}
className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 text-black hover:bg-gray-200 transition-colors"
                              title="Edit Project"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(project.id);
                              }}
                              className="inline-flex items-center justify-center p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                              title="Delete Project"
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
            {/* Render all filter popups via portal */}
            {headerFilterOpen === 'status' && (
              <FilterPortal buttonRect={filterButtonRect}>
                <div ref={headerFilterRef} className="w-40 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
                  <div className="px-1.5 py-1 text-xs text-gray-800 font-medium">Filter status</div>
                  <ul className="max-h-48 overflow-auto">
                    {(['planning','active','on_hold','completed','cancelled','archived'] as ProjectStatus[]).map(st => {
                      const checked = filterStatus.includes(st);
                      return (
                        <li key={st}>
                          <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={checked}
                              onChange={(e) => {
                                e.stopPropagation();
                                setFilterStatus(prev => checked ? prev.filter(x => x !== st) : [...prev, st]);
                              }}
                            />
                            <span className="capitalize">{st.replace('_',' ')}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex justify-end gap-2 px-1.5 py-1 border-t border-gray-100 mt-1">
                    <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); setFilterStatus([]); }}>Clear</button>
                    <button className="filter-popup-btn filter-popup-btn-close" onClick={(e) => { e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
                  </div>
                </div>
              </FilterPortal>
            )}
            {headerFilterOpen === 'priority' && (
              <FilterPortal buttonRect={filterButtonRect}>
                <div ref={headerFilterRef} className="w-36 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
                  <div className="px-1.5 py-1 text-xs text-gray-800 font-medium">Filter priority</div>
                  <ul className="max-h-48 overflow-auto">
                    {(['low','medium','high','critical'] as ProjectPriority[]).map(pr => {
                      const checked = filterPriority.includes(pr);
                      return (
                        <li key={pr}>
                          <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={checked}
                              onChange={(e) => {
                                e.stopPropagation();
                                setFilterPriority(prev => checked ? prev.filter(x => x !== pr) : [...prev, pr]);
                              }}
                            />
                            <span className="capitalize">{pr}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex justify-end gap-2 px-1.5 py-1 border-t border-gray-100 mt-1">
                    <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); setFilterPriority([]); }}>Clear</button>
                    <button className="filter-popup-btn filter-popup-btn-close" onClick={(e) => { e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
                  </div>
                </div>
              </FilterPortal>
            )}
            {headerFilterOpen === 'team' && (
              <FilterPortal buttonRect={filterButtonRect}>
                <div ref={headerFilterRef} className="w-52 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
                  <div className="px-1.5 py-1 text-xs text-gray-800 font-medium">Filter team</div>
                  <ul className="max-h-48 overflow-auto">
                    {availableUsers.map(u => {
                      const selected = filterTeamUserIds.includes(u.id);
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
                                setFilterTeamUserIds(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                              }}
                            />
                            <span>{label}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex justify-end gap-2 px-1.5 py-1 border-t border-gray-100 mt-1">
                    <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e)=>{ e.stopPropagation(); setFilterTeamUserIds([]); }}>Clear</button>
                    <button className="filter-popup-btn filter-popup-btn-close" onClick={(e)=>{ e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
                  </div>
                </div>
              </FilterPortal>
            )}
            {headerFilterOpen === 'client' && (
              <FilterPortal buttonRect={filterButtonRect}>
                <div ref={headerFilterRef} className="w-52 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
                  <div className="px-1.5 py-1 text-xs text-gray-800 font-medium">Filter client</div>
                  <ul className="max-h-48 overflow-auto">
                    {customers.map(c => {
                      const selected = filterClientIds.includes(c.id);
                      const label = c.company_name || `${c.first_name||''} ${c.last_name||''}`.trim() || c.email || 'Unknown';
                      return (
                        <li key={c.id}>
                          <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={selected}
                              onChange={(e) => {
                                e.stopPropagation();
                                setFilterClientIds(prev => selected ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                              }}
                            />
                            <span>{label}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex justify-end gap-2 px-1.5 py-1 border-t border-gray-100 mt-1">
                    <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e)=>{ e.stopPropagation(); setFilterClientIds([]); }}>Clear</button>
                    <button className="filter-popup-btn filter-popup-btn-close" onClick={(e)=>{ e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
                  </div>
                </div>
              </FilterPortal>
            )}
            {headerFilterOpen === 'start_date' && (
              <FilterPortal buttonRect={filterButtonRect}>
                <div ref={headerFilterRef} className="w-64 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{borderRadius: '5px'}}>
                  <div className="px-1 pb-1">
                    <DateRangeCalendar size="sm"
                      initialFrom={pendingStartFrom || null}
                      initialTo={pendingStartTo || null}
                      onChange={(from, to) => {
                        if (from && !to) {
                          setPendingStartFrom(from);
                          setPendingStartTo(from);
                        } else {
                          setPendingStartFrom(from || '');
                          setPendingStartTo(to || '');
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2 px-1.5 py-1 border-t border-gray-100 mt-1">
                    <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); const newFrom = ''; const newTo = ''; setStartFilterFrom(newFrom); setStartFilterTo(newTo); setHeaderFilterOpen(null); const fromCandidates = [filterFromDate, dueFilterFrom, newFrom].filter(Boolean) as string[]; const toCandidates = [filterToDate, dueFilterTo, newTo].filter(Boolean) as string[]; const toDateObj = (s: string) => new Date(s); const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; const minFrom = fromCandidates.length > 0 ? ymd(new Date(Math.min(...fromCandidates.map(s => toDateObj(s).getTime())))) : ''; const maxTo = toCandidates.length > 0 ? ymd(new Date(Math.max(...toCandidates.map(s => toDateObj(s).getTime())))) : ''; const params: { q?: string; from_date?: string; to_date?: string } = {}; if (projectSearch && projectSearch.trim()) params.q = projectSearch.trim(); if (minFrom) params.from_date = minFrom; if (maxTo) params.to_date = maxTo; dispatch(fetchProjects(Object.keys(params).length ? params : undefined)); }}>Clear</button>
                    <button className="filter-popup-btn filter-popup-btn-filter" onClick={(e) => {
                      e.stopPropagation();
                      const from = pendingStartFrom || '';
                      const to = pendingStartTo || pendingStartFrom || '';
                      setStartFilterFrom(from);
                      setStartFilterTo(to);
                      setHeaderFilterOpen(null);
                      const fromCandidates = [filterFromDate, dueFilterFrom, from].filter(Boolean) as string[];
                      const toCandidates = [filterToDate, dueFilterTo, to].filter(Boolean) as string[];
                      const toDateObj = (s: string) => new Date(s);
                      const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                      const minFrom = fromCandidates.length > 0 ? ymd(new Date(Math.min(...fromCandidates.map(s => toDateObj(s).getTime())))) : '';
                      const maxTo = toCandidates.length > 0 ? ymd(new Date(Math.max(...toCandidates.map(s => toDateObj(s).getTime())))) : '';
                      const params: { q?: string; from_date?: string; to_date?: string } = {};
                      if (projectSearch && projectSearch.trim()) params.q = projectSearch.trim();
                      if (minFrom) params.from_date = minFrom;
                      if (maxTo) params.to_date = maxTo;
                      dispatch(fetchProjects(Object.keys(params).length ? params : undefined));
                    }}>Filter</button>
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
                  <div className="flex justify-end gap-2 px-1.5 py-1 border-t border-gray-100 mt-1">
                    <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); const newFrom = ''; const newTo = ''; setDueFilterFrom(newFrom); setDueFilterTo(newTo); setHeaderFilterOpen(null); const fromCandidates = [filterFromDate, startFilterFrom, newFrom].filter(Boolean) as string[]; const toCandidates = [filterToDate, startFilterTo, newTo].filter(Boolean) as string[]; const toDateObj = (s: string) => new Date(s); const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; const minFrom = fromCandidates.length > 0 ? ymd(new Date(Math.min(...fromCandidates.map(s => toDateObj(s).getTime())))) : ''; const maxTo = toCandidates.length > 0 ? ymd(new Date(Math.max(...toCandidates.map(s => toDateObj(s).getTime())))) : ''; const params: { q?: string; from_date?: string; to_date?: string } = {}; if (projectSearch && projectSearch.trim()) params.q = projectSearch.trim(); if (minFrom) params.from_date = minFrom; if (maxTo) params.to_date = maxTo; dispatch(fetchProjects(Object.keys(params).length ? params : undefined)); }}>Clear</button>
                    <button className="filter-popup-btn filter-popup-btn-filter" onClick={(e) => {
                      e.stopPropagation();
                      const from = pendingDueFrom || '';
                      const to = pendingDueTo || pendingDueFrom || '';
                      setDueFilterFrom(from);
                      setDueFilterTo(to);
                      setHeaderFilterOpen(null);
                      const fromCandidates = [filterFromDate, startFilterFrom, from].filter(Boolean) as string[];
                      const toCandidates = [filterToDate, startFilterTo, to].filter(Boolean) as string[];
                      const toDateObj = (s: string) => new Date(s);
                      const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                      const minFrom = fromCandidates.length > 0 ? ymd(new Date(Math.min(...fromCandidates.map(s => toDateObj(s).getTime())))) : '';
                      const maxTo = toCandidates.length > 0 ? ymd(new Date(Math.max(...toCandidates.map(s => toDateObj(s).getTime())))) : '';
                      const params: { q?: string; from_date?: string; to_date?: string } = {};
                      if (projectSearch && projectSearch.trim()) params.q = projectSearch.trim();
                      if (minFrom) params.from_date = minFrom;
                      if (maxTo) params.to_date = maxTo;
                      dispatch(fetchProjects(Object.keys(params).length ? params : undefined));
                    }}>Filter</button>
                  </div>
                </div>
              </FilterPortal>
            )}
        </div>
      )}

          {viewMode === 'kanban' && (
            <KanbanBoard
              projects={projects}
              type="projects"
              onProjectUpdate={handleProjectUpdate}
            />
          )}

          {viewMode === 'calendar' && (
            <CalendarView
              projects={projects}
              type="projects"
              onItemClick={handleProjectClick}
            />
          )}

          {viewMode === 'gantt' && (
            <GanttChart
              projects={projects}
              type="projects"
              onItemClick={handleProjectClick}
            />
          )}
        </>
      )}
    {/* Delete Confirmation Modal */}
    {confirmDeleteId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Delete Project</h3>
          </div>
          <div className="px-4 py-3 text-sm text-gray-700">
            Are you sure you want to delete this project? This action cannot be undone.
          </div>
          <div className="px-4 py-3 flex items-center justify-end space-x-2 border-t border-gray-100">
            <button
              className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
              onClick={() => setConfirmDeleteId(null)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
              onClick={async () => {
                const id = confirmDeleteId;
                setConfirmDeleteId(null);
                if (id) await handleDeleteProject(id);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default ProjectOverviewPage;
