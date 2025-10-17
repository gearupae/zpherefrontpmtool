import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Project, TaskPriority, ProjectPriority } from '../../types';
import {
 CalendarIcon,
 UserIcon,
 ClockIcon,
 CurrencyDollarIcon,
 FlagIcon,
 FolderIcon,
 RectangleStackIcon,
} from '@heroicons/react/24/outline';

interface KanbanCardProps {
 item: Task | Project;
 type: 'tasks' | 'projects';
 isDragging?: boolean;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ item, type, isDragging = false }) => {
 const navigate = useNavigate();
 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 active,
 } = useSortable({ id: item.id });

 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 opacity: isDragging ? 0.8 : 1,
 willChange: 'transform',
 };

 const getPriorityColor = (priority: TaskPriority | ProjectPriority) => {
 switch (priority) {
 case 'low':
 return 'text-green-600 bg-green-100';
 case 'medium':
 return 'text-yellow-600 bg-yellow-100';
 case 'high':
 return 'text-orange-600 bg-orange-100';
 case 'critical':
 return 'text-red-600 bg-red-100';
 default:
 return 'text-gray-600 bg-gray-100';
 }
 };

 const formatDate = (dateString: string | undefined) => {
 if (!dateString) return null;
 return new Date(dateString).toLocaleDateString();
 };

 const isOverdue = (dueDateString: string | undefined) => {
 if (!dueDateString) return false;
 return new Date(dueDateString) < new Date();
 };

 const handleCardClick = (e: React.MouseEvent) => {
 // Prevent click during drag
 if (active?.id === item.id) return;
 
 e.stopPropagation();
 if (type === 'projects') {
 navigate(`/projects/${item.id}`);
 } else {
 navigate(`/tasks/${item.id}`);
 }
 };

 const [recurrenceInfo, setRecurrenceInfo] = useState<Record<string, { next_due_date?: string }>>({});

 const handleRecurringHover = useCallback(async (templateId?: string) => {
 if (!templateId) return;
 if (recurrenceInfo[templateId]) return; // already loaded
 try {
 const { default: apiClient } = await import('../../api/client');
 const res = await apiClient.get(`/recurring-tasks/${templateId}`);
 setRecurrenceInfo(prev => ({ ...prev, [templateId]: { next_due_date: res.data?.next_due_date } }));
 } catch (e) {
 // best-effort
 }
 }, [recurrenceInfo]);

 const renderTaskCard = (task: Task) => (
 <div
 ref={setNodeRef}
 style={style}
 {...attributes}
 {...listeners}
 onClick={handleCardClick}
 className={`w-full block bg-white rounded-lg shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${
 active?.id === task.id ? 'ring-2 ring-blue-400' : ''
 }`}
 >
 <div className="flex items-start justify-between mb-3 gap-2">
 <div className="flex items-center space-x-2 flex-shrink-0">
 <RectangleStackIcon className="w-4 h-4 text-gray-400" />
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
 {task.priority}
 </span>
 </div>
 <div className="flex flex-wrap items-center gap-1 justify-end flex-1 min-w-0">
 {task.task_type && (
 <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] rounded-full">
 {task.task_type}
 </span>
 )}
 {(task as any).sprint_name && (
 <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200" title={`Sprint: ${(task as any).sprint_name}`}>
 Sprint: {(task as any).sprint_name}
 </span>
 )}
 {(task.is_recurring || (task as any).recurring_template_id) && (
 <span
 className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200"
 title={(() => {
 const tid = (task as any).recurring_template_id as string | undefined;
 const info = tid ? recurrenceInfo[tid] : undefined;
 return info?.next_due_date ? `Recurring • Next: ${new Date(info.next_due_date).toLocaleString()}` : 'Recurring task';
 })()}
 onMouseEnter={() => handleRecurringHover((task as any).recurring_template_id)}
 >
 Recurring
 </span>
 )}
 </div>
 </div>

 <h4 className="font-medium text-gray-900 mb-2 line-clamp-2 break-words leading-tight">{task.title}</h4>
 
 {task.description && (
 <p className="text-sm text-gray-600 mb-3 line-clamp-2 break-words leading-snug">{task.description}</p>
 )}

 <div className="space-y-2 text-xs text-gray-500">
 {task.assignee_id && (
 <div className="flex items-center space-x-1">
 <UserIcon className="w-3 h-3" />
 <span>Assigned</span>
 </div>
 )}
 
 {task.estimated_hours && task.estimated_hours > 0 && (
 <div className="flex items-center space-x-1">
 <ClockIcon className="w-3 h-3" />
 <span>{task.estimated_hours}h estimated</span>
 </div>
 )}

 {task.due_date && (
 <div className={`flex items-center space-x-1 ${isOverdue(task.due_date) ? 'text-red-500' : ''}`}>
 <CalendarIcon className="w-3 h-3" />
 <span>Due {formatDate(task.due_date)}</span>
 </div>
 )}

 {task.story_points && task.story_points > 0 && (
 <div className="flex items-center space-x-1">
 <FlagIcon className="w-3 h-3" />
 <span>{task.story_points} points</span>
 </div>
 )}
 </div>

 {task.labels && task.labels.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-2">
 {task.labels.slice(0, 3).map((label, index) => (
 <span
 key={index}
 className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
 >
 {label}
 </span>
 ))}
 {task.labels.length > 3 && (
 <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
 +{task.labels.length - 3}
 </span>
 )}
 </div>
 )}
 </div>
 );

 const getProjectStatusBadge = (status: any) => {
 switch (String(status)) {
 case 'planning': return 'bg-blue-100 text-blue-700';
 case 'active': return 'bg-green-100 text-green-700';
 case 'on_hold': return 'bg-yellow-100 text-yellow-700';
 case 'completed': return 'bg-emerald-100 text-emerald-700';
 case 'cancelled': return 'bg-red-100 text-red-700';
 default: return 'bg-gray-100 text-gray-700';
 }
 };

 const renderProjectCard = (project: Project) => (
 <div
 ref={setNodeRef}
 style={style}
 {...attributes}
 {...listeners}
 onClick={handleCardClick}
 className={`w-full block bg-white rounded-md shadow-sm border p-3 cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${
 active?.id === project.id ? 'ring-2 ring-blue-400' : ''
 }`}
 >
 <div className="grid grid-cols-[1fr_auto] items-center gap-2 mb-2">
 <div className="flex items-center gap-2 min-w-0 flex-wrap">
 <FolderIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getProjectStatusBadge((project as any).status)} flex-shrink-0`}>
 {(project as any).status?.toString().replace('_',' ') || 'status'}
 </span>
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(project.priority)} flex-shrink-0`}>
 {project.priority}
 </span>
 </div>
 {project.is_template && (
 <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full shrink-0">
 Template
 </span>
 )}
 </div>

 <h4 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2 break-words leading-tight">{project.name}</h4>
 
 {project.description && (
 <p className="text-sm text-gray-600 mb-2 line-clamp-2 break-words leading-snug">{project.description}</p>
 )}

 {(project as any).customer_id && (
 <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
 <span className="font-medium">Client:</span>
 <span>#{(project as any).customer_id}</span>
 </div>
 )}

 <div className="mt-1 space-y-1 text-sm text-gray-600">
 {project.budget && project.budget > 0 && (
 <div className="flex items-center gap-1">
 <CurrencyDollarIcon className="w-3 h-3" />
 <span>${project.budget.toLocaleString()}</span>
 </div>
 )}
 
 {project.estimated_hours && project.estimated_hours > 0 && (
 <div className="flex items-center gap-1">
 <ClockIcon className="w-3 h-3" />
 <span>{project.estimated_hours}h estimated</span>
 </div>
 )}

 {project.due_date && (
 <div className={`flex items-center gap-1 ${isOverdue(project.due_date) ? 'text-red-500' : ''}`}>
 <CalendarIcon className="w-3 h-3" />
 <span>Due {formatDate(project.due_date)}</span>
 </div>
 )}

 {project.start_date && (
 <div className="flex items-center gap-1">
 <CalendarIcon className="w-3 h-3" />
 <span>Started {formatDate(project.start_date)}</span>
 </div>
 )}
 </div>

 <div className="flex items-center gap-2 mt-2 pt-2 border-t">
 <UserIcon className="w-4 h-4 text-gray-400" />
 <span className="text-sm text-gray-600">{(project as any).owner_name || 'Project Owner'}</span>
 {(project as any).members && Array.isArray((project as any).members) && (
 <span className="ml-auto text-xs text-gray-500">Team: {(project as any).members.length}</span>
 )}
 </div>
 </div>
 );

 return type === 'tasks' ? renderTaskCard(item as Task) : renderProjectCard(item as Project);
};

export default KanbanCard;
