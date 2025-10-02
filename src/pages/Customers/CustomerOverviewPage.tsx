import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux';
import { Customer, Project, ProjectInvoice as Invoice, Proposal } from '../../types';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { addNotification } from '../../store/slices/notificationSlice';
import {
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  BriefcaseIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BanknotesIcon,
  FolderIcon,
  ChartBarIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ArrowLeftIcon,
  MapPinIcon,
  TagIcon,
  EyeIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

interface CustomerStats {
  totalProjects: number;
  totalInvoices: number;
  totalProposals: number;
  totalRevenue: number;
  totalOutstanding: number;
  averageProjectValue: number;
  projectStatusDistribution: Record<string, number>;
  invoiceStatusDistribution: Record<string, number>;
}

const CustomerOverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    totalProjects: 0,
    totalInvoices: 0,
    totalProposals: 0,
    totalRevenue: 0,
    totalOutstanding: 0,
    averageProjectValue: 0,
    projectStatusDistribution: {},
    invoiceStatusDistribution: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'invoices' | 'proposals' | 'edit'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id]);

  const fetchCustomerData = async () => {
    setIsLoading(true);
    try {
      // Fetch customer details
      const { default: apiClient } = await import('../../api/client');
      const customerResponse = await apiClient.get(`/customers/${id}`);
      const customerData = customerResponse.data;
      setCustomer(customerData);
      setEditForm(customerData);

      // Fetch related data
      await Promise.all([
        fetchCustomerProjects(),
        fetchCustomerInvoices(),
        fetchCustomerProposals(),
        fetchCustomerAttachments()
      ]);
    } catch (error) {
      console.error('Failed to fetch customer data:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load customer data',
        duration: 5000,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerProjects = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get(`/projects/?customer_id=${id}`);
      const data = response.data;
      const projectsData = Array.isArray(data) ? data : (data.items || data.projects || []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchCustomerInvoices = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get(`/invoices/?customer_id=${id}`);
      const data = response.data;
      const invoicesData = Array.isArray(data) ? data : (data.items || data.invoices || []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  };

  const fetchCustomerProposals = async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get(`/proposals/?customer_id=${id}`);
      const data = response.data;
      const proposalsData = Array.isArray(data) ? data : (data.items || data.proposals || []);
      setProposals(Array.isArray(proposalsData) ? proposalsData : []);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    }
  };

  const fetchCustomerAttachments = async () => {
    if (!id) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get(`/customers/${id}/attachments`);
      const data = response.data;
      const list = Array.isArray(data)
        ? data
        : (data?.attachments || data?.items || data?.results || []);
      setAttachments(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
      setAttachments([]);
    }
  };

  const uploadAttachments = async (files: File[]) => {
    if (!id || !files.length) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      const uploaded: any[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        const res = await apiClient.post(`/customers/${id}/attachments`, form);
        uploaded.push(res.data);
      }
      setAttachments(prev => [...uploaded, ...prev]);
      dispatch(addNotification({ type: 'success', title: 'Attachments Uploaded', message: `${files.length} file(s) uploaded`, duration: 3000 }));
    } catch (error) {
      console.error('Upload failed:', error);
      dispatch(addNotification({ type: 'error', title: 'Upload Failed', message: 'Could not upload attachments', duration: 5000 }));
    }
  };

  const updateAttachment = async (attachmentId: string, description: string) => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const res = await apiClient.put(`/customers/attachments/${attachmentId}`, { description });
      setAttachments(prev => prev.map(a => a.id === attachmentId ? res.data : a));
    } catch (error) {
      console.error('Failed to update attachment:', error);
      dispatch(addNotification({ type: 'error', title: 'Update Failed', message: 'Could not update attachment', duration: 4000 }));
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.delete(`/customers/attachments/${attachmentId}`);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      dispatch(addNotification({ type: 'error', title: 'Delete Failed', message: 'Could not delete attachment', duration: 4000 }));
    }
  };

  const calculateStats = () => {
    const newStats: CustomerStats = {
      totalProjects: projects.length,
      totalInvoices: invoices.length,
      totalProposals: proposals.length,
      totalRevenue: 0,
      totalOutstanding: 0,
      averageProjectValue: 0,
      projectStatusDistribution: {},
      invoiceStatusDistribution: {}
    };

    // Calculate project stats
    let totalProjectValue = 0;
    projects.forEach(project => {
      if (project.budget) totalProjectValue += project.budget;
      const status = project.status;
      newStats.projectStatusDistribution[status] = (newStats.projectStatusDistribution[status] || 0) + 1;
    });

    // Calculate invoice stats
    invoices.forEach(invoice => {
      if (invoice.total_amount) {
        newStats.totalRevenue += invoice.total_amount;
        // Assuming unpaid invoices have a status that indicates they're outstanding
        if (invoice.status === 'pending' || invoice.status === 'overdue') {
          newStats.totalOutstanding += invoice.total_amount;
        }
      }
      const status = invoice.status || 'unknown';
      newStats.invoiceStatusDistribution[status] = (newStats.invoiceStatusDistribution[status] || 0) + 1;
    });

    newStats.averageProjectValue = projects.length > 0 ? totalProjectValue / projects.length : 0;

    setStats(newStats);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.put(`/customers/${customer.id}`, editForm);
      
      setCustomer({ ...customer, ...editForm });
      setIsEditing(false);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Customer updated successfully',
        duration: 3000,
      }));
    } catch (error) {
      console.error('Failed to update customer:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update customer',
        duration: 5000,
      }));
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer || !window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    try {
      const { default: apiClient } = await import('../../api/client');
      await apiClient.delete(`/customers/${customer.id}`);
      
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Customer deleted successfully',
        duration: 3000,
      }));
      
      navigate('/customers');
    } catch (error) {
      console.error('Failed to delete customer:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete customer',
        duration: 5000,
      }));
    }
  };

  // Recalculate stats whenever related lists change
  useEffect(() => {
    calculateStats();
  }, [projects, invoices, proposals]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100); // Assuming amount is in cents
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      planning: 'bg-yellow-100 text-yellow-800',
      on_hold: 'bg-orange-100 text-orange-800',
      cancelled: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Customer Not Found</h2>
        <p className="text-gray-600 mb-6">The customer you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/customers')}
          className="px-4 py-2 bg-user-blue text-white rounded-md hover:bg-user-blue"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{customer.full_name}</h1>
            <p className="text-gray-600">
              {customer.company_name ? `${customer.company_name} • ` : ''}
              Customer since {formatDate(customer.created_at)}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setActiveTab('edit')}
            className="inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit
          </button>

          {/* Added actions next to Edit button */}
          <button
            onClick={() => window.open(`mailto:${customer.email}`)}
            className="inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <EnvelopeIcon className="h-4 w-4 mr-2" />
            Send Email
          </button>
          {customer.phone && (
            <button
              onClick={() => window.open(`tel:${customer.phone}`)}
              className="inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PhoneIcon className="h-4 w-4 mr-2" />
              Call Customer
            </button>
          )}
          <button
            onClick={() => setActiveTab('projects')}
            className="inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <FolderIcon className="h-4 w-4 mr-2" />
            View Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className="inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <BanknotesIcon className="h-4 w-4 mr-2" />
            View Invoices ({invoices.length})
          </button>

          <button
            onClick={handleDeleteCustomer}
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
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'projects', name: 'Projects', icon: FolderIcon, count: projects.length },
            { id: 'invoices', name: 'Invoices', icon: BanknotesIcon, count: invoices.length },
            { id: 'proposals', name: 'Proposals', icon: DocumentTextIcon, count: proposals.length },
            { id: 'edit', name: 'Edit', icon: PencilIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-3 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
                activeTab === tab.id ? 'text-indigo-600' : 'text-black hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
                {tab.count !== undefined && (
                  <span className="bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tab Content */}
          {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Full Name</p>
                    <p className="text-sm text-gray-600">{customer.full_name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600">{customer.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-600">{customer.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {customer.company_name && (
                  <div className="flex items-center space-x-3">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Company</p>
                      <p className="text-sm text-gray-600">{customer.company_name}</p>
                    </div>
                  </div>
                )}
                {customer.job_title && (
                  <div className="flex items-center space-x-3">
                    <BriefcaseIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Job Title</p>
                      <p className="text-sm text-gray-600">{customer.job_title}</p>
                    </div>
                  </div>
                )}
                {customer.company_website && (
                  <div className="flex items-center space-x-3">
                    <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Website</p>
                      <a 
                        href={customer.company_website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-user-blue hover:text-primary-800"
                      >
                        {customer.company_website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {customer.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-2">Notes</p>
                <p className="text-sm text-gray-600">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FolderIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Projects</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalProjects}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BanknotesIcon className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                      <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.totalRevenue)}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyDollarIcon className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Outstanding</dt>
                      <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.totalOutstanding)}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Avg Project Value</dt>
                      <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.averageProjectValue)}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {projects.slice(0, 3).map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <FolderIcon className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.name}</p>
                        <p className="text-sm text-gray-500">Project {project.status}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>{formatDate(project.created_at)}</div>
                      {project.budget && (
                        <div className="font-medium text-gray-900">{formatCurrency(project.budget)}</div>
                      )}
                    </div>
                  </div>
                ))}
                {projects.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No projects yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Projects</h3>
            <button
              onClick={() => navigate('/projects')}
              className="btn-page-action flex items-center btn-styled btn-create-auto" style={{ backgroundColor: 'rgb(0, 0, 0)', color: 'white', borderColor: 'rgb(0, 0, 0)', fontSize: '0.875rem', padding: '0.2rem 0.75rem' }}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Project
            </button>
          </div>
          
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {projects.map((project) => (
                <div key={project.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">{project.name}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-gray-600 mb-4">{project.description}</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <p className="font-medium">{project.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Priority:</span>
                      <p className="font-medium">{project.priority}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Budget:</span>
                      <p className="font-medium">{project.budget ? formatCurrency(project.budget) : 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p className="font-medium">{formatDate(project.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Invoices</h3>
            <button
              onClick={() => navigate('/invoices')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-user-blue hover:bg-user-blue"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Invoice
            </button>
          </div>
          
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new invoice.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">{invoice.title}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status || 'draft')}`}>
                      {invoice.status || 'draft'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Amount:</span>
                      <p className="font-medium">{formatCurrency(invoice.total_amount || 0)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <p className="font-medium">{invoice.status || 'draft'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Due Date:</span>
                      <p className="font-medium">{invoice.due_date ? formatDate(invoice.due_date) : 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p className="font-medium">{formatDate(invoice.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Proposals Tab */}
      {activeTab === 'proposals' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Proposals</h3>
            <button
              onClick={() => navigate('/proposals')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-user-blue hover:bg-user-blue"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Proposal
            </button>
          </div>
          
          {proposals.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No proposals</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new proposal.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">{proposal.title}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proposal.status || 'draft')}`}>
                      {proposal.status || 'draft'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <p className="font-medium">{proposal.proposal_type}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <p className="font-medium">{proposal.status || 'draft'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Valid Until:</span>
                      <p className="font-medium">{proposal.valid_until ? formatDate(proposal.valid_until) : 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p className="font-medium">{formatDate(proposal.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Tab */}
      {activeTab === 'edit' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Edit Customer</h3>
          <form onSubmit={handleUpdateCustomer} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.first_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.last_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={editForm.company_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={editForm.job_title || ''}
                  onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={editForm.company_website || ''}
                  onChange={(e) => setEditForm({ ...editForm, company_website: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Type
                </label>
                <select
                  value={editForm.customer_type || 'client'}
                  onChange={(e) => setEditForm({ ...editForm, customer_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="prospect">Prospect</option>
                  <option value="client">Client</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                rows={4}
                value={editForm.notes || ''}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Add any additional notes about this customer..."
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-user-blue text-white rounded-md hover:bg-user-blue transition-colors"
              >
                Update Customer
              </button>
            </div>
          </form>
        </div>
      )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Customer Stats */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Customer Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Projects</span>
                  <span className="text-sm font-medium text-gray-900">{stats.totalProjects}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Invoices</span>
                  <span className="text-sm font-medium text-gray-900">{stats.totalInvoices}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Proposals</span>
                  <span className="text-sm font-medium text-gray-900">{stats.totalProposals}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Revenue</span>
                  <span className="text-sm font-medium text-green-600">${stats.totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Outstanding</span>
                  <span className="text-sm font-medium text-red-600">${stats.totalOutstanding.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Contact Info</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{customer.email}</p>
                  </div>
                </div>
                {customer.phone && (
                  <div className="flex items-center space-x-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{customer.phone}</p>
                    </div>
                  </div>
                )}
                {customer.company_name && (
                  <div className="flex items-center space-x-3">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{customer.company_name}</p>
                    </div>
                  </div>
                )}
                {customer.company_website && (
                  <div className="flex items-center space-x-3">
                    <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <a 
                        href={customer.company_website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-500 truncate"
                      >
                        {customer.company_website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Attachments</h3>
                <label className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length) await uploadAttachments(files);
                      e.currentTarget.value = '';
                    }}
                  />
                  <PlusIcon className="w-4 h-4 mr-1" /> Add
                </label>
              </div>
              {(!Array.isArray(attachments) || attachments.length === 0) ? (
                <p className="text-sm text-gray-500">No attachments uploaded.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {(Array.isArray(attachments) ? attachments : []).map((a) => (
                    <li key={a.id} className="py-3 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{a.original_filename || 'Attachment'}</p>
                        <input
                          type="text"
                          value={a.description || ''}
                          onChange={(e) => updateAttachment(a.id, e.target.value)}
                          placeholder="Add description"
                          className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1"
                        />
                      </div>
                      <div className="ml-3 flex items-center space-x-2">
                        <button
                          onClick={async () => {
                            try {
                              const { default: apiClient } = await import('../../api/client');
                              const res = await apiClient.get(`/customers/attachments/${a.id}/preview`, { responseType: 'blob' });
                              const blob = res.data as Blob;
                              const url = URL.createObjectURL(blob);
                              window.open(url, '_blank');
                              setTimeout(() => URL.revokeObjectURL(url), 60_000);
                            } catch (err) {
                              dispatch(addNotification({ type: 'error', title: 'Preview Failed', message: 'Could not preview file', duration: 4000 }));
                            }
                          }}
                          className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded"
                          title="Preview attachment"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const { default: apiClient } = await import('../../api/client');
                              const res = await apiClient.get(`/customers/attachments/${a.id}/download`, { responseType: 'blob' });
                              const blob = res.data as Blob;
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = a.original_filename || 'attachment';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              setTimeout(() => URL.revokeObjectURL(url), 60_000);
                            } catch (err) {
                              dispatch(addNotification({ type: 'error', title: 'Download Failed', message: 'Could not download file', duration: 4000 }));
                            }
                          }}
                          className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                          title="Download attachment"
                        >
                          <DocumentArrowDownIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteAttachment(a.id)}
                          className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded"
                          title="Delete attachment"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {projects.slice(0, 3).map((project) => (
                  <div key={project.id} className="flex items-center space-x-3">
                    <div className={`h-2 w-2 rounded-full ${
                      project.status === 'completed' ? 'bg-green-400' :
                      project.status === 'active' ? 'bg-blue-400' : 'bg-gray-400'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{project.name}</p>
                      <p className="text-xs text-gray-500">{project.status.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
                {projects.length === 0 && (
                  <p className="text-sm text-gray-500">No recent projects</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CustomerOverviewPage;
