import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchTasks, updateTask } from '../../store/slices/taskSlice';
import { fetchProjects } from '../../store/slices/projectSlice';
import { addNotification } from '../../store/slices/notificationSlice';
import { 
 Task, 
 TaskStatus, 
 TaskPriority, 
 Project, 
 TaskComment, 
 TaskCommentCreate, 
 TaskAttachment, 
 TaskDocument, 
 TaskDocumentCreate,
 DocumentType,
 ActivityItem,
 User
} from '../../types';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { useTaskPresence } from '../../hooks/useTaskPresence';
import {
 ArrowLeftIcon,
 CheckCircleIcon,
 ClockIcon,
 UserIcon,
 CalendarIcon,
 ExclamationTriangleIcon,
 PencilIcon,
 TagIcon,
 DocumentTextIcon,
 PlayIcon,
 PauseIcon,
 FlagIcon,
 ChatBubbleLeftIcon,
 PaperClipIcon,
 PlusIcon,
 DocumentIcon,
 EyeIcon,
 TrashIcon,
 ArrowDownTrayIcon,
 ClockIcon as ActivityClockIcon
} from '@heroicons/react/24/outline';

const TaskDetailPage: React.FC = () => {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const dispatch = useAppDispatch();
 // Real-time presence on this task
 const { members, setMode, sendTyping, lastTyping } = useTaskPresence(id, 'viewing');
 const { tasks, isLoading: tasksLoading } = useAppSelector((state: any) => state.tasks || { tasks: [], isLoading: false });
 const { projects } = useAppSelector((state: any) => state.projects || { projects: [] });
 const currentUserId = useAppSelector((state: any) => (state.auth && state.auth.user && state.auth.user.id) || null);
 
 const [task, setTask] = useState<Task | null>(null);
 const [project, setProject] = useState<Project | null>(null);
 const [isEditing, setIsEditing] = useState(false);
 const [editedTask, setEditedTask] = useState<Partial<Task>>({});
 
 // Comments
 const [comments, setComments] = useState<TaskComment[]>([]);
 const [newComment, setNewComment] = useState('');
 const [replyToComment, setReplyToComment] = useState<string | null>(null);
 const [isLoadingComments, setIsLoadingComments] = useState(false);
 
 // Attachments
 const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
 const [isUploadingFile, setIsUploadingFile] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);
 
 // Documents
 const [documents, setDocuments] = useState<TaskDocument[]>([]);
 const [isCreatingDocument, setIsCreatingDocument] = useState(false);
 const [newDocument, setNewDocument] = useState<TaskDocumentCreate>({
 title: '',
 content: '',
 document_type: DocumentType.NOTES,
 tags: []
 });
 
 // Activity
 const [activities, setActivities] = useState<ActivityItem[]>([]);
 const [isLoadingActivities, setIsLoadingActivities] = useState(false);
 
 // Active tab
 const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'attachments' | 'documents' | 'activity'>('overview');

 useEffect(() => {
 dispatch(fetchTasks());
 dispatch(fetchProjects());
 }, [dispatch]);

 useEffect(() => {
 if (tasks && id) {
 const foundTask = tasks.find((t: Task) => t.id === id);
 setTask(foundTask || null);
 if (foundTask) {
 setEditedTask(foundTask);
 }
 }
 }, [tasks, id]);

 useEffect(() => {
 if (task && projects) {
 const foundProject = projects.find((p: Project) => p.id === task.project_id);
 setProject(foundProject || null);
 }
 }, [task, projects]);

 useEffect(() => {
 if (task?.id) {
 fetchComments();
 fetchAttachments();
 fetchDocuments();
 fetchActivities();
 }
 }, [task?.id]);

 // Update presence mode based on editing state
 useEffect(() => {
 try {
 setMode(isEditing ? 'editing' : 'viewing');
 } catch {}
 }, [isEditing, setMode]);

 // API Functions
 const fetchComments = async () => {
 if (!task?.id) return;
 setIsLoadingComments(true);
 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.get(`/tasks/${task.id}/comments/`);
 setComments(response.data || []);
 } catch (error) {
 console.error('Failed to fetch comments:', error);
 setComments([]);
 } finally {
 setIsLoadingComments(false);
 }
 };

 const fetchAttachments = async () => {
 if (!task?.id) return;
 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.get(`/tasks/${task.id}/attachments/`);
 setAttachments(response.data || []);
 } catch (error) {
 console.error('Failed to fetch attachments:', error);
 setAttachments([]);
 }
 };

 const fetchDocuments = async () => {
 if (!task?.id) return;
 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.get(`/tasks/${task.id}/documents/`);
 setDocuments(response.data || []);
 } catch (error) {
 console.error('Failed to fetch documents:', error);
 setDocuments([]);
 }
 };

 const fetchActivities = async () => {
 if (!task?.id) return;
 setIsLoadingActivities(true);
 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.get(`/tasks/${task.id}/activities/`);
 setActivities(response.data || []);
 } catch (error) {
 console.error('Failed to fetch activities:', error);
 setActivities([]);
 } finally {
 setIsLoadingActivities(false);
 }
 };

 const handleStatusChange = async (newStatus: TaskStatus) => {
 if (task) {
 try {
 await dispatch(updateTask({ id: task.id, data: { status: newStatus } })).unwrap();
 setTask({ ...task, status: newStatus });
 } catch (error) {
 console.error('Failed to update task status:', error);
 }
 }
 };

 const handleSaveEdit = async () => {
 if (task && editedTask) {
 try {
 await dispatch(updateTask({ id: task.id, data: editedTask })).unwrap();
 setTask({ ...task, ...editedTask } as Task);
 setIsEditing(false);
 } catch (error) {
 console.error('Failed to update task:', error);
 }
 }
 };

 // Comment Handlers
 const handleAddComment = async () => {
 if (!newComment.trim() || !task?.id) return;
 
 try {
 const { default: apiClient } = await import('../../api/client');
 const commentData: TaskCommentCreate = {
 content: newComment.trim(),
 parent_comment_id: replyToComment || undefined
 };
 
 const response = await apiClient.post(`/tasks/${task.id}/comments/`, commentData);
 setComments(prev => [...prev, response.data]);
 setNewComment('');
 setReplyToComment(null);
 
 dispatch(addNotification({
 type: 'success',
 title: 'Comment Added',
 message: 'Your comment has been added successfully.',
 duration: 3000
 }));
 
 fetchActivities(); // Refresh activities
 } catch (error) {
 console.error('Failed to add comment:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Failed to Add Comment',
 message: 'There was an error adding your comment. Please try again.',
 duration: 5000
 }));
 }
 };

 const handleDeleteComment = async (commentId: string) => {
 if (!task?.id) return;
 
 try {
 const { default: apiClient } = await import('../../api/client');
 await apiClient.delete(`/tasks/${task.id}/comments/${commentId}/`);
 setComments(prev => prev.filter(c => c.id !== commentId));
 
 dispatch(addNotification({
 type: 'success',
 title: 'Comment Deleted',
 message: 'The comment has been deleted.',
 duration: 3000
 }));
 } catch (error) {
 console.error('Failed to delete comment:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Failed to Delete Comment',
 message: 'There was an error deleting the comment.',
 duration: 5000
 }));
 }
 };

 // Attachment Handlers
 const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file || !task?.id) return;
 
 setIsUploadingFile(true);
 try {
 const { default: apiClient } = await import('../../api/client');
 const formData = new FormData();
 formData.append('file', file);
 
 const response = await apiClient.post(`/tasks/${task.id}/attachments`, formData, {
 headers: {
 'Content-Type': 'multipart/form-data'
 }
 });
 
 setAttachments(prev => [...prev, response.data]);
 
 dispatch(addNotification({
 type: 'success',
 title: 'File Uploaded',
 message: `${file.name} has been uploaded successfully.`,
 duration: 3000
 }));
 
 fetchActivities(); // Refresh activities
 } catch (error) {
 console.error('Failed to upload file:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Upload Failed',
 message: 'There was an error uploading the file.',
 duration: 5000
 }));
 } finally {
 setIsUploadingFile(false);
 if (fileInputRef.current) {
 fileInputRef.current.value = '';
 }
 }
 };

 const handleDeleteAttachment = async (attachmentId: string) => {
 if (!task?.id) return;
 
 try {
 const { default: apiClient } = await import('../../api/client');
 await apiClient.delete(`/tasks/${task.id}/attachments/${attachmentId}`);
 setAttachments(prev => prev.filter(a => a.id !== attachmentId));
 
 dispatch(addNotification({
 type: 'success',
 title: 'Attachment Deleted',
 message: 'The attachment has been removed.',
 duration: 3000
 }));
 } catch (error) {
 console.error('Failed to delete attachment:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Failed to Delete Attachment',
 message: 'There was an error deleting the attachment.',
 duration: 5000
 }));
 }
 };

 const handleDownloadAttachment = async (attachment: TaskAttachment) => {
 if (!task?.id) return;
 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.get(`/tasks/${task.id}/attachments/${attachment.id}/download`, {
 responseType: 'blob',
 });
 const blob = new Blob([response.data]);
 const url = window.URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = attachment.original_filename || attachment.filename || 'download';
 document.body.appendChild(link);
 link.click();
 link.remove();
 window.URL.revokeObjectURL(url);
 } catch (error) {
 console.error('Failed to download attachment:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Download Failed',
 message: 'Could not download the attachment. Please try again.',
 duration: 5000
 }));
 }
 };

 // Document Handlers
 const handleCreateDocument = async () => {
 if (!newDocument.title.trim() || !newDocument.content.trim() || !task?.id) return;
 
 try {
 const { default: apiClient } = await import('../../api/client');
 const response = await apiClient.post(`/tasks/${task.id}/documents`, newDocument);
 
 setDocuments(prev => [...prev, response.data]);
 setNewDocument({
 title: '',
 content: '',
 document_type: DocumentType.NOTES,
 tags: []
 });
 setIsCreatingDocument(false);
 
 dispatch(addNotification({
 type: 'success',
 title: 'Document Created',
 message: `${newDocument.title} has been created successfully.`,
 duration: 3000
 }));
 
 fetchActivities(); // Refresh activities
 } catch (error) {
 console.error('Failed to create document:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Failed to Create Document',
 message: 'There was an error creating the document.',
 duration: 5000
 }));
 }
 };

 const handleDeleteDocument = async (documentId: string) => {
 if (!task?.id) return;
 
 try {
 const { default: apiClient } = await import('../../api/client');
 await apiClient.delete(`/tasks/${task.id}/documents/${documentId}`);
 setDocuments(prev => prev.filter(d => d.id !== documentId));
 
 dispatch(addNotification({
 type: 'success',
 title: 'Document Deleted',
 message: 'The document has been deleted.',
 duration: 3000
 }));
 } catch (error) {
 console.error('Failed to delete document:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Failed to Delete Document',
 message: 'There was an error deleting the document.',
 duration: 5000
 }));
 }
 };

 // Utility functions
 const formatFileSize = (bytes: number) => {
 if (bytes === 0) return '0 Bytes';
 const k = 1024;
 const sizes = ['Bytes', 'KB', 'MB', 'GB'];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
 };

 const getActivityIcon = (type: string) => {
 switch (type) {
 case 'comment_added':
 return <ChatBubbleLeftIcon className="h-4 w-4" />;
 case 'attachment_added':
 return <PaperClipIcon className="h-4 w-4" />;
 case 'document_created':
 return <DocumentIcon className="h-4 w-4" />;
 case 'task_updated':
 return <PencilIcon className="h-4 w-4" />;
 default:
 return <ActivityClockIcon className="h-4 w-4" />;
 }
 };

 const formatRelativeTime = (dateString: string) => {
 const date = new Date(dateString);
 const now = new Date();
 const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
 
 if (diffInSeconds < 60) return 'just now';
 if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
 if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
 if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
 return date.toLocaleDateString();
 };

 if (tasksLoading) {
 return <div />;
 }

 if (!task) {
 return (
 <div className="text-center2">
 <CheckCircleIcon className="mx-auto h-12 w-12 text-secondary-400" />
 <h3 className="mt-2 text-sm font-medium text-secondary-900">Task not found</h3>
 <p className="mt-1 text-sm text-secondary-500">
 The task you're looking for doesn't exist or you don't have access to it.
 </p>
 <div className="mt-6">
 <button
 onClick={() => navigate('/tasks')}
 className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
 >
 <ArrowLeftIcon className="-ml-1 mr-2 h-4 w-4" />
 Back to Tasks
 </button>
 </div>
 </div>
 );
 }

 const getStatusColor = (status: TaskStatus) => {
 switch (status) {
 case TaskStatus.COMPLETED: return 'bg-green-50 text-green-700 border border-green-200';
 case TaskStatus.IN_PROGRESS: return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
 case TaskStatus.IN_REVIEW: return 'bg-blue-50 text-blue-700 border border-blue-200';
 case TaskStatus.BLOCKED: return 'bg-red-50 text-red-700 border border-red-200';
 case TaskStatus.CANCELLED: return 'bg-gray-50 text-gray-700 border border-gray-200';
 default: return 'bg-gray-50 text-gray-700 border border-gray-200';
 }
 };

 const getPriorityColor = (priority: TaskPriority) => {
 switch (priority) {
 case TaskPriority.HIGH: return 'text-red-700 bg-red-50 border border-red-200';
 case TaskPriority.MEDIUM: return 'text-blue-700 bg-blue-50 border border-blue-200';
 case TaskPriority.LOW: return 'text-gray-700 bg-gray-50 border border-gray-200';
 default: return 'text-gray-700 bg-gray-50 border border-gray-200';
 }
 };

 const getPriorityIcon = (priority: TaskPriority) => {
 switch (priority) {
 case TaskPriority.HIGH: return <ExclamationTriangleIcon className="h-4 w-4" />;
 case TaskPriority.MEDIUM: return <FlagIcon className="h-4 w-4" />;
 case TaskPriority.LOW: return <FlagIcon className="h-4 w-4" />;
 default: return <FlagIcon className="h-4 w-4" />;
 }
 };

 const isOverdue = task.due_date && task.status !== TaskStatus.COMPLETED && new Date(task.due_date) < new Date();

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:px-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-3">
 <button
 onClick={() => navigate('/tasks')}
 className="inline-flex items-center p-2 border border-transparent rounded-md text-secondary-400 hover:text-secondary-500"
 >
 <ArrowLeftIcon className="h-5 w-5" />
 </button>
 <div className="flex-1">
 {isEditing ? (
 <input
 type="text"
 value={editedTask.title || ''}
 onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
 className="text-2xl font-bold text-secondary-900 border-none outline-none bg-transparent"
 />
 ) : (
 <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-2">
 <span>{task.title}</span>
 {(task.is_recurring || (task as any).recurring_template_id) && (
 <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
 Recurring
 </span>
 )}
 </h1>
 )}
 {project && (
 <p className="text-sm text-secondary-500">
 in <span className="font-medium">{project.name}</span>
 </p>
 )}
 {/* Presence bar */}
 <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-2">
 {members.length > 0 ? (
 members.map((m) => (
 <span key={m.userId} className={`inline-flex items-center px-2 py-0.5 rounded-full border ${m.mode === 'editing' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
 <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: m.mode === 'editing' ? '#f59e0b' : '#9ca3af' }} />
 @{m.user?.name || m.userId} {m.mode}
 </span>
 ))
 ) : (
 <span className="text-gray-400">No one else here</span>
 )}
 </div>
 {lastTyping && (!currentUserId || lastTyping.userId !== currentUserId) && (
 <div className="mt-1 text-xs text-indigo-600">
 Live: @{lastTyping.userId} is editing {lastTyping.field}{lastTyping.preview ? ` →"${String(lastTyping.preview).slice(0, 60)}"` : ''}
 </div>
 )}
 </div>
 </div>
 <div className="flex items-center space-x-3">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
 {task.status.replace('_', ' ')}
 </span>
 {isOverdue && (
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
 Overdue
 </span>
 )}
 {isEditing ? (
 <div className="flex space-x-2">
 <button
 onClick={handleSaveEdit}
 className="inline-flex items-center py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
 >
 Save
 </button>
 <button
 onClick={() => {
 setIsEditing(false);
 setEditedTask(task);
 }}
 className="inline-flex items-center py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50"
 >
 Cancel
 </button>
 </div>
 ) : (
 <button
 onClick={() => setIsEditing(true)}
 className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
 >
 <PencilIcon className="-ml-1 mr-2 h-4 w-4" />
 Edit Task
 </button>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Tab Navigation */}
 <div className="bg-white shadow rounded-lg">
 <div className="border-b border-gray-200">
 <nav className="flex space-x-8 px-6" aria-label="Tabs">
 {[
 { key: 'overview', label: 'Overview', icon: DocumentTextIcon },
 { key: 'comments', label: `Comments (${comments.length})`, icon: ChatBubbleLeftIcon },
 { key: 'attachments', label: `Attachments (${attachments.length})`, icon: PaperClipIcon },
 { key: 'documents', label: `Documents (${documents.length})`, icon: DocumentIcon },
 { key: 'activity', label: 'Activity', icon: ActivityClockIcon }
 ].map((tab) => {
 const IconComponent = tab.icon;
 return (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key as any)}
 className={`flex items-center whitespace-nowrap py-4 px-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-0 ${
 activeTab === tab.key ? 'text-indigo-600' : 'text-black hover:text-gray-700'
 }`}
 >
 <IconComponent className="h-4 w-4 mr-2" />
 {tab.label}
 </button>
 );
 })}
 </nav>
 </div>

 <div className="p-6">
 {activeTab === 'overview' && (
 <div className="space-y-6">
 {/* Description */}
 <div>
 <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
 <DocumentTextIcon className="h-5 w-5 mr-2" />
 Description
 </h3>
 {isEditing ? (
 <textarea
 value={editedTask.description || ''}
 onChange={(e) => { setEditedTask({ ...editedTask, description: e.target.value }); try { sendTyping('description', e.target.value.slice(0, 80)); } catch {} }}
 rows={4}
 className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
 placeholder="Add a description..."
 />
 ) : (
 <p className="text-gray-700">
 {task.description || 'No description provided.'}
 </p>
 )}
 </div>
 </div>
 )}

 {activeTab === 'comments' && (
 <div className="space-y-6">
 {/* Add Comment Form */}
 <div className="border-b border-gray-200 pb-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">
 {replyToComment ? 'Reply to Comment' : 'Add Comment'}
 </h3>
 <div className="space-y-3">
 <textarea
 value={newComment}
 onChange={(e) => setNewComment(e.target.value)}
 rows={3}
 className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
 placeholder="Write a comment..."
 />
 <div className="flex justify-between items-center">
 <div>
 {replyToComment && (
 <button
 onClick={() => {
 setReplyToComment(null);
 setNewComment('');
 }}
 className="text-sm text-gray-500 hover:text-gray-700"
 >
 Cancel Reply
 </button>
 )}
 </div>
 <button
 onClick={handleAddComment}
 disabled={!newComment.trim()}
 className="btn-primary"
 >
 <ChatBubbleLeftIcon className="h-4 w-4 mr-2" />
 {replyToComment ? 'Reply' : 'Comment'}
 </button>
 </div>
 </div>
 </div>

 {/* Comments List */}
 <div className="space-y-4">
 {isLoadingComments ? (
 <div className="flex justify-center py-8">
 <LoadingSpinner size="medium" />
 </div>
 ) : comments.length === 0 ? (
 <div className="text-center py-8">
 <ChatBubbleLeftIcon className="mx-auto h-12 w-12 text-gray-400" />
 <h3 className="mt-2 text-sm font-medium text-gray-900">No comments yet</h3>
 <p className="mt-1 text-sm text-gray-500">Start the conversation with your team.</p>
 </div>
 ) : (
 comments.map((comment) => (
 <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
 <div className="flex items-start justify-between">
 <div className="flex items-start space-x-3">
 <div className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-medium">
 {comment.user?.first_name?.[0] || 'U'}
 </div>
 <div className="flex-1">
 <div className="text-sm">
 <span className="font-medium text-gray-900">
 {comment.user?.first_name} {comment.user?.last_name}
 </span>
 <span className="text-gray-500 ml-2">
 {formatRelativeTime(comment.created_at)}
 </span>
 </div>
 <div className="mt-2 text-gray-700 whitespace-pre-wrap">
 {comment.content}
 </div>
 <div className="mt-2 flex items-center space-x-4">
 <button
 onClick={() => {
 setReplyToComment(comment.id);
 setNewComment(`@${comment.user?.first_name || 'User'} `);
 }}
 className="text-sm text-blue-600 hover:text-blue-800"
 >
 Reply
 </button>
 </div>
 </div>
 </div>
 <button
 onClick={() => handleDeleteComment(comment.id)}
 className="text-gray-400 hover:text-red-600"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 {/* Replies would go here if implementing nested comments */}
 </div>
 ))
 )}
 </div>
 </div>
 )}

 {activeTab === 'attachments' && (
 <div className="space-y-6">
 {/* Upload Section */}
 <div className="border-b border-gray-200 pb-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Files</h3>
 <div className="flex items-center space-x-3">
 <input
 type="file"
 ref={fileInputRef}
 onChange={handleFileUpload}
 className="hidden"
 multiple={false}
 />
 <button
 onClick={() => fileInputRef.current?.click()}
 disabled={isUploadingFile}
 className="btn-primary"
 >
 <PaperClipIcon className="h-4 w-4 mr-2" />
 {isUploadingFile ? 'Uploading...' : 'Choose File'}
 </button>
 <p className="text-sm text-gray-500">
 Upload documents, images, or other files related to this task.
 </p>
 </div>
 </div>

 {/* Attachments List */}
 <div className="space-y-3">
 {attachments.length === 0 ? (
 <div className="text-center py-8">
 <PaperClipIcon className="mx-auto h-12 w-12 text-gray-400" />
 <h3 className="mt-2 text-sm font-medium text-gray-900">No attachments</h3>
 <p className="mt-1 text-sm text-gray-500">Upload files to share with your team.</p>
 </div>
 ) : (
 attachments.map((attachment) => (
 <div key={attachment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
 <div className="flex items-center space-x-3">
 <PaperClipIcon className="h-5 w-5 text-gray-400" />
 <div>
 <p className="text-sm font-medium text-gray-900">
 {attachment.original_filename}
 </p>
 <p className="text-xs text-gray-500">
 {formatFileSize(attachment.file_size)} • 
 Uploaded {formatRelativeTime(attachment.created_at)}
 </p>
 </div>
 </div>
 <div className="flex items-center space-x-2">
 <button
 onClick={() => handleDownloadAttachment(attachment)}
 className="text-blue-600 hover:text-blue-800"
 >
 <ArrowDownTrayIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDeleteAttachment(attachment.id)}
 className="text-red-600 hover:text-red-800"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 )}

 {activeTab === 'documents' && (
 <div className="space-y-6">
 {/* Create Document Section */}
 <div className="border-b border-gray-200 pb-6">
 <div className="flex justify-between items-center mb-4">
 <h3 className="text-lg font-medium text-gray-900">Task Documents</h3>
 <button
 onClick={() => setIsCreatingDocument(!isCreatingDocument)}
 className="btn-primary"
 >
 <PlusIcon className="h-4 w-4 mr-2" />
 Create Document
 </button>
 </div>

 {isCreatingDocument && (
 <div className="border border-gray-200 rounded-lg p-4 space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Document Title
 </label>
 <input
 type="text"
 value={newDocument.title}
 onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
 className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
 placeholder="Enter document title..."
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Document Type
 </label>
 <select
 value={newDocument.document_type}
 onChange={(e) => setNewDocument({ ...newDocument, document_type: e.target.value as DocumentType })}
 className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
 >
 {Object.values(DocumentType).map((type) => (
 <option key={type} value={type}>
 {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Content
 </label>
 <textarea
 value={newDocument.content}
 onChange={(e) => setNewDocument({ ...newDocument, content: e.target.value })}
 rows={10}
 className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
 placeholder="Write your document content here..."
 />
 </div>

 <div className="flex justify-end space-x-3">
 <button
 onClick={() => {
 setIsCreatingDocument(false);
 setNewDocument({
 title: '',
 content: '',
 document_type: DocumentType.NOTES,
 tags: []
 });
 }}
 className="btn-secondary"
 >
 Cancel
 </button>
 <button
 onClick={handleCreateDocument}
 disabled={!newDocument.title.trim() || !newDocument.content.trim()}
 className="btn-primary"
 >
 <DocumentIcon className="h-4 w-4 mr-2" />
 Create Document
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Documents List */}
 <div className="space-y-3">
 {documents.length === 0 ? (
 <div className="text-center py-8">
 <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
 <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
 <p className="mt-1 text-sm text-gray-500">Create documents to organize task information.</p>
 </div>
 ) : (
 documents.map((document) => (
 <div key={document.id} className="border border-gray-200 rounded-lg p-4">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center space-x-2 mb-2">
 <DocumentIcon className="h-5 w-5 text-gray-400" />
 <h4 className="text-lg font-medium text-gray-900">{document.title}</h4>
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
 {document.document_type.replace('_', ' ')}
 </span>
 </div>
 <div className="text-gray-700 mb-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
 {document.content}
 </div>
 <div className="text-xs text-gray-500">
 Created {formatRelativeTime(document.created_at)} • v{document.version}
 </div>
 </div>
 <div className="flex items-center space-x-2 ml-4">
 <button
 onClick={() => {
 // View/edit document logic would go here
 console.log('View document:', document.id);
 }}
 className="text-blue-600 hover:text-blue-800"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDeleteDocument(document.id)}
 className="text-red-600 hover:text-red-800"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 )}

 {activeTab === 'activity' && (
 <div className="space-y-6">
 <h3 className="text-lg font-medium text-gray-900">Activity Timeline</h3>
 
 {isLoadingActivities ? (
 <div className="flex justify-center py-8">
 <LoadingSpinner size="medium" />
 </div>
 ) : activities.length === 0 ? (
 <div className="text-center py-8">
 <ActivityClockIcon className="mx-auto h-12 w-12 text-gray-400" />
 <h3 className="mt-2 text-sm font-medium text-gray-900">No activity yet</h3>
 <p className="mt-1 text-sm text-gray-500">Activity will appear here as changes are made to this task.</p>
 </div>
 ) : (
 <div className="flow-root">
 <ul className="-mb-8">
 {activities.map((activity, idx) => (
 <li key={activity.id}>
 <div className="relative pb-8">
 {idx !== activities.length - 1 && (
 <span
 className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
 aria-hidden="true"
 />
 )}
 <div className="relative flex space-x-3">
 <div className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
 <div className="text-white">
 {getActivityIcon(activity.type)}
 </div>
 </div>
 <div className="flex-1 min-w-0">
 <div>
 <p className="text-sm text-gray-900">
 <span className="font-medium">{activity.user_name}</span>{' '}
 {activity.title}
 </p>
 {activity.description && (
 <p className="mt-1 text-sm text-gray-500">{activity.description}</p>
 )}
 </div>
 <div className="mt-1 text-xs text-gray-500">
 {formatRelativeTime(activity.created_at)}
 </div>
 </div>
 </div>
 </div>
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
 {/* Main Content - Now contains Quick Actions */}
 <div className="lg:col-span-2 space-y-6">
 {/* Status Actions */}
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:px-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
 <div className="flex flex-wrap gap-2">
 {task.status === TaskStatus.TODO && (
 <button
 onClick={() => handleStatusChange(TaskStatus.IN_PROGRESS)}
 className="inline-flex items-center py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
 >
 <PlayIcon className="h-4 w-4 mr-2" />
 Start Task
 </button>
 )}
 {task.status === TaskStatus.IN_PROGRESS && (
 <>
 <button
 onClick={() => handleStatusChange(TaskStatus.IN_REVIEW)}
 className="inline-flex items-center py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
 >
 <CheckCircleIcon className="h-4 w-4 mr-2" />
 Ready for Review
 </button>
 <button
 onClick={() => handleStatusChange(TaskStatus.BLOCKED)}
 className="inline-flex items-center py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
 >
 <PauseIcon className="h-4 w-4 mr-2" />
 Block Task
 </button>
 </>
 )}
 {task.status === TaskStatus.IN_REVIEW && (
 <button
 onClick={() => handleStatusChange(TaskStatus.COMPLETED)}
 className="inline-flex items-center py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
 >
 <CheckCircleIcon className="h-4 w-4 mr-2" />
 Mark Complete
 </button>
 )}
 {task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED && (
 <button
 onClick={() => handleStatusChange(TaskStatus.COMPLETED)}
 className="inline-flex items-center py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50"
 >
 <CheckCircleIcon className="h-4 w-4 mr-2" />
 Mark Complete
 </button>
 )}
 </div>
 </div>
 </div>

 </div>

 {/* Sidebar */}
 <div className="space-y-6">
 {/* Task Details */}
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:px-6">
 <h3 className="text-lg font-medium text-gray-900">Task Details</h3>
 <div className="mt-4 space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-gray-500">Status</span>
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
 {task.status.replace('_', ' ')}
 </span>
 </div>
 
 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-gray-500">Priority</span>
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
 {getPriorityIcon(task.priority)}
 <span className="ml-1">{task.priority}</span>
 </span>
 </div>

 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-gray-500">Assignee</span>
 <span className="text-sm text-gray-900">
 {task.assignee_id ? 'Assigned' : 'Unassigned'}
 </span>
 </div>

 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-gray-500">Due Date</span>
 <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
 {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
 </span>
 </div>

 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-gray-500">Created</span>
 <span className="text-sm text-gray-900">
 {new Date(task.created_at).toLocaleDateString()}
 </span>
 </div>

 {task.estimated_hours && (
 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-gray-500">Estimated</span>
 <span className="text-sm text-gray-900">{task.estimated_hours}h</span>
 </div>
 )}

 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-gray-500">Actual Hours</span>
 <span className="text-sm text-gray-900">{task.actual_hours}h</span>
 </div>
 </div>
 </div>
 </div>

 {/* Labels & Tags */}
 {(task.labels.length > 0 || task.tags.length > 0) && (
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:px-6">
 <h3 className="text-lg font-medium text-gray-900 flex items-center">
 <TagIcon className="h-5 w-5 mr-2" />
 Labels & Tags
 </h3>
 <div className="mt-4 space-y-3">
 {task.labels.length > 0 && (
 <div>
 <span className="text-sm font-medium text-gray-500 block mb-2">Labels</span>
 <div className="flex flex-wrap gap-2">
 {task.labels.map((label, index) => (
 <span
 key={index}
 className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
 >
 {label}
 </span>
 ))}
 </div>
 </div>
 )}
 
 {task.tags.length > 0 && (
 <div>
 <span className="text-sm font-medium text-gray-500 block mb-2">Tags</span>
 <div className="flex flex-wrap gap-2">
 {task.tags.map((tag, index) => (
 <span
 key={index}
 className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
 >
 #{tag}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

export default TaskDetailPage;
