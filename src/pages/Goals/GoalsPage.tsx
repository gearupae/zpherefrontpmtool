import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ListBulletIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { useDispatch } from 'react-redux';
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
  const navigate = useNavigate();

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

  const getDaysLeftColor = (daysLeft: number, isOverdue: boolean) => {
    if (isOverdue || daysLeft < 0) return 'text-red-600';
    if (daysLeft < 7) return 'text-red-600';
    if (daysLeft < 14) return 'text-orange-600';
    return 'text-green-600';
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
    return <div />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title font-bold text-gray-900">Goals</h1>
          <p className="text-gray-600 mt-2">
            Track and achieve your objectives with smart goal management
          </p>
        </div>
        <button
          onClick={() => setInlineCreate((v) => !v)}
          className="btn-page-action btn-styled btn-create-auto flex items-center"
          style={{ backgroundColor: 'rgb(0, 0, 0)', color: 'white', borderColor: 'rgb(0, 0, 0)', fontSize: '0.875rem', padding: '0.2rem 0.75rem' }}
        >
          <PlusIcon className="h-5 w-5" />
          <span>{inlineCreate ? 'Hide Form' : 'New Goal'}</span>
        </button>
      </div>

      {/* Inline Create Form - placed below Header and above Metrics */}
      {inlineCreate && (
        <div ref={inlineFormRef} className="bg-white shadow rounded-lg p-6 mb-6">
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="metric-card metric-blue bg-white px-4 py-3 rounded-lg shadow border-t-4 border-blue-600">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TargetIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Goals</p>
                <p className="metric-value text-2xl font-bold">{metrics.total_goals}</p>
              </div>
            </div>
          </div>

          <div className="metric-card metric-green bg-white px-4 py-3 rounded-lg shadow border-t-4 border-green-600">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Goals</p>
                <p className="metric-value text-2xl font-bold">{metrics.active_goals}</p>
              </div>
            </div>
          </div>

          <div className="metric-card metric-yellow bg-white px-4 py-3 rounded-lg shadow border-t-4 border-yellow-600">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue Goals</p>
                <p className="metric-value text-2xl font-bold">{metrics.overdue_goals}</p>
              </div>
            </div>
          </div>

          <div className="metric-card metric-purple bg-white px-4 py-3 rounded-lg shadow border-t-4 border-purple-600">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="metric-value text-2xl font-bold">{metrics.completed_goals}</p>
              </div>
            </div>
          </div>

          <div className="metric-card bg-white px-4 py-3 rounded-lg shadow border-t-4 border-gray-600">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <ListBulletIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Not Started</p>
                <p className="metric-value text-2xl font-bold">{goals.filter(g => g.status === 'not_started').length}</p>
              </div>
            </div>
          </div>
        </div>
      )}




      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {goals.map(goal => (
          <div key={goal.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Header - Status & Priority Badges (simple, theme-aligned) */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getTypeIcon(goal.goal_type)}
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getStatusColor(goal.status)}`}>
                      {goal.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(goal.priority)}`}>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{goal.description}</p>
                  )}

                  {/* Target and Time Remaining (compact, theme-aligned) */}
                  {goal.target_value && goal.target_value > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-600">Target</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            goal.is_overdue || goal.days_remaining < 7
                              ? 'bg-red-50 text-red-700'
                              : goal.days_remaining < 14
                              ? 'bg-orange-50 text-orange-700'
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {goal.is_overdue ? 'Overdue' : `${goal.days_remaining} days left`}
                        </span>
                      </div>
                      <div className="text-xl font-semibold">
                        <span className={`${
                          goal.current_value === 0 
                            ? 'text-red-600' 
                            : goal.completion_percentage >= 80 
                            ? 'text-green-600' 
                            : goal.completion_percentage >= 50 
                            ? 'text-yellow-600' 
                            : 'text-orange-600'
                        }`}>
                          {formatValue(goal.current_value, goal.unit)}
                        </span>
                        <span className="text-gray-500 font-normal"> / </span>
                        <span className="text-gray-900">{formatValue(goal.target_value, goal.unit)}</span>
                      </div>
                      {goal.auto_update_progress && (
                        <div className="flex items-center mt-1 text-xs text-blue-600">
                          <CogIcon className="h-3 w-3 mr-1" />
                          Auto-updating
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress (compact) */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-gray-700">Progress</span>
                      <span className="text-sm text-gray-600">{Math.round(goal.completion_percentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${goal.completion_percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Success Probability (compact) */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
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

                  {/* Dates - Smaller text */}
                  <div className="text-xs text-gray-500 mb-4 space-y-1">
                    <div className="flex justify-between">
                      <span>Start: {formatDate(goal.start_date)}</span>
                      <span>End: {formatDate(goal.end_date)}</span>
                    </div>
                  </div>

                  {/* Project Association - Smaller */}
                  {goal.project_name && (
                    <div className="mb-3 p-2 bg-blue-50 border-l-2 border-blue-400 rounded">
                      <div className="flex items-center">
                        <FolderIcon className="h-3 w-3 text-blue-600 mr-1" />
                        <span className="text-xs text-blue-800 font-medium">Project:</span>
                        <span className="text-xs text-blue-700 ml-1">{goal.project_name}</span>
                      </div>
                    </div>
                  )}

                  {/* Team Members - Smaller */}
                  {goal.members && goal.members.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center mb-1">
                        <UsersIcon className="h-3 w-3 text-gray-600 mr-1" />
                        <span className="text-xs font-medium text-gray-700">Team ({goal.members.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {goal.members.slice(0, 3).map(member => (
                          <div key={member.id} className="flex items-center bg-gray-100 rounded-full px-2 py-0.5 text-xs">
                            <div className="h-4 w-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-[10px] font-medium mr-1">
                              {member.first_name?.[0]}{member.last_name?.[0]}
                            </div>
                            <span className="text-gray-700 text-xs">
                              {member.first_name} {member.last_name}
                            </span>
                          </div>
                        ))}
                        {goal.members.length > 3 && (
                          <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">
                            +{goal.members.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Checklist Details - Smaller */}
                  {goal.checklist_items && goal.checklist_items.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <ListBulletIcon className="h-3 w-3 text-gray-600 mr-1" />
                          <span className="text-xs font-medium text-gray-700">Checklist</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {goal.checklist_items.filter(item => item.is_completed).length}/{goal.checklist_items.length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {goal.checklist_items.slice(0, 2).map(item => (
                          <div key={item.id} className="flex items-center text-xs">
                            <div className={`h-2.5 w-2.5 rounded-sm mr-1.5 flex items-center justify-center ${
                              item.is_completed ? 'bg-green-500' : 'bg-gray-300'
                            }`}>
                              {item.is_completed && (
                                <CheckCircleIcon className="h-1.5 w-1.5 text-white" />
                              )}
                            </div>
                            <span className={`flex-1 text-xs ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                              {item.title}
                            </span>
                          </div>
                        ))}
                        {goal.checklist_items.length > 2 && (
                          <div className="text-xs text-gray-500 pl-4">
                            +{goal.checklist_items.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reminder Settings - Smaller */}
                  {goal.reminder_settings?.enabled && (
                    <div className="mb-3 p-1.5 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex items-center">
                        <BellIcon className="h-3 w-3 text-yellow-600 mr-1" />
                        <span className="text-xs text-yellow-800 font-medium">Reminders:</span>
                        <span className="text-xs text-yellow-700 ml-1 capitalize">
                          {goal.reminder_settings.interval === 'custom' 
                            ? `Every ${goal.reminder_settings.custom_interval_days}d`
                            : goal.reminder_settings.interval
                          }
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tags - Smaller */}
                  {goal.tags && goal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {goal.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {goal.tags.length > 3 && (
                        <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                          +{goal.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Quick Stats - Smaller text in footer */}
                  <div className="text-xs text-gray-500 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <UsersIcon className="h-3 w-3" />
                          <span>{goal.members?.length || goal.member_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircleIcon className="h-3 w-3" />
                          <span>{goal.completed_checklist_count}/{goal.checklist_count}</span>
                        </div>
                        {goal.auto_update_progress && (
                          <div className="flex items-center space-x-1">
                            <CogIcon className="h-3 w-3" />
                            <span>Auto</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        Created: {formatDateRelative(goal.created_at)}
                      </span>
                    </div>
                  </div>

{/* Actions */}
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      onClick={() => navigate(`/zphere-admin/goals/${goal.id}`)}
                      className="inline-flex items-center justify-center p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                      title="View Goal"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                        <button
                          onClick={async () => {
                            try {
                              const { default: apiClient } = await import('../../api/client');
                              const res = await apiClient.get(`/goals/${goal.id}`);
                              setEditingGoal(res.data);
                            } catch (e) {
                              console.error('Failed to load full goal for edit', e);
                              // Fallback to existing summary if detail fails
                              setEditingGoal(goal);
                            }
                          }}
                          className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 text-black hover:bg-gray-200 transition-colors"
                          title="Edit Goal"
                        >
                      <PencilIcon className="h-4 w-4" />
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
