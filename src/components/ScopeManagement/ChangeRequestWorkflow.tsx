import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  TagIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  HandRaisedIcon,
  ShieldCheckIcon,
  DocumentArrowUpIcon,
  ClipboardDocumentCheckIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface ChangeRequest {
  id: string;
  request_number: string;
  title: string;
  description: string;
  project_id: string;
  related_scope_id?: string;
  change_type: 'scope_addition' | 'scope_modification' | 'scope_removal' | 'requirement_change' | 'timeline_change' | 'budget_change' | 'team_change' | 'technical_change';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'proposed' | 'under_review' | 'approved' | 'rejected' | 'implemented' | 'cancelled';
  requested_by_id: string;
  assigned_to_id?: string;
  stakeholders: string[];
  business_justification: string;
  expected_benefits: string[];
  risk_assessment: string;
  time_impact_hours?: number;
  cost_impact?: number;
  resource_impact: any;
  timeline_impact_days?: number;
  overall_impact: 'minimal' | 'low' | 'medium' | 'high' | 'critical';
  technical_requirements: string[];
  implementation_approach: string;
  testing_requirements: string[];
  approval_required: boolean;
  approvers: string[];
  approved_by: string[];
  rejected_by: string[];
  approval_deadline?: string;
  implementation_deadline?: string;
  created_at: string;
  updated_at: string;
  workflow_stage: 'initiation' | 'analysis' | 'approval' | 'implementation' | 'verification' | 'closure';
  workflow_history: WorkflowStep[];
  comments: Comment[];
  attachments: Attachment[];
}

interface WorkflowStep {
  id: string;
  stage: string;
  action: string;
  actor_id: string;
  actor_name: string;
  timestamp: string;
  notes?: string;
  duration_hours?: number;
}

interface Comment {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at: string;
  type: 'comment' | 'approval' | 'rejection' | 'clarification' | 'update';
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface ChangeRequestWorkflowProps {
  projectId: string;
  onRequestCreate?: (request: ChangeRequest) => void;
  onRequestUpdate?: (request: ChangeRequest) => void;
}

const ChangeRequestWorkflow: React.FC<ChangeRequestWorkflowProps> = ({
  projectId,
  onRequestCreate,
  onRequestUpdate
}) => {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'board' | 'analytics'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for demonstration
  useEffect(() => {
    const mockRequests: ChangeRequest[] = [
      {
        id: 'cr-001',
        request_number: 'CR-2024-001',
        title: 'Add Two-Factor Authentication',
        description: 'Implement two-factor authentication to enhance security as requested by the compliance team',
        project_id: projectId,
        change_type: 'scope_addition',
        priority: 'high',
        status: 'under_review',
        requested_by_id: 'user-1',
        assigned_to_id: 'user-2',
        stakeholders: ['user-1', 'user-2', 'user-3'],
        business_justification: 'Required for SOC 2 compliance and to meet security standards',
        expected_benefits: ['Enhanced security', 'Compliance certification', 'Customer trust'],
        risk_assessment: 'Low risk - standard implementation with proven libraries',
        time_impact_hours: 80,
        cost_impact: 15000,
        resource_impact: {
          developers: 2,
          qa_engineers: 1,
          security_specialist: 1
        },
        timeline_impact_days: 14,
        overall_impact: 'medium',
        technical_requirements: ['SMS provider integration', 'TOTP support', 'Recovery codes'],
        implementation_approach: 'Use industry-standard libraries (Google Authenticator compatible)',
        testing_requirements: ['Unit tests', 'Integration tests', 'Security audit'],
        approval_required: true,
        approvers: ['user-3', 'user-4'],
        approved_by: ['user-3'],
        rejected_by: [],
        approval_deadline: '2024-02-15T00:00:00Z',
        implementation_deadline: '2024-03-01T00:00:00Z',
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-22T14:30:00Z',
        workflow_stage: 'approval',
        workflow_history: [
          {
            id: 'wf-1',
            stage: 'initiation',
            action: 'created',
            actor_id: 'user-1',
            actor_name: 'John Doe',
            timestamp: '2024-01-20T10:00:00Z',
            notes: 'Initial request submitted'
          },
          {
            id: 'wf-2',
            stage: 'analysis',
            action: 'analyzed',
            actor_id: 'user-2',
            actor_name: 'Jane Smith',
            timestamp: '2024-01-21T09:15:00Z',
            notes: 'Technical analysis completed',
            duration_hours: 4
          }
        ],
        comments: [
          {
            id: 'c-1',
            content: 'This is critical for our compliance certification. We should prioritize this.',
            author_id: 'user-3',
            author_name: 'Mike Johnson',
            created_at: '2024-01-21T11:00:00Z',
            type: 'comment'
          }
        ],
        attachments: [
          {
            id: 'a-1',
            name: 'security-requirements.pdf',
            type: 'application/pdf',
            size: 245760,
            url: '/attachments/security-requirements.pdf',
            uploaded_by: 'user-1',
            uploaded_at: '2024-01-20T10:30:00Z'
          }
        ]
      }
    ];
    setRequests(mockRequests);
  }, [projectId]);

  const filteredRequests = requests.filter(request => {
    if (filterStatus !== 'all' && request.status !== filterStatus) return false;
    if (filterPriority !== 'all' && request.priority !== filterPriority) return false;
    if (searchQuery && !request.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !request.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'proposed': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'implemented': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      case 'minimal': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Change Requests</h2>
          <p className="text-gray-600 mt-1">
            Manage project scope changes and requirement modifications
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <DocumentArrowUpIcon className="w-5 h-5" />
          <span>New Change Request</span>
        </button>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search change requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="proposed">Proposed</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="implemented">Implemented</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {['list', 'board', 'analytics'].map(view => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view as any)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    currentView === view
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: requests.length, color: 'text-gray-600' },
            { label: 'Pending', value: requests.filter(r => ['proposed', 'under_review'].includes(r.status)).length, color: 'text-yellow-600' },
            { label: 'Approved', value: requests.filter(r => r.status === 'approved').length, color: 'text-green-600' },
            { label: 'Critical', value: requests.filter(r => r.priority === 'critical').length, color: 'text-red-600' },
            { label: 'This Month', value: requests.filter(r => new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length, color: 'text-blue-600' }
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content based on view */}
      {currentView === 'list' && (
        <ChangeRequestList
          requests={filteredRequests}
          onRequestSelect={setSelectedRequest}
          getStatusColor={getStatusColor}
          getPriorityColor={getPriorityColor}
          getImpactColor={getImpactColor}
        />
      )}

      {currentView === 'board' && (
        <ChangeRequestBoard
          requests={filteredRequests}
          onRequestSelect={setSelectedRequest}
          getStatusColor={getStatusColor}
          getPriorityColor={getPriorityColor}
        />
      )}

      {currentView === 'analytics' && (
        <ChangeRequestAnalytics requests={requests} />
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <ChangeRequestDetail
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={(updatedRequest) => {
            setRequests(prev => prev.map(r => r.id === updatedRequest.id ? updatedRequest : r));
            setSelectedRequest(updatedRequest);
            if (onRequestUpdate) {
              onRequestUpdate(updatedRequest);
            }
          }}
          getStatusColor={getStatusColor}
          getPriorityColor={getPriorityColor}
          getImpactColor={getImpactColor}
        />
      )}

      {/* Create Request Modal */}
      {showCreateForm && (
        <CreateChangeRequestModal
          projectId={projectId}
          onClose={() => setShowCreateForm(false)}
          onCreate={(newRequest) => {
            setRequests(prev => [...prev, newRequest]);
            setShowCreateForm(false);
            if (onRequestCreate) {
              onRequestCreate(newRequest);
            }
          }}
        />
      )}
    </div>
  );
};

// Change Request List Component
const ChangeRequestList: React.FC<{
  requests: ChangeRequest[];
  onRequestSelect: (request: ChangeRequest) => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  getImpactColor: (impact: string) => string;
}> = ({ requests, onRequestSelect, getStatusColor, getPriorityColor, getImpactColor }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-200">
        {requests.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No change requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first change request.
            </p>
          </div>
        ) : (
          requests.map(request => (
            <div
              key={request.id}
              className="p-6 hover:bg-gray-50 cursor-pointer"
              onClick={() => onRequestSelect(request)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {request.title}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {request.request_number}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPriorityColor(request.priority)}`}>
                      {request.priority}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{request.description}</p>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>Created {new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {request.time_impact_hours && (
                      <div className="flex items-center space-x-1">
                        <ChartBarIcon className="w-4 h-4" />
                        <span>{request.time_impact_hours}h impact</span>
                      </div>
                    )}
                    
                    {request.cost_impact && (
                      <div className="flex items-center space-x-1">
                        <CurrencyDollarIcon className="w-4 h-4" />
                        <span>${request.cost_impact.toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1">
                      <ExclamationTriangleIcon className={`w-4 h-4 ${getImpactColor(request.overall_impact)}`} />
                      <span className={getImpactColor(request.overall_impact)}>
                        {request.overall_impact} impact
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <UserGroupIcon className="w-4 h-4" />
                      <span>{request.stakeholders.length} stakeholders</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestSelect(request);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Change Request Board Component (Kanban style)
const ChangeRequestBoard: React.FC<{
  requests: ChangeRequest[];
  onRequestSelect: (request: ChangeRequest) => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
}> = ({ requests, onRequestSelect, getStatusColor, getPriorityColor }) => {
  const statuses = ['proposed', 'under_review', 'approved', 'implemented'];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {statuses.map(status => {
        const statusRequests = requests.filter(r => r.status === status);
        return (
          <div key={status} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 capitalize">
                {status.replace('_', ' ')}
              </h3>
              <span className="text-sm text-gray-500">
                {statusRequests.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {statusRequests.map(request => (
                <div
                  key={request.id}
                  className="bg-white p-3 rounded-md border border-gray-200 cursor-pointer hover:shadow-sm"
                  onClick={() => onRequestSelect(request)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {request.title}
                    </h4>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(request.priority)}`}>
                      {request.priority}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {request.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{request.request_number}</span>
                    <span>{new Date(request.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Change Request Analytics Component
const ChangeRequestAnalytics: React.FC<{
  requests: ChangeRequest[];
}> = ({ requests }) => {
  const statusCounts = requests.reduce((acc, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityCounts = requests.reduce((acc, req) => {
    acc[req.priority] = (acc[req.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgImplementationTime = requests
    .filter(r => r.status === 'implemented')
    .reduce((acc, req) => {
      const created = new Date(req.created_at).getTime();
      const updated = new Date(req.updated_at).getTime();
      return acc + (updated - created) / (1000 * 60 * 60 * 24);
    }, 0) / requests.filter(r => r.status === 'implemented').length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Status Distribution */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Status Distribution</h3>
        <div className="space-y-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(count / requests.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Breakdown */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Priority Breakdown</h3>
        <div className="space-y-3">
          {Object.entries(priorityCounts).map(([priority, count]) => (
            <div key={priority} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 capitalize">{priority}</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      priority === 'critical' ? 'bg-red-500' :
                      priority === 'high' ? 'bg-orange-500' :
                      priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(count / requests.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Key Metrics</h3>
        <div className="space-y-4">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {avgImplementationTime.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Avg. Implementation Days</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-green-600">
              {((requests.filter(r => r.status === 'approved').length / requests.length) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Approval Rate</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-orange-600">
              ${requests.reduce((acc, req) => acc + (req.cost_impact || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Cost Impact</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Change Request Detail Modal Component
const ChangeRequestDetail: React.FC<{
  request: ChangeRequest;
  onClose: () => void;
  onUpdate: (request: ChangeRequest) => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  getImpactColor: (impact: string) => string;
}> = ({ request, onClose, onUpdate, getStatusColor, getPriorityColor, getImpactColor }) => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{request.title}</h3>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-sm text-gray-500">{request.request_number}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                  {request.status.replace('_', ' ')}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPriorityColor(request.priority)}`}>
                  {request.priority}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="px-6 flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: InformationCircleIcon },
              { id: 'workflow', name: 'Workflow', icon: ArrowPathIcon },
              { id: 'impact', name: 'Impact Analysis', icon: ChartBarIcon },
              { id: 'comments', name: 'Comments', icon: ChatBubbleLeftRightIcon },
              { id: 'attachments', name: 'Attachments', icon: DocumentTextIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-3 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
                  activeTab === tab.id ? 'text-indigo-600' : 'text-black hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="px-6 py-6">
          {activeTab === 'overview' && (
            <ChangeRequestOverview request={request} getImpactColor={getImpactColor} />
          )}
          {activeTab === 'workflow' && (
            <ChangeRequestWorkflowView request={request} onUpdate={onUpdate} />
          )}
          {activeTab === 'impact' && (
            <ChangeRequestImpactAnalysis request={request} />
          )}
          {activeTab === 'comments' && (
            <ChangeRequestComments request={request} onUpdate={onUpdate} />
          )}
          {activeTab === 'attachments' && (
            <ChangeRequestAttachments request={request} onUpdate={onUpdate} />
          )}
        </div>
      </div>
    </div>
  );
};

// Placeholder components for the detail tabs (these would be fully implemented)
const ChangeRequestOverview: React.FC<{ request: ChangeRequest; getImpactColor: (impact: string) => string }> = ({ request, getImpactColor }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div>
      <h4 className="text-lg font-medium text-gray-900 mb-4">Request Details</h4>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <p className="text-sm text-gray-900 mt-1">{request.description}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Business Justification</label>
          <p className="text-sm text-gray-900 mt-1">{request.business_justification}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Expected Benefits</label>
          <ul className="text-sm text-gray-900 mt-1 list-disc list-inside">
            {request.expected_benefits.map((benefit, index) => (
              <li key={index}>{benefit}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
    
    <div>
      <h4 className="text-lg font-medium text-gray-900 mb-4">Impact Summary</h4>
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Overall Impact:</span>
          <span className={`text-sm font-medium ${getImpactColor(request.overall_impact)}`}>
            {request.overall_impact}
          </span>
        </div>
        
        {request.time_impact_hours && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Time Impact:</span>
            <span className="text-sm font-medium">{request.time_impact_hours} hours</span>
          </div>
        )}
        
        {request.cost_impact && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Cost Impact:</span>
            <span className="text-sm font-medium">${request.cost_impact.toLocaleString()}</span>
          </div>
        )}
        
        {request.timeline_impact_days && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Timeline Impact:</span>
            <span className="text-sm font-medium">{request.timeline_impact_days} days</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

const ChangeRequestWorkflowView: React.FC<{ request: ChangeRequest; onUpdate: (request: ChangeRequest) => void }> = ({ request, onUpdate }) => (
  <div>
    <h4 className="text-lg font-medium text-gray-900 mb-4">Workflow History</h4>
    <div className="space-y-4">
      {request.workflow_history.map((step, index) => (
        <div key={step.id} className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">{index + 1}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">{step.action}</span>
              <span className="text-sm text-gray-500">by {step.actor_name}</span>
              <span className="text-sm text-gray-500">{new Date(step.timestamp).toLocaleString()}</span>
            </div>
            {step.notes && (
              <p className="text-sm text-gray-600 mt-1">{step.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ChangeRequestImpactAnalysis: React.FC<{ request: ChangeRequest }> = ({ request }) => (
  <div className="space-y-6">
    <div>
      <h4 className="text-lg font-medium text-gray-900 mb-4">Technical Requirements</h4>
      <ul className="space-y-2">
        {request.technical_requirements.map((req, index) => (
          <li key={index} className="flex items-start space-x-2">
            <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5" />
            <span className="text-sm text-gray-900">{req}</span>
          </li>
        ))}
      </ul>
    </div>
    
    <div>
      <h4 className="text-lg font-medium text-gray-900 mb-4">Implementation Approach</h4>
      <p className="text-sm text-gray-900">{request.implementation_approach}</p>
    </div>
  </div>
);

const ChangeRequestComments: React.FC<{ request: ChangeRequest; onUpdate: (request: ChangeRequest) => void }> = ({ request, onUpdate }) => (
  <div className="space-y-4">
    {request.comments.map(comment => (
      <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">{comment.author_name}</span>
          <span className="text-sm text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
        </div>
        <p className="text-sm text-gray-700">{comment.content}</p>
      </div>
    ))}
  </div>
);

const ChangeRequestAttachments: React.FC<{ request: ChangeRequest; onUpdate: (request: ChangeRequest) => void }> = ({ request, onUpdate }) => (
  <div className="space-y-4">
    {request.attachments.map(attachment => (
      <div key={attachment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <DocumentTextIcon className="w-6 h-6 text-gray-400" />
          <div>
            <span className="text-sm font-medium text-gray-900">{attachment.name}</span>
            <div className="text-sm text-gray-500">
              {(attachment.size / 1024).toFixed(1)} KB • {new Date(attachment.uploaded_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        <button className="text-blue-600 hover:text-blue-700">
          <ArrowTopRightOnSquareIcon className="w-5 h-5" />
        </button>
      </div>
    ))}
  </div>
);

// Create Change Request Modal (simplified)
const CreateChangeRequestModal: React.FC<{
  projectId: string;
  onClose: () => void;
  onCreate: (request: ChangeRequest) => void;
}> = ({ projectId, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    change_type: 'scope_addition',
    priority: 'medium',
    business_justification: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newRequest: ChangeRequest = {
      id: `cr-${Date.now()}`,
      request_number: `CR-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      project_id: projectId,
      requested_by_id: 'current-user',
      stakeholders: [],
      expected_benefits: [],
      risk_assessment: '',
      overall_impact: 'medium',
      technical_requirements: [],
      implementation_approach: '',
      testing_requirements: [],
      approval_required: true,
      approvers: [],
      approved_by: [],
      rejected_by: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workflow_stage: 'initiation',
      workflow_history: [],
      comments: [],
      attachments: [],
      status: 'draft',
      resource_impact: {},
      ...formData
    } as ChangeRequest;

    onCreate(newRequest);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">New Change Request</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Change Type</label>
              <select
                value={formData.change_type}
                onChange={(e) => setFormData({...formData, change_type: e.target.value as any})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="scope_addition">Scope Addition</option>
                <option value="scope_modification">Scope Modification</option>
                <option value="scope_removal">Scope Removal</option>
                <option value="requirement_change">Requirement Change</option>
                <option value="timeline_change">Timeline Change</option>
                <option value="budget_change">Budget Change</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Justification</label>
            <textarea
              value={formData.business_justification}
              onChange={(e) => setFormData({...formData, business_justification: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={2}
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangeRequestWorkflow;
