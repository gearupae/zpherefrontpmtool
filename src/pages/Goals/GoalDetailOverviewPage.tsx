import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux';
import apiClient from '../../api/client';
import { addNotification } from '../../store/slices/notificationSlice';
import {
  ArrowLeftIcon,
  UsersIcon as UserGroupIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChartBarIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FlagIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarIcon as DueCalendarIcon
} from '@heroicons/react/24/outline';
import { User } from '../../types';

interface GoalMemberInfo {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  role: 'owner' | 'member' | 'viewer';
}

interface GoalDetail {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  goal_type: 'personal' | 'team' | 'sales' | 'project' | 'custom';
  status: 'not_started' | 'in_progress' | 'completed' | 'paused' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_value?: number;
  current_value: number;
  unit?: string;
  completion_percentage: number;
  probability_of_achievement: number;
  days_remaining: number;
  is_overdue: boolean;
  tags: string[];
  members: GoalMemberInfo[];
  created_at: string;
  updated_at: string;
}

const GoalDetailOverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'team'>('overview');

  // Team state
  const [teamMembers, setTeamMembers] = useState<GoalMemberInfo[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [teamFilter, setTeamFilter] = useState('');
  const teamDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target as Node)) {
        setIsTeamDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);


  const fetchGoal = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/goals/${id}`);
      setGoal(res.data);
    } catch (error) {
      console.error('Failed to fetch goal:', error);
      dispatch(addNotification({ type: 'error', title: 'Error', message: 'Failed to load goal', duration: 5000 }));
    } finally {
      setIsLoading(false);
    }
  }, [id, dispatch]);

  const fetchGoalMembers = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/goals/${id}/members`);
      setTeamMembers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch goal members:', error);
    }
  }, [id]);

  const fetchAvailableUsers = useCallback(async () => {
    try {
      const res = await apiClient.get('/teams/members');
      setAvailableUsers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchGoal();
      fetchGoalMembers();
      fetchAvailableUsers();
    }
  }, [id, fetchGoal, fetchGoalMembers, fetchAvailableUsers]);

  const handleAddMember = async (userId: string, role: 'owner' | 'member' | 'viewer' = 'member') => {
    if (!id) return;
    try {
      await apiClient.post(`/goals/${id}/members`, {
        members: [{ user_id: userId, role }]
      });
      await fetchGoalMembers();
      dispatch(addNotification({ type: 'success', title: 'Member added', message: 'Team member added to goal', duration: 3000 }));
    } catch (error: any) {
      console.error('Failed to add member:', error);
      const msg = error?.response?.data?.detail || 'Failed to add member';
      dispatch(addNotification({ type: 'error', title: 'Error', message: msg, duration: 5000 }));
    }
  };

  const handleUpdateMemberRole = async (userId: string, role: 'owner' | 'member' | 'viewer') => {
    if (!id) return;
    try {
      await apiClient.patch(`/goals/${id}/members/${userId}`, { role });
      setTeamMembers(prev => prev.map(m => m.id === userId ? { ...m, role } : m));
      dispatch(addNotification({ type: 'success', title: 'Role updated', message: 'Member role updated', duration: 3000 }));
    } catch (error: any) {
      console.error('Failed to update role:', error);
      const msg = error?.response?.data?.detail || 'Failed to update role';
      dispatch(addNotification({ type: 'error', title: 'Error', message: msg, duration: 5000 }));
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id) return;
    try {
      await apiClient.delete(`/goals/${id}/members/${userId}`);
      setTeamMembers(prev => prev.filter(m => m.id !== userId));
      dispatch(addNotification({ type: 'success', title: 'Member removed', message: 'Member removed from goal', duration: 3000 }));
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      const msg = error?.response?.data?.detail || 'Failed to remove member';
      dispatch(addNotification({ type: 'error', title: 'Error', message: msg, duration: 5000 }));
    }
  };

  const getStatusBadge = (status: GoalDetail['status']) => {
    const map: Record<GoalDetail['status'], string> = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      overdue: 'bg-red-100 text-red-800',
      paused: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-gray-100 text-gray-800',
      not_started: 'bg-gray-100 text-gray-800'
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const getPriorityColor = (priority: GoalDetail['priority']) => {
    const map: Record<GoalDetail['priority'], string> = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-blue-100 text-blue-800',
      low: 'bg-green-100 text-green-800'
    };
    return map[priority] || 'bg-gray-100 text-gray-800';
  };

  const handleEditGoal = () => {
    navigate(`/zphere-admin/goals?edit=${id}`);
  };

  const handleDeleteGoal = async () => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await apiClient.delete(`/goals/${id}`);
      dispatch(addNotification({ type: 'success', title: 'Success', message: 'Goal deleted successfully', duration: 3000 }));
      navigate('/zphere-admin/goals');
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to delete goal';
      dispatch(addNotification({ type: 'error', title: 'Error', message: msg, duration: 5000 }));
    }
  };

  if (isLoading) {
    return <div />;
  }

  if (!goal) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Goal Not Found</h2>
        <button onClick={() => navigate('/goals')} className="px-4 py-2 bg-blue-500 text-white rounded-md">Back to Goals</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/zphere-admin/goals')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{goal.title}</h1>
            <p className="text-gray-600">
              {goal.status.replace('_', ' ')} • {goal.priority} priority • Created {formatDate(goal.created_at)}
            </p>
            {goal.tags && goal.tags.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                Tags: {goal.tags.join(', ')}
              </p>
            )}
            {/* Goal Status Indicator */}
            <div className="flex items-center space-x-2 mt-2">
              <div className={`h-2 w-2 rounded-full ${
                goal.is_overdue ? 'bg-red-500' :
                goal.completion_percentage >= 75 ? 'bg-green-500' :
                goal.completion_percentage >= 50 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}></div>
              <span className={`text-sm ${
                goal.is_overdue ? 'text-red-600' :
                goal.completion_percentage >= 75 ? 'text-green-600' :
                goal.completion_percentage >= 50 ? 'text-yellow-600' : 'text-blue-600'
              }`}>
                {goal.is_overdue ? 'Overdue' : goal.status === 'completed' ? 'Completed' : `${Math.round(goal.completion_percentage)}% Complete`}
              </span>
              <span className="text-xs text-gray-500">
                • {goal.days_remaining} days {goal.is_overdue ? 'overdue' : 'remaining'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleEditGoal}
            className="flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <PencilIcon className="h-4 w-4" />
            Edit
          </button>
          
          <button
            onClick={handleDeleteGoal}
            className="flex items-center space-x-2 px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'team', name: 'Team', icon: UserGroupIcon, count: teamMembers.length },
          ].map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-3 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
                activeTab === tab.id ? 'text-indigo-600' : 'text-black hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
                {tab.count !== undefined && (
                  <span className="bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">{tab.count}</span>
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tab Content */}
          {activeTab === 'overview' && goal && (
            <div className="space-y-6">
              {/* Goal Information */}
              <div className="bg-white shadow rounded-lg detail-card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Goal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <FlagIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Goal Title</p>
                        <p className="text-sm text-gray-600">{goal.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FlagIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Status</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(goal.status)}`}>
                          {goal.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Priority</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                          {goal.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Start Date</p>
                        <p className="text-sm text-gray-600">{formatDate(goal.start_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">End Date</p>
                        <p className="text-sm text-gray-600">{formatDate(goal.end_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Time Remaining</p>
                        <p className={`text-sm ${goal.is_overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {goal.days_remaining} days {goal.is_overdue ? 'overdue' : 'left'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {goal.description && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-sm text-gray-600">{goal.description}</p>
                  </div>
                )}
                {goal.target_value && goal.target_value > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{goal.current_value}{goal.unit}</div>
                        <div className="text-sm text-gray-500">Current Value</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{goal.target_value}{goal.unit}</div>
                        <div className="text-sm text-gray-500">Target Value</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{Math.round((goal.current_value / goal.target_value) * 100)}%</div>
                        <div className="text-sm text-gray-500">Progress to Target</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CheckCircleIcon className="h-6 w-6 text-green-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Completion</dt>
                          <dd className="text-lg font-medium text-gray-900">{Math.round(goal.completion_percentage)}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ChartBarIcon className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                          <dd className="text-lg font-medium text-gray-900">{Math.round(goal.probability_of_achievement)}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ClockIcon className="h-6 w-6 text-orange-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Days Left</dt>
                          <dd className={`text-lg font-medium ${goal.is_overdue ? 'text-red-600' : 'text-gray-900'}`}>{Math.abs(goal.days_remaining)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserGroupIcon className="h-6 w-6 text-purple-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Team Members</dt>
                          <dd className="text-lg font-medium text-gray-900">{teamMembers.length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="bg-white shadow rounded-lg detail-card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Checklist</h3>

                {/* Inline add row */}
                <AddChecklistInline goalId={id!} onAdded={async () => { await fetchGoal(); }} />

                {(goal as any).checklists && (goal as any).checklists.length > 0 ? (
                  <ul className="divide-y divide-gray-200 mt-2">
                    {(goal as any).checklists.map((item: any) => (
                      <li key={item.id} className="py-2 flex items-start">
                        <button
                          className={`mt-0.5 h-4 w-4 rounded-full mr-2 border ${item.is_completed ? 'bg-green-500 border-green-600' : 'bg-white border-gray-300'}`}
                          title={item.is_completed ? 'Mark as incomplete' : 'Mark as done'}
                          onClick={async () => {
                            try {
                              await apiClient.put(`/goals/checklist/${item.id}`, { is_completed: !item.is_completed });
                              await fetchGoal();
                            } catch (e) {
                              dispatch(addNotification({ type: 'error', title: 'Error', message: 'Failed to update checklist', duration: 4000 }));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className={`text-sm ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>{item.title}</div>
                          <div className="flex items-center gap-3">
                            {item.due_date && <div className="text-xs text-gray-400">Due: {new Date(item.due_date).toLocaleDateString()}</div>}
                            <span className="text-xs text-gray-500 capitalize">Priority: {item.priority || 'medium'}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500 mt-2">No checklist items.</div>
                )}
              </div>

              {/* Progress Overview */}
              <div className="bg-white shadow rounded-lg detail-card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Progress Overview</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                    <span className="text-sm font-medium text-gray-900">{Math.round(goal.completion_percentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${goal.completion_percentage}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{Math.round(goal.completion_percentage)}%</div>
                      <div className="text-sm text-gray-500">Completed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{Math.round(goal.probability_of_achievement)}%</div>
                      <div className="text-sm text-gray-500">Success Probability</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Goal Timeline */}
              <div className="bg-white shadow rounded-lg detail-card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Goal Timeline</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Goal Created</p>
                      <p className="text-xs text-gray-500">{formatDate(goal.created_at)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Goal Started</p>
                      <p className="text-xs text-gray-500">{formatDate(goal.start_date)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`h-3 w-3 rounded-full ${goal.is_overdue ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Goal {goal.is_overdue ? 'Was Due' : 'Due Date'}</p>
                      <p className="text-xs text-gray-500">{formatDate(goal.end_date)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-3 w-3 bg-gray-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Last Updated</p>
                      <p className="text-xs text-gray-500">{formatDate(goal.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
            <button onClick={() => setIsTeamDropdownOpen(true)} className="inline-flex items-center px-4 py-2 text-sm rounded-md text-white bg-blue-500 hover:bg-blue-600">
              <PlusIcon className="h-4 w-4 mr-2" /> Add Member
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Members ({teamMembers.length})</h3>
            </div>
            {teamMembers.length === 0 ? (
              <div className="text-center py-12">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding team members.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teamMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-700">{m.first_name?.[0]}{m.last_name?.[0]}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{m.first_name} {m.last_name}</div>
                              <div className="text-sm text-gray-500">{m.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{m.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={m.role}
                            onChange={(e) => handleUpdateMemberRole(m.id, e.target.value as any)}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1"
                          >
                            <option value="owner">Owner</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            className="bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-2 transition-colors"
                            title="Remove from Goal"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add Member Dropdown */}
          {isTeamDropdownOpen && (
            <div className="relative" ref={teamDropdownRef}>
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-auto">
                <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={teamFilter}
                      onChange={(e) => setTeamFilter(e.target.value)}
                      placeholder="Search users..."
                      className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <ul className="py-1">
                  {availableUsers
                    .filter(u => !teamMembers.find(tm => tm.id === u.id))
                    .filter((u) => {
                      const name = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase();
                      return name.includes(teamFilter.toLowerCase()) || (u.email || '').toLowerCase().includes(teamFilter.toLowerCase());
                    })
                    .map((user) => (
                      <li key={user.id} className="px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50">
                        <div className="flex flex-col">
                          <span className="text-gray-900">{user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}</span>
                          <span className="text-xs text-gray-500">{user.email}</span>
                        </div>
                        <div className="flex space-x-2">
                          <button onClick={() => { handleAddMember(user.id, 'member'); setIsTeamDropdownOpen(false); }} className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200">Add as Member</button>
                          <button onClick={() => { handleAddMember(user.id, 'owner'); setIsTeamDropdownOpen(false); }} className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200">Add as Owner</button>
                          <button onClick={() => { handleAddMember(user.id, 'viewer'); setIsTeamDropdownOpen(false); }} className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Add as Viewer</button>
                        </div>
                      </li>
                    ))}
                  {availableUsers.filter(u => !teamMembers.find(tm => tm.id === u.id)).length === 0 && (
                    <li className="px-3 py-2 text-sm text-gray-500">No users available to add</li>
                  )}
                </ul>
              </div>
            </div>
          )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg detail-card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Team Summary</h3>
            <div className="space-y-3">
              {teamMembers.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-700">{m.first_name?.[0]}{m.last_name?.[0]}</span>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{m.first_name} {m.last_name}</div>
                      <div className="text-xs text-gray-500">{m.email}</div>
                    </div>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full capitalize">{m.role}</span>
                </div>
              ))}
              {teamMembers.length === 0 && (
                <p className="text-sm text-gray-500">No members yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalDetailOverviewPage;

// Inline add checklist component
const AddChecklistInline: React.FC<{ goalId: string; onAdded: () => void }> = ({ goalId, onAdded }) => {
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [showPriority, setShowPriority] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPriority(false);
        setShowDate(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      await apiClient.post(`/goals/${goalId}/checklist`, {
        title: trimmed,
        description: '',
        priority,
        due_date: due ? `${due}T00:00:00Z` : undefined,
      });
      setTitle('');
      setDue('');
      setPriority('medium');
      await onAdded();
    } catch (e: any) {
      dispatch(addNotification({ type: 'error', title: 'Error', message: e?.response?.data?.detail || 'Failed to add checklist', duration: 4000 }));
    }
  };

  return (
    <div ref={containerRef} className="flex items-center gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        placeholder="Add checklist item..."
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {/* Due date */}
      <div className="relative">
        <button
          type="button"
          className="px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
          onClick={() => setShowDate((v) => !v)}
          title="Set due date"
        >
          <DueCalendarIcon className="h-4 w-4" />
        </button>
        {showDate && (
          <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-md shadow p-2">
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1" />
          </div>
        )}
      </div>
      {/* Priority */}
      <div className="relative">
        <button
          type="button"
          className="px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 capitalize"
          onClick={() => setShowPriority((v) => !v)}
          title="Set priority"
        >
          {priority}
        </button>
        {showPriority && (
          <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-md shadow">
            {(['low','medium','high','critical'] as const).map(p => (
              <div
                key={p}
                className={`px-3 py-1 text-sm cursor-pointer hover:bg-gray-50 ${p===priority ? 'bg-gray-50' : ''}`}
                onClick={() => { setPriority(p); setShowPriority(false); }}
              >
                {p}
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        className="px-3 py-2 bg-black text-white rounded-md text-sm"
        onClick={submit}
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
};
