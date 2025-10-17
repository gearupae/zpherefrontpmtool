import React, { useState, useEffect } from 'react';
import {
 ListBulletIcon,
 Squares2X2Icon,
 CalendarIcon,
 ChartBarIcon,
 TableCellsIcon,
 EyeIcon,
 AdjustmentsHorizontalIcon,
 PresentationChartLineIcon,
 FunnelIcon,
 ViewfinderCircleIcon,
 ClockIcon,
 StarIcon,
 ChartPieIcon,
 DocumentTextIcon,
 TagIcon,
 MapIcon,
 PuzzlePieceIcon
} from '@heroicons/react/24/outline';
import { Task, Project } from '../../types';
import ListView from './ListView';
import KanbanBoard from './KanbanBoard';
import CalendarView from './CalendarView';
import GanttChart from './GanttChart';

interface ViewPreference {
 id: string;
 name: string;
 icon: React.ComponentType<any>;
 description: string;
 category: 'visualization' | 'organization' | 'analysis' | 'planning';
 supportedTypes: ('tasks' | 'projects')[];
 customizable: boolean;
 filters?: string[];
 sortOptions?: string[];
}

interface FlexibleTaskViewsProps {
 tasks?: Task[];
 projects?: Project[];
 type: 'tasks' | 'projects';
 onItemClick?: (id: string) => void;
 onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
 onProjectUpdate?: (projectId: string, updates: Partial<Project>) => void;
 defaultView?: string;
}

interface UserViewSettings {
 preferredViews: string[];
 customFilters: Record<string, any>;
 sortPreferences: Record<string, string>;
 groupingPreferences: Record<string, string>;
 displayDensity: 'compact' | 'normal' | 'comfortable';
 colorCoding: boolean;
 showSubtasks: boolean;
 showDependencies: boolean;
}

// Extended view options with more organizational methods
const viewPreferences: ViewPreference[] = [
 // Visualization Views
 {
 id: 'list',
 name: 'List View',
 icon: ListBulletIcon,
 description: 'Simple, scannable lists with fast search and filtering',
 category: 'visualization',
 supportedTypes: ['tasks', 'projects'],
 customizable: true,
 filters: ['status', 'priority', 'assignee', 'project'],
 sortOptions: ['due_date', 'priority', 'created_at', 'title']
 },
 {
 id: 'kanban',
 name: 'Kanban Board',
 icon: Squares2X2Icon,
 description: 'Visual workflow management with drag-and-drop',
 category: 'visualization',
 supportedTypes: ['tasks', 'projects'],
 customizable: true,
 filters: ['priority', 'assignee', 'project']
 },
 {
 id: 'table',
 name: 'Data Table',
 icon: TableCellsIcon,
 description: 'Detailed spreadsheet-like view with sortable columns',
 category: 'visualization',
 supportedTypes: ['tasks', 'projects'],
 customizable: true,
 filters: ['status', 'priority', 'assignee', 'project', 'labels'],
 sortOptions: ['due_date', 'priority', 'created_at', 'title', 'estimated_hours']
 },
 {
 id: 'cards',
 name: 'Card Grid',
 icon: ViewfinderCircleIcon,
 description: 'Visual cards showing key details at a glance',
 category: 'visualization',
 supportedTypes: ['tasks', 'projects'],
 customizable: true
 },
 
 // Organization Views
 {
 id: 'priority_matrix',
 name: 'Priority Matrix',
 icon: ChartPieIcon,
 description: 'Eisenhower matrix for priority-based organization',
 category: 'organization',
 supportedTypes: ['tasks'],
 customizable: true
 },
 {
 id: 'progress_lanes',
 name: 'Progress Lanes',
 icon: PuzzlePieceIcon,
 description: 'Organize by completion status with progress indicators',
 category: 'organization',
 supportedTypes: ['tasks', 'projects'],
 customizable: true
 },
 {
 id: 'team_focused',
 name: 'Team View',
 icon: DocumentTextIcon,
 description: 'Group by team members with workload visualization',
 category: 'organization',
 supportedTypes: ['tasks'],
 customizable: true
 },
 {
 id: 'label_groups',
 name: 'Label Groups',
 icon: TagIcon,
 description: 'Organize by labels and tags with custom grouping',
 category: 'organization',
 supportedTypes: ['tasks', 'projects'],
 customizable: true
 },
 
 // Analysis Views 
 {
 id: 'timeline',
 name: 'Timeline View',
 icon: ClockIcon,
 description: 'Chronological timeline with milestones and dependencies',
 category: 'analysis',
 supportedTypes: ['tasks', 'projects'],
 customizable: true
 },
 {
 id: 'calendar',
 name: 'Calendar View',
 icon: CalendarIcon,
 description: 'Calendar-based view for date-focused planning',
 category: 'analysis',
 supportedTypes: ['tasks', 'projects'],
 customizable: true
 },
 {
 id: 'burndown',
 name: 'Burndown Chart',
 icon: PresentationChartLineIcon,
 description: 'Track progress against time with burndown analytics',
 category: 'analysis',
 supportedTypes: ['tasks'],
 customizable: false
 },
 {
 id: 'analytics',
 name: 'Analytics View',
 icon: ChartBarIcon,
 description: 'Comprehensive analytics and insights dashboard',
 category: 'analysis',
 supportedTypes: ['tasks', 'projects'],
 customizable: true
 },
 
 // Planning Views
 {
 id: 'gantt',
 name: 'Gantt Chart',
 icon: ChartBarIcon,
 description: 'Project timeline with dependencies and resource allocation',
 category: 'planning',
 supportedTypes: ['tasks', 'projects'],
 customizable: true
 },
 {
 id: 'roadmap',
 name: 'Roadmap View',
 icon: MapIcon,
 description: 'High-level roadmap with milestones and strategic goals',
 category: 'planning',
 supportedTypes: ['projects'],
 customizable: true
 },
 {
 id: 'my_focus',
 name: 'My Focus',
 icon: StarIcon,
 description: 'Personalized view showing your most important items',
 category: 'planning',
 supportedTypes: ['tasks', 'projects'],
 customizable: true
 }
];

const FlexibleTaskViews: React.FC<FlexibleTaskViewsProps> = ({
 tasks = [],
 projects = [],
 type,
 onItemClick,
 onTaskUpdate,
 onProjectUpdate,
 defaultView = 'list'
}) => {
 const [activeView, setActiveView] = useState<string>(defaultView);
 const [userSettings, setUserSettings] = useState<UserViewSettings>({
 preferredViews: ['list', 'kanban', 'calendar', 'priority_matrix'],
 customFilters: {},
 sortPreferences: { list: 'due_date', table: 'priority' },
 groupingPreferences: {},
 displayDensity: 'normal',
 colorCoding: true,
 showSubtasks: true,
 showDependencies: false
 });
 const [showSettings, setShowSettings] = useState(false);
 const [selectedCategory, setSelectedCategory] = useState<string>('all');

 // Filter views based on type and user preferences
 const availableViews = viewPreferences.filter(view => {
 if (!view.supportedTypes.includes(type)) return false;
 if (selectedCategory !== 'all' && view.category !== selectedCategory) return false;
 return true;
 });

 const preferredViews = availableViews.filter(view => 
 userSettings.preferredViews.includes(view.id)
 );

 const otherViews = availableViews.filter(view => 
 !userSettings.preferredViews.includes(view.id)
 );

 const activeViewConfig = viewPreferences.find(v => v.id === activeView);

 const handleViewChange = (viewId: string) => {
 setActiveView(viewId);
 // Save user preference (would typically sync with backend)
 if (!userSettings.preferredViews.includes(viewId)) {
 setUserSettings(prev => ({
 ...prev,
 preferredViews: [viewId, ...prev.preferredViews].slice(0, 6)
 }));
 }
 };

 const togglePreferredView = (viewId: string) => {
 setUserSettings(prev => ({
 ...prev,
 preferredViews: prev.preferredViews.includes(viewId)
 ? prev.preferredViews.filter(id => id !== viewId)
 : [...prev.preferredViews, viewId]
 }));
 };

 const renderViewContent = () => {
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

 case 'table':
 return <DataTableView data={type === 'tasks' ? tasks : projects} type={type} settings={userSettings} />;

 case 'cards':
 return <CardGridView data={type === 'tasks' ? tasks : projects} type={type} settings={userSettings} />;

 case 'priority_matrix':
 return <PriorityMatrixView tasks={tasks} settings={userSettings} />;

 case 'progress_lanes':
 return <ProgressLanesView data={type === 'tasks' ? tasks : projects} type={type} settings={userSettings} />;

 case 'team_focused':
 return <TeamFocusedView tasks={tasks} settings={userSettings} />;

 case 'label_groups':
 return <LabelGroupsView data={type === 'tasks' ? tasks : projects} type={type} settings={userSettings} />;

 case 'timeline':
 return <TimelineView data={type === 'tasks' ? tasks : projects} type={type} settings={userSettings} />;

 case 'calendar':
 return (
 <CalendarView
 {...commonProps}
 />
 );

 case 'burndown':
 return <BurndownChartView tasks={tasks} settings={userSettings} />;

 case 'analytics':
 return <AnalyticsView data={type === 'tasks' ? tasks : projects} type={type} settings={userSettings} />;

 case 'gantt':
 return (
 <GanttChart
 {...commonProps}
 />
 );

 case 'roadmap':
 return <RoadmapView projects={projects} settings={userSettings} />;

 case 'my_focus':
 return <MyFocusView data={type === 'tasks' ? tasks : projects} type={type} settings={userSettings} />;

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
 {/* Enhanced View Selector Header */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-lg font-semibold text-gray-900">
 Flexible {type === 'tasks' ? 'Task' : 'Project'} Views
 </h2>
 <p className="text-sm text-gray-600 mt-1">
 Choose from {availableViews.length} different organizational methods and visualization styles
 </p>
 </div>
 <div className="flex items-center space-x-4">
 <span className="text-sm text-gray-500">
 {type === 'tasks' ? tasks.length : projects.length} {type}
 </span>
 <button
 onClick={() => setShowSettings(!showSettings)}
 className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
 title="View Settings"
 >
 <AdjustmentsHorizontalIcon className="w-5 h-5" />
 </button>
 </div>
 </div>
 </div>

 {/* Category Filter */}
 <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
 <div className="flex items-center space-x-2">
 <FunnelIcon className="w-4 h-4 text-gray-500" />
 <span className="text-sm font-medium text-gray-700">Categories:</span>
 {['all', 'visualization', 'organization', 'analysis', 'planning'].map(category => (
 <button
 key={category}
 onClick={() => setSelectedCategory(category)}
 className={`text-xs rounded-full transition-colors ${
 selectedCategory === category
 ? 'bg-blue-100 text-blue-700 border border-blue-300'
 : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
 }`}
 >
 {category.charAt(0).toUpperCase() + category.slice(1)}
 </button>
 ))}
 </div>
 </div>

 {/* Preferred Views */}
 {preferredViews.length > 0 && (
 <div className="px-6 py-4 border-b border-gray-200">
 <div className="flex items-center space-x-2 mb-3">
 <StarIcon className="w-4 h-4 text-yellow-500" />
 <span className="text-sm font-medium text-gray-700">Your Preferred Views</span>
 </div>
 <div className="flex flex-wrap gap-2">
 {preferredViews.map((view) => {
 const IconComponent = view.icon;
 const isActive = activeView === view.id;
 
 return (
 <button
 key={view.id}
 onClick={() => handleViewChange(view.id)}
 className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
 isActive
 ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-200'
 : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
 }`}
 title={view.description}
 >
 <IconComponent className="w-4 h-4" />
 <span className="text-sm font-medium">{view.name}</span>
 {view.customizable && (
 <EyeIcon className="w-3 h-3 text-gray-400" />
 )}
 </button>
 );
 })}
 </div>
 </div>
 )}

 {/* All Available Views */}
 <div className="px-6 py-4">
 <div className="flex items-center space-x-2 mb-3">
 <ViewfinderCircleIcon className="w-4 h-4 text-gray-500" />
 <span className="text-sm font-medium text-gray-700">All Views</span>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
 {availableViews.map((view) => {
 const IconComponent = view.icon;
 const isActive = activeView === view.id;
 const isPreferred = userSettings.preferredViews.includes(view.id);
 
 return (
 <div key={view.id} className="relative group">
 <button
 onClick={() => handleViewChange(view.id)}
 className={`w-full flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200 text-left ${
 isActive
 ? 'bg-blue-50 border-blue-200 text-blue-700'
 : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
 }`}
 >
 <IconComponent className="w-5 h-5 mt-0.5 flex-shrink-0" />
 <div className="min-w-0 flex-1">
 <div className="flex items-center space-x-2">
 <span className="text-sm font-medium truncate">{view.name}</span>
 {view.customizable && (
 <AdjustmentsHorizontalIcon className="w-3 h-3 text-gray-400" />
 )}
 </div>
 <p className="text-xs text-gray-500 mt-1 line-clamp-2">
 {view.description}
 </p>
 <div className="flex items-center justify-between mt-2">
 <span className={`text-xs px-2 rounded-full ${
 view.category === 'visualization' ? 'bg-blue-100 text-blue-700' :
 view.category === 'organization' ? 'bg-green-100 text-green-700' :
 view.category === 'analysis' ? 'bg-purple-100 text-purple-700' :
 'bg-orange-100 text-orange-700'
 }`}>
 {view.category}
 </span>
 </div>
 </div>
 </button>
 
 {/* Star toggle for preferred views */}
 <button
 onClick={() => togglePreferredView(view.id)}
 className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
 isPreferred 
 ? 'text-yellow-500 hover:text-yellow-600' 
 : 'text-gray-300 hover:text-yellow-500'
 }`}
 title={isPreferred ? 'Remove from preferred' : 'Add to preferred'}
 >
 <StarIcon className={`w-4 h-4 ${isPreferred ? 'fill-current' : ''}`} />
 </button>
 </div>
 );
 })}
 </div>
 </div>

 {/* Active View Info */}
 {activeViewConfig && (
 <div className="px-6 py-3 bg-blue-50 border-t border-blue-200">
 <div className="flex items-start space-x-3">
 <activeViewConfig.icon className="w-5 h-5 text-blue-500 mt-0.5" />
 <div>
 <h4 className="text-sm font-medium text-blue-900">{activeViewConfig.name}</h4>
 <p className="text-sm text-blue-700 mt-1">{activeViewConfig.description}</p>
 {activeViewConfig.customizable && (
 <p className="text-xs text-blue-600 mt-2">
 ⚙️ This view supports customization - use the settings panel to adjust filters, sorting, and display options.
 </p>
 )}
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Settings Panel */}
 {showSettings && (
 <ViewSettingsPanel 
 settings={userSettings}
 onSettingsChange={setUserSettings}
 activeView={activeView}
 activeViewConfig={activeViewConfig}
 onClose={() => setShowSettings(false)}
 />
 )}

 {/* View Content */}
 <div className="transition-all duration-300">
 {renderViewContent()}
 </div>
 </div>
 );
};

// Placeholder components for new view types (these would be implemented separately)
const DataTableView: React.FC<any> = ({ data, type, settings }) => (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Data Table View</h3>
 <p className="text-gray-600">Enhanced table view with sortable columns, advanced filtering, and bulk operations.</p>
 <div className="mt-4 text-sm text-gray-500">
 Showing {data?.length || 0} {type} • Density: {settings.displayDensity}
 </div>
 </div>
);

const CardGridView: React.FC<any> = ({ data, type, settings }) => (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Card Grid View</h3>
 <p className="text-gray-600">Visual card layout with key information and quick actions.</p>
 </div>
);

const PriorityMatrixView: React.FC<any> = ({ tasks, settings }) => (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Priority Matrix (Eisenhower Matrix)</h3>
 <p className="text-gray-600">Organize tasks by urgency and importance for better prioritization.</p>
 </div>
);

const ProgressLanesView: React.FC<any> = ({ data, type, settings }) => (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Progress Lanes View</h3>
 <p className="text-gray-600">Swim lanes organized by progress status with visual indicators.</p>
 </div>
);

const TeamFocusedView: React.FC<any> = ({ tasks, settings }) => (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Team Focused View</h3>
 <p className="text-gray-600">Group tasks by team members with workload balancing insights.</p>
 </div>
);

const LabelGroupsView: React.FC<any> = ({ data, type, settings }) => (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Label Groups View</h3>
 <p className="text-gray-600">Organize by custom labels and tags with flexible grouping.</p>
 </div>
);

const TimelineView: React.FC<any> = ({ data, type, settings }) => (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline View</h3>
 <p className="text-gray-600">Chronological timeline with milestones and dependencies.</p>
 </div>
);

const BurndownChartView: React.FC<any> = ({ tasks, settings }) => (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Burndown Chart</h3>
 <p className="text-gray-600">Track task completion progress against time.</p>
 </div>
);

const AnalyticsView: React.FC<any> = ({ data, type, settings }) => (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Analytics Dashboard</h3>
 <p className="text-gray-600">Comprehensive insights and analytics for {type}.</p>
 </div>
);

const RoadmapView: React.FC<any> = ({ projects, settings }) => (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Roadmap View</h3>
 <p className="text-gray-600">Strategic roadmap with milestones and key initiatives.</p>
 </div>
);

const MyFocusView: React.FC<any> = ({ data, type, settings }) => (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">My Focus View</h3>
 <p className="text-gray-600">Personalized view showing your most important and urgent items.</p>
 </div>
);

const ViewSettingsPanel: React.FC<any> = ({ 
 settings, 
 onSettingsChange, 
 activeView, 
 activeViewConfig, 
 onClose 
}) => (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-medium text-gray-900">View Settings</h3>
 <button
 onClick={onClose}
 className="text-gray-400 hover:text-gray-600"
 >
 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
 </svg>
 </button>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-3">Display</h4>
 <div className="space-y-3">
 <div>
 <label className="block text-sm text-gray-700 mb-1">Density</label>
 <select 
 value={settings.displayDensity}
 onChange={(e) => onSettingsChange({...settings, displayDensity: e.target.value as any})}
 className="w-full text-sm border border-gray-300 rounded-md py-2"
 >
 <option value="compact">Compact</option>
 <option value="normal">Normal</option>
 <option value="comfortable">Comfortable</option>
 </select>
 </div>
 <label className="flex items-center">
 <input
 type="checkbox"
 checked={settings.colorCoding}
 onChange={(e) => onSettingsChange({...settings, colorCoding: e.target.checked})}
 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
 />
 <span className="ml-2 text-sm text-gray-700">Color coding</span>
 </label>
 </div>
 </div>
 
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-3">Content</h4>
 <div className="space-y-3">
 <label className="flex items-center">
 <input
 type="checkbox"
 checked={settings.showSubtasks}
 onChange={(e) => onSettingsChange({...settings, showSubtasks: e.target.checked})}
 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
 />
 <span className="ml-2 text-sm text-gray-700">Show subtasks</span>
 </label>
 <label className="flex items-center">
 <input
 type="checkbox"
 checked={settings.showDependencies}
 onChange={(e) => onSettingsChange({...settings, showDependencies: e.target.checked})}
 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
 />
 <span className="ml-2 text-sm text-gray-700">Show dependencies</span>
 </label>
 </div>
 </div>
 
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-3">View-Specific</h4>
 {activeViewConfig && (
 <div className="text-sm text-gray-600">
 <p>Settings for <strong>{activeViewConfig.name}</strong></p>
 <p className="mt-2">Custom options would appear here based on the selected view.</p>
 </div>
 )}
 </div>
 </div>
 </div>
);

export default FlexibleTaskViews;
