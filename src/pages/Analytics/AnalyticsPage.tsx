import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchProjects } from '../../store/slices/projectSlice';
import { fetchTasks } from '../../store/slices/taskSlice';
import { fetchTeamMembers } from '../../store/slices/teamSlice';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ProjectAnalytics from '../../components/Analytics/ProjectAnalytics';
import TeamPerformance from '../../components/Analytics/TeamPerformance';
import {
  ChartBarIcon,
  FolderIcon,
  RectangleStackIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  ShareIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import ResourceDashboard from '../../components/Analytics/ResourceDashboard';
import WorkloadHeatmap from '../../components/Analytics/WorkloadHeatmap';
import AutomationRules from '../../components/Automation/AutomationRules';

const AnalyticsPage: React.FC = () => {
  const dispatch = useAppDispatch();

  const { projects, isLoading: projectsLoading } = useAppSelector((state: any) => state.projects || { projects: [], isLoading: false });
  const { tasks, isLoading: tasksLoading } = useAppSelector((state: any) => state.tasks || { tasks: [], isLoading: false });
  const { teamMembers, isLoading: teamLoading } = useAppSelector((state: any) => state.team || { teamMembers: [], isLoading: false });
  
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedProject, setSelectedProject] = useState('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'team' | 'resources' | 'automation'>('overview');
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchTasks());
    dispatch(fetchTeamMembers());
  }, [dispatch]);

  const isLoading = projectsLoading || tasksLoading || teamLoading;

  // Calculate analytics data
  const getAnalyticsData = () => {
    if (!projects || !tasks || !teamMembers) return null;

    const totalProjects = projects.length;
    const activeProjects = projects.filter((p: any) => p.status === 'active').length;
    const completedProjects = projects.filter((p: any) => p.status === 'completed').length;
    const overdueProjects = projects.filter((p: any) => {
      if (p.due_date && p.status !== 'completed') {
        return new Date(p.due_date) < new Date();
      }
      return false;
    }).length;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
    const pendingTasks = tasks.filter((t: any) => t.status === 'todo').length;
    const overdueTasks = tasks.filter((t: any) => {
      if (t.due_date && t.status !== 'completed') {
        return new Date(t.due_date) < new Date();
      }
      return false;
    }).length;

    const totalTeamMembers = teamMembers.length;
    const activeMembers = teamMembers.filter((m: any) => m.is_active).length;

    // Project status distribution
    const projectStatusData = {
      'Active': activeProjects,
      'Completed': completedProjects,
      'Planning': projects.filter((p: any) => p.status === 'planning').length,
      'On Hold': projects.filter((p: any) => p.status === 'on_hold').length,
      'Cancelled': projects.filter((p: any) => p.status === 'cancelled').length,
    };

    // Task status distribution
    const taskStatusData = {
      'Completed': completedTasks,
      'Todo': pendingTasks,
      'In Progress': tasks.filter((t: any) => t.status === 'in_progress').length,
      'Overdue': overdueTasks,
    };

    // Priority distribution
    const priorityData = {
      'High': tasks.filter((t: any) => t.priority === 'high').length,
      'Medium': tasks.filter((t: any) => t.priority === 'medium').length,
      'Low': tasks.filter((t: any) => t.priority === 'low').length,
    };

    return {
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        overdue: overdueProjects,
        statusDistribution: projectStatusData,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
        statusDistribution: taskStatusData,
        priorityDistribution: priorityData,
      },
      team: {
        total: totalTeamMembers,
        active: activeMembers,
      },
    };
  };

  const analyticsData = getAnalyticsData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="mx-auto h-12 w-12 text-secondary-400" />
        <h3 className="mt-2 text-sm font-medium text-secondary-900">No data available</h3>
        <p className="mt-1 text-sm text-secondary-500">
          Start by creating some projects and tasks to see analytics.
        </p>
      </div>
    );
  }

  const selectedProjectData = selectedProject !== 'all' 
    ? projects.find((p: any) => p.id === selectedProject)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">Analytics Dashboard</h1>
              <p className="text-secondary-600 mt-1">
                Comprehensive insights into your projects, tasks, and team performance
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.open('/api/v1/analytics/export/pdf/dashboard', '_blank')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#0d0d0d] bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                Export PDF
              </button>
              
              <button
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#0d0d0d] bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
              >
                <ShareIcon className="h-4 w-4 mr-1" />
                Share Report
              </button>
              
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border-secondary-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </select>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="border-secondary-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="all">All Projects</option>
                {projects?.map((project: any) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-secondary-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'projects', name: 'Project Analytics', icon: FolderIcon },
              { id: 'team', name: 'Team Performance', icon: UsersIcon },
              { id: 'resources', name: 'Resource Planning', icon: UsersIcon },
              { id: 'automation', name: 'Automation', icon: BoltIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 font-medium text-sm flex items-center space-x-2 rounded-md transition-colors focus:outline-none focus:ring-0 ${
                  activeTab === tab.id ? 'text-indigo-600' : 'text-black hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Projects Metric */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FolderIcon className="h-6 w-6 text-user-blue" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-secondary-500 truncate">
                        Total Projects
                      </dt>
                      <dd className="text-lg font-medium text-secondary-900">
                        {analyticsData.projects.total}
                      </dd>
                      <dd className="text-sm text-secondary-500">
                        {analyticsData.projects.active} active
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks Metric */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <RectangleStackIcon className="h-6 w-6 text-success-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-secondary-500 truncate">
                        Total Tasks
                      </dt>
                      <dd className="text-lg font-medium text-secondary-900">
                        {analyticsData.tasks.total}
                      </dd>
                      <dd className="text-sm text-secondary-500">
                        {analyticsData.tasks.completed} completed
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Metric */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UsersIcon className="h-6 w-6 text-warning-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-secondary-500 truncate">
                        Team Members
                      </dt>
                      <dd className="text-lg font-medium text-secondary-900">
                        {analyticsData.team.total}
                      </dd>
                      <dd className="text-sm text-secondary-500">
                        {analyticsData.team.active} active
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Overdue Metric */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-6 w-6 text-error-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-secondary-500 truncate">
                        Overdue Items
                      </dt>
                      <dd className="text-lg font-medium text-secondary-900">
                        {analyticsData.projects.overdue + analyticsData.tasks.overdue}
                      </dd>
                      <dd className="text-sm text-secondary-500">
                        {analyticsData.projects.overdue} projects, {analyticsData.tasks.overdue} tasks
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Project Status Chart */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-secondary-900 mb-4">Project Status Distribution</h3>
              <div className="space-y-3">
                {Object.entries(analyticsData.projects.statusDistribution).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-secondary-600">{status}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-secondary-200 rounded-full h-2">
                        <div
                          className="bg-user-blue h-2 rounded-full"
                          style={{
                            width: `${(count / analyticsData.projects.total) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-secondary-900 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Status Chart */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-secondary-900 mb-4">Task Status Distribution</h3>
              <div className="space-y-3">
                {Object.entries(analyticsData.tasks.statusDistribution).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-secondary-600">{status}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-secondary-200 rounded-full h-2">
                        <div
                          className="bg-user-green h-2 rounded-full"
                          style={{
                            width: `${(count / analyticsData.tasks.total) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-secondary-900 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">Task Priority Distribution</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Object.entries(analyticsData.tasks.priorityDistribution).map(([priority, count]) => {
                const getPriorityColor = (priority: string) => {
                  switch (priority.toLowerCase()) {
                    case 'high': return 'bg-error-100 text-error-800';
                    case 'medium': return 'bg-warning-100 text-warning-800';
                    case 'low': return 'bg-success-100 text-success-800';
                    default: return 'bg-secondary-100 text-secondary-800';
                  }
                };

                return (
                  <div key={priority} className="text-center p-4 rounded-lg border border-secondary-200">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(priority)} mb-2`}>
                      {priority} Priority
                    </div>
                    <div className="text-2xl font-bold text-secondary-900">{count}</div>
                    <div className="text-sm text-secondary-500">tasks</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {projects?.slice(0, 5).map((project: any) => (
                <div key={project.id} className="flex items-center space-x-3 p-3 rounded-lg border border-secondary-200">
                  <div className="flex-shrink-0">
                    <FolderIcon className="h-5 w-5 text-user-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900 truncate">
                      Project "{project.name}" was {project.status === 'completed' ? 'completed' : 'updated'}
                    </p>
                    <p className="text-xs text-secondary-500">
                      {new Date(project.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.status === 'completed' ? 'bg-success-100 text-success-800' :
                    project.status === 'active' ? 'bg-primary-100 text-primary-800' :
                    'bg-secondary-100 text-secondary-800'
                  }`}>
                    {project.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'projects' && (
        <div className="space-y-6">
          {selectedProjectData ? (
            <ProjectAnalytics 
              project={selectedProjectData} 
              tasks={tasks} 
              teamMembers={teamMembers} 
            />
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-secondary-900 mb-4">Project Analytics</h3>
              <p className="text-secondary-600">
                Select a specific project from the dropdown above to view detailed analytics.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects?.slice(0, 6).map((project: any) => (
                  <div key={project.id} className="p-4 border border-secondary-200 rounded-lg hover:bg-secondary-50 cursor-pointer">
                    <h4 className="font-medium text-secondary-900">{project.name}</h4>
                    <p className="text-sm text-secondary-500 mt-1">{project.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'completed' ? 'bg-success-100 text-success-800' :
                        project.status === 'active' ? 'bg-primary-100 text-primary-800' :
                        'bg-secondary-100 text-secondary-800'
                      }`}>
                        {project.status}
                      </span>
                      <span className="text-xs text-secondary-500">
                        {tasks.filter((t: any) => t.project_id === project.id).length} tasks
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'team' && (
        <TeamPerformance teamMembers={teamMembers} tasks={tasks} />
      )}

      {activeTab === 'resources' && (
        <ResourceDashboard 
          teamMembers={teamMembers} 
          tasks={tasks} 
          projects={projects} 
        />
      )}

      {activeTab === 'automation' && (
        <AutomationRules />
      )}

      {/* Share Report Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-[#0d0d0d] mb-4">Share Analytics Report</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Share URL</label>
                  <div className="flex">
                    <input
                      type="text"
                      readOnly
                      value="https://zphere.com/shared/analytics/abc123"
                      className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 bg-gray-50 text-sm"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText('https://zphere.com/shared/analytics/abc123')}
                      className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100 text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  • This link will expire in 30 days<br/>
                  • Only basic metrics will be visible<br/>
                  • No sensitive data is included
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-[#0d0d0d] bg-white hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  onClick={() => console.log('Generate new share link')}
                >
                  Generate New Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
