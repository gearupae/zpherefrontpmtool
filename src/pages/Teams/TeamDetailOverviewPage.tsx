import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { TeamMember, User, Project, Task, UserRole, UserStatus } from '../../types';
import ViewModeButton from '../../components/UI/ViewModeButton';
import { addNotification } from '../../store/slices/notificationSlice';
import ActivityStream from '../../components/Integration/ActivityStream';
import { fetchRoles } from '../../store/slices/rbacSlice';
import {
 UserGroupIcon,
 UserIcon,
 CalendarIcon,
 ClockIcon,
 CheckCircleIcon,
 ExclamationTriangleIcon,
 ShieldCheckIcon,
 CogIcon,
 UserPlusIcon,
 ArrowLeftIcon,
 PencilIcon,
 TrashIcon,
 FolderIcon,
 DocumentTextIcon,
 BoltIcon,
 ChartBarIcon,
 PhoneIcon,
 EnvelopeIcon,
 GlobeAltIcon,
 MapPinIcon,
 BuildingOfficeIcon,
 StarIcon,
 TrophyIcon,
 FireIcon,
 AcademicCapIcon
} from '@heroicons/react/24/outline';

interface TeamMemberStats {
 totalProjects: number;
 activeProjects: number;
 completedTasks: number;
 activeTasks: number;
 totalHours: number;
 efficiency: number;
 avgTaskCompletion: number;
 recentActivity: string;
}

type EditUserForm = Partial<User> & { password?: string };

interface UserAttachment {
 id: string;
 filename?: string;
 original_filename?: string;
 file_path?: string;
 url?: string;
 created_at?: string;
}

const TeamDetailOverviewPage: React.FC = () => {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const dispatch = useAppDispatch();
 const roles = useAppSelector((state: any) => state.rbac.roles) as Array<{ id: string; name: string }>

 const [teamMember, setTeamMember] = useState<User | null>(null);
 const [memberProjects, setMemberProjects] = useState<Project[]>([]);
 const [memberTasks, setMemberTasks] = useState<Task[]>([]);
 const [stats, setStats] = useState<TeamMemberStats>({
 totalProjects: 0,
 activeProjects: 0,
 completedTasks: 0,
 activeTasks: 0,
 totalHours: 0,
 efficiency: 0,
 avgTaskCompletion: 0,
 recentActivity: 'No recent activity'
 });
const [isLoading, setIsLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'tasks' | 'activity' | 'edit'>('overview');
 const [isEditing, setIsEditing] = useState(false);
 const [editForm, setEditForm] = useState<EditUserForm>({});
 const [attachments, setAttachments] = useState<UserAttachment[]>([]);
 const [newFiles, setNewFiles] = useState<File[]>([]);
 const [skills, setSkills] = useState<string[]>([]);
 const [skillInput, setSkillInput] = useState<string>('');

useEffect(() => {
 console.log('TeamDetailOverviewPage useEffect - id:', id);
 if (id) {
 fetchTeamMemberData();
 }
 }, [id]);

 useEffect(() => {
 // Ensure roles loaded for RBAC select
 dispatch(fetchRoles());
 }, [dispatch]);

const fetchTeamMemberData = async () => {
 if (!id) return;
 
 console.log('fetchTeamMemberData called with id:', id);
 setIsLoading(true);
 try {
 // Fetch team member details using users endpoint
 const { default: apiClient } = await import('../../api/client');
 console.log('Making API call to:', `/users/${id}`);
 const memberResponse = await apiClient.get(`/users/${id}`);
 console.log('API response:', memberResponse);
 const memberData = memberResponse.data;
 setTeamMember(memberData);
 setEditForm(memberData);
 setSkills(Array.isArray(memberData?.preferences?.skills) ? memberData.preferences.skills : []);

 // Fetch related data
 await Promise.all([
 fetchMemberProjects(memberData.id),
 fetchMemberTasks(memberData.id),
 fetchMemberAttachments(memberData.id),
 ]);
 
 } catch (error) {
 console.error('Failed to fetch team member data:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: 'Failed to load team member data',
 duration: 5000,
 }));
 } finally {
 setIsLoading(false);
 }
 };

const fetchMemberProjects = async (userId: string) => {
 try {
 const { default: apiClient } = await import('../../api/client');
 // Fetch all projects and filter by team member
 const response = await apiClient.get('/projects');
 const allProjects = response.data;
 
 // Filter projects where this user is the owner or a member
 const userProjects = allProjects.filter((project: Project) => 
 project.owner_id === userId
 );
 
 setMemberProjects(userProjects);
 } catch (error) {
 console.error('Failed to fetch member projects:', error);
 }
 };

const fetchMemberTasks = async (userId: string) => {
 try {
 const { default: apiClient } = await import('../../api/client');
 // Fetch all tasks and filter by assignee
 const response = await apiClient.get('/tasks');
 const allTasks = response.data;
 
 // Filter tasks assigned to this user
 const userTasks = allTasks.filter((task: Task) => 
 task.assignee_id === userId || task.created_by_id === userId
 );
 
 setMemberTasks(userTasks);
 calculateStats(userTasks, memberProjects);
 } catch (error) {
 console.error('Failed to fetch member tasks:', error);
 }
 };

 const calculateStats = (tasks: Task[], projects: Project[]) => {
 const completedTasks = tasks.filter(task => task.status === 'completed');
 const activeTasks = tasks.filter(task => task.status === 'in_progress' || task.status === 'todo');
 const activeProjects = projects.filter(project => project.status === 'active');
 
 const totalHours = tasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);
 const totalStoryPoints = tasks.reduce((sum, task) => sum + (task.story_points || 0), 0);
 const efficiency = totalHours > 0 ? totalStoryPoints / totalHours : 0;
 
 const avgTaskCompletion = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
 
 setStats({
 totalProjects: projects.length,
 activeProjects: activeProjects.length,
 completedTasks: completedTasks.length,
 activeTasks: activeTasks.length,
 totalHours,
 efficiency,
 avgTaskCompletion,
 recentActivity: tasks.length > 0 ? 'Active this week' : 'No recent activity'
 });
 };

const handleUpdateMember = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!teamMember) return;

 try {
 const { default: apiClient } = await import('../../api/client');

 // Merge skills into preferences safely
 const mergedPreferences = {
 ...(teamMember.preferences || {}),
 ...(editForm.preferences || {}),
 skills: skills,
 };

 const payload: any = {
 username: editForm.username ?? teamMember.username,
 first_name: editForm.first_name ?? teamMember.first_name,
 last_name: editForm.last_name ?? teamMember.last_name,
 email: editForm.email ?? teamMember.email,
 role: editForm.role ?? teamMember.role,
 status: editForm.status ?? teamMember.status,
 timezone: editForm.timezone ?? teamMember.timezone,
 phone: editForm.phone ?? teamMember.phone,
 address: editForm.address ?? teamMember.address,
 role_id: editForm.role_id ?? teamMember.role_id,
 id_expiry_date: (editForm as any).id_expiry_date ?? (teamMember as any).id_expiry_date,
 visa_expiry_date: (editForm as any).visa_expiry_date ?? (teamMember as any).visa_expiry_date,
 passport_expiry_date: (editForm as any).passport_expiry_date ?? (teamMember as any).passport_expiry_date,
 contract_expiry_date: (editForm as any).contract_expiry_date ?? (teamMember as any).contract_expiry_date,
 bio: editForm.bio ?? teamMember.bio,
 preferences: mergedPreferences,
 };

 if (editForm.password && editForm.password.trim().length > 0) {
 payload.password = editForm.password;
 }

 // Ensure trailing slash
 const updateResp = await apiClient.put(`/users/${teamMember.id}`, payload);

 // Upload any new attachments
 if (newFiles.length > 0) {
 await Promise.all(
 newFiles.map(async (file) => {
 const form = new FormData();
 form.append('file', file);
 await apiClient.post(`/users/${teamMember.id}/attachments`, form);
 })
 );
 setNewFiles([]);
 }
 
 // Refresh local state
 setTeamMember({ ...teamMember, ...updateResp.data });
 setEditForm({ ...updateResp.data });
 await fetchMemberAttachments(teamMember.id);

 setIsEditing(false);
 
 dispatch(addNotification({
 type: 'success',
 title: 'Success',
 message: 'Team member updated successfully',
 duration: 3000,
 }));
 } catch (error) {
 console.error('Failed to update team member:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: 'Failed to update team member',
 duration: 5000,
 }));
 }
 };

 const handleDeleteMember = async () => {
 if (!teamMember || !window.confirm('Are you sure you want to remove this team member? This action cannot be undone.')) {
 return;
 }

 try {
 const { default: apiClient } = await import('../../api/client');
await apiClient.delete(`/users/${teamMember.id}`);
 
 dispatch(addNotification({
 type: 'success',
 title: 'Success',
 message: 'Team member removed successfully',
 duration: 3000,
 }));
 
 navigate('/teams');
 } catch (error) {
 console.error('Failed to delete team member:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: 'Failed to remove team member',
 duration: 5000,
 }));
 }
 };

const formatDate = (dateString: string) => {
 return new Date(dateString).toLocaleDateString();
 };

 const fetchMemberAttachments = async (userId: string) => {
 try {
 const { default: apiClient } = await import('../../api/client');
 const resp = await apiClient.get(`/users/${userId}/attachments`);
 const items = Array.isArray(resp.data) ? resp.data : [];
 setAttachments(items);
 } catch (err) {
 console.warn('Failed to fetch user attachments', err);
 setAttachments([]);
 }
 };

 const getRoleColor = (role: string) => {
 const roleColors: Record<string, string> = {
 admin: 'bg-red-100 text-red-800',
 manager: 'bg-orange-100 text-orange-800',
 member: 'bg-blue-100 text-blue-800',
 client: 'bg-gray-100 text-gray-800'
 };
 return roleColors[role] || 'bg-gray-100 text-gray-800';
 };

 const getStatusColor = (status: string) => {
 const statusColors: Record<string, string> = {
 active: 'bg-green-100 text-green-800',
 inactive: 'bg-gray-100 text-gray-800',
 pending: 'bg-yellow-100 text-yellow-800',
 suspended: 'bg-red-100 text-red-800'
 };
 return statusColors[status] || 'bg-gray-100 text-gray-800';
 };

 const getRoleIcon = (role: string) => {
 switch (role) {
 case 'admin':
 return <ShieldCheckIcon className="h-5 w-5" />;
 case 'manager':
 return <CogIcon className="h-5 w-5" />;
 case 'member':
 return <UserGroupIcon className="h-5 w-5" />;
 case 'client':
 return <UserPlusIcon className="h-5 w-5" />;
 default:
 return <UserIcon className="h-5 w-5" />;
 }
 };

 const getPerformanceLevel = () => {
 if (stats.efficiency > 3) return { level: 'Exceptional', color: 'text-purple-600', icon: TrophyIcon };
 if (stats.efficiency > 2) return { level: 'High Performer', color: 'text-green-600', icon: StarIcon };
 if (stats.efficiency > 1) return { level: 'Good', color: 'text-blue-600', icon: FireIcon };
 return { level: 'Getting Started', color: 'text-gray-600', icon: AcademicCapIcon };
 };

 console.log('TeamDetailOverviewPage rendering - teamMember:', teamMember, 'isLoading:', isLoading, 'id:', id);
 
 if (isLoading) {
 return <div />;
 }

 if (!teamMember) {
 return (
 <div className="text-center2">
 <h2 className="text-2xl font-bold text-gray-900 mb-4">Team Member Not Found</h2>
 <p className="text-gray-600 mb-6">The team member you're looking for doesn't exist.</p>
 <button
 onClick={() => navigate('/teams')}
 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
 >
 Back to Teams
 </button>
 </div>
 );
 }

 const performance = getPerformanceLevel();

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-4">
 <button
 onClick={() => navigate('/teams')}
 className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <ArrowLeftIcon className="h-5 w-5" />
 </button>
 <div className="flex items-center space-x-4">
 <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
 {teamMember.avatar_url ? (
 <img
 src={teamMember.avatar_url}
 alt={teamMember.full_name}
 className="h-16 w-16 rounded-full object-cover"
 />
 ) : (
 <span className="text-user-blue font-bold text-xl">
 {teamMember.first_name[0]}{teamMember.last_name[0]}
 </span>
 )}
 </div>
 <div>
 <h1 className="text-3xl font-bold text-gray-900">{teamMember.full_name}</h1>
 <div className="flex items-center space-x-2 mt-1">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getRoleColor(teamMember.role)}`}>
 {getRoleIcon(teamMember.role)}
 <span className="ml-1">{teamMember.role}</span>
 </span>
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(teamMember.status)}`}>
 {teamMember.status}
 </span>
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${performance.color} bg-opacity-10`}>
 <performance.icon className="h-4 w-4 mr-1" />
 {performance.level}
 </span>
 </div>
 <p className="text-gray-600 mt-1">
 @{teamMember.username} • Member since {formatDate(teamMember.created_at)}
 </p>
 </div>
 </div>
 </div>
 <div className="flex flex-wrap gap-2">
 <ViewModeButton
 icon={FolderIcon}
 label="View Project"
 active={activeTab === 'projects'}
 onClick={() => setActiveTab('projects')}
 />
 <ViewModeButton
 icon={EnvelopeIcon}
 label="Send Mail"
 onClick={() => window.open(`mailto:${teamMember.email}`)}
 />
 <ViewModeButton
 icon={DocumentTextIcon}
 label="View Task"
 active={activeTab === 'tasks'}
 onClick={() => setActiveTab('tasks')}
 />
 <ViewModeButton
 icon={PencilIcon}
 label="Edit"
 active={activeTab === 'edit'}
 onClick={() => setActiveTab('edit')}
 />
 <ViewModeButton
 icon={TrashIcon}
 label="Remove"
 variant="destructive"
 onClick={handleDeleteMember}
 />
 </div>
 </div>


 {/* Navigation Tabs */}
 <div className="border-b border-gray-200">
 <nav className="flex space-x-8">
 {[
 { id: 'overview', name: 'Overview', icon: ChartBarIcon },
 { id: 'projects', name: 'Projects', icon: FolderIcon },
 { id: 'tasks', name: 'Tasks', icon: DocumentTextIcon },
 { id: 'activity', name: 'Activity', icon: ClockIcon },
 { id: 'edit', name: 'Edit', icon: PencilIcon }
 ].map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as any)}
 className={`py-2 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
 activeTab === tab.id ? 'text-indigo-600' : 'text-black hover:text-gray-700'
 }`}
 >
 <div className="flex items-center space-x-2">
 <tab.icon className="h-4 w-4" />
 <span>{tab.name}</span>
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
 {activeTab === 'overview' && teamMember && (
 <div className="space-y-6">
 {/* Performance Stats */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-white shadow rounded-lg detail-card">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <FolderIcon className="h-8 w-8 text-blue-600" />
 </div>
 <div className="ml-4">
 <h3 className="text-lg font-medium text-gray-900">{stats.totalProjects}</h3>
 <p className="text-sm text-gray-500">Total Projects</p>
 </div>
 </div>
 </div>
 <div className="bg-white shadow rounded-lg detail-card">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <CheckCircleIcon className="h-8 w-8 text-green-600" />
 </div>
 <div className="ml-4">
 <h3 className="text-lg font-medium text-gray-900">{stats.completedTasks}</h3>
 <p className="text-sm text-gray-500">Completed Tasks</p>
 </div>
 </div>
 </div>
 <div className="bg-white shadow rounded-lg detail-card">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <ClockIcon className="h-8 w-8 text-orange-600" />
 </div>
 <div className="ml-4">
 <h3 className="text-lg font-medium text-gray-900">{stats.totalHours.toFixed(1)}h</h3>
 <p className="text-sm text-gray-500">Total Hours</p>
 </div>
 </div>
 </div>
 <div className="bg-white shadow rounded-lg detail-card">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <BoltIcon className="h-8 w-8 text-purple-600" />
 </div>
 <div className="ml-4">
 <h3 className="text-lg font-medium text-gray-900">{stats.efficiency.toFixed(2)}</h3>
 <p className="text-sm text-gray-500">Efficiency Score</p>
 </div>
 </div>
 </div>
 </div>

 {/* Member Information */}
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 <div className="flex items-center space-x-3">
 <EnvelopeIcon className="h-5 w-5 text-gray-400" />
 <div>
 <p className="text-sm font-medium text-gray-900">Email</p>
 <a href={`mailto:${teamMember.email}`} className="text-sm text-user-blue hover:text-primary-800">
 {teamMember.email}
 </a>
 </div>
 </div>
 {teamMember.phone && (
 <div className="flex items-center space-x-3">
 <PhoneIcon className="h-5 w-5 text-gray-400" />
 <div>
 <p className="text-sm font-medium text-gray-900">Phone</p>
 <a href={`tel:${teamMember.phone}`} className="text-sm text-user-blue hover:text-primary-800">
 {teamMember.phone}
 </a>
 </div>
 </div>
 )}
 <div className="flex items-center space-x-3">
 <GlobeAltIcon className="h-5 w-5 text-gray-400" />
 <div>
 <p className="text-sm font-medium text-gray-900">Timezone</p>
 <p className="text-sm text-gray-600">{teamMember.timezone}</p>
 </div>
 </div>
 </div>
 <div className="space-y-4">
 <div className="flex items-center space-x-3">
 <CalendarIcon className="h-5 w-5 text-gray-400" />
 <div>
 <p className="text-sm font-medium text-gray-900">Joined</p>
 <p className="text-sm text-gray-600">{formatDate(teamMember.created_at)}</p>
 </div>
 </div>
 {teamMember.last_login && (
 <div className="flex items-center space-x-3">
 <ClockIcon className="h-5 w-5 text-gray-400" />
 <div>
 <p className="text-sm font-medium text-gray-900">Last Login</p>
 <p className="text-sm text-gray-600">{formatDate(teamMember.last_login)}</p>
 </div>
 </div>
 )}
 <div className="flex items-center space-x-3">
 <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
 <div>
 <p className="text-sm font-medium text-gray-900">Organization</p>
 <p className="text-sm text-gray-600">{teamMember.organization_name}</p>
 </div>
 </div>
 </div>
 </div>
 {teamMember.bio && (
 <div className="mt-6 pt-6 border-t border-gray-200">
 <p className="text-sm font-medium text-gray-900 mb-2">Bio</p>
 <p className="text-sm text-gray-600">{teamMember.bio}</p>
 </div>
 )}
 </div>

 {/* Performance Overview */}
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Overview</h3>
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-sm font-medium text-gray-700">Task Completion Rate</span>
 <span className="text-sm font-medium text-gray-900">{stats.avgTaskCompletion.toFixed(1)}%</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div 
 className="bg-blue-600 h-2 rounded-full transition-all duration-300"
 style={{ width: `${stats.avgTaskCompletion}%` }}
 ></div>
 </div>
 
 <div className="grid grid-cols-2 gap-4 mt-4">
 <div className="text-center">
 <div className="text-2xl font-bold text-blue-600">{stats.activeProjects}</div>
 <div className="text-sm text-gray-500">Active Projects</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold text-orange-600">{stats.activeTasks}</div>
 <div className="text-sm text-gray-500">Active Tasks</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Projects Tab */}
 {activeTab === 'projects' && (
 <div className="space-y-6">
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Projects</h3>
 {memberProjects.length === 0 ? (
 <div className="text-center py-8">
 <FolderIcon className="mx-auto h-8 w-8 text-gray-400" />
 <p className="text-sm text-gray-500 mt-2">No projects found</p>
 </div>
 ) : (
 <div className="space-y-4">
 {memberProjects.map((project) => (
 <div key={project.id} className="border border-secondary-200 rounded-lg p-4 hover:bg-secondary-50 cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
 <div className="flex items-center justify-between">
 <div>
 <h4 className="text-sm font-medium text-gray-900">{project.name}</h4>
 <p className="text-sm text-gray-600">{project.description}</p>
 <div className="flex items-center space-x-2 mt-2">
 <span className="text-xs px-2 bg-blue-100 text-blue-800 rounded-full">{project.status}</span>
 <span className="text-xs px-2 bg-orange-100 text-orange-800 rounded-full">{project.priority}</span>
 </div>
 </div>
 <button
 onClick={(e) => {
 e.stopPropagation();
 navigate(`/projects/${project.id}`);
 }}
 className="text-user-blue hover:text-primary-800 text-sm"
 >
 View Project
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )}

 {/* Tasks Tab */}
 {activeTab === 'tasks' && (
 <div className="space-y-6">
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Tasks</h3>
 {memberTasks.length === 0 ? (
 <div className="text-center py-8">
 <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400" />
 <p className="text-sm text-gray-500 mt-2">No tasks found</p>
 </div>
 ) : (
 <div className="space-y-4">
 {memberTasks.map((task) => (
 <div key={task.id} className="border border-secondary-200 rounded-lg p-4 hover:bg-secondary-50 cursor-pointer" onClick={() => navigate(`/tasks/${task.id}`)}>
 <div className="flex items-center justify-between">
 <div>
 <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
 <p className="text-sm text-gray-600">{task.description}</p>
 <div className="flex items-center space-x-2 mt-2">
 <span className="text-xs px-2 bg-blue-100 text-blue-800 rounded-full">{task.status}</span>
 <span className="text-xs px-2 bg-orange-100 text-orange-800 rounded-full">{task.priority}</span>
 {task.estimated_hours && (
 <span className="text-xs text-gray-500">{task.estimated_hours}h</span>
 )}
 </div>
 </div>
 <button
 onClick={(e) => {
 e.stopPropagation();
 navigate(`/tasks/${task.id}`);
 }}
 className="text-user-blue hover:text-primary-800 text-sm"
 >
 View Task
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )}

 {/* Activity Tab */}
{activeTab === 'activity' && teamMember && (
 <div className="space-y-6">
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
 <ActivityStream userId={teamMember.id} maxItems={25} />
 </div>
 </div>
 )}

 {/* Edit Tab */}
{activeTab === 'edit' && teamMember && (
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-6">Edit Team Member</h3>
 <form onSubmit={handleUpdateMember} className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* First/Last Name */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
 <input type="text" required value={editForm.first_name || ''} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
 <input type="text" required value={editForm.last_name || ''} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
 </div>

 {/* Username & Email */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
 <input type="text" required value={editForm.username || ''} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
 <input type="email" required value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
 </div>

 {/* Password */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
 <input type="password" placeholder="Leave blank to keep current password" value={editForm.password || ''} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
 </div>

 {/* Role & Status */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
 <select value={(editForm.role as any) || (teamMember.role as any) || 'member'} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any as UserRole })} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent">
 <option value="member">Member</option>
 <option value="manager">Manager</option>
 <option value="admin">Admin</option>
 <option value="client">Client</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
 <select value={(editForm.status as any) || (teamMember.status as any) || 'active'} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any as UserStatus })} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent">
 <option value="active">Active</option>
 <option value="inactive">Inactive</option>
 <option value="pending">Pending</option>
 <option value="suspended">Suspended</option>
 </select>
 </div>

 {/* RBAC Role */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">RBAC Role</label>
 <select value={(editForm.role_id as any) || (teamMember.role_id as any) || ''} onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent">
 <option value="">None</option>
 {(roles || []).map((r) => (
 <option key={r.id} value={r.id}>{r.name}</option>
 ))}
 </select>
 </div>

 {/* Phone & Timezone */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
 <input type="tel" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
 <input type="text" value={editForm.timezone || ''} onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
 </div>

 {/* Address */}
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
 <input type="text" value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
 </div>

 {/* Expiry Dates */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">ID Expiry</label>
 <input type="date" value={(editForm as any).id_expiry_date || (teamMember as any).id_expiry_date || ''} onChange={(e) => setEditForm({ ...editForm, id_expiry_date: e.target.value } as any)} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Visa Expiry</label>
 <input type="date" value={(editForm as any).visa_expiry_date || (teamMember as any).visa_expiry_date || ''} onChange={(e) => setEditForm({ ...editForm, visa_expiry_date: e.target.value } as any)} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Passport Expiry</label>
 <input type="date" value={(editForm as any).passport_expiry_date || (teamMember as any).passport_expiry_date || ''} onChange={(e) => setEditForm({ ...editForm, passport_expiry_date: e.target.value } as any)} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Contract Expiry</label>
 <input type="date" value={(editForm as any).contract_expiry_date || (teamMember as any).contract_expiry_date || ''} onChange={(e) => setEditForm({ ...editForm, contract_expiry_date: e.target.value } as any)} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
 </div>
 </div>

 {/* Bio */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
 <textarea rows={4} value={editForm.bio || ''} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Add a bio for this team member..." />
 </div>

 {/* Skills */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
 <div className="flex items-center space-x-2">
 <input type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} className="flex-1 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Add a skill and press Add" />
 <button type="button" onClick={() => { if (skillInput.trim()) { setSkills([...skills, skillInput.trim()]); setSkillInput(''); } }} className="py-2 bg-secondary-100 text-secondary-800 rounded-md">Add</button>
 </div>
 {skills.length > 0 && (
 <div className="mt-2 flex flex-wrap gap-2">
 {skills.map((s, idx) => (
 <span key={`${s}-${idx}`} className="inline-flex items-center px-2 rounded-full text-xs bg-blue-100 text-blue-800">
 {s}
 <button type="button" className="ml-1 text-blue-800" onClick={() => setSkills(skills.filter((x, i) => i !== idx))}>×</button>
 </span>
 ))}
 </div>
 )}
 </div>

 {/* Attachments */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
 <input type="file" multiple onChange={(e) => setNewFiles(Array.from(e.target.files || []))} className="block w-full text-sm text-gray-600" />
 {attachments && attachments.length > 0 && (
 <div className="mt-3 border border-gray-200 rounded-md divide-y">
 {attachments.map((att) => (
 <div key={att.id} className="p-2 text-sm flex items-center justify-between">
 <span className="truncate mr-2">{att.original_filename || att.filename || att.file_path || 'Attachment'}</span>
 {att.file_path && (
 <a href={att.file_path} target="_blank" rel="noreferrer" className="text-user-blue hover:text-primary-800">View</a>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
 <button type="button" onClick={() => setActiveTab('overview')} className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-50 transition-colors">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Update Member</button>
 </div>
 </form>
 </div>
 )}
 </div>

 {/* Sidebar */}
 <div className="space-y-8">
 {/* Member Stats */}
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:p-6">
 <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Member Stats</h3>
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-500">Total Projects</span>
 <span className="text-sm font-medium text-gray-900">{stats.totalProjects}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-500">Active Projects</span>
 <span className="text-sm font-medium text-blue-600">{stats.activeProjects}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-500">Completed Tasks</span>
 <span className="text-sm font-medium text-green-600">{stats.completedTasks}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-500">Active Tasks</span>
 <span className="text-sm font-medium text-blue-600">{stats.activeTasks}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-500">Efficiency</span>
 <span className="text-sm font-medium text-gray-900">{stats.efficiency}%</span>
 </div>
 </div>
 </div>
 </div>

 {/* Performance Level */}
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:p-6">
 <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Performance</h3>
 <div className="space-y-3">
 <div className="flex items-center space-x-2">
 <performance.icon className={`h-5 w-5 ${performance.color}`} />
 <span className="text-sm text-gray-600">Level: {performance.level}</span>
 </div>
 <div className="space-y-2">
 <div className="flex justify-between text-sm">
 <span className="text-gray-500">Efficiency</span>
 <span className="font-medium">{stats.efficiency}%</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div 
 className="bg-blue-600 h-2 rounded-full transition-all duration-300"
 style={{ width: `${stats.efficiency}%` }}
 ></div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Contact Info */}
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:p-6">
 <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Contact Info</h3>
 <div className="space-y-3">
 <div className="flex items-center space-x-3">
 <EnvelopeIcon className="h-5 w-5 text-gray-400" />
 <div className="flex-1 min-w-0">
 <p className="text-sm text-gray-900 truncate">{teamMember.email}</p>
 </div>
 </div>
 {teamMember.phone && (
 <div className="flex items-center space-x-3">
 <PhoneIcon className="h-5 w-5 text-gray-400" />
 <div className="flex-1 min-w-0">
 <p className="text-sm text-gray-900">{teamMember.phone}</p>
 </div>
 </div>
 )}
 {(teamMember as any).location && (
 <div className="flex items-center space-x-3">
 <MapPinIcon className="h-5 w-5 text-gray-400" />
 <div className="flex-1 min-w-0">
 <p className="text-sm text-gray-900">{(teamMember as any).location}</p>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Compliance & Expiry Indicators */}
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:p-6">
 <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Compliance & Documents</h3>
 <div className="space-y-3">
 {(() => {
 const items: {label: string; date?: string}[] = [
 { label: 'ID Expiry', date: (teamMember as any).id_expiry_date },
 { label: 'Visa Expiry', date: (teamMember as any).visa_expiry_date },
 { label: 'Passport Expiry', date: (teamMember as any).passport_expiry_date },
 { label: 'Contract Expiry', date: (teamMember as any).contract_expiry_date },
 ];
 const now = new Date();
 const daysDiff = (d: Date) => Math.ceil((d.getTime() - now.getTime()) / (1000*60*60*24));
 return items.map((it) => {
 if (!it.date) return (
 <div key={it.label} className="flex items-center justify-between">
 <span className="text-sm text-gray-500">{it.label}</span>
 <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">Not set</span>
 </div>
 );
 const d = new Date(it.date);
 const dd = daysDiff(d);
 let badge = { text: '', className: '' } as any;
 if (dd < 0) badge = { text: `Overdue by ${Math.abs(dd)}d`, className: 'bg-red-100 text-red-700' };
 else if (dd <= 7) badge = { text: `Due in ${dd}d`, className: 'bg-yellow-100 text-yellow-800' };
 else badge = { text: `In ${dd}d`, className: 'bg-green-100 text-green-700' };
 return (
 <div key={it.label} className="flex items-center justify-between">
 <span className="text-sm text-gray-700">{it.label}</span>
 <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>{badge.text}</span>
 </div>
 );
 });
 })()}
 </div>
 </div>
 </div>

{/* Recent Activity */}
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:p-6">
 <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
 {teamMember && (
 <ActivityStream userId={teamMember.id} compact maxItems={8} showSources={false} />
 )}
 </div>
 </div>

 </div>
 </div>
 </div>
 );
};

export default TeamDetailOverviewPage;
