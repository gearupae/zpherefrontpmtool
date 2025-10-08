import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useAppDispatch } from '../../hooks/redux';
import { useNavigate } from 'react-router-dom';
import { Customer, CustomerCreate } from '../../types';
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
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CalendarIcon,
  FunnelIcon,
  ChevronDownIcon,
  CheckIcon,
  ListBulletIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import DateRangeCalendar from '../../components/UI/DateRangeCalendar';
import ViewModeButton from '../../components/UI/ViewModeButton';
import CustomerKanbanBoard from '../../components/Customers/CustomerKanbanBoard';

// Portal component for rendering filter popups outside table overflow context
const FilterPortal: React.FC<{ children: React.ReactNode; buttonRect: DOMRect | null }> = ({ children, buttonRect }) => {
  if (!buttonRect) return null;
  
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        left: `${buttonRect.left}px`,
        top: `${buttonRect.bottom + 4}px`,
        zIndex: 99999,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
};

// Portal for inline edit popovers
const InlineEditPortal: React.FC<{ children: React.ReactNode; rect: DOMRect | null }> = ({ children, rect }) => {
  if (!rect) return null;
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.bottom + 4}px`,
        zIndex: 99999,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
};

const CustomersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const selectedType = '';
  const selectedStatus = '';
  
  // Enhanced customers with statistics
  const [enhancedCustomers, setEnhancedCustomers] = useState<Customer[]>([]);
  
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

  // Inline editing state
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'name' | 'website' | 'type' | 'status' | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [inlineEditRect, setInlineEditRect] = useState<DOMRect | null>(null);
  
  // Filter and search state
  const [customerSearch, setCustomerSearch] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterStatusActive, setFilterStatusActive] = useState<boolean[]>([]);
  
  // Header filter state
  const [headerFilterOpen, setHeaderFilterOpen] = useState<null | 'type' | 'status'>(null);
  const [filterButtonRect, setFilterButtonRect] = useState<DOMRect | null>(null);
  
  // Toolbar date filter state
  const [toolbarDateOpen, setToolbarDateOpen] = useState(false);
  const [pendingToolbarFrom, setPendingToolbarFrom] = useState('');
  const [pendingToolbarTo, setPendingToolbarTo] = useState('');
  
  // Sorting state
  const [sortField, setSortField] = useState<'type' | 'projects' | 'invoiced' | 'due_amount' | 'pending' | 'status' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  // View toggle
  const [currentView, setCurrentView] = useState<'list' | 'kanban'>('list');
  
  // Refs
  const inlinePopoverRef = useRef<HTMLDivElement | null>(null);
  const headerFilterRef = useRef<HTMLDivElement | null>(null);
  const toolbarDateRef = useRef<HTMLDivElement | null>(null);

  // Sorting function
  const onHeaderDblClick = (field: 'type' | 'projects' | 'invoiced' | 'due_amount' | 'pending' | 'status') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Inline editing functions
  const startInlineEdit = (e: React.MouseEvent, customer: Customer, field: 'name' | 'website' | 'type' | 'status') => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    if (target && typeof target.getBoundingClientRect === 'function') {
      setInlineEditRect(target.getBoundingClientRect());
    } else {
      setInlineEditRect(null);
    }
    setEditingCustomerId(customer.id);
    setEditingField(field);
    if (field === 'name') setEditValue(customer.full_name);
    if (field === 'website') setEditValue(customer.company_website || '');
    if (field === 'type') setEditValue(customer.customer_type);
    if (field === 'status') setEditValue(customer.is_active);
  };

  const saveInlineEdit = async (customerId: string, valueOverride?: any) => {
    try {
      if (!editingField) {
        console.warn('Inline save aborted: no active editingField');
        return;
      }
      const value = valueOverride !== undefined ? valueOverride : editValue;
      const { default: apiClient } = await import('../../api/client');
      
      if (editingField === 'name') {
        // Update first_name and last_name based on the edited full name
        const str = String(value || '').trim();
        const parts = str.split(/\s+/);
        const first_name = parts.shift() || '';
        const last_name = parts.length > 0 ? parts.join(' ') : (customers.find(c => c.id === customerId)?.last_name || '');
        await apiClient.put(`/customers/${customerId}`, { first_name, last_name });
      } else if (editingField === 'website') {
        await apiClient.put(`/customers/${customerId}`, { company_website: value });
      } else if (editingField === 'type') {
        await apiClient.put(`/customers/${customerId}`, { customer_type: value });
      } else if (editingField === 'status') {
        await apiClient.put(`/customers/${customerId}`, { is_active: value });
      }
      
      setEditingCustomerId(null);
      setEditingField(null);
      setEditValue(null);
      setInlineEditRect(null);
      fetchCustomers();
      dispatch(addNotification({
        type: 'success',
        title: 'Customer Updated',
        message: 'Customer has been successfully updated.',
        duration: 3000,
      }));
    } catch (err) {
      console.error('Inline save failed:', err);
      dispatch(addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update customer. Please try again.',
        duration: 5000,
      }));
    }
  };

  const cancelInlineEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCustomerId(null);
    setEditingField(null);
    setEditValue(null);
    setInlineEditRect(null);
  };

  // Currency formatting helper
  const formatCurrency = (amount: number | undefined | null, currency: string = 'USD'): string => {
    if (amount === undefined || amount === null) return '$0.00';
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount / 100); // Assuming amounts are stored in cents
    } catch (error) {
      // Fallback for unsupported currencies
      return `$${(amount / 100).toFixed(2)}`;
    }
  };

  // Fetch enhanced customer data with statistics
  const fetchEnhancedCustomerData = async () => {
    try {
      console.log('CustomersPage: Fetching enhanced customer data');
      
      // First, fetch basic customers
      if (customers.length === 0) return;
      
      const { default: apiClient } = await import('../../api/client');
      
      const enhancedCustomersData = await Promise.all(
        customers.map(async (customer: Customer) => {
          try {
            // Fetch customer statistics from the backend
            const statsResponse = await apiClient.get(`/customers/${customer.id}/statistics`);
            const stats = statsResponse.data;
            
            return {
              ...customer,
              projects_count: stats.projects_count || 0,
              invoiced_count: stats.invoiced_count || 0,
              due_amount: stats.due_amount || 0,
              pending_invoices_count: stats.pending_invoices_count || 0,
            };
          } catch (error) {
            console.warn(`Failed to fetch statistics for customer ${customer.id}:`, error);
            // Return customer with default values if stats fetch fails
            return {
              ...customer,
              projects_count: 0,
              invoiced_count: 0,
              due_amount: 0,
              pending_invoices_count: 0,
            };
          }
        })
      );
      
      // Update the customers with enhanced data
      console.log('CustomersPage: Enhanced customers data:', enhancedCustomersData);
      setEnhancedCustomers(enhancedCustomersData);
    } catch (error) {
      console.error('CustomersPage: Failed to fetch enhanced customer data:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, []);
  
  // Fetch enhanced data when customers change
  useEffect(() => {
    if (customers.length > 0) {
      fetchEnhancedCustomerData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers]);

  // Click outside handlers
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      // Close inline edit popovers when clicking outside
      if (editingCustomerId && inlinePopoverRef.current && !inlinePopoverRef.current.contains(target)) {
        cancelInlineEdit();
      }
      // Close header filter popover
      if (headerFilterOpen && headerFilterRef.current && !headerFilterRef.current.contains(target)) {
        setHeaderFilterOpen(null);
      }
      // Close toolbar date popover
      if (toolbarDateOpen && toolbarDateRef.current && !toolbarDateRef.current.contains(target)) {
        setToolbarDateOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [editingCustomerId, headerFilterOpen, toolbarDateOpen]);


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

  // Use enhanced customers if available, otherwise fall back to basic customers
  const customersToDisplay = enhancedCustomers.length > 0 ? enhancedCustomers : customers;
  
  // Derived: sorted and filtered customers for table
  const displayedCustomers = useMemo(() => {
    let arr = [...customersToDisplay];
    
    // Apply search filter
    if (customerSearch.trim()) {
      const searchLower = customerSearch.toLowerCase();
      arr = arr.filter(c => 
        (c.full_name || '').toLowerCase().includes(searchLower) ||
        (c.company_name || '').toLowerCase().includes(searchLower) ||
        (c.email || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Apply type filter
    if (filterType.length > 0) {
      arr = arr.filter(c => filterType.includes(c.customer_type));
    }
    
    // Apply status filter
    if (filterStatusActive.length > 0) {
      arr = arr.filter(c => filterStatusActive.includes(c.is_active));
    }
    
    // Apply sorting
    if (sortField) {
      arr.sort((a, b) => {
        let av: any = 0;
        let bv: any = 0;
        
        switch (sortField) {
          case 'type': {
            const typeOrder: Record<string, number> = { lead: 1, prospect: 2, client: 3, inactive: 4 };
            av = typeOrder[a.customer_type] ?? 0;
            bv = typeOrder[b.customer_type] ?? 0;
            break;
          }
          case 'projects':
            av = a.projects_count || 0;
            bv = b.projects_count || 0;
            break;
          case 'invoiced':
            av = a.invoiced_count || 0;
            bv = b.invoiced_count || 0;
            break;
          case 'due_amount':
            av = a.due_amount || 0;
            bv = b.due_amount || 0;
            break;
          case 'pending':
            av = a.pending_invoices_count || 0;
            bv = b.pending_invoices_count || 0;
            break;
          case 'status':
            av = a.is_active ? 1 : 0;
            bv = b.is_active ? 1 : 0;
            break;
        }
        
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return arr;
  }, [customersToDisplay, customerSearch, filterType, filterStatusActive, sortField, sortDir]);

  // Handler for customer updates (for drag and drop)
  const handleCustomerUpdate = async (customerId: string, updates: Partial<Customer>) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.put(`/customers/${customerId}`, updates);
      
      // Refresh customer data after update
      fetchCustomers();
      
      dispatch(addNotification({
        type: 'success',
        title: 'Customer Updated',
        message: 'Customer has been successfully updated.',
        duration: 3000,
      }));
    } catch (error: any) {
      console.error('Failed to update customer:', error);
      
      dispatch(addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update customer. Please try again.',
        duration: 5000,
      }));
      
      // Refresh to revert any optimistic updates
      fetchCustomers();
    }
  };

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
    return <div />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title font-bold text-gray-900">Customers</h1>
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
        <div className="bg-white shadow rounded-lg p-6 mb-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Add New Customer</h2>
          <form onSubmit={handleCreateCustomer} className="space-y-5">
            {/* Row 1: First Name, Last Name, Email */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>

            {/* Row 2: Phone, Company Name, Customer Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>

            {/* Row 3: Job Title, Company Website, Source */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>

            {/* Row 4: Address Line 1, City, Country */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* Row 5: Notes, Attachments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  rows={6}
                  value={newCustomer.notes || ''}
                  onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Additional notes about the customer..."
                />
              </div>
              <div>
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
                  <div className="text-xs text-gray-500 mt-2">No attachments added.</div>
                )}
                <div className="mt-2 space-y-2">
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
              </div>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="metric-card metric-blue bg-white px-4 py-3 rounded-lg shadow border-t-4 border-blue-600">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlusIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="metric-value text-2xl font-bold">{stats.total_customers}</p>
            </div>
          </div>
        </div>
        
        <div className="metric-card metric-green bg-white px-4 py-3 rounded-lg shadow border-t-4 border-green-600">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <BuildingOfficeIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Clients</p>
              <p className="metric-value text-2xl font-bold">{stats.active_customers}</p>
            </div>
          </div>
        </div>
        
        <div className="metric-card metric-yellow bg-white px-4 py-3 rounded-lg shadow border-t-4 border-yellow-600">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TagIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="metric-value text-2xl font-bold">{stats.total_projects}</p>
            </div>
          </div>
        </div>
        
        {/* Leads */}
        <div className="metric-card metric-red bg-white px-4 py-3 rounded-lg shadow border-t-4 border-red-600">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <FunnelIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Leads</p>
              <p className="metric-value text-2xl font-bold">{stats.leads}</p>
            </div>
          </div>
        </div>
        
        <div className="metric-card metric-purple bg-white px-4 py-3 rounded-lg shadow border-t-4 border-purple-600">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <EnvelopeIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="metric-value text-2xl font-bold">${(stats.total_revenue / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Edit Customer Form */}
      {editingCustomer && (
        <div className="bg-white shadow rounded-lg p-6 mb-6 border border-gray-200">
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
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              All Customers ({customers.length})
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-40 pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-gray-300"
                />
              </div>
              <button
                type="button"
                title="Refresh"
                className="p-1 text-gray-500 hover:text-gray-700"
                onClick={() => {
                  // Close any open popovers
                  setHeaderFilterOpen(null);
                  setToolbarDateOpen(false);

                  // Reset search
                  setCustomerSearch('');

                  // Reset sorting
                  setSortField(null);
                  setSortDir('asc');

                  // Reset header filters
                  setFilterType([]);
                  setFilterStatusActive([]);

                  // Reset date filters
                  setFilterFromDate('');
                  setFilterToDate('');
                  setPendingToolbarFrom('');
                  setPendingToolbarTo('');

                  // Fetch unfiltered list
                  fetchCustomers();
                }}
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
              <div className="relative" ref={toolbarDateRef}>
                <button
                  type="button"
                  title="Filter by date range"
                  className="p-1 text-gray-500 hover:text-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingToolbarFrom(filterFromDate || '');
                    setPendingToolbarTo(filterToDate || '');
                    setToolbarDateOpen((o) => !o);
                  }}
                >
                  <CalendarIcon className="w-4 h-4" />
                </button>
                {toolbarDateOpen && (
                  <div className="absolute right-0 top-full mt-1 z-40 w-64 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{borderRadius: '5px'}}>
                    <div className="px-1 pb-1">
                      <DateRangeCalendar size="sm"
                        initialFrom={pendingToolbarFrom || null}
                        initialTo={pendingToolbarTo || null}
                        onChange={(from, to) => {
                          if (from && !to) {
                            setPendingToolbarFrom(from);
                          } else {
                            setPendingToolbarFrom(from || '');
                            setPendingToolbarTo(to || '');
                          }
                        }}
                      />
                    </div>
                    <div className="flex justify-end gap-2 px-1.5 py-1 border-t border-gray-100 mt-1">
                      <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { 
                        e.stopPropagation(); 
                        setFilterFromDate(''); 
                        setFilterToDate(''); 
                        setToolbarDateOpen(false); 
                      }}>Clear</button>
                      <button className="filter-popup-btn filter-popup-btn-filter" onClick={(e) => {
                        e.stopPropagation();
                        const from = pendingToolbarFrom || '';
                        const to = pendingToolbarTo || pendingToolbarFrom || '';
                        setFilterFromDate(from);
                        setFilterToDate(to);
                        setToolbarDateOpen(false);
                      }}>Filter</button>
                    </div>
                  </div>
                )}
              </div>
              {/* View Toggle */}
              <div className="flex gap-2">
                <ViewModeButton
                  icon={ListBulletIcon}
                  label="List"
                  active={currentView === 'list'}
                  onClick={() => setCurrentView('list')}
                />
                <ViewModeButton
                  icon={Squares2X2Icon}
                  label="Kanban"
                  active={currentView === 'kanban'}
                  onClick={() => setCurrentView('kanban')}
                />
              </div>
            </div>
          </div>
        </div>
        {currentView === 'list' ? (
          <div className="overflow-x-auto customers-table" style={{backgroundColor: 'rgb(249, 250, 251)'}}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Contact
                  </th>
                  <th onDoubleClick={() => onHeaderDblClick('type')} className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    <div className="inline-flex items-center gap-1">
                      <span>Type</span>
                      <span className="relative">
                        <button
                          type="button"
                          className="p-0.5 text-gray-500 hover:text-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            const isOpening = headerFilterOpen !== 'type';
                            if (isOpening) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setFilterButtonRect(rect);
                            }
                            setHeaderFilterOpen(isOpening ? 'type' : null);
                          }}
                        >
                          <FunnelIcon className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  </th>
                  <th onDoubleClick={() => onHeaderDblClick('projects')} className="px-3 py-2 text-center text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    Projects
                  </th>
                  <th onDoubleClick={() => onHeaderDblClick('invoiced')} className="px-3 py-2 text-center text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    Invoiced
                  </th>
                  <th onDoubleClick={() => onHeaderDblClick('due_amount')} className="px-3 py-2 text-right text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    Due Amount
                  </th>
                  <th onDoubleClick={() => onHeaderDblClick('pending')} className="px-3 py-2 text-center text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    Pending
                  </th>
                  <th onDoubleClick={() => onHeaderDblClick('status')} className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
                    <div className="inline-flex items-center gap-1">
                      <span>Status</span>
                      <span className="relative">
                        <button
                          type="button"
                          className="p-0.5 text-gray-500 hover:text-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            const isOpening = headerFilterOpen !== 'status';
                            if (isOpening) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setFilterButtonRect(rect);
                            }
                            setHeaderFilterOpen(isOpening ? 'status' : null);
                          }}
                        >
                          <FunnelIcon className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              {/* Type Filter Portal */}
              {headerFilterOpen === 'type' && (
                <FilterPortal buttonRect={filterButtonRect}>
                  <div ref={headerFilterRef} className="w-44 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
                    <ul className="max-h-64 overflow-auto">
                      {['prospect', 'client', 'lead', 'inactive'].map((opt) => (
                        <li
                          key={opt}
                          className={`px-2 py-1 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${filterType.includes(opt) ? 'bg-gray-50' : ''}`}
                          onClick={() => {
                            setFilterType(prev => 
                              prev.includes(opt) ? prev.filter(t => t !== opt) : [...prev, opt]
                            );
                          }}
                        >
                          <span className="capitalize">{opt}</span>
                          {filterType.includes(opt) && <CheckIcon className="w-4 h-4 text-user-blue" />}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FilterPortal>
              )}
              {/* Status Filter Portal */}
              {headerFilterOpen === 'status' && (
                <FilterPortal buttonRect={filterButtonRect}>
                  <div ref={headerFilterRef} className="w-40 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
                    <ul className="max-h-64 overflow-auto">
                      {[{label: 'Active', value: true}, {label: 'Inactive', value: false}].map((opt) => (
                        <li
                          key={opt.label}
                          className={`px-2 py-1 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${filterStatusActive.includes(opt.value) ? 'bg-gray-50' : ''}`}
                          onClick={() => {
                            setFilterStatusActive(prev => 
                              prev.includes(opt.value) ? prev.filter(s => s !== opt.value) : [...prev, opt.value]
                            );
                          }}
                        >
                          <span>{opt.label}</span>
                          {filterStatusActive.includes(opt.value) && <CheckIcon className="w-4 h-4 text-user-blue" />}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FilterPortal>
              )}
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedCustomers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-sm text-gray-500">
                      No customers found
                    </td>
                  </tr>
                )}
                {displayedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/customers/${customer.id}`)}>
                    <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => { e.stopPropagation(); startInlineEdit(e, customer, 'name'); }}>
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-user-blue">
                            {customer.first_name?.[0]}{customer.last_name?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-base font-semibold text-black">
                            {customer.full_name}
                          </div>
                          <div className="text-base text-black">
                            {customer.job_title || 'No title'}
                          </div>
                        </div>
                      </div>
                      {editingCustomerId === customer.id && editingField === 'name' && (
                        <InlineEditPortal rect={inlineEditRect}>
                          <div ref={inlinePopoverRef} className="w-56 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { saveInlineEdit(customer.id); }
                                if (e.key === 'Escape') { cancelInlineEdit(); }
                              }}
                              onBlur={() => saveInlineEdit(customer.id)}
                              className="w-full px-2 py-1 text-xs border border-gray-200 rounded-sm focus:outline-none focus:ring-0 focus:border-gray-300"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-1">
                              <button type="button" className="filter-popup-btn filter-popup-btn-clear" onClick={cancelInlineEdit}>Cancel</button>
                              <button type="button" className="filter-popup-btn filter-popup-btn-filter" onClick={() => saveInlineEdit(customer.id)}>Save</button>
                            </div>
                          </div>
                        </InlineEditPortal>
                      )}
                    </td>
                    
                    <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => { e.stopPropagation(); startInlineEdit(e, customer, 'website'); }}>
                      <div className="text-base text-black">
                        {customer.company_name || 'No company'}
                      </div>
                      {customer.company_website && (
                        <div className="text-base text-black">
                          <a href={customer.company_website} target="_blank" rel="noopener noreferrer" className="hover:underline" onClick={(e) => e.stopPropagation()}>
                            {customer.company_website}
                          </a>
                        </div>
                      )}
                      {editingCustomerId === customer.id && editingField === 'website' && (
                        <InlineEditPortal rect={inlineEditRect}>
                          <div ref={inlinePopoverRef} className="w-56 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
                            <input
                              type="url"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { saveInlineEdit(customer.id); }
                                if (e.key === 'Escape') { cancelInlineEdit(); }
                              }}
                              onBlur={() => saveInlineEdit(customer.id)}
                              placeholder="https://example.com"
                              className="w-full px-2 py-1 text-xs border border-gray-200 rounded-sm focus:outline-none focus:ring-0 focus:border-gray-300"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-1">
                              <button type="button" className="filter-popup-btn filter-popup-btn-clear" onClick={cancelInlineEdit}>Cancel</button>
                              <button type="button" className="filter-popup-btn filter-popup-btn-filter" onClick={() => saveInlineEdit(customer.id)}>Save</button>
                            </div>
                          </div>
                        </InlineEditPortal>
                      )}
                    </td>
                    
                    <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="text-base text-black">
                        <a href={`mailto:${customer.email}`} className="flex items-center space-x-2 hover:text-user-blue" onClick={(e) => e.stopPropagation()}>
                          <EnvelopeIcon className="h-4 w-4 text-gray-600" />
                          <span>{customer.email}</span>
                        </a>
                      </div>
                      {customer.phone && (
                        <div className="text-base text-black">
                          <a href={`tel:${customer.phone}`} className="flex items-center space-x-2 hover:text-user-blue" onClick={(e) => e.stopPropagation()}>
                            <PhoneIcon className="h-4 w-4 text-gray-600" />
                            <span>{customer.phone}</span>
                          </a>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => { e.stopPropagation(); startInlineEdit(e, customer, 'type'); }}>
                      <div className="relative inline-block">
                        <span className={`inline-flex px-1.5 pt-0 pb-0.5 text-xs font-light rounded-sm ${getCustomerTypeColor(customer.customer_type)}`}>
                          {customer.customer_type}
                        </span>
                        {editingCustomerId === customer.id && editingField === 'type' && (
                          <InlineEditPortal rect={inlineEditRect}>
                            <div ref={inlinePopoverRef} className="w-40 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
                              <ul className="max-h-64 overflow-auto">
                                {['prospect', 'client', 'lead', 'inactive'].map((opt) => (
                                  <li
                                    key={opt}
                                    className={`px-2 py-1 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${opt===customer.customer_type ? 'bg-gray-50' : ''}`}
                                    onClick={() => { saveInlineEdit(customer.id, opt); }}
                                  >
                                    <span className="capitalize">{opt}</span>
                                    {opt===customer.customer_type && <CheckIcon className="w-4 h-4 text-user-blue" />}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </InlineEditPortal>
                        )}
                      </div>
                    </td>
                    
                    {/* Projects Count */}
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-50 text-blue-700">
                        {customer.projects_count ?? 0}
                      </span>
                    </td>
                    
                    {/* Invoiced Count */}
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-50 text-purple-700">
                        {customer.invoiced_count ?? 0}
                      </span>
                    </td>
                    
                    {/* Due Amount */}
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-base font-bold ${
                          (customer.due_amount ?? 0) > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(customer.due_amount)}
                        </span>
                        {(customer.due_amount ?? 0) > 0 && (
                          <span className="text-xs text-gray-500">outstanding</span>
                        )}
                      </div>
                    </td>
                    
                    {/* Pending Invoices Count */}
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${
                        (customer.pending_invoices_count ?? 0) > 0 
                          ? 'bg-yellow-50 text-yellow-700' 
                          : 'bg-gray-50 text-gray-700'
                      }`}>
                        {customer.pending_invoices_count ?? 0}
                      </span>
                    </td>
                    
                    <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => { e.stopPropagation(); startInlineEdit(e, customer, 'status'); }}>
                      <div className="relative inline-block">
                        <span className={`inline-flex px-1.5 pt-0 pb-0.5 text-xs font-light rounded-sm ${getStatusColor(customer.is_active)}`}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {editingCustomerId === customer.id && editingField === 'status' && (
                          <InlineEditPortal rect={inlineEditRect}>
                            <div ref={inlinePopoverRef} className="w-40 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
                              <ul className="max-h-64 overflow-auto">
                                {[{label: 'Active', value: true}, {label: 'Inactive', value: false}].map((opt) => (
                                  <li
                                    key={opt.label}
                                    className={`px-2 py-1 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${opt.value===customer.is_active ? 'bg-gray-50' : ''}`}
                                    onClick={() => { saveInlineEdit(customer.id, opt.value); }}
                                  >
                                    <span>{opt.label}</span>
                                    {opt.value===customer.is_active && <CheckIcon className="w-4 h-4 text-user-blue" />}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </InlineEditPortal>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          className="inline-flex items-center justify-center p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingCustomer(customer)}
                          className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 text-black hover:bg-gray-200 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="inline-flex items-center justify-center p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
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
        ) : (
          <CustomerKanbanBoard
            customers={displayedCustomers}
            onCustomerUpdate={handleCustomerUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default CustomersPage;