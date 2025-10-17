import React, { useState, useEffect } from 'react';

interface Integration {
 id: string;
 name: string;
 integration_type: string;
 description?: string;
 is_active: boolean;
 is_bidirectional: boolean;
 sync_frequency: string;
 last_sync_at?: string;
 config: Record<string, any>;
 created_at: string;
}

interface IntegrationStatus {
 integration_id: string;
 is_connected: boolean;
 last_sync?: string;
 sync_frequency: string;
 health_score: number;
 error_count: number;
 success_rate: number;
 recent_syncs: Array<{
 id: string;
 status: string;
 started_at: string;
 completed_at?: string;
 records_processed: number;
 errors: string[];
 }>;
}

const IntegrationDashboard: React.FC = () => {
 const [integrations, setIntegrations] = useState<Integration[]>([]);
 const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
 const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [showAddForm, setShowAddForm] = useState(false);
 const [filter, setFilter] = useState<{
 type?: string;
 status?: string;
 }>({});

 useEffect(() => {
 loadIntegrations();
 }, [filter]);

 useEffect(() => {
 if (selectedIntegration) {
 loadIntegrationStatus(selectedIntegration.id);
 }
 }, [selectedIntegration]);

 const loadIntegrations = async () => {
 try {
 const params = new URLSearchParams();
 if (filter.type) params.append('integration_type', filter.type);
 if (filter.status === 'active') params.append('is_active', 'true');
 if (filter.status === 'inactive') params.append('is_active', 'false');

 const response = await fetch(`/api/v1/integrations?${params}`, {
 headers: {
 'Authorization': `Bearer ${localStorage.getItem('access_token')}`
 }
 });
 
 if (response.ok) {
 const data = await response.json();
 setIntegrations(data);
 }
 } catch (error) {
 console.error('Failed to load integrations:', error);
 } finally {
 setIsLoading(false);
 }
 };

 const loadIntegrationStatus = async (integrationId: string) => {
 try {
 const response = await fetch(`/api/v1/integrations/${integrationId}/status`, {
 headers: {
 'Authorization': `Bearer ${localStorage.getItem('access_token')}`
 }
 });
 
 if (response.ok) {
 const data = await response.json();
 setIntegrationStatus(data);
 }
 } catch (error) {
 console.error('Failed to load integration status:', error);
 }
 };

 const handleToggleIntegration = async (integration: Integration) => {
 try {
 const response = await fetch(`/api/v1/integrations/${integration.id}`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${localStorage.getItem('access_token')}`
 },
 body: JSON.stringify({
 is_active: !integration.is_active
 })
 });

 if (response.ok) {
 loadIntegrations();
 if (selectedIntegration?.id === integration.id) {
 const updatedIntegration = { ...integration, is_active: !integration.is_active };
 setSelectedIntegration(updatedIntegration);
 }
 }
 } catch (error) {
 console.error('Failed to toggle integration:', error);
 }
 };

 const handleTriggerSync = async (integrationId: string) => {
 try {
 const response = await fetch(`/api/v1/integrations/${integrationId}/sync`, {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${localStorage.getItem('access_token')}`
 }
 });

 if (response.ok) {
 alert('Sync triggered successfully!');
 // Reload status after a short delay
 setTimeout(() => loadIntegrationStatus(integrationId), 2000);
 }
 } catch (error) {
 console.error('Failed to trigger sync:', error);
 }
 };

 const getIntegrationIcon = (type: string) => {
 const icons = {
 slack: '💬',
 github: '🐙',
 gmail: '📧',
 jira: '🎫',
 trello: '📋',
 asana: '✅',
 notion: '📝',
 zapier: '⚡',
 webhook: '🔗'
 };
 return icons[type as keyof typeof icons] || '🔌';
 };

 const getStatusColor = (isActive: boolean, isConnected?: boolean) => {
 if (!isActive) return 'text-gray-500 bg-gray-100';
 if (isConnected === false) return 'text-red-600 bg-red-100';
 return 'text-green-600 bg-green-100';
 };

 const getHealthColor = (score: number) => {
 if (score >= 80) return 'text-green-600 bg-green-100';
 if (score >= 60) return 'text-yellow-600 bg-yellow-100';
 if (score >= 40) return 'text-orange-600 bg-orange-100';
 return 'text-red-600 bg-red-100';
 };

 const formatSyncFrequency = (frequency: string) => {
 const frequencies: Record<string, string> = {
 '5m': 'Every 5 minutes',
 '15m': 'Every 15 minutes',
 '1h': 'Every hour',
 '6h': 'Every 6 hours',
 '24h': 'Daily',
 'manual': 'Manual only'
 };
 return frequencies[frequency] || frequency;
 };

 const formatTimestamp = (timestamp: string) => {
 return new Date(timestamp).toLocaleString();
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
 </div>
 );
 }

 return (
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {/* Header */}
 <div className="flex justify-between items-center mb-8">
 <div>
 <h1 className="text-3xl font-bold text-gray-900">Integration Hub</h1>
 <p className="text-gray-600 mt-2">
 Manage connections to external tools and services
 </p>
 </div>
 <button
 onClick={() => setShowAddForm(true)}
 className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
 >
 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
 </svg>
 Add Integration
 </button>
 </div>

 {/* Filters */}
 <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
 <div className="flex items-center space-x-4">
 <div>
 <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
 Type
 </label>
 <select
 id="type-filter"
 value={filter.type || ''}
 onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value || undefined }))}
 className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
 >
 <option value="">All Types</option>
 <option value="slack">Slack</option>
 <option value="github">GitHub</option>
 <option value="gmail">Gmail</option>
 <option value="jira">Jira</option>
 <option value="trello">Trello</option>
 <option value="asana">Asana</option>
 <option value="notion">Notion</option>
 </select>
 </div>

 <div>
 <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
 Status
 </label>
 <select
 id="status-filter"
 value={filter.status || ''}
 onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value || undefined }))}
 className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
 >
 <option value="">All Status</option>
 <option value="active">Active</option>
 <option value="inactive">Inactive</option>
 </select>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Integrations List */}
 <div className="lg:col-span-2">
 <div className="bg-white shadow-sm rounded-lg border border-gray-200">
 <div className="px-6 py-4 border-b border-gray-200">
 <h3 className="text-lg font-medium text-gray-900">
 Active Integrations ({integrations.length})
 </h3>
 </div>
 
 {integrations.length === 0 ? (
 <div className="text-center2">
 <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
 </svg>
 <h3 className="mt-2 text-sm font-medium text-gray-900">No integrations</h3>
 <p className="mt-1 text-sm text-gray-500">Get started by adding your first integration.</p>
 </div>
 ) : (
 <div className="divide-y divide-gray-200">
 {integrations.map((integration) => (
 <div
 key={integration.id}
 onClick={() => setSelectedIntegration(integration)}
 className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
 selectedIntegration?.id === integration.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
 }`}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-4">
 <div className="text-2xl">
 {getIntegrationIcon(integration.integration_type)}
 </div>
 <div>
 <h4 className="text-lg font-medium text-gray-900">
 {integration.name}
 </h4>
 <p className="text-sm text-gray-600">
 {integration.description || `${integration.integration_type} integration`}
 </p>
 <div className="flex items-center space-x-3 mt-2">
 <span className={`inline-flex px-2 rounded-full text-xs font-medium ${getStatusColor(integration.is_active)}`}>
 {integration.is_active ? 'Active' : 'Inactive'}
 </span>
 <span className="text-xs text-gray-500">
 {formatSyncFrequency(integration.sync_frequency)}
 </span>
 {integration.is_bidirectional && (
 <span className="inline-flex px-2 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
 Bidirectional
 </span>
 )}
 </div>
 </div>
 </div>

 <div className="flex items-center space-x-2">
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleToggleIntegration(integration);
 }}
 className={`inline-flex items-center rounded-md text-sm font-medium ${
 integration.is_active
 ? 'text-red-700 bg-red-100 hover:bg-red-200'
 : 'text-green-700 bg-green-100 hover:bg-green-200'
 }`}
 >
 {integration.is_active ? 'Disable' : 'Enable'}
 </button>
 
 {integration.is_active && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleTriggerSync(integration.id);
 }}
 className="inline-flex items-center rounded-md text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200"
 >
 Sync Now
 </button>
 )}
 </div>
 </div>

 {integration.last_sync_at && (
 <div className="mt-3 text-xs text-gray-500">
 Last synced: {formatTimestamp(integration.last_sync_at)}
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Integration Details */}
 <div className="lg:col-span-1">
 {selectedIntegration ? (
 <div className="bg-white shadow-sm rounded-lg border border-gray-200">
 <div className="px-6 py-4 border-b border-gray-200">
 <div className="flex items-center space-x-3">
 <span className="text-2xl">
 {getIntegrationIcon(selectedIntegration.integration_type)}
 </span>
 <div>
 <h3 className="text-lg font-medium text-gray-900">
 {selectedIntegration.name}
 </h3>
 <p className="text-sm text-gray-500 capitalize">
 {selectedIntegration.integration_type}
 </p>
 </div>
 </div>
 </div>

 <div className="px-6 py-4 space-y-4">
 {/* Status Information */}
 {integrationStatus && (
 <>
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Health Status</h4>
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Connection</span>
 <span className={`inline-flex px-2 rounded-full text-xs font-medium ${getStatusColor(true, integrationStatus.is_connected)}`}>
 {integrationStatus.is_connected ? 'Connected' : 'Disconnected'}
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Health Score</span>
 <span className={`inline-flex px-2 rounded-full text-xs font-medium ${getHealthColor(integrationStatus.health_score)}`}>
 {integrationStatus.health_score.toFixed(0)}%
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Success Rate</span>
 <span className="text-sm font-medium text-gray-900">
 {integrationStatus.success_rate.toFixed(1)}%
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Recent Errors</span>
 <span className="text-sm font-medium text-gray-900">
 {integrationStatus.error_count}
 </span>
 </div>
 </div>
 </div>

 {/* Recent Syncs */}
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Syncs</h4>
 <div className="space-y-2">
 {integrationStatus.recent_syncs.slice(0, 3).map((sync) => (
 <div key={sync.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
 <div>
 <div className={`text-xs font-medium ${
 sync.status === 'completed' ? 'text-green-600' :
 sync.status === 'failed' ? 'text-red-600' :
 'text-yellow-600'
 }`}>
 {sync.status}
 </div>
 <div className="text-xs text-gray-500">
 {formatTimestamp(sync.started_at)}
 </div>
 </div>
 <div className="text-xs text-gray-600">
 {sync.records_processed} records
 </div>
 </div>
 ))}
 </div>
 </div>
 </>
 )}

 {/* Configuration */}
 <div>
 <h4 className="text-sm font-medium text-gray-900 mb-2">Configuration</h4>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between">
 <span className="text-gray-600">Sync Frequency</span>
 <span className="text-gray-900">
 {formatSyncFrequency(selectedIntegration.sync_frequency)}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">Bidirectional</span>
 <span className="text-gray-900">
 {selectedIntegration.is_bidirectional ? 'Yes' : 'No'}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-600">Created</span>
 <span className="text-gray-900">
 {new Date(selectedIntegration.created_at).toLocaleDateString()}
 </span>
 </div>
 </div>
 </div>

 {/* Actions */}
 <div className="pt-4 border-t border-gray-200 space-y-2">
 <button
 onClick={() => handleTriggerSync(selectedIntegration.id)}
 disabled={!selectedIntegration.is_active}
 className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Trigger Sync
 </button>
 <button
 onClick={() => handleToggleIntegration(selectedIntegration)}
 className={`w-full px-4 py-2 rounded-md ${
 selectedIntegration.is_active
 ? 'bg-red-600 text-white hover:bg-red-700'
 : 'bg-green-600 text-white hover:bg-green-700'
 }`}
 >
 {selectedIntegration.is_active ? 'Disable Integration' : 'Enable Integration'}
 </button>
 </div>
 </div>
 </div>
 ) : (
 <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
 <div className="text-center text-gray-500">
 <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
 </svg>
 <p className="text-sm">Select an integration to view details</p>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

export default IntegrationDashboard;
