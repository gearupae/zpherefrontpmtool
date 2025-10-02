import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux';
import { Proposal, ProposalCreate, ProposalStatus, ProposalType, Customer } from '../../types';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ItemSelector from '../../components/Items/ItemSelector';
import { getTenantRoute } from '../../utils/tenantUtils';

import { addNotification } from '../../store/slices/notificationSlice';
import { 
  PlusIcon, 
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';



const ProposalsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<Array<{id: string; first_name?: string; last_name?: string; username?: string; email?: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const selectedStatus = '';
  const selectedType = '';
  
  
  
  // Items & additional fields
  type SelectedItem = {
    item: any;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    discount_rate: number;
    description: string;
  };
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [validUntil, setValidUntil] = useState<string>('');
  const [termsAndConditions, setTermsAndConditions] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [sendEmail, setSendEmail] = useState<boolean>(false);
  const [emailTo, setEmailTo] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailMessage, setEmailMessage] = useState<string>('');

  const [newProposal, setNewProposal] = useState<ProposalCreate>({
    title: '',
    description: '',
    customer_id: '',
    proposal_type: ProposalType.PROJECT,
    content: {},
    custom_template: {},
    total_amount: 0,
    currency: 'usd',
    tags: [],
    custom_fields: {}
  });

  const [stats, setStats] = useState({
    total_proposals: 0,
    draft_proposals: 0,
    sent_proposals: 0,
    accepted_proposals: 0,
    rejected_proposals: 0,
    total_value: 0,
    conversion_rate: 0
  });

  useEffect(() => {
    fetchProposals();
    fetchCustomers();
    fetchUsers();
    fetchStats();
  }, []);

const fetchProposals = async () => {
    setIsLoading(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/proposals/');
      console.log('Proposals API response:', response.data);
      // Handle ProposalList response structure
      const proposalsData = response.data.items || response.data || [];
      // Ensure we always have an array
      setProposals(Array.isArray(proposalsData) ? proposalsData : []);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
      setProposals([]);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load proposals',
        duration: 5000,
      }));
    } finally {
      setIsLoading(false);
    }
  };

const fetchCustomers = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/customers/');
      console.log('Customers API response:', response.data);
      // Handle the CustomerList response structure
      const customersData = response.data.customers || response.data.items || response.data || [];
      // Ensure we always have an array
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/users/');
      const raw = (response.data && (response.data.users ?? response.data)) || [];
      setUsers(Array.isArray(raw) ? raw : []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };

  const fetchStats = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/proposals/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch proposal stats:', error);
      setStats({
        total_proposals: 0,
        draft_proposals: 0,
        sent_proposals: 0,
        accepted_proposals: 0,
        rejected_proposals: 0,
        total_value: 0,
        conversion_rate: 0
      });
    }
  };

const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newProposal.title.trim()) {
      dispatch(addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Title is required',
        duration: 3000,
      }));
      return;
    }
    
    if (!newProposal.customer_id) {
      dispatch(addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a customer',
        duration: 3000,
      }));
      return;
    }
    
    try {
      const { default: apiClient } = await import('../../api/client');
      
      // Transform selected items into content.items
      const contentItems = selectedItems.map(si => ({
        item_id: si.item?.id,
        name: si.item?.display_name || si.item?.name,
        description: si.description,
        quantity: si.quantity,
        unit_price: si.unit_price,
        total: si.quantity * si.unit_price,
        unit: si.item?.unit || 'each',
        tax_rate: si.tax_rate,
        discount_rate: si.discount_rate,
      }));

      // Compute total based on items, tax, item-level discount, then overall discount
      const itemsSubtotal = selectedItems.reduce((sum, si) => sum + si.quantity * si.unit_price, 0);
      const itemsTax = selectedItems.reduce((sum, si) => sum + (si.quantity * si.unit_price) * (si.tax_rate / 100), 0);
      const itemsItemLevelDiscount = selectedItems.reduce((sum, si) => sum + (si.quantity * si.unit_price) * (si.discount_rate / 100), 0);
      let computedTotal = itemsSubtotal + itemsTax - itemsItemLevelDiscount;

      let overallDiscount = 0;
      if (discountType === 'percent' && discountValue > 0) {
        overallDiscount = computedTotal * (discountValue / 100);
      } else if (discountType === 'amount' && discountValue > 0) {
        overallDiscount = discountValue;
      }
      computedTotal = Math.max(0, computedTotal - overallDiscount);
      const totalCents = Math.round(computedTotal * 100);

      const proposalData: any = {
        ...newProposal,
        // override/augment fields
        valid_until: validUntil ? new Date(validUntil).toISOString() : undefined,
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
        total_amount: totalCents,
        content: {
          ...(newProposal.content || {}),
          items: contentItems,
          discount: { type: discountType, value: discountValue, currency: newProposal.currency || 'usd' },
        },
        custom_fields: {
          ...(newProposal.custom_fields || {}),
          terms_and_conditions: termsAndConditions,
          assigned_to_id: assignedToId || undefined,
          email_preferences: {
            send_email: sendEmail,
            email_to: emailTo || undefined,
            email_subject: emailSubject || undefined,
            email_message: emailMessage || undefined,
          }
        }
      };
      
      await apiClient.post('/proposals/', proposalData);
      
      setShowCreateForm(false);
      setNewProposal({
        title: '',
        description: '',
        customer_id: '',
        proposal_type: ProposalType.PROJECT,
        content: {},
        custom_template: {},
        total_amount: 0,
        currency: 'usd',
        tags: [],
        custom_fields: {}
      });
      setSelectedItems([]);
      setDiscountType('percent');
      setDiscountValue(0);
      setValidUntil('');
      setTermsAndConditions('');
      setTagsInput('');
      setAssignedToId('');
      setSendEmail(false);
      setEmailTo('');
      setEmailSubject('');
      setEmailMessage('');

      
      await fetchProposals();
      await fetchStats();
      
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Proposal created successfully',
        duration: 3000,
      }));
    } catch (error: any) {
      console.error('Failed to create proposal:', error);
      console.error('Error details:', {
        status: error?.response?.status,
        data: error?.response?.data,
        headers: error?.response?.headers,
        config: error?.config
      });
      
      const errorMessage = error?.response?.data?.detail || 
                          error?.response?.data?.message ||
                          error?.message ||
                          'Failed to create proposal. Please try again.';
      
      dispatch(addNotification({
        type: 'error',
        title: 'Error Creating Proposal',
        message: errorMessage,
        duration: 8000,
      }));
    }
  };

  const getStatusIcon = (status: ProposalStatus) => {
    switch (status) {
      case ProposalStatus.ACCEPTED:
        return <CheckCircleIcon className="h-5 w-5 text-success-600" />;
      case ProposalStatus.REJECTED:
        return <XCircleIcon className="h-5 w-5 text-error-600" />;
      case ProposalStatus.SENT:
        return <PaperAirplaneIcon className="h-5 w-5 text-user-blue" />;
      case ProposalStatus.VIEWED:
        return <EyeIcon className="h-5 w-5 text-warning-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-secondary-400" />;
    }
  };

  const handleDeleteProposal = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this proposal?')) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.delete(`/proposals/${id}`);
      await fetchProposals();
      await fetchStats();
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Proposal deleted successfully',
        duration: 3000,
      }));
    } catch (error) {
      console.error('Failed to delete proposal:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete proposal',
        duration: 5000,
      }));
    }
  };

  const sendProposal = async (id: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.post(`/proposals/${id}/send`);
      await fetchProposals();
      await fetchStats();
      dispatch(addNotification({
        type: 'success',
        title: 'Sent',
        message: 'Proposal sent to customer',
        duration: 3000,
      }));
    } catch (error: any) {
      console.error('Failed to send proposal:', error);
      const msg = error?.response?.data?.detail || 'Failed to send proposal';
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: msg,
        duration: 5000,
      }));
    }
  };

  const acceptProposal = async (id: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.post(`/proposals/${id}/accept`);
      await fetchProposals();
      await fetchStats();
      dispatch(addNotification({
        type: 'success',
        title: 'Accepted',
        message: 'Proposal marked as accepted',
        duration: 3000,
      }));
    } catch (error: any) {
      console.error('Failed to accept proposal:', error);
      const msg = error?.response?.data?.detail || 'Failed to accept proposal';
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: msg,
        duration: 5000,
      }));
    }
  };

  const rejectProposal = async (id: string) => {
    const reason = window.prompt('Optional rejection reason (press OK to continue):') || '';
    try {
      const { default: apiClient } = await import('../../api/client');
      const url = reason.trim()
        ? `/proposals/${id}/reject?rejection_reason=${encodeURIComponent(reason.trim())}`
        : `/proposals/${id}/reject`;
      await apiClient.post(url);
      await fetchProposals();
      await fetchStats();
      dispatch(addNotification({
        type: 'success',
        title: 'Rejected',
        message: 'Proposal marked as rejected',
        duration: 3000,
      }));
    } catch (error: any) {
      console.error('Failed to reject proposal:', error);
      const msg = error?.response?.data?.detail || 'Failed to reject proposal';
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: msg,
        duration: 5000,
      }));
    }
  };

  const downloadProposalPDF = async (id: string, number?: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get(`/proposals/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `proposal_${number || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download proposal PDF:', error);
    }
  };

  const convertToInvoice = async (proposalId: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      // Fetch full proposal details
      const detail = await apiClient.get(`/proposals/${proposalId}`);
      const p = detail.data || {};
      if (!p.customer_id && !p.customer?.id) {
        dispatch(addNotification({ type: 'error', title: 'Cannot Convert', message: 'Proposal has no customer.', duration: 4000 }));
        return;
      }
      const customerId = p.customer_id || p.customer.id;
      let projectId = p.project_id;
      if (!projectId) {
        // Prompt user to pick a project
        try {
          const projectsRes = await apiClient.get('/projects/');
          const projs = projectsRes.data?.projects || projectsRes.data || [];
          if (!Array.isArray(projs) || projs.length === 0) {
            dispatch(addNotification({ type: 'error', title: 'Project Required', message: 'No projects available to assign.', duration: 5000 }));
            return;
          }
          const options = projs.map((pr: any, idx: number) => `${idx + 1}) ${pr.name || pr.slug || pr.id}`).join('\n');
          const input = window.prompt(`Select a project number to use for the invoice:\n${options}`);
          const idx = input ? parseInt(input, 10) - 1 : -1;
          if (isNaN(idx) || idx < 0 || idx >= projs.length) {
            dispatch(addNotification({ type: 'error', title: 'Conversion Cancelled', message: 'Invalid project selection.', duration: 4000 }));
            return;
          }
          projectId = projs[idx].id;
        } catch (e) {
          dispatch(addNotification({ type: 'error', title: 'Project Required', message: 'Failed to load projects.', duration: 5000 }));
          return;
        }
      }
      const items = (p.content?.items || []) as Array<any>;
      if (!items.length) {
        dispatch(addNotification({ type: 'error', title: 'No Items', message: 'Proposal has no items to invoice.', duration: 4000 }));
        return;
      }
      // Map items to invoice items (cents + percentage*100)
      const invoiceItems = items.map((it) => ({
        description: it.description || it.name || 'Line item',
        quantity: Math.max(1, parseInt(String(it.quantity || 1), 10)),
        unit_price: Math.round(((it.unit_price || 0) as number) * 100),
        item_type: 'service',
        task_id: undefined,
        tax_rate: Math.round(((it.tax_rate || 0) as number) * 100),
        discount_rate: Math.round(((it.discount_rate || 0) as number) * 100),
      }));

      const nowIso = new Date().toISOString();
      const payload: any = {
        project_id: projectId,
        customer_id: customerId,
        title: p.title ? `Invoice for ${p.title}` : 'Invoice',
        description: p.description || undefined,
        invoice_type: 'PROJECT',
        currency: p.currency || 'usd',
        payment_terms: 'net_30',
        invoice_date: nowIso,
        items: invoiceItems,
        notes: p.notes || undefined,
        terms_and_conditions: p.custom_fields?.terms_and_conditions || undefined,
        tags: Array.isArray(p.tags) ? p.tags : [],
        custom_fields: {
          source: 'proposal',
          source_proposal_id: p.id,
        }
      };

      const res = await apiClient.post('/invoices/', payload);
      dispatch(addNotification({ type: 'success', title: 'Converted', message: 'Proposal converted to invoice.', duration: 3000 }));
      // Optionally navigate to invoice
      const invId = res.data?.id;
      if (invId) {
        navigate(`/invoices/${invId}`);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to convert to invoice';
      dispatch(addNotification({ type: 'error', title: 'Error', message: msg, duration: 5000 }));
    }
  };

  const getStatusColor = (status: ProposalStatus) => {
    switch (status) {
      case ProposalStatus.ACCEPTED:
        return 'bg-success-100 text-success-700'; // Green for completed/success
      case ProposalStatus.REJECTED:
        return 'bg-error-100 text-error-700';     // Red for urgent/error
      case ProposalStatus.SENT:
        return 'bg-primary-100 text-primary-700'; // Blue for info/active
      case ProposalStatus.VIEWED:
        return 'bg-warning-100 text-warning-700'; // Yellow for warning/in progress
      case ProposalStatus.EXPIRED:
        return 'bg-error-50 text-error-600';      // Light red for expired
      case ProposalStatus.WITHDRAWN:
        return 'bg-purple-100 text-purple-700';   // Purple for special/custom
      default: // DRAFT
        return 'bg-gray-100 text-gray-700';       // Gray for draft/neutral
    }
  };

  const filteredProposals = proposals.filter(proposal => {
    const matchesSearch = true;
    const matchesStatus = !selectedStatus || proposal.status === selectedStatus;
    const matchesType = !selectedType || proposal.proposal_type === selectedType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Proposals</h1>
          <p className="text-secondary-600 mt-1">
            Create, send, and track proposal status
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
className="btn-page-action inline-flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Proposal
        </button>
      </div>

      {/* Create Proposal Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center mb-6">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <DocumentTextIcon className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Create New Proposal</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleCreateProposal} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter proposal title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select
                  required
                  value={newProposal.customer_id}
                  onChange={(e) => setNewProposal({...newProposal, customer_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.display_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proposal Type</label>
                <select
                  value={newProposal.proposal_type}
                  onChange={(e) => setNewProposal({...newProposal, proposal_type: e.target.value as ProposalType})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={ProposalType.PROJECT}>Project</option>
                  <option value={ProposalType.CONSULTING}>Consulting</option>
                  <option value={ProposalType.MAINTENANCE}>Maintenance</option>
                  <option value={ProposalType.SUPPORT}>Support</option>
                  <option value={ProposalType.CUSTOM}>Custom</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Open Till Date</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newProposal.description}
                onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the proposal details, scope, and deliverables"
              />
            </div>

            {/* Items & Pricing */}
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900">Items & Pricing</h3>
              <ItemSelector selectedItems={selectedItems} onItemsChange={setSelectedItems} className="border border-gray-200 rounded-lg p-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percent' | 'amount')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="amount">Amount (cash)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={discountType === 'percent' ? 'e.g., 10 for 10%' : 'e.g., 50.00'}
                  />
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-xs text-gray-600">Computed Total</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {(() => {
                      const itemsSubtotal = selectedItems.reduce((sum, si) => sum + si.quantity * si.unit_price, 0);
                      const itemsTax = selectedItems.reduce((sum, si) => sum + (si.quantity * si.unit_price) * (si.tax_rate / 100), 0);
                      const itemsDiscount = selectedItems.reduce((sum, si) => sum + (si.quantity * si.unit_price) * (si.discount_rate / 100), 0);
                      let total = itemsSubtotal + itemsTax - itemsDiscount;
                      if (discountType === 'percent' && discountValue > 0) total -= total * (discountValue / 100);
                      if (discountType === 'amount' && discountValue > 0) total -= discountValue;
                      return `$${(total > 0 ? total : 0).toFixed(2)}`;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Terms, Tags, Assignment, Email */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                  <textarea
                    rows={3}
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Terms and conditions..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., urgent, website, design"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.first_name || u.username} {u.last_name || ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Send Email on Create</label>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
                    <span className="text-sm text-gray-600">Notify customer via email</span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Email to (defaults to customer email)"
                    />
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Email subject"
                    />
                    <textarea
                      rows={3}
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Email message"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-page-action disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Proposal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Proposals</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_proposals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Draft Proposals</p>
              <p className="text-2xl font-bold text-gray-900">{stats.draft_proposals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Accepted Proposals</p>
              <p className="text-2xl font-bold text-gray-900">{stats.accepted_proposals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <PaperAirplaneIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">${((stats.total_value || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Proposals List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Proposals ({filteredProposals.length})
          </h3>
        </div>
        {filteredProposals.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No proposals</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new proposal.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Proposal
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Proposal
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Open Till
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProposals.map((proposal) => (
                  <tr key={proposal.id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          {getStatusIcon(proposal.status)}
                        </div>
                        <div className="ml-4">
                          <div 
                            className="text-base font-semibold text-black cursor-pointer hover:text-user-blue"
onClick={() => navigate(getTenantRoute(`/proposals/${proposal.id}`))}
                          >
                            {proposal.title}
                          </div>
                          <div className="text-base text-black">
                            #{proposal.proposal_number}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base text-black">
                        Customer #{proposal.customer_id}
                      </div>
                      <div className="text-base text-black">
                        Proposal
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-black">
                      {String(proposal.proposal_type).charAt(0).toUpperCase() + String(proposal.proposal_type).slice(1).toLowerCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base font-semibold text-black">
                        ${((proposal.total_amount || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-base text-black">
                        {proposal.currency?.toUpperCase() || 'USD'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                        {proposal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-black">
                      {proposal.valid_until ? new Date(proposal.valid_until).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-black">
                      {(() => {
                        const assignedId = (proposal as any).custom_fields?.assigned_to_id;
                        if (!assignedId) return '—';
                        const u = (users || []).find((x: any) => x.id === assignedId);
                        return u ? (((u as any).full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email || u.id)) : assignedId;
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {/* Conditional actions based on status */}
                        {proposal.status && proposal.status === 'DRAFT' && (
                          <button 
                            onClick={() => sendProposal(proposal.id)}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full p-2 transition-colors"
                            title="Send Proposal"
                          >
                            <PaperAirplaneIcon className="h-4 w-4" />
                          </button>
                        )}
                        {proposal.status && ['SENT','VIEWED'].includes(proposal.status) && (
                          <>
                            <button 
                              onClick={() => acceptProposal(proposal.id)}
                              className="bg-green-100 hover:bg-green-200 text-green-600 rounded-full p-2 transition-colors"
                              title="Mark Accepted"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => rejectProposal(proposal.id)}
                              className="bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-2 transition-colors"
                              title="Mark Rejected"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        {/* Convert to Invoice */}
                        <button
                          onClick={() => convertToInvoice(proposal.id)}
                          className="bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full p-2 transition-colors"
                          title="Convert to Invoice"
                        >
                          <ArrowsRightLeftIcon className="h-4 w-4" />
                        </button>
                        {/* Download PDF */}
                        <button
                          onClick={() => downloadProposalPDF(proposal.id, proposal.proposal_number)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full p-2 transition-colors"
                          title="Download PDF"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                        </button>
                        {/* View / Edit / Delete */}
                        <button 
onClick={() => navigate(getTenantRoute(`/proposals/${proposal.id}`))}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full p-2 transition-colors"
                          title="View Proposal"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button 
onClick={() => navigate(getTenantRoute(`/proposals/${proposal.id}?tab=edit`))}
                          className="bg-green-100 hover:bg-green-200 text-green-600 rounded-full p-2 transition-colors"
                          title="Edit Proposal"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProposal(proposal.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-2 transition-colors" 
                          title="Delete Proposal"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>


    </div>
  );
};

export default ProposalsPage;
