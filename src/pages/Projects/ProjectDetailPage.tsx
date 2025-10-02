import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchProjects } from '../../store/slices/projectSlice';
import { fetchTasks } from '../../store/slices/taskSlice';
import { Project, Task, TaskStatus, TaskPriority } from '../../types';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import {
  ArrowLeftIcon,
  FolderIcon,
  CalendarIcon,
  UserIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { projects, isLoading: projectsLoading } = useAppSelector((state: any) => state.projects || { projects: [], isLoading: false });
  const { tasks, isLoading: tasksLoading } = useAppSelector((state: any) => state.tasks || { tasks: [], isLoading: false });
  
  const [project, setProject] = useState<Project | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'team' | 'analytics'>('overview');

  useEffect(() => {
    dispatch(fetchProjects());
    if (id) {
      dispatch(fetchTasks(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (projects && id) {
      const foundProject = projects.find((p: Project) => p.id === id);
      setProject(foundProject || null);
    }
  }, [projects, id]);

  useEffect(() => {
    if (tasks && id) {
      const filteredTasks = tasks.filter((task: Task) => task.project_id === id);
      setProjectTasks(filteredTasks);
    }
  }, [tasks, id]);

  if (projectsLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <FolderIcon className="mx-auto h-12 w-12 text-secondary-400" />
        <h3 className="mt-2 text-sm font-medium text-secondary-900">Project not found</h3>
        <p className="mt-1 text-sm text-secondary-500">
          The project you're looking for doesn't exist or you don't have access to it.
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-user-blue hover:bg-user-blue"
          >
            <ArrowLeftIcon className="-ml-1 mr-2 h-4 w-4" />
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  // Calculate project statistics
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(task => task.status === TaskStatus.COMPLETED).length;
  const inProgressTasks = projectTasks.filter(task => task.status === TaskStatus.IN_PROGRESS).length;
  const overdueTasks = projectTasks.filter(task => {
    if (task.due_date && task.status !== TaskStatus.COMPLETED) {
      return new Date(task.due_date) < new Date();
    }
    return false;
  }).length;

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH: return 'text-red-600 bg-red-50';
      case TaskPriority.MEDIUM: return 'text-yellow-600 bg-yellow-50';
      case TaskPriority.LOW: return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: FolderIcon },
    { id: 'tasks', name: 'Tasks', icon: CheckCircleIcon, count: totalTasks },
    { id: 'team', name: 'Team', icon: UserIcon },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/projects')}
                className="inline-flex items-center p-2 border border-transparent rounded-md text-secondary-400 hover:text-secondary-500"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-secondary-900">{project.name}</h1>
                <p className="text-sm text-secondary-500">{project.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
              <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-user-blue hover:bg-user-blue">
                <PencilIcon className="-ml-1 mr-2 h-4 w-4" />
                Edit Project
              </button>
            </div>
          </div>
        </div>

        {/* Project Stats */}
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:px-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Progress</dt>
                        <dd className="text-lg font-medium text-gray-900">{completionPercentage}%</dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Tasks</dt>
                        <dd className="text-lg font-medium text-gray-900">{completedTasks}/{totalTasks}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CalendarIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Due Date</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {project.due_date ? new Date(project.due_date).toLocaleDateString() : 'Not set'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Overdue</dt>
                        <dd className="text-lg font-medium text-red-600">{overdueTasks}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`whitespace-nowrap py-4 px-2 font-medium text-sm flex items-center space-x-2 rounded-md transition-colors focus:outline-none focus:ring-0 ${
                    activeTab === tab.id ? 'text-indigo-600' : 'text-black hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                  {tab.count !== undefined && (
                    <span className="bg-gray-100 text-gray-900 ml-2 py-0.5 px-2.5 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Project Details</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                      <dd className="text-sm text-gray-900">
                        {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Budget</dt>
                      <dd className="text-sm text-gray-900">
                        {project.budget ? `$${(project.budget / 100).toLocaleString()}` : 'Not set'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Priority</dt>
                      <dd className="text-sm text-gray-900">{project.priority}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                  <div className="text-sm text-gray-500">
                    No recent activity to display.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Tasks ({totalTasks})</h3>
                <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-user-blue hover:bg-user-blue">
                  <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
                  Add Task
                </button>
              </div>
              
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Task
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Due Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {projectTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{task.title}</div>
                            {task.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {task.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            task.status === TaskStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                            task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                            task.status === TaskStatus.BLOCKED ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {projectTasks.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new task.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Team Members</h3>
              <p className="text-gray-500">Team member management coming soon...</p>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Analytics</h3>
              <p className="text-gray-500">Project analytics coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
