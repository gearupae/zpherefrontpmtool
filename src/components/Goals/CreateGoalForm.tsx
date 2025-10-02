import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  CalendarIcon,
  UsersIcon,
  BellIcon,
  FlagIcon as TargetIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/notificationSlice';

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface ChecklistItem {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date?: string;
}

interface CreateGoalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goalData: any) => Promise<any> | any;
  mode?: 'modal' | 'inline';
  initialGoal?: any;
  isEdit?: boolean;
  submitLabel?: string;
}

const CreateGoalForm: React.FC<CreateGoalFormProps> = ({ isOpen, onClose, onSubmit, mode = 'modal', initialGoal, isEdit = false, submitLabel }) => {
  const dispatch = useDispatch();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal_type: 'personal' as 'personal' | 'team' | 'sales' | 'project' | 'custom',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    target_value: '',
    unit: '',
    project_id: '',
    auto_update_progress: false,
    tags: [] as string[],
    member_ids: [] as string[],
  });

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [reminderSettings, setReminderSettings] = useState({
    enabled: false,
    interval: 'weekly' as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom',
    custom_interval_days: 7,
    message: '',
    send_email: true,
    send_in_app: true,
    send_to_members: true,
  });

  const [currentTag, setCurrentTag] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Team member dropdown state (styled multi-select like Projects)
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [memberFilter, setMemberFilter] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchProjects();
    }
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (isOpen && initialGoal) {
      setFormData({
        title: initialGoal.title || '',
        description: initialGoal.description || '',
        goal_type: (initialGoal.goal_type || 'personal'),
        priority: (initialGoal.priority || 'medium'),
        start_date: (initialGoal.start_date ? new Date(initialGoal.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        end_date: (initialGoal.end_date ? new Date(initialGoal.end_date).toISOString().split('T')[0] : ''),
        target_value: typeof initialGoal.target_value === 'number' ? String(initialGoal.target_value) : (initialGoal.target_value || ''),
        unit: initialGoal.unit || '',
        project_id: initialGoal.project_id || '',
        auto_update_progress: Boolean(initialGoal.auto_update_progress),
        tags: Array.isArray(initialGoal.tags) ? initialGoal.tags : [],
        // Extract member IDs from members array if available, otherwise use member_ids
        member_ids: initialGoal.members ? initialGoal.members.map((m: any) => m.id) : 
                   (Array.isArray(initialGoal.member_ids) ? initialGoal.member_ids : []),
      });
      
      // Populate checklist items if available
      if (initialGoal.checklist_items && Array.isArray(initialGoal.checklist_items)) {
        setChecklistItems(initialGoal.checklist_items.map((item: any) => ({
          title: item.title || '',
          description: item.description || '',
          priority: item.priority || 'medium',
          due_date: item.due_date ? new Date(item.due_date).toISOString().split('T')[0] : ''
        })));
      } else {
        setChecklistItems([]);
      }
      
      // Populate reminder settings if available
      if (initialGoal.reminder_settings) {
        setReminderSettings({
          enabled: Boolean(initialGoal.reminder_settings.enabled),
          interval: initialGoal.reminder_settings.interval || 'weekly',
          custom_interval_days: initialGoal.reminder_settings.custom_interval_days || 7,
          message: initialGoal.reminder_settings.message || '',
          send_email: Boolean(initialGoal.reminder_settings.send_email),
          send_in_app: Boolean(initialGoal.reminder_settings.send_in_app),
          send_to_members: Boolean(initialGoal.reminder_settings.send_to_members),
        });
      } else {
        setReminderSettings((prev) => ({ ...prev, enabled: false }));
      }
    }
  }, [isOpen, initialGoal]);

  const fetchUsers = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      console.log('🔍 Fetching users for goal form...');
      const response = await apiClient.get('/users/');
      console.log('✅ Users fetched successfully:', response.data?.length, 'users');
      setUsers(response.data || []);
    } catch (error: any) {
      console.error('❌ Failed to fetch users:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        headers: error.config?.headers
      });
      // Show user-friendly error notification
      dispatch(addNotification({
        type: 'error',
        title: 'Failed to load team members',
        message: error.response?.data?.detail || 'Unable to fetch team members. Please try again.',
        duration: 5000,
      }));
    }
  };

  const fetchProjects = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addChecklistItem = () => {
    setChecklistItems(prev => [...prev, {
      title: '',
      description: '',
      priority: 'medium',
      due_date: ''
    }]);
  };

  const updateChecklistItem = (index: number, field: string, value: string) => {
    setChecklistItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const toggleMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...prev.member_ids, userId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Backend expects full ISO datetime strings. Convert YYYY-MM-DD from <input type="date">.
      const toIsoMidnightUtc = (d: string | undefined) => {
        if (!d) return undefined;
        return d.includes('T') ? d : `${d}T00:00:00Z`;
      };

      const goalData = {
        ...formData,
        start_date: toIsoMidnightUtc(formData.start_date),
        end_date: toIsoMidnightUtc(formData.end_date),
        project_id: formData.project_id || null,
        target_value: formData.target_value ? parseFloat(formData.target_value) : undefined,
        checklist_items: checklistItems.filter(item => item.title.trim()),
        reminder_settings: reminderSettings.enabled ? reminderSettings : undefined,
      };

      await onSubmit(goalData);
      onClose();
      resetForm();

      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: isEdit ? 'Goal updated successfully!' : 'Goal created successfully!',
        duration: 3000,
      }));
    } catch (error: any) {
      console.error(isEdit ? 'Failed to update goal:' : 'Failed to create goal:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.detail || (isEdit ? 'Failed to update goal' : 'Failed to create goal'),
        duration: 3000,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      goal_type: 'personal',
      priority: 'medium',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      target_value: '',
      unit: '',
      project_id: '',
      auto_update_progress: false,
      tags: [],
      member_ids: [],
    });
    setChecklistItems([]);
    setReminderSettings({
      enabled: false,
      interval: 'weekly',
      custom_interval_days: 7,
      message: '',
      send_email: true,
      send_in_app: true,
      send_to_members: true,
    });
    setCurrentTag('');
    setShowAdvanced(false);
  };

  if (!isOpen) return null;

  // Inline render variant (like Customers page)
  if (mode === 'inline') {
    return (
      <div className="section-card mb-6">
        {(!isEdit) && (
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Goal</h2>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Basic Information</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter goal title..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your goal..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Type
                </label>
                <select
                  value={formData.goal_type}
                  onChange={(e) => handleInputChange('goal_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="personal">Personal</option>
                  <option value="team">Team</option>
                  <option value="sales">Sales</option>
                  <option value="project">Project</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {formData.goal_type === 'project' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Associated Project
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => handleInputChange('project_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Target & Progress Tracking */}
          {(formData.goal_type === 'sales' || showAdvanced) && (
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <TargetIcon className="h-5 w-5 mr-2" />
                Target & Progress Tracking
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Value
                  </label>
                  <input
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => handleInputChange('target_value', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 2000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., pieces, dollars, hours"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_update_progress"
                  checked={formData.auto_update_progress}
                  onChange={(e) => handleInputChange('auto_update_progress', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="auto_update_progress" className="ml-2 text-sm text-gray-700">
                  Enable automatic progress updates (for sales/product goals)
                </label>
              </div>
            </div>
          )}

          {/* Team Members */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <UsersIcon className="h-5 w-5 mr-2" />
                Team Members
              </h4>
              {users.length > 0 && (
                <span className="text-sm text-gray-500">
                  {formData.member_ids.length} selected
                </span>
              )}
            </div>
            
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
              {users.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <UsersIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No team members found</p>
                  <button
                    type="button"
                    onClick={fetchUsers}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    Retry loading members
                  </button>
                </div>
              ) : (
                users.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={formData.member_ids.includes(user.id)}
                      onChange={() => toggleMember(user.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3 flex items-center">
                      <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </div>
                      <div className="ml-2">
                        <div className="text-sm font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-md font-medium text-gray-900">Checklist Items</h4>
              <button
                type="button"
                onClick={addChecklistItem}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {checklistItems.map((item, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateChecklistItem(index, 'title', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mr-2"
                      placeholder="Checklist item title..."
                    />
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <textarea
                      value={item.description}
                      onChange={(e) => updateChecklistItem(index, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Description (optional)..."
                    />
                    
                    <div className="space-y-2">
                      <select
                        value={item.priority}
                        onChange={(e) => updateChecklistItem(index, 'priority', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                        <option value="critical">Critical Priority</option>
                      </select>

                      <input
                        type="date"
                        value={item.due_date}
                        onChange={(e) => updateChecklistItem(index, 'due_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Tags</h4>
            
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add a tag..."
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reminder Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <BellIcon className="h-5 w-5 mr-2" />
                Reminders
              </h4>
              <input
                type="checkbox"
                checked={reminderSettings.enabled}
                onChange={(e) => setReminderSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            {reminderSettings.enabled && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reminder Interval
                    </label>
                    <select
                      value={reminderSettings.interval}
                      onChange={(e) => setReminderSettings(prev => ({ 
                        ...prev, 
                        interval: e.target.value as any 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {reminderSettings.interval === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Interval (days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={reminderSettings.custom_interval_days}
                        onChange={(e) => setReminderSettings(prev => ({ 
                          ...prev, 
                          custom_interval_days: parseInt(e.target.value) || 1 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reminder Message
                  </label>
                  <textarea
                    value={reminderSettings.message}
                    onChange={(e) => setReminderSettings(prev => ({ ...prev, message: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Custom reminder message (optional)..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={reminderSettings.send_email}
                      onChange={(e) => setReminderSettings(prev => ({ ...prev, send_email: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm text-gray-700">Send email notifications</label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={reminderSettings.send_in_app}
                      onChange={(e) => setReminderSettings(prev => ({ ...prev, send_in_app: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm text-gray-700">Send in-app notifications</label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={reminderSettings.send_to_members}
                      onChange={(e) => setReminderSettings(prev => ({ ...prev, send_to_members: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm text-gray-700">Send to all goal members</label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Options Toggle */}
          {!showAdvanced && formData.goal_type !== 'sales' && (
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              className="w-full text-center text-blue-600 hover:text-blue-800 text-sm"
            >
              Show advanced options
            </button>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.title || !formData.end_date}
              className="btn-page-action flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEdit ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                <>
                  <TargetIcon className="h-4 w-4" />
                  <span>{submitLabel || (isEdit ? 'Save Changes' : 'Create Goal')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-0 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Goal' : 'Create New Goal'}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Basic Information</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter goal title..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your goal..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Type
                </label>
                <select
                  value={formData.goal_type}
                  onChange={(e) => handleInputChange('goal_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="personal">Personal</option>
                  <option value="team">Team</option>
                  <option value="sales">Sales</option>
                  <option value="project">Project</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {formData.goal_type === 'project' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Associated Project
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => handleInputChange('project_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Target & Progress Tracking */}
          {(formData.goal_type === 'sales' || showAdvanced) && (
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <TargetIcon className="h-5 w-5 mr-2" />
                Target & Progress Tracking
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Value
                  </label>
                  <input
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => handleInputChange('target_value', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 2000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., pieces, dollars, hours"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_update_progress"
                  checked={formData.auto_update_progress}
                  onChange={(e) => handleInputChange('auto_update_progress', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="auto_update_progress" className="ml-2 text-sm text-gray-700">
                  Enable automatic progress updates (for sales/product goals)
                </label>
              </div>
            </div>
          )}

          {/* Team Members (styled multi-select) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <UsersIcon className="h-5 w-5 mr-2" />
                Team Members
              </h4>
              {users.length > 0 && (
                <span className="text-sm text-gray-500">
                  {formData.member_ids.length} selected
                </span>
              )}
            </div>

            {/* Trigger / Selected chips */}
            <div
              className="mt-1 w-full border border-gray-300 rounded-md bg-white cursor-pointer"
              onClick={() => users.length > 0 && setIsMemberDropdownOpen((o) => !o)}
            >
              <div className="px-3 py-2 flex flex-wrap gap-1 min-h-[40px]">
                {users.length === 0 ? (
                  <div className="text-sm text-gray-500 flex items-center">
                    <UsersIcon className="h-4 w-4 mr-2" />
                    No team members available
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); fetchUsers(); }}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      Retry
                    </button>
                  </div>
                ) : formData.member_ids.length === 0 ? (
                  <span className="text-sm text-gray-500">Select team members</span>
                ) : (
                  users
                    .filter(u => formData.member_ids.includes(u.id))
                    .slice(0, 6)
                    .map(u => (
                      <span key={u.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                        {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
                      </span>
                    ))
                )}
                {formData.member_ids.length > 6 && (
                  <span className="text-xs text-gray-500">+{formData.member_ids.length - 6} more</span>
                )}
              </div>
            </div>

            {/* Dropdown */}
            {isMemberDropdownOpen && (
              <div className="relative">
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto">
                  <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={memberFilter}
                        onChange={(e) => setMemberFilter(e.target.value)}
                        placeholder="Search members..."
                        className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <ul className="py-1">
                    {users
                      .filter((u) => {
                        const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
                        return name.includes(memberFilter.toLowerCase()) || (u.email || '').toLowerCase().includes(memberFilter.toLowerCase());
                      })
                      .map((user) => {
                        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
                        const selected = formData.member_ids.includes(user.id);
                        return (
                          <li
                            key={user.id}
                            className={`px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
                            onClick={() => toggleMember(user.id)}
                          >
                            <div className="flex flex-col">
                              <span className="text-gray-900">{name}</span>
                              <span className="text-xs text-gray-500">{user.email}</span>
                            </div>
                            {selected && <span className="text-user-blue text-xs">Selected</span>}
                          </li>
                        );
                      })}
                    {users.length === 0 && (
                      <li className="px-3 py-2 text-sm text-gray-500">No team members found</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-md font-medium text-gray-900">Checklist Items</h4>
              <button
                type="button"
                onClick={addChecklistItem}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {checklistItems.map((item, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateChecklistItem(index, 'title', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mr-2"
                      placeholder="Checklist item title..."
                    />
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <textarea
                      value={item.description}
                      onChange={(e) => updateChecklistItem(index, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Description (optional)..."
                    />
                    
                    <div className="space-y-2">
                      <select
                        value={item.priority}
                        onChange={(e) => updateChecklistItem(index, 'priority', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                        <option value="critical">Critical Priority</option>
                      </select>

                      <input
                        type="date"
                        value={item.due_date}
                        onChange={(e) => updateChecklistItem(index, 'due_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Tags</h4>
            
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add a tag..."
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reminder Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <BellIcon className="h-5 w-5 mr-2" />
                Reminders
              </h4>
              <input
                type="checkbox"
                checked={reminderSettings.enabled}
                onChange={(e) => setReminderSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            {reminderSettings.enabled && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reminder Interval
                    </label>
                    <select
                      value={reminderSettings.interval}
                      onChange={(e) => setReminderSettings(prev => ({ 
                        ...prev, 
                        interval: e.target.value as any 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {reminderSettings.interval === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Interval (days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={reminderSettings.custom_interval_days}
                        onChange={(e) => setReminderSettings(prev => ({ 
                          ...prev, 
                          custom_interval_days: parseInt(e.target.value) || 1 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reminder Message
                  </label>
                  <textarea
                    value={reminderSettings.message}
                    onChange={(e) => setReminderSettings(prev => ({ ...prev, message: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Custom reminder message (optional)..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={reminderSettings.send_email}
                      onChange={(e) => setReminderSettings(prev => ({ ...prev, send_email: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm text-gray-700">Send email notifications</label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={reminderSettings.send_in_app}
                      onChange={(e) => setReminderSettings(prev => ({ ...prev, send_in_app: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm text-gray-700">Send in-app notifications</label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={reminderSettings.send_to_members}
                      onChange={(e) => setReminderSettings(prev => ({ ...prev, send_to_members: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm text-gray-700">Send to all goal members</label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Options Toggle */}
          {!showAdvanced && formData.goal_type !== 'sales' && (
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              className="w-full text-center text-blue-600 hover:text-blue-800 text-sm"
            >
              Show advanced options
            </button>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.title || !formData.end_date}
              className="btn-page-action flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEdit ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                <>
                  <TargetIcon className="h-4 w-4" />
                  <span>{submitLabel || (isEdit ? 'Save Changes' : 'Create Goal')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGoalForm;
