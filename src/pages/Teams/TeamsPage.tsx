import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchTeamMembers, createTeamMember } from '../../store/slices/teamSlice';
import { TeamMember, UserRole, UserStatus } from '../../types';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { addNotification } from '../../store/slices/notificationSlice';
import { 
  UserPlusIcon, 
  ShieldCheckIcon,
  UserGroupIcon,
  CogIcon,
  TrashIcon,
  EyeIcon,
  PencilIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const TeamsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { teamMembers, isLoading, error } = useAppSelector((state: any) => state.team);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const selectedRole = '';
  const selectedStatus = '';
  
  const [newMember, setNewMember] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    role: UserRole.MEMBER,
    status: UserStatus.PENDING,
    timezone: 'UTC',
    phone: '',
    bio: '',
    address: ''
  });

  const [stats, setStats] = useState({
    total_members: 0,
    active_members: 0,
    admin_count: 0,
    member_count: 0,
    pending_count: 0,
    inactive_count: 0
  });

  useEffect(() => {
    console.log('TeamsPage: useEffect triggered, dispatching fetchTeamMembers');
    dispatch(fetchTeamMembers());
  }, [dispatch]);

  // Add debugging for state changes and update stats
  useEffect(() => {
    console.log('TeamsPage: State updated:', { teamMembers, isLoading, error });
    if (teamMembers && Array.isArray(teamMembers)) {
      setStats({
        total_members: teamMembers.length,
        active_members: teamMembers.filter((m: TeamMember) => m.is_active).length,
        admin_count: teamMembers.filter((m: TeamMember) => m.role === UserRole.ADMIN).length,
        member_count: teamMembers.filter((m: TeamMember) => m.role === UserRole.MEMBER).length,
        pending_count: teamMembers.filter((m: TeamMember) => m.status === UserStatus.PENDING).length,
        inactive_count: teamMembers.filter((m: TeamMember) => !m.is_active).length
      });
    }
  }, [teamMembers, isLoading, error]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMember.email && newMember.username && newMember.first_name && newMember.last_name && newMember.password) {
      try {
        await dispatch(createTeamMember(newMember)).unwrap();
        setNewMember({
          email: '',
          username: '',
          first_name: '',
          last_name: '',
          password: '',
          role: UserRole.MEMBER,
          status: UserStatus.PENDING,
          timezone: 'UTC',
          phone: '',
          bio: '',
          address: ''
        });
        setShowCreateForm(false);
        
        dispatch(addNotification({
          type: 'success',
          title: 'Team Member Added',
          message: 'Team member has been successfully added.',
          duration: 3000,
        }));
      } catch (error) {
        console.error('Failed to create team member:', error);
        
        dispatch(addNotification({
          type: 'error',
          title: 'Creation Failed',
          message: 'Failed to create team member. Please try again.',
          duration: 5000,
        }));
      }
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      // TODO: Add update API call when available
      setEditingMember(null);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Team Member Updated',
        message: 'Team member has been successfully updated.',
        duration: 3000,
      }));
    } catch (error) {
      console.error('Failed to update team member:', error);
      
      dispatch(addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update team member. Please try again.',
        duration: 5000,
      }));
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) return;

    try {
      // TODO: Add delete API call when available
      
      dispatch(addNotification({
        type: 'success',
        title: 'Team Member Deleted',
        message: 'Team member has been successfully deleted.',
        duration: 3000,
      }));
    } catch (error) {
      console.error('Failed to delete team member:', error);
      
      dispatch(addNotification({
        type: 'error',
        title: 'Deletion Failed',
        message: 'Failed to delete team member. Please try again.',
        duration: 5000,
      }));
    }
  };

  const filteredMembers = teamMembers ? teamMembers.filter((member: TeamMember) => {
    const matchesSearch = true;
    
    const matchesRole = !selectedRole || member.role === selectedRole;
    const matchesStatus = !selectedStatus || 
      (selectedStatus === 'ACTIVE' && member.is_active) ||
      (selectedStatus === 'INACTIVE' && !member.is_active) ||
      (selectedStatus === member.status);
    
    return matchesSearch && matchesRole && matchesStatus;
  }) : [];

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-error-100 text-error-800';
      case UserRole.MEMBER:
        return 'bg-primary-100 text-primary-800';
      default:
        return 'bg-primary-100 text-primary-800';
    }
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return 'bg-success-100 text-success-800';
      case UserStatus.PENDING:
        return 'bg-warning-100 text-warning-800';
      case UserStatus.INACTIVE:
        return 'bg-secondary-100 text-secondary-800';
      case UserStatus.SUSPENDED:
        return 'bg-error-100 text-error-800';
      default:
        return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <ShieldCheckIcon className="w-4 h-4" />;
      case UserRole.MEMBER:
        return <UserGroupIcon className="w-4 h-4" />;
      default:
        return <UserGroupIcon className="w-4 h-4" />;
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-600">Manage your team members and their roles</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-page-action flex items-center"
            >
          <UserPlusIcon className="h-5 w-5" />
          <span>Add Team Member</span>
            </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-error-50 border border-error-200 rounded-md p-4">
          <div className="text-error-800">{error}</div>
        </div>
      )}

      {/* Create Member Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Add New Team Member</h2>
          <form onSubmit={handleCreateMember} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input
                  type="text"
                  required
                  value={newMember.first_name}
                  onChange={(e) => setNewMember({ ...newMember, first_name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input
                  type="text"
                  required
                  value={newMember.last_name}
                  onChange={(e) => setNewMember({ ...newMember, last_name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  required
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Username *</label>
                <input
                  type="text"
                  required
                  value={newMember.username}
                  onChange={(e) => setNewMember({ ...newMember, username: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Password *</label>
                <input
                  type="password"
                  required
                  value={newMember.password}
                  onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value as UserRole })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={UserRole.MEMBER}>Team Member</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={newMember.status}
                  onChange={(e) => setNewMember({ ...newMember, status: e.target.value as UserStatus })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={UserStatus.ACTIVE}>Active</option>
                  <option value={UserStatus.INACTIVE}>Inactive</option>
                  <option value={UserStatus.PENDING}>Pending</option>
                  <option value={UserStatus.SUSPENDED}>Suspended</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={newMember.phone || ''}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  value={newMember.address || ''}
                  onChange={(e) => setNewMember({ ...newMember, address: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Street, City, State"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Timezone</label>
                <input
                  type="text"
                  value={newMember.timezone}
                  onChange={(e) => setNewMember({ ...newMember, timezone: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="UTC"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Bio</label>
              <textarea
                rows={3}
                value={newMember.bio || ''}
                onChange={(e) => setNewMember({ ...newMember, bio: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Brief bio about the team member..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-page-action"
              >
                Add Team Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Member Form */}
      {editingMember && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Edit Team Member</h2>
          <form onSubmit={handleUpdateMember} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input
                  type="text"
                  required
                  value={editingMember.first_name}
                  onChange={(e) => setEditingMember({...editingMember, first_name: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input
                  type="text"
                  required
                  value={editingMember.last_name}
                  onChange={(e) => setEditingMember({...editingMember, last_name: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  required
                  value={editingMember.email}
                  onChange={(e) => setEditingMember({...editingMember, email: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
            </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Username *</label>
                <input
                  type="text"
                  required
                  value={editingMember.username}
                  onChange={(e) => setEditingMember({...editingMember, username: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({...editingMember, role: e.target.value as UserRole})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={UserRole.MEMBER}>Team Member</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={editingMember.phone || ''}
                  onChange={(e) => setEditingMember({...editingMember, phone: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  value={editingMember.address || ''}
                  onChange={(e) => setEditingMember({...editingMember, address: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Timezone</label>
                <input
                  type="text"
                  value={editingMember.timezone || 'UTC'}
                  onChange={(e) => setEditingMember({...editingMember, timezone: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Bio</label>
              <textarea
                rows={3}
                value={editingMember.bio || ''}
                onChange={(e) => setEditingMember({...editingMember, bio: e.target.value})}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-[#0d0d0d] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-gray-300 text-[#0d0d0d] bg-white rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
              >
                Update Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_members}</p>
                </div>
                </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserPlusIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Members</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active_members}</p>
              </div>
            </div>
          </div>

        <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-red-600" />
                </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-gray-900">{stats.admin_count}</p>
            </div>
            </div>
          </div>

        <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CogIcon className="h-6 w-6 text-yellow-600" />
                </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending_count}</p>
                </div>
              </div>
            </div>
          </div>


      {/* Team Members List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Team Members ({filteredMembers.length})
          </h3>
        </div>
        
        {filteredMembers.length === 0 ? (
        <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No team members found</h3>
            <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first team member.
          </p>
        </div>
      ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.map((member: TeamMember) => (
                  <tr key={member.id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-user-blue">
                          {member.first_name[0]}{member.last_name[0]}
                        </span>
                      </div>
                        <div className="ml-4">
                          <div 
                            className="text-sm font-medium text-gray-900 cursor-pointer hover:text-user-blue"
                            onClick={() => navigate(`/teams/${member.id}`)}
                          >
                            {member.full_name || `${member.first_name} ${member.last_name}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{member.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                          <span>{member.email}</span>
                        </div>
                    </div>
                      {member.phone && (
                        <div className="text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                            <PhoneIcon className="h-4 w-4 text-gray-400" />
                            <span>{member.phone}</span>
                          </div>
                        </div>
                      )}
                      {member.address && (
                        <div className="text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <MapPinIcon className="h-4 w-4 text-gray-400" />
                            <span>{member.address}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                          <span className="mr-1">{getRoleIcon(member.role)}</span>
                          {member.role}
                        </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                        {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.last_login ? new Date(member.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/teams/${member.id}`)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full p-2 transition-colors"
                          title="View Details"
                    >
                          <EyeIcon className="h-4 w-4" />
                    </button>
                        <button
                          onClick={() => setEditingMember(member)}
                          className="bg-green-100 hover:bg-green-200 text-green-600 rounded-full p-2 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                    </button>
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-2 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                    </td>
                  </tr>
            ))}
              </tbody>
            </table>
        </div>
      )}
      </div>
    </div>
  );
};

export default TeamsPage;