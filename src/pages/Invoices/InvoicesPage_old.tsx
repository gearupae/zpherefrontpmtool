import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux';
import { ProjectInvoice, ProjectInvoiceCreate, InvoiceType, Project, Customer, Item } from '../../types';
import { addNotification } from '../../store/slices/notificationSlice';
import DeliveryNoteManagement from '../../components/Invoices/DeliveryNoteManagement';
import InvoiceItemsTable from '../../components/Invoices/InvoiceItemsTable';
import { apiClient } from '../../api/client';
import { 
  PlusIcon, 
  BanknotesIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  TruckIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
type SelectedItem = {
  item?: Item | null;
  quantity: number;
  unit_price: number; // dollars for UI
  tax_rate: number;   // %
  discount_rate: number; // %
  description: string;
};

const InvoicesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([{ item: null, description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }]);
  const [showDeliveryNotes, setShowDeliveryNotes] = useState(false);
  const [selectedInvoiceForDelivery, setSelectedInvoiceForDelivery] = useState<ProjectInvoice | null>(null);
  
  const [newInvoice, setNewInvoice] = useState<ProjectInvoiceCreate>({
    title: '',
    description: '',
    project_id: '',
    customer_id: '',
    invoice_type: InvoiceType.PROJECT,
    currency: 'USD',
    exchange_rate: 1,
    payment_terms: 'net_30',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
    terms_and_conditions: '',
    is_recurring: false,
    recurring_interval: '1',
    next_invoice_date: '',
    tags: [],
    custom_fields: {},
    items: [
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        item_type: 'service' as any,
        tax_rate: 0,
        discount_rate: 0,
      } as any,
    ],
  });

  const [stats, setStats] = useState({
    total_invoices: 0,
    sent_invoices: 0,
    paid_invoices: 0,
    overdue_invoices: 0,
    total_amount: 0,
    pending_amount: 0
  });

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      // Fetch invoices, stats, projects, and customers in parallel
      const [invoicesRes, statsRes, projectsRes, customersRes] = await Promise.all([
        apiClient.get('/invoices/'),
        apiClient.get('/invoices/stats'),
        apiClient.get('/projects/'),
        apiClient.get('/customers/')
      ]);

      setInvoices(invoicesRes.data?.invoices || []);
      setProjects(projectsRes.data || []);
      setCustomers(customersRes.data?.customers || []);

      setStats({
        total_invoices: statsRes.data?.total_invoices ?? 0,
        sent_invoices: statsRes.data?.sent_invoices ?? 0,
        paid_invoices: statsRes.data?.paid_invoices ?? 0,
        overdue_invoices: statsRes.data?.overdue_invoices ?? 0,
        total_amount: statsRes.data?.total_amount ?? 0,
        pending_amount: statsRes.data?.total_outstanding ?? 0
      });
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load invoices'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate at least one selected item
      if (selectedItems.length === 0) {
        dispatch(addNotification({
          type: 'error',
          title: 'Validation Error',
          message: 'At least one invoice item is required'
        }));
        return;
      }

      // Normalize items to backend schema from ItemSelector
      const normalizedItems = selectedItems
        .filter((si) => (si.description && si.description.trim().length > 0) || (si.item && si.item.id))
        .map((si) => {
          const unitPriceCents = Math.round(Number(si.unit_price || 0) * 100);
          const qty = Math.max(1, Number(si.quantity) || 1);
          return {
            description: si.description,
            quantity: qty,
            unit_price: unitPriceCents,
            item_type: String(si.item?.item_type || 'service'),
            tax_rate: Math.round(Number(si.tax_rate || 0) * 100),
            discount_rate: Math.round(Number(si.discount_rate || 0) * 100),
          };
        });

      // Normalize payload to backend schema
      const payload = {
        title: newInvoice.title,
        description: newInvoice.description || undefined,
        project_id: newInvoice.project_id,
        customer_id: newInvoice.customer_id,
        invoice_type: newInvoice.invoice_type,
        currency: (newInvoice.currency || 'usd').toLowerCase(),
        exchange_rate: 100, // 1.00 exchange rate in basis points
        payment_terms: newInvoice.payment_terms,
        invoice_date: newInvoice.invoice_date ? new Date(newInvoice.invoice_date).toISOString() : new Date().toISOString(),
        // due_date is computed by backend from customer payment terms; omit if not set explicitly
        due_date: newInvoice.due_date ? new Date(newInvoice.due_date).toISOString() : undefined,
        notes: newInvoice.notes || undefined,
        terms_and_conditions: newInvoice.terms_and_conditions || undefined,
        is_recurring: !!newInvoice.is_recurring,
        recurring_interval: newInvoice.recurring_interval || undefined,
        next_invoice_date: newInvoice.next_invoice_date ? new Date(newInvoice.next_invoice_date).toISOString() : undefined,
        tags: newInvoice.tags || [],
        custom_fields: newInvoice.custom_fields || {},
        items: normalizedItems,
      } as any;

      await apiClient.post('/invoices/', payload);

      // Reset form and selected items
      setSelectedItems([{ item: null, description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }]);
      setNewInvoice({
        title: '',
        description: '',
        project_id: '',
        customer_id: '',
        invoice_type: InvoiceType.PROJECT,
        currency: 'USD',
        exchange_rate: 1,
        payment_terms: 'net_30',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        notes: '',
        terms_and_conditions: '',
        is_recurring: false,
        recurring_interval: '1',
        next_invoice_date: '',
        tags: [],
        custom_fields: {},
        items: [],
      });

      setShowCreateForm(false);
      await fetchInvoices();

      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Invoice created successfully!'
      }));

      // Optionally navigate to the created invoice detail page
      // navigate(`/invoices/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create invoice. Please try again.'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = invoices; // Search-only filtering retained elsewhere if needed

  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice? Only draft invoices can be deleted.')) return;
    try {
      await apiClient.delete(`/invoices/${id}`);
      await fetchInvoices();
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Invoice deleted successfully'
      }));
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete invoice. Make sure it is in draft status.'
      }));
    }
  };

  if (isLoading && invoices.length === 0) {
    return <div />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">
            Generate and track invoices linked to projects
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
className="btn-page-action inline-flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Invoice
        </button>
      </div>

      {/* Create Invoice Form */}
      {showCreateForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6 border border-gray-200">
          <div className="flex items-center mb-6">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <BanknotesIcon className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Create New Invoice</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleCreateInvoice} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newInvoice.title}
                  onChange={(e) => setNewInvoice({...newInvoice, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter invoice title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select
                  required
                  value={newInvoice.project_id}
                  onChange={(e) => setNewInvoice({...newInvoice, project_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select
                  required
                  value={newInvoice.customer_id}
                  onChange={(e) => setNewInvoice({...newInvoice, customer_id: e.target.value})}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Type</label>
                <select
                  value={newInvoice.invoice_type}
                  onChange={(e) => setNewInvoice({...newInvoice, invoice_type: e.target.value as InvoiceType})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={InvoiceType.PROJECT}>Project</option>
                  <option value={InvoiceType.RECURRING}>Recurring</option>
                  <option value={InvoiceType.TIME_AND_MATERIALS}>Time & Materials</option>
                  <option value={InvoiceType.FIXED_PRICE}>Fixed Price</option>
                  <option value={InvoiceType.HOURLY}>Hourly</option>
                  <option value={InvoiceType.EXPENSE}>Expense</option>
              </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={newInvoice.invoice_date}
                  onChange={(e) => setNewInvoice({...newInvoice, invoice_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newInvoice.due_date}
                  onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <select
                  value={newInvoice.payment_terms}
                  onChange={(e) => setNewInvoice({...newInvoice, payment_terms: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="net_15">Net 15</option>
                  <option value="net_30">Net 30</option>
                  <option value="net_45">Net 45</option>
                  <option value="net_60">Net 60</option>
                  <option value="due_on_receipt">Due on Receipt</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={newInvoice.currency}
                  onChange={(e) => setNewInvoice({...newInvoice, currency: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newInvoice.description}
                onChange={(e) => setNewInvoice({...newInvoice, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the invoice details and services provided"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={newInvoice.notes}
                onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes or special instructions"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms and Conditions</label>
              <textarea
                value={newInvoice.terms_and_conditions}
                onChange={(e) => setNewInvoice({...newInvoice, terms_and_conditions: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Payment terms, cancellation policy, warranties, etc."
              />
            </div>

            {/* Items Section (from Settings > Items) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Items *</label>
              <InvoiceItemsTable selectedItems={selectedItems} onItemsChange={setSelectedItems} />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedItems([{ item: null, description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }]);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || selectedItems.filter(si => (si.description?.trim() || si.item)).length === 0}
                className="btn btn-primary disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metric-card metric-blue bg-white px-4 py-3 rounded-lg shadow border-t-4 border-blue-600">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="metric-value text-2xl font-bold">{stats.total_invoices}</p>
            </div>
          </div>
        </div>

        <div className="metric-card metric-yellow bg-white px-4 py-3 rounded-lg shadow border-t-4 border-yellow-600">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
              <p className="metric-value text-2xl font-bold">{stats.sent_invoices}</p>
            </div>
          </div>
        </div>

        <div className="metric-card metric-green bg-white px-4 py-3 rounded-lg shadow border-t-4 border-green-600">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Paid Invoices</p>
              <p className="metric-value text-2xl font-bold">{stats.paid_invoices}</p>
            </div>
          </div>
        </div>

        <div className="metric-card metric-red bg-white px-4 py-3 rounded-lg shadow border-t-4 border-red-600">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overdue Invoices</p>
              <p className="metric-value text-2xl font-bold">{stats.overdue_invoices}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Invoices ({filteredInvoices.length})
          </h3>
        </div>
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new invoice.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-page-action inline-flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Invoice
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Balance Due
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-base font-semibold text-black">
                        {invoice.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.invoice_type}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-base text-black">
                      {projects.find(p => p.id === invoice.project_id)?.name || 'Unknown Project'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-base text-black">
                      {customers.find(c => c.id === invoice.customer_id)?.display_name || 'Unknown Customer'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-1.5 pt-0 pb-0.5 text-xs font-light rounded-sm ${
                        invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-base text-black">
                      ${typeof invoice.total_amount === 'number' ? (invoice.total_amount / 100).toFixed(2) : '0.00'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-base text-black">
                      ${typeof invoice.balance_due === 'number' ? (invoice.balance_due / 100).toFixed(2) : '0.00'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-base text-black">
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'No due date'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          className="inline-flex items-center justify-center p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/invoices/${invoice.id}?tab=edit`)}
                          className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 text-black hover:bg-gray-200 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const response = await apiClient.get(`/invoices/${invoice.id}/pdf`, { responseType: 'blob' });
                              const url = window.URL.createObjectURL(new Blob([response.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `invoice_${invoice.invoice_number || invoice.id}.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.URL.revokeObjectURL(url);
                            } catch (e) {
                              console.error('Failed to download invoice PDF:', e);
                            }
                          }}
                          className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                          title="Download PDF"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="inline-flex items-center justify-center p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedInvoiceForDelivery(invoice);
                            setShowDeliveryNotes(true);
                          }}
                          className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                          title="Delivery Notes"
                        >
                          <TruckIcon className="h-4 w-4" />
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

      {/* Delivery Note Management Modal */}
      {showDeliveryNotes && selectedInvoiceForDelivery && (
        <DeliveryNoteManagement
          invoiceId={selectedInvoiceForDelivery.id}
          invoiceNumber={selectedInvoiceForDelivery.title}
          invoiceItems={[]}
          onClose={() => {
            setShowDeliveryNotes(false);
            setSelectedInvoiceForDelivery(null);
          }}
        />
      )}
    </div>
  );
};

export default InvoicesPage;
