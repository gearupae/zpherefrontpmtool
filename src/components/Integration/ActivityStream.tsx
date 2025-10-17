import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';

interface Activity {
 id: string;
 source: string;
 activity_type: string;
 title: string;
 description: string;
 user_id?: string;
 metadata?: Record<string, any>;
 activity_timestamp: string;
 external_url?: string;
}

interface ActivityFeed {
 activities: Activity[];
 sources_summary: Record<string, number>;
 total_count: number;
}

interface ActivityStreamProps {
 maxItems?: number;
 showSources?: boolean;
 autoRefresh?: boolean;
 refreshInterval?: number;
 compact?: boolean;
 // Optional: filter activities for a specific user
 userId?: string;
}

const ActivityStream: React.FC<ActivityStreamProps> = ({
 maxItems = 20,
 showSources = true,
 autoRefresh = true,
 refreshInterval = 30000,
 compact = false,
 userId,
}) => {
 const [activityFeed, setActivityFeed] = useState<ActivityFeed | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [filter, setFilter] = useState<{
 source?: string;
 activity_type?: string;
 user_id?: string;
 }>({});
 const [isRealTime, setIsRealTime] = useState(autoRefresh);

useEffect(() => {
 loadActivityFeed();
 }, [filter, maxItems, userId]);

 useEffect(() => {
 let interval: NodeJS.Timeout;
 
 if (isRealTime && autoRefresh) {
 interval = setInterval(() => {
 loadActivityFeed(true); // Silent refresh
 }, refreshInterval);
 }
 
 return () => {
 if (interval) clearInterval(interval);
 };
 }, [isRealTime, autoRefresh, refreshInterval, filter, maxItems]);

const loadActivityFeed = async (silent = false) => {
 try {
 if (!silent) setIsLoading(true);
 
 const params = new URLSearchParams();
 if (filter.source) params.append('source', filter.source);
 if (filter.activity_type) params.append('activity_type', filter.activity_type);
 const effectiveUserId = filter.user_id || userId;
 if (effectiveUserId) params.append('user_id', effectiveUserId);
 params.append('limit', maxItems.toString());

// Ensure trailing slash to avoid 307 redirects that can drop headers
 const response = await apiClient.get(`/activity/`, { params });
 if (response?.status === 200) {
 setActivityFeed(response.data);
 }
 } catch (error) {
 console.error('Failed to load activity feed:', error);
 } finally {
 if (!silent) setIsLoading(false);
 }
 };

 const getActivityIcon = (activityType: string, source: string) => {
 const typeIcons: Record<string, string> = {
 'created': '➕',
 'updated': '✏️',
 'deleted': '🗑️',
 'commented': '💬',
 'assigned': '👤',
 'completed': '✅',
 'merged': '🔀',
 'pushed': '⬆️',
 'opened': '📖',
 'closed': '📕',
 'reviewed': '👁️',
 'deployed': '🚀',
 'error': '❌',
 'warning': '⚠️'
 };

 const sourceIcons: Record<string, string> = {
 'slack': '💬',
 'github': '🐙',
 'jira': '🎫',
 'trello': '📋',
 'asana': '✅',
 'notion': '📝',
 'zphere': '🌐'
 };

 return typeIcons[activityType] || sourceIcons[source] || '📄';
 };

 const getSourceColor = (source: string) => {
 const colors: Record<string, string> = {
 'slack': 'bg-purple-100 text-purple-800',
 'github': 'bg-gray-100 text-gray-800',
 'jira': 'bg-blue-100 text-blue-800',
 'trello': 'bg-blue-100 text-blue-800',
 'asana': 'bg-orange-100 text-orange-800',
 'notion': 'bg-gray-100 text-gray-800',
 'zphere': 'bg-green-100 text-green-800'
 };
 return colors[source] || 'bg-gray-100 text-gray-800';
 };

 const formatTimestamp = (timestamp: string) => {
 const date = new Date(timestamp);
 const now = new Date();
 const diffMs = now.getTime() - date.getTime();
 const diffMins = Math.floor(diffMs / (1000 * 60));
 const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
 const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

 if (diffMins < 1) return 'Just now';
 if (diffMins < 60) return `${diffMins}m ago`;
 if (diffHours < 24) return `${diffHours}h ago`;
 if (diffDays < 7) return `${diffDays}d ago`;
 return date.toLocaleDateString();
 };

 const handleActivityClick = (activity: Activity) => {
 if (activity.external_url) {
 window.open(activity.external_url, '_blank');
 }
 };

 const getAvailableFilters = () => {
 if (!activityFeed) return { sources: [], types: [] };
 
 const sources = Object.keys(activityFeed.sources_summary);
 const typesSet = new Set(activityFeed.activities.map(a => a.activity_type));
 const types = Array.from(typesSet);
 
 return { sources, types };
 };

 const { sources, types } = getAvailableFilters();

 if (isLoading && !activityFeed) {
 return (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className="animate-pulse">
 <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
 <div className="space-y-3">
 {[...Array(5)].map((_, i) => (
 <div key={i} className="flex space-x-3">
 <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
 <div className="flex-1 space-y-2">
 <div className="h-3 bg-gray-200 rounded w-3/4"></div>
 <div className="h-3 bg-gray-200 rounded w-1/2"></div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="bg-white rounded-lg border border-gray-200">
 {/* Header */}
 <div className="px-6 py-4 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-3">
 <h3 className={`font-medium text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>
 Activity Stream
 </h3>
 {activityFeed && (
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
 {activityFeed.total_count} activities
 </span>
 )}
 </div>
 
 <div className="flex items-center space-x-2">
 {/* Real-time toggle */}
 <button
 onClick={() => setIsRealTime(!isRealTime)}
 className={`p-2 rounded-md ${
 isRealTime 
 ? 'text-green-600 bg-green-100 hover:bg-green-200' 
 : 'text-gray-400 bg-gray-100 hover:bg-gray-200'
 }`}
 title={isRealTime ? 'Disable auto-refresh' : 'Enable auto-refresh'}
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
 </svg>
 </button>

 {/* Refresh button */}
 <button
 onClick={() => loadActivityFeed()}
 className="p-2 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md"
 title="Refresh"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
 </svg>
 </button>
 </div>
 </div>

 {/* Filters */}
 {!compact && (showSources || sources.length > 1 || types.length > 1) && (
 <div className="mt-4 flex flex-wrap items-center gap-3">
 {sources.length > 1 && (
 <div>
 <select
 value={filter.source || ''}
 onChange={(e) => setFilter(prev => ({ ...prev, source: e.target.value || undefined }))}
 className="text-sm border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
 >
 <option value="">All Sources</option>
 {sources.map((source) => (
 <option key={source} value={source}>
 {source} ({activityFeed?.sources_summary[source]})
 </option>
 ))}
 </select>
 </div>
 )}

 {types.length > 1 && (
 <div>
 <select
 value={filter.activity_type || ''}
 onChange={(e) => setFilter(prev => ({ ...prev, activity_type: e.target.value || undefined }))}
 className="text-sm border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
 >
 <option value="">All Activities</option>
 {types.map((type) => (
 <option key={type} value={type}>
 {type.charAt(0).toUpperCase() + type.slice(1)}
 </option>
 ))}
 </select>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Activity List */}
 <div className={`${compact ? 'max-h-96' : 'max-h-[32rem]'} overflow-y-auto`}>
 {activityFeed && activityFeed.activities.length === 0 ? (
 <div className="text-center2">
 <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 <h3 className="mt-2 text-sm font-medium text-gray-900">No activity</h3>
 <p className="mt-1 text-sm text-gray-500">No recent activity to display.</p>
 </div>
 ) : (
 <div className="divide-y divide-gray-100">
 {activityFeed?.activities.map((activity) => (
 <div
 key={activity.id}
 onClick={() => handleActivityClick(activity)}
 className={`p-4 hover:bg-gray-50 transition-colors ${
 activity.external_url ? 'cursor-pointer' : ''
 } ${compact ? 'py-3' : ''}`}
 >
 <div className="flex space-x-3">
 {/* Activity Icon */}
 <div className={`flex-shrink-0 ${compact ? 'mt-0.5' : 'mt-1'}`}>
 <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm ${compact ? 'w-6 h-6' : ''}`}>
 {getActivityIcon(activity.activity_type, activity.source)}
 </div>
 </div>

 {/* Activity Content */}
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <p className={`font-medium text-gray-900 ${compact ? 'text-sm' : ''}`}>
 {activity.title}
 </p>
 {activity.description && !compact && (
 <p className="text-sm text-gray-600 mt-1 line-clamp-2">
 {activity.description}
 </p>
 )}
 
 {/* Metadata */}
 <div className={`flex items-center space-x-3 mt-2 ${compact ? 'mt-1' : ''}`}>
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSourceColor(activity.source)}`}>
 {activity.source}
 </span>
 <span className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
 {formatTimestamp(activity.activity_timestamp)}
 </span>
 {activity.external_url && (
 <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
 </svg>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Load More */}
 {activityFeed && activityFeed.activities.length >= maxItems && !compact && (
 <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
 <button
 onClick={() => {
 // Load more functionality would be implemented here
 console.log('Load more activities');
 }}
 className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
 >
 Load More Activities
 </button>
 </div>
 )}
 </div>
 );
};

export default ActivityStream;
