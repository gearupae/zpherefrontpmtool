import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchTasks } from '../../store/slices/taskSlice';
import { fetchProjects } from '../../store/slices/projectSlice';
import { fetchDashboardStats } from '../../store/slices/dashboardSlice';
import { FunnelIcon, AdjustmentsHorizontalIcon, EyeIcon, ChartBarIcon, Cog6ToothIcon, PlusIcon, ArrowDownTrayIcon, BookmarkIcon, ArrowPathIcon, Squares2X2Icon, ListBulletIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Squares2X2Icon as KanbanIcon } from '@heroicons/react/24/solid';
import ViewModeButton from '../UI/ViewModeButton';

// Enhanced widget components with real data
const ProjectStatusWidget: React.FC<any> = ({ compact, data }) => {
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  const activeProjects = projects.filter((p: any) => p.status === 'active' && !p.is_archived).length;
  const completedProjects = projects.filter((p: any) => p.status === 'completed').length;
  const atRiskProjects = projects.filter((p: any) => p.status === 'at_risk' || (p.due_date && new Date(p.due_date) < new Date())).length;

  return (
    <div className={`${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium text-gray-900">Project Status</h3>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Active Projects</span>
          <span className="text-sm font-medium text-blue-600">{activeProjects}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Completed</span>
          <span className="text-sm font-medium text-green-600">{completedProjects}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">At Risk</span>
          <span className="text-sm font-medium text-red-600">{atRiskProjects}</span>
        </div>
      </div>
    </div>
  );
};

const MyTasksWidget: React.FC<any> = ({ compact, data, priorityFilter, viewFormat }) => {
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const myTasks = tasks.filter((task: any) => task.assignee_id === data?.currentUserId);
  
  const filteredTasks = priorityFilter !== 'all' 
    ? myTasks.filter((task: any) => task.priority === priorityFilter)
    : myTasks;

  const sortedTasks = filteredTasks
    .filter((task: any) => task.status !== 'completed')
    .sort((a: any, b: any) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
    })
    .slice(0, compact ? 3 : 5);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'text-gray-600';
      case 'in_progress': return 'text-blue-600';
      case 'blocked': return 'text-red-600';
      case 'in_review': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900">My Tasks</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 rounded-full">
          {sortedTasks.length} active
        </span>
      </div>
      
      {viewFormat === 'priority_matrix' ? (
        <div className="grid grid-cols-3 gap-2 text-xs">
          {['high', 'medium', 'low'].map(priority => {
            const priorityTasks = sortedTasks.filter((task: any) => task.priority === priority);
            return (
              <div key={priority} className="space-y-1">
                <div className={`text-center rounded text-white ${getPriorityColor(priority)}`}>
                  {priority.toUpperCase()}
                </div>
                {priorityTasks.slice(0, 2).map((task: any) => (
                  <div key={task.id} className="p-1 bg-gray-50 rounded text-xs">
                    <div className="truncate font-medium">{task.title}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTasks.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              No tasks matching criteria
            </div>
          ) : (
            sortedTasks.map((task: any) => (
              <div key={task.id} className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                <div className="flex-1 min-w-0">
                  <span className={`font-medium ${getStatusColor(task.status)}`}>
                    {task.title}
                  </span>
                  {task.due_date && (
                    <div className="text-xs text-gray-500">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <span className={`text-xs px-2 rounded-full ${
                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const UpcomingDeadlinesWidget: React.FC<any> = ({ compact, data }) => {
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  
  const upcomingItems = [
    ...tasks
      .filter((task: any) => task.due_date && task.status !== 'completed')
      .map((task: any) => ({ ...task, type: 'task' })),
    ...projects
      .filter((project: any) => project.end_date && project.status !== 'completed')
      .map((project: any) => ({ ...project, type: 'project', due_date: project.end_date }))
  ]
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, compact ? 3 : 5);

  const getTimeUntil = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  const getUrgencyColor = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'text-red-600 bg-red-50';
    if (diffDays <= 1) return 'text-orange-600 bg-orange-50';
    if (diffDays <= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className={`${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900">Upcoming Deadlines</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 rounded-full">
          {upcomingItems.length} items
        </span>
      </div>
      <div className="space-y-2">
        {upcomingItems.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            No upcoming deadlines
          </div>
        ) : (
          upcomingItems.map((item: any) => (
            <div key={`${item.type}-${item.id}`} className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                item.type === 'task' ? 'bg-blue-500' : 'bg-green-500'
              }`}></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {item.title || item.name}
                </div>
                <div className={`text-xs px-2 rounded-full inline-block ${getUrgencyColor(item.due_date)}`}>
                  {getTimeUntil(item.due_date)}
                </div>
              </div>
              <span className="text-xs text-gray-500 capitalize">
                {item.type}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const RecentActivityWidget: React.FC<any> = ({ compact }) => (
  <div className={`${compact ? 'p-3' : 'p-4'}`}>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Recent Activity</h3>
    <div className="space-y-2">
      <div className="text-sm text-gray-600">
        John completed task "Design review"
      </div>
      <div className="text-sm text-gray-600">
        Sarah updated project timeline
      </div>
      <div className="text-sm text-gray-600">
        New comment on Project Beta
      </div>
    </div>
  </div>
);

interface DashboardPreferences {
  default_layout: 'grid' | 'list' | 'kanban' | 'timeline';
  enabled_widgets: string[];
  widget_settings: Record<string, any>;
  compact_mode: boolean;
  priority_filter: 'all' | 'high' | 'medium' | 'low';
  view_format: 'standard' | 'priority_matrix' | 'calendar' | 'timeline';
  auto_refresh: boolean;
  theme: 'light' | 'dark' | 'auto';
}

interface Widget {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  defaultSize: { width: number; height: number };
}

const AVAILABLE_WIDGETS: Record<string, Widget> = {
  project_status: {
    id: 'project_status',
    name: 'Project Status',
    component: ProjectStatusWidget,
    defaultSize: { width: 6, height: 4 }
  },
  my_tasks: {
    id: 'my_tasks',
    name: 'My Tasks',
    component: MyTasksWidget,
    defaultSize: { width: 6, height: 6 }
  },
  upcoming_deadlines: {
    id: 'upcoming_deadlines',
    name: 'Upcoming Deadlines',
    component: UpcomingDeadlinesWidget,
    defaultSize: { width: 4, height: 4 }
  },
  recent_activity: {
    id: 'recent_activity',
    name: 'Recent Activity',
    component: RecentActivityWidget,
    defaultSize: { width: 8, height: 5 }
  }
};

const PersonalDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tasks } = useAppSelector((state: any) => state.tasks);
  const { projects } = useAppSelector((state: any) => state.projects);
  const { user } = useAppSelector((state: any) => state.auth);
  const { stats } = useAppSelector((state: any) => state.dashboard);

  const [preferences, setPreferences] = useState<DashboardPreferences>({
    default_layout: 'grid',
    enabled_widgets: ['project_status', 'my_tasks', 'upcoming_deadlines', 'recent_activity'],
    widget_settings: {},
    compact_mode: false,
    priority_filter: 'all',
    view_format: 'standard',
    auto_refresh: false,
    theme: 'light'
  });
  
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Prepare data for widgets
  const dashboardData = {
    tasks: tasks || [],
    projects: projects || [],
    currentUserId: user?.id,
    stats: stats
  };

  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchProjects());
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  useEffect(() => {
    if (preferences.auto_refresh) {
      const interval = setInterval(() => {
        dispatch(fetchTasks());
        dispatch(fetchProjects());
        dispatch(fetchDashboardStats());
      }, 300000); // Refresh every 5 minutes
      return () => clearInterval(interval);
    }
  }, [dispatch, preferences.auto_refresh]);

  const addWidget = (widgetId: string) => {
    if (preferences.enabled_widgets.includes(widgetId)) return;

    setPreferences(prev => ({
      ...prev,
      enabled_widgets: [...prev.enabled_widgets, widgetId]
    }));
  };

  const removeWidget = (widgetId: string) => {
    setPreferences(prev => ({
      ...prev,
      enabled_widgets: prev.enabled_widgets.filter(id => id !== widgetId)
    }));
  };

  const toggleLayout = (layout: 'grid' | 'list' | 'kanban' | 'timeline') => {
    setPreferences(prev => ({
      ...prev,
      default_layout: layout
    }));
  };

  const renderWidget = (widgetId: string) => {
    const widget = AVAILABLE_WIDGETS[widgetId];
    if (!widget) return null;

    const WidgetComponent = widget.component;

    return (
      <div
        key={widgetId}
        className={`
          bg-white rounded-lg shadow-sm border border-gray-200 relative hover:shadow-md transition-shadow
          ${isCustomizing ? 'ring-2 ring-blue-200' : ''}
        `}
        style={{
          gridColumn: preferences.default_layout === 'grid' ? `span ${widget.defaultSize.width}` : 'span 12'
        }}
      >
        {isCustomizing && (
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={() => removeWidget(widgetId)}
              className="p-1.5 bg-red-50 rounded-md hover:bg-red-100 text-red-600 border border-red-200 shadow-sm"
              title="Remove widget"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <WidgetComponent
          compact={preferences.compact_mode}
          data={dashboardData}
          priorityFilter={preferences.priority_filter}
          viewFormat={preferences.view_format}
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your projects today.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Priority Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-4 h-4 text-gray-500" />
            <select
              value={preferences.priority_filter}
              onChange={(e) => setPreferences(prev => ({ ...prev, priority_filter: e.target.value as any }))}
              className="text-sm border border-gray-300 rounded-md px-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {/* View Format */}
          <div className="flex items-center space-x-2">
            <EyeIcon className="w-4 h-4 text-gray-500" />
            <select
              value={preferences.view_format}
              onChange={(e) => setPreferences(prev => ({ ...prev, view_format: e.target.value as any }))}
              className="text-sm border border-gray-300 rounded-md px-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="standard">Standard View</option>
              <option value="priority_matrix">Priority Matrix</option>
              <option value="calendar">Calendar View</option>
              <option value="timeline">Timeline View</option>
            </select>
          </div>

          {/* Layout Toggle */}
          <div className="flex gap-2">
            <ViewModeButton
              icon={Squares2X2Icon}
              label="Grid"
              active={preferences.default_layout === 'grid'}
              onClick={() => toggleLayout('grid')}
            />
            <ViewModeButton
              icon={ListBulletIcon}
              label="List"
              active={preferences.default_layout === 'list'}
              onClick={() => toggleLayout('list')}
            />
            <ViewModeButton
              icon={KanbanIcon}
              label="Kanban"
              active={preferences.default_layout === 'kanban'}
              onClick={() => toggleLayout('kanban')}
            />
          </div>

          {/* Settings */}
          <ViewModeButton
            icon={AdjustmentsHorizontalIcon}
            label="Settings"
            active={showFilters}
            onClick={() => setShowFilters(!showFilters)}
            title="Dashboard Settings"
          />

          {/* Customization Toggle */}
          <ViewModeButton
            icon={Cog6ToothIcon}
            label={isCustomizing ? 'Done Customizing' : 'Customize Dashboard'}
            active={isCustomizing}
            onClick={() => setIsCustomizing(!isCustomizing)}
          />
        </div>
      </div>

      {/* Settings Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Dashboard Settings</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Display Options</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.compact_mode}
                    onChange={(e) => setPreferences(prev => ({ ...prev, compact_mode: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Compact mode</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.auto_refresh}
                    onChange={(e) => setPreferences(prev => ({ ...prev, auto_refresh: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Auto-refresh (5 min)</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <select
                value={preferences.theme}
                onChange={(e) => setPreferences(prev => ({ ...prev, theme: e.target.value as any }))}
                className="w-full text-sm border border-gray-300 rounded-md py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Actions</label>
              <div className="flex flex-wrap gap-2">
                <ViewModeButton
                  icon={ArrowDownTrayIcon}
                  label="Export Data"
                  onClick={() => {}}
                />
                <ViewModeButton
                  icon={BookmarkIcon}
                  label="Save Layout"
                  onClick={() => {}}
                />
                <ViewModeButton
                  icon={ArrowPathIcon}
                  label="Reset"
                  variant="destructive"
                  onClick={() => {}}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Widget Palette (shown when customizing) */}
      {isCustomizing && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-medium text-blue-900 mb-3">Available Widgets</h3>
          <div className="flex flex-wrap gap-2">
            {Object.values(AVAILABLE_WIDGETS)
              .filter(widget => !preferences.enabled_widgets.includes(widget.id))
              .map(widget => (
                <ViewModeButton
                  key={widget.id}
                  icon={PlusIcon}
                  label={widget.name}
                  onClick={() => addWidget(widget.id)}
                />
              ))
            }
          </div>
          
          <div className="mt-4 p-3 bg-blue-100 rounded-md">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Drag widgets to reorder them, click the X to remove, and use the settings panel to customize your view format and filters.
            </p>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div
        className={`
          ${preferences.default_layout === 'grid'
            ? 'grid grid-cols-12 gap-6 auto-rows-min'
            : 'space-y-6'
          }
        `}
      >
        {preferences.enabled_widgets.map(widgetId => renderWidget(widgetId))}
      </div>

      {/* Empty State */}
      {preferences.enabled_widgets.length === 0 && (
        <div className="text-center2">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No widgets configured</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding some widgets to your dashboard.
          </p>
          <div className="mt-6">
            <ViewModeButton
              icon={Cog6ToothIcon}
              label="Customize Dashboard"
              active={true}
              onClick={() => setIsCustomizing(true)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalDashboard;