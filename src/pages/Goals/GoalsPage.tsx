import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusIcon, 
  ChartBarIcon, 
  ClockIcon, 
  CheckCircleIcon,
  CalendarIcon,
  UsersIcon,
  FlagIcon as TargetIcon,
  BellIcon,
  CogIcon,
  FolderIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline';
import { useDispatch } from 'react-redux';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { addNotification } from '../../store/slices/notificationSlice';
import CreateGoalForm from '../../components/Goals/CreateGoalForm';

// Types
interface Goal {
  id: string;
  title: string;
  description?: string;
  goal_type: 'personal' | 'team' | 'sales' | 'project' | 'custom';
  status: 'not_started' | 'in_progress' | 'completed' | 'paused' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date: string;
  end_date: string;
  target_value?: number;
  current_value: number;
  unit?: string;
  completion_percentage: number;
  probability_of_achievement: number;
  days_remaining: number;
  is_overdue: boolean;
  member_count: number;
  checklist_count: number;
  completed_checklist_count: number;
  tags: string[];
  created_at: string;
  // Additional fields from goal creation
  project_id?: string;
  project_name?: string;
  auto_update_progress?: boolean;
  members?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  }>;
  checklist_items?: Array<{
    id: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    due_date?: string;
    is_completed: boolean;
  }>;
  reminder_settings?: {
    enabled: boolean;
    interval: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
    custom_interval_days?: number;
    message?: string;
    send_email: boolean;
    send_in_app: boolean;
    send_to_members: boolean;
  };
}

interface GoalMetrics {
  total_goals: number;
  active_goals: number;
  completed_goals: number;
  overdue_goals: number;
  average_completion_rate: number;
  goals_by_type: Record<string, number>;
  goals_by_priority: Record<string, number>;
  upcoming_deadlines: Goal[];
  high_probability_goals: Goal[];
  low_probability_goals: Goal[];
}

const GoalsPage: React.FC = () => {
  const dispatch = useDispatch();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [metrics, setMetrics] = useState<GoalMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [inlineCreate, setInlineCreate] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const inlineFormRef = useRef<HTMLDivElement | null>(null);

  // Fetch goals and metrics
  useEffect(() => {
    fetchGoals();
    fetchMetrics();
  }, []);

  const fetchGoals = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const params = new URLSearchParams();
      

      const queryString = params.toString();
      const url = `/goals/${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get(url);
      setGoals(response.data);
    } catch (error: any) {
      console.error('Failed to fetch goals:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch goals',
        duration: 3000,
      }));
    }
  };

  const fetchMetrics = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/goals/analytics/metrics');
      setMetrics(response.data);
    } catch (error: any) {
      console.error('Failed to fetch goal metrics:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch goal metrics',
        duration: 3000,
      }));
    } finally {
      setIsLoading(false);
    }
  };


  // Smooth scroll into view when showing the inline form
  useEffect(() => {
    if (inlineCreate) {
      inlineFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [inlineCreate]);

  const handleCreateGoal = async (goalData: any) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.post('/goals/', goalData);
      
      // Refresh data
      fetchGoals();
      fetchMetrics();
    } catch (error: any) {
      console.error('Failed to create goal:', error);
      throw error; // Let form handle notification
    }
  };

  const handleUpdateGoal = async (goalId: string, goalData: any) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      // Avoid trailing slash to prevent 307 redirect that drops auth headers
      await apiClient.put(`/goals/${goalId}`, goalData);
      
      // Refresh data
      fetchGoals();
      fetchMetrics();
    } catch (error: any) {
      console.error('Failed to update goal:', error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'overdue': return 'bg-red-100 text-red-800 border border-red-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sales': return <TargetIcon className="h-5 w-5" />;
      case 'team': return <UsersIcon className="h-5 w-5" />;
      case 'project': return <ChartBarIcon className="h-5 w-5" />;
      default: return <CheckCircleIcon className="h-5 w-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateRelative = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  const formatValue = (value: number, unit?: string) => {
    if (!unit) return value.toString();
    
    if (unit === 'currency' || unit === 'dollars') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    }
    
    return `${value.toLocaleString()} ${unit}`;
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
          <p className="text-gray-600 mt-2">
            Track and achieve your objectives with smart goal management
          </p>
        </div>
        <button
          onClick={() => setInlineCreate((v) => !v)}
          className="btn-page-action flex items-center"
        >
          <PlusIcon className="h-5 w-5" />
          <span>{inlineCreate ? 'Hide Form' : 'New Goal'}</span>
        </button>
      </div>

      {/* Inline Create Form - placed below Header and above Metrics */}
      {inlineCreate && (
        <div ref={inlineFormRef} className="mt-4 mb-6 bg-white p-4 md:p-6 rounded-lg shadow border border-gray-200">
          <CreateGoalForm
            isOpen={true}
            onClose={() => setInlineCreate(false)}
            onSubmit={handleCreateGoal}
            mode="inline"
          />
        </div>
      )}

      {/* Metrics Dashboard */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="section-card section-card--blue">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TargetIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Goals</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.total_goals}</p>
              </div>
            </div>
          </div>

          <div className="section-card section-card--green">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Goals</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.active_goals}</p>
              </div>
            </div>
          </div>

          <div className="section-card section-card--yellow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue Goals</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.overdue_goals}</p>
              </div>
            </div>
          </div>

          <div className="section-card section-card--purple">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.completed_goals}</p>
              </div>
            </div>
          </div>
        </div>
      )}




      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {goals.map(goal => (
          <div key={goal.id} className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getTypeIcon(goal.goal_type)}
                  </div>
                  <div>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-md ${getStatusColor(goal.status)}`}>
                      {goal.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-md ${getPriorityColor(goal.priority)}`}>
                    {goal.priority.toUpperCase()}
                  </span>
                </div>
              </div>
              
              {/* Inline Edit Form */}
              {editingGoal && editingGoal.id === goal.id ? (
                <CreateGoalForm
                  isOpen={true}
                  onClose={() => setEditingGoal(null)}
                  onSubmit={(data) => handleUpdateGoal(goal.id, data)}
                  mode="inline"
                  isEdit
                  initialGoal={editingGoal as any}
                  submitLabel="Save Changes"
                />
              ) : (
                <>
                  {/* Title and Description */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{goal.description}</p>
                  )}

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Progress</span>
                      <span className="text-sm text-gray-600">{Math.round(goal.completion_percentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${goal.completion_percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Target Progress (if applicable) */}
                  {goal.target_value && goal.target_value > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Target</span>
                        <span className="text-sm text-gray-600">
                          {formatValue(goal.current_value, goal.unit)} / {formatValue(goal.target_value, goal.unit)}
                        </span>
                      </div>
                      {goal.auto_update_progress && (
                        <div className="flex items-center mt-2 text-xs text-blue-600">
                          <CogIcon className="h-3 w-3 mr-1" />
                          Auto-updating
                        </div>
                      )}
                    </div>
                  )}

                  {/* Project Association */}
                  {goal.project_name && (
                    <div className="mb-4 p-2 bg-blue-50 border-l-4 border-blue-400 rounded">
                      <div className="flex items-center">
                        <FolderIcon className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm text-blue-800 font-medium">Project:</span>
                        <span className="text-sm text-blue-700 ml-1">{goal.project_name}</span>
                      </div>
                    </div>
                  )}

                  {/* Team Members (if available) */}
                  {goal.members && goal.members.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <UsersIcon className="h-4 w-4 text-gray-600 mr-1" />
                        <span className="text-sm font-medium text-gray-700">Team Members ({goal.members.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {goal.members.slice(0, 4).map(member => (
                          <div key={member.id} className="flex items-center bg-gray-100 rounded-full px-2 py-1 text-xs">
                            <div className="h-5 w-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium mr-1">
                              {member.first_name?.[0]}{member.last_name?.[0]}
                            </div>
                            <span className="text-gray-700">
                              {member.first_name} {member.last_name}
                            </span>
                          </div>
                        ))}
                        {goal.members.length > 4 && (
                          <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded-full">
                            +{goal.members.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Checklist Details (if available) */}
                  {goal.checklist_items && goal.checklist_items.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <ListBulletIcon className="h-4 w-4 text-gray-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Checklist</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {goal.checklist_items.filter(item => item.is_completed).length}/{goal.checklist_items.length} completed
                        </span>
                      </div>
                      <div className="space-y-1">
                        {goal.checklist_items.slice(0, 3).map(item => (
                          <div key={item.id} className="flex items-center text-xs">
                            <div className={`h-3 w-3 rounded-sm mr-2 flex items-center justify-center ${
                              item.is_completed ? 'bg-green-500' : 'bg-gray-300'
                            }`}>
                              {item.is_completed && (
                                <CheckCircleIcon className="h-2 w-2 text-white" />
                              )}
                            </div>
                            <span className={`flex-1 ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                              {item.title}
                            </span>
                            <span className={`px-1 py-0.5 rounded text-xs ${
                              item.priority === 'critical' ? 'bg-red-100 text-red-600' :
                              item.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                              item.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                              'bg-green-100 text-green-600'
                            }`}>
                              {item.priority}
                            </span>
                          </div>
                        ))}
                        {goal.checklist_items.length > 3 && (
                          <div className="text-xs text-gray-500 pl-5">
                            +{goal.checklist_items.length - 3} more items
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reminder Settings */}
                  {goal.reminder_settings?.enabled && (
                    <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex items-center">
                        <BellIcon className="h-4 w-4 text-yellow-600 mr-2" />
                        <span className="text-sm text-yellow-800 font-medium">Reminders:</span>
                        <span className="text-sm text-yellow-700 ml-1 capitalize">
                          {goal.reminder_settings.interval === 'custom' 
                            ? `Every ${goal.reminder_settings.custom_interval_days} days`
                            : goal.reminder_settings.interval
                          }
                        </span>
                      </div>
                      {goal.reminder_settings.message && (
                        <p className="text-xs text-yellow-700 mt-1 pl-6">
                          "{goal.reminder_settings.message}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="mb-4 text-sm text-gray-500">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <UsersIcon className="h-4 w-4" />
                          <span>{goal.members?.length || goal.member_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircleIcon className="h-4 w-4" />
                          <span>{goal.completed_checklist_count}/{goal.checklist_count}</span>
                        </div>
                        {goal.reminder_settings?.enabled && (
                          <div className="flex items-center space-x-1">
                            <BellIcon className="h-4 w-4" />
                            <span className="text-xs">Reminders on</span>
                          </div>
                        )}
                        {goal.auto_update_progress && (
                          <div className="flex items-center space-x-1">
                            <CogIcon className="h-4 w-4" />
                            <span className="text-xs">Auto-update</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span className={goal.is_overdue ? 'text-red-600 font-medium' : ''}>
                          {goal.days_remaining} days left
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Achievement Probability */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">Success Probability</span>
                      <span className={`text-sm font-medium ${
                        goal.probability_of_achievement > 75 ? 'text-green-600' :
                        goal.probability_of_achievement > 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {Math.round(goal.probability_of_achievement)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          goal.probability_of_achievement > 75 ? 'bg-green-500' :
                          goal.probability_of_achievement > 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${goal.probability_of_achievement}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Tags */}
                  {goal.tags && goal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {goal.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {goal.tags.length > 3 && (
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          +{goal.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Dates */}
                  <div className="text-xs text-gray-500 border-t pt-3 space-y-1">
                    <div className="flex justify-between">
                      <span>Start: {formatDate(goal.start_date)}</span>
                      <span>End: {formatDate(goal.end_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Created: {formatDateRelative(goal.created_at)}</span>
                      <span className={`font-medium ${
                        goal.is_overdue ? 'text-red-600' : 
                        goal.days_remaining <= 7 ? 'text-orange-600' : 'text-gray-500'
                      }`}>
                        {goal.is_overdue ? 'Overdue' : `${goal.days_remaining} days left`}
                      </span>
                    </div>
                  </div>

{/* Actions */}
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      className="text-blue-600 hover:text-blue-800 text-xs border border-blue-200 rounded px-2 py-1"
                      onClick={() => setEditingGoal(goal)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-gray-700 hover:text-gray-900 text-xs border border-gray-200 rounded px-2 py-1"
                      onClick={() => window.location.assign(`/goals/${goal.id}`)}
                    >
                      View
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>


      {goals.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <TargetIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No goals found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first goal.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-page-action flex items-center mx-auto"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Create Goal</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Goal Form - Modal (fallback) */}
      <CreateGoalForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={handleCreateGoal}
        mode="modal"
      />

    </div>
  );
};

export default GoalsPage;
