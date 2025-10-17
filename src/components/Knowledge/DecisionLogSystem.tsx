import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { 
 PlusIcon, 
 EyeIcon, 
 PencilIcon, 
 TrashIcon, 
 LightBulbIcon,
 ExclamationTriangleIcon,
 CheckCircleIcon,
 XCircleIcon,
 ClockIcon,
 MagnifyingGlassIcon,
 FunnelIcon,
 ChartBarIcon,
 LinkIcon,
 TagIcon,
 CalendarIcon,
 UserIcon
} from '@heroicons/react/24/outline';

interface DecisionLogEntry {
 id: string;
 title: string;
 decision_summary: string;
 problem_statement: string;
 alternatives_considered: string[];
 decision_rationale: string;
 expected_outcomes: string[];
 actual_outcomes: string[];
 success_metrics: string[];
 decision_maker_id: string;
 decision_maker_name: string;
 stakeholders: string[];
 decision_date: string;
 review_date?: string;
 implementation_date?: string;
 status: 'PROPOSED' | 'APPROVED' | 'IMPLEMENTED' | 'UNDER_REVIEW' | 'REJECTED' | 'SUPERSEDED';
 impact_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
 decision_type: 'ARCHITECTURAL' | 'BUSINESS' | 'TECHNICAL' | 'PROCESS' | 'STRATEGIC' | 'OPERATIONAL';
 reversibility: 'REVERSIBLE' | 'PARTIALLY_REVERSIBLE' | 'IRREVERSIBLE';
 confidence_level: 'LOW' | 'MEDIUM' | 'HIGH';
 project_id?: string;
 project_name?: string;
 task_id?: string;
 task_title?: string;
 linked_context_cards: string[];
 linked_handoff_summaries: string[];
 tags: string[];
 lessons_learned: string[];
 follow_up_actions: string[];
 created_at: string;
 updated_at: string;
 created_by: string;
 created_by_name: string;
}

interface DecisionLogFormData {
 title: string;
 decision_summary: string;
 problem_statement: string;
 alternatives_considered: string[];
 decision_rationale: string;
 expected_outcomes: string[];
 success_metrics: string[];
 stakeholders: string[];
 decision_date: string;
 review_date: string;
 implementation_date: string;
 impact_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
 decision_type: 'ARCHITECTURAL' | 'BUSINESS' | 'TECHNICAL' | 'PROCESS' | 'STRATEGIC' | 'OPERATIONAL';
 reversibility: 'REVERSIBLE' | 'PARTIALLY_REVERSIBLE' | 'IRREVERSIBLE';
 confidence_level: 'LOW' | 'MEDIUM' | 'HIGH';
 project_id: string;
 task_id: string;
 tags: string[];
 follow_up_actions: string[];
}

interface DecisionLogSystemProps {
 projectId?: string;
 taskId?: string;
 showCreateButton?: boolean;
 compact?: boolean;
}

const DecisionLogSystem: React.FC<DecisionLogSystemProps> = ({
 projectId,
 taskId,
 showCreateButton = true,
 compact = false
}) => {
 const [decisions, setDecisions] = useState<DecisionLogEntry[]>([]);
 const [projects, setProjects] = useState<any[]>([]);
 const [users, setUsers] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [showDetails, setShowDetails] = useState(false);
 const [selectedDecision, setSelectedDecision] = useState<DecisionLogEntry | null>(null);
 const [editingDecision, setEditingDecision] = useState<DecisionLogEntry | null>(null);
 const [searchTerm, setSearchTerm] = useState('');
 const [filterType, setFilterType] = useState<string>('ALL');
 const [filterStatus, setFilterStatus] = useState<string>('ALL');
 const [filterImpact, setFilterImpact] = useState<string>('ALL');

 const [formData, setFormData] = useState<DecisionLogFormData>({
 title: '',
 decision_summary: '',
 problem_statement: '',
 alternatives_considered: [''],
 decision_rationale: '',
 expected_outcomes: [''],
 success_metrics: [''],
 stakeholders: [''],
 decision_date: new Date().toISOString().split('T')[0],
 review_date: '',
 implementation_date: '',
 impact_level: 'MEDIUM',
 decision_type: 'BUSINESS',
 reversibility: 'REVERSIBLE',
 confidence_level: 'MEDIUM',
 project_id: projectId || '',
 task_id: taskId || '',
 tags: [],
 follow_up_actions: [''],
 });

 const [newTag, setNewTag] = useState('');

 useEffect(() => {
 fetchData();
 }, [projectId, taskId]);

 const fetchData = async () => {
 try {
 setLoading(true);
 await fetchDecisions();
 
 const [projectsResponse, usersResponse] = await Promise.all([
 apiClient.get('/projects/').catch(() => ({ data: [] })),
 apiClient.get('/users/').catch(() => ({ data: [] })),
 ]);
 
 setProjects(Array.isArray(projectsResponse.data) ? projectsResponse.data : []);
 setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
 } catch (error) {
 console.error('Error fetching data:', error);
 setProjects([]);
 setUsers([]);
 } finally {
 setLoading(false);
 }
 };

 const fetchDecisions = async () => {
 try {
 let url = '/decision-logs/';
 const params = new URLSearchParams();
 
 if (projectId) params.append('project_id', projectId);
 if (taskId) params.append('task_id', taskId);
 
 if (params.toString()) url += `?${params.toString()}`;
 
 const response = await apiClient.get(url);
 setDecisions(Array.isArray(response.data) ? response.data : []);
 } catch (error) {
 console.error('Error fetching decisions:', error);
 setDecisions([]);
 }
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 // Map form fields to backend schema
 const payload: any = {
 title: formData.title,
 description: formData.decision_summary,
 category: (formData.decision_type || 'BUSINESS').toLowerCase(),
 impact_level: (formData.impact_level || 'MEDIUM').toLowerCase(),
 problem_statement: formData.problem_statement,
 rationale: formData.decision_rationale,
 alternatives_considered: formData.alternatives_considered.filter(item => item.trim()),
 success_criteria: formData.success_metrics.filter(item => item.trim()),
 stakeholders: formData.stakeholders.filter(item => item.trim()),
 follow_up_actions: formData.follow_up_actions.filter(item => item.trim()),
 project_id: formData.project_id,
 // Optional fields
 review_date: formData.review_date ? new Date(formData.review_date).toISOString() : undefined,
 implementation_date: formData.implementation_date ? new Date(formData.implementation_date).toISOString() : undefined,
 related_tasks: formData.task_id ? [formData.task_id] : undefined,
 };

 if (editingDecision) {
 await apiClient.put(`/decision-logs/${editingDecision.id}`, payload);
 } else {
 await apiClient.post('/decision-logs/', payload);
 }
 
 await fetchDecisions();
 resetForm();
 } catch (error) {
 console.error('Error saving decision:', error);
 }
 };

 const handleEdit = (decision: any) => {
 setEditingDecision(decision);
 setFormData({
 title: decision.title,
 decision_summary: decision.description || '',
 problem_statement: decision.problem_statement || '',
 alternatives_considered: Array.isArray(decision.alternatives_considered) && decision.alternatives_considered.length > 0 ? decision.alternatives_considered : [''],
 decision_rationale: decision.rationale || '',
 expected_outcomes: [],
 success_metrics: Array.isArray(decision.success_criteria) && decision.success_criteria.length > 0 ? decision.success_criteria : [''],
 stakeholders: Array.isArray(decision.stakeholders) && decision.stakeholders.length > 0 ? decision.stakeholders : [''],
 decision_date: decision.decision_date ? decision.decision_date.split('T')[0] : new Date().toISOString().split('T')[0],
 review_date: decision.review_date ? decision.review_date.split('T')[0] : '',
 implementation_date: decision.implementation_date ? decision.implementation_date.split('T')[0] : '',
 impact_level: (decision.impact_level || 'medium').toUpperCase(),
 decision_type: (decision.category || 'business').toUpperCase(),
 reversibility: 'REVERSIBLE',
 confidence_level: 'MEDIUM',
 project_id: decision.project_id || '',
 task_id: (Array.isArray(decision.related_tasks) && decision.related_tasks[0]) || '',
 tags: [],
 follow_up_actions: Array.isArray(decision.follow_up_actions) && decision.follow_up_actions.length > 0 ? decision.follow_up_actions : [''],
 });
 setShowForm(true);
 };

 const handleDelete = async (id: string) => {
 if (window.confirm('Are you sure you want to delete this decision log entry?')) {
 try {
 await apiClient.delete(`/decision-logs/${id}`);
 await fetchDecisions();
 } catch (error) {
 console.error('Error deleting decision:', error);
 }
 }
 };

 const handleStatusChange = async (id: string, status: string) => {
 try {
 const s = status.toUpperCase();
 if (s === 'APPROVED') {
 await apiClient.post(`/decision-logs/${id}/approve`);
 } else if (s === 'REJECTED') {
 const reason = window.prompt('Optional rejection reason:') || '';
 await apiClient.post(`/decision-logs/${id}/reject`, null, { params: { rejection_reason: reason } });
 } else if (s === 'IMPLEMENTED') {
 await apiClient.post(`/decision-logs/${id}/implement`);
 } else {
 // Fallback: generic update
 await apiClient.put(`/decision-logs/${id}`, { status: s });
 }
 await fetchDecisions();
 } catch (error) {
 console.error('Error updating status:', error);
 }
 };

 const handleOutcomeUpdate = async (id: string, outcomes: string[]) => {
 try {
 // Map to backend field (decision_outcome)
 await apiClient.put(`/decision-logs/${id}`, { decision_outcome: outcomes.join('; ') });
 await fetchDecisions();
 } catch (error) {
 console.error('Error updating outcomes:', error);
 }
 };

 const resetForm = () => {
 setFormData({
 title: '',
 decision_summary: '',
 problem_statement: '',
 alternatives_considered: [''],
 decision_rationale: '',
 expected_outcomes: [''],
 success_metrics: [''],
 stakeholders: [''],
 decision_date: new Date().toISOString().split('T')[0],
 review_date: '',
 implementation_date: '',
 impact_level: 'MEDIUM',
 decision_type: 'BUSINESS',
 reversibility: 'REVERSIBLE',
 confidence_level: 'MEDIUM',
 project_id: projectId || '',
 task_id: taskId || '',
 tags: [],
 follow_up_actions: [''],
 });
 setEditingDecision(null);
 setShowForm(false);
 };

 const addListItem = (field: keyof DecisionLogFormData, value: string) => {
 if (value.trim()) {
 setFormData(prev => ({
 ...prev,
 [field]: [...(prev[field] as string[]), value.trim()]
 }));
 }
 };

 const removeListItem = (field: keyof DecisionLogFormData, index: number) => {
 setFormData(prev => ({
 ...prev,
 [field]: (prev[field] as string[]).filter((_, i) => i !== index)
 }));
 };

 const updateListItem = (field: keyof DecisionLogFormData, index: number, value: string) => {
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

 const getStatusIcon = (status: string) => {
 const icons = {
 PROPOSED: ClockIcon,
 APPROVED: CheckCircleIcon,
 IMPLEMENTED: CheckCircleIcon,
 UNDER_REVIEW: ExclamationTriangleIcon,
 REJECTED: XCircleIcon,
 SUPERSEDED: XCircleIcon,
 };
 const IconComponent = icons[status as keyof typeof icons] || ClockIcon;
 return <IconComponent className="h-5 w-5" />;
 };

 const getStatusColor = (status: string) => {
 const colors = {
 PROPOSED: 'bg-yellow-100 text-yellow-800',
 APPROVED: 'bg-blue-100 text-blue-800',
 IMPLEMENTED: 'bg-green-100 text-green-800',
 UNDER_REVIEW: 'bg-orange-100 text-orange-800',
 REJECTED: 'bg-red-100 text-red-800',
 SUPERSEDED: 'bg-gray-100 text-gray-800',
 };
 return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
 };

 const getImpactColor = (impact: string) => {
 const colors = {
 LOW: 'bg-green-100 text-green-800',
 MEDIUM: 'bg-yellow-100 text-yellow-800',
 HIGH: 'bg-orange-100 text-orange-800',
 CRITICAL: 'bg-red-100 text-red-800',
 };
 return colors[impact as keyof typeof colors] || 'bg-gray-100 text-gray-800';
 };

 const getTypeColor = (type: string) => {
 const colors = {
 ARCHITECTURAL: 'bg-purple-100 text-purple-800',
 BUSINESS: 'bg-blue-100 text-blue-800',
 TECHNICAL: 'bg-indigo-100 text-indigo-800',
 PROCESS: 'bg-green-100 text-green-800',
 STRATEGIC: 'bg-red-100 text-red-800',
 OPERATIONAL: 'bg-orange-100 text-orange-800',
 };
 return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
 };

 const getReversibilityColor = (reversibility: string) => {
 const colors = {
 REVERSIBLE: 'bg-green-100 text-green-800',
 PARTIALLY_REVERSIBLE: 'bg-yellow-100 text-yellow-800',
 IRREVERSIBLE: 'bg-red-100 text-red-800',
 };
 return colors[reversibility as keyof typeof colors] || 'bg-gray-100 text-gray-800';
 };

 const filteredDecisions = decisions.filter(decision => {
 const matchesSearch = 
 decision.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
 decision.decision_summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
 decision.problem_statement.toLowerCase().includes(searchTerm.toLowerCase());
 
 const matchesType = filterType === 'ALL' || decision.decision_type === filterType;
 const matchesStatus = filterStatus === 'ALL' || decision.status === filterStatus;
 const matchesImpact = filterImpact === 'ALL' || decision.impact_level === filterImpact;
 
 return matchesSearch && matchesType && matchesStatus && matchesImpact;
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
 Log Decision
 </button>
 )}
 
 {filteredDecisions.slice(0, 3).map((decision) => (
 <div key={decision.id} className="bg-white border rounded-lg p-4 hover:shadow-sm">
 <div className="flex items-start justify-between mb-2">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 {getStatusIcon(decision.status)}
 <h4 className="text-sm font-medium text-gray-900">{decision.title}</h4>
 </div>
 <p className="text-xs text-gray-600 line-clamp-2">{decision.decision_summary}</p>
 <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
 <span>{decision.decision_maker_name}</span>
 <span>•</span>
 <span>{new Date(decision.decision_date).toLocaleDateString()}</span>
 </div>
 </div>
 <button
 onClick={() => {
 setSelectedDecision(decision);
 setShowDetails(true);
 }}
 className="text-gray-400 hover:text-gray-600"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 </div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1">
 <span className={`inline-flex px-1.5 py-0.5 text-xs rounded ${getStatusColor(decision.status)}`}>
 {decision.status}
 </span>
 <span className={`inline-flex px-1.5 py-0.5 text-xs rounded ${getImpactColor(decision.impact_level)}`}>
 {decision.impact_level}
 </span>
 </div>
 </div>
 </div>
 ))}
 
 {filteredDecisions.length > 3 && (
 <div className="text-center">
 <button className="text-sm text-indigo-600 hover:text-indigo-800">
 View all {filteredDecisions.length} decisions
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
 <h2 className="text-2xl font-bold text-gray-900">Decision Log</h2>
 <p className="text-gray-600">Track key project decisions with rationale and impact</p>
 </div>
 {showCreateButton && (
 <button
 onClick={() => setShowForm(true)}
 className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
 >
 <PlusIcon className="h-5 w-5" />
 Log Decision
 </button>
 )}
 </div>

 {/* Filters */}
 <div className="flex gap-4">
 <div className="flex-1 relative">
 <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
 <input
 type="text"
 placeholder="Search decisions..."
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
 <option value="ARCHITECTURAL">Architectural</option>
 <option value="BUSINESS">Business</option>
 <option value="TECHNICAL">Technical</option>
 <option value="PROCESS">Process</option>
 <option value="STRATEGIC">Strategic</option>
 <option value="OPERATIONAL">Operational</option>
 </select>
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value)}
 className="py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 >
 <option value="ALL">All Status</option>
 <option value="PROPOSED">Proposed</option>
 <option value="APPROVED">Approved</option>
 <option value="IMPLEMENTED">Implemented</option>
 <option value="UNDER_REVIEW">Under Review</option>
 <option value="REJECTED">Rejected</option>
 <option value="SUPERSEDED">Superseded</option>
 </select>
 <select
 value={filterImpact}
 onChange={(e) => setFilterImpact(e.target.value)}
 className="py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 >
 <option value="ALL">All Impact</option>
 <option value="CRITICAL">Critical</option>
 <option value="HIGH">High</option>
 <option value="MEDIUM">Medium</option>
 <option value="LOW">Low</option>
 </select>
 </div>

 {/* Decision Entries */}
 <div className="space-y-4">
 {filteredDecisions.map((decision) => (
 <div key={decision.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
 <div className="flex items-start justify-between mb-4">
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-2">
 {getStatusIcon(decision.status)}
 <h3 className="text-lg font-semibold text-gray-900">{decision.title}</h3>
 <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getStatusColor(decision.status)}`}>
 {decision.status}
 </span>
 <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getImpactColor(decision.impact_level)}`}>
 {decision.impact_level}
 </span>
 </div>
 <p className="text-gray-700 mb-3 line-clamp-2">{decision.decision_summary}</p>
 
 <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
 <div className="flex items-center gap-1">
 <UserIcon className="h-4 w-4" />
 {decision.decision_maker_name}
 </div>
 <div className="flex items-center gap-1">
 <CalendarIcon className="h-4 w-4" />
 {new Date(decision.decision_date).toLocaleDateString()}
 </div>
 {decision.project_name && (
 <span>Project: {decision.project_name}</span>
 )}
 </div>

 <div className="flex items-center gap-2 mb-3">
 <span className={`inline-flex px-2 text-xs rounded ${getTypeColor(decision.decision_type)}`}>
 {decision.decision_type}
 </span>
 <span className={`inline-flex px-2 text-xs rounded ${getReversibilityColor(decision.reversibility)}`}>
 {decision.reversibility.replace('_', ' ')}
 </span>
 <span className="inline-flex px-2 text-xs rounded bg-gray-100 text-gray-700">
 {decision.confidence_level} confidence
 </span>
 </div>
 
 {decision.tags.length > 0 && (
 <div className="flex flex-wrap gap-1 mb-3">
 {decision.tags.slice(0, 3).map(tag => (
 <span key={tag} className="inline-flex px-2 text-xs rounded bg-gray-100 text-gray-700">
 {tag}
 </span>
 ))}
 {decision.tags.length > 3 && (
 <span className="inline-flex px-2 text-xs rounded bg-gray-100 text-gray-500">
 +{decision.tags.length - 3}
 </span>
 )}
 </div>
 )}
 </div>
 </div>

 <div className="flex items-center justify-between pt-4 border-t">
 <div className="flex items-center gap-4">
 {decision.expected_outcomes.length > 0 && (
 <span className="text-xs text-gray-500">
 {decision.expected_outcomes.length} expected outcomes
 </span>
 )}
 {decision.actual_outcomes.length > 0 && (
 <span className="text-xs text-green-600">
 {decision.actual_outcomes.length} actual outcomes
 </span>
 )}
 {(decision.linked_context_cards.length + decision.linked_handoff_summaries.length) > 0 && (
 <span className="text-xs text-indigo-600 flex items-center gap-1">
 <LinkIcon className="h-3 w-3" />
 {decision.linked_context_cards.length + decision.linked_handoff_summaries.length} linked
 </span>
 )}
 </div>
 
 <div className="flex space-x-2">
 <select
 value={decision.status}
 onChange={(e) => handleStatusChange(decision.id, e.target.value)}
 className={`text-xs font-semibold rounded px-2 border-none ${getStatusColor(decision.status)}`}
 >
 <option value="PROPOSED">Proposed</option>
 <option value="APPROVED">Approved</option>
 <option value="IMPLEMENTED">Implemented</option>
 <option value="UNDER_REVIEW">Under Review</option>
 <option value="REJECTED">Rejected</option>
 <option value="SUPERSEDED">Superseded</option>
 </select>
 <button
 onClick={() => {
 setSelectedDecision(decision);
 setShowDetails(true);
 }}
 className="text-blue-600 hover:text-blue-900"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleEdit(decision)}
 className="text-indigo-600 hover:text-indigo-900"
 >
 <PencilIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDelete(decision.id)}
 className="text-red-600 hover:text-red-900"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>

 {filteredDecisions.length === 0 && (
 <div className="text-center2">
 <LightBulbIcon className="mx-auto h-12 w-12 text-gray-400" />
 <h3 className="mt-2 text-sm font-medium text-gray-900">No decisions logged</h3>
 <p className="mt-1 text-sm text-gray-500">
 Start logging key project decisions with their rationale and expected impact.
 </p>
 {showCreateButton && (
 <button
 onClick={() => setShowForm(true)}
 className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
 >
 Log Your First Decision
 </button>
 )}
 </div>
 )}

 {/* Decision Form Modal */}
 {showForm && (
 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-medium text-gray-900 mb-4">
 {editingDecision ? 'Edit Decision' : 'Log New Decision'}
 </h3>

 <form onSubmit={handleSubmit} className="space-y-6">
 {/* Basic Information */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Decision Title *
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
 Decision Type *
 </label>
 <select
 required
 value={formData.decision_type}
 onChange={(e) => setFormData({ ...formData, decision_type: e.target.value as any })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 >
 <option value="ARCHITECTURAL">Architectural</option>
 <option value="BUSINESS">Business</option>
 <option value="TECHNICAL">Technical</option>
 <option value="PROCESS">Process</option>
 <option value="STRATEGIC">Strategic</option>
 <option value="OPERATIONAL">Operational</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Decision Summary *
 </label>
 <textarea
 required
 value={formData.decision_summary}
 onChange={(e) => setFormData({ ...formData, decision_summary: e.target.value })}
 rows={3}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 placeholder="Brief summary of the decision made..."
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Problem Statement *
 </label>
 <textarea
 required
 value={formData.problem_statement}
 onChange={(e) => setFormData({ ...formData, problem_statement: e.target.value })}
 rows={3}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 placeholder="What problem is this decision solving?"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Decision Rationale *
 </label>
 <textarea
 required
 value={formData.decision_rationale}
 onChange={(e) => setFormData({ ...formData, decision_rationale: e.target.value })}
 rows={4}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 placeholder="Why was this decision made? What factors were considered?"
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Impact Level
 </label>
 <select
 value={formData.impact_level}
 onChange={(e) => setFormData({ ...formData, impact_level: e.target.value as any })}
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
 Reversibility
 </label>
 <select
 value={formData.reversibility}
 onChange={(e) => setFormData({ ...formData, reversibility: e.target.value as any })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 >
 <option value="REVERSIBLE">Reversible</option>
 <option value="PARTIALLY_REVERSIBLE">Partially Reversible</option>
 <option value="IRREVERSIBLE">Irreversible</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Confidence Level
 </label>
 <select
 value={formData.confidence_level}
 onChange={(e) => setFormData({ ...formData, confidence_level: e.target.value as any })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 >
 <option value="LOW">Low</option>
 <option value="MEDIUM">Medium</option>
 <option value="HIGH">High</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Decision Date
 </label>
 <input
 type="date"
 value={formData.decision_date}
 onChange={(e) => setFormData({ ...formData, decision_date: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Review Date
 </label>
 <input
 type="date"
 value={formData.review_date}
 onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Implementation Date
 </label>
 <input
 type="date"
 value={formData.implementation_date}
 onChange={(e) => setFormData({ ...formData, implementation_date: e.target.value })}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
 />
 </div>
 </div>

 {/* Dynamic Lists */}
 {[
 { field: 'alternatives_considered' as keyof DecisionLogFormData, label: 'Alternatives Considered', placeholder: 'Add alternative option...' },
 { field: 'expected_outcomes' as keyof DecisionLogFormData, label: 'Expected Outcomes', placeholder: 'Add expected outcome...' },
 { field: 'success_metrics' as keyof DecisionLogFormData, label: 'Success Metrics', placeholder: 'Add success metric...' },
 { field: 'stakeholders' as keyof DecisionLogFormData, label: 'Stakeholders', placeholder: 'Add stakeholder...' },
 { field: 'follow_up_actions' as keyof DecisionLogFormData, label: 'Follow-up Actions', placeholder: 'Add follow-up action...' },
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
 {editingDecision ? 'Update' : 'Log'} Decision
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Decision Details Modal */}
 {showDetails && selectedDecision && (
 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
 <div className="flex justify-between items-start mb-6">
 <div>
 <div className="flex items-center gap-3 mb-2">
 {getStatusIcon(selectedDecision.status)}
 <h3 className="text-xl font-semibold text-gray-900">{selectedDecision.title}</h3>
 <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getStatusColor(selectedDecision.status)}`}>
 {selectedDecision.status}
 </span>
 <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getImpactColor(selectedDecision.impact_level)}`}>
 {selectedDecision.impact_level}
 </span>
 </div>
 <div className="flex items-center gap-4 text-sm text-gray-600">
 <span>Decided by {selectedDecision.decision_maker_name}</span>
 <span>•</span>
 <span>{new Date(selectedDecision.decision_date).toLocaleDateString()}</span>
 <span>•</span>
 <span className={`inline-flex px-2 text-xs rounded ${getTypeColor(selectedDecision.decision_type)}`}>
 {selectedDecision.decision_type}
 </span>
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
 <h4 className="text-sm font-medium text-gray-900 mb-2">Decision Summary</h4>
 <p className="text-gray-700 whitespace-pre-wrap">{selectedDecision.decision_summary}</p>
 </div>

 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Problem Statement</h4>
 <p className="text-gray-700 whitespace-pre-wrap">{selectedDecision.problem_statement}</p>
 </div>

 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Decision Rationale</h4>
 <p className="text-gray-700 whitespace-pre-wrap">{selectedDecision.decision_rationale}</p>
 </div>

 {selectedDecision.alternatives_considered.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Alternatives Considered</h4>
 <ul className="list-disc list-inside space-y-1 text-gray-700">
 {selectedDecision.alternatives_considered.map((alternative, index) => (
 <li key={index}>{alternative}</li>
 ))}
 </ul>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {selectedDecision.expected_outcomes.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Expected Outcomes</h4>
 <ul className="list-disc list-inside space-y-1 text-gray-700">
 {selectedDecision.expected_outcomes.map((outcome, index) => (
 <li key={index}>{outcome}</li>
 ))}
 </ul>
 </div>
 )}

 {selectedDecision.actual_outcomes.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Actual Outcomes</h4>
 <ul className="list-disc list-inside space-y-1 text-green-700">
 {selectedDecision.actual_outcomes.map((outcome, index) => (
 <li key={index}>{outcome}</li>
 ))}
 </ul>
 </div>
 )}
 </div>

 {selectedDecision.success_metrics.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Success Metrics</h4>
 <ul className="list-disc list-inside space-y-1 text-gray-700">
 {selectedDecision.success_metrics.map((metric, index) => (
 <li key={index}>{metric}</li>
 ))}
 </ul>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Reversibility</h4>
 <span className={`inline-flex px-2 text-xs rounded ${getReversibilityColor(selectedDecision.reversibility)}`}>
 {selectedDecision.reversibility.replace('_', ' ')}
 </span>
 </div>
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Confidence Level</h4>
 <span className="inline-flex px-2 text-xs rounded bg-gray-100 text-gray-700">
 {selectedDecision.confidence_level}
 </span>
 </div>
 {selectedDecision.review_date && (
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Review Date</h4>
 <span className="text-sm text-gray-700">
 {new Date(selectedDecision.review_date).toLocaleDateString()}
 </span>
 </div>
 )}
 </div>

 {selectedDecision.stakeholders.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Stakeholders</h4>
 <div className="flex flex-wrap gap-2">
 {selectedDecision.stakeholders.map((stakeholder, index) => (
 <span key={index} className="inline-flex px-2 text-xs rounded bg-blue-100 text-blue-700">
 {stakeholder}
 </span>
 ))}
 </div>
 </div>
 )}

 {selectedDecision.tags.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
 <div className="flex flex-wrap gap-1">
 {selectedDecision.tags.map(tag => (
 <span key={tag} className="inline-flex px-2 text-xs rounded bg-gray-100 text-gray-700">
 {tag}
 </span>
 ))}
 </div>
 </div>
 )}

 {selectedDecision.follow_up_actions.length > 0 && (
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Follow-up Actions</h4>
 <ul className="list-disc list-inside space-y-1 text-gray-700">
 {selectedDecision.follow_up_actions.map((action, index) => (
 <li key={index}>{action}</li>
 ))}
 </ul>
 </div>
 )}
 </div>

 <div className="flex justify-end space-x-3 pt-6 border-t">
 <button
 onClick={() => handleEdit(selectedDecision)}
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

export default DecisionLogSystem;
