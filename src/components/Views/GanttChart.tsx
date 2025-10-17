import React, { useState, useMemo } from 'react';
import { Task, Project } from '../../types';
import {
  CalendarIcon,
  FolderIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline';

interface GanttChartProps {
  tasks?: Task[];
  projects?: Project[];
  type: 'tasks' | 'projects';
  onItemClick?: (id: string) => void;
}

interface GanttItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  progress: number;
  priority: string;
  status: string;
  item: Task | Project;
}

const GanttChart: React.FC<GanttChartProps> = ({
  tasks = [],
  projects = [],
  type,
  onItemClick,
}) => {
  const [timeScale, setTimeScale] = useState<'days' | 'weeks' | 'months'>('weeks');

  // Convert tasks/projects to Gantt items
  const ganttItems = useMemo(() => {
    const items: GanttItem[] = [];

    if (type === 'tasks') {
      tasks.forEach(task => {
        if (task.start_date || task.due_date) {
          const start = task.start_date ? new Date(task.start_date) : new Date(task.due_date!);
          const end = task.due_date ? new Date(task.due_date) : start;
          
          // Calculate progress based on status
          let progress = 0;
          switch (task.status) {
            case 'completed':
              progress = 100;
              break;
            case 'in_progress':
              progress = 50;
              break;
            case 'in_review':
              progress = 80;
              break;
            default:
              progress = 0;
          }
          
          items.push({
            id: task.id,
            title: task.title,
            start,
            end,
            progress,
            priority: task.priority,
            status: task.status,
            item: task,
          });
        }
      });
    } else {
      projects.forEach(project => {
        if (project.start_date || project.due_date) {
          const start = project.start_date ? new Date(project.start_date) : new Date(project.due_date!);
          const end = project.due_date ? new Date(project.due_date) : start;
          
          // Calculate progress based on status
          let progress = 0;
          switch (project.status) {
            case 'completed':
              progress = 100;
              break;
            case 'active':
              progress = 40;
              break;
            case 'planning':
              progress = 10;
              break;
            default:
              progress = 0;
          }
          
          items.push({
            id: project.id,
            title: project.name,
            start,
            end,
            progress,
            priority: project.priority,
            status: project.status,
            item: project,
          });
        }
      });
    }

    return items.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [tasks, projects, type]);

  // Generate time grid
  const timeGrid = useMemo(() => {
    if (ganttItems.length === 0) return [];

    const allDates = ganttItems.flatMap(item => [item.start, item.end]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Add some padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    const grid: Date[] = [];
    const current = new Date(minDate);
    
    while (current <= maxDate) {
      grid.push(new Date(current));
      
      switch (timeScale) {
        case 'days':
          current.setDate(current.getDate() + 1);
          break;
        case 'weeks':
          current.setDate(current.getDate() + 7);
          break;
        case 'months':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }
    
    return grid;
  }, [ganttItems, timeScale]);

  // Calculate bar position and width
  const getBarStyle = (item: GanttItem) => {
    if (timeGrid.length === 0) return { left: '0%', width: '0%' };

    const totalDuration = timeGrid[timeGrid.length - 1].getTime() - timeGrid[0].getTime();
    const startOffset = item.start.getTime() - timeGrid[0].getTime();
    const duration = item.end.getTime() - item.start.getTime();
    
    const left = (startOffset / totalDuration) * 100;
    const width = Math.max((duration / totalDuration) * 100, 2); // Minimum 2% width
    
    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100 - left, width)}%`,
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-orange-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (date: Date) => {
    switch (timeScale) {
      case 'days':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'weeks':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'months':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      default:
        return date.toLocaleDateString();
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    switch (timeScale) {
      case 'days':
        return diffDays <= 1;
      case 'weeks':
        return diffDays <= 7;
      case 'months':
        return diffDays <= 30;
      default:
        return false;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {type === 'tasks' ? 'Task Timeline' : 'Project Timeline'}
          </h2>
          <CalendarIcon className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-white rounded-lg p-1 border">
            <button
              onClick={() => setTimeScale('days')}
              className={`text-sm rounded-md ${
                timeScale === 'days' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
              }`}
            >
              Days
            </button>
            <button
              onClick={() => setTimeScale('weeks')}
              className={`text-sm rounded-md ${
                timeScale === 'weeks' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
              }`}
            >
              Weeks
            </button>
            <button
              onClick={() => setTimeScale('months')}
              className={`text-sm rounded-md ${
                timeScale === 'months' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
              }`}
            >
              Months
            </button>
          </div>
        </div>
      </div>

      {ganttItems.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">No Timeline Data Available</p>
          <p className="text-sm">Add start dates and due dates to {type} to see them in the timeline view.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Time scale header */}
          <div className="flex border-b">
            <div className="w-80 p-3 bg-gray-50 border-r font-medium text-gray-700">
              {type === 'tasks' ? 'Tasks' : 'Projects'}
            </div>
            <div className="flex-1 relative">
              <div className="flex h-12">
                {timeGrid.map((date, index) => (
                  <div
                    key={index}
                    className={`flex-1 p-2 text-center text-sm border-r border-gray-200 ${
                      isToday(date) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600'
                    }`}
                  >
                    {formatDate(date)}
                  </div>
                ))}
              </div>
              
              {/* Today indicator */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: '20%' }}></div>
            </div>
          </div>

          {/* Gantt bars */}
          <div className="divide-y">
            {ganttItems.map((item) => {
              const barStyle = getBarStyle(item);
              
              return (
                <div key={item.id} className="flex hover:bg-gray-50">
                  <div className="w-80 p-3 border-r">
                    <div className="flex items-center space-x-2">
                      {type === 'tasks' ? (
                        <RectangleStackIcon className="w-4 h-4 text-gray-400" />
                      ) : (
                        <FolderIcon className="w-4 h-4 text-gray-400" />
                      )}
                      <span
                        className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                        onClick={() => onItemClick?.(item.id)}
                      >
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`}></span>
                      <span className="text-xs text-gray-500">{item.priority} priority</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-3 relative">
                    <div
                      className="relative h-8 cursor-pointer"
                      onClick={() => onItemClick?.(item.id)}
                    >
                      {/* Main bar */}
                      <div
                        className={`absolute top-1 h-6 rounded ${getPriorityColor(item.priority)} opacity-80 hover:opacity-100 transition-opacity`}
                        style={barStyle}
                      >
                        {/* Progress indicator */}
                        <div
                          className="h-full bg-white bg-opacity-30 rounded"
                          style={{ width: `${item.progress}%` }}
                        ></div>
                      </div>
                      
                      {/* Bar label */}
                      <div
                        className="absolute top-1 h-6 flex items-center px-2 text-white text-xs font-medium"
                        style={barStyle}
                      >
                        {item.progress > 0 && (
                          <span className="truncate">{item.progress}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      {ganttItems.length > 0 && (
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600">Low Priority</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span className="text-sm text-gray-600">Medium Priority</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-sm text-gray-600">High Priority</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-600">Critical Priority</span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {ganttItems.length} {type} • Today: Red line
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttChart;
