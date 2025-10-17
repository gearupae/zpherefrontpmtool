import React, { useState, useEffect } from 'react';

interface TimeEntry {
 id: string;
 project_name: string;
 project_color: string;
 task_name: string;
 duration_minutes: number;
 start_time: string;
 end_time?: string;
 is_running: boolean;
}

interface TimeTrackingWidgetProps {
 settings?: any;
 onUpdateSettings?: (settings: any) => void;
 compact?: boolean;
}

const TimeTrackingWidget: React.FC<TimeTrackingWidgetProps> = ({
 settings = {},
 onUpdateSettings,
 compact = false
}) => {
 const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
 const [totalToday, setTotalToday] = useState(0);
 const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 loadTimeEntries();
 const interval = setInterval(() => {
 if (activeTimer) {
 setActiveTimer(prev => prev ? {
 ...prev,
 duration_minutes: prev.duration_minutes + (1/60) // Add 1 second
 } : null);
 }
 }, 1000);

 return () => clearInterval(interval);
 }, [activeTimer]);

 const loadTimeEntries = async () => {
 try {
 setIsLoading(true);
 // Simulate API call
 setTimeout(() => {
 const mockEntries: TimeEntry[] = [
 {
 id: '1',
 project_name: 'Website Redesign',
 project_color: 'bg-blue-600',
 task_name: 'Design mockups',
 duration_minutes: 125,
 start_time: new Date(Date.now() - 125 * 60 * 1000).toISOString(),
 end_time: new Date().toISOString(),
 is_running: false
 },
 {
 id: '2',
 project_name: 'API Migration',
 project_color: 'bg-green-500',
 task_name: 'Database optimization',
 duration_minutes: 45,
 start_time: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
 is_running: true
 },
 {
 id: '3',
 project_name: 'Dashboard V2',
 project_color: 'bg-purple-500',
 task_name: 'Component refactoring',
 duration_minutes: 90,
 start_time: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
 end_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
 is_running: false
 }
 ];

 const runningEntry = mockEntries.find(entry => entry.is_running);
 setActiveTimer(runningEntry || null);
 setTimeEntries(mockEntries.slice(0, compact ? 2 : 3));
 setTotalToday(mockEntries.reduce((acc, entry) => acc + entry.duration_minutes, 0));
 setIsLoading(false);
 }, 300);
 } catch (error) {
 console.error('Failed to load time entries:', error);
 setIsLoading(false);
 }
 };

 const formatDuration = (minutes: number) => {
 const hours = Math.floor(minutes / 60);
 const mins = Math.floor(minutes % 60);
 
 if (hours > 0) {
 return `${hours}h ${mins}m`;
 }
 return `${mins}m`;
 };

 const formatTime = (timeString: string) => {
 return new Date(timeString).toLocaleTimeString('en-US', {
 hour: 'numeric',
 minute: '2-digit',
 hour12: true
 });
 };

 const startTimer = (projectName: string, taskName: string) => {
 // Simulate starting a timer
 const newEntry: TimeEntry = {
 id: Date.now().toString(),
 project_name: projectName,
 project_color: 'bg-blue-600',
 task_name: taskName,
 duration_minutes: 0,
 start_time: new Date().toISOString(),
 is_running: true
 };
 
 setActiveTimer(newEntry);
 setTimeEntries(prev => [newEntry, ...prev.slice(0, (compact ? 2 : 3) - 1)]);
 };

 const stopTimer = () => {
 if (activeTimer) {
 const updatedEntry = {
 ...activeTimer,
 end_time: new Date().toISOString(),
 is_running: false
 };
 
 setTimeEntries(prev => prev.map(entry => 
 entry.id === activeTimer.id ? updatedEntry : entry
 ));
 setActiveTimer(null);
 setTotalToday(prev => prev + activeTimer.duration_minutes);
 }
 };

 if (isLoading) {
 return (
 <div className="animate-pulse">
 <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
 <div className="space-y-3">
 <div className="h-16 bg-gray-200 rounded"></div>
 <div className="h-12 bg-gray-200 rounded"></div>
 </div>
 </div>
 );
 }

 return (
 <div>
 <div className="flex items-center justify-between mb-4">
 <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-lg'}`}>
 Time Tracking
 </h3>
 <div className="text-sm text-gray-500">
 {formatDuration(totalToday)} today
 </div>
 </div>

 {/* Active Timer */}
 {activeTimer && (
 <div className={`
 ${compact ? 'p-2' : 'p-3'} 
 bg-green-50 border border-green-200 rounded-lg mb-3
 `}>
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-2">
 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
 <div className={`${activeTimer.project_color} w-3 h-3 rounded-full`}></div>
 <span className={`font-medium text-green-800 ${compact ? 'text-xs' : 'text-sm'}`}>
 {activeTimer.task_name}
 </span>
 </div>
 <div className="flex items-center space-x-2">
 <span className={`font-mono font-bold text-green-800 ${compact ? 'text-sm' : 'text-base'}`}>
 {formatDuration(activeTimer.duration_minutes)}
 </span>
 <button
 onClick={stopTimer}
 className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
 >
 <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
 </svg>
 </button>
 </div>
 </div>
 <div className="mt-1 text-xs text-green-700">
 Started at {formatTime(activeTimer.start_time)}
 </div>
 </div>
 )}

 {/* Recent Entries */}
 <div className={`space-y-${compact ? '2' : '3'}`}>
 {timeEntries.filter(entry => !entry.is_running).map((entry) => (
 <div
 key={entry.id}
 className={`
 ${compact ? 'p-2' : 'p-3'} 
 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors
 `}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-2 flex-1 min-w-0">
 <div className={`${entry.project_color} w-3 h-3 rounded-full`}></div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center space-x-1">
 <span className={`font-medium text-gray-900 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
 {entry.task_name}
 </span>
 </div>
 <div className={`text-gray-500 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
 {entry.project_name}
 </div>
 </div>
 </div>
 
 <div className="text-right">
 <div className={`font-mono font-medium text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
 {formatDuration(entry.duration_minutes)}
 </div>
 {entry.end_time && (
 <div className="text-xs text-gray-500">
 {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
 </div>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Quick Start Timer */}
 {!activeTimer && !compact && (
 <div className="mt-4 pt-4 border-t border-gray-200">
 <button
 onClick={() => startTimer('Current Project', 'New task')}
 className="w-full flex items-center justify-center space-x-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
 >
 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
 </svg>
 <span className="text-sm font-medium">Start Timer</span>
 </button>
 </div>
 )}
 </div>
 );
};

export default TimeTrackingWidget;
