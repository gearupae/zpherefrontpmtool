import React from 'react';
import { Project, Task } from '../../types';
import {
  FolderIcon,
  RectangleStackIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface ProjectAnalyticsProps {
  project: Project;
  tasks: Task[];
  teamMembers: any[];
}

const ProjectAnalytics: React.FC<ProjectAnalyticsProps> = ({ project, tasks, teamMembers }) => {
  // Calculate project-specific analytics
  const getProjectAnalytics = () => {
    const projectTasks = tasks.filter(task => task.project_id === project.id);
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
    const pendingTasks = projectTasks.filter(task => task.status === 'todo').length;
    const inProgressTasks = projectTasks.filter(task => task.status === 'in_progress').length;
    const overdueTasks = projectTasks.filter(task => {
      if (task.due_date && task.status !== 'completed') {
        return new Date(task.due_date) < new Date();
      }
      return false;
    }).length;

    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const onTimeCompletion = totalTasks > 0 ? ((totalTasks - overdueTasks) / totalTasks) * 100 : 0;

    // Priority distribution
    const priorityData = {
      'High': projectTasks.filter(task => task.priority === 'high').length,
      'Medium': projectTasks.filter(task => task.priority === 'medium').length,
      'Low': projectTasks.filter(task => task.priority === 'low').length,
    };

    // Status distribution
    const statusData = {
      'Completed': completedTasks,
      'In Progress': inProgressTasks,
      'Todo': pendingTasks,
      'Overdue': overdueTasks,
    };

    // Calculate estimated vs actual hours
    const estimatedHours = project.estimated_hours || 0;
    const actualHours = project.actual_hours || 0;
    const hoursVariance = estimatedHours > 0 ? ((actualHours - estimatedHours) / estimatedHours) * 100 : 0;

    return {
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        overdue: overdueTasks,
        completionRate: taskCompletionRate,
        onTimeRate: onTimeCompletion,
        priorityDistribution: priorityData,
        statusDistribution: statusData,
      },
      time: {
        estimated: estimatedHours,
        actual: actualHours,
        variance: hoursVariance,
      },
      budget: {
        budget: project.budget || 0,
        hourlyRate: project.hourly_rate || 0,
        cost: actualHours * (project.hourly_rate || 0),
      }
    };
  };

  const analytics = getProjectAnalytics();

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-error-100 text-error-800';
      case 'medium': return 'bg-warning-100 text-warning-800';
      case 'low': return 'bg-success-100 text-success-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success-100 text-success-800';
      case 'in_progress': return 'bg-primary-100 text-primary-800';
      case 'pending': return 'bg-warning-100 text-warning-800';
      case 'overdue': return 'bg-error-100 text-error-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <FolderIcon className="h-6 w-6 text-user-blue" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary-900">{project.name}</h2>
            <p className="text-secondary-600">{project.description}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-user-blue">{analytics.tasks.total}</div>
            <div className="text-sm text-secondary-500">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success-600">{analytics.tasks.completed}</div>
            <div className="text-sm text-secondary-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning-600">{analytics.tasks.inProgress}</div>
            <div className="text-sm text-secondary-500">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-error-600">{analytics.tasks.overdue}</div>
            <div className="text-sm text-secondary-500">Overdue</div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Task Completion */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-secondary-900 mb-4">Task Completion</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-600">Completion Rate</span>
              <span className="text-sm font-medium text-secondary-900">
                {analytics.tasks.completionRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-3">
              <div
                className="bg-user-green h-3 rounded-full transition-all duration-500"
                style={{ width: `${analytics.tasks.completionRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-600">On Time Rate</span>
              <span className="text-sm font-medium text-secondary-900">
                {analytics.tasks.onTimeRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-3">
              <div
                className="bg-user-blue h-3 rounded-full transition-all duration-500"
                style={{ width: `${analytics.tasks.onTimeRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Time Tracking */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-secondary-900 mb-4">Time Tracking</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-600">Estimated Hours</span>
              <span className="text-sm font-medium text-secondary-900">
                {analytics.time.estimated}h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-600">Actual Hours</span>
              <span className="text-sm font-medium text-secondary-900">
                {analytics.time.actual}h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-600">Variance</span>
              <span className={`text-sm font-medium ${
                analytics.time.variance > 0 ? 'text-error-600' : 'text-success-600'
              }`}>
                {analytics.time.variance > 0 ? '+' : ''}{analytics.time.variance.toFixed(1)}%
              </span>
            </div>
            {analytics.time.estimated > 0 && (
              <div className="w-full bg-secondary-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    analytics.time.variance > 0 ? 'bg-user-red' : 'bg-user-green'
                  }`}
                  style={{ 
                    width: `${Math.min((analytics.time.actual / analytics.time.estimated) * 100, 100)}%` 
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Budget */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-secondary-900 mb-4">Budget</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-600">Budget</span>
              <span className="text-sm font-medium text-secondary-900">
                ${(analytics.budget.budget || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-600">Hourly Rate</span>
              <span className="text-sm font-medium text-secondary-900">
                ${analytics.budget.hourlyRate}/h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-600">Current Cost</span>
              <span className="text-sm font-medium text-secondary-900">
                ${(analytics.budget.cost || 0).toLocaleString()}
              </span>
            </div>
            {analytics.budget.budget > 0 && (
              <div className="w-full bg-secondary-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    analytics.budget.cost > analytics.budget.budget ? 'bg-user-red' : 'bg-user-green'
                  }`}
                  style={{ 
                    width: `${Math.min((analytics.budget.cost / analytics.budget.budget) * 100, 100)}%` 
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-secondary-900 mb-4">Task Priority Distribution</h3>
          <div className="space-y-3">
            {Object.entries(analytics.tasks.priorityDistribution).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className="text-sm text-secondary-600">{priority} Priority</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-secondary-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        priority === 'High' ? 'bg-user-red' :
                        priority === 'Medium' ? 'bg-user-yellow' : 'bg-user-green'
                      }`}
                      style={{
                        width: `${(count / analytics.tasks.total) * 100}%`
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

        {/* Status Distribution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-secondary-900 mb-4">Task Status Distribution</h3>
          <div className="space-y-3">
            {Object.entries(analytics.tasks.statusDistribution).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-secondary-600">{status}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-secondary-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        status === 'Completed' ? 'bg-user-green' :
                        status === 'In Progress' ? 'bg-user-blue' :
                        status === 'Todo' ? 'bg-user-yellow' : 'bg-user-red'
                      }`}
                      style={{
                        width: `${(count / analytics.tasks.total) * 100}%`
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

      {/* Recent Tasks */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-secondary-900 mb-4">Recent Tasks</h3>
        <div className="space-y-3">
          {[...tasks]
            .filter(task => task.project_id === project.id)
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 5)
            .map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-secondary-200 hover:bg-secondary-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <RectangleStackIcon className="h-5 w-5 text-success-600" />
                  <div>
                    <p className="text-sm font-medium text-secondary-900 truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-secondary-500">
                      Updated {new Date(task.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectAnalytics;
