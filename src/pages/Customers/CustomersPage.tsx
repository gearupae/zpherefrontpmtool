import React, { useEffect, useState } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { useNavigate } from 'react-router-dom';
import { Customer, CustomerCreate } from '../../types';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { addNotification } from '../../store/slices/notificationSlice';
import { 
  UserPlusIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  TagIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const CustomersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const selectedType = '';
  const selectedStatus = '';
  
  const [newCustomer, setNewCustomer] = useState<CustomerCreate>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    company_website: '',
    job_title: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    customer_type: 'prospect',
    source: '',
    credit_limit: undefined,
    payment_terms: 'net_30',
    notes: '',
    tags: [],
    custom_fields: {}
  });

  // Phone input helpers
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>('1'); // default +1
  const [phoneLocal, setPhoneLocal] = useState<string>('');

  // Attachments list
  type AttachmentItem = { id: number; file?: File };
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const [stats, setStats] = useState({
    total_customers: 0,
    active_customers: 0,
    prospects: 0,
    clients: 0,
    leads: 0,
    inactive_customers: 0,
    total_projects: 0,
    total_revenue: 0
  });

  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, []);


  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/customers/');
      console.log('Customers API response:', response.data);
      // Handle the CustomerList response structure
      const customersData = response.data.customers || response.data.items || response.data || [];
      // Ensure we always have an array
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (error: any) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
      
      dispatch(addNotification({
        type: 'error',
        title: 'Failed to Load Customers',
        message: 'Unable to fetch customer data. Please refresh the page.',
        duration: 5000,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/customers/stats');
      setStats(response.data);
    } catch (error: any) {
      console.error('Failed to fetch customer stats:', error);
      setStats({
        total_customers: 0,
        active_customers: 0,
        prospects: 0,
        clients: 0,
        leads: 0,
        inactive_customers: 0,
        total_projects: 0,
        total_revenue: 0
      });
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Prepare phone in E.164 format if provided
      let payload: any = { ...newCustomer };
      const digits = phoneLocal.replace(/\D/g, '');
      if (digits) {
        payload.phone = `+${phoneCountryCode}${digits}`;
      }

      // Call API via debug utility helper (which posts to /customers)
      const { debugCustomerCreation } = await import('../../utils/debugUtils');
      const created = await debugCustomerCreation(payload);

      // Upload attachments to dedicated endpoint (if any)
      const filesToUpload = attachments.map(a => a.file).filter(Boolean) as File[];
      if (created?.id && filesToUpload.length > 0) {
        try {
          const { default: apiClient } = await import('../../api/client');
          await Promise.all(
            filesToUpload.map(async (file) => {
              const form = new FormData();
              form.append('file', file);
              await apiClient.post(`/customers/${created.id}/attachments`, form);
            })
          );
        } catch (uploadErr: any) {
          console.error('Attachment upload failed:', uploadErr);
          dispatch(addNotification({
            type: 'error',
            title: 'Attachment Upload Issue',
            message: 'Some attachments could not be uploaded.',
            duration: 5000,
          }));
        }
      }
      
      dispatch(addNotification({
        type: 'success',
        title: 'Customer Created',
        message: 'Customer has been successfully created.',
        duration: 3000,
      }));
      
      setShowCreateForm(false);
      setNewCustomer({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company_name: '',
        company_website: '',
        job_title: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        customer_type: 'prospect',
        source: '',
        credit_limit: undefined,
        payment_terms: 'net_30',
        notes: '',
        tags: [],
        custom_fields: {}
      });
      setPhoneLocal('');
      setPhoneCountryCode('1');
      setAttachments([]);
      fetchCustomers();
      fetchStats();
    } catch (error: any) {
      // Enhanced error logging
      const { logApiError, debugAuthState } = await import('../../utils/debugUtils');
      logApiError(error, 'Customer Creation');
      debugAuthState();
      
      console.error('Failed to create customer:', error);
      
      let errorMessage = 'Failed to create customer. Please try again.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      
      dispatch(addNotification({
        type: 'error',
        title: 'Creation Failed',
        message: errorMessage,
        duration: 5000,
      }));
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.put(`/customers/${editingCustomer.id}`, editingCustomer);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Customer Updated',
        message: 'Customer has been successfully updated.',
        duration: 3000,
      }));
      
      setEditingCustomer(null);
      fetchCustomers();
      fetchStats();
    } catch (error: any) {
      console.error('Failed to update customer:', error);
      
      let errorMessage = 'Failed to update customer. Please try again.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      
      dispatch(addNotification({
        type: 'error',
        title: 'Update Failed',
        message: errorMessage,
        duration: 5000,
      }));
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;

    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.delete(`/customers/${customerId}`);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Customer Deleted',
        message: 'Customer has been successfully deleted.',
        duration: 3000,
      }));
      
      fetchCustomers();
      fetchStats();
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      
      let errorMessage = 'Failed to delete customer. Please try again.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => err.msg || err.message || 'Validation error').join(', ');
        }
      }
      
      dispatch(addNotification({
        type: 'error',
        title: 'Deletion Failed',
        message: errorMessage,
        duration: 5000,
      }));
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = true;
    
    const matchesType = !selectedType || customer.customer_type === selectedType;
    const matchesStatus = !selectedStatus || 
      (selectedStatus === 'active' && customer.is_active) ||
      (selectedStatus === 'inactive' && !customer.is_active);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'client': return 'bg-green-50 text-green-700 border border-green-200';
      case 'prospect': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'lead': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-50 text-green-700 border border-green-200'
      : 'bg-red-50 text-red-700 border border-red-200';
  };

  if (isLoading) {
    return <LoadingSpinner size="large" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your customer relationships and contacts</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-page-action flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
          </svg>
          <span>Add Customer</span>
        </button>
      </div>

      {/* Create Customer Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Add New Customer</h2>
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.first_name}
                  onChange={(e) => setNewCustomer({...newCustomer, first_name: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.last_name}
                  onChange={(e) => setNewCustomer({...newCustomer, last_name: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  required
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <div className="mt-1 flex">
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    style={{ minWidth: '5.5rem' }}
                    aria-label="Country code"
                  >
                    {/* Common country codes */}
                    <option value="1">+1 (US)</option>
                    <option value="44">+44 (UK)</option>
                    <option value="61">+61 (AU)</option>
                    <option value="81">+81 (JP)</option>
                    <option value="33">+33 (FR)</option>
                    <option value="49">+49 (DE)</option>
                    <option value="91">+91 (IN)</option>
                    <option value="971">+971 (AE)</option>
                  </select>
                  <input
                    type="tel"
                    value={phoneLocal}
                    onChange={(e) => setPhoneLocal(e.target.value)}
                    placeholder="Phone number"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Stored as E.164 format (e.g., +{phoneCountryCode}{phoneLocal.replace(/\D/g, '')}).</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input
                  type="text"
                  value={newCustomer.company_name || ''}
                  onChange={(e) => setNewCustomer({...newCustomer, company_name: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Type</label>
                <select
                  value={newCustomer.customer_type}
                  onChange={(e) => setNewCustomer({...newCustomer, customer_type: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="prospect">Prospect</option>
                  <option value="client">Client</option>
                  <option value="lead">Lead</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Job Title</label>
                <input
                  type="text"
                  value={newCustomer.job_title || ''}
                  onChange={(e) => setNewCustomer({...newCustomer, job_title: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Website</label>
                <input
                  type="url"
                  value={newCustomer.company_website || ''}
                  onChange={(e) => setNewCustomer({...newCustomer, company_website: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Source</label>
                <input
                  type="text"
                  value={newCustomer.source || ''}
                  onChange={(e) => setNewCustomer({...newCustomer, source: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="How they found us"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Address Line 1</label>
                <input
                  type="text"
                  value={newCustomer.address_line_1 || ''}
                  onChange={(e) => setNewCustomer({...newCustomer, address_line_1: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={newCustomer.city || ''}
                  onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <input
                  type="text"
                  value={newCustomer.country || ''}
                  onChange={(e) => setNewCustomer({...newCustomer, country: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  rows={3}
                  value={newCustomer.notes || ''}
                  onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Additional notes about the customer..."
                />
              </div>
            </div>

            {/* Attachments */}
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Attachments</label>
                <button
                  type="button"
                  onClick={() => setAttachments(prev => [...prev, { id: Date.now() }])}
                  className="inline-flex items-center px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  <PlusIcon className="w-4 h-4 mr-1" /> Add attachment
                </button>
              </div>
              {attachments.length === 0 && (
                <div className="text-xs text-gray-500">No attachments added.</div>
              )}
              {attachments.map((att, idx) => (
                <div key={att.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, file } : a));
                      }}
                      className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded"
                    title="Remove attachment"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-page-action"
              >
                Add Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlusIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_customers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <BuildingOfficeIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active_customers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TagIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_projects}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <EnvelopeIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${(stats.total_revenue / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Edit Customer Form */}
      {editingCustomer && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Edit Customer</h2>
          <form onSubmit={handleUpdateCustomer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.first_name}
                  onChange={(e) => setEditingCustomer({...editingCustomer, first_name: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.last_name}
                  onChange={(e) => setEditingCustomer({...editingCustomer, last_name: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  required
                  value={editingCustomer.email}
                  onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input
                  type="text"
                  value={editingCustomer.company_name || ''}
                  onChange={(e) => setEditingCustomer({...editingCustomer, company_name: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Type</label>
                <select
                  value={editingCustomer.customer_type}
                  onChange={(e) => setEditingCustomer({...editingCustomer, customer_type: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="prospect">Prospect</option>
                  <option value="client">Client</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Job Title</label>
                <input
                  type="text"
                  value={editingCustomer.job_title || ''}
                  onChange={(e) => setEditingCustomer({...editingCustomer, job_title: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Website</label>
                <input
                  type="url"
                  value={editingCustomer.company_website || ''}
                  onChange={(e) => setEditingCustomer({...editingCustomer, company_website: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                rows={3}
                value={editingCustomer.notes || ''}
                onChange={(e) => setEditingCustomer({...editingCustomer, notes: e.target.value})}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-[#0d0d0d] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-gray-300 text-[#0d0d0d] bg-white rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
              >
                Update Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customers List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Customers ({filteredCustomers.length})
          </h3>
        </div>
        
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first customer.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-user-blue">
                            {customer.first_name[0]}{customer.last_name[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div 
                            className="text-base font-semibold text-black cursor-pointer hover:text-user-blue"
                            onClick={() => navigate(`/customers/${customer.id}`)}
                          >
                            {customer.full_name}
                          </div>
                          <div className="text-base text-black">
                            {customer.job_title || 'No title'}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base text-black">
                        {customer.company_name || 'No company'}
                      </div>
                      {customer.company_website && (
                        <div className="text-base text-black">
                          <a href={customer.company_website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {customer.company_website}
                          </a>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base text-black">
                        <div className="flex items-center space-x-2">
                          <EnvelopeIcon className="h-4 w-4 text-gray-600" />
                          <span>{customer.email}</span>
                        </div>
                      </div>
                      {customer.phone && (
                        <div className="text-base text-black">
                          <div className="flex items-center space-x-2">
                            <PhoneIcon className="h-4 w-4 text-gray-600" />
                            <span>{customer.phone}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCustomerTypeColor(customer.customer_type)}`}>
                        {customer.customer_type}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(customer.is_active)}`}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full p-2 transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingCustomer(customer)}
                          className="bg-green-100 hover:bg-green-200 text-green-600 rounded-full p-2 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-2 transition-colors"
                          title="Delete"
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

export default CustomersPage;