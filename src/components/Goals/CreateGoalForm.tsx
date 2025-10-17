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

interface Task {
  id: string;
  title?: string;
  name?: string;
  status?: string;
}

interface ChecklistItem {
  id?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date?: string;
  is_completed?: boolean;
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal_type: 'personal' as 'personal' | 'team' | 'sales' | 'project' | 'custom',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    reminder_date: '',
    target_value: '',
    unit: '',
    item_id: '',
    quantity: '',
    project_id: '',
    auto_update_progress: false,
    tags: [] as string[],
    member_ids: [] as string[],
    // Conditional selections
    selected_task_ids: [] as string[],
    selected_project_ids: [] as string[],
    multi_task: true,
    multi_project: true,
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
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [taskFilter, setTaskFilter] = useState('');
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchProjects();
      fetchTasks();
      fetchItems();
      // Ensure reminders are visible and enabled by default in inline mode
      if (mode === 'inline') {
        setReminderSettings(prev => ({ ...prev, enabled: true }));
      }
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
        reminder_date: (initialGoal?.custom_fields?.reminder_date ? new Date(initialGoal.custom_fields.reminder_date).toISOString().split('T')[0] : ''),
        target_value: typeof initialGoal.target_value === 'number' ? String(initialGoal.target_value) : (initialGoal.target_value || ''),
        unit: initialGoal.unit || '',
        item_id: initialGoal?.custom_fields?.item_id || '',
        quantity: typeof initialGoal?.target_value === 'number' ? String(initialGoal.target_value) : (initialGoal?.quantity || ''),
        project_id: initialGoal.project_id || '',
        auto_update_progress: Boolean(initialGoal.auto_update_progress),
        tags: Array.isArray(initialGoal.tags) ? initialGoal.tags : [],
        // Extract member user IDs from various possible shapes
        member_ids: initialGoal.members ? initialGoal.members
          .map((m: any) => m?.user?.id || m?.user_id || m?.id)
          .filter(Boolean) : (Array.isArray(initialGoal.member_ids) ? initialGoal.member_ids : []),
        // Selected tasks/projects from custom_fields if present
        selected_task_ids: Array.isArray(initialGoal?.custom_fields?.selected_task_ids) ? initialGoal.custom_fields.selected_task_ids : [],
        selected_project_ids: Array.isArray(initialGoal?.custom_fields?.selected_project_ids) ? initialGoal.custom_fields.selected_project_ids : (initialGoal.project_id ? [initialGoal.project_id] : []),
        multi_task: initialGoal?.custom_fields?.multi_task ?? true,
        multi_project: initialGoal?.custom_fields?.multi_project ?? true,
      });
      
      // Populate checklist items if available (use 'checklists' from API response)
      if (initialGoal.checklists && Array.isArray(initialGoal.checklists)) {
        setChecklistItems(initialGoal.checklists.map((item: any) => ({
          id: item.id,
          title: item.title || '',
          description: item.description || '',
          priority: (item.priority || 'medium'),
          due_date: item.due_date ? new Date(item.due_date).toISOString().split('T')[0] : '',
          is_completed: Boolean(item.is_completed),
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
      // Prefer trailing slash to avoid proxy redirects that can drop headers
      const response = await apiClient.get('/projects/');
      const list = Array.isArray(response.data) ? response.data : (response.data?.projects || response.data?.items || []);
      setProjects(list);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/tasks/');
      const list = Array.isArray(response.data) ? response.data : (response.data?.tasks || response.data?.items || []);
      setTasks(list);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/items/');
      const itemsData = Array.isArray(response.data) ? response.data : (response.data?.items || []);
      // Only active/billable items if those flags exist, else pass-through
      const filtered = Array.isArray(itemsData)
        ? itemsData.filter((it: any) => (it.is_active ?? true) && (it.is_billable ?? true))
        : [];
      setItems(filtered);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setItems([]);
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

      // Build custom_fields depending on goal type
      const custom_fields: any = { ...(initialGoal?.custom_fields || {}) };
      if (formData.goal_type === 'team') {
        custom_fields.selected_task_ids = formData.selected_task_ids;
        custom_fields.multi_task = !!formData.multi_task;
      }
      if (formData.goal_type === 'project') {
        custom_fields.selected_project_ids = formData.selected_project_ids;
        custom_fields.multi_project = !!formData.multi_project;
      }

      const goalData = {
        ...formData,
        start_date: toIsoMidnightUtc(formData.start_date),
        end_date: toIsoMidnightUtc(formData.end_date),
        // For single-project selection, set project_id to first selected, else keep formData.project_id
        project_id: (formData.goal_type === 'project' && formData.selected_project_ids?.length > 0)
          ? (formData.selected_project_ids[0])
          : (formData.project_id || null),
        target_value: formData.goal_type === 'sales'
          ? (formData.quantity ? parseFloat(formData.quantity) : undefined)
          : (formData.goal_type === 'personal' || formData.goal_type === 'custom'
              ? (formData.target_value ? parseFloat(formData.target_value) : undefined)
              : undefined),
        unit: formData.goal_type === 'sales' ? 'quantity' : formData.unit || undefined,
        // Preserve id when editing to allow backend upsert, and convert due_date to ISO
        checklist_items: checklistItems
          .filter(item => (item.title || '').trim())
          .map(item => ({
            ...(item.id ? { id: item.id } : {}),
            title: item.title,
            description: item.description,
            priority: item.priority,
            due_date: toIsoMidnightUtc(item.due_date),
            ...(typeof item.is_completed === 'boolean' ? { is_completed: item.is_completed } : {}),
          })),
        reminder_settings: reminderSettings.enabled ? reminderSettings : undefined,
        custom_fields: {
          ...custom_fields,
          ...(formData.goal_type === 'sales' && formData.item_id ? { item_id: formData.item_id } : {}),
        },
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
      reminder_date: '',
      target_value: '',
      unit: '',
      item_id: '',
      quantity: '',
      project_id: '',
      auto_update_progress: false,
      tags: [],
      member_ids: [],
      selected_task_ids: [],
      selected_project_ids: [],
      multi_task: true,
      multi_project: true,
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
      <>
        {(!isEdit) && (
          <h2 className="text-lg font-medium text-secondary-900 mb-4">Create New Goal</h2>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            
            {/* Row 1: Title, Goal Type, Priority */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700">Goal Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter goal title..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Goal Type</label>
                <select
                  value={formData.goal_type}
                  onChange={(e) => handleInputChange('goal_type', e.target.value)}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="personal">Personal</option>
                  <option value="team">Team</option>
                  <option value="sales">Sales</option>
                  <option value="project">Project</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Row 2: Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700">Start Date *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">End Date *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Reminder</label>
                <input
                  type="date"
                  value={formData.reminder_date}
                  onChange={(e) => handleInputChange('reminder_date', e.target.value)}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-secondary-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                placeholder="Describe your goal..."
              />
            </div>
          </div>

          {/* Type-specific section with Team Members */}
          {(['personal','custom','sales'].includes(formData.goal_type)) && (
            <div className="space-y-4">
              {/* Row: data fields + team members */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {formData.goal_type === 'sales' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
                      <select
                        value={formData.item_id}
                        onChange={(e) => handleInputChange('item_id', e.target.value)}
                        className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select an item</option>
                        {items.map((it:any) => (
                          <option key={it.id} value={it.id}>{it.name || it.display_name || it.sku || it.id}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.quantity}
                        onChange={(e) => handleInputChange('quantity', e.target.value)}
                        className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 10"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
                      <input
                        type="number"
                        value={formData.target_value}
                        onChange={(e) => handleInputChange('target_value', e.target.value)}
                        className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 2000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => handleInputChange('unit', e.target.value)}
                        className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., pieces, dollars, hours"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-secondary-700">Team Members</label>
                  <div
                    className="mt-1 w-full border border-secondary-300 rounded-md bg-white cursor-pointer"
                    onClick={() => users.length > 0 && setIsMemberDropdownOpen((o) => !o)}
                  >
                    <div className="py-2 flex flex-wrap gap-1 min-h-[40px]">
                      {users.length === 0 ? (
                        <div className="text-sm text-gray-500 flex items-center">
                          <UsersIcon className="h-4 w-4 mr-2" />
                          No team members
                        </div>
                      ) : formData.member_ids.length === 0 ? (
                        <span className="text-sm text-gray-500">Select members</span>
                      ) : (
                        <>
                          {users
                            .filter(u => formData.member_ids.includes(u.id))
                            .slice(0, 2)
                            .map(u => (
                              <span key={u.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                                {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
                              </span>
                            ))}
                          {formData.member_ids.length > 2 && (
                            <span className="text-xs text-gray-500">+{formData.member_ids.length - 2}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
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
                              className="w-full pl-7 pr-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <ul >
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
                                  className={`py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
                                  onClick={() => toggleMember(user.id)}
                                >
                                  <div className="flex flex-col">
                                    <span className="text-gray-900">{name}</span>
                                    <span className="text-xs text-gray-500">{user.email}</span>
                                  </div>
                                  {selected && <span className="text-blue-600 text-xs">✓</span>}
                                </li>
                              );
                            })}
                          {users.length === 0 && (
                            <li className="py-2 text-sm text-gray-500">No team members found</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Auto progress only for sales/product goals */}
              {formData.goal_type === 'sales' && (
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
              )}
            </div>
          )}

          {formData.goal_type === 'team' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Tasks to Complete</label>
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" checked={formData.multi_task} onChange={(e)=>handleInputChange('multi_task', e.target.checked)} className="h-3 w-3" />
                    Multiple
                  </label>
                </div>
                <div>
                  <div
                    className="mt-1 w-full border border-gray-300 rounded-md bg-white cursor-pointer"
                    onClick={() => tasks.length > 0 && setIsTaskDropdownOpen((o) => !o)}
                  >
                    <div className="py-2 flex flex-wrap gap-1 min-h-[40px]">
                      {tasks.length === 0 ? (
                        <div className="text-sm text-gray-500">No tasks available</div>
                      ) : (formData.selected_task_ids.length === 0 ? (
                        <span className="text-sm text-gray-500">Select tasks</span>
                      ) : (
                        <>
                          {tasks
                            .filter(t => formData.selected_task_ids.includes(t.id))
                            .slice(0, 4)
                            .map(t => (
                            <span key={t.id} className="inline-flex items-center h-5 px-2 py-0 rounded-full text-xs leading-tight bg-gray-100 text-gray-700 border border-gray-200">
                                {t.title || t.name || t.id}
                                <button
                                  type="button"
                                  className="ml-1 text-gray-500 hover:text-gray-700"
                                  onClick={(e) => { e.stopPropagation(); handleInputChange('selected_task_ids', formData.selected_task_ids.filter(x=>x!==t.id)); }}
                                  aria-label="Remove task"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          {formData.selected_task_ids.length > 4 && (
                            <span className="text-xs text-gray-500">+{formData.selected_task_ids.length - 4} more</span>
                          )}
                        </>
                      ))}
                    </div>
                  </div>
                  {isTaskDropdownOpen && (
                    <div className="relative">
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto">
                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                          <div className="relative">
                            <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={taskFilter}
                              onChange={(e) => setTaskFilter(e.target.value)}
                              placeholder="Search tasks..."
                              className="w-full pl-7 pr-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <ul >
                          {tasks
                            .filter((t) => {
                              const name = (t.title || t.name || t.id || '').toString().toLowerCase();
                              return name.includes(taskFilter.toLowerCase());
                            })
                            .map((t) => {
                              const id = t.id;
                              const label = t.title || t.name || id;
                              const selected = formData.selected_task_ids.includes(id);
                              return (
                                <li
                                  key={id}
                                  className={`py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
                                  onClick={() => {
                                    if (formData.multi_task) {
                                      if (selected) {
                                        handleInputChange('selected_task_ids', formData.selected_task_ids.filter(x=>x!==id));
                                      } else {
                                        handleInputChange('selected_task_ids', [...formData.selected_task_ids, id]);
                                      }
                                    } else {
                                      handleInputChange('selected_task_ids', [id]);
                                      setIsTaskDropdownOpen(false);
                                    }
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span className="text-gray-900">{label}</span>
                                  </div>
                                  {formData.multi_task ? (
                                    <input type="checkbox" readOnly checked={selected} />
                                  ) : (
                                    <input type="radio" name="task_single_inline" readOnly checked={selected} />
                                  )}
                                </li>
                              );
                            })}
                          {tasks.length === 0 && (
                            <li className="py-2 text-sm text-gray-500">No tasks found</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Team Members</label>
                <div
                  className="w-full border border-secondary-300 rounded-md bg-white cursor-pointer"
                  onClick={() => users.length > 0 && setIsMemberDropdownOpen((o) => !o)}
                >
                  <div className="py-2 flex flex-wrap gap-1 min-h-[40px]">
                    {users.length === 0 ? (
                      <div className="text-sm text-gray-500 flex items-center">
                        <UsersIcon className="h-4 w-4 mr-2" />
                        No team members
                      </div>
                    ) : formData.member_ids.length === 0 ? (
                      <span className="text-sm text-gray-500">Select members</span>
                    ) : (
                      <>
                        {users
                          .filter(u => formData.member_ids.includes(u.id))
                          .slice(0, 4)
                          .map(u => (
                            <span key={u.id} className="inline-flex items-center h-5 px-2 py-0 rounded-full text-xs leading-tight bg-gray-100 text-gray-700 border border-gray-200">
                              {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
                            </span>
                          ))}
                        {formData.member_ids.length > 4 && (
                          <span className="text-xs text-gray-500">+{formData.member_ids.length - 4}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
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
                            className="w-full pl-7 pr-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <ul >
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
                                className={`py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
                                onClick={() => toggleMember(user.id)}
                              >
                                <div className="flex flex-col">
                                  <span className="text-gray-900">{name}</span>
                                  <span className="text-xs text-gray-500">{user.email}</span>
                                </div>
                                {selected && <span className="text-blue-600 text-xs">✓</span>}
                              </li>
                            );
                          })}
                        {users.length === 0 && (
                          <li className="py-2 text-sm text-gray-500">No team members found</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {formData.goal_type === 'project' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Projects to Complete</label>
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" checked={formData.multi_project} onChange={(e)=>handleInputChange('multi_project', e.target.checked)} className="h-3 w-3" />
                    Multiple
                  </label>
                </div>
                {/* Trigger / Selected chips */}
                <div
                  className="mt-1 w-full border border-gray-300 rounded-md bg-white cursor-pointer"
                  onClick={() => projects.length > 0 && setIsProjectDropdownOpen((o) => !o)}
                >
                  <div className="py-2 flex flex-wrap gap-1 min-h-[40px]">
                    {projects.length === 0 ? (
                      <div className="text-sm text-gray-500">No projects available</div>
                    ) : (formData.selected_project_ids.length === 0 ? (
                      <span className="text-sm text-gray-500">Select projects</span>
                    ) : (
                      <>
                        {projects
                          .filter(p => formData.selected_project_ids.includes(p.id))
                          .slice(0, 4)
                          .map(p => (
                            <span key={p.id} className="inline-flex items-center h-5 px-2 py-0 rounded-full text-xs leading-tight bg-gray-100 text-gray-700 border border-gray-200">
                              {p.name || p.id}
                              <button
                                type="button"
                                className="ml-1 text-gray-500 hover:text-gray-700"
                                onClick={(e) => { e.stopPropagation(); handleInputChange('selected_project_ids', formData.selected_project_ids.filter(x=>x!==p.id)); }}
                                aria-label="Remove project"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        {formData.selected_project_ids.length > 4 && (
                          <span className="text-xs text-gray-500">+{formData.selected_project_ids.length - 4} more</span>
                        )}
                      </>
                    ))}
                  </div>
                </div>
                {/* Dropdown */}
                {isProjectDropdownOpen && (
                  <div className="relative">
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto">
                      <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                        <div className="relative">
                          <MagnifyingGlassIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            placeholder="Search projects..."
                            className="w-full pl-7 pr-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <ul >
                        {projects
                          .filter((p) => {
                            const name = (p.name || p.id || '').toString().toLowerCase();
                            return name.includes(projectFilter.toLowerCase());
                          })
                          .map((p) => {
                            const label = p.name || p.id;
                            const id = p.id;
                            const selected = formData.selected_project_ids.includes(id);
                            return (
                              <li
                                key={id}
                                className={`py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
                                onClick={() => {
                                  if (formData.multi_project) {
                                    if (selected) {
                                      handleInputChange('selected_project_ids', formData.selected_project_ids.filter(x=>x!==id));
                                    } else {
                                      handleInputChange('selected_project_ids', [...formData.selected_project_ids, id]);
                                    }
                                  } else {
                                    handleInputChange('selected_project_ids', [id]);
                                    setIsProjectDropdownOpen(false);
                                  }
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="text-gray-900">{label}</span>
                                </div>
                                {formData.multi_project ? (
                                  <input type="checkbox" readOnly checked={selected} />
                                ) : (
                                  <input type="radio" name="project_single_inline" readOnly checked={selected} />
                                )}
                              </li>
                            );
                          })}
                        {projects.length === 0 && (
                          <li className="py-2 text-sm text-gray-500">No projects found</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Team Members</label>
                <div
                  className="w-full border border-secondary-300 rounded-md bg-white cursor-pointer"
                  onClick={() => users.length > 0 && setIsMemberDropdownOpen((o) => !o)}
                >
                  <div className="py-2 flex flex-wrap gap-1 min-h-[40px]">
                    {users.length === 0 ? (
                      <div className="text-sm text-gray-500 flex items-center">
                        <UsersIcon className="h-4 w-4 mr-2" />
                        No team members
                      </div>
                    ) : formData.member_ids.length === 0 ? (
                      <span className="text-sm text-gray-500">Select members</span>
                    ) : (
                      <>
                        {users
                          .filter(u => formData.member_ids.includes(u.id))
                          .slice(0, 4)
                          .map(u => (
                            <span key={u.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                              {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
                            </span>
                          ))}
                        {formData.member_ids.length > 4 && (
                          <span className="text-xs text-gray-500">+{formData.member_ids.length - 4}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
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
                            className="w-full pl-7 pr-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <ul >
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
                                className={`py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
                                onClick={() => toggleMember(user.id)}
                              >
                                <div className="flex flex-col">
                                  <span className="text-gray-900">{name}</span>
                                  <span className="text-xs text-gray-500">{user.email}</span>
                                </div>
                                {selected && <span className="text-blue-600 text-xs">✓</span>}
                              </li>
                            );
                          })}
                        {users.length === 0 && (
                          <li className="py-2 text-sm text-gray-500">No team members found</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


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
                <div key={index} >
                  {/* Single row: title, description (single line), reminder (due date), delete */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateChecklistItem(index, 'title', e.target.value)}
                    className="md:col-span-3 mt-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Checklist title..."
                    />
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => updateChecklistItem(index, 'description', e.target.value)}
                    className="md:col-span-6 mt-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Description..."
                    />
                    <input
                      type="date"
                      value={item.due_date || ''}
                      onChange={(e) => updateChecklistItem(index, 'due_date', e.target.value)}
                    className="md:col-span-2 mt-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(index)}
                      className="md:col-span-1 text-red-500 hover:text-red-700 justify-self-end"
                      title="Delete item"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>


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
      </>
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Associated Project
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => handleInputChange('project_id', e.target.value)}
                  className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700">
                  Reminder
                </label>
                <input
                  type="date"
                  value={formData.reminder_date}
                  onChange={(e) => handleInputChange('reminder_date', e.target.value)}
                  className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
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
                  <label className="block text-sm font-medium text-secondary-700">
                    Target Value
                  </label>
                  <input
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => handleInputChange('target_value', e.target.value)}
                    className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
                    placeholder="e.g., 2000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    className="mt-1 block w-full border-secondary-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-primary-500 sm:text-sm"
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
              <div className="py-2 flex flex-wrap gap-1 min-h-[40px]">
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
                        <button
                          type="button"
                          className="ml-1 text-gray-500 hover:text-gray-700"
                          onClick={(e) => { e.stopPropagation(); toggleMember(u.id); }}
                          aria-label="Remove member"
                        >
                          ×
                        </button>
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
                        className="w-full pl-7 pr-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <ul >
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
                            className={`py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
                            onClick={() => toggleMember(user.id)}
                          >
                            <div className="flex flex-col">
                              <span className="text-gray-900">{name}</span>
                              <span className="text-xs text-gray-500">{user.email}</span>
                            </div>
                            {selected && <span className="text-blue-600 text-xs">✓</span>}
                          </li>
                        );
                      })}
                    {users.length === 0 && (
                      <li className="py-2 text-sm text-gray-500">No team members found</li>
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
                      className="flex-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mr-2"
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
                      className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Description (optional)..."
                    />
                    
                    <div className="space-y-2">
                      <select
                        value={item.priority}
                        onChange={(e) => updateChecklistItem(index, 'priority', e.target.value)}
                        className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
