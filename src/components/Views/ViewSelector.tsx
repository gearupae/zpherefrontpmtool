import React, { useState } from 'react';
import {
  ListBulletIcon,
  Squares2X2Icon,
  CalendarIcon,
  ChartBarIcon,
  PresentationChartBarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Task, Project } from '../../types';
import ListView from './ListView';
import KanbanBoard from './KanbanBoard';
import CalendarView from './CalendarView';
import GanttChart from './GanttChart';
import ProjectHealthDashboard from '../Dashboard/ProjectHealthDashboard';
import TodoPage from '../../pages/Todo/TodoPage';

interface ViewSelectorProps {
  tasks?: Task[];
  projects?: Project[];
  type: 'tasks' | 'projects';
  onItemClick?: (id: string) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onProjectUpdate?: (projectId: string, updates: Partial<Project>) => void;
  defaultView?: ViewType;
  showHealthDashboard?: boolean;
}

type ViewType = 'list' | 'kanban' | 'calendar' | 'gantt' | 'health' | 'todo';

const viewOptions = [
  {
    key: 'list' as ViewType,
    name: 'List View',
    icon: ListBulletIcon,
    description: 'Simple, scannable lists with fast search and filtering',
  },
  {
    key: 'kanban' as ViewType,
    name: 'Kanban Board',
    icon: Squares2X2Icon,
    description: 'Visual workflow management with drag-and-drop',
  },
  {
    key: 'calendar' as ViewType,
    name: 'Calendar View',
    icon: CalendarIcon,
    description: 'Timeline-based visualization of tasks and milestones',
  },
  {
    key: 'todo' as ViewType,
    name: 'To‑Do',
    icon: CheckCircleIcon,
    description: 'Simple personal to‑do list (local to your browser)',
  },
  {
    key: 'gantt' as ViewType,
    name: 'Gantt Chart',
    icon: ChartBarIcon,
    description: 'Project timeline with dependencies and progress',
  },
  {
    key: 'health' as ViewType,
    name: 'Health Dashboard',
    icon: PresentationChartBarIcon,
    description: 'Project health overview with key metrics and insights',
  },
] as const;

const ViewSelector: React.FC<ViewSelectorProps> = ({
  tasks = [],
  projects = [],
  type,
  onItemClick,
  onTaskUpdate,
  onProjectUpdate,
  defaultView = 'list',
  showHealthDashboard = true,
}) => {
  const [activeView, setActiveView] = useState<ViewType>(defaultView);

  // Filter available views based on type and props
  const availableViews = viewOptions.filter(view => {
    if (view.key === 'health' && !showHealthDashboard) return false;
    if (view.key === 'health' && type === 'tasks') return false; // Health dashboard is mainly for projects
    return true;
  });

  const renderView = () => {
    const commonProps = {
      [type]: type === 'tasks' ? tasks : projects,
      type,
      onItemClick,
    };

    switch (activeView) {
      case 'list':
        return (
          <ListView
            {...commonProps}
            onItemUpdate={type === 'tasks' ? 
              onTaskUpdate as ((id: string, updates: Partial<Task | Project>) => void) : 
              onProjectUpdate as ((id: string, updates: Partial<Task | Project>) => void)
            }
          />
        );

      case 'kanban':
        return (
          <KanbanBoard
            {...commonProps}
            onTaskUpdate={onTaskUpdate}
            onProjectUpdate={onProjectUpdate}
          />
        );

      case 'calendar':
        return (
          <CalendarView
            {...commonProps}
          />
        );

      case 'gantt':
        return (
          <GanttChart
            {...commonProps}
          />
        );

      case 'todo':
        return (
          <TodoPage />
        );

      case 'health':
        return (
          <ProjectHealthDashboard
            projects={projects}
            tasks={tasks}
            showAllProjects={true}
          />
        );

      default:
        return (
          <ListView
            {...commonProps}
            onItemUpdate={type === 'tasks' ? 
              onTaskUpdate as ((id: string, updates: Partial<Task | Project>) => void) : 
              onProjectUpdate as ((id: string, updates: Partial<Task | Project>) => void)
            }
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* View Selector Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {type === 'tasks' ? 'Tasks' : 'Projects'} Overview
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose your preferred view to manage and track {type}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {type === 'tasks' ? tasks.length : projects.length} {type}
              </span>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {availableViews.map((view) => {
              const IconComponent = view.icon;
              const isActive = activeView === view.key;
              
              return (
                <button
                  key={view.key}
                  onClick={() => setActiveView(view.key)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  title={view.description}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="text-sm font-medium">{view.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active View Description */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">
                {availableViews.find(v => v.key === activeView)?.name}:
              </span>{' '}
              {availableViews.find(v => v.key === activeView)?.description}
            </p>
          </div>
        </div>
      </div>

      {/* View Content */}
      <div className="transition-all duration-300">
        {renderView()}
      </div>

      {/* View-specific Help/Tips */}
      {activeView === 'kanban' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Squares2X2Icon className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Kanban Board Tips</h4>
              <p className="text-sm text-blue-700 mt-1">
                Drag and drop cards between columns to update their status. 
                Click on any card to view detailed information.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeView === 'list' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ListBulletIcon className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-900">List View Tips</h4>
              <p className="text-sm text-green-700 mt-1">
                Use the search box and filters to quickly find specific {type}. 
                Click column headers to sort by different criteria.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeView === 'calendar' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CalendarIcon className="w-5 h-5 text-purple-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-purple-900">Calendar View Tips</h4>
              <p className="text-sm text-purple-700 mt-1">
                View {type} in a timeline format. Switch between month and week views 
                to see different levels of detail.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeView === 'gantt' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ChartBarIcon className="w-5 h-5 text-orange-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-orange-900">Gantt Chart Tips</h4>
              <p className="text-sm text-orange-700 mt-1">
                Visualize project timelines and dependencies. 
                Use the time scale controls to adjust the view granularity.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeView === 'health' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <PresentationChartBarIcon className="w-5 h-5 text-indigo-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-indigo-900">Health Dashboard Tips</h4>
              <p className="text-sm text-indigo-700 mt-1">
                Monitor project health metrics including schedule, budget, team performance, 
                and quality indicators. Focus on projects with critical or at-risk status.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewSelector;
