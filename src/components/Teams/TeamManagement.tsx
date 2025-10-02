import React, { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  PlusIcon,
  CogIcon,
  ShieldCheckIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface TeamMember {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'ADMIN' | 'MANAGER' | 'MEMBER' | 'CLIENT';
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'SUSPENDED';
  is_active: boolean;
  avatar_url?: string;
  last_login?: string;
  created_at: string;
  permissions: string[];
  team_role?: 'team_lead' | 'member';
}

interface Team {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  members: TeamMember[];
  created_at: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'project' | 'task' | 'team' | 'file' | 'comment' | 'analytics';
}

const AVAILABLE_PERMISSIONS: Permission[] = [
  // Project permissions
  { id: 'create_project', name: 'Create Project', description: 'Can create new projects', category: 'project' },
  { id: 'edit_project', name: 'Edit Project', description: 'Can edit project details', category: 'project' },
  { id: 'delete_project', name: 'Delete Project', description: 'Can delete projects', category: 'project' },
  { id: 'view_project', name: 'View Project', description: 'Can view project details', category: 'project' },
  
  // Task permissions
  { id: 'create_task', name: 'Create Task', description: 'Can create new tasks', category: 'task' },
  { id: 'edit_task', name: 'Edit Task', description: 'Can edit task details', category: 'task' },
  { id: 'delete_task', name: 'Delete Task', description: 'Can delete tasks', category: 'task' },
  { id: 'assign_task', name: 'Assign Task', description: 'Can assign tasks to users', category: 'task' },
  { id: 'view_task', name: 'View Task', description: 'Can view task details', category: 'task' },
  
  // Team permissions
  { id: 'invite_member', name: 'Invite Member', description: 'Can invite new team members', category: 'team' },
  { id: 'remove_member', name: 'Remove Member', description: 'Can remove team members', category: 'team' },
  { id: 'manage_roles', name: 'Manage Roles', description: 'Can manage user roles and permissions', category: 'team' },
  { id: 'view_members', name: 'View Members', description: 'Can view team member list', category: 'team' },
  
  // File permissions
  { id: 'upload_file', name: 'Upload File', description: 'Can upload files and attachments', category: 'file' },
  { id: 'delete_file', name: 'Delete File', description: 'Can delete files and attachments', category: 'file' },
  { id: 'view_file', name: 'View File', description: 'Can view and download files', category: 'file' },
  
  // Comment permissions
  { id: 'create_comment', name: 'Create Comment', description: 'Can create comments and discussions', category: 'comment' },
  { id: 'edit_comment', name: 'Edit Comment', description: 'Can edit own comments', category: 'comment' },
  { id: 'delete_comment', name: 'Delete Comment', description: 'Can delete comments', category: 'comment' },
  
  // Analytics permissions
  { id: 'view_analytics', name: 'View Analytics', description: 'Can view project analytics', category: 'analytics' },
  { id: 'view_reports', name: 'View Reports', description: 'Can view detailed reports', category: 'analytics' },
];

interface TeamManagementProps {
  currentUser?: TeamMember;
  onTeamUpdate?: (team: Team) => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ currentUser, onTeamUpdate }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showPermissionEditor, setShowPermissionEditor] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    is_default: false
  });
  
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'MEMBER' as TeamMember['role'],
    team_role: 'member' as 'team_lead' | 'member',
    permissions: [] as string[]
  });

  const getRoleColor = (role: TeamMember['role']) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'MEMBER':
        return 'bg-green-100 text-green-800';
      case 'CLIENT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRolePermissions = (role: TeamMember['role']): string[] => {
    switch (role) {
      case 'ADMIN':
        return AVAILABLE_PERMISSIONS.map(p => p.id);
      case 'MANAGER':
        return [
          'create_project', 'edit_project', 'view_project',
          'create_task', 'edit_task', 'assign_task', 'view_task',
          'invite_member', 'view_members',
          'upload_file', 'view_file',
          'create_comment', 'edit_comment',
          'view_analytics'
        ];
      case 'MEMBER':
        return [
          'view_project',
          'create_task', 'edit_task', 'view_task',
          'view_members',
          'upload_file', 'view_file',
          'create_comment', 'edit_comment'
        ];
      case 'CLIENT':
        return [
          'view_project',
          'view_task',
          'view_file',
          'create_comment'
        ];
      default:
        return [];
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call to create team
    console.log('Creating team:', newTeam);
    setShowCreateTeam(false);
    setNewTeam({ name: '', description: '', is_default: false });
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call to invite member
    console.log('Inviting member:', inviteForm);
    setShowAddMember(false);
    setInviteForm({
      email: '',
      role: 'MEMBER',
      team_role: 'member',
      permissions: []
    });
  };

  const handleUpdateMemberPermissions = async (memberId: string, permissions: string[]) => {
    // TODO: Implement API call to update member permissions
    console.log('Updating permissions for member:', memberId, permissions);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      // TODO: Implement API call to remove member
      console.log('Removing member:', memberId);
    }
  };

  const filteredMembers = selectedTeam?.members.filter(member =>
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.username.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const permissionsByCategory = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const hasPermission = (permission: string) => {
    return currentUser?.permissions.includes(permission) || currentUser?.role === 'ADMIN';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Organize your team members into groups and manage their roles and permissions.
            </p>
          </div>
          {hasPermission('manage_roles') && (
            <button
              onClick={() => setShowCreateTeam(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Team
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Teams</h3>
              <div className="space-y-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full text-left p-3 rounded-lg border ${
                      selectedTeam?.id === team.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{team.name}</p>
                        <p className="text-sm text-gray-500">{team.members.length} members</p>
                      </div>
                      {team.is_default && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Default
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Team Details */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{selectedTeam.name}</h3>
                    {selectedTeam.description && (
                      <p className="mt-1 text-sm text-gray-500">{selectedTeam.description}</p>
                    )}
                  </div>
                  {hasPermission('invite_member') && (
                    <button
                      onClick={() => setShowAddMember(true)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <UserPlusIcon className="h-4 w-4 mr-2" />
                      Add Member
                    </button>
                  )}
                </div>

                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Members List */}
                <div className="space-y-3">
                  {filteredMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {member.first_name[0]}{member.last_name[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                              {member.role}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                              {member.status}
                            </span>
                            {member.team_role === 'team_lead' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Team Lead
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {hasPermission('manage_roles') && (
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setShowPermissionEditor(true);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Edit Permissions"
                          >
                            <CogIcon className="h-4 w-4" />
                          </button>
                        )}
                        {hasPermission('remove_member') && member.id !== currentUser?.id && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="Remove Member"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Select a team</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a team from the list to view and manage its members.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Team</h3>
              <button
                onClick={() => setShowCreateTeam(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Name</label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={newTeam.is_default}
                  onChange={(e) => setNewTeam({ ...newTeam, is_default: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
                  Make this the default team for new users
                </label>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateTeam(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Invite Team Member</h3>
              <button
                onClick={() => setShowAddMember(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as TeamMember['role'] })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="MEMBER">Member</option>
                  <option value="MANAGER">Manager</option>
                  {currentUser?.role === 'ADMIN' && <option value="ADMIN">Admin</option>}
                  <option value="CLIENT">Client</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Role</label>
                <select
                  value={inviteForm.team_role}
                  onChange={(e) => setInviteForm({ ...inviteForm, team_role: e.target.value as 'team_lead' | 'member' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="member">Team Member</option>
                  <option value="team_lead">Team Lead</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permission Editor Modal */}
      {showPermissionEditor && selectedMember && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Edit Permissions - {selectedMember.full_name}
              </h3>
              <button
                onClick={() => setShowPermissionEditor(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                <div>
                  <p className="text-sm text-yellow-800">
                    Role-based permissions are automatically granted based on the user's role ({selectedMember.role}).
                    You can grant additional permissions here.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-gray-900 mb-3 capitalize">
                    {category} Permissions
                  </h4>
                  <div className="space-y-2">
                    {permissions.map((permission) => {
                      const hasRolePermission = getRolePermissions(selectedMember.role).includes(permission.id);
                      const hasCustomPermission = selectedMember.permissions.includes(permission.id);
                      
                      return (
                        <div key={permission.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{permission.name}</p>
                            <p className="text-xs text-gray-500">{permission.description}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {hasRolePermission && (
                              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                Role
                              </span>
                            )}
                            <input
                              type="checkbox"
                              checked={hasCustomPermission}
                              onChange={(e) => {
                                const newPermissions = e.target.checked
                                  ? [...selectedMember.permissions, permission.id]
                                  : selectedMember.permissions.filter(p => p !== permission.id);
                                setSelectedMember({ ...selectedMember, permissions: newPermissions });
                              }}
                              disabled={hasRolePermission}
                              className="h-4 w-4 text-blue-600 rounded"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPermissionEditor(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleUpdateMemberPermissions(selectedMember.id, selectedMember.permissions);
                  setShowPermissionEditor(false);
                }}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
