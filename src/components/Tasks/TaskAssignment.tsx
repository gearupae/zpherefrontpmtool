import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  UserPlusIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
  BellIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'ADMIN' | 'MANAGER' | 'MEMBER' | 'CLIENT';
  avatar_url?: string;
  is_active: boolean;
  timezone?: string;
}

interface TaskAssignee {
  id: string;
  user_id: string;
  user: User;
  is_primary: boolean;
  assigned_at: string;
  assigned_by_id: string;
  assigned_by?: User;
}

interface TaskWatcher {
  id: string;
  user_id: string;
  user: User;
  notify_on_comment: boolean;
  notify_on_status_change: boolean;
  notify_on_assignment: boolean;
  notify_on_due_date: boolean;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignees: TaskAssignee[];
  watchers: TaskWatcher[];
  due_date?: string;
  estimated_hours?: number;
  created_by: User;
}

interface TaskAssignmentProps {
  task: Task;
  projectMembers: User[];
  currentUser: User;
  onUpdateAssignees: (assignees: TaskAssignee[]) => void;
  onUpdateWatchers: (watchers: TaskWatcher[]) => void;
}

const TaskAssignment: React.FC<TaskAssignmentProps> = ({
  task,
  projectMembers,
  currentUser,
  onUpdateAssignees,
  onUpdateWatchers
}) => {
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [showWatcherModal, setShowWatcherModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [primaryAssignee, setPrimaryAssignee] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentMode, setAssignmentMode] = useState<'single' | 'multiple'>('single');
  
  // Watcher notification settings
  const [watcherSettings, setWatcherSettings] = useState({
    notify_on_comment: true,
    notify_on_status_change: true,
    notify_on_assignment: true,
    notify_on_due_date: true
  });

  const availableUsers = projectMembers.filter(user =>
    !task.assignees.some(assignee => assignee.user_id === user.id) &&
    (user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const availableWatchers = projectMembers.filter(user =>
    !task.watchers.some(watcher => watcher.user_id === user.id) &&
    !task.assignees.some(assignee => assignee.user_id === user.id) &&
    (user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddAssignees = () => {
    if (selectedUsers.length === 0) return;

    const newAssignees: TaskAssignee[] = selectedUsers.map((userId, index) => ({
      id: `temp-${Date.now()}-${index}`,
      user_id: userId,
      user: projectMembers.find(u => u.id === userId)!,
      is_primary: userId === primaryAssignee || (assignmentMode === 'single' && index === 0),
      assigned_at: new Date().toISOString(),
      assigned_by_id: currentUser.id,
      assigned_by: currentUser
    }));

    // If setting a new primary assignee, update existing assignees
    const updatedExistingAssignees = task.assignees.map(assignee => ({
      ...assignee,
      is_primary: assignee.user_id === primaryAssignee
    }));

    onUpdateAssignees([...updatedExistingAssignees, ...newAssignees]);
    setSelectedUsers([]);
    setPrimaryAssignee('');
    setShowAssigneeModal(false);
  };

  const handleAddWatchers = () => {
    if (selectedUsers.length === 0) return;

    const newWatchers: TaskWatcher[] = selectedUsers.map((userId, index) => ({
      id: `temp-${Date.now()}-${index}`,
      user_id: userId,
      user: projectMembers.find(u => u.id === userId)!,
      ...watcherSettings
    }));

    onUpdateWatchers([...task.watchers, ...newWatchers]);
    setSelectedUsers([]);
    setShowWatcherModal(false);
  };

  const handleRemoveAssignee = (assigneeId: string) => {
    const updatedAssignees = task.assignees.filter(a => a.id !== assigneeId);
    
    // If removing primary assignee and others remain, make the first one primary
    if (updatedAssignees.length > 0 && !updatedAssignees.some(a => a.is_primary)) {
      updatedAssignees[0].is_primary = true;
    }
    
    onUpdateAssignees(updatedAssignees);
  };

  const handleRemoveWatcher = (watcherId: string) => {
    const updatedWatchers = task.watchers.filter(w => w.id !== watcherId);
    onUpdateWatchers(updatedWatchers);
  };

  const handleSetPrimaryAssignee = (assigneeId: string) => {
    const updatedAssignees = task.assignees.map(assignee => ({
      ...assignee,
      is_primary: assignee.id === assigneeId
    }));
    onUpdateAssignees(updatedAssignees);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'in_review':
        return 'text-purple-600 bg-purple-100';
      case 'blocked':
        return 'text-red-600 bg-red-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const primaryAssigneeData = task.assignees.find(a => a.is_primary);
  const secondaryAssignees = task.assignees.filter(a => !a.is_primary);

  return (
    <div className="space-y-6">
      {/* Task Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
            {task.description && (
              <p className="mt-1 text-sm text-gray-600">{task.description}</p>
            )}
            <div className="flex items-center space-x-4 mt-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                {task.status.replace('_', ' ')}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
              {task.due_date && (
                <span className="inline-flex items-center text-xs text-gray-500">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  Due: {new Date(task.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assignees Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900">Task Assignees</h4>
          <button
            onClick={() => setShowAssigneeModal(true)}
            className="inline-flex items-center border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
          >
            <UserPlusIcon className="w-4 h-4 mr-1" />
            Assign
          </button>
        </div>

        {task.assignees.length === 0 ? (
          <div className="text-center py-4">
            <UserIcon className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No assignees yet</p>
            <p className="text-xs text-gray-400">Click "Assign" to add team members</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Primary Assignee */}
            {primaryAssigneeData && (
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {primaryAssigneeData.user.avatar_url ? (
                        <img
                          src={primaryAssigneeData.user.avatar_url}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {primaryAssigneeData.user.first_name[0]}{primaryAssigneeData.user.last_name[0]}
                          </span>
                        </div>
                      )}
                      <StarIconSolid className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {primaryAssigneeData.user.full_name} 
                        <span className="ml-2 text-xs font-medium text-blue-600">Primary</span>
                      </p>
                      <p className="text-xs text-gray-500">{primaryAssigneeData.user.email}</p>
                      <p className="text-xs text-gray-400">
                        Assigned {new Date(primaryAssigneeData.assigned_at).toLocaleDateString()}
                        {primaryAssigneeData.assigned_by && ` by ${primaryAssigneeData.assigned_by.full_name}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveAssignee(primaryAssigneeData.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Secondary Assignees */}
            {secondaryAssignees.map((assignee) => (
              <div key={assignee.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {assignee.user.avatar_url ? (
                      <img
                        src={assignee.user.avatar_url}
                        alt=""
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-700">
                          {assignee.user.first_name[0]}{assignee.user.last_name[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{assignee.user.full_name}</p>
                      <p className="text-xs text-gray-500">{assignee.user.email}</p>
                      <p className="text-xs text-gray-400">
                        Assigned {new Date(assignee.assigned_at).toLocaleDateString()}
                        {assignee.assigned_by && ` by ${assignee.assigned_by.full_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSetPrimaryAssignee(assignee.id)}
                      className="text-gray-400 hover:text-yellow-600"
                      title="Set as primary assignee"
                    >
                      <StarIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveAssignee(assignee.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Accountability Note */}
        {task.assignees.length > 1 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
              <div>
                <p className="text-sm text-yellow-800">
                  <strong>Accountability:</strong> {primaryAssigneeData?.user.full_name || 'Primary assignee'} is 
                  the main person responsible for this task's completion. Other assignees are collaborators.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Watchers Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900">Task Watchers</h4>
          <button
            onClick={() => setShowWatcherModal(true)}
            className="inline-flex items-center py-1.5 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
          >
            <EyeIcon className="w-4 h-4 mr-1" />
            Add Watcher
          </button>
        </div>

        {task.watchers.length === 0 ? (
          <div className="text-center py-4">
            <EyeIcon className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No watchers</p>
            <p className="text-xs text-gray-400">Add team members to receive notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {task.watchers.map((watcher) => (
              <div key={watcher.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                <div className="flex items-center space-x-3">
                  {watcher.user.avatar_url ? (
                    <img src={watcher.user.avatar_url} alt="" className="h-6 w-6 rounded-full" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-700">
                        {watcher.user.first_name[0]}{watcher.user.last_name[0]}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{watcher.user.full_name}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      {watcher.notify_on_comment && <span>Comments</span>}
                      {watcher.notify_on_status_change && <span>Status</span>}
                      {watcher.notify_on_assignment && <span>Assignments</span>}
                      {watcher.notify_on_due_date && <span>Due dates</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveWatcher(watcher.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssigneeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Assign Task</h3>
              <button
                onClick={() => setShowAssigneeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Assignment Mode */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Type</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="single"
                    checked={assignmentMode === 'single'}
                    onChange={(e) => setAssignmentMode(e.target.value as 'single' | 'multiple')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Single Owner</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="multiple"
                    checked={assignmentMode === 'multiple'}
                    onChange={(e) => setAssignmentMode(e.target.value as 'single' | 'multiple')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Multiple Assignees</span>
                </label>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* User List */}
            <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
              {availableUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-2 border rounded cursor-pointer ${
                    selectedUsers.includes(user.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => {
                    if (assignmentMode === 'single') {
                      setSelectedUsers([user.id]);
                      setPrimaryAssignee(user.id);
                    } else {
                      toggleUserSelection(user.id);
                    }
                  }}
                >
                  <div className="flex items-center space-x-3">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-6 w-6 rounded-full" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-700">
                          {user.first_name[0]}{user.last_name[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                  </div>
                  {selectedUsers.includes(user.id) && (
                    <CheckIcon className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              ))}
            </div>

            {/* Primary Assignee Selection for Multiple Mode */}
            {assignmentMode === 'multiple' && selectedUsers.length > 1 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Assignee</label>
                <select
                  value={primaryAssignee}
                  onChange={(e) => setPrimaryAssignee(e.target.value)}
                  className="w-full border border-gray-300 rounded-md py-2"
                >
                  <option value="">Select primary assignee...</option>
                  {selectedUsers.map((userId) => {
                    const user = projectMembers.find(u => u.id === userId);
                    return (
                      <option key={userId} value={userId}>
                        {user?.full_name}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAssigneeModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAssignees}
                disabled={selectedUsers.length === 0}
                className="border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
              >
                Assign ({selectedUsers.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Watcher Modal */}
      {showWatcherModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Watchers</h3>
              <button
                onClick={() => setShowWatcherModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Notification Settings */}
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-2">Notification Settings</p>
              <div className="space-y-2">
                {Object.entries({
                  notify_on_comment: 'Comments',
                  notify_on_status_change: 'Status changes',
                  notify_on_assignment: 'Assignment changes',
                  notify_on_due_date: 'Due date reminders'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={watcherSettings[key as keyof typeof watcherSettings]}
                      onChange={(e) => setWatcherSettings({
                        ...watcherSettings,
                        [key]: e.target.checked
                      })}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* User List */}
            <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
              {availableWatchers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-2 border rounded cursor-pointer ${
                    selectedUsers.includes(user.id) ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}
                  onClick={() => toggleUserSelection(user.id)}
                >
                  <div className="flex items-center space-x-3">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-6 w-6 rounded-full" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-700">
                          {user.first_name[0]}{user.last_name[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                  </div>
                  {selectedUsers.includes(user.id) && (
                    <CheckIcon className="h-5 w-5 text-green-600" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowWatcherModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWatchers}
                disabled={selectedUsers.length === 0}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
              >
                Add Watchers ({selectedUsers.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskAssignment;
