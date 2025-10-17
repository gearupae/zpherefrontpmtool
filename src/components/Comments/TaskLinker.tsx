import React, { useState, useRef, useEffect } from 'react';
import {
 HashtagIcon,
 LinkIcon,
 ArrowTopRightOnSquareIcon,
 ClockIcon,
 CheckCircleIcon,
 ExclamationCircleIcon,
 PauseCircleIcon,
 XCircleIcon,
 FlagIcon,
 UserIcon
} from '@heroicons/react/24/outline';

interface Task {
 id: string;
 title: string;
 description?: string;
 status: 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'completed' | 'cancelled';
 priority: 'low' | 'medium' | 'high' | 'critical';
 assignee?: {
 id: string;
 full_name: string;
 avatar_url?: string;
 };
 due_date?: string;
 project_id: string;
 project_name: string;
 progress: number;
 tags: string[];
 created_at: string;
 updated_at: string;
}

interface TaskLink {
 id: string;
 source_type: 'comment' | 'task' | 'project';
 source_id: string;
 target_task_id: string;
 target_task: Task;
 link_type: 'depends_on' | 'blocks' | 'relates_to' | 'duplicates' | 'mentions';
 created_at: string;
 created_by: {
 id: string;
 full_name: string;
 };
 description?: string;
}

interface TaskLinkerProps {
 currentEntityType: 'comment' | 'task' | 'project';
 currentEntityId: string;
 projectTasks: Task[];
 existingLinks: TaskLink[];
 onCreateLink: (targetTaskId: string, linkType: TaskLink['link_type'], description?: string) => void;
 onRemoveLink: (linkId: string) => void;
 onNavigateToTask: (taskId: string) => void;
 className?: string;
}

const TaskLinker: React.FC<TaskLinkerProps> = ({
 currentEntityType,
 currentEntityId,
 projectTasks,
 existingLinks,
 onCreateLink,
 onRemoveLink,
 onNavigateToTask,
 className = ''
}) => {
 const [showLinker, setShowLinker] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
 const [selectedLinkType, setSelectedLinkType] = useState<TaskLink['link_type']>('relates_to');
 const [linkDescription, setLinkDescription] = useState('');
 const [selectedTask, setSelectedTask] = useState<Task | null>(null);
 
 const searchInputRef = useRef<HTMLInputElement>(null);

 const linkTypes = [
 { value: 'depends_on', label: 'Depends On', description: 'This task cannot start until the linked task is completed' },
 { value: 'blocks', label: 'Blocks', description: 'The linked task cannot start until this task is completed' },
 { value: 'relates_to', label: 'Related To', description: 'General relationship between tasks' },
 { value: 'duplicates', label: 'Duplicates', description: 'This task is a duplicate of the linked task' },
 { value: 'mentions', label: 'Mentions', description: 'Referenced in discussion or comments' }
 ] as const;

 // Filter tasks based on search term and exclude current task and already linked tasks
 const filteredTasks = projectTasks.filter(task => {
 // Exclude current task if entity is a task
 if (currentEntityType === 'task' && task.id === currentEntityId) {
 return false;
 }
 
 // Exclude already linked tasks
 if (existingLinks.some(link => link.target_task_id === task.id)) {
 return false;
 }
 
 // Filter by search term
 if (searchTerm) {
 return (
 task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
 task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 task.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
 );
 }
 
 return true;
 });

 const getStatusIcon = (status: Task['status']) => {
 switch (status) {
 case 'completed':
 return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
 case 'in_progress':
 return <ArrowTopRightOnSquareIcon className="w-4 h-4 text-blue-500" />;
 case 'in_review':
 return <ClockIcon className="w-4 h-4 text-yellow-500" />;
 case 'blocked':
 return <ExclamationCircleIcon className="w-4 h-4 text-red-500" />;
 case 'cancelled':
 return <XCircleIcon className="w-4 h-4 text-gray-500" />;
 default:
 return <PauseCircleIcon className="w-4 h-4 text-gray-400" />;
 }
 };

 const getPriorityColor = (priority: Task['priority']) => {
 switch (priority) {
 case 'critical':
 return 'text-red-600 bg-red-100';
 case 'high':
 return 'text-orange-600 bg-orange-100';
 case 'medium':
 return 'text-yellow-600 bg-yellow-100';
 case 'low':
 return 'text-green-600 bg-green-100';
 }
 };

 const getLinkTypeColor = (linkType: TaskLink['link_type']) => {
 switch (linkType) {
 case 'depends_on':
 return 'text-red-700 bg-red-100';
 case 'blocks':
 return 'text-orange-700 bg-orange-100';
 case 'relates_to':
 return 'text-blue-700 bg-blue-100';
 case 'duplicates':
 return 'text-purple-700 bg-purple-100';
 case 'mentions':
 return 'text-gray-700 bg-gray-100';
 }
 };

 const handleCreateLink = () => {
 if (!selectedTask) return;
 
 onCreateLink(selectedTask.id, selectedLinkType, linkDescription.trim() || undefined);
 setSelectedTask(null);
 setLinkDescription('');
 setShowLinker(false);
 setSearchTerm('');
 };

 const formatDate = (dateString: string) => {
 const date = new Date(dateString);
 const now = new Date();
 const diffInDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
 
 if (diffInDays < 0) {
 return `${Math.abs(diffInDays)} days overdue`;
 } else if (diffInDays === 0) {
 return 'Due today';
 } else if (diffInDays === 1) {
 return 'Due tomorrow';
 } else {
 return `Due in ${diffInDays} days`;
 }
 };

 useEffect(() => {
 if (showLinker && searchInputRef.current) {
 searchInputRef.current.focus();
 }
 }, [showLinker]);

 return (
 <div className={`space-y-4 ${className}`}>
 {/* Existing Links */}
 {existingLinks.length > 0 && (
 <div className="bg-white border border-gray-200 rounded-lg">
 <div className="px-4 py-3 border-b border-gray-200">
 <h3 className="text-sm font-medium text-gray-900 flex items-center">
 <LinkIcon className="w-4 h-4 mr-2" />
 Linked Tasks ({existingLinks.length})
 </h3>
 </div>
 <div className="divide-y divide-gray-200">
 {existingLinks.map((link) => (
 <div key={link.id} className="p-4 hover:bg-gray-50">
 <div className="flex items-start justify-between">
 <div className="flex-1 min-w-0">
 <div className="flex items-center space-x-2 mb-2">
 <span className={`inline-flex items-center px-2 rounded-full text-xs font-medium ${getLinkTypeColor(link.link_type)}`}>
 {linkTypes.find(t => t.value === link.link_type)?.label}
 </span>
 {getStatusIcon(link.target_task.status)}
 <span className={`inline-flex items-center px-2 rounded-full text-xs font-medium ${getPriorityColor(link.target_task.priority)}`}>
 <FlagIcon className="w-3 h-3 mr-1" />
 {link.target_task.priority}
 </span>
 </div>
 
 <button
 onClick={() => onNavigateToTask(link.target_task.id)}
 className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline mb-1"
 >
 {link.target_task.title}
 </button>
 
 {link.target_task.description && (
 <p className="text-sm text-gray-600 mb-2 line-clamp-2">
 {link.target_task.description}
 </p>
 )}
 
 <div className="flex items-center space-x-4 text-xs text-gray-500">
 <span>{link.target_task.project_name}</span>
 {link.target_task.assignee && (
 <div className="flex items-center space-x-1">
 <UserIcon className="w-3 h-3" />
 <span>{link.target_task.assignee.full_name}</span>
 </div>
 )}
 {link.target_task.due_date && (
 <div className="flex items-center space-x-1">
 <ClockIcon className="w-3 h-3" />
 <span>{formatDate(link.target_task.due_date)}</span>
 </div>
 )}
 <span>Progress: {link.target_task.progress}%</span>
 </div>
 
 {link.description && (
 <p className="text-sm text-gray-700 mt-2 italic">
"{link.description}"
 </p>
 )}
 
 <p className="text-xs text-gray-400 mt-2">
 Linked by {link.created_by.full_name} on {new Date(link.created_at).toLocaleDateString()}
 </p>
 </div>
 
 <button
 onClick={() => onRemoveLink(link.id)}
 className="ml-4 p-1 text-gray-400 hover:text-red-600"
 title="Remove link"
 >
 <XCircleIcon className="w-4 h-4" />
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Add Link Button */}
 {!showLinker && (
 <button
 onClick={() => setShowLinker(true)}
 className="inline-flex items-center py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
 >
 <LinkIcon className="w-4 h-4 mr-2" />
 Link Task
 </button>
 )}

 {/* Task Linker Modal */}
 {showLinker && (
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-medium text-gray-900">Link Task</h3>
 <button
 onClick={() => {
 setShowLinker(false);
 setSelectedTask(null);
 setSearchTerm('');
 setLinkDescription('');
 }}
 className="text-gray-400 hover:text-gray-600"
 >
 <XCircleIcon className="w-5 h-5" />
 </button>
 </div>

 {/* Link Type Selection */}
 <div className="mb-4">
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Link Type
 </label>
 <select
 value={selectedLinkType}
 onChange={(e) => setSelectedLinkType(e.target.value as TaskLink['link_type'])}
 className="block w-full border border-gray-300 rounded-md py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
 >
 {linkTypes.map((type) => (
 <option key={type.value} value={type.value}>
 {type.label}
 </option>
 ))}
 </select>
 <p className="mt-1 text-xs text-gray-500">
 {linkTypes.find(t => t.value === selectedLinkType)?.description}
 </p>
 </div>

 {/* Task Search */}
 <div className="mb-4">
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Search Tasks
 </label>
 <div className="relative">
 <HashtagIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
 <input
 ref={searchInputRef}
 type="text"
 placeholder="Search by title, description, or tags..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 </div>

 {/* Task List */}
 <div className="mb-4">
 <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
 {filteredTasks.length === 0 ? (
 <div className="p-4 text-center text-gray-500">
 {searchTerm ? 'No tasks found matching your search.' : 'No tasks available to link.'}
 </div>
 ) : (
 <div className="divide-y divide-gray-200">
 {filteredTasks.map((task) => (
 <button
 key={task.id}
 onClick={() => setSelectedTask(task)}
 className={`w-full text-left p-3 hover:bg-gray-50 focus:bg-blue-50 focus:outline-none ${
 selectedTask?.id === task.id ? 'bg-blue-50 border-blue-200' : ''
 }`}
 >
 <div className="flex items-start justify-between">
 <div className="flex-1 min-w-0">
 <div className="flex items-center space-x-2 mb-1">
 {getStatusIcon(task.status)}
 <span className="text-sm font-medium text-gray-900 truncate">
 {task.title}
 </span>
 <span className={`inline-flex items-center px-2 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
 {task.priority}
 </span>
 </div>
 
 {task.description && (
 <p className="text-sm text-gray-600 mb-2 line-clamp-1">
 {task.description}
 </p>
 )}
 
 <div className="flex items-center space-x-3 text-xs text-gray-500">
 <span>{task.project_name}</span>
 {task.assignee && (
 <span>Assigned to {task.assignee.full_name}</span>
 )}
 {task.due_date && (
 <span>{formatDate(task.due_date)}</span>
 )}
 </div>
 
 {task.tags.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-2">
 {task.tags.slice(0, 3).map((tag, index) => (
 <span
 key={index}
 className="inline-flex items-center px-2 rounded text-xs font-medium bg-gray-100 text-gray-800"
 >
 {tag}
 </span>
 ))}
 {task.tags.length > 3 && (
 <span className="text-xs text-gray-500">+{task.tags.length - 3} more</span>
 )}
 </div>
 )}
 </div>
 
 {selectedTask?.id === task.id && (
 <CheckCircleIcon className="w-5 h-5 text-blue-600 ml-2" />
 )}
 </div>
 </button>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Optional Description */}
 {selectedTask && (
 <div className="mb-4">
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Description (Optional)
 </label>
 <textarea
 value={linkDescription}
 onChange={(e) => setLinkDescription(e.target.value)}
 placeholder="Add context about why these tasks are linked..."
 className="block w-full border border-gray-300 rounded-md py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
 rows={2}
 />
 </div>
 )}

 {/* Action Buttons */}
 <div className="flex justify-end space-x-3">
 <button
 onClick={() => {
 setShowLinker(false);
 setSelectedTask(null);
 setSearchTerm('');
 setLinkDescription('');
 }}
 className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
 >
 Cancel
 </button>
 <button
 onClick={handleCreateLink}
 disabled={!selectedTask}
 className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
 >
 Create Link
 </button>
 </div>
 </div>
 )}
 </div>
 );
};

export default TaskLinker;