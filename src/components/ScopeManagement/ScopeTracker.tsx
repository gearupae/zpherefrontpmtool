import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface ScopeItem {
 id: string;
 name: string;
 type: 'feature' | 'deliverable' | 'milestone' | 'requirement';
 effort: number;
 completed: boolean;
 is_original?: boolean;
 original_effort?: number;
 current_effort?: number;
}

interface ScopeData {
 original_scope: ScopeItem[];
 current_scope: ScopeItem[];
 scope_changes: any[];
 timeline_events: any[];
 baseline_comparison: any;
}

interface ScopeAnalysis {
 total_scope_items: number;
 completed_scope_items: number;
 completion_percentage: number;
 original_scope_count: number;
 added_scope_count: number;
 removed_scope_count: number;
 scope_change_percentage: number;
 total_estimated_effort: number;
 total_actual_effort: number;
 effort_variance_percentage: number;
 scope_health_status: string;
}

const ScopeTracker: React.FC = () => {
 const { projectId } = useParams<{ projectId: string }>();
 const [scopeData, setScopeData] = useState<ScopeData | null>(null);
 const [analysis, setAnalysis] = useState<ScopeAnalysis | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [activeView, setActiveView] = useState<'overview' | 'comparison' | 'timeline'>('overview');

 useEffect(() => {
 if (projectId) {
 loadScopeData();
 loadScopeAnalysis();
 }
 }, [projectId]);

 const loadScopeData = async () => {
 try {
 const response = await fetch(`/api/v1/projects/${projectId}/scope-visual-data`, {
 headers: {
 'Authorization': `Bearer ${localStorage.getItem('access_token')}`
 }
 });
 
 if (response.ok) {
 const data = await response.json();
 setScopeData(data);
 }
 } catch (error) {
 console.error('Failed to load scope data:', error);
 }
 };

 const loadScopeAnalysis = async () => {
 try {
 const response = await fetch(`/api/v1/projects/${projectId}/scope-analysis`, {
 headers: {
 'Authorization': `Bearer ${localStorage.getItem('access_token')}`
 }
 });
 
 if (response.ok) {
 const data = await response.json();
 setAnalysis(data);
 }
 } catch (error) {
 console.error('Failed to load scope analysis:', error);
 } finally {
 setIsLoading(false);
 }
 };

 const getHealthStatusColor = (status: string) => {
 switch (status) {
 case 'healthy': return 'text-green-600 bg-green-100';
 case 'at_risk': return 'text-yellow-600 bg-yellow-100';
 case 'critical': return 'text-red-600 bg-red-100';
 default: return 'text-gray-600 bg-gray-100';
 }
 };

 const getScopeTypeColor = (type: string) => {
 switch (type) {
 case 'feature': return 'bg-blue-600';
 case 'deliverable': return 'bg-green-500';
 case 'milestone': return 'bg-purple-500';
 case 'requirement': return 'bg-orange-500';
 default: return 'bg-gray-500';
 }
 };

 const renderScopeOverview = () => {
 if (!analysis || !scopeData) return null;

 return (
 <div className="space-y-6">
 {/* Key Metrics */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
 <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
 <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
 </svg>
 </div>
 </div>
 <div className="ml-5 w-0 flex-1">
 <dl>
 <dt className="text-sm font-medium text-gray-500 truncate">Total Scope Items</dt>
 <dd className="text-lg font-medium text-gray-900">{analysis.total_scope_items}</dd>
 </dl>
 </div>
 </div>
 </div>

 <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
 <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
 </svg>
 </div>
 </div>
 <div className="ml-5 w-0 flex-1">
 <dl>
 <dt className="text-sm font-medium text-gray-500 truncate">Completion Rate</dt>
 <dd className="text-lg font-medium text-gray-900">{analysis.completion_percentage.toFixed(1)}%</dd>
 </dl>
 </div>
 </div>
 </div>

 <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
 <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
 </svg>
 </div>
 </div>
 <div className="ml-5 w-0 flex-1">
 <dl>
 <dt className="text-sm font-medium text-gray-500 truncate">Scope Change</dt>
 <dd className="text-lg font-medium text-gray-900">{analysis.scope_change_percentage.toFixed(1)}%</dd>
 </dl>
 </div>
 </div>
 </div>

 <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getHealthStatusColor(analysis.scope_health_status)}`}>
 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
 </svg>
 </div>
 </div>
 <div className="ml-5 w-0 flex-1">
 <dl>
 <dt className="text-sm font-medium text-gray-500 truncate">Health Status</dt>
 <dd className="text-lg font-medium text-gray-900 capitalize">{analysis.scope_health_status}</dd>
 </dl>
 </div>
 </div>
 </div>
 </div>

 {/* Scope Progress */}
 <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Scope Progress</h3>
 <div className="space-y-4">
 <div>
 <div className="flex justify-between text-sm text-gray-600 mb-1">
 <span>Overall Completion</span>
 <span>{analysis.completion_percentage.toFixed(1)}%</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div
 className="bg-blue-600 h-2 rounded-full transition-all duration-300"
 style={{ width: `${analysis.completion_percentage}%` }}
 ></div>
 </div>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
 <div className="text-center">
 <div className="text-2xl font-bold text-green-600">{analysis.original_scope_count}</div>
 <div className="text-sm text-gray-500">Original Scope</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold text-blue-600">{analysis.added_scope_count}</div>
 <div className="text-sm text-gray-500">Added Items</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold text-red-600">{analysis.removed_scope_count}</div>
 <div className="text-sm text-gray-500">Removed Items</div>
 </div>
 </div>
 </div>
 </div>

 {/* Scope Items */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200">
 <div className="px-6 py-4 border-b border-gray-200">
 <h3 className="text-lg font-medium text-gray-900">Current Scope Items</h3>
 </div>
 <div className="p-6">
 <div className="space-y-4">
 {scopeData.current_scope.map((item) => (
 <div
 key={item.id}
 className={`p-4 border rounded-lg transition-colors ${
 item.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
 }`}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-3">
 <div className={`w-3 h-3 rounded-full ${getScopeTypeColor(item.type)}`}></div>
 <div>
 <h4 className={`font-medium ${item.completed ? 'text-green-800' : 'text-gray-900'}`}>
 {item.name}
 </h4>
 <div className="flex items-center space-x-2 text-sm text-gray-500">
 <span className="capitalize">{item.type}</span>
 {!item.is_original && (
 <span className="px-2 bg-blue-100 text-blue-800 rounded-full text-xs">
 Added
 </span>
 )}
 </div>
 </div>
 </div>
 
 <div className="flex items-center space-x-4">
 <div className="text-right">
 <div className="text-sm font-medium text-gray-900">
 {item.effort}h estimated
 </div>
 {item.original_effort && item.original_effort !== item.effort && (
 <div className="text-xs text-gray-500">
 Originally {item.original_effort}h
 </div>
 )}
 </div>
 
 {item.completed ? (
 <div className="flex items-center text-green-600">
 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
 </svg>
 </div>
 ) : (
 <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
 };

 const renderScopeComparison = () => {
 if (!scopeData) return null;

 return (
 <div className="space-y-6">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Original Scope */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200">
 <div className="px-6 py-4 border-b border-gray-200">
 <h3 className="text-lg font-medium text-gray-900">Original Scope</h3>
 <p className="text-sm text-gray-500">Baseline project scope</p>
 </div>
 <div className="p-6 space-y-3">
 {scopeData.original_scope.map((item) => (
 <div key={item.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
 <div className="flex items-center space-x-3">
 <div className={`w-3 h-3 rounded-full ${getScopeTypeColor(item.type)}`}></div>
 <div>
 <div className="font-medium text-gray-900">{item.name}</div>
 <div className="text-sm text-gray-500 capitalize">{item.type}</div>
 </div>
 </div>
 <div className="text-sm font-medium text-gray-900">{item.effort}h</div>
 </div>
 ))}
 </div>
 </div>

 {/* Current Scope */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200">
 <div className="px-6 py-4 border-b border-gray-200">
 <h3 className="text-lg font-medium text-gray-900">Current Scope</h3>
 <p className="text-sm text-gray-500">Including all changes</p>
 </div>
 <div className="p-6 space-y-3">
 {scopeData.current_scope.map((item) => (
 <div
 key={item.id}
 className={`flex items-center justify-between p-3 rounded-lg border ${
 item.is_original
 ? 'bg-green-50 border-green-200'
 : 'bg-blue-50 border-blue-200'
 }`}
 >
 <div className="flex items-center space-x-3">
 <div className={`w-3 h-3 rounded-full ${getScopeTypeColor(item.type)}`}></div>
 <div>
 <div className="font-medium text-gray-900">{item.name}</div>
 <div className="flex items-center space-x-2">
 <span className="text-sm text-gray-500 capitalize">{item.type}</span>
 {!item.is_original && (
 <span className="px-2 bg-blue-100 text-blue-800 rounded-full text-xs">
 Added
 </span>
 )}
 </div>
 </div>
 </div>
 <div className="text-sm font-medium text-gray-900">{item.effort}h</div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
 };

 const renderTimeline = () => {
 if (!scopeData) return null;

 return (
 <div className="bg-white rounded-lg shadow-sm border border-gray-200">
 <div className="px-6 py-4 border-b border-gray-200">
 <h3 className="text-lg font-medium text-gray-900">Scope Evolution Timeline</h3>
 <p className="text-sm text-gray-500">Track how your project scope has evolved over time</p>
 </div>
 <div className="p-6">
 <div className="flow-root">
 <ul className="-mb-8">
 {scopeData.timeline_events.map((event, eventIdx) => (
 <li key={event.id}>
 <div className="relative pb-8">
 {eventIdx !== scopeData.timeline_events.length - 1 ? (
 <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
 ) : null}
 <div className="relative flex space-x-3">
 <div>
 <span className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center ring-8 ring-white">
 <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
 </svg>
 </span>
 </div>
 <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
 <div>
 <p className="text-sm text-gray-500">
 {event.description}
 </p>
 </div>
 <div className="text-right text-sm whitespace-nowrap text-gray-500">
 {new Date(event.date).toLocaleDateString()}
 </div>
 </div>
 </div>
 </div>
 </li>
 ))}
 </ul>
 </div>
 </div>
 </div>
 );
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
 <div className="mb-8">
 <h1 className="text-3xl font-bold text-gray-900">Scope Tracking</h1>
 <p className="text-gray-600 mt-2">
 Monitor and visualize your project scope evolution
 </p>
 </div>

 {/* Navigation */}
 <div className="border-b border-gray-200 mb-8">
 <nav className="flex space-x-8">
 {[
 { key: 'overview', label: 'Overview' },
 { key: 'comparison', label: 'Scope Comparison' },
 { key: 'timeline', label: 'Timeline' }
 ].map((tab) => (
 <button
 key={tab.key}
 onClick={() => setActiveView(tab.key as any)}
 className={`py-2 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
 activeView === tab.key ? 'text-indigo-600' : 'text-black hover:text-gray-700'
 }`}
 >
 {tab.label}
 </button>
 ))}
 </nav>
 </div>

 {/* Content */}
 {activeView === 'overview' && renderScopeOverview()}
 {activeView === 'comparison' && renderScopeComparison()}
 {activeView === 'timeline' && renderTimeline()}
 </div>
 );
};

export default ScopeTracker;
