import React, { useState } from 'react';
import { 
 User, 
 Briefcase, 
 CheckSquare, 
 FileText, 
 Users, 
 AlertCircle, 
 CheckCircle, 
 Clock, 
 DollarSign,
 Target,
 ArrowRight,
 Info,
 X
} from 'lucide-react';
import { ResolvedContext } from '../../services/contextResolutionService';
import { ContextAwareCommand } from '../../middleware/contextMiddleware';
import { Customer, Project, Task, ProjectInvoice, TeamMember } from '../../types';

interface ContextPreviewProps {
 command: ContextAwareCommand;
 onConfirm: (command: ContextAwareCommand) => void;
 onCancel: () => void;
 onEditContext?: (context: ResolvedContext) => void;
 isProcessing?: boolean;
}

export const ContextPreview: React.FC<ContextPreviewProps> = ({
 command,
 onConfirm,
 onCancel,
 onEditContext,
 isProcessing = false
}) => {
 const [selectedCustomer, setSelectedCustomer] = useState<string>(command.entities.customer?.id || '');
 const [selectedProject, setSelectedProject] = useState<string>(command.entities.project?.id || '');
 const [selectedTasks, setSelectedTasks] = useState<string[]>(
 command.entities.tasks?.map((t: Task) => t.id) || []
 );
 const [showDetails, setShowDetails] = useState(false);

 const { context, intent, originalText, suggestedParameters } = command;
 const confidence = context.confidence;

 // Get confidence color and icon
 const getConfidenceDisplay = () => {
 if (confidence >= 0.8) {
 return { 
 color: 'text-green-600', 
 bgColor: 'bg-green-50', 
 icon: CheckCircle,
 text: 'High Confidence' 
 };
 } else if (confidence >= 0.6) {
 return { 
 color: 'text-yellow-600', 
 bgColor: 'bg-yellow-50', 
 icon: AlertCircle,
 text: 'Medium Confidence' 
 };
 } else {
 return { 
 color: 'text-red-600', 
 bgColor: 'bg-red-50', 
 icon: AlertCircle,
 text: 'Low Confidence' 
 };
 }
 };

 const confidenceDisplay = getConfidenceDisplay();
 const ConfidenceIcon = confidenceDisplay.icon;

 // Render entity cards
 const renderCustomerCard = (customer: Customer, isSelected: boolean = false) => (
 <div 
 key={customer.id}
 className={`p-3 rounded-lg border transition-all cursor-pointer ${
 isSelected 
 ? 'border-blue-500 bg-blue-50' 
 : 'border-gray-200 bg-white hover:border-gray-300'
 }`}
 onClick={() => setSelectedCustomer(customer.id)}
 >
 <div className="flex items-start space-x-3">
 <User className="w-4 h-4 text-gray-400 mt-1" />
 <div className="flex-1 min-w-0">
 <h4 className="text-sm font-medium text-gray-900 truncate">
 {customer.display_name || `${customer.first_name} ${customer.last_name}`}
 </h4>
 {customer.company_name && (
 <p className="text-xs text-gray-500 truncate">{customer.company_name}</p>
 )}
 <div className="flex items-center space-x-2 mt-1">
 <span className="text-xs text-gray-500">{customer.email}</span>
 {customer.due_amount && customer.due_amount > 0 && (
 <span className="text-xs text-red-600">
 Due: ${(customer.due_amount / 100).toFixed(2)}
 </span>
 )}
 </div>
 </div>
 </div>
 </div>
 );

 const renderProjectCard = (project: Project, isSelected: boolean = false) => (
 <div 
 key={project.id}
 className={`p-3 rounded-lg border transition-all cursor-pointer ${
 isSelected 
 ? 'border-blue-500 bg-blue-50' 
 : 'border-gray-200 bg-white hover:border-gray-300'
 }`}
 onClick={() => setSelectedProject(project.id)}
 >
 <div className="flex items-start space-x-3">
 <Briefcase className="w-4 h-4 text-gray-400 mt-1" />
 <div className="flex-1 min-w-0">
 <h4 className="text-sm font-medium text-gray-900 truncate">{project.name}</h4>
 <div className="flex items-center space-x-2 mt-1">
 <span className={`text-xs px-2 rounded-full ${
 project.status === 'active' ? 'bg-green-100 text-green-800' :
 project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
 project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
 'bg-gray-100 text-gray-800'
 }`}>
 {project.status}
 </span>
 <span className={`text-xs px-2 rounded-full ${
 project.priority === 'high' ? 'bg-red-100 text-red-800' :
 project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
 'bg-green-100 text-green-800'
 }`}>
 {project.priority}
 </span>
 </div>
 {project.budget && (
 <p className="text-xs text-gray-500 mt-1">
 Budget: ${(project.budget / 100).toFixed(2)}
 {project.actual_hours && ` • ${project.actual_hours}h logged`}
 </p>
 )}
 </div>
 </div>
 </div>
 );

 const renderTaskCard = (task: Task, isSelected: boolean = false) => (
 <div 
 key={task.id}
 className={`p-3 rounded-lg border transition-all cursor-pointer ${
 isSelected 
 ? 'border-blue-500 bg-blue-50' 
 : 'border-gray-200 bg-white hover:border-gray-300'
 }`}
 onClick={() => {
 if (isSelected) {
 setSelectedTasks(prev => prev.filter(id => id !== task.id));
 } else {
 setSelectedTasks(prev => [...prev, task.id]);
 }
 }}
 >
 <div className="flex items-start space-x-3">
 <CheckSquare className="w-4 h-4 text-gray-400 mt-1" />
 <div className="flex-1 min-w-0">
 <h4 className="text-sm font-medium text-gray-900 truncate">{task.title}</h4>
 <div className="flex items-center space-x-2 mt-1">
 <span className={`text-xs px-2 rounded-full ${
 task.status === 'completed' ? 'bg-green-100 text-green-800' :
 task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
 task.status === 'blocked' ? 'bg-red-100 text-red-800' :
 'bg-gray-100 text-gray-800'
 }`}>
 {task.status}
 </span>
 <span className={`text-xs px-2 rounded-full ${
 task.priority === 'critical' ? 'bg-red-100 text-red-800' :
 task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
 task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
 'bg-green-100 text-green-800'
 }`}>
 {task.priority}
 </span>
 </div>
 <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
 {task.actual_hours && (
 <span className="flex items-center">
 <Clock className="w-3 h-3 mr-1" />
 {task.actual_hours}h
 </span>
 )}
 {task.due_date && (
 <span className="flex items-center">
 <Target className="w-3 h-3 mr-1" />
 {new Date(task.due_date).toLocaleDateString()}
 </span>
 )}
 </div>
 </div>
 </div>
 </div>
 );

 const renderTeamMemberCard = (member: TeamMember) => (
 <div key={member.id} className="p-3 rounded-lg border border-gray-200 bg-white">
 <div className="flex items-start space-x-3">
 <Users className="w-4 h-4 text-gray-400 mt-1" />
 <div className="flex-1 min-w-0">
 <h4 className="text-sm font-medium text-gray-900">{member.full_name}</h4>
 <p className="text-xs text-gray-500">@{member.username} • {member.role}</p>
 {member.email && (
 <p className="text-xs text-gray-500 mt-1">{member.email}</p>
 )}
 </div>
 </div>
 </div>
 );

 const renderInvoiceCard = (invoice: ProjectInvoice) => (
 <div key={invoice.id} className="p-3 rounded-lg border border-gray-200 bg-white">
 <div className="flex items-start space-x-3">
 <FileText className="w-4 h-4 text-gray-400 mt-1" />
 <div className="flex-1 min-w-0">
 <h4 className="text-sm font-medium text-gray-900">{invoice.invoice_number}</h4>
 <div className="flex items-center space-x-2 mt-1">
 <span className={`text-xs px-2 rounded-full ${
 invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
 invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
 invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
 'bg-gray-100 text-gray-800'
 }`}>
 {invoice.status}
 </span>
 <span className="text-xs text-gray-600">
 ${(invoice.total_amount / 100).toFixed(2)}
 </span>
 </div>
 {invoice.due_date && (
 <p className="text-xs text-gray-500 mt-1">
 Due: {new Date(invoice.due_date).toLocaleDateString()}
 </p>
 )}
 </div>
 </div>
 </div>
 );

 // Render suggested action summary
 const renderActionSummary = () => {
 let actionText = '';
 let actionIcon = Target;

 switch (intent) {
 case 'CREATE_INVOICE':
 actionText = 'Create invoice';
 actionIcon = FileText;
 if (selectedCustomer) {
 const customer = context.customers.find(c => c.id === selectedCustomer);
 actionText += ` for ${customer?.display_name || 'customer'}`;
 }
 if (selectedTasks.length > 0) {
 actionText += ` with ${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''}`;
 }
 break;
 case 'UPDATE_STATUS':
 actionText = 'Update status';
 actionIcon = CheckCircle;
 if (selectedProject) {
 const project = context.projects.find(p => p.id === selectedProject);
 actionText += ` for project"${project?.name}"`;
 }
 if (selectedTasks.length > 0) {
 actionText += ` for ${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''}`;
 }
 break;
 case 'ASSIGN_TASK':
 actionText = 'Assign tasks';
 actionIcon = Users;
 if (selectedTasks.length > 0) {
 actionText += ` (${selectedTasks.length} task${selectedTasks.length > 1 ? 's' : ''})`;
 }
 break;
 default:
 actionText = 'Process request';
 }

 const ActionIcon = actionIcon;

 return (
 <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
 <ActionIcon className="w-5 h-5 text-blue-600" />
 <div className="flex-1">
 <h3 className="text-sm font-medium text-blue-900">Suggested Action</h3>
 <p className="text-sm text-blue-700">{actionText}</p>
 </div>
 <ArrowRight className="w-4 h-4 text-blue-600" />
 </div>
 );
 };

 return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
 {/* Header */}
 <div className="flex items-center justify-between p-4 border-b border-gray-200">
 <div className="flex items-center space-x-3">
 <h2 className="text-lg font-semibold text-gray-900">Context Preview</h2>
 <div className={`flex items-center space-x-2 rounded-full ${confidenceDisplay.bgColor}`}>
 <ConfidenceIcon className={`w-4 h-4 ${confidenceDisplay.color}`} />
 <span className={`text-sm font-medium ${confidenceDisplay.color}`}>
 {confidenceDisplay.text} ({(confidence * 100).toFixed(0)}%)
 </span>
 </div>
 </div>
 <button
 onClick={onCancel}
 className="text-gray-400 hover:text-gray-600 transition-colors"
 disabled={isProcessing}
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="flex flex-col h-[calc(90vh-80px)]">
 {/* Content */}
 <div className="flex-1 overflow-y-auto p-4 space-y-6">
 {/* Original Request */}
 <div className="bg-gray-50 rounded-lg p-4">
 <h3 className="text-sm font-medium text-gray-900 mb-2">Original Request</h3>
 <p className="text-sm text-gray-700 italic">"{originalText}"</p>
 <p className="text-xs text-gray-500 mt-2">Intent: {intent}</p>
 </div>

 {/* Action Summary */}
 {renderActionSummary()}

 {/* Context Sections */}
 {context.customers.length > 0 && (
 <div>
 <h3 className="text-sm font-medium text-gray-900 mb-3">
 Customers ({context.customers.length})
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {context.customers.map(customer => 
 renderCustomerCard(customer, selectedCustomer === customer.id)
 )}
 </div>
 </div>
 )}

 {context.projects.length > 0 && (
 <div>
 <h3 className="text-sm font-medium text-gray-900 mb-3">
 Projects ({context.projects.length})
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {context.projects.map(project => 
 renderProjectCard(project, selectedProject === project.id)
 )}
 </div>
 </div>
 )}

 {context.tasks.length > 0 && (
 <div>
 <h3 className="text-sm font-medium text-gray-900 mb-3">
 Tasks ({context.tasks.length}) - Select multiple
 </h3>
 <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
 {context.tasks.map(task => 
 renderTaskCard(task, selectedTasks.includes(task.id))
 )}
 </div>
 </div>
 )}

 {context.teamMembers.length > 0 && (
 <div>
 <h3 className="text-sm font-medium text-gray-900 mb-3">
 Team Members ({context.teamMembers.length})
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {context.teamMembers.map(renderTeamMemberCard)}
 </div>
 </div>
 )}

 {context.invoices.length > 0 && (
 <div>
 <h3 className="text-sm font-medium text-gray-900 mb-3">
 Invoices ({context.invoices.length})
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {context.invoices.map(renderInvoiceCard)}
 </div>
 </div>
 )}

 {/* Suggestions */}
 {context.suggestions.length > 0 && (
 <div className="bg-yellow-50 rounded-lg p-4">
 <h3 className="text-sm font-medium text-yellow-900 mb-2 flex items-center">
 <Info className="w-4 h-4 mr-2" />
 Suggestions for Better Results
 </h3>
 <ul className="text-sm text-yellow-800 space-y-1">
 {context.suggestions.map((suggestion, index) => (
 <li key={index} className="flex items-start">
 <span className="text-yellow-600 mr-2">•</span>
 {suggestion}
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* Suggested Parameters Preview */}
 {suggestedParameters && Object.keys(suggestedParameters).length > 0 && showDetails && (
 <div className="bg-blue-50 rounded-lg p-4">
 <h3 className="text-sm font-medium text-blue-900 mb-2">Suggested Parameters</h3>
 <pre className="text-xs text-blue-800 bg-blue-100 rounded p-2 overflow-x-auto">
 {JSON.stringify(suggestedParameters, null, 2)}
 </pre>
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="border-t border-gray-200 p-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-2">
 <button
 onClick={() => setShowDetails(!showDetails)}
 className="text-xs text-gray-500 hover:text-gray-700"
 >
 {showDetails ? 'Hide' : 'Show'} technical details
 </button>
 </div>
 
 <div className="flex space-x-3">
 <button
 onClick={onCancel}
 disabled={isProcessing}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={() => onConfirm(command)}
 disabled={isProcessing || confidence < 0.3}
 className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
 >
 {isProcessing && (
 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
 )}
 <span>{isProcessing ? 'Processing...' : 'Confirm & Execute'}</span>
 </button>
 </div>
 </div>
 
 {confidence < 0.3 && (
 <p className="text-xs text-red-600 mt-2">
 Confidence too low to execute safely. Please refine your request.
 </p>
 )}
 </div>
 </div>
 </div>
 </div>
 );
};