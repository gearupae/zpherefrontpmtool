import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { 
 PlusIcon, 
 EyeIcon, 
 PencilIcon, 
 TrashIcon, 
 ArrowRightIcon,
 UserGroupIcon,
 ClockIcon,
 DocumentTextIcon,
 CheckCircleIcon,
 ExclamationTriangleIcon,
 MagnifyingGlassIcon,
 FunnelIcon,
 ArrowPathIcon
} from '@heroicons/react/24/outline';

interface HandoffSummary {
 id: string;
 title: string;
 summary_content: string;
 handoff_type: 'PHASE_TRANSITION' | 'TEAM_TRANSFER' | 'ROLE_CHANGE' | 'PROJECT_HANDOVER' | 'KNOWLEDGE_TRANSFER';
 from_user_id: string;
 from_user_name: string;
 to_user_id: string;
 to_user_name: string;
 from_phase?: string;
 to_phase?: string;
 context_items: string[];
 key_decisions: string[];
 action_items: string[];
 risks_and_blockers: string[];
 recommended_next_steps: string[];
 status: 'DRAFT' | 'PENDING_REVIEW' | 'REVIEWED' | 'ACKNOWLEDGED' | 'COMPLETED';
 priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
 project_id: string;
 project_name: string;
 task_id?: string;
 task_title?: string;
 handoff_date: string;
 acknowledgment_date?: string;
 auto_generated: boolean;
 tags: string[];
 attachments: string[];
 created_at: string;
 updated_at: string;
}

interface HandoffSummaryFormData {
 title: string;
 summary_content: string;
 handoff_type: 'PHASE_TRANSITION' | 'TEAM_TRANSFER' | 'ROLE_CHANGE' | 'PROJECT_HANDOVER' | 'KNOWLEDGE_TRANSFER';
 to_user_id: string;
 from_phase: string;
 to_phase: string;
 context_items: string[];
 key_decisions: string[];
 action_items: string[];
 risks_and_blockers: string[];
 recommended_next_steps: string[];
 priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
 project_id: string;
 task_id: string;
 handoff_date: string;
 tags: string[];
}

interface HandoffSummariesSystemProps {
 projectId?: string;
 taskId?: string;
 userId?: string;
 showCreateButton?: boolean;
 filterByUser?: 'from' | 'to' | 'all';
 compact?: boolean;
}

const HandoffSummariesSystem: React.FC<HandoffSummariesSystemProps> = ({
 projectId,
 taskId,
 userId,
 showCreateButton = true,
 filterByUser = 'all',
 compact = false
}) => {
 const [handoffSummaries, setHandoffSummaries] = useState<HandoffSummary[]>([]);
 const [users, setUsers] = useState<any[]>([]);
 const [projects, setProjects] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [showDetails, setShowDetails] = useState(false);
 const [selectedSummary, setSelectedSummary] = useState<HandoffSummary | null>(null);
 const [editingSummary, setEditingSummary] = useState<HandoffSummary | null>(null);
 const [searchTerm, setSearchTerm] = useState('');
 const [filterType, setFilterType] = useState<string>('ALL');
 const [filterStatus, setFilterStatus] = useState<string>('ALL');

 const [formData, setFormData] = useState<HandoffSummaryFormData>({
 title: '',
 summary_content: '',
 handoff_type: 'TEAM_TRANSFER',
 to_user_id: '',
 from_phase: '',
 to_phase: '',
 context_items: [''],
 key_decisions: [''],
 action_items: [''],
 risks_and_blockers: [''],
 recommended_next_steps: [''],
 priority: 'MEDIUM',
 project_id: projectId || '',
 task_id: taskId || '',
 handoff_date: new Date().toISOString().split('T')[0],
 tags: [],
 });

 const [newTag, setNewTag] = useState('');

 useEffect(() => {
 fetchData();
 }, [projectId, taskId, userId]);

 const fetchData = async () => {
 try {
 setLoading(true);
 await fetchHandoffSummaries();
 
 const [usersResponse, projectsResponse] = await Promise.all([
 apiClient.get('/users/').catch(() => ({ data: [] })),
 apiClient.get('/projects/').catch(() => ({ data: [] })),
 ]);
 
 setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
 setProjects(Array.isArray(projectsResponse.data) ? projectsResponse.data : []);
 } catch (error) {
 console.error('Error fetching data:', error);
 setUsers([]);
 setProjects([]);
 } finally {
 setLoading(false);
 }
 };

 const fetchHandoffSummaries = async () => {
 try {
 let url = '/handoff-summaries/';
 const params = new URLSearchParams();
 
 if (projectId) params.append('project_id', projectId);
 if (taskId) params.append('task_id', taskId);
 if (userId && filterByUser !== 'all') {
 if (filterByUser === 'from') params.append('from_user_id', userId);
 if (filterByUser === 'to') params.append('to_user_id', userId);
 }
 
 if (params.toString()) url += `?${params.toString()}`;
 
 const response = await apiClient.get(url);
 setHandoffSummaries(Array.isArray(response.data) ? response.data : []);
 } catch (error) {
 console.error('Error fetching handoff summaries:', error);
 setHandoffSummaries([]);
 }
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 const submitData = {
 ...formData,
 context_items: formData.context_items.filter(item => item.trim()),
 key_decisions: formData.key_decisions.filter(item => item.trim()),
 action_items: formData.action_items.filter(item => item.trim()),
 risks_and_blockers: formData.risks_and_blockers.filter(item => item.trim()),
 recommended_next_steps: formData.recommended_next_steps.filter(item => item.trim()),
 };

 if (editingSummary) {
 await apiClient.put(`/handoff-summaries/${editingSummary.id}`, submitData);
 } else {
 await apiClient.post('/handoff-summaries/', submitData);
 }
 
 await fetchHandoffSummaries();
 resetForm();
 } catch (error) {
 console.error('Error saving handoff summary:', error);
 }
 };

 const handleEdit = (summary: HandoffSummary) => {
 setEditingSummary(summary);
 setFormData({
 title: summary.title,
 summary_content: summary.summary_content,
 handoff_type: summary.handoff_type,
 to_user_id: summary.to_user_id,
 from_phase: summary.from_phase || '',
 to_phase: summary.to_phase || '',
 context_items: summary.context_items.length > 0 ? summary.context_items : [''],
 key_decisions: summary.key_decisions.length > 0 ? summary.key_decisions : [''],
 action_items: summary.action_items.length > 0 ? summary.action_items : [''],
 risks_and_blockers: summary.risks_and_blockers.length > 0 ? summary.risks_and_blockers : [''],
 recommended_next_steps: summary.recommended_next_steps.length > 0 ? summary.recommended_next_steps : [''],
 priority: summary.priority,
 project_id: summary.project_id,
 task_id: summary.task_id || '',
 handoff_date: summary.handoff_date.split('T')[0],
 tags: summary.tags,
 });
 setShowForm(true);
 };

 const handleDelete = async (id: string) => {
 if (window.confirm('Are you sure you want to delete this handoff summary?')) {
 try {
 await apiClient.delete(`/handoff-summaries/${id}`);
 await fetchHandoffSummaries();
 } catch (error) {
 console.error('Error deleting handoff summary:', error);
 }
 }
 };

 const handleStatusChange = async (id: string, status: string) => {
 try {
 await apiClient.patch(`/handoff-summaries/${id}/status`, { status });
 await fetchHandoffSummaries();
 } catch (error) {
 console.error('Error updating status:', error);
 }
 };

 const handleAcknowledge = async (id: string) => {
 try {
 await apiClient.post(`/handoff-summaries/${id}/acknowledge`);
 await fetchHandoffSummaries();
 } catch (error) {
 console.error('Error acknowledging handoff:', error);
 }
 };

 const resetForm = () => {
 setFormData({
 title: '',
 summary_content: '',
 handoff_type: 'TEAM_TRANSFER',
 to_user_id: '',
 from_phase: '',
 to_phase: '',
 context_items: [''],
 key_decisions: [''],
 action_items: [''],
 risks_and_blockers: [''],
 recommended_next_steps: [''],
 priority: 'MEDIUM',
 project_id: projectId || '',
 task_id: taskId || '',
 handoff_date: new Date().toISOString().split('T')[0],
 tags: [],
 });
 setEditingSummary(null);
 setShowForm(false);
 };

 const addListItem = (field: keyof HandoffSummaryFormData, value: string) => {
 if (value.trim()) {
 setFormData(prev => ({
 ...prev,
 [field]: [...(prev[field] as string[]), value.trim()]
 }));
 }
 };

 const removeListItem = (field: keyof HandoffSummaryFormData, index: number) => {
 setFormData(prev => ({
 ...prev,
 [field]: (prev[field] as string[]).filter((_, i) => i !== index)
 }));
 };

 const updateListItem = (field: keyof HandoffSummaryFormData, index: number, value: string) => {
 setFormData(prev => ({
 ...prev,
 [field]: (prev[field] as string[]).map((item, i) => i === index ? value : item)
 }));
 };

 const addTag = () => {
 if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
 setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
 setNewTag('');
 }
 };

 const removeTag = (tagToRemove: string) => {
 setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) });
 };

 const getTypeIcon = (type: string) => {
 const icons = {
 PHASE_TRANSITION: ArrowRightIcon,
 TEAM_TRANSFER: UserGroupIcon,
 ROLE_CHANGE: ArrowPathIcon,
 PROJECT_HANDOVER: DocumentTextIcon,
 KNOWLEDGE_TRANSFER: DocumentTextIcon,
 };
 const IconComponent = icons[type as keyof typeof icons] || DocumentTextIcon;
 return <IconComponent className="h-5 w-5" />;
 };

 const getTypeColor = (type: string) => {
 const colors = {
 PHASE_TRANSITION: 'bg-blue-100 text-blue-800',
 TEAM_TRANSFER: 'bg-green-100 text-green-800',
 ROLE_CHANGE: 'bg-purple-100 text-purple-800',
 PROJECT_HANDOVER: 'bg-orange-100 text-orange-800',
 KNOWLEDGE_TRANSFER: 'bg-indigo-100 text-indigo-800',
 };
 return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
 };

 const getStatusColor = (status: string) => {
 const colors = {
 DRAFT: 'bg-gray-100 text-gray-800',
 PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
 REVIEWED: 'bg-blue-100 text-blue-800',
 ACKNOWLEDGED: 'bg-green-100 text-green-800',
 COMPLETED: 'bg-green-100 text-green-800',
 };
 return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
 };

 const getPriorityColor = (priority: string) => {
 const colors = {
 LOW: 'bg-gray-100 text-gray-800',
 MEDIUM: 'bg-yellow-100 text-yellow-800',
 HIGH: 'bg-orange-100 text-orange-800',
 CRITICAL: 'bg-red-100 text-red-800',
 };
 return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
 };

 const filteredSummaries = handoffSummaries.filter(summary => {
 const matchesSearch = 
 summary.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
 summary.summary_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
 summary.from_user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 summary.to_user_name.toLowerCase().includes(searchTerm.toLowerCase());
 
 const matchesType = filterType === 'ALL' || summary.handoff_type === filterType;
 const matchesStatus = filterStatus === 'ALL' || summary.status === filterStatus;
 
 return matchesSearch && matchesType && matchesStatus;
 });

 if (loading) {
 return (
 <div className="flex justify-center items-center h-32">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
 </div>
 );
 }

 if (compact) {
 return (
 <div className="space-y-3">
 {showCreateButton && (
 <button
 onClick={() => setShowForm(true)}
 className="w-full bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-lg p-3 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center gap-2"
 >
 <PlusIcon className="h-4 w-4" />
 Create Handoff Summary
 </button>
 )}
 
 {filteredSummaries.slice(0, 3).map((summary) => (
 <div key={summary.id} className="bg-white border rounded-lg p-4 hover:shadow-sm">
 <div className="flex items-start justify-between mb-2">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 {getTypeIcon(summary.handoff_type)}
 <h4 className="text-sm font-medium text-gray-900">{summary.title}</h4>
 </div>
 <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
 <span>{summary.from_user_name}</span>
 <ArrowRightIcon className="h-3 w-3" />
 <span>{summary.to_user_name}</span>
 <span>•</span>
 <span>{new Date(summary.handoff_date).toLocaleDateString()}</span>
 </div>
 <p className="text-xs text-gray-600 line-clamp-2">{summary.summary_content}</p>
 </div>
 <button
 onClick={() => {
 setSelectedSummary(summary);
 setShowDetails(true);
 }}
 className="text-gray-400 hover:text-gray-600"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 </div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1">
 <span className={`inline-flex px-1.5 py-0.5 text-xs rounded ${getTypeColor(summary.handoff_type)}`}>
 {summary.handoff_type.replace('_', ' ')}
 </span>
 <span className={`inline-flex px-1.5 py-0.5 text-xs rounded ${getStatusColor(summary.status)}`}>
 {summary.status.replace('_', ' ')}
 </span>
 </div>
 {summary.status === 'PENDING_REVIEW' && (
 <button
 onClick={() => handleAcknowledge(summary.id)}
 className="text-xs text-green-600 hover:text-green-800"
 >
 Acknowledge
 </button>
 )}
 </div>
 </div>
 ))}
 
 {filteredSummaries.length > 3 && (
 <div className="text-center">
 <button className="text-sm text-indigo-600 hover:text-indigo-800">
 View all {filteredSummaries.length} handoff summaries
 </button>
 </div>
 )}
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-2xl font-bold text-gray-900">Handoff Summaries</h2>
 <p className="text-gray-600">Automated context transfer between team members and phases</p>
 </div>
 {showCreateButton && (
 <button
 onClick={() => setShowForm(true)}
 className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
 >
 <PlusIcon className="h-5 w-5" />
 Create Handoff Summary
 </button>
 )}
 </div>

 {/* Filters */}
 <div className="flex gap-4">
 <div className="flex-1 relative">
 <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
 <input
 type="text"
 placeholder="Search handoff summaries..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500"
 />
 </div>
 <select
 value={filterType}
 onChange={(e) => setFilterType(e.target.value)}
 className="py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 >
 <option value="ALL">All Types</option>
 <option value="PHASE_TRANSITION">Phase Transition</option>
 <option value="TEAM_TRANSFER">Team Transfer</option>
 <option value="ROLE_CHANGE">Role Change</option>
 <option value="PROJECT_HANDOVER">Project Handover</option>
 <option value="KNOWLEDGE_TRANSFER">Knowledge Transfer</option>
 </select>
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value)}
 className="py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 >
 <option value="ALL">All Status</option>
 <option value="DRAFT">Draft</option>
 <option value="PENDING_REVIEW">Pending Review</option>
 <option value="REVIEWED">Reviewed</option>
 <option value="ACKNOWLEDGED">Acknowledged</option>
 <option value="COMPLETED">Completed</option>
 </select>
 </div>

 {/* Handoff Summaries List */}
 <div className="space-y-4">
 {filteredSummaries.map((summary) => (
 <div key={summary.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
 <div className="flex items-start justify-between mb-4">
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-2">
 {getTypeIcon(summary.handoff_type)}
 <h3 className="text-lg font-semibold text-gray-900">{summary.title}</h3>
 <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getTypeColor(summary.handoff_type)}`}>
 {summary.handoff_type.replace('_', ' ')}
 </span>
 <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getPriorityColor(summary.priority)}`}>
 {summary.priority}
 </span>
 </div>
 <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
 <div className="flex items-center gap-2">
 <span>{summary.from_user_name}</span>
 <ArrowRightIcon className="h-4 w-4" />
 <span>{summary.to_user_name}</span>
 </div>
 <span>•</span>
 <span>{new Date(summary.handoff_date).toLocaleDateString()}</span>
 {summary.project_name && (
 <>
 <span>•</span>
 <span>{summary.project_name}</span>
 </>
 )}
 </div>
 <p className="text-gray-700 mb-3 line-clamp-2">{summary.summary_content}</p>
 
 {summary.tags.length > 0 && (
 <div className="flex flex-wrap gap-1 mb-3">
 {summary.tags.slice(0, 3).map(tag => (
 <span key={tag} className="inline-flex px-2 text-xs rounded bg-gray-100 text-gray-700">
 {tag}
 </span>
 ))}
 {summary.tags.length > 3 && (
 <span className="inline-flex px-2 text-xs rounded bg-gray-100 text-gray-500">
 +{summary.tags.length - 3}
 </span>
 )}
 </div>
 )}
 </div>
 
 <div className="flex items-center gap-2">
 <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getStatusColor(summary.status)}`}>
 {summary.status.replace('_', ' ')}
 </span>
 {summary.auto_generated && (
 <span className="inline-flex px-2 text-xs rounded-full bg-blue-100 text-blue-800">
 Auto
 </span>
 )}
 </div>
 </div>

 <div className="flex items-center justify-between pt-4 border-t">
 <div className="flex items-center gap-4">
 {summary.action_items.length > 0 && (
 <span className="text-xs text-gray-500">
 {summary.action_items.length} action items
 </span>
 )}
 {summary.risks_and_blockers.length > 0 && (
 <span className="text-xs text-orange-600">
 {summary.risks_and_blockers.length} risks/blockers
 </span>
 )}
 </div>
 
 <div className="flex space-x-2">
 {summary.status === 'PENDING_REVIEW' && (
 <button
 onClick={() => handleAcknowledge(summary.id)}
 className="text-green-600 hover:text-green-900 text-sm"
 >
 <CheckCircleIcon className="h-4 w-4" />
 </button>
 )}
 <button
 onClick={() => {
 setSelectedSummary(summary);
 setShowDetails(true);
 }}
 className="text-blue-600 hover:text-blue-900"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleEdit(summary)}
 className="text-indigo-600 hover:text-indigo-900"
 >
 <PencilIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDelete(summary.id)}
 className="text-red-600 hover:text-red-900"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>

 {filteredSummaries.length === 0 && (
 <div className="text-center2">
 <ArrowRightIcon className="mx-auto h-12 w-12 text-gray-400" />
 <h3 className="mt-2 text-sm font-medium text-gray-900">No handoff summaries</h3>
 <p className="mt-1 text-sm text-gray-500">
 Create handoff summaries to ensure smooth context transfer between team members.
 </p>
 {showCreateButton && (
 <button
 onClick={() => setShowForm(true)}
 className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
 >
 Create Your First Handoff Summary
 </button>
 )}
 </div>
 )}

 {/* Handoff Summary Form Modal */}
 {showForm && (
 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-medium text-gray-900 mb-4">
 {editingSummary ? 'Edit Handoff Summary' : 'Create New Handoff Summary'}
 </h3>

 <form onSubmit={handleSubmit} className="space-y-6">
 {/* Basic Information */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Title *
 </label>
 <input
 type="text"
 required
 value={formData.title}
 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Handoff Type *
 </label>
 <select
 required
 value={formData.handoff_type}
 onChange={(e) => setFormData({ ...formData, handoff_type: e.target.value as any })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 >
 <option value="PHASE_TRANSITION">Phase Transition</option>
 <option value="TEAM_TRANSFER">Team Transfer</option>
 <option value="ROLE_CHANGE">Role Change</option>
 <option value="PROJECT_HANDOVER">Project Handover</option>
 <option value="KNOWLEDGE_TRANSFER">Knowledge Transfer</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Handoff To *
 </label>
 <select
 required
 value={formData.to_user_id}
 onChange={(e) => setFormData({ ...formData, to_user_id: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 >
 <option value="">Select User</option>
 {users.map((user) => (
 <option key={user.id} value={user.id}>
 {user.first_name} {user.last_name} ({user.email})
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Priority
 </label>
 <select
 value={formData.priority}
 onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 >
 <option value="LOW">Low</option>
 <option value="MEDIUM">Medium</option>
 <option value="HIGH">High</option>
 <option value="CRITICAL">Critical</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Handoff Date
 </label>
 <input
 type="date"
 value={formData.handoff_date}
 onChange={(e) => setFormData({ ...formData, handoff_date: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 />
 </div>
 </div>

 {formData.handoff_type === 'PHASE_TRANSITION' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 From Phase
 </label>
 <input
 type="text"
 value={formData.from_phase}
 onChange={(e) => setFormData({ ...formData, from_phase: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 placeholder="e.g., Development Phase"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 To Phase
 </label>
 <input
 type="text"
 value={formData.to_phase}
 onChange={(e) => setFormData({ ...formData, to_phase: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 placeholder="e.g., Testing Phase"
 />
 </div>
 </div>
 )}

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Summary Content *
 </label>
 <textarea
 required
 value={formData.summary_content}
 onChange={(e) => setFormData({ ...formData, summary_content: e.target.value })}
 rows={4}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 placeholder="Provide a comprehensive summary of what's being handed off..."
 />
 </div>

 {/* Dynamic Lists */}
 {[
 { field: 'context_items' as keyof HandoffSummaryFormData, label: 'Context Items', placeholder: 'Add important context...' },
 { field: 'key_decisions' as keyof HandoffSummaryFormData, label: 'Key Decisions', placeholder: 'Add key decision...' },
 { field: 'action_items' as keyof HandoffSummaryFormData, label: 'Action Items', placeholder: 'Add action item...' },
 { field: 'risks_and_blockers' as keyof HandoffSummaryFormData, label: 'Risks & Blockers', placeholder: 'Add risk or blocker...' },
 { field: 'recommended_next_steps' as keyof HandoffSummaryFormData, label: 'Recommended Next Steps', placeholder: 'Add next step...' },
 ].map(({ field, label, placeholder }) => (
 <div key={field}>
 <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
 <div className="space-y-2">
 {(formData[field] as string[]).map((item, index) => (
 <div key={index} className="flex gap-2">
 <input
 type="text"
 value={item}
 onChange={(e) => updateListItem(field, index, e.target.value)}
 className="flex-1 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 placeholder={placeholder}
 />
 <button
 type="button"
 onClick={() => removeListItem(field, index)}
 className="text-red-600 hover:text-red-800"
 >
 ×
 </button>
 </div>
 ))}
 <button
 type="button"
 onClick={() => addListItem(field, '')}
 className="text-indigo-600 hover:text-indigo-800 text-sm"
 >
 + Add {label.slice(0, -1)}
 </button>
 </div>
 </div>
 ))}

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Tags
 </label>
 <div className="flex gap-2 mb-2">
 <input
 type="text"
 value={newTag}
 onChange={(e) => setNewTag(e.target.value)}
 onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
 className="flex-1 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 placeholder="Add a tag..."
 />
 <button
 type="button"
 onClick={addTag}
 className="bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200"
 >
 Add
 </button>
 </div>
 <div className="flex flex-wrap gap-1">
 {formData.tags.map(tag => (
 <span key={tag} className="inline-flex items-center gap-1 px-2 text-xs rounded bg-indigo-100 text-indigo-700">
 {tag}
 <button
 type="button"
 onClick={() => removeTag(tag)}
 className="text-indigo-500 hover:text-indigo-700"
 >
 ×
 </button>
 </span>
 ))}
 </div>
 </div>

 <div className="flex justify-end space-x-3 pt-4">
 <button
 type="button"
 onClick={resetForm}
 className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
 >
 {editingSummary ? 'Update' : 'Create'} Handoff Summary
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Handoff Summary Details Modal */}
 {showDetails && selectedSummary && (
 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
 <div className="flex justify-between items-start mb-6">
 <div>
 <div className="flex items-center gap-3 mb-2">
 {getTypeIcon(selectedSummary.handoff_type)}
 <h3 className="text-xl font-semibold text-gray-900">{selectedSummary.title}</h3>
 <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getTypeColor(selectedSummary.handoff_type)}`}>
 {selectedSummary.handoff_type.replace('_', ' ')}
 </span>
 <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getStatusColor(selectedSummary.status)}`}>
 {selectedSummary.status.replace('_', ' ')}
 </span>
 </div>
 <div className="flex items-center gap-4 text-sm text-gray-600">
 <div className="flex items-center gap-2">
 <span>{selectedSummary.from_user_name}</span>
 <ArrowRightIcon className="h-4 w-4" />
 <span>{selectedSummary.to_user_name}</span>
 </div>
 <span>•</span>
 <span>{new Date(selectedSummary.handoff_date).toLocaleDateString()}</span>
 {selectedSummary.auto_generated && (
 <span className="inline-flex px-2 text-xs rounded-full bg-blue-100 text-blue-800">
 Auto-generated
 </span>
 )}
 </div>
 </div>
 <button
 onClick={() => setShowDetails(false)}
 className="text-gray-400 hover:text-gray-600"
 >
 ×
 </button>
 </div>

 <div className="space-y-6">
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
 <p className="text-gray-700 whitespace-pre-wrap">{selectedSummary.summary_content}</p>
 </div>

 {selectedSummary.context_items.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Context Items</h4>
 <ul className="list-disc list-inside space-y-1 text-gray-700">
 {selectedSummary.context_items.map((item, index) => (
 <li key={index}>{item}</li>
 ))}
 </ul>
 </div>
 )}

 {selectedSummary.key_decisions.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Key Decisions</h4>
 <ul className="list-disc list-inside space-y-1 text-gray-700">
 {selectedSummary.key_decisions.map((decision, index) => (
 <li key={index}>{decision}</li>
 ))}
 </ul>
 </div>
 )}

 {selectedSummary.action_items.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Action Items</h4>
 <ul className="list-disc list-inside space-y-1 text-gray-700">
 {selectedSummary.action_items.map((action, index) => (
 <li key={index}>{action}</li>
 ))}
 </ul>
 </div>
 )}

 {selectedSummary.risks_and_blockers.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Risks & Blockers</h4>
 <ul className="list-disc list-inside space-y-1 text-orange-700">
 {selectedSummary.risks_and_blockers.map((risk, index) => (
 <li key={index}>{risk}</li>
 ))}
 </ul>
 </div>
 )}

 {selectedSummary.recommended_next_steps.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Recommended Next Steps</h4>
 <ul className="list-disc list-inside space-y-1 text-gray-700">
 {selectedSummary.recommended_next_steps.map((step, index) => (
 <li key={index}>{step}</li>
 ))}
 </ul>
 </div>
 )}

 {selectedSummary.tags.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
 <div className="flex flex-wrap gap-1">
 {selectedSummary.tags.map(tag => (
 <span key={tag} className="inline-flex px-2 text-xs rounded bg-gray-100 text-gray-700">
 {tag}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>

 <div className="flex justify-end space-x-3 pt-6 border-t">
 {selectedSummary.status === 'PENDING_REVIEW' && (
 <button
 onClick={() => {
 handleAcknowledge(selectedSummary.id);
 setShowDetails(false);
 }}
 className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
 >
 Acknowledge
 </button>
 )}
 <button
 onClick={() => handleEdit(selectedSummary)}
 className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
 >
 Edit
 </button>
 <button
 onClick={() => setShowDetails(false)}
 className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};

export default HandoffSummariesSystem;
