import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { Task, Project, User, TaskStatus, TaskPriority, TaskType, TaskComment, TaskAttachment, TaskDocument, TaskDocumentCreate, DocumentType, ActivityItem } from '../../types';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { addNotification } from '../../store/slices/notificationSlice';
import {
  FolderIcon,
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  ChartBarIcon,
  DocumentTextIcon,
  FlagIcon,
  CalendarDaysIcon,
  TagIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BoltIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftIcon,
  PaperClipIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import TaskComments from '../../components/Comments/TaskComments';
import TaskAttachments from '../../components/Attachments/TaskAttachments';
import TaskDocuments from '../../components/Documents/TaskDocuments';

interface TaskStats {
  timeSpent: number;
  timeRemaining: number;
  progressPercentage: number;
  isOverdue: boolean;
  daysUntilDue: number;
  efficiency: number;
}

const TaskDetailOverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAppSelector((state) => (state as any).auth);
  
  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [assignee, setAssignee] = useState<User | null>(null);
  const [createdBy, setCreatedBy] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    timeSpent: 0,
    timeRemaining: 0,
    progressPercentage: 0,
    isOverdue: false,
    daysUntilDue: 0,
    efficiency: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'subtasks' | 'comments' | 'attachments' | 'documents' | 'edit'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Task> & { assignee_ids?: string[] }>({});

  // Collaboration state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [documents, setDocuments] = useState<TaskDocument[]>([]);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [newDocument, setNewDocument] = useState<TaskDocumentCreate>({
    title: '',
    content: '',
    document_type: DocumentType.NOTES,
    tags: []
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  
  // Dropdown UI state for edit tab
  const [assigneesOpen, setAssigneesOpen] = useState(false);
  const [assignerOpen, setAssignerOpen] = useState(false);
  const assigneesRef = useRef<HTMLDivElement | null>(null);
  const assignerRef = useRef<HTMLDivElement | null>(null);
  const [assigneesQuery, setAssigneesQuery] = useState('');
  const [assignerQuery, setAssignerQuery] = useState('');

  // Recurrence state
  const [recurrenceTemplate, setRecurrenceTemplate] = useState<any | null>(null);
  const [recurrenceEdit, setRecurrenceEdit] = useState<{ preset: 'weekday' | '1w' | '2w' | '1m' | '3m' | 'quarterly' | 'yearly' | 'custom'; frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'; interval: number }>({
    preset: '1w',
    frequency: 'weekly',
    interval: 1,
  });

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (assigneesRef.current && !assigneesRef.current.contains(e.target as Node)) setAssigneesOpen(false);
      if (assignerRef.current && !assignerRef.current.contains(e.target as Node)) setAssignerOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    console.log('TaskDetailOverviewPage useEffect - id:', id);
    if (id) {
      // Respect ?tab=edit query param
      const params = new URLSearchParams(location.search);
      const tab = params.get('tab');
      if (tab === 'edit') setActiveTab('edit');

      fetchTaskData();
      fetchUsers();
    }
  }, [id, location.search]);

  useEffect(() => {
    // Load collaboration data once task id is available
    if (id) {
      fetchComments();
      fetchAttachments();
      fetchDocuments();
      fetchActivities();
    }
  }, [id]);

  const fetchTaskData = async () => {
    if (!id) return;
    
    console.log('fetchTaskData called with id:', id);
    setIsLoading(true);
    try {
      // Fetch task details
      const { default: apiClient } = await import('../../api/client');
      console.log('Making API call to:', `/tasks/${id}`);
      const taskResponse = await apiClient.get(`/tasks/${id}`);
      console.log('API response:', taskResponse);
      const taskData = taskResponse.data;
      // Default created_by_id if missing
      if (!taskData.created_by_id && currentUser?.id) {
        taskData.created_by_id = currentUser.id;
      }
      setTask(taskData);
      
      // Initialize edit form with current task data, handling both single and multiple assignees
      const editFormData = {
        ...taskData,
        assignee_ids: taskData.assignee_ids || (taskData.assignee_id ? [taskData.assignee_id] : [])
      };
      setEditForm(editFormData);

      // If recurring, fetch recurrence template
      try {
        if (taskData.recurring_template_id) {
          const tmplRes = await apiClient.get(`/recurring-tasks/${taskData.recurring_template_id}`);
          const tmpl = tmplRes.data;
          setRecurrenceTemplate(tmpl);
          // Map template to preset
          let preset: 'weekday' | '1w' | '2w' | '1m' | '3m' | 'quarterly' | 'yearly' | 'custom' = 'custom';
          // Detect weekday preset (Mon-Fri => [1,2,3,4,5])
          const days = Array.isArray(tmpl.days_of_week) ? tmpl.days_of_week : [];
          const isWeekday = tmpl.frequency === 'weekly' && tmpl.interval_value === 1 && days.length === 5 && [1,2,3,4,5].every(d => days.includes(d));
          if (isWeekday) preset = 'weekday';
          else if (tmpl.frequency === 'weekly' && tmpl.interval_value === 1) preset = '1w';
          else if (tmpl.frequency === 'weekly' && tmpl.interval_value === 2) preset = '2w';
          else if (tmpl.frequency === 'monthly' && tmpl.interval_value === 1) preset = '1m';
          else if (tmpl.frequency === 'monthly' && tmpl.interval_value === 3) preset = '3m';
          else if (tmpl.frequency === 'quarterly' && tmpl.interval_value === 1) preset = 'quarterly';
          else if (tmpl.frequency === 'yearly' && tmpl.interval_value === 1) preset = 'yearly';
          setRecurrenceEdit({
            preset,
            frequency: tmpl.frequency,
            interval: tmpl.interval_value || 1,
          });
        } else {
          setRecurrenceTemplate(null);
        }
      } catch (e) {
        console.warn('Failed to fetch recurrence template', e);
        setRecurrenceTemplate(null);
      }

      // Fetch assignees from task assignees API
      try {
        const assigneesResponse = await apiClient.get(`/task-assignees/tasks/${id}/assignees`);
        const assignees = assigneesResponse.data || [];
        console.log('Fetched assignees:', assignees);
        
        // Update task with assignee information
        const taskWithAssignees = {
          ...taskData,
          assignees: assignees,
          assignee_ids: assignees.map((assignee: any) => assignee.user_id)
        };
        setTask(taskWithAssignees);
        
        // Update edit form with assignee information
        const editFormData = {
          ...taskWithAssignees,
          assignee_ids: assignees.map((assignee: any) => assignee.user_id)
        };
        setEditForm(editFormData);
      } catch (error) {
        console.warn('Failed to fetch task assignees:', error);
        // Fallback to single assignee if available
        const editFormData = {
          ...taskData,
          assignee_ids: taskData.assignee_id ? [taskData.assignee_id] : []
        };
        setEditForm(editFormData);
      }

      // Fetch related data
      await Promise.all([
        fetchProjectData(taskData.project_id),
        fetchUserData(taskData.assignee_id, 'assignee'),
        fetchUserData(taskData.created_by_id, 'creator')
      ]);
      
      // Calculate stats after all data is fetched
      calculateStats(taskData);
    } catch (error) {
      console.error('Failed to fetch task data:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load task data',
        duration: 5000,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      // Prefer trailing slash; handle both array and wrapped responses
      const response = await apiClient.get('/users/');
      const list = Array.isArray(response.data)
        ? (response.data as unknown as User[])
        : (response.data?.users as User[]) || [];
      setUsers(list || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };

  const fetchProjectData = async (projectId: string) => {
    if (!projectId) return;
    
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get(`/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  const fetchUserData = async (userId: string | undefined, type: 'assignee' | 'creator') => {
    if (!userId) return;
    
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get(`/users/${userId}`);
      if (type === 'assignee') {
        setAssignee(response.data);
      } else {
        setCreatedBy(response.data);
      }
    } catch (error) {
      console.error(`Failed to fetch ${type}:`, error);
    }
  };

  const calculateStats = (taskData: Task) => {
    const newStats: TaskStats = {
      timeSpent: taskData.actual_hours,
      timeRemaining: Math.max(0, (taskData.estimated_hours || 0) - taskData.actual_hours),
      progressPercentage: 0,
      isOverdue: false,
      daysUntilDue: 0,
      efficiency: 0
    };

    // Calculate progress percentage based on status
    switch (taskData.status) {
      case TaskStatus.TODO:
        newStats.progressPercentage = 0;
        break;
      case TaskStatus.IN_PROGRESS:
        newStats.progressPercentage = taskData.estimated_hours 
          ? Math.min(75, (taskData.actual_hours / taskData.estimated_hours) * 100)
          : 25;
        break;
      case TaskStatus.IN_REVIEW:
        newStats.progressPercentage = 90;
        break;
      case TaskStatus.COMPLETED:
        newStats.progressPercentage = 100;
        break;
      default:
        newStats.progressPercentage = 10;
    }

    // Calculate due date info
    if (taskData.due_date) {
      const today = new Date();
      const dueDate = new Date(taskData.due_date);
      const timeDiff = dueDate.getTime() - today.getTime();
      newStats.daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      newStats.isOverdue = timeDiff < 0 && taskData.status !== TaskStatus.COMPLETED;
    }

    // Calculate efficiency (story points per hour)
    if (taskData.actual_hours > 0 && taskData.story_points) {
      newStats.efficiency = taskData.story_points / taskData.actual_hours;
    }

    setStats(newStats);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    try {
      const { default: apiClient } = await import('../../api/client');
      
      // Separate assignee_ids from other task fields
      const { assignee_ids, ...taskFields } = editForm;
      
      // Update basic task fields (set assignee_id to first assignee if multiple)
      const taskUpdateData: any = {
        ...taskFields,
        assignee_id: (assignee_ids as string[])?.length > 0 ? (assignee_ids as string[])[0] : undefined
      };

      // Normalize sprint date fields to ISO 8601 datetimes if provided as YYYY-MM-DD
      if (taskUpdateData.sprint_start_date) {
        const s = String(taskUpdateData.sprint_start_date);
        taskUpdateData.sprint_start_date = s.includes('T') ? s : `${s}T00:00:00.000Z`;
      }
      if (taskUpdateData.sprint_end_date) {
        const e = String(taskUpdateData.sprint_end_date);
        taskUpdateData.sprint_end_date = e.includes('T') ? e : `${e}T23:59:59.999Z`;
      }
      
      await apiClient.put(`/tasks/${task.id}`, taskUpdateData);
      
      // Handle multiple assignees if they exist
      if (assignee_ids && Array.isArray(assignee_ids)) {
        try {
          // Get current assignees
          const currentAssigneesResponse = await apiClient.get(`/task-assignees/tasks/${task.id}/assignees`);
          const currentAssignees = currentAssigneesResponse.data || [];
          
          // Remove all current assignees
          for (const assignee of currentAssignees) {
            try {
              await apiClient.delete(`/task-assignees/tasks/${task.id}/assignees/${assignee.id}`);
            } catch (error) {
              console.warn(`Failed to remove assignee ${assignee.id}:`, error);
            }
          }
          
          // Add new assignees (skip first one if it's already set as assignee_id)
          for (let i = 0; i < assignee_ids.length; i++) {
            try {
              await apiClient.post(`/task-assignees/tasks/${task.id}/assignees`, {
                user_id: assignee_ids[i],
                is_primary: i === 0 // First assignee is primary
              });
            } catch (error) {
              console.warn(`Failed to add assignee ${assignee_ids[i]}:`, error);
            }
          }
        } catch (error) {
          console.warn('Failed to update task assignees:', error);
        }
      }
      
      // Refresh task data to get updated assignees
      await fetchTaskData();
      setIsEditing(false);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Task updated successfully',
        duration: 3000,
      }));
    } catch (error) {
      console.error('Failed to update task:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update task',
        duration: 5000,
      }));
    }
  };

  const handleDeleteTask = async () => {
    if (!task || !window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.delete(`/tasks/${task.id}`);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Task deleted successfully',
        duration: 3000,
      }));
      
      navigate('/tasks');
    } catch (error) {
      console.error('Failed to delete task:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete task',
        duration: 5000,
      }));
    }
  };

  // Collaboration API functions
  const fetchComments = async () => {
    if (!id) return;
    setIsLoadingComments(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      const res = await apiClient.get(`/tasks/${id}/comments`);
      setComments(res.data || []);
    } catch (e) {
      console.error('Failed to fetch comments', e);
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const fetchAttachments = async () => {
    if (!id) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      const res = await apiClient.get(`/tasks/${id}/attachments`);
      setAttachments(res.data || []);
    } catch (e) {
      console.error('Failed to fetch attachments', e);
      setAttachments([]);
    }
  };

  const fetchDocuments = async () => {
    if (!id) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      const res = await apiClient.get(`/tasks/${id}/documents`);
      setDocuments(res.data || []);
    } catch (e) {
      console.error('Failed to fetch documents', e);
      setDocuments([]);
    }
  };

  const fetchActivities = async () => {
    if (!id) return;
    setIsLoadingActivities(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      const res = await apiClient.get(`/tasks/${id}/activities`);
      setActivities(res.data || []);
    } catch (e) {
      console.error('Failed to fetch activities', e);
      setActivities([]);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const handleAddComment = async () => {
    if (!id || !newComment.trim()) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      const payload = { content: newComment.trim(), parent_comment_id: replyToComment || undefined };
      const res = await apiClient.post(`/tasks/${id}/comments`, payload);
      setComments(prev => [...prev, res.data]);
      setNewComment('');
      setReplyToComment(null);
      fetchActivities();
      dispatch(addNotification({ type: 'success', title: 'Comment Added', message: 'Your comment was added.', duration: 2500 }));
    } catch (e) {
      console.error('Failed to add comment', e);
      dispatch(addNotification({ type: 'error', title: 'Failed to add comment', message: 'There was an error adding the comment.', duration: 4000 }));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.delete(`/tasks/${id}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
      dispatch(addNotification({ type: 'success', title: 'Comment Deleted', message: 'Comment has been deleted.', duration: 2000 }));
    } catch (e) {
      console.error('Failed to delete comment', e);
      dispatch(addNotification({ type: 'error', title: 'Failed to delete comment', message: 'There was an error deleting the comment.', duration: 4000 }));
    }
  };

  const handleFileUpload = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!id || !file) return;
    setIsUploadingFile(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      const form = new FormData();
      form.append('file', file);
      const res = await apiClient.post(`/tasks/${id}/attachments`, form, { headers: { 'Content-Type': 'multipart/form-data' }});
      setAttachments(prev => [...prev, res.data]);
      fetchActivities();
      dispatch(addNotification({ type: 'success', title: 'File Uploaded', message: `${file.name} uploaded.`, duration: 2500 }));
    } catch (e) {
      console.error('Failed to upload attachment', e);
      dispatch(addNotification({ type: 'error', title: 'Upload Failed', message: 'There was an error uploading the file.', duration: 4000 }));
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadAttachment = async (attachment: TaskAttachment) => {
    if (!id) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get(`/tasks/${id}/attachments/${attachment.id}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.original_filename || attachment.filename || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download', e);
      dispatch(addNotification({ type: 'error', title: 'Download Failed', message: 'There was an error downloading the file.', duration: 4000 }));
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!id) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.delete(`/tasks/${id}/attachments/${attachmentId}`);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      dispatch(addNotification({ type: 'success', title: 'Attachment Deleted', message: 'Attachment has been deleted.', duration: 2000 }));
    } catch (e) {
      console.error('Failed to delete attachment', e);
      dispatch(addNotification({ type: 'error', title: 'Failed to delete attachment', message: 'There was an error deleting the attachment.', duration: 4000 }));
    }
  };

  const handleCreateDocument = async () => {
    if (!id || !newDocument.title.trim() || !newDocument.content.trim()) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      const res = await apiClient.post(`/tasks/${id}/documents`, newDocument);
      setDocuments(prev => [...prev, res.data]);
      setNewDocument({ title: '', content: '', document_type: DocumentType.NOTES, tags: [] });
      setIsCreatingDocument(false);
      fetchActivities();
      dispatch(addNotification({ type: 'success', title: 'Document Created', message: 'Document has been created successfully.', duration: 2500 }));
    } catch (e) {
      console.error('Failed to create document', e);
      dispatch(addNotification({ type: 'error', title: 'Failed to create document', message: 'There was an error creating the document.', duration: 4000 }));
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!id) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.delete(`/tasks/${id}/documents/${documentId}`);
      setDocuments(prev => prev.filter(d => d.id !== documentId));
      dispatch(addNotification({ type: 'success', title: 'Document Deleted', message: 'Document has been deleted.', duration: 2000 }));
    } catch (e) {
      console.error('Failed to delete document', e);
      dispatch(addNotification({ type: 'error', title: 'Failed to delete document', message: 'There was an error deleting the document.', duration: 4000 }));
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
    return d.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment_added': return <ChatBubbleLeftIcon className="h-4 w-4" />;
      case 'attachment_added': return <PaperClipIcon className="h-4 w-4" />;
      case 'document_created': return <DocumentIcon className="h-4 w-4" />;
      case 'task_updated': return <PencilIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024; const sizes = ['Bytes','KB','MB','GB'];
    const i = Math.floor(Math.log(bytes)/Math.log(k));
    return `${parseFloat((bytes/Math.pow(k,i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;

    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.put(`/tasks/${task.id}`, { status: newStatus });
      
      const updatedTask = { ...task, status: newStatus };
      setTask(updatedTask);
      calculateStats(updatedTask);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Task status updated successfully',
        duration: 3000,
      }));
    } catch (error) {
      console.error('Failed to update task status:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update task status',
        duration: 5000,
      }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      todo: 'bg-gray-50 text-gray-700 border border-gray-200',
      in_progress: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      in_review: 'bg-blue-50 text-blue-700 border border-blue-200',
      blocked: 'bg-red-50 text-red-700 border border-red-200',
      completed: 'bg-green-50 text-green-700 border border-green-200',
      cancelled: 'bg-gray-50 text-gray-700 border border-gray-200'
    };
    return statusColors[status] || 'bg-gray-50 text-gray-700 border border-gray-200';
  };

  const getPriorityColor = (priority: string) => {
    const priorityColors: Record<string, string> = {
      low: 'bg-gray-50 text-gray-700 border border-gray-200',
      medium: 'bg-blue-50 text-blue-700 border border-blue-200',
      high: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      critical: 'bg-red-50 text-red-700 border border-red-200'
    };
    return priorityColors[priority] || 'bg-gray-50 text-gray-700 border border-gray-200';
  };

  const getTaskHealthStatus = () => {
    if (!task || !task.due_date) return { status: 'No Due Date', color: 'bg-gray-500', textColor: 'text-gray-600' };
    
    if (stats.isOverdue) {
      return { status: 'Overdue', color: 'bg-red-500', textColor: 'text-red-600' };
    } else if (stats.daysUntilDue <= 1) {
      return { status: 'Due Soon', color: 'bg-orange-500', textColor: 'text-orange-600' };
    } else if (stats.daysUntilDue <= 7) {
      return { status: 'On Track', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    } else {
      return { status: 'Plenty of Time', color: 'bg-green-500', textColor: 'text-green-600' };
    }
  };

  console.log('TaskDetailOverviewPage rendering - task:', task, 'isLoading:', isLoading, 'id:', id);
  
  if (isLoading) {
    return <div />;
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Task Not Found</h2>
        <p className="text-gray-600 mb-6">The task you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/tasks')}
          className="px-4 py-2 bg-user-blue text-white rounded-md hover:bg-user-blue"
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/tasks')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center flex-wrap gap-3">
              <span>{task.title}</span>
              {(task.is_recurring || task.recurring_template_id) && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  Recurring
                </span>
              )}
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-gray-600">
                {task.task_type} • {task.priority} priority • Created {formatDate(task.created_at)}
              </p>
              {project && (
                <span className="text-sm text-gray-500">
                  in <span className="font-medium text-user-blue">{project.name}</span>
                </span>
              )}
            </div>
            {/* Task Health Indicator */}
            {task && (
              <div className="flex items-center space-x-2 mt-2">
                <div className={`h-2 w-2 rounded-full ${getTaskHealthStatus().color}`}></div>
                <span className={`text-sm ${getTaskHealthStatus().textColor}`}>
                  {getTaskHealthStatus().status}
                </span>
                {task.due_date && (
                  <span className="text-xs text-gray-500">
                    • Due in {stats.daysUntilDue} days
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setActiveTab('edit')}
            className="flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <PencilIcon className="h-5 w-5" />
            Edit
          </button>
          <button
            onClick={() => handleStatusChange(TaskStatus.IN_PROGRESS)}
            className="flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <PlayIcon className="h-5 w-5" />
            Start Task
          </button>
          <button
            onClick={() => handleStatusChange(TaskStatus.COMPLETED)}
            className="flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <CheckCircleIcon className="h-5 w-5" />
            Mark as Complete
          </button>
          <button
            onClick={() => project && navigate(`/projects/${project.id}`)}
            disabled={!project}
            className="flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderIcon className="h-5 w-5" />
            View Project
          </button>
          <button
            onClick={handleDeleteTask}
            className="flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'comments', name: 'Comments', icon: ChatBubbleLeftIcon },
            { id: 'attachments', name: 'Attachments', icon: PaperClipIcon },
            { id: 'documents', name: 'Documents', icon: DocumentIcon },
            { id: 'activity', name: 'Activity', icon: ClockIcon },
            { id: 'subtasks', name: 'Subtasks', icon: DocumentTextIcon },
            { id: 'edit', name: 'Edit', icon: PencilIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-3 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
                activeTab === tab.id ? 'text-indigo-600' : 'text-black hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
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
          {activeTab === 'overview' && task && (
        <div className="space-y-6">
            {/* Task Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Task Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Task Title</p>
                      <p className="text-sm text-gray-600">{task.title}</p>
                    </div>
                  </div>
                  {task.sprint_name && (
                    <div className="flex items-center space-x-3">
                      <FlagIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Sprint</p>
                        <p className="text-sm text-gray-600">{task.sprint_name} {task.sprint_start_date && task.sprint_end_date && (
                          <span className="text-xs text-gray-500">({new Date(task.sprint_start_date).toLocaleDateString()} - {new Date(task.sprint_end_date).toLocaleDateString()})</span>
                        )}</p>
                      </div>
                    </div>
                  )}
                <div className="flex items-center space-x-3">
                  <FlagIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Priority</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <TagIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Type</p>
                    <p className="text-sm text-gray-600">{task.task_type}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {assignee && (
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Assignee</p>
                      <p className="text-sm text-gray-600">{assignee.full_name}</p>
                    </div>
                  </div>
                )}
                {task.due_date && (
                  <div className="flex items-center space-x-3">
                    <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Due Date</p>
                      <p className="text-sm text-gray-600">{formatDate(task.due_date)}</p>
                    </div>
                  </div>
                )}
                {task.estimated_hours && task.estimated_hours > 0 && (
                  <div className="flex items-center space-x-3">
                    <ClockIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Estimated Hours</p>
                      <p className="text-sm text-gray-600">{task.estimated_hours}h</p>
                    </div>
                  </div>
                )}
                {task.story_points && task.story_points > 0 && (
                  <div className="flex items-center space-x-3">
                    <BoltIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Story Points</p>
                      <p className="text-sm text-gray-600">{task.story_points}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {task.description && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-2">Description</p>
                <p className="text-sm text-gray-600">{task.description}</p>
              </div>
            )}
          </div>

          {/* Project Information */}
          {project && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Context</h3>
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <FolderIcon className="h-6 w-6 text-user-blue" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{project.name}</h4>
                  <p className="text-gray-600">{project.status} • {project.priority} priority</p>
                  {project.description && (
                    <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="ml-auto px-4 py-2 text-sm text-user-blue hover:text-primary-800 border border-primary-300 rounded-md hover:bg-primary-50"
                >
                  View Project
                </button>
              </div>
            </div>
          )}

          {/* Time Tracking & Progress */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Time Tracking & Progress</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Task Progress</span>
                <span className="text-sm font-medium text-gray-900">{stats.progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-user-blue h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.progressPercentage}%` }}
                ></div>
              </div>
              
              {task.estimated_hours && task.estimated_hours > 0 && (
                <div className="grid grid-cols-3 gap-4 text-center mt-4">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{task.actual_hours}h</div>
                    <div className="text-sm text-gray-500">Time Spent</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{stats.timeRemaining}h</div>
                    <div className="text-sm text-gray-500">Remaining</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{task.estimated_hours}h</div>
                    <div className="text-sm text-gray-500">Estimated</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Collaboration: Comments */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Comments</h3>
            </div>
            <div className="space-y-4">
              {/* Add Comment */}
              <div>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent p-2"
                  placeholder="Write a comment..."
                />
                <div className="mt-2 flex justify-between items-center">
                  <div>
                    {replyToComment && (
                      <button className="text-sm text-gray-500" onClick={() => { setReplyToComment(null); setNewComment(''); }}>Cancel reply</button>
                    )}
                  </div>
                  <button onClick={handleAddComment} disabled={!newComment.trim()} className="btn btn-primary">
                    <ChatBubbleLeftIcon className="h-4 w-4" />
                    <span>Comment</span>
                  </button>
                </div>
              </div>

              {/* Comments List */}
              {isLoadingComments ? (
                <div className="flex justify-center py-6"><LoadingSpinner size="medium" /></div>
              ) : comments.length === 0 ? (
                <div className="text-sm text-gray-500">No comments yet.</div>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="border border-gray-200 rounded-md p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm text-gray-900 font-medium">
                            {c.user?.first_name} {c.user?.last_name}
                            <span className="text-xs text-gray-500 ml-2">{formatRelativeTime(c.created_at)}</span>
                          </div>
                          <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{c.content}</div>
                          <div className="mt-2 flex items-center gap-4">
                            <button className="text-xs text-blue-600" onClick={() => { setReplyToComment(c.id); setNewComment(`@${c.user?.first_name || 'User'} `); }}>Reply</button>
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-red-600" onClick={() => handleDeleteComment(c.id)}>
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Collaboration: Attachments */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Attachments</h3>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingFile} className="btn btn-primary">
                  <PaperClipIcon className="h-4 w-4" />
                  <span>{isUploadingFile ? 'Uploading...' : 'Upload'}</span>
                </button>
              </div>
            </div>
            {attachments.length === 0 ? (
              <div className="text-sm text-gray-500">No attachments.</div>
            ) : (
              <div className="space-y-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between border border-gray-200 rounded-md p-3">
                    <div className="flex items-center gap-3">
                      <PaperClipIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{att.original_filename}</div>
                        <div className="text-xs text-gray-500">{formatFileSize(att.file_size)} • {formatRelativeTime(att.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800" onClick={() => handleDownloadAttachment(att)}>
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-800" onClick={() => handleDeleteAttachment(att.id)}>
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collaboration: Documents */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Documents</h3>
              <button onClick={() => setIsCreatingDocument(v => !v)} className="btn btn-primary">
                <DocumentIcon className="h-4 w-4" />
                <span>Create</span>
              </button>
            </div>
            {isCreatingDocument && (
              <div className="border border-gray-200 rounded-md p-4 mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={newDocument.title}
                    onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent px-3 py-2"
                    placeholder="Document title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newDocument.document_type}
                    onChange={(e) => setNewDocument({ ...newDocument, document_type: e.target.value as DocumentType })}
                    className="w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent px-3 py-2"
                  >
                    {Object.values(DocumentType).map(dt => (
                      <option key={dt} value={dt}>{dt.replace('_',' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    rows={8}
                    value={newDocument.content}
                    onChange={(e) => setNewDocument({ ...newDocument, content: e.target.value })}
                    className="w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent px-3 py-2"
                    placeholder="Write document content..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button className="btn btn-secondary" onClick={() => { setIsCreatingDocument(false); setNewDocument({ title:'', content:'', document_type: DocumentType.NOTES, tags: [] }); }}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleCreateDocument} disabled={!newDocument.title.trim() || !newDocument.content.trim()}>Create</button>
                </div>
              </div>
            )}
            {documents.length === 0 ? (
              <div className="text-sm text-gray-500">No documents.</div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="border border-gray-200 rounded-md p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <DocumentIcon className="h-5 w-5 text-gray-400" />
                          <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                          <span className="text-xs text-gray-600 bg-gray-100 border border-gray-200 rounded px-2 py-0.5">{doc.document_type.replace('_',' ')}</span>
                        </div>
                        <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap max-h-40 overflow-y-auto">{doc.content}</div>
                        <div className="text-xs text-gray-500 mt-1">v{doc.version} • {formatRelativeTime(doc.created_at)}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button className="text-blue-600 hover:text-blue-800" onClick={() => { /* placeholder view */ }}>
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-800" onClick={() => handleDeleteDocument(doc.id)}>
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Task Timeline */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Task Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Task Created</p>
                  <p className="text-xs text-gray-500">{formatDate(task.created_at)}</p>
                </div>
              </div>
              
              {task.start_date && (
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Task Started</p>
                    <p className="text-xs text-gray-500">{formatDate(task.start_date)}</p>
                  </div>
                </div>
              )}
              
              {task.due_date && (
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-3 w-3 bg-orange-500 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Task Due</p>
                    <p className="text-xs text-gray-500">{formatDate(task.due_date)}</p>
                  </div>
                </div>
              )}
              
              {task.completed_date && (
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-3 w-3 bg-purple-500 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Task Completed</p>
                    <p className="text-xs text-gray-500">{formatDate(task.completed_date)}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-3 w-3 bg-gray-500 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-xs text-gray-500">{formatDate(task.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && task && (
        <div className="space-y-6">
          <TaskComments taskId={task.id} />
        </div>
      )}

      {/* Attachments Tab */}
      {activeTab === 'attachments' && task && (
        <div className="space-y-6">
          <TaskAttachments taskId={task.id} />
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && task && (
        <div className="space-y-6">
          <TaskDocuments taskId={task.id} />
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && task && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              <div className="text-center py-8">
                <ClockIcon className="mx-auto h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">Activity tracking coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtasks Tab */}
      {activeTab === 'subtasks' && task && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Subtasks</h3>
            <div className="space-y-4">
              <div className="text-center py-8">
                <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">Subtask management coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tab */}
      {activeTab === 'edit' && task && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Edit Task</h3>
          <form onSubmit={handleUpdateTask} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={editForm.status || 'todo'}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as TaskStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={editForm.priority || 'medium'}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Type
                </label>
                <select
                  value={editForm.task_type || 'task'}
                  onChange={(e) => setEditForm({ ...editForm, task_type: e.target.value as TaskType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="task">Task</option>
                  <option value="bug">Bug</option>
                  <option value="feature">Feature</option>
                  <option value="epic">Epic</option>
                  <option value="story">Story</option>
                  <option value="subtask">Subtask</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={editForm.estimated_hours || ''}
                  onChange={(e) => setEditForm({ ...editForm, estimated_hours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Sprint fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sprint Name</label>
                <input
                  type="text"
                  value={(editForm as any).sprint_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, sprint_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sprint Start</label>
                <input
                  type="date"
                  value={(editForm as any).sprint_start_date ? String((editForm as any).sprint_start_date).split('T')[0] : ''}
                  onChange={(e) => setEditForm({ ...editForm, sprint_start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sprint End</label>
                <input
                  type="date"
                  value={(editForm as any).sprint_end_date ? String((editForm as any).sprint_end_date).split('T')[0] : ''}
                  onChange={(e) => setEditForm({ ...editForm, sprint_end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sprint Goal</label>
                <input
                  type="text"
                  value={(editForm as any).sprint_goal || ''}
                  onChange={(e) => setEditForm({ ...editForm, sprint_goal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Story Points
                </label>
                <input
                  type="number"
                  value={editForm.story_points || ''}
                  onChange={(e) => setEditForm({ ...editForm, story_points: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={editForm.due_date ? editForm.due_date.split('T')[0] : ''}
                  onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
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
                    {((editForm.assignee_ids as string[]) || []).length === 0 ? (
                      <span className="text-sm text-gray-500">Select assignees</span>
                    ) : (
                      ((editForm.assignee_ids as string[]) || []).slice(0, 4).map((userId) => {
                        const user = users.find((u: User) => u.id === userId);
                        return user ? (
                          <span key={userId} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                            {user.first_name} {user.last_name}
                          </span>
                        ) : null;
                      })
                    )}
                    {((editForm.assignee_ids as string[]) || []).length > 4 && (
                      <span className="text-xs text-gray-500">+{((editForm.assignee_ids as string[]) || []).length - 4} more</span>
                    )}
                  </div>
                </div>
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
                          .filter((u: User) => {
                            const q = assigneesQuery.toLowerCase();
                            return `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                          })
                          .map((user: User) => {
                          const selected = ((editForm.assignee_ids as string[]) || []).includes(user.id);
                          return (
                            <li
                              key={user.id}
                              className={`px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
                              onClick={() => {
                                const currentAssignees = ((editForm.assignee_ids as string[]) || []);
                                setEditForm(prev => ({
                                  ...prev,
                                  assignee_ids: selected
                                    ? currentAssignees.filter(id => id !== user.id)
                                    : [...currentAssignees, user.id]
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
                      const selectedUser = users.find((u: User) => u.id === editForm.created_by_id) || currentUser;
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
                          .filter((u: User) => {
                            const q = assignerQuery.toLowerCase();
                            return `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                          })
                          .map((user: User) => (
                          <li
                            key={user.id}
                            className={`px-3 py-2 text-sm hover:bg-gray-50 ${editForm.created_by_id === user.id ? 'bg-gray-50' : ''}`}
                            onClick={() => setEditForm(prev => ({ ...prev, created_by_id: user.id }))}
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
                <p className="text-xs text-gray-500 mt-1">Assigner is a single user (created_by).</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={4}
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Add a description for this task..."
              />
            </div>
            
            {/* Customer Visibility */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Visible to customer</label>
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, visible_to_customer: !(prev as any).visible_to_customer }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(editForm as any).visible_to_customer ? 'bg-user-blue' : 'bg-secondary-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(editForm as any).visible_to_customer ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* Recurrence (if applicable) */}
            {task.recurring_template_id && (
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-md font-medium text-gray-900 mb-3">Recurrence</h4>
                {recurrenceTemplate ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preset</label>
                      <select
                        value={recurrenceEdit.preset}
                        onChange={(e) => {
                          const preset = e.target.value as any;
                          if (preset === '1w') setRecurrenceEdit({ preset, frequency: 'weekly', interval: 1 });
                          else if (preset === '2w') setRecurrenceEdit({ preset, frequency: 'weekly', interval: 2 });
                          else if (preset === '1m') setRecurrenceEdit({ preset, frequency: 'monthly', interval: 1 });
                          else if (preset === '3m') setRecurrenceEdit({ preset, frequency: 'monthly', interval: 3 });
                          else setRecurrenceEdit((prev) => ({ ...prev, preset }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
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
                    {recurrenceEdit.preset === 'custom' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                          <select
                            value={recurrenceEdit.frequency}
                            onChange={(e) => setRecurrenceEdit((r) => ({ ...r, frequency: e.target.value as any }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Interval</label>
                          <input
                            type="number"
                            min={1}
                            value={recurrenceEdit.interval}
                            onChange={(e) => setRecurrenceEdit((r) => ({ ...r, interval: parseInt(e.target.value) || 1 }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </>
                    )}
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const { default: apiClient } = await import('../../api/client');
                            let frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
                            let interval_value: number;
                            let days_of_week: number[] = [];

                            if (recurrenceEdit.preset === 'custom') {
                              frequency = recurrenceEdit.frequency;
                              interval_value = Math.max(1, recurrenceEdit.interval || 1);
                            } else if (recurrenceEdit.preset === 'weekday') {
                              frequency = 'weekly';
                              interval_value = 1;
                              days_of_week = [1,2,3,4,5];
                            } else if (recurrenceEdit.preset === '1w') {
                              frequency = 'weekly';
                              interval_value = 1;
                            } else if (recurrenceEdit.preset === '2w') {
                              frequency = 'weekly';
                              interval_value = 2;
                            } else if (recurrenceEdit.preset === '1m') {
                              frequency = 'monthly';
                              interval_value = 1;
                            } else if (recurrenceEdit.preset === '3m') {
                              frequency = 'monthly';
                              interval_value = 3;
                            } else if (recurrenceEdit.preset === 'quarterly') {
                              frequency = 'quarterly';
                              interval_value = 1;
                            } else {
                              frequency = 'yearly';
                              interval_value = 1;
                            }

                            await apiClient.put(`/recurring-tasks/${task.recurring_template_id}`, {
                              frequency,
                              interval_value,
                              days_of_week,
                            });
                            // Refresh template
                            const tmplRes = await apiClient.get(`/recurring-tasks/${task.recurring_template_id}`);
                            setRecurrenceTemplate(tmplRes.data);
                            dispatch(addNotification({
                              type: 'success',
                              title: 'Recurrence Updated',
                              message: 'Recurring schedule updated successfully',
                              duration: 3000,
                            }));
                          } catch (err) {
                            console.error('Failed to update recurrence', err);
                            dispatch(addNotification({
                              type: 'error',
                              title: 'Update Failed',
                              message: 'Could not update recurrence',
                              duration: 5000,
                            }));
                          }
                        }}
                        className="px-4 py-2 bg-user-blue text-white rounded-md hover:bg-user-blue transition-colors"
                      >
                        Update Recurrence
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">This task was generated from a recurring template, but details could not be loaded.</p>
                )}
              </div>
            )}

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
                className="px-4 py-2 bg-user-blue text-white rounded-md hover:bg-user-blue transition-colors"
              >
                Update Task
              </button>
            </div>
          </form>
        </div>
      )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Task Stats */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Task Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Progress</span>
                  <span className="text-sm font-medium text-gray-900">{stats.progressPercentage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Time Spent</span>
                  <span className="text-sm font-medium text-gray-900">{stats.timeSpent}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Time Remaining</span>
                  <span className="text-sm font-medium text-gray-900">{stats.timeRemaining}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Efficiency</span>
                  <span className="text-sm font-medium text-gray-900">{stats.efficiency}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Task Status */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Task Status</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${getTaskHealthStatus().color}`}></div>
                  <span className="text-sm text-gray-600">Health: {getTaskHealthStatus().status}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-medium">{stats.progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
                {stats.isOverdue && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">Overdue</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Project Info */}
          {project && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Project</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <FolderIcon className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
                      <p className="text-xs text-gray-500">{project.status}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="w-full mt-3 px-4 py-2 text-sm text-left text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    View Project Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Assignee Info */}
          {assignee && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Assignee</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{assignee.full_name || `${assignee.first_name} ${assignee.last_name}`}</p>
                      <p className="text-xs text-gray-500">{assignee.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          
        </div>
      </div>
    </div>
  );
};

export default TaskDetailOverviewPage;
