import React, { useState, useEffect, useMemo } from 'react';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserGroupIcon,
  CalendarIcon,
  FolderIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { Task, Project, ProjectStatus, TaskStatus } from '../../types';

interface ProjectHealthProps {
  projectId?: string;
  projects?: Project[];
  tasks?: Task[];
  showAllProjects?: boolean;
}

interface HealthMetrics {
  overall_health: 'healthy' | 'at_risk' | 'critical';
  health_score: number;
  schedule_health: number;
  budget_health: number;
  team_health: number;
  quality_health: number;
  risk_count: number;
  velocity_trend: 'up' | 'down' | 'stable';
  completion_percentage: number;
  overdue_tasks: number;
  blocked_tasks: number;
  active_team_members: number;
  estimated_completion: string | null;
  budget_utilization: number;
  scope_changes: number;
}

interface ProjectSummary extends Project {
  health_metrics: HealthMetrics;
  task_counts: {
    total: number;
    completed: number;
    in_progress: number;
    blocked: number;
    overdue: number;
  };
  team_stats: {
    active_members: number;
    workload_balance: number;
    productivity_score: number;
  };
}

const ProjectHealthDashboard: React.FC<ProjectHealthProps> = ({
  projectId,
  projects = [],
  tasks = [],
  showAllProjects = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(projectId || null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Calculate health metrics for projects
  const projectSummaries = useMemo(() => {
    const summaries: ProjectSummary[] = [];

    const projectsToAnalyze = showAllProjects ? projects : 
      projects.filter(p => !selectedProject || p.id === selectedProject);

    projectsToAnalyze.forEach(project => {
      const projectTasks = tasks.filter(task => task.project_id === project.id);
      
      // Calculate task counts
      const taskCounts = {
        total: projectTasks.length,
        completed: projectTasks.filter(t => t.status === TaskStatus.COMPLETED).length,
        in_progress: projectTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
        blocked: projectTasks.filter(t => t.status === TaskStatus.BLOCKED).length,
        overdue: projectTasks.filter(t => {
          const dueDate = t.due_date ? new Date(t.due_date) : null;
          return dueDate && dueDate < new Date() && t.status !== TaskStatus.COMPLETED;
        }).length,
      };

      // Calculate completion percentage
      const completionPercentage = taskCounts.total > 0 ? 
        (taskCounts.completed / taskCounts.total) * 100 : 0;

      // Calculate schedule health (based on deadlines and overdue tasks)
      const scheduleHealth = Math.max(0, 100 - (taskCounts.overdue / Math.max(1, taskCounts.total)) * 100);

      // Calculate team health (simplified - based on task distribution)
      const teamMembers = new Set(projectTasks.map(t => t.assignee_id).filter(Boolean));
      const teamHealth = teamMembers.size > 0 ? 
        Math.min(100, (taskCounts.completed + taskCounts.in_progress) / Math.max(1, taskCounts.total) * 100) : 50;

      // Calculate budget health (simplified - assume based on completion vs timeline)
      const projectStartDate = project.start_date ? new Date(project.start_date) : new Date();
      const projectDueDate = project.due_date ? new Date(project.due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const totalDuration = projectDueDate.getTime() - projectStartDate.getTime();
      const elapsedDuration = Date.now() - projectStartDate.getTime();
      const timeProgress = Math.min(100, (elapsedDuration / totalDuration) * 100);
      const budgetHealth = completionPercentage >= timeProgress ? 100 : 
        Math.max(0, 100 - (timeProgress - completionPercentage));

      // Calculate quality health (based on blocked tasks and completion rate)
      const qualityHealth = Math.max(0, 100 - (taskCounts.blocked / Math.max(1, taskCounts.total)) * 50);

      // Calculate overall health score
      const healthScore = (scheduleHealth + teamHealth + budgetHealth + qualityHealth) / 4;

      // Determine overall health status
      let overallHealth: 'healthy' | 'at_risk' | 'critical';
      if (healthScore >= 80) overallHealth = 'healthy';
      else if (healthScore >= 60) overallHealth = 'at_risk';
      else overallHealth = 'critical';

      // Calculate estimated completion
      const remainingTasks = taskCounts.total - taskCounts.completed;
      const completionRate = taskCounts.completed / Math.max(1, 
        Math.floor((Date.now() - projectStartDate.getTime()) / (24 * 60 * 60 * 1000)) || 1
      );
      const estimatedDaysToCompletion = completionRate > 0 ? remainingTasks / completionRate : null;
      const estimatedCompletion = estimatedDaysToCompletion ? 
        new Date(Date.now() + estimatedDaysToCompletion * 24 * 60 * 60 * 1000).toISOString() : null;

      const healthMetrics: HealthMetrics = {
        overall_health: overallHealth,
        health_score: Math.round(healthScore),
        schedule_health: Math.round(scheduleHealth),
        budget_health: Math.round(budgetHealth),
        team_health: Math.round(teamHealth),
        quality_health: Math.round(qualityHealth),
        risk_count: taskCounts.blocked + taskCounts.overdue,
        velocity_trend: completionPercentage > 50 ? 'up' : completionPercentage > 25 ? 'stable' : 'down',
        completion_percentage: Math.round(completionPercentage),
        overdue_tasks: taskCounts.overdue,
        blocked_tasks: taskCounts.blocked,
        active_team_members: teamMembers.size,
        estimated_completion: estimatedCompletion,
        budget_utilization: Math.round(timeProgress),
        scope_changes: 0, // Would need change request data
      };

      const teamStats = {
        active_members: teamMembers.size,
        workload_balance: 75, // Simplified
        productivity_score: Math.round(completionPercentage),
      };

      summaries.push({
        ...project,
        health_metrics: healthMetrics,
        task_counts: taskCounts,
        team_stats: teamStats,
      });
    });

    return summaries.sort((a, b) => a.health_metrics.health_score - b.health_metrics.health_score);
  }, [projects, tasks, selectedProject, showAllProjects]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'at_risk':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ArrowPathIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const HealthScoreCard: React.FC<{ title: string; score: number; icon: React.ReactNode }> = ({
    title,
    score,
    icon,
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {icon}
          <div>
            <p className="text-sm font-medium text-gray-900">{title}</p>
            <p className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}%</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, score)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const ProjectOverviewCard: React.FC<{ project: ProjectSummary }> = ({ project }) => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <FolderIcon className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
              <span className={`px-2 py-1 text-xs rounded-full border ${getHealthColor(project.health_metrics.overall_health)}`}>
                {project.health_metrics.overall_health.replace('_', ' ')}
              </span>
            </div>
            {project.description && (
              <p className="mt-2 text-sm text-gray-600">{project.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(project.health_metrics.health_score)}`}>
              {project.health_metrics.health_score}
            </div>
            <div className="text-sm text-gray-500">Health Score</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {project.health_metrics.completion_percentage}%
            </div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {project.task_counts.total}
            </div>
            <div className="text-xs text-gray-500">Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {project.team_stats.active_members}
            </div>
            <div className="text-xs text-gray-500">Team</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-semibold ${
              project.health_metrics.risk_count > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {project.health_metrics.risk_count}
            </div>
            <div className="text-xs text-gray-500">Risks</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{project.health_metrics.completion_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${project.health_metrics.completion_percentage}%` }}
            />
          </div>
        </div>

        {/* Key metrics */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Due Date:</span>
            <span className="font-medium">{formatDate(project.due_date)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Overdue Tasks:</span>
            <span className={`font-medium ${project.health_metrics.overdue_tasks > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {project.health_metrics.overdue_tasks}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Health Dashboard</h1>
          <p className="text-sm text-gray-600">
            Monitor project health, track risks, and ensure successful delivery
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {!showAllProjects && projects.length > 1 && (
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Overall Health Summary */}
      {projectSummaries.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {projectSummaries.filter(p => p.health_metrics.overall_health === 'healthy').length}
              </div>
              <div className="text-sm text-gray-600">Healthy Projects</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {projectSummaries.filter(p => p.health_metrics.overall_health === 'at_risk').length}
              </div>
              <div className="text-sm text-gray-600">At Risk Projects</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {projectSummaries.filter(p => p.health_metrics.overall_health === 'critical').length}
              </div>
              <div className="text-sm text-gray-600">Critical Projects</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(projectSummaries.reduce((acc, p) => acc + p.health_metrics.health_score, 0) / projectSummaries.length) || 0}
              </div>
              <div className="text-sm text-gray-600">Avg Health Score</div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Project Cards */}
      {showAllProjects ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {projectSummaries.map(project => (
            <ProjectOverviewCard key={project.id} project={project} />
          ))}
        </div>
      ) : selectedProject && projectSummaries.length > 0 ? (
        /* Detailed View for Single Project */
        <div className="space-y-6">
          {projectSummaries.map(project => (
            <div key={project.id} className="space-y-6">
              <ProjectOverviewCard project={project} />

              {/* Detailed Health Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <HealthScoreCard
                  title="Schedule Health"
                  score={project.health_metrics.schedule_health}
                  icon={<CalendarIcon className="w-5 h-5 text-blue-500" />}
                />
                <HealthScoreCard
                  title="Budget Health"
                  score={project.health_metrics.budget_health}
                  icon={<CurrencyDollarIcon className="w-5 h-5 text-green-500" />}
                />
                <HealthScoreCard
                  title="Team Health"
                  score={project.health_metrics.team_health}
                  icon={<UserGroupIcon className="w-5 h-5 text-purple-500" />}
                />
                <HealthScoreCard
                  title="Quality Health"
                  score={project.health_metrics.quality_health}
                  icon={<BoltIcon className="w-5 h-5 text-yellow-500" />}
                />
              </div>

              {/* Task Breakdown */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{project.task_counts.total}</div>
                    <div className="text-sm text-gray-500">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{project.task_counts.completed}</div>
                    <div className="text-sm text-gray-500">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{project.task_counts.in_progress}</div>
                    <div className="text-sm text-gray-500">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{project.task_counts.blocked}</div>
                    <div className="text-sm text-gray-500">Blocked</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{project.task_counts.overdue}</div>
                    <div className="text-sm text-gray-500">Overdue</div>
                  </div>
                </div>
              </div>

              {/* Alerts and Recommendations */}
              {(project.health_metrics.overdue_tasks > 0 || project.health_metrics.blocked_tasks > 0 || project.health_metrics.overall_health !== 'healthy') && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mr-2" />
                    Alerts & Recommendations
                  </h3>
                  <div className="space-y-3">
                    {project.health_metrics.overdue_tasks > 0 && (
                      <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                        <ClockIcon className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800">
                            {project.health_metrics.overdue_tasks} overdue tasks
                          </p>
                          <p className="text-xs text-red-600">
                            Review task deadlines and reassign resources if needed
                          </p>
                        </div>
                      </div>
                    )}
                    {project.health_metrics.blocked_tasks > 0 && (
                      <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">
                            {project.health_metrics.blocked_tasks} blocked tasks
                          </p>
                          <p className="text-xs text-yellow-600">
                            Identify and resolve blockers to maintain project momentum
                          </p>
                        </div>
                      </div>
                    )}
                    {project.health_metrics.schedule_health < 70 && (
                      <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                        <CalendarIcon className="w-5 h-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-orange-800">
                            Schedule health is below target
                          </p>
                          <p className="text-xs text-orange-600">
                            Consider adjusting timelines or adding resources
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* No Project Selected */
        <div className="text-center py-12">
          <ChartBarIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {projects.length === 0 ? 'No projects found' : 'Select a project to view health metrics'}
          </h3>
          <p className="text-sm text-gray-500">
            {projects.length === 0 
              ? 'Create your first project to start tracking health metrics'
              : 'Choose a project from the dropdown to see detailed health analysis'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectHealthDashboard;
