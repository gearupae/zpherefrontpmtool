import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ChangeRequestForm from './ChangeRequestForm';

interface ChangeRequest {
  id: string;
  request_number: string;
  title: string;
  description: string;
  change_type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'proposed' | 'under_review' | 'approved' | 'rejected' | 'implemented' | 'cancelled';
  requested_by_id: string;
  requested_date: string;
  required_by_date?: string;
  time_impact_hours?: number;
  cost_impact?: number;
  timeline_impact_days?: number;
  overall_impact: string;
  business_justification: string;
  expected_benefits: string[];
  approvers: string[];
  approved_by: string[];
  rejected_by: string[];
}

interface ChangeRequestSummary {
  total_change_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  implemented_requests: number;
  total_time_impact: number;
  total_cost_impact: number;
  avg_approval_time_days: number;
}

const ChangeRequestDashboard: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [summary, setSummary] = useState<ChangeRequestSummary | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<{
    status?: string;
    priority?: string;
    search?: string;
  }>({});

  useEffect(() => {
    if (projectId) {
      loadChangeRequests();
      loadSummary();
    }
  }, [projectId, filter]);

  const loadChangeRequests = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.priority) params.append('priority', filter.priority);

      const response = await fetch(`/api/v1/projects/${projectId}/change-requests?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChangeRequests(data);
      }
    } catch (error) {
      console.error('Failed to load change requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/change-request-summary`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  const handleCreateRequest = async (data: any) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/change-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setShowForm(false);
        loadChangeRequests();
        loadSummary();
      } else {
        throw new Error('Failed to create change request');
      }
    } catch (error) {
      console.error('Error creating change request:', error);
      throw error;
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/v1/change-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        loadChangeRequests();
        loadSummary();
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'under_review': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'approved': return 'text-green-600 bg-green-100 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-100 border-red-200';
      case 'implemented': return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'cancelled': return 'text-gray-600 bg-gray-100 border-gray-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const formatChangeType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredRequests = changeRequests.filter(request => {
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return (
        request.title.toLowerCase().includes(searchLower) ||
        request.description.toLowerCase().includes(searchLower) ||
        request.request_number.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (showForm) {
    return (
      <ChangeRequestForm
        onSubmit={handleCreateRequest}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  if (selectedRequest) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-sm rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedRequest.request_number}
              </h2>
              <p className="text-sm text-gray-600">{selectedRequest.title}</p>
            </div>
            <button
              onClick={() => setSelectedRequest(null)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-gray-500">Status</span>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedRequest.status)}`}>
                  {selectedRequest.status.replace('_', ' ')}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Priority</span>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(selectedRequest.priority)}`}>
                  {selectedRequest.priority}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Change Type</span>
                <div className="text-sm font-medium text-gray-900">
                  {formatChangeType(selectedRequest.change_type)}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{selectedRequest.description}</p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Business Justification</h3>
              <p className="text-gray-600">{selectedRequest.business_justification}</p>
            </div>

            {selectedRequest.expected_benefits.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Expected Benefits</h3>
                <ul className="list-disc list-inside space-y-1">
                  {selectedRequest.expected_benefits.map((benefit, index) => (
                    <li key={index} className="text-gray-600">{benefit}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Impact Assessment */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Impact Assessment</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedRequest.time_impact_hours && (
                  <div>
                    <span className="text-sm text-gray-500">Time Impact</span>
                    <div className="text-lg font-semibold text-gray-900">
                      {selectedRequest.time_impact_hours}h
                    </div>
                  </div>
                )}
                {selectedRequest.cost_impact && (
                  <div>
                    <span className="text-sm text-gray-500">Cost Impact</span>
                    <div className="text-lg font-semibold text-gray-900">
                      ${selectedRequest.cost_impact.toLocaleString()}
                    </div>
                  </div>
                )}
                {selectedRequest.timeline_impact_days && (
                  <div>
                    <span className="text-sm text-gray-500">Timeline Impact</span>
                    <div className="text-lg font-semibold text-gray-900">
                      {selectedRequest.timeline_impact_days} days
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {selectedRequest.status === 'proposed' && (
              <div className="flex space-x-3">
                <button
                  onClick={() => handleApproveRequest(selectedRequest.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Change Requests</h1>
          <p className="text-gray-600 mt-2">
            Manage project scope changes and track their impact
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Change Request
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Requests</dt>
                  <dd className="text-lg font-medium text-gray-900">{summary.total_change_requests}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Review</dt>
                  <dd className="text-lg font-medium text-gray-900">{summary.pending_requests}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                  <dd className="text-lg font-medium text-gray-900">{summary.approved_requests}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Implemented</dt>
                  <dd className="text-lg font-medium text-gray-900">{summary.implemented_requests}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-wrap items-center space-x-4">
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
              <option value="">All Statuses</option>
              <option value="proposed">Proposed</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="implemented">Implemented</option>
            </select>
          </div>

          <div>
            <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority-filter"
              value={filter.priority || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value || undefined }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={filter.search || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value || undefined }))}
              placeholder="Search requests..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Change Requests List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Change Requests ({filteredRequests.length})
          </h3>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No change requests</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first change request.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                onClick={() => setSelectedRequest(request)}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900 truncate">
                        {request.title}
                      </h4>
                      <span className="text-sm text-gray-500">
                        {request.request_number}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {request.description}
                    </p>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                        {request.status.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                        {request.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatChangeType(request.change_type)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Requested {formatDate(request.requested_date)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {request.time_impact_hours && (
                      <div className="text-center">
                        <div className="font-medium text-gray-900">{request.time_impact_hours}h</div>
                        <div>Time Impact</div>
                      </div>
                    )}
                    {request.cost_impact && (
                      <div className="text-center">
                        <div className="font-medium text-gray-900">${request.cost_impact.toLocaleString()}</div>
                        <div>Cost Impact</div>
                      </div>
                    )}
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangeRequestDashboard;
