import React, { useState, useMemo, useCallback } from 'react';
import { Task, Project } from '../../types';
import {
 ChevronLeftIcon,
 ChevronRightIcon,
 CalendarIcon,
 FolderIcon,
 RectangleStackIcon,
} from '@heroicons/react/24/outline';

type UnifiedEvent = {
 id: string;
 title: string;
 start: string | Date;
 end?: string | Date;
 type?: 'task' | 'project' | 'goal' | string; // optional to support backend 'entity_type'
 entity_type?: 'task' | 'project' | 'goal' | string;
 priority?: string;
 status?: string;
 url?: string;
};

interface CalendarViewProps {
 tasks?: Task[];
 projects?: Project[];
 events?: UnifiedEvent[]; // mixed events support
 type: 'tasks' | 'projects' | 'mixed';
 onItemClick?: (id: string, url?: string) => void;
}

interface CalendarEvent {
 id: string;
 title: string;
 start: Date;
 end: Date;
 type: 'task' | 'project' | 'milestone';
 priority: string;
 status: string;
 item: Task | Project;
}

const CalendarView: React.FC<CalendarViewProps> = ({
 tasks = [],
 projects = [],
 events: mixedEvents = [],
 type,
 onItemClick,
}) => {
 const [currentDate, setCurrentDate] = useState(new Date());
 const [view, setView] = useState<'month' | 'week'>('month');

// Convert input into calendar events
 const events = useMemo(() => {
 const toArray = (payload: any) => (
 Array.isArray(payload)
 ? payload
 : Array.isArray(payload?.results)
 ? payload.results
 : Array.isArray(payload?.items)
 ? payload.items
 : Array.isArray(payload?.data)
 ? payload.data
 : Array.isArray(payload?.events)
 ? payload.events
 : []
 );

 const allEvents: CalendarEvent[] = [];
 const safeMixed = toArray(mixedEvents) as any[];
 const safeTasks = toArray(tasks) as any[];
 const safeProjects = toArray(projects) as any[];
 
 if (type === 'mixed') {
 safeMixed.forEach((ev: any) => {
 const start = new Date(ev.start);
 const end = ev.end ? new Date(ev.end) : start;
 const rawType = (ev.type ?? ev.entity_type ?? ev.kind) as any;
 const normalizedType: 'task' | 'project' = rawType === 'task' ? 'task' : 'project';
 allEvents.push({
 id: ev.id,
 title: ev.title,
 start,
 end,
 type: normalizedType,
 priority: ev.priority || 'medium',
 status: ev.status || '',
 // store original for navigation
 item: { ...(ev as any) },
 } as any);
 });
 } else if (type === 'tasks') {
 safeTasks.forEach((task: any) => {
 if (task?.start_date || task?.due_date) {
 const start = task.start_date ? new Date(task.start_date) : new Date(task.due_date!);
 const end = task.due_date ? new Date(task.due_date) : start;
 
 allEvents.push({
 id: task.id,
 title: task.title,
 start,
 end,
 type: 'task',
 priority: (task as any).priority,
 status: (task as any).status,
 item: task as Task,
 });
 }
 });
 } else {
 safeProjects.forEach((project: any) => {
 if (project?.start_date || project?.due_date) {
 const start = project.start_date ? new Date(project.start_date) : new Date(project.due_date!);
 const end = project.due_date ? new Date(project.due_date) : start;
 
 allEvents.push({
 id: project.id,
 title: project.name,
 start,
 end,
 type: 'project',
 priority: (project as any).priority,
 status: (project as any).status,
 item: project as Project,
 });
 }
 });
 }
 
 return allEvents;
 }, [tasks, projects, mixedEvents, type]);

 // Recurrence info cache for tooltip (template_id -> info)
 const [recurrenceInfo, setRecurrenceInfo] = useState<Record<string, { next_due_date?: string }>>({});
 const loadRecurrenceInfo = useCallback(async (templateId?: string) => {
 if (!templateId) return;
 if (recurrenceInfo[templateId]) return;
 try {
 const { default: apiClient } = await import('../../api/client');
  const res = await apiClient.get(`/recurring-tasks/${templateId}/`);
 setRecurrenceInfo(prev => ({ ...prev, [templateId]: { next_due_date: res.data?.next_due_date } }));
 } catch (e) {
 // ignore
 }
 }, [recurrenceInfo]);

 // Generate calendar grid
 const calendarGrid = useMemo(() => {
 const year = currentDate.getFullYear();
 const month = currentDate.getMonth();
 
 const firstDay = new Date(year, month, 1);
 const lastDay = new Date(year, month + 1, 0);
 const startDate = new Date(firstDay);
 startDate.setDate(startDate.getDate() - firstDay.getDay());
 
 const endDate = new Date(lastDay);
 endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
 
 const days: Date[] = [];
 const current = new Date(startDate);
 
 while (current <= endDate) {
 days.push(new Date(current));
 current.setDate(current.getDate() + 1);
 }
 
 return days;
 }, [currentDate]);

 // Get events for a specific day
 const getEventsForDay = (day: Date) => {
 return events.filter(event => {
 const dayStart = new Date(day);
 dayStart.setHours(0, 0, 0, 0);
 const dayEnd = new Date(day);
 dayEnd.setHours(23, 59, 59, 999);
 
 return (event.start <= dayEnd && event.end >= dayStart);
 });
 };

 const getPriorityColor = (priority: string) => {
 switch (priority) {
 case 'low':
 return 'bg-green-100 text-green-800 border-green-200';
 case 'medium':
 return 'bg-yellow-100 text-yellow-800 border-yellow-200';
 case 'high':
 return 'bg-orange-100 text-orange-800 border-orange-200';
 case 'critical':
 return 'bg-red-100 text-red-800 border-red-200';
 default:
 return 'bg-gray-100 text-gray-800 border-gray-200';
 }
 };

 const navigateMonth = (direction: 'prev' | 'next') => {
 setCurrentDate(prev => {
 const newDate = new Date(prev);
 newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
 return newDate;
 });
 };

 const isToday = (date: Date) => {
 const today = new Date();
 return date.toDateString() === today.toDateString();
 };

 const isCurrentMonth = (date: Date) => {
 return date.getMonth() === currentDate.getMonth();
 };

 const formatDate = (date: Date) => {
 return new Intl.DateTimeFormat('en-US', {
 year: 'numeric',
 month: 'long',
 }).format(date);
 };

 return (
 <div className="bg-white rounded-lg shadow-sm border">
 {/* Calendar Header */}
 <div className="flex items-center justify-between p-4 border-b">
 <div className="flex items-center space-x-4">
 <h2 className="text-lg font-semibold text-gray-900">
 {formatDate(currentDate)}
 </h2>
 <div className="flex items-center space-x-2">
 <button
 onClick={() => navigateMonth('prev')}
 className="flex items-center justify-center rounded-md text-sm border bg-white text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
 title="Previous month"
 >
 <ChevronLeftIcon className="w-5 h-5" />
 </button>
 <button
 onClick={() => navigateMonth('next')}
 className="flex items-center justify-center rounded-md text-sm border bg-white text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
 title="Next month"
 >
 <ChevronRightIcon className="w-5 h-5" />
 </button>
 </div>
 </div>
 
 <div className="flex items-center space-x-2">
 <div className="flex items-center space-x-2">
 <button
 onClick={() => setView('month')}
 className={`flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border ${
 view === 'month' ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
 }`}
 >
 Month
 </button>
 <button
 onClick={() => setView('week')}
 className={`flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border ${
 view === 'week' ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
 }`}
 >
 Week
 </button>
 </div>
 <CalendarIcon className="w-5 h-5 text-gray-400 ml-2" />
 </div>
 </div>

 {/* Calendar Grid */}
 <div className="p-4">
 {/* Day headers */}
 <div className="grid grid-cols-7 gap-px mb-2">
 {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
 <div key={day} className="py-2 text-center text-sm font-medium text-gray-500">
 {day}
 </div>
 ))}
 </div>
 
 {/* Calendar days */}
 <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
 {calendarGrid.map((day, index) => {
 const dayEvents = getEventsForDay(day);
 
 return (
 <div
 key={index}
 className={`bg-white p-2 min-h-24 ${
 !isCurrentMonth(day) ? 'bg-gray-50 text-gray-400' : ''
 }`}
 >
 <div className={`text-sm font-medium mb-1 ${
 isToday(day) ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : ''
 }`}>
 {day.getDate()}
 </div>
 
 <div className="space-y-1">
 {dayEvents.slice(0, 3).map(event => (
 <div
 key={event.id}
 onClick={() => onItemClick?.(event.id, ((event.item as any).url || (event as any).url))}
 className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm transition-shadow ${getPriorityColor(event.priority)}`}
 title={event.title}
 >
 <div className="flex items-center space-x-1">
 {event.type === 'task' ? (
 <RectangleStackIcon className="w-3 h-3 flex-shrink-0" />
 ) : (
 <FolderIcon className="w-3 h-3 flex-shrink-0" />
 )}
 <span className="truncate">{event.title}</span>
 {event.type === 'task' && ((event.item as Task).is_recurring || (event.item as any).recurring_template_id) && (
 <span
 className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200"
 onMouseEnter={() => loadRecurrenceInfo((event.item as any).recurring_template_id)}
 title={(() => {
 const tid = (event.item as any).recurring_template_id as string | undefined;
 const info = tid ? recurrenceInfo[tid] : undefined;
 return info?.next_due_date ? `Recurring • Next: ${new Date(info.next_due_date).toLocaleString()}` : 'Recurring task';
 })()}
 >
 Recurring
 </span>
 )}
 </div>
 </div>
 ))}
 {dayEvents.length > 3 && (
 <div className="text-xs text-gray-500 text-center">
 +{dayEvents.length - 3} more
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Legend */}
 <div className="border-t p-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-4">
 <div className="flex items-center space-x-2">
 <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
 <span className="text-sm text-gray-600">Low Priority</span>
 </div>
 <div className="flex items-center space-x-2">
 <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
 <span className="text-sm text-gray-600">Medium Priority</span>
 </div>
 <div className="flex items-center space-x-2">
 <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
 <span className="text-sm text-gray-600">High Priority</span>
 </div>
 <div className="flex items-center space-x-2">
 <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
 <span className="text-sm text-gray-600">Critical Priority</span>
 </div>
 </div>
 <div className="text-sm text-gray-500">
 {events.length} {type} with dates
 </div>
 </div>
 </div>
 </div>
 );
};

export default CalendarView;
