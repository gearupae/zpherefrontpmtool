import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux';
import apiClient from '../../api/client';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
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
  MagnifyingGlassIcon
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

  useEffect(() => {
    if (id) {
      fetchGoal();
      fetchGoalMembers();
      fetchAvailableUsers();
    }
  }, [id]);

  const fetchGoal = async () => {
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
  };

  const fetchGoalMembers = async () => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/goals/${id}/members`);
      setTeamMembers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch goal members:', error);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const res = await apiClient.get('/teams/members');
      setAvailableUsers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
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
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate('/goals')} className="p-2 text-gray-400 hover:text-gray-600">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{goal.title}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(goal.status)}`}>
                {goal.status.replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-500">• Ends {formatDate(goal.end_date)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Goal Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
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
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Completion</p>
                      <p className="text-sm text-gray-600">{Math.round(goal.completion_percentage)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <ChartBarIcon className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Success Probability</p>
                      <p className="text-sm text-gray-600">{Math.round(goal.probability_of_achievement)}%</p>
                    </div>
                  </div>
                </div>
              </div>
              {goal.description && (
                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm text-gray-700">{goal.description}</p>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
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
  );
};

export default GoalDetailOverviewPage;
