import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { updateCurrentUser } from '../../store/slices/authSlice';
import { addNotification } from '../../store/slices/notificationSlice';
import { 
  UserIcon, 
  BellIcon, 
  ShieldCheckIcon, 
  Cog6ToothIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  CameraIcon,
  TagIcon,
  Squares2X2Icon,
  BuildingOffice2Icon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  KeyIcon,
  ComputerDesktopIcon,
  ArrowUpTrayIcon,
  BookmarkIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import ItemsPage from './ItemsPage';
import IntegrationsPanel from '../../components/Settings/IntegrationsPanel';
import CustomFieldsPage from './CustomFieldsPage';
import EmailSettingsPage from './EmailSettingsPage';
import RolesPermissionsPage from './RolesPermissionsPage';
import { applyTheme } from '../../utils/theme';
import apiClient from '../../api/client';
import ViewModeButton from '../../components/UI/ViewModeButton';

interface UserProfileForm {
  first_name: string;
  last_name: string;
  phone: string;
  bio: string;
  timezone: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  project_updates: boolean;
  task_assignments: boolean;
  deadline_reminders: boolean;
  team_changes: boolean;
}

interface PreferencesForm {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'es' | 'fr' | 'de';
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
}

const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);
  
const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'preferences' | 'organization' | 'email' | 'items' | 'custom-fields' | 'roles' | 'integrations'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [profileForm, setProfileForm] = useState<UserProfileForm>({
    first_name: '',
    last_name: '',
    phone: '',
    bio: '',
    timezone: 'UTC'
  });
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    project_updates: true,
    task_assignments: true,
    deadline_reminders: true,
    team_changes: false
  });

  const [preferencesForm, setPreferencesForm] = useState<PreferencesForm>({
    theme: 'light',
    language: 'en',
    date_format: 'MM/DD/YYYY'
  });

  // Organization settings state
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgForm, setOrgForm] = useState({
    name: '',
    website: '',
    contact_email: '',
    contact_phone: '',
    tax_number: '',
    gst_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    logo_url: '' as string,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Terms and Conditions state
  const [termsForm, setTermsForm] = useState({
    invoice_terms: '',
    project_terms: '',
    proposal_terms: '',
    purchase_order_terms: ''
  });
  const [termsLoading, setTermsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        bio: user.bio || '',
        timezone: user.timezone || 'UTC'
      });
      
      if (user.notification_settings) {
        setNotificationSettings({
          email_notifications: user.notification_settings.email_notifications ?? true,
          push_notifications: user.notification_settings.push_notifications ?? true,
          project_updates: user.notification_settings.project_updates ?? true,
          task_assignments: user.notification_settings.task_assignments ?? true,
          deadline_reminders: user.notification_settings.deadline_reminders ?? true,
          team_changes: user.notification_settings.team_changes ?? false
        });
      }

      if (user.preferences) {
        setPreferencesForm({
          theme: (user.preferences.theme as any) ?? 'light',
          language: (user.preferences.language as any) ?? 'en',
          date_format: (user.preferences.date_format as any) ?? 'MM/DD/YYYY'
        });
      }
    }
  }, [user]);

  // Fetch organization on tab switch (must be before any return)
  useEffect(() => {
    const loadOrg = async () => {
      if (activeTab !== 'organization') return;
      setOrgLoading(true);
      try {
        const res = await apiClient.get('/organizations/me');
        const data = res.data || {};
        const settings = data.settings || {};
        const branding = data.branding || {};
        setOrgForm({
          name: data.name || '',
          website: settings.website || '',
          contact_email: settings.contact_email || '',
          contact_phone: settings.contact_phone || '',
          tax_number: settings.tax_number || '',
          gst_number: settings.gst_number || '',
          address_line1: settings.address_line1 || '',
          address_line2: settings.address_line2 || '',
          city: settings.city || '',
          state: settings.state || '',
          postal_code: settings.postal_code || '',
          country: settings.country || '',
          logo_url: branding.logo_url || '',
        });
        setLogoPreview(branding.logo_url || '');
        
        // Load terms and conditions
        setTermsForm({
          invoice_terms: settings.invoice_terms || '',
          project_terms: settings.project_terms || '',
          proposal_terms: settings.proposal_terms || '',
          purchase_order_terms: settings.purchase_order_terms || ''
        });
      } catch (e) {
        dispatch(addNotification({ type: 'error', title: 'Load Failed', message: 'Could not load organization settings', duration: 5000 }));
      } finally {
        setOrgLoading(false);
      }
    };
    loadOrg();
  }, [activeTab, dispatch]);


  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await dispatch(updateCurrentUser(profileForm)).unwrap();
      dispatch(addNotification({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully.',
        duration: 3000,
      }));
      setIsEditing(false);
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Update Failed',
        message: error as string,
        duration: 5000,
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveNotifications = async () => {
    try {
      await dispatch(updateCurrentUser({ notification_settings: notificationSettings } as any)).unwrap();
      dispatch(addNotification({
        type: 'success',
        title: 'Notifications Updated',
        message: 'Your notification preferences have been saved.',
        duration: 3000,
      }));
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Save Failed',
        message: (error as string) || 'Could not save notification preferences',
        duration: 5000,
      }));
    }
  };

  const handleSavePreferences = async () => {
    try {
      // merge with existing preferences if present
      const existing = (user?.preferences || {}) as any;
      const merged = { ...existing, ...preferencesForm };
      await dispatch(updateCurrentUser({ preferences: merged } as any)).unwrap();

      // Apply the theme immediately on save
      applyTheme(merged.theme as any);

      dispatch(addNotification({
        type: 'success',
        title: 'Preferences Updated',
        message: 'Your application preferences have been saved.',
        duration: 3000,
      }));
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Save Failed',
        message: (error as string) || 'Could not save preferences',
        duration: 5000,
      }));
    }
  };

  const handleChangePassword = async () => {
    const current = window.prompt('Enter current password');
    if (!current) return;
    const next = window.prompt('Enter new password (min 8 chars)');
    if (!next) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.post('auth/change-password', { current_password: current, new_password: next });
      dispatch(addNotification({
        type: 'success',
        title: 'Password Changed',
        message: 'Your password has been updated.',
        duration: 3000,
      }));
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        title: 'Change Failed',
        message: error?.response?.data?.detail || 'Could not change password',
        duration: 5000,
      }));
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'preferences', name: 'Preferences', icon: Cog6ToothIcon },
    { id: 'organization', name: 'Organization', icon: BuildingOffice2Icon },
    { id: 'email', name: 'Email', icon: EnvelopeIcon },
    { id: 'items', name: 'Items & Services', icon: TagIcon },
    { id: 'custom-fields', name: 'Custom Fields', icon: Squares2X2Icon },
    { id: 'roles', name: 'Roles & Permissions', icon: KeyIcon },
    { id: 'integrations', name: 'Integrations', icon: LinkIcon },
  ];

  if (isLoading) {
    return <div />;
  }

  const handleUploadLogo = async (file: File) => {
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiClient.post('/files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const publicUrl = res.data?.public_url || '';
      if (publicUrl) {
        setOrgForm(prev => ({ ...prev, logo_url: publicUrl }));
        setLogoPreview(publicUrl);
        dispatch(addNotification({ type: 'success', title: 'Logo Uploaded', message: 'Logo uploaded successfully', duration: 3000 }));
      } else {
        dispatch(addNotification({ type: 'error', title: 'Upload Failed', message: 'No public URL returned for logo', duration: 5000 }));
      }
    } catch (e: any) {
      dispatch(addNotification({ type: 'error', title: 'Upload Failed', message: e?.response?.data?.detail || 'Could not upload logo', duration: 5000 }));
    }
  };

  const handleSaveOrganization = async () => {
    try {
      const payload: any = {
        name: orgForm.name,
        settings: {
          website: orgForm.website,
          contact_email: orgForm.contact_email,
          contact_phone: orgForm.contact_phone,
          tax_number: orgForm.tax_number,
          gst_number: orgForm.gst_number,
          address_line1: orgForm.address_line1,
          address_line2: orgForm.address_line2,
          city: orgForm.city,
          state: orgForm.state,
          postal_code: orgForm.postal_code,
          country: orgForm.country,
          // Include terms and conditions
          invoice_terms: termsForm.invoice_terms,
          project_terms: termsForm.project_terms,
          proposal_terms: termsForm.proposal_terms,
          purchase_order_terms: termsForm.purchase_order_terms,
        },
        branding: {
          logo_url: orgForm.logo_url,
        },
      };
      await apiClient.put('/organizations/me', payload);
      dispatch(addNotification({ type: 'success', title: 'Organization Updated', message: 'Company details and terms saved successfully.', duration: 3000 }));
    } catch (e: any) {
      dispatch(addNotification({ type: 'error', title: 'Save Failed', message: e?.response?.data?.detail || 'Could not save organization settings', duration: 5000 }));
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title font-bold text-secondary-900">Settings</h1>
        <p className="text-secondary-600 mt-2">Manage your account settings and preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-secondary-200 mb-8">
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-1.5 px-2 font-medium text-sm flex items-center space-x-2 rounded-md transition-colors focus:outline-none focus:ring-0 ${
                  activeTab === tab.id ? 'text-indigo-600' : 'text-black hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-secondary-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-secondary-900">Profile Information</h2>
              {!isEditing && (
                <ViewModeButton
                  icon={PencilIcon}
                  label="Edit Profile"
                  onClick={() => setIsEditing(true)}
                />
              )}
            </div>
          </div>
          
          <div className="px-6 py-6">
            {isEditing ? (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.first_name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.last_name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={profileForm.timezone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
                
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                
                <div className="flex space-x-3">
                  <ViewModeButton
                    icon={CheckIcon}
                    label={isSaving ? 'Saving...' : 'Save Changes'}
                    onClick={(e: any) => {
                      e.preventDefault();
                      handleProfileSubmit(e);
                    }}
                    disabled={isSaving}
                  />
                  <ViewModeButton
                    icon={XMarkIcon}
                    label="Cancel"
                    variant="destructive"
                    onClick={() => setIsEditing(false)}
                  />
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <UserIcon className="h-5 w-5 text-secondary-400" />
                  <div>
                    <p className="text-sm text-secondary-500">Name</p>
                    <p className="text-secondary-900">{user?.first_name} {user?.last_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <EnvelopeIcon className="h-5 w-5 text-secondary-400" />
                  <div>
                    <p className="text-sm text-secondary-500">Email</p>
                    <p className="text-secondary-900">{user?.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <PhoneIcon className="h-5 w-5 text-secondary-400" />
                  <div>
                    <p className="text-sm text-secondary-500">Phone</p>
                    <p className="text-secondary-900">{user?.phone || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <GlobeAltIcon className="h-5 w-5 text-secondary-400" />
                  <div>
                    <p className="text-sm text-secondary-500">Timezone</p>
                    <p className="text-secondary-900">{user?.timezone}</p>
                  </div>
                </div>
                
                {user?.bio && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-secondary-500 mb-1">Bio</p>
                    <p className="text-secondary-900">{user.bio}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h2 className="text-lg font-medium text-secondary-900">Notification Preferences</h2>
          </div>
          
          <div className="px-6 py-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-secondary-900">Email Notifications</h3>
                <p className="text-sm text-secondary-500">Receive notifications via email</p>
              </div>
              <button
                onClick={() => handleNotificationChange('email_notifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings.email_notifications ? 'bg-user-blue' : 'bg-secondary-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings.email_notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-secondary-900">Push Notifications</h3>
                <p className="text-sm text-secondary-500">Receive push notifications in browser</p>
              </div>
              <button
                onClick={() => handleNotificationChange('push_notifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings.push_notifications ? 'bg-user-blue' : 'bg-secondary-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings.push_notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-secondary-900">Project Updates</h3>
                <p className="text-sm text-secondary-500">Get notified about project changes</p>
              </div>
              <button
                onClick={() => handleNotificationChange('project_updates')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings.project_updates ? 'bg-user-blue' : 'bg-secondary-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings.project_updates ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-secondary-900">Task Assignments</h3>
                <p className="text-sm text-secondary-500">Get notified when assigned to tasks</p>
              </div>
              <button
                onClick={() => handleNotificationChange('task_assignments')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings.task_assignments ? 'bg-user-blue' : 'bg-secondary-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings.task_assignments ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-secondary-900">Deadline Reminders</h3>
                <p className="text-sm text-secondary-500">Get reminded about upcoming deadlines</p>
              </div>
              <button
                onClick={() => handleNotificationChange('deadline_reminders')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings.deadline_reminders ? 'bg-user-blue' : 'bg-secondary-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings.deadline_reminders ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-secondary-900">Team Changes</h3>
                <p className="text-sm text-secondary-500">Get notified about team member changes</p>
              </div>
              <button
                onClick={() => handleNotificationChange('team_changes')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings.team_changes ? 'bg-user-blue' : 'bg-secondary-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings.team_changes ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex justify-end pt-4">
              <ViewModeButton
                icon={BookmarkIcon}
                label="Save Notification Settings"
                onClick={handleSaveNotifications}
              />
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h2 className="text-lg font-medium text-secondary-900">Security Settings</h2>
          </div>
          
          <div className="px-6 py-6 space-y-6">
            <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-secondary-900">Two-Factor Authentication</h3>
                <p className="text-sm text-secondary-500">Add an extra layer of security to your account</p>
              </div>
              <ViewModeButton
                icon={ShieldCheckIcon}
                label="Enable 2FA"
                onClick={async () => {
                  const existing = (user?.preferences || {}) as any;
                  const merged = { ...existing, two_factor_enabled: true };
                  try {
                    await dispatch(updateCurrentUser({ preferences: merged } as any)).unwrap();
                    dispatch(addNotification({ type: 'success', title: '2FA Enabled', message: 'Two-factor preference stored.', duration: 3000 }));
                  } catch (e) {
                    dispatch(addNotification({ type: 'error', title: 'Failed', message: 'Could not enable 2FA preference', duration: 5000 }));
                  }
                }}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-secondary-900">Change Password</h3>
                <p className="text-sm text-secondary-500">Update your account password</p>
              </div>
              <ViewModeButton
                icon={KeyIcon}
                label="Change Password"
                onClick={handleChangePassword}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-secondary-900">Active Sessions</h3>
                <p className="text-sm text-secondary-500">Manage your active login sessions</p>
              </div>
              <ViewModeButton
                icon={ComputerDesktopIcon}
                label="View Sessions"
                onClick={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* Email Tab */}
      {activeTab === 'email' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h2 className="text-lg font-medium text-secondary-900">Organization Email Settings</h2>
            <p className="text-sm text-secondary-500 mt-1">Configure SMTP or provider presets and send a test email.</p>
          </div>
          <div className="p-6">
            <EmailSettingsPage />
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h2 className="text-lg font-medium text-secondary-900">Application Preferences</h2>
          </div>
          
          <div className="px-6 py-6 space-y-6">
            <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-secondary-900">Theme</h3>
                <p className="text-sm text-secondary-500">Choose your preferred color scheme</p>
              </div>
              <select 
                className="py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={preferencesForm.theme}
                onChange={(e) => {
                  const nextTheme = e.target.value as any;
                  setPreferencesForm(prev => ({...prev, theme: nextTheme}));
                  // Apply immediately for instant feedback
                  applyTheme(nextTheme);
                }}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-secondary-900">Language</h3>
                <p className="text-sm text-secondary-500">Select your preferred language</p>
              </div>
              <select 
                className="py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={preferencesForm.language}
                onChange={(e) => setPreferencesForm(prev => ({...prev, language: e.target.value as any}))}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-secondary-900">Date Format</h3>
                <p className="text-sm text-secondary-500">Choose how dates are displayed</p>
              </div>
              <select 
                className="py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={preferencesForm.date_format}
                onChange={(e) => setPreferencesForm(prev => ({...prev, date_format: e.target.value as any}))}
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div className="flex justify-end pt-4">
              <ViewModeButton
                icon={BookmarkIcon}
                label="Save Preferences"
                onClick={handleSavePreferences}
              />
            </div>
          </div>
        </div>
      )}

      {/* Organization Tab */}
      {activeTab === 'organization' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-secondary-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-secondary-900">Organization Settings</h2>
            <div className="flex items-center space-x-3">
              <ViewModeButton
                icon={BookmarkIcon}
                label="Save Company Details"
                onClick={handleSaveOrganization}
                disabled={orgLoading}
              />
            </div>
          </div>
          <div className="px-6 py-6 space-y-8">
            {/* Company Info */}
            <div>
              <h3 className="text-md font-medium text-secondary-900 mb-4">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Your company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Website</label>
                  <input
                    type="url"
                    value={orgForm.website}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Contact Email</label>
                  <input
                    type="email"
                    value={orgForm.contact_email}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, contact_email: e.target.value }))}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="contact@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Contact Phone</label>
                  <input
                    type="tel"
                    value={orgForm.contact_phone}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="+1 555-555-5555"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="text-md font-medium text-secondary-900 mb-4">Business Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Address Line 1</label>
                  <input
                    type="text"
                    value={orgForm.address_line1}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, address_line1: e.target.value }))}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Street address, PO box, company name"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Address Line 2</label>
                  <input
                    type="text"
                    value={orgForm.address_line2}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, address_line2: e.target.value }))}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Apartment, suite, unit, building, floor, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">City</label>
                  <input
                    type="text"
                    value={orgForm.city}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">State/Province</label>
                  <input
                    type="text"
                    value={orgForm.state}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Postal Code</label>
                  <input
                    type="text"
                    value={orgForm.postal_code}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, postal_code: e.target.value }))}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={orgForm.country}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Tax Information */}
            <div>
              <h3 className="text-md font-medium text-secondary-900 mb-4">Tax Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Tax Number</label>
                  <input
                    type="text"
                    value={orgForm.tax_number}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, tax_number: e.target.value }))}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., PAN/VAT"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">GST Number</label>
                  <input
                    type="text"
                    value={orgForm.gst_number}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, gst_number: e.target.value }))}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="GSTIN (if applicable)"
                  />
                </div>
              </div>
            </div>

            {/* Branding */}
            <div>
              <h3 className="text-md font-medium text-secondary-900 mb-4">Branding</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Logo</label>
                  {logoPreview ? (
                    <div className="mb-3">
                      <img src={logoPreview} alt="Logo Preview" className="h-16 object-contain" />
                    </div>
                  ) : null}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setLogoFile(file);
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setLogoPreview(url);
                      }
                    }}
                    className="block w-full text-sm text-secondary-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-secondary-100 file:text-secondary-700 hover:file:bg-secondary-200"
                  />
                  <div className="mt-3">
                    <ViewModeButton
                      icon={ArrowUpTrayIcon}
                      label="Upload Logo"
                      onClick={() => logoFile && handleUploadLogo(logoFile)}
                      disabled={!logoFile}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Logo URL</label>
                  <input
                    type="text"
                    value={orgForm.logo_url}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, logo_url: e.target.value }))}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="/uploads/{org_id}/logo.png"
                  />
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div>
              <h3 className="text-md font-medium text-secondary-900 mb-4">Terms & Conditions</h3>
              <p className="text-sm text-secondary-500 mb-4">
                Define default terms and conditions for various documents. These will be automatically included in generated documents.
              </p>
              
              <div className="space-y-6">
                {/* Invoice Terms */}
                <div>
                  <label className="block text-sm font-medium text-secondary-900 mb-2">
                    Invoice Terms & Conditions
                  </label>
                  <p className="text-xs text-secondary-500 mb-2">
                    These terms will be included in all invoices.
                  </p>
                  <textarea
                    value={termsForm.invoice_terms}
                    onChange={(e) => setTermsForm(prev => ({ ...prev, invoice_terms: e.target.value }))}
                    rows={4}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                    placeholder="Payment due within 30 days. Late fees may apply."
                  />
                </div>

                {/* Project Terms */}
                <div>
                  <label className="block text-sm font-medium text-secondary-900 mb-2">
                    Project Terms & Conditions
                  </label>
                  <p className="text-xs text-secondary-500 mb-2">
                    These terms will be included in project agreements.
                  </p>
                  <textarea
                    value={termsForm.project_terms}
                    onChange={(e) => setTermsForm(prev => ({ ...prev, project_terms: e.target.value }))}
                    rows={4}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                    placeholder="Project scope defined in SOW. Changes require approval."
                  />
                </div>

                {/* Proposal Terms */}
                <div>
                  <label className="block text-sm font-medium text-secondary-900 mb-2">
                    Proposal Terms & Conditions
                  </label>
                  <p className="text-xs text-secondary-500 mb-2">
                    These terms will be included in proposals.
                  </p>
                  <textarea
                    value={termsForm.proposal_terms}
                    onChange={(e) => setTermsForm(prev => ({ ...prev, proposal_terms: e.target.value }))}
                    rows={4}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                    placeholder="Proposal valid for 30 days. 50% deposit required."
                  />
                </div>

                {/* Purchase Order Terms */}
                <div>
                  <label className="block text-sm font-medium text-secondary-900 mb-2">
                    Purchase Order Terms & Conditions
                  </label>
                  <p className="text-xs text-secondary-500 mb-2">
                    These terms will be included in purchase orders.
                  </p>
                  <textarea
                    value={termsForm.purchase_order_terms}
                    onChange={(e) => setTermsForm(prev => ({ ...prev, purchase_order_terms: e.target.value }))}
                    rows={4}
                    className="w-full py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                    placeholder="Delivery as per schedule. Payment upon receipt."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <ViewModeButton
                icon={BookmarkIcon}
                label="Save Organization Settings"
                onClick={handleSaveOrganization}
              />
            </div>
          </div>
        </div>
      )}

      {/* Items Tab */}
      {activeTab === 'items' && (
        <ItemsPage />
      )}

      {/* Custom Fields Tab */}
      {activeTab === 'custom-fields' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h2 className="text-lg font-medium text-secondary-900">Custom Fields</h2>
            <p className="text-sm text-secondary-500 mt-1">
              Create and manage custom fields for projects, tasks, customers, teams, goals, proposals, invoices, vendors, and purchase orders
            </p>
          </div>
          <div className="p-6">
            <CustomFieldsPage />
          </div>
        </div>
      )}

      {/* Roles & Permissions Tab */}
      {activeTab === 'roles' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h2 className="text-lg font-medium text-secondary-900">Roles & Permissions</h2>
            <p className="text-sm text-secondary-500 mt-1">Manage roles and permission matrix</p>
          </div>
          <div className="p-6">
            <RolesPermissionsPage />
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h2 className="text-lg font-medium text-secondary-900">Integrations</h2>
            <p className="text-sm text-secondary-500 mt-1">Connect Google Meet, Microsoft Teams, WhatsApp, and more</p>
          </div>
          <div className="p-0">
            <IntegrationsPanel />
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
