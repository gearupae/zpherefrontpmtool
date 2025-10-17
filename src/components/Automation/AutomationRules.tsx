import React, { useState, useEffect } from 'react';
import { 
 BoltIcon, 
 PlusIcon,
 TrashIcon,
 PlayIcon,
 PauseIcon,
 CogIcon
} from '@heroicons/react/24/outline';

interface AutomationRule {
 id: string;
 name: string;
 description: string;
 trigger: {
 type: string;
 conditions: Record<string, any>;
 };
 actions: Array<{
 type: string;
 parameters: Record<string, any>;
 }>;
 isActive: boolean;
 lastTriggered?: string;
 triggerCount: number;
}

const AutomationRules: React.FC = () => {
 const [rules, setRules] = useState<AutomationRule[]>([]);
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [newRule, setNewRule] = useState({
 name: '',
 description: '',
 trigger: { type: '', conditions: {} },
 actions: [{ type: '', parameters: {} }],
 isActive: true
 });

 useEffect(() => {
 loadAutomationRules();
 }, []);

 const loadAutomationRules = async () => {
 // Mock data - would come from API
 const mockRules: AutomationRule[] = [
 {
 id: '1',
 name: 'Task Completion Notification',
 description: 'Notify project manager when a task is completed',
 trigger: {
 type: 'task_status_changed',
 conditions: { new_status: 'completed' }
 },
 actions: [
 {
 type: 'send_notification',
 parameters: { recipient: 'project_manager', message: 'Task completed: {{task_name}}' }
 }
 ],
 isActive: true,
 lastTriggered: '2024-08-17T10:30:00Z',
 triggerCount: 15
 },
 {
 id: '2',
 name: 'Deadline Reminder',
 description: 'Send reminder 2 days before task deadline',
 trigger: {
 type: 'deadline_approaching',
 conditions: { days_before: 2 }
 },
 actions: [
 {
 type: 'send_email',
 parameters: { template: 'deadline_reminder', recipient: 'assignee' }
 }
 ],
 isActive: true,
 lastTriggered: '2024-08-16T09:00:00Z',
 triggerCount: 8
 },
 {
 id: '3',
 name: 'Auto-assign Reviewer',
 description: 'Automatically assign a reviewer when task moves to"In Review"',
 trigger: {
 type: 'task_status_changed',
 conditions: { new_status: 'in_review' }
 },
 actions: [
 {
 type: 'assign_user',
 parameters: { role: 'reviewer', selection_method: 'least_busy' }
 }
 ],
 isActive: false,
 triggerCount: 3
 }
 ];
 setRules(mockRules);
 };

 const triggerTypes = [
 { value: 'task_status_changed', label: 'When task status changes' },
 { value: 'project_created', label: 'When project is created' },
 { value: 'deadline_approaching', label: 'When deadline approaches' },
 { value: 'team_member_added', label: 'When team member is added' },
 { value: 'milestone_reached', label: 'When milestone is reached' }
 ];

 const actionTypes = [
 { value: 'send_notification', label: 'Send notification' },
 { value: 'send_email', label: 'Send email' },
 { value: 'assign_user', label: 'Assign user' },
 { value: 'update_status', label: 'Update status' },
 { value: 'create_task', label: 'Create task' },
 { value: 'webhook', label: 'Call webhook' }
 ];

 const toggleRuleStatus = (ruleId: string) => {
 setRules(rules.map(rule => 
 rule.id === ruleId 
 ? { ...rule, isActive: !rule.isActive }
 : rule
 ));
 };

 const deleteRule = (ruleId: string) => {
 setRules(rules.filter(rule => rule.id !== ruleId));
 };

 const createRule = () => {
 const rule: AutomationRule = {
 id: Date.now().toString(),
 name: newRule.name,
 description: newRule.description,
 trigger: newRule.trigger,
 actions: newRule.actions,
 isActive: newRule.isActive,
 triggerCount: 0
 };
 
 setRules([...rules, rule]);
 setShowCreateModal(false);
 setNewRule({
 name: '',
 description: '',
 trigger: { type: '', conditions: {} },
 actions: [{ type: '', parameters: {} }],
 isActive: true
 });
 };

 const formatLastTriggered = (timestamp?: string) => {
 if (!timestamp) return 'Never';
 return new Date(timestamp).toLocaleString();
 };

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div className="flex items-center space-x-2">
 <BoltIcon className="h-6 w-6 text-gray-500" />
 <h2 className="text-xl font-semibold text-[#0d0d0d]">Automation Rules</h2>
 </div>
 
 <button
 onClick={() => setShowCreateModal(true)}
 className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#0d0d0d] bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
 >
 <PlusIcon className="h-4 w-4 mr-2" />
 Create Rule
 </button>
 </div>

 {/* Rules List */}
 <div className="space-y-4">
 {rules.map((rule) => (
 <div key={rule.id} className="bg-white rounded-lg shadow border p-6">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center space-x-3">
 <h3 className="text-lg font-medium text-[#0d0d0d]">{rule.name}</h3>
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 rule.isActive 
 ? 'bg-green-50 text-green-700 border border-green-200' 
 : 'bg-gray-50 text-gray-700 border border-gray-200'
 }`}>
 {rule.isActive ? 'Active' : 'Inactive'}
 </span>
 </div>
 
 <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
 
 <div className="mt-4 space-y-2">
 <div className="text-sm">
 <span className="font-medium text-gray-700">Trigger:</span>{' '}
 <span className="text-[#0d0d0d]">
 {triggerTypes.find(t => t.value === rule.trigger.type)?.label || rule.trigger.type}
 </span>
 </div>
 
 <div className="text-sm">
 <span className="font-medium text-gray-700">Actions:</span>{' '}
 <span className="text-[#0d0d0d]">
 {rule.actions.map((action, index) => (
 <span key={index}>
 {actionTypes.find(a => a.value === action.type)?.label || action.type}
 {index < rule.actions.length - 1 ? ', ' : ''}
 </span>
 ))}
 </span>
 </div>
 
 <div className="flex items-center space-x-4 text-sm text-gray-500">
 <span>Triggered {rule.triggerCount} times</span>
 <span>Last: {formatLastTriggered(rule.lastTriggered)}</span>
 </div>
 </div>
 </div>
 
 <div className="flex items-center space-x-2">
 <button
 onClick={() => toggleRuleStatus(rule.id)}
 className={`p-2 rounded-md ${
 rule.isActive 
 ? 'text-green-600 hover:bg-green-50' 
 : 'text-gray-400 hover:bg-gray-50'
 } transition-colors`}
 title={rule.isActive ? 'Pause rule' : 'Activate rule'}
 >
 {rule.isActive ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
 </button>
 
 <button
 onClick={() => console.log('Edit rule:', rule.id)}
 className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
 title="Edit rule"
 >
 <CogIcon className="h-4 w-4" />
 </button>
 
 <button
 onClick={() => deleteRule(rule.id)}
 className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
 title="Delete rule"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Create Rule Modal */}
 {showCreateModal && (
 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
 <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
 <div className="mt-3">
 <h3 className="text-lg font-medium text-[#0d0d0d] mb-4">Create Automation Rule</h3>
 
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
 <input
 type="text"
 value={newRule.name}
 onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
 className="w-full border border-gray-300 rounded-md py-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder="Enter rule name"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
 <textarea
 value={newRule.description}
 onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
 className="w-full border border-gray-300 rounded-md py-2 focus:ring-blue-500 focus:border-blue-500"
 rows={2}
 placeholder="Describe what this rule does"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
 <select
 value={newRule.trigger.type}
 onChange={(e) => setNewRule({ 
 ...newRule, 
 trigger: { ...newRule.trigger, type: e.target.value } 
 })}
 className="w-full border border-gray-300 rounded-md py-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="">Select a trigger</option>
 {triggerTypes.map(trigger => (
 <option key={trigger.value} value={trigger.value}>
 {trigger.label}
 </option>
 ))}
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
 <select
 value={newRule.actions[0]?.type || ''}
 onChange={(e) => setNewRule({ 
 ...newRule, 
 actions: [{ type: e.target.value, parameters: {} }] 
 })}
 className="w-full border border-gray-300 rounded-md py-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="">Select an action</option>
 {actionTypes.map(action => (
 <option key={action.value} value={action.value}>
 {action.label}
 </option>
 ))}
 </select>
 </div>
 
 <div className="flex items-center">
 <input
 type="checkbox"
 id="isActive"
 checked={newRule.isActive}
 onChange={(e) => setNewRule({ ...newRule, isActive: e.target.checked })}
 className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
 />
 <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
 Activate rule immediately
 </label>
 </div>
 </div>
 
 <div className="flex justify-end space-x-3 mt-6">
 <button
 onClick={() => setShowCreateModal(false)}
 className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-[#0d0d0d] bg-white hover:bg-gray-50 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={createRule}
 disabled={!newRule.name || !newRule.trigger.type || !newRule.actions[0]?.type}
 className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 Create Rule
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Quick Stats */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-green-50 p-4 rounded-lg border border-green-200">
 <div className="text-green-700 font-medium">Active Rules</div>
 <div className="text-green-900 text-2xl font-bold">
 {rules.filter(r => r.isActive).length}
 </div>
 </div>
 
 <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
 <div className="text-blue-700 font-medium">Total Triggers</div>
 <div className="text-blue-900 text-2xl font-bold">
 {rules.reduce((sum, r) => sum + r.triggerCount, 0)}
 </div>
 </div>
 
 <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
 <div className="text-purple-700 font-medium">Total Rules</div>
 <div className="text-purple-900 text-2xl font-bold">
 {rules.length}
 </div>
 </div>
 </div>
 </div>
 );
};

export default AutomationRules;
