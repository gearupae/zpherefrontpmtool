import React, { useState, useEffect } from 'react';

interface TaskEstimationWidgetProps {
 taskId: string;
 onEstimateUpdate?: (estimate: any) => void;
 readOnly?: boolean;
}

interface TaskEstimate {
 id?: string;
 task_id: string;
 estimation_method: string;
 estimated_hours?: number;
 story_points?: number;
 optimistic_hours?: number;
 most_likely_hours?: number;
 pessimistic_hours?: number;
 confidence_level: string;
 confidence_percentage?: number;
 complexity_level: string;
 effort_category: string;
 ai_suggested_estimate?: number;
 ai_confidence?: number;
 similar_tasks?: string[];
 features_used?: any;
}

interface ConfidenceInterval {
 estimated_hours: number;
 confidence_level: string;
 lower_bound: number;
 upper_bound: number;
 probability_distribution: Record<string, number>;
 risk_factors: string[];
}

const TaskEstimationWidget: React.FC<TaskEstimationWidgetProps> = ({
 taskId,
 onEstimateUpdate,
 readOnly = false
}) => {
 const [estimate, setEstimate] = useState<TaskEstimate | null>(null);
 const [confidenceInterval, setConfidenceInterval] = useState<ConfidenceInterval | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [isEditing, setIsEditing] = useState(false);
 const [formData, setFormData] = useState<Partial<TaskEstimate>>({
 estimation_method: 'story_points',
 confidence_level: 'medium',
 complexity_level: 'moderate',
 effort_category: 'development'
 });
 const [showAISuggestion, setShowAISuggestion] = useState(false);

 useEffect(() => {
 loadTaskEstimate();
 }, [taskId]);

 const loadTaskEstimate = async () => {
 try {
 setIsLoading(true);
 const response = await fetch(`/api/v1/tasks/${taskId}/estimate`, {
 headers: {
 'Authorization': `Bearer ${localStorage.getItem('access_token')}`
 }
 });
 
 if (response.ok) {
 const data = await response.json();
 setEstimate(data);
 setFormData(data);
 
 // Load confidence interval if estimate exists
 if (data.id) {
 loadConfidenceInterval();
 }
 }
 } catch (error) {
 console.error('Failed to load estimate:', error);
 } finally {
 setIsLoading(false);
 }
 };

 const loadConfidenceInterval = async () => {
 try {
 const response = await fetch(`/api/v1/estimation/confidence-interval/${taskId}`, {
 headers: {
 'Authorization': `Bearer ${localStorage.getItem('access_token')}`
 }
 });
 
 if (response.ok) {
 const data = await response.json();
 setConfidenceInterval(data);
 }
 } catch (error) {
 console.error('Failed to load confidence interval:', error);
 }
 };

 const handleInputChange = (field: string, value: any) => {
 setFormData(prev => ({
 ...prev,
 [field]: value
 }));
 };

 const handleSave = async () => {
 try {
 const url = estimate?.id 
 ? `/api/v1/tasks/${taskId}/estimate`
 : `/api/v1/tasks/${taskId}/estimate`;
 
 const method = estimate?.id ? 'PUT' : 'POST';
 
 const response = await fetch(url, {
 method,
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${localStorage.getItem('access_token')}`
 },
 body: JSON.stringify({ ...formData, task_id: taskId })
 });

 if (response.ok) {
 const updatedEstimate = await response.json();
 setEstimate(updatedEstimate);
 setIsEditing(false);
 loadConfidenceInterval();
 
 if (onEstimateUpdate) {
 onEstimateUpdate(updatedEstimate);
 }
 }
 } catch (error) {
 console.error('Failed to save estimate:', error);
 }
 };

 const handleUseAISuggestion = () => {
 if (estimate?.ai_suggested_estimate) {
 setFormData(prev => ({
 ...prev,
 estimated_hours: estimate.ai_suggested_estimate,
 confidence_percentage: (estimate.ai_confidence || 0) * 100
 }));
 }
 };

 const getConfidenceColor = (level: string) => {
 switch (level) {
 case 'very_high': return 'text-green-600 bg-green-100';
 case 'high': return 'text-green-600 bg-green-100';
 case 'medium': return 'text-yellow-600 bg-yellow-100';
 case 'low': return 'text-orange-600 bg-orange-100';
 case 'very_low': return 'text-red-600 bg-red-100';
 default: return 'text-gray-600 bg-gray-100';
 }
 };

 const getComplexityColor = (level: string) => {
 switch (level) {
 case 'trivial': return 'text-green-600 bg-green-100';
 case 'simple': return 'text-green-600 bg-green-100';
 case 'moderate': return 'text-yellow-600 bg-yellow-100';
 case 'complex': return 'text-orange-600 bg-orange-100';
 case 'very_complex': return 'text-red-600 bg-red-100';
 default: return 'text-gray-600 bg-gray-100';
 }
 };

 const formatEstimationMethod = (method: string) => {
 return method.split('_').map(word => 
 word.charAt(0).toUpperCase() + word.slice(1)
 ).join(' ');
 };

 if (isLoading) {
 return (
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className="animate-pulse">
 <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
 <div className="space-y-3">
 <div className="h-3 bg-gray-200 rounded"></div>
 <div className="h-3 bg-gray-200 rounded w-5/6"></div>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="bg-white rounded-lg border border-gray-200">
 {/* Header */}
 <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
 <h3 className="text-lg font-medium text-gray-900">Task Estimation</h3>
 {!readOnly && !isEditing && (
 <button
 onClick={() => setIsEditing(true)}
 className="text-sm text-blue-600 hover:text-blue-800"
 >
 {estimate?.id ? 'Edit' : 'Add Estimate'}
 </button>
 )}
 </div>

 <div className="p-4">
 {/* AI Suggestion */}
 {estimate?.ai_suggested_estimate && !isEditing && (
 <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
 <div className="flex items-center justify-between">
 <div>
 <h4 className="text-sm font-medium text-blue-900">AI Suggestion</h4>
 <p className="text-sm text-blue-700">
 {estimate.ai_suggested_estimate}h (confidence: {((estimate.ai_confidence || 0) * 100).toFixed(0)}%)
 </p>
 </div>
 <button
 onClick={() => setShowAISuggestion(!showAISuggestion)}
 className="text-sm text-blue-600 hover:text-blue-800"
 >
 {showAISuggestion ? 'Hide Details' : 'Show Details'}
 </button>
 </div>
 
 {showAISuggestion && estimate.features_used && (
 <div className="mt-3 pt-3 border-t border-blue-200">
 <p className="text-xs text-blue-600 mb-2">Based on:</p>
 <ul className="text-xs text-blue-700 space-y-1">
 {Object.entries(estimate.features_used).map(([key, value]) => (
 <li key={key}>• {key}: {JSON.stringify(value)}</li>
 ))}
 </ul>
 </div>
 )}
 </div>
 )}

 {isEditing ? (
 /* Edit Form */
 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Estimation Method
 </label>
 <select
 value={formData.estimation_method || ''}
 onChange={(e) => handleInputChange('estimation_method', e.target.value)}
 className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
 >
 <option value="story_points">Story Points</option>
 <option value="time_hours">Time Hours</option>
 <option value="t_shirt_sizes">T-Shirt Sizes</option>
 <option value="three_point">Three Point</option>
 <option value="historical_average">Historical Average</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Effort Category
 </label>
 <select
 value={formData.effort_category || ''}
 onChange={(e) => handleInputChange('effort_category', e.target.value)}
 className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
 >
 <option value="development">Development</option>
 <option value="testing">Testing</option>
 <option value="design">Design</option>
 <option value="research">Research</option>
 <option value="review">Review</option>
 <option value="deployment">Deployment</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Estimated Hours
 </label>
 <input
 type="number"
 step="0.5"
 min="0"
 value={formData.estimated_hours || ''}
 onChange={(e) => handleInputChange('estimated_hours', parseFloat(e.target.value))}
 className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Story Points
 </label>
 <input
 type="number"
 min="0"
 value={formData.story_points || ''}
 onChange={(e) => handleInputChange('story_points', parseInt(e.target.value))}
 className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
 />
 </div>
 </div>

 {/* Three-point estimation */}
 {formData.estimation_method === 'three_point' && (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Optimistic (hours)
 </label>
 <input
 type="number"
 step="0.5"
 min="0"
 value={formData.optimistic_hours || ''}
 onChange={(e) => handleInputChange('optimistic_hours', parseFloat(e.target.value))}
 className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Most Likely (hours)
 </label>
 <input
 type="number"
 step="0.5"
 min="0"
 value={formData.most_likely_hours || ''}
 onChange={(e) => handleInputChange('most_likely_hours', parseFloat(e.target.value))}
 className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Pessimistic (hours)
 </label>
 <input
 type="number"
 step="0.5"
 min="0"
 value={formData.pessimistic_hours || ''}
 onChange={(e) => handleInputChange('pessimistic_hours', parseFloat(e.target.value))}
 className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
 />
 </div>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Confidence Level
 </label>
 <select
 value={formData.confidence_level || ''}
 onChange={(e) => handleInputChange('confidence_level', e.target.value)}
 className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
 >
 <option value="very_low">Very Low</option>
 <option value="low">Low</option>
 <option value="medium">Medium</option>
 <option value="high">High</option>
 <option value="very_high">Very High</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Complexity Level
 </label>
 <select
 value={formData.complexity_level || ''}
 onChange={(e) => handleInputChange('complexity_level', e.target.value)}
 className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
 >
 <option value="trivial">Trivial</option>
 <option value="simple">Simple</option>
 <option value="moderate">Moderate</option>
 <option value="complex">Complex</option>
 <option value="very_complex">Very Complex</option>
 </select>
 </div>
 </div>

 {/* AI Suggestion Integration */}
 {estimate?.ai_suggested_estimate && (
 <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
 <span className="text-sm text-gray-600">
 Use AI suggestion: {estimate.ai_suggested_estimate}h
 </span>
 <button
 onClick={handleUseAISuggestion}
 className="text-sm text-blue-600 hover:text-blue-800"
 >
 Apply
 </button>
 </div>
 )}

 {/* Actions */}
 <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
 <button
 onClick={() => {
 setIsEditing(false);
 setFormData(estimate || {});
 }}
 className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
 >
 Cancel
 </button>
 <button
 onClick={handleSave}
 className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
 >
 Save Estimate
 </button>
 </div>
 </div>
 ) : (
 /* Display View */
 <div>
 {estimate ? (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <span className="text-sm text-gray-500">Method</span>
 <div className="font-medium text-gray-900">
 {formatEstimationMethod(estimate.estimation_method)}
 </div>
 </div>
 <div>
 <span className="text-sm text-gray-500">Category</span>
 <div className="font-medium text-gray-900 capitalize">
 {estimate.effort_category}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 {estimate.estimated_hours && (
 <div>
 <span className="text-sm text-gray-500">Estimated Hours</span>
 <div className="text-2xl font-bold text-gray-900">
 {estimate.estimated_hours}h
 </div>
 </div>
 )}
 {estimate.story_points && (
 <div>
 <span className="text-sm text-gray-500">Story Points</span>
 <div className="text-2xl font-bold text-gray-900">
 {estimate.story_points}
 </div>
 </div>
 )}
 </div>

 <div className="flex items-center space-x-4">
 <span className={`inline-flex px-2 rounded-full text-xs font-medium ${getConfidenceColor(estimate.confidence_level)}`}>
 {estimate.confidence_level.replace('_', ' ')} confidence
 </span>
 <span className={`inline-flex px-2 rounded-full text-xs font-medium ${getComplexityColor(estimate.complexity_level)}`}>
 {estimate.complexity_level} complexity
 </span>
 </div>

 {/* Three-point estimation display */}
 {estimate.optimistic_hours && estimate.pessimistic_hours && (
 <div className="bg-gray-50 p-3 rounded-lg">
 <h4 className="text-sm font-medium text-gray-900 mb-2">Three-Point Estimate</h4>
 <div className="grid grid-cols-3 gap-4 text-sm">
 <div>
 <span className="text-gray-500">Optimistic</span>
 <div className="font-medium">{estimate.optimistic_hours}h</div>
 </div>
 <div>
 <span className="text-gray-500">Most Likely</span>
 <div className="font-medium">{estimate.most_likely_hours}h</div>
 </div>
 <div>
 <span className="text-gray-500">Pessimistic</span>
 <div className="font-medium">{estimate.pessimistic_hours}h</div>
 </div>
 </div>
 </div>
 )}

 {/* Confidence Interval */}
 {confidenceInterval && (
 <div className="bg-blue-50 p-3 rounded-lg">
 <h4 className="text-sm font-medium text-blue-900 mb-2">Confidence Interval</h4>
 <div className="text-sm text-blue-700">
 Range: {confidenceInterval.lower_bound.toFixed(1)}h - {confidenceInterval.upper_bound.toFixed(1)}h
 </div>
 {confidenceInterval.risk_factors.length > 0 && (
 <div className="mt-2">
 <span className="text-xs text-blue-600">Risk factors:</span>
 <div className="flex flex-wrap gap-1 mt-1">
 {confidenceInterval.risk_factors.map((factor, index) => (
 <span
 key={index}
 className="inline-flex px-2 rounded text-xs bg-blue-100 text-blue-700"
 >
 {factor.replace('_', ' ')}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 ) : (
 <div className="text-center py-6 text-gray-500">
 <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
 </svg>
 <p className="text-sm">No estimate available</p>
 {!readOnly && (
 <button
 onClick={() => setIsEditing(true)}
 className="mt-2 text-sm text-blue-600 hover:text-blue-800"
 >
 Add Estimate
 </button>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
};

export default TaskEstimationWidget;
