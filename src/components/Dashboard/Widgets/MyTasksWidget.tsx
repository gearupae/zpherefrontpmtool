import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../../hooks/redux';

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  due_date?: string;
  project_name: string;
  project_color: string;
}

interface MyTasksWidgetProps {
  settings?: any;
  onUpdateSettings?: (settings: any) => void;
  compact?: boolean;
  showCompleted?: boolean;
}

const MyTasksWidget: React.FC<MyTasksWidgetProps> = ({
  settings = {},
  onUpdateSettings,
  compact = false,
  showCompleted = false
}) => {
  const { user } = useAppSelector((state) => state.auth);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMyTasks();
  }, [filter, showCompleted]);

  const loadMyTasks = async () => {
    try {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        const mockTasks: Task[] = [
          {
            id: '1',
            title: 'Review project specifications',
            priority: 'high',
            status: 'todo',
            due_date: new Date().toISOString(),
            project_name: 'Website Redesign',
            project_color: 'bg-blue-500'
          },
          {
            id: '2',
            title: 'Update database schema',
            priority: 'medium',
            status: 'in_progress',
            due_date: new Date(Date.now() + 86400000).toISOString(),
            project_name: 'API Migration',
            project_color: 'bg-green-500'
          },
          {
            id: '3',
            title: 'Design new dashboard layout',
            priority: 'low',
            status: 'todo',
            project_name: 'Dashboard V2',
            project_color: 'bg-purple-500'
          },
          {
            id: '4',
            title: 'Write unit tests',
            priority: 'critical',
            status: 'todo',
            due_date: new Date(Date.now() - 86400000).toISOString(),
            project_name: 'API Migration',
            project_color: 'bg-green-500'
          },
          {
            id: '5',
            title: 'Deploy to staging',
            priority: 'medium',
            status: 'completed',
            project_name: 'Website Redesign',
            project_color: 'bg-blue-500'
          }
        ];

        let filteredTasks = mockTasks;

        if (!showCompleted) {
          filteredTasks = filteredTasks.filter(task => task.status !== 'completed');
        }

        if (filter === 'today') {
          const today = new Date().toDateString();
          filteredTasks = filteredTasks.filter(task => 
            task.due_date && new Date(task.due_date).toDateString() === today
          );
        } else if (filter === 'overdue') {
          const now = new Date();
          filteredTasks = filteredTasks.filter(task => 
            task.due_date && new Date(task.due_date) < now && task.status !== 'completed'
          );
        }

        setTasks(filteredTasks);
        setIsLoading(false);
      }, 300);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'review': return 'text-purple-600 bg-purple-100';
      case 'todo': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return `In ${diffDays} days`;
  };

  const isOverdue = (dateString?: string, status?: string) => {
    if (!dateString || status === 'completed') return false;
    return new Date(dateString) < new Date();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-lg'}`}>
          My Tasks
        </h3>
        <div className="flex space-x-1">
          {(['all', 'today', 'overdue'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`
                px-2 text-xs font-medium rounded-md transition-colors
                ${filter === filterOption
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={`space-y-${compact ? '2' : '3'} max-h-80 overflow-y-auto`}>
        {!Array.isArray(tasks) || tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No tasks found</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`
                ${compact ? 'p-2' : 'p-3'} 
                border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer
                ${task.status === 'completed' ? 'opacity-60' : ''}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className={`w-3 h-3 rounded-full ${task.project_color}`}></div>
                    <span className="text-xs text-gray-500 truncate">{task.project_name}</span>
                  </div>
                  <h4 className={`font-medium text-gray-900 truncate ${compact ? 'text-sm' : ''}`}>
                    {task.title}
                  </h4>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`text-xs px-2 rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`text-xs px-2 rounded-full ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    {task.due_date && (
                      <span className={`text-xs ${isOverdue(task.due_date, task.status) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {!compact && Array.isArray(tasks) && tasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
            View All Tasks →
          </button>
        </div>
      )}
    </div>
  );
};

export default MyTasksWidget;
