import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  TrashIcon,
  DocumentTextIcon,
  UserIcon,
  BuildingOfficeIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, ClockIcon as ClockSolidIcon } from '@heroicons/react/24/solid';
import { useAppDispatch } from '../../hooks/redux';
import { addNotification } from '../../store/slices/notificationSlice';
import { apiClient } from '../../api/client';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ProposalForm from '../../components/Proposals/ProposalForm';

interface ProposalItem {
  item_id: string;
  name: string;
  item?: {
    name: string;
    description?: string;
  };
  quantity: number;
  unit_price: number;
  total: number;
  unit: string;
  tax_rate: number;
  discount_rate: number;
  description: string;
}

interface Proposal {
  id: string;
  title: string;
  description?: string;
  proposal_number: string;
  status: string;
  proposal_type: string;
  total_amount: number;
  currency: string;
  valid_until?: string;
  sent_date?: string;
  viewed_date?: string;
  responded_date?: string;
  notes?: string;
  content: {
    items: ProposalItem[];
    sections?: Array<{
      title: string;
      content: string;
    }>;
  };
  tags?: string[];
  response_notes?: string;
  rejection_reason?: string;
  follow_up_date?: string;
  custom_fields?: {
    terms_and_conditions?: string;
    email_preferences?: {
      send_email?: boolean;
      email_subject?: string;
      email_message?: string;
    };
  };
  customer?: {
    id: string;
    display_name: string;
    company_name?: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

const ProposalDetailOverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'edit'>(
    searchParams.get('tab') === 'edit' ? 'edit' : 'overview'
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchProposal = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/proposals/${id}`);
      setProposal(response.data);
    } catch (error: any) {
      console.error('Error fetching proposal:', error);
      setError('Failed to load proposal details');
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load proposal details'
      }));
    } finally {
      setLoading(false);
    }
  }, [id, dispatch]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  const handleUpdateProposal = async (formData: any) => {
    try {
      setIsUpdating(true);
      
      // Transform formData to match backend schema
      const updateData = {
        title: formData.title,
        description: formData.description,
        proposal_type: formData.proposal_type,
        status: formData.status,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        total_amount: formData.total_amount ? Math.round(formData.total_amount * 100) : null, // Convert to cents
        currency: formData.currency,
        content: formData.content,
        notes: formData.notes,
        tags: formData.tags,
        response_notes: formData.response_notes,
        rejection_reason: formData.rejection_reason,
        follow_up_date: formData.follow_up_date ? new Date(formData.follow_up_date).toISOString() : null,
        custom_fields: {
          terms_and_conditions: formData.terms_and_conditions,
          email_preferences: {
            send_email: formData.send_email,
            email_subject: formData.email_subject,
            email_message: formData.email_message
          }
        }
      };

      const response = await apiClient.put(`/proposals/${id}`, updateData);
      setProposal(response.data);
      setActiveTab('overview');
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Proposal updated successfully'
      }));
    } catch (error: any) {
      console.error('Error updating proposal:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update proposal'
      }));
    } finally {
      setIsUpdating(false);
    }
  };

  const prepareInitialData = () => {
    if (!proposal) return undefined;
    
    return {
      title: proposal.title,
      description: proposal.description || '',
      customer_id: proposal.customer?.id || '',
      proposal_type: proposal.proposal_type,
      status: proposal.status,
      valid_until: proposal.valid_until ? new Date(proposal.valid_until).toISOString().split('T')[0] : '',
      total_amount: proposal.total_amount ? proposal.total_amount / 100 : 0, // Convert from cents
      currency: proposal.currency,
      content: {
        sections: proposal.content?.sections || [
          { title: 'Project Overview', content: '' },
          { title: 'Scope of Work', content: '' },
          { title: 'Timeline', content: '' },
          { title: 'Investment', content: '' },
          { title: 'Terms & Conditions', content: '' }
        ],
        items: proposal.content?.items || []
      },
      terms_and_conditions: proposal.custom_fields?.terms_and_conditions || '',
      notes: proposal.notes || '',
      tags: proposal.tags || [],
      response_notes: proposal.response_notes || '',
      rejection_reason: proposal.rejection_reason || '',
      follow_up_date: proposal.follow_up_date ? new Date(proposal.follow_up_date).toISOString().split('T')[0] : '',
      send_email: proposal.custom_fields?.email_preferences?.send_email || false,
      email_subject: proposal.custom_fields?.email_preferences?.email_subject || '',
      email_message: proposal.custom_fields?.email_preferences?.email_message || ''
    };
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';           // Gray for draft/neutral
      case 'sent':
        return 'bg-primary-100 text-primary-700';     // Blue for info/active
      case 'viewed':
        return 'bg-warning-100 text-warning-700';     // Yellow for warning/in progress
      case 'accepted':
        return 'bg-success-100 text-success-700';     // Green for completed/success
      case 'rejected':
        return 'bg-error-100 text-error-700';         // Red for urgent/error
      case 'expired':
        return 'bg-error-50 text-error-600';          // Light red for expired
      case 'withdrawn':
        return 'bg-purple-100 text-purple-700';       // Purple for special/custom
      default:
        return 'bg-gray-100 text-gray-700';           // Gray for unknown status
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'viewed':
        return <ClockSolidIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleDelete = async () => {
    if (!proposal || !window.confirm('Are you sure you want to delete this proposal?')) {
      return;
    }

    try {
      await apiClient.delete(`/proposals/${proposal.id}`);
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Proposal deleted successfully'
      }));
      navigate('/proposals');
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete proposal'
      }));
    }
  };

  const handleSend = async () => {
    if (!proposal) return;
    try {
      await apiClient.post(`/proposals/${proposal.id}/send`);
      dispatch(addNotification({
        type: 'success',
        title: 'Sent',
        message: 'Proposal sent to customer'
      }));
      await fetchProposal();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to send proposal';
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: msg
      }));
    }
  };

  const handleAccept = async () => {
    if (!proposal) return;
    try {
      await apiClient.post(`/proposals/${proposal.id}/accept`);
      dispatch(addNotification({
        type: 'success',
        title: 'Accepted',
        message: 'Proposal marked as accepted'
      }));
      await fetchProposal();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to accept proposal';
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: msg
      }));
    }
  };

  const handleReject = async () => {
    if (!proposal) return;
    const reason = window.prompt('Optional rejection reason (press OK to continue):') || '';
    try {
      const url = reason.trim()
        ? `/proposals/${proposal.id}/reject?rejection_reason=${encodeURIComponent(reason.trim())}`
        : `/proposals/${proposal.id}/reject`;
      await apiClient.post(url);
      dispatch(addNotification({
        type: 'success',
        title: 'Rejected',
        message: 'Proposal marked as rejected'
      }));
      await fetchProposal();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to reject proposal';
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: msg
      }));
    }
  };

  const handleConvertToInvoice = async () => {
    if (!proposal) return;
    try {
      const customerId = proposal.customer?.id as string;
      let projectId = (proposal as any).project_id as string;
      if (!customerId) {
        dispatch(addNotification({ type: 'error', title: 'Cannot Convert', message: 'Proposal has no customer.' }));
        return;
      }
      if (!projectId) {
        try {
          const projectsRes = await apiClient.get('/projects/');
          const projs = projectsRes.data?.projects || projectsRes.data || [];
          if (!Array.isArray(projs) || projs.length === 0) {
            dispatch(addNotification({ type: 'error', title: 'Project Required', message: 'No projects available to assign.', }));
            return;
          }
          const options = projs.map((pr: any, idx: number) => `${idx + 1}) ${pr.name || pr.slug || pr.id}`).join('\n');
          const input = window.prompt(`Select a project number to use for the invoice:\n${options}`);
          const idx = input ? parseInt(input, 10) - 1 : -1;
          if (isNaN(idx) || idx < 0 || idx >= projs.length) {
            dispatch(addNotification({ type: 'error', title: 'Conversion Cancelled', message: 'Invalid project selection.' }));
            return;
          }
          projectId = projs[idx].id;
        } catch (e) {
          dispatch(addNotification({ type: 'error', title: 'Project Required', message: 'Failed to load projects.' }));
          return;
        }
      }
      const items = (proposal.content?.items || []) as Array<any>;
      if (!items.length) {
        dispatch(addNotification({ type: 'error', title: 'No Items', message: 'Proposal has no items to invoice.' }));
        return;
      }
      const invoiceItems = items.map((it) => ({
        description: it.description || it.name || 'Line item',
        quantity: Math.max(1, parseInt(String(it.quantity || 1), 10)),
        unit_price: Math.round(((it.unit_price || 0) as number) * 100),
        item_type: 'service',
        task_id: undefined,
        tax_rate: Math.round(((it.tax_rate || 0) as number) * 100),
        discount_rate: Math.round(((it.discount_rate || 0) as number) * 100),
      }));
      const payload: any = {
        project_id: projectId,
        customer_id: customerId,
        title: proposal.title ? `Invoice for ${proposal.title}` : 'Invoice',
        description: proposal.description || undefined,
        invoice_type: 'PROJECT',
        currency: proposal.currency || 'usd',
        payment_terms: 'net_30',
        invoice_date: new Date().toISOString(),
        items: invoiceItems,
        notes: proposal.notes || undefined,
        terms_and_conditions: proposal.custom_fields?.terms_and_conditions || undefined,
        tags: Array.isArray(proposal.tags) ? proposal.tags : [],
        custom_fields: { source: 'proposal', source_proposal_id: proposal.id },
      };
      const res = await apiClient.post('/invoices/', payload);
      dispatch(addNotification({ type: 'success', title: 'Converted', message: 'Proposal converted to invoice' }));
      const invId = res.data?.id;
      if (invId) navigate(`/invoices/${invId}`);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to convert to invoice';
      dispatch(addNotification({ type: 'error', title: 'Error', message: msg }));
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await apiClient.get(`/proposals/${id}/pdf`, {
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `proposal_${proposal?.proposal_number || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Proposal PDF downloaded successfully'
      }));
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to download proposal PDF'
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Proposal not found</h3>
        <p className="mt-1 text-sm text-gray-500">{error || 'The proposal you are looking for does not exist.'}</p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/proposals')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-user-blue hover:bg-user-blue"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Proposals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/proposals')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{proposal.title}</h1>
            <div className="flex items-center space-x-2 mt-1 text-gray-600">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                {proposal.status}
              </span>
              <span>• #{proposal.proposal_number}</span>
              <span>• Created {new Date(proposal.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          {/* Major actions on top */}
          {proposal.status && proposal.status.toLowerCase() === 'draft' && (
            <button
              onClick={handleSend}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#0d0d0d] bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Send
            </button>
          )}
          {proposal.status && ['sent','viewed'].includes(proposal.status.toLowerCase()) && (
            <>
              <button
                onClick={handleAccept}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Accept
              </button>
              <button
                onClick={handleReject}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <XCircleIcon className="h-4 w-4 mr-2" />
                Reject
              </button>
            </>
          )}
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#0d0d0d] bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Download PDF
          </button>
          <button
            onClick={handleConvertToInvoice}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#0d0d0d] bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <ArrowsRightLeftIcon className="h-4 w-4 mr-2" />
            Convert to Invoice
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#0d0d0d] bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-3 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
              activeTab === 'overview' ? 'text-indigo-600' : 'text-black hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`py-2 px-3 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
              activeTab === 'edit' ? 'text-indigo-600' : 'text-black hover:text-gray-700'
            }`}
          >
            Edit
          </button>
        </nav>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Proposal Details */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Proposal Details</h3>
              
              {proposal.description && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{proposal.description}</p>
                </div>
              )}

              {/* Items */}
              {proposal.content?.items && proposal.content.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Items & Services</h4>
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-secondary-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {proposal.content.items.map((item, index) => {
                          const itemTotal = item.quantity * (item.unit_price / 100) * (1 - (item.discount_rate / 10000)) * (1 + (item.tax_rate / 10000));
                          return (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.item?.name || 'Item'}
                                  </div>
                                  {item.description && (
                                    <div className="text-sm text-gray-500">{item.description}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.quantity}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${(item.unit_price / 100).toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(item.tax_rate / 100).toFixed(2)}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(item.discount_rate / 100).toFixed(2)}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                ${itemTotal.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {proposal.notes && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{proposal.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Summary</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                  <dd className="text-lg font-bold text-gray-900">
                    ${(proposal.total_amount / 100).toFixed(2)} {proposal.currency?.toUpperCase()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="text-sm text-gray-900 capitalize">{proposal.proposal_type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(proposal.created_at).toLocaleDateString()}
                  </dd>
                </div>
                {proposal.valid_until && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Valid Until</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(proposal.valid_until).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Customer Info */}
          {proposal.customer && (
            <div className="bg-white shadow rounded-lg">
              <div className="p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Customer</h3>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-user-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{proposal.customer.display_name}</p>
                    <p className="text-sm text-gray-500">{proposal.customer.email}</p>
                  </div>
                </div>
                {proposal.customer.company_name && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <BuildingOfficeIcon className="h-4 w-4" />
                    <span>{proposal.customer.company_name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Created</p>
                    <p className="text-sm text-gray-500">
                      {new Date(proposal.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {proposal.sent_date && (
                  <div className="flex items-center space-x-3">
                    <ClockIcon className="h-4 w-4 text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Sent</p>
                      <p className="text-sm text-gray-500">
                        {new Date(proposal.sent_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {proposal.viewed_date && (
                  <div className="flex items-center space-x-3">
                    <ClockIcon className="h-4 w-4 text-yellow-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Viewed</p>
                      <p className="text-sm text-gray-500">
                        {new Date(proposal.viewed_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {proposal.responded_date && (
                  <div className="flex items-center space-x-3">
                    <CheckCircleIcon className="h-4 w-4 text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Responded</p>
                      <p className="text-sm text-gray-500">
                        {new Date(proposal.responded_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Edit Proposal</h3>
            <ProposalForm
              onSubmit={handleUpdateProposal}
              onCancel={() => setActiveTab('overview')}
              isLoading={isUpdating}
              initialData={prepareInitialData()}
              mode="edit"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalDetailOverviewPage;
