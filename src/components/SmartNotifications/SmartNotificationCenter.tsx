import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  BellIcon,
  Cog6ToothIcon,
  EyeSlashIcon,
  FunnelIcon,
  StarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  LightBulbIcon,
  UserGroupIcon,
  DocumentTextIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  MoonIcon,
  SunIcon
} from '@heroicons/react/24/outline';

// Helper functions
const getPriorityColor = (priority: string) => {
  // Piano black/white template: neutral cards with subtle border
  return 'border-gray-300 bg-white';
};

const getPriorityBadgeColor = (priority: string) => {
  // Neutral badge for all priorities in B/W theme
  return 'bg-gray-100 text-black';
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'deadline_reminder': return <ClockIcon className="w-5 h-5" />;
    case 'task_assigned': return <UserGroupIcon className="w-5 h-5" />;
    case 'comment_mention': return <DocumentTextIcon className="w-5 h-5" />;
    case 'project_update': return <DocumentTextIcon className="w-5 h-5" />;
    case 'milestone_reached': return <StarIcon className="w-5 h-5" />;
    case 'budget_alert': return <ExclamationTriangleIcon className="w-5 h-5" />;
    case 'system_alert': return <InformationCircleIcon className="w-5 h-5" />;
    default: return <BellIcon className="w-5 h-5" />;
  }
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

interface Notification {
  id: string;
  title: string;
  message: string;
  short_description?: string;
  notification_type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  category?: string;
  project_id?: string;
  task_id?: string;
  context_card_id?: string;
  decision_log_id?: string;
  handoff_summary_id?: string;
  relevance_score: number;
  context_data: any;
  action_required: boolean;
  auto_generated: boolean;
  is_read: boolean;
  read_at?: string;
  is_dismissed: boolean;
  action_taken: boolean;
  created_at: string;
  source?: string;
  tags: string[];
  expires_at?: string;
}

interface NotificationPreferences {
  enabled: boolean;
  focus_mode_enabled: boolean;
  focus_mode_start_time?: string;
  focus_mode_end_time?: string;
  focus_mode_days: string[];
  work_start_time: string;
  work_end_time: string;
  work_days: string[];
  timezone: string;
  urgent_only_mode: boolean;
  minimum_priority: string;
  daily_digest_enabled: boolean;
  daily_digest_time: string;
  weekly_digest_enabled: boolean;
  weekly_digest_day: string;
  weekly_digest_time: string;
  ai_filtering_enabled: boolean;
  relevance_threshold: number;
  context_aware_grouping: boolean;
}

interface SmartNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const SmartNotificationCenter: React.FC<SmartNotificationCenterProps> = ({
  isOpen,
  onClose
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'urgent' | 'settings'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [groupedView, setGroupedView] = useState(true);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    total_notifications: 0,
    unread_count: 0,
    urgent_count: 0
  });

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      fetchPreferences();
    }
  }, [isOpen, activeTab, filterType]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: '1',
        size: '50',
        unread_only: activeTab === 'unread' ? 'true' : 'false',
        grouped: groupedView ? 'true' : 'false'
      });

      if (filterType !== 'all') {
        params.append('type_filter', filterType);
      }

      if (activeTab === 'urgent') {
        params.append('priority_filter', 'urgent');
      }

      // Try smart notifications API first
      try {
        const response = await apiClient.get(`/smart-notifications/?${params}`);
        setNotifications(response.data.notifications || []);
        setSummaryStats({
          total_notifications: response.data.total_notifications || 0,
          unread_count: response.data.unread_count || 0,
          urgent_count: response.data.urgent_count || 0
        });
      } catch (err: any) {
        // Only fallback to basic endpoint if the smart API is not found (404).
        const status = err?.response?.status;
        if (status === 404) {
          const basic = await apiClient.get(`/notifications/?page=1&size=50&unread_only=${activeTab==='unread'}`);
          const basicList = (basic.data.notifications || basic.data || []).map((n: any) => ({
            id: n.id,
            title: n.title || n.type,
            message: n.message || n.short_description || '',
            short_description: n.short_description || '',
            notification_type: n.type || 'system_alert',
            priority: 'normal',
            relevance_score: 0.5,
            context_data: n.data || {},
            action_required: false,
            auto_generated: true,
            is_read: n.is_read || false,
            is_dismissed: false,
            action_taken: false,
            created_at: n.created_at || new Date().toISOString(),
            tags: []
          }));
          setNotifications(basicList);
          setSummaryStats({
            total_notifications: basicList.length,
            unread_count: basicList.filter((n: any) => !n.is_read).length,
            urgent_count: 0
          });
        } else {
          throw err;
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await apiClient.get('/smart-notifications/preferences');
      setPreferences(response.data);
      setFocusModeActive(response.data.focus_mode_enabled);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await apiClient.post('/smart-notifications/mark-read', {
        notification_ids: notificationIds
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          notificationIds.includes(n.id) 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      
      // Update summary stats
      setSummaryStats(prev => ({
        ...prev,
        unread_count: Math.max(0, prev.unread_count - notificationIds.length)
      }));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const provideFeedback = async (notificationId: string, feedback: any) => {
    try {
      await apiClient.post(`/smart-notifications/${notificationId}/feedback`, feedback);
    } catch (error) {
      console.error('Error providing feedback:', error);
    }
  };

  const toggleFocusMode = async () => {
    try {
      if (focusModeActive) {
        await apiClient.post('/smart-notifications/focus-mode/disable');
        setFocusModeActive(false);
      } else {
        await apiClient.post('/smart-notifications/focus-mode/enable');
        setFocusModeActive(true);
      }
    } catch (error) {
      console.error('Error toggling focus mode:', error);
    }
  };

  const updatePreferences = async (updatedPrefs: Partial<NotificationPreferences>) => {
    try {
      const response = await apiClient.put('/smart-notifications/preferences', updatedPrefs);
      setPreferences(response.data);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons = {
      task_assigned: DocumentTextIcon,
      task_status_changed: CheckCircleIcon,
      task_due_soon: ClockIcon,
      task_overdue: ExclamationTriangleIcon,
      decision_logged: LightBulbIcon,
      handoff_received: UserGroupIcon,
      context_card_linked: InformationCircleIcon,
      mention: BellIcon,
      urgent_action_required: ExclamationTriangleIcon
    };
    const IconComponent = icons[type as keyof typeof icons] || InformationCircleIcon;
    return <IconComponent className="h-5 w-5 text-piano" />;
  };

  const getPriorityColor = (priority: string) => {
    // B/W theme: neutral surface with subtle left border
    return 'border-l-gray-300 bg-white';
  };

  const getPriorityBadgeColor = (priority: string) => {
    // Neutral badge in B/W theme
    return 'bg-gray-100 text-black';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-600 bg-opacity-50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BellIcon className="h-6 w-6 text-piano" />
                <h2 className="text-lg font-semibold text-piano">Smart Notifications</h2>
                {focusModeActive && (
                  <div className="flex items-center gap-1 rounded-full bg-gray-200 px-2 py-1 text-xs text-piano">
                    <MoonIcon className="h-3 w-3" />
                    Focus Mode
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFocusMode}
                  className={`rounded-lg p-1.5 ${
                    focusModeActive 
                      ? 'bg-gray-200 text-piano hover:bg-gray-300' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={focusModeActive ? 'Disable Focus Mode' : 'Enable Focus Mode'}
                >
                  {focusModeActive ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setShowPreferences(!showPreferences)}
                  className="rounded-lg bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
                  title="Notification Settings"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
              <span className="text-piano">{summaryStats.total_notifications} total</span>
              <span className="text-piano">{summaryStats.unread_count} unread</span>
              <span className="text-piano">{summaryStats.urgent_count} urgent</span>
            </div>

            {/* Tabs */}
            <div className="mt-3 flex space-x-1">
              {['all', 'unread', 'urgent', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`rounded-md px-3 py-1 text-sm font-medium capitalize ${
                    activeTab === tab
                      ? 'bg-gray-200 text-piano'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'settings' ? (
              <NotificationSettings
                preferences={preferences}
                onUpdate={updatePreferences}
              />
            ) : (
              <>
                {/* Filters */}
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                  <div className="flex items-center gap-2">
                    <FunnelIcon className="h-4 w-4 text-gray-500" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="rounded border-gray-300 text-sm focus:border-piano focus:ring-piano"
                    >
                      <option value="all">All Types</option>
                      <option value="task_assigned">Task Assigned</option>
                      <option value="decision_logged">Decisions</option>
                      <option value="handoff_received">Handoffs</option>
                      <option value="mention">Mentions</option>
                    </select>
                    <button
                      onClick={() => setGroupedView(!groupedView)}
                      className={`rounded px-2 py-1 text-xs ${
                        groupedView 
                          ? 'bg-gray-200 text-piano' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {groupedView ? 'Grouped' : 'List'}
                    </button>
                  </div>
                </div>

                {/* Notifications List */}
                <div className="divide-y divide-gray-200">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                      <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {activeTab === 'unread' 
                          ? "You're all caught up!" 
                          : 'No notifications to show.'}
                      </p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={() => markAsRead([notification.id])}
                        onProvideFeedback={(feedback) => provideFeedback(notification.id, feedback)}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {activeTab !== 'settings' && notifications.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex justify-between">
                <button
                  onClick={() => {
                    const unreadIds = notifications
                      .filter(n => !n.is_read)
                      .map(n => n.id);
                    if (unreadIds.length > 0) {
                      markAsRead(unreadIds);
                    }
                  }}
                  className="text-sm text-piano hover:opacity-80"
                  disabled={notifications.every(n => n.is_read)}
                >
                  Mark All Read
                </button>
                <button
                  onClick={fetchNotifications}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: () => void;
  onProvideFeedback: (feedback: any) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
  onProvideFeedback
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead();
    }
  };

  const handleFeedback = (relevant: boolean) => {
    onProvideFeedback({
      relevance_feedback: relevant ? 0.8 : 0.2,
      user_rating: relevant ? 4 : 2
    });
    setShowFeedback(false);
  };

  return (
    <div
      className={`${getPriorityColor(notification.priority)} border-l-4 px-4 py-3 ${
        !notification.is_read ? 'bg-opacity-80' : 'bg-opacity-40'
      } hover:bg-opacity-60 cursor-pointer transition-colors`}
      onClick={handleClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 text-piano`}>
          {getNotificationIcon(notification.notification_type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                !notification.is_read ? 'text-piano' : 'text-gray-700'
              }`}>
                {notification.title}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {notification.short_description || notification.message}
              </p>
              
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                  getPriorityBadgeColor(notification.priority)
                }`}>
                  {notification.priority}
                </span>
                
                {notification.auto_generated && (
                  <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-black">
                    AI
                  </span>
                )}
                
                {notification.action_required && (
                  <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-black">
                    Action Required
                  </span>
                )}
                
                <span className="text-xs text-gray-500">
                  {formatTime(notification.created_at)}
                </span>
              </div>
              
              {notification.relevance_score && (
                <div className="mt-1 flex items-center gap-1">
                  <StarIcon className="h-3 w-3 text-piano" />
                  <span className="text-xs text-gray-500">
                    {Math.round(notification.relevance_score * 100)}% relevant
                  </span>
                </div>
              )}
            </div>
            
            {showActions && (
              <div className="flex items-center gap-1 ml-2">
                {!notification.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRead();
                    }}
                    className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    title="Mark as read"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                  </button>
                )}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFeedback(!showFeedback);
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                  title="Provide feedback"
                >
                  <StarIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          
          {showFeedback && (
            <div className="mt-2 p-2 bg-gray-100 rounded-lg">
              <p className="text-xs text-gray-600 mb-2">Was this notification relevant?</p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFeedback(true);
                  }}
                  className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                >
                  Yes, relevant
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFeedback(false);
                  }}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                >
                  Not relevant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface NotificationSettingsProps {
  preferences: NotificationPreferences | null;
  onUpdate: (preferences: Partial<NotificationPreferences>) => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  preferences,
  onUpdate
}) => {
  if (!preferences) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
        
        {/* Global Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Enable Notifications
            </label>
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(e) => onUpdate({ enabled: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              AI-Powered Filtering
            </label>
            <input
              type="checkbox"
              checked={preferences.ai_filtering_enabled}
              onChange={(e) => onUpdate({ ai_filtering_enabled: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Urgent Only Mode
            </label>
            <input
              type="checkbox"
              checked={preferences.urgent_only_mode}
              onChange={(e) => onUpdate({ urgent_only_mode: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        {/* Relevance Threshold */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relevance Threshold: {Math.round(preferences.relevance_threshold * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={preferences.relevance_threshold}
            onChange={(e) => onUpdate({ relevance_threshold: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Show all</span>
            <span>Only highly relevant</span>
          </div>
        </div>
        
        {/* Digest Settings */}
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Digest Settings</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Daily Digest
              </label>
              <input
                type="checkbox"
                checked={preferences.daily_digest_enabled}
                onChange={(e) => onUpdate({ daily_digest_enabled: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            
            {preferences.daily_digest_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Digest Time
                </label>
                <input
                  type="time"
                  value={preferences.daily_digest_time}
                  onChange={(e) => onUpdate({ daily_digest_time: e.target.value })}
                  className="rounded border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Work Schedule */}
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Work Schedule</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={preferences.work_start_time}
                onChange={(e) => onUpdate({ work_start_time: e.target.value })}
                className="w-full rounded border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={preferences.work_end_time}
                onChange={(e) => onUpdate({ work_end_time: e.target.value })}
                className="w-full rounded border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              value={preferences.timezone}
              onChange={(e) => onUpdate({ timezone: e.target.value })}
              className="w-full rounded border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartNotificationCenter;
