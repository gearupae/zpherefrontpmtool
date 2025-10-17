import React, { useEffect, useState, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { ProjectInvoice, ProjectInvoiceCreate, InvoiceType, Project, Customer, Item } from '../../types';
import { addNotification } from '../../store/slices/notificationSlice';
import DeliveryNoteManagement from '../../components/Invoices/DeliveryNoteManagement';
import InvoiceItemsTable from '../../components/Invoices/InvoiceItemsTable';
import { apiClient } from '../../api/client';
import DateRangeCalendar from '../../components/UI/DateRangeCalendar';
import './FilterButtons.css';
import { getTenantRoute } from '../../utils/tenantUtils';
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
 DocumentArrowDownIcon,
 MagnifyingGlassIcon,
 ArrowPathIcon,
 FunnelIcon,
 CalendarIcon,
 ChevronDownIcon,
 CheckIcon,
 CurrencyDollarIcon
} from '@heroicons/react/24/outline';
type SelectedItem = {
 item?: Item | null;
 quantity: number;
 unit_price: number; // dollars for UI
 tax_rate: number; // %
 discount_rate: number; // %
 description: string;
};

// Portal component for rendering filter popups outside table overflow context
const FilterPortal: React.FC<{ children: React.ReactNode; buttonRect: DOMRect | null }> = ({ children, buttonRect }) => {
 if (!buttonRect) return null;
 
 return ReactDOM.createPortal(
 <div
 className="filter-portal"
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

const InvoicesPage: React.FC = () => {
 const dispatch = useAppDispatch();
 const navigate = useNavigate();
 const user = useAppSelector((state) => state.auth.user);
 const [invoices, setInvoices] = useState<ProjectInvoice[]>([]);
 const [projects, setProjects] = useState<Project[]>([]);
 const [customers, setCustomers] = useState<Customer[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [showCreateForm, setShowCreateForm] = useState(false);
 const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([{ item: null, description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }]);
 const [showDeliveryNotes, setShowDeliveryNotes] = useState(false);
 const [selectedInvoiceForDelivery, setSelectedInvoiceForDelivery] = useState<ProjectInvoice | null>(null);
 const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<any[]>([]);
 const [showPaymentModal, setShowPaymentModal] = useState(false);
 const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<ProjectInvoice | null>(null);
 const [paymentAmount, setPaymentAmount] = useState('');
 const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
 const [isRecordingPayment, setIsRecordingPayment] = useState(false);

 // Search and filter state
 const [invoiceSearch, setInvoiceSearch] = useState('');
 const [filterFromDate, setFilterFromDate] = useState('');
 const [filterToDate, setFilterToDate] = useState('');
 const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
 const [filterCustomerId, setFilterCustomerId] = useState('');
 const [dueDateFrom, setDueDateFrom] = useState('');
 const [dueDateTo, setDueDateTo] = useState('');
 
 // Pending filter state (for Apply button)
 const [pendingToolbarFrom, setPendingToolbarFrom] = useState('');
 const [pendingToolbarTo, setPendingToolbarTo] = useState('');
 const [pendingDueDateFrom, setPendingDueDateFrom] = useState('');
 const [pendingDueDateTo, setPendingDueDateTo] = useState('');
 
 // Sorting state
 const [sortField, setSortField] = useState<'status' | 'amount' | 'balance_due' | 'due_date' | null>(null);
 const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
 
 // Filter popup state
 const [headerFilterOpen, setHeaderFilterOpen] = useState<null | 'status' | 'customer' | 'due_date'>(null);
 const [filterButtonRect, setFilterButtonRect] = useState<DOMRect | null>(null);
 const [toolbarDateOpen, setToolbarDateOpen] = useState(false);
 
 const toolbarDateRef = useRef<HTMLDivElement | null>(null);
 const headerFilterRef = useRef<HTMLDivElement | null>(null);
 
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
 pending_amount: 0,
 this_month_received: 0
 });

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      // Fetch invoices, projects, and customers in parallel (stats is optional)
      const [invoicesRes, projectsRes, customersRes, statsRes] = await Promise.allSettled([
        // Use canonical trailing slashes for list endpoints to avoid 307 redirects that may drop auth/tenant headers
        apiClient.get('/invoices/'),
        apiClient.get('/projects/'),
        apiClient.get('/customers/'),
        apiClient.get('/invoices/stats')
      ]);

      const toArray = (payload: any) => (
        Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload?.items)
              ? payload.items
              : Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload?.projects)
                  ? payload.projects
                  : Array.isArray(payload?.customers)
                    ? payload.customers
                    : Array.isArray(payload?.invoices)
                      ? payload.invoices
                      : []
      );

      if (invoicesRes.status !== 'fulfilled') throw invoicesRes.reason;
      const invoicesArr = toArray(invoicesRes.value.data);
      setInvoices(invoicesArr);
      if (projectsRes.status === 'fulfilled') setProjects(toArray(projectsRes.value.data));
      if (customersRes.status === 'fulfilled') setCustomers(toArray(customersRes.value.data));

      // Compute this month's received amount from payment_history (fallback to paid_date)
      const now = new Date();
      const month = now.getUTCMonth();
      const year = now.getUTCFullYear();
      const inSameMonth = (dStr?: string) => {
        if (!dStr) return false;
        const d = new Date(dStr);
        return d.getUTCFullYear() === year && d.getUTCMonth() === month;
      };
      let thisMonthReceived = 0;
      invoicesArr.forEach((inv: any) => {
        let addedFromHistory = false;
        if (Array.isArray(inv.payment_history)) {
          inv.payment_history.forEach((p: any) => {
            if (p && p.payment_date && inSameMonth(p.payment_date)) {
              const amt = typeof p.amount === 'number' ? p.amount : parseInt(p.amount || '0', 10) || 0;
              thisMonthReceived += amt;
              addedFromHistory = true;
            }
          });
        }
        // Fallback: if invoice was paid this month and no history captured, count amount_paid
        if (!addedFromHistory && inSameMonth(inv.paid_date)) {
          const amtPaid = typeof inv.amount_paid === 'number' ? inv.amount_paid : parseInt(inv.amount_paid || '0', 10) || 0;
          thisMonthReceived += amtPaid;
        }
      });

      // If stats endpoint is available use it, otherwise compute from invoices
      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value.data || {};
        setStats({
          total_invoices: s.total_invoices ?? invoicesArr.length,
          sent_invoices: s.sent_invoices ?? invoicesArr.filter((inv: any) => !['paid','cancelled','void'].includes((inv.status||'').toLowerCase())).length,
          paid_invoices: s.paid_invoices ?? invoicesArr.filter((inv: any) => (inv.status||'').toLowerCase() === 'paid').length,
          overdue_invoices: s.overdue_invoices ?? invoicesArr.filter((inv: any) => (inv.status||'').toLowerCase() === 'overdue').length,
          total_amount: s.total_amount ?? invoicesArr.reduce((sum: number, inv: any) => sum + (Number(inv.total_amount)||0), 0),
          pending_amount: (s.total_outstanding ?? s.pending_amount) ?? invoicesArr
            .filter((inv: any) => !['cancelled','void'].includes((inv.status||'').toLowerCase()))
            .reduce((sum: number, inv: any) => sum + (Number(inv.balance_due)||0), 0),
          this_month_received: thisMonthReceived
        });
      } else {
        // Fallback computed stats
        setStats({
          total_invoices: invoicesArr.length,
          sent_invoices: invoicesArr.filter((inv: any) => !['paid','cancelled','void'].includes((inv.status||'').toLowerCase())).length,
          paid_invoices: invoicesArr.filter((inv: any) => (inv.status||'').toLowerCase() === 'paid').length,
          overdue_invoices: invoicesArr.filter((inv: any) => (inv.status||'').toLowerCase() === 'overdue').length,
          total_amount: invoicesArr.reduce((sum: number, inv: any) => sum + (Number(inv.total_amount)||0), 0),
          pending_amount: invoicesArr
            .filter((inv: any) => !['cancelled','void'].includes((inv.status||'').toLowerCase()))
            .reduce((sum: number, inv: any) => sum + (Number(inv.balance_due)||0), 0),
          this_month_received: thisMonthReceived
        });
      }
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

 // Auto-generate invoice number when form is opened
 useEffect(() => {
 if (showCreateForm) {
 const invoiceCount = invoices.length + 1;
 const invoiceNumber = `INVOICE-${String(invoiceCount).padStart(3, '0')}`;
 setNewInvoice(prev => ({ ...prev, title: invoiceNumber }));
 }
 }, [showCreateForm, invoices.length]);

 // Close filter popups when clicking outside
 useEffect(() => {
 const handleClickOutside = (e: MouseEvent) => {
 const target = e.target as HTMLElement;
 if (!target.closest('.filter-portal') && !target.closest('button')) {
 setHeaderFilterOpen(null);
 setToolbarDateOpen(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
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
 // Note: terms_and_conditions will be fetched from Settings by backend
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
 is_recurring: !!newInvoice.is_recurring,
 recurring_interval: newInvoice.recurring_interval || undefined,
 next_invoice_date: newInvoice.next_invoice_date ? new Date(newInvoice.next_invoice_date).toISOString() : undefined,
 tags: newInvoice.tags || [],
 custom_fields: newInvoice.custom_fields || {},
 items: normalizedItems,
 } as any;

 await apiClient.post('/invoices', payload);

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

 // Filtered and sorted invoices
 const displayedInvoices = useMemo(() => {
 let filtered = [...invoices];

 // Search filter
 if (invoiceSearch && invoiceSearch.trim()) {
 const searchLower = invoiceSearch.toLowerCase();
 filtered = filtered.filter(inv => 
 inv.title?.toLowerCase().includes(searchLower) ||
 inv.invoice_number?.toLowerCase().includes(searchLower) ||
 inv.description?.toLowerCase().includes(searchLower) ||
 customers.find(c => c.id === inv.customer_id)?.display_name?.toLowerCase().includes(searchLower)
 );
 }

 // Status filter
 if (filterStatuses.length > 0) {
 filtered = filtered.filter(inv => filterStatuses.includes(inv.status));
 }

 // Customer filter
 if (filterCustomerId) {
 filtered = filtered.filter(inv => inv.customer_id === filterCustomerId);
 }

 // Toolbar date range filter (created_at)
 if (filterFromDate || filterToDate) {
 filtered = filtered.filter(inv => {
 const invDate = new Date(inv.invoice_date || inv.created_at);
 const from = filterFromDate ? new Date(filterFromDate) : null;
 const to = filterToDate ? new Date(filterToDate) : null;
 if (from && invDate < from) return false;
 if (to && invDate > to) return false;
 return true;
 });
 }

 // Due date range filter
 if (dueDateFrom || dueDateTo) {
 filtered = filtered.filter(inv => {
 if (!inv.due_date) return false;
 const dueDate = new Date(inv.due_date);
 const from = dueDateFrom ? new Date(dueDateFrom) : null;
 const to = dueDateTo ? new Date(dueDateTo) : null;
 if (from && dueDate < from) return false;
 if (to && dueDate > to) return false;
 return true;
 });
 }

 // Sorting
 if (sortField) {
 filtered.sort((a, b) => {
 let aVal: any = null;
 let bVal: any = null;

 if (sortField === 'status') {
 aVal = a.status || '';
 bVal = b.status || '';
 } else if (sortField === 'amount') {
 aVal = a.total_amount || 0;
 bVal = b.total_amount || 0;
 } else if (sortField === 'balance_due') {
 aVal = a.balance_due || 0;
 bVal = b.balance_due || 0;
 } else if (sortField === 'due_date') {
 aVal = a.due_date ? new Date(a.due_date).getTime() : 0;
 bVal = b.due_date ? new Date(b.due_date).getTime() : 0;
 }

 if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
 if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
 return 0;
 });
 }

 return filtered;
 }, [invoices, invoiceSearch, filterStatuses, filterCustomerId, filterFromDate, filterToDate, dueDateFrom, dueDateTo, sortField, sortDir, customers]);

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

 const handleOpenPaymentModal = (invoice: ProjectInvoice) => {
 setSelectedInvoiceForPayment(invoice);
 const balanceDue = typeof invoice.balance_due === 'number' ? (invoice.balance_due / 100).toFixed(2) : '0.00';
 setPaymentAmount(balanceDue);
 setPaymentDate(new Date().toISOString().split('T')[0]);
 setShowPaymentModal(true);
 };

  const handleRecordPayment = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedInvoiceForPayment) return;

 setIsRecordingPayment(true);
 try {
 const amountInCents = Math.round(parseFloat(paymentAmount) * 100);
 
 const paymentData = {
 amount: amountInCents,
 payment_date: new Date(paymentDate).toISOString(),
 payment_method: 'cash',
 reference: '',
 notes: 'Payment recorded from invoices list'
 };

  await apiClient.post(`/invoices/${selectedInvoiceForPayment.id}/payments`, paymentData);
 
 await fetchInvoices();
 
 dispatch(addNotification({
 type: 'success',
 title: 'Success',
 message: 'Payment recorded successfully'
 }));
 
 setShowPaymentModal(false);
 setSelectedInvoiceForPayment(null);
 setPaymentAmount('');
 setPaymentDate(new Date().toISOString().split('T')[0]);
 } catch (error: any) {
 console.error('Failed to record payment:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: error.response?.data?.detail || 'Failed to record payment'
 }));
 } finally {
 setIsRecordingPayment(false);
 }
 };

 const getCustomerPendingInvoicesCount = (customerId: string): number => {
 return invoices.filter(
 inv => inv.customer_id === customerId && 
 inv.status !== 'paid' && 
 inv.status !== 'cancelled' &&
 inv.status !== 'void'
 ).length;
 };

 const onHeaderDblClick = (field: 'status' | 'amount' | 'balance_due' | 'due_date') => {
 if (sortField === field) {
 setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
 } else {
 setSortField(field);
 setSortDir('asc');
 }
 };

 const handleRefresh = () => {
 // Close any open popovers
 setHeaderFilterOpen(null);
 setToolbarDateOpen(false);

 // Reset search
 setInvoiceSearch('');

 // Reset sorting
 setSortField(null);
 setSortDir('asc');

 // Reset filters
 setFilterStatuses([]);
 setFilterCustomerId('');
 setFilterFromDate('');
 setFilterToDate('');
 setDueDateFrom('');
 setDueDateTo('');

 // Reset pending selections
 setPendingToolbarFrom('');
 setPendingToolbarTo('');
 setPendingDueDateFrom('');
 setPendingDueDateTo('');

 // Fetch fresh data
 fetchInvoices();
 };

 if (isLoading && invoices.length === 0) {
 return <div />;
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex justify-between items-center">
 <div>
 <h1 className="page-title font-bold text-gray-900">Invoices</h1>
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
 {/* Row 1: Invoice Number *, Project, Customer *, Invoice Type */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number *</label>
 <input
 type="text"
 required
 value={newInvoice.title}
 onChange={(e) => setNewInvoice({...newInvoice, title: e.target.value})}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
 placeholder="INVOICE-001"
 readOnly
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
 <select
 value={newInvoice.project_id}
 onChange={(e) => setNewInvoice({...newInvoice, project_id: e.target.value})}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="">Select a project (optional)</option>
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
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value={InvoiceType.PROJECT}>Project</option>
 <option value={InvoiceType.RECURRING}>Recurring</option>
 <option value={InvoiceType.TIME_AND_MATERIALS}>Time & Materials</option>
 <option value={InvoiceType.FIXED_PRICE}>Fixed Price</option>
 <option value={InvoiceType.HOURLY}>Hourly</option>
 <option value={InvoiceType.EXPENSE}>Expense</option>
 </select>
 </div>
 </div>

 {/* Row 2: Invoice Date, Due Date, Payment Terms, Currency */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
 <input
 type="date"
 value={newInvoice.invoice_date}
 onChange={(e) => setNewInvoice({...newInvoice, invoice_date: e.target.value})}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
 <input
 type="date"
 value={newInvoice.due_date}
 onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
 <select
 value={newInvoice.payment_terms}
 onChange={(e) => setNewInvoice({...newInvoice, payment_terms: e.target.value})}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="USD">USD</option>
 <option value="EUR">EUR</option>
 <option value="GBP">GBP</option>
 </select>
 </div>
 </div>

 {/* Row 3: Notes and Description */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
 <input
 type="text"
 value={newInvoice.notes}
 onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder="Additional notes"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
 <textarea
 value={newInvoice.description}
 onChange={(e) => setNewInvoice({...newInvoice, description: e.target.value})}
 rows={2}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder="Describe the invoice details and services provided"
 />
 </div>
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
 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

 <div className="metric-card metric-green bg-white px-4 py-3 rounded-lg shadow border-t-4 border-green-600">
 <div className="flex items-center">
 <div className="p-2 bg-green-100 rounded-lg">
 <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-600">Received This Month</p>
 <p className="metric-value text-2xl font-bold">${(stats.this_month_received / 100).toFixed(2)}</p>
 </div>
 </div>
 </div>
 </div>


 {/* Invoices List */}
 <div className="bg-white rounded-lg shadow overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-medium text-gray-900">
 All Invoices ({invoices.length})
 </h3>
 <div className="flex items-center gap-2">
 <div className="relative">
 <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
 <input
 type="text"
 placeholder="Search invoices..."
 value={invoiceSearch}
 onChange={(e) => setInvoiceSearch(e.target.value)}
 className="w-40 pl-7 pr-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-gray-300"
 />
 </div>
 <button
 type="button"
 title="Refresh"
 className="p-1 text-gray-500 hover:text-gray-700"
 onClick={handleRefresh}
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
 <DateRangeCalendar 
 size="sm"
 initialFrom={pendingToolbarFrom || null}
 initialTo={pendingToolbarTo || null}
 onChange={(from, to) => {
 setPendingToolbarFrom(from || '');
 setPendingToolbarTo(to || '');
 }}
 />
 </div>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => {
 e.stopPropagation();
 setFilterFromDate('');
 setFilterToDate('');
 setToolbarDateOpen(false);
 }}>Clear</button>
 <button className="filter-popup-btn filter-popup-btn-filter" onClick={(e) => {
 e.stopPropagation();
 setFilterFromDate(pendingToolbarFrom || '');
 setFilterToDate(pendingToolbarTo || '');
 setToolbarDateOpen(false);
 }}>Filter</button>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 {displayedInvoices.length === 0 ? (
 <div className="text-center2">
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
 <div className="overflow-x-auto" style={{backgroundColor: 'rgb(249, 250, 251)'}}>
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
 Invoice
 </th>
 <th className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
 Project
 </th>
 <th className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
 <div className="inline-flex items-center gap-1">
 <span>Customer</span>
 <span className="relative">
 <button
 type="button"
 className="p-0.5 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = headerFilterOpen !== 'customer';
 if (isOpening) {
 const rect = e.currentTarget.getBoundingClientRect();
 setFilterButtonRect(rect);
 }
 setHeaderFilterOpen(isOpening ? 'customer' : null);
 }}
 >
 <FunnelIcon className="w-3.5 h-3.5" />
 </button>
 </span>
 </div>
 </th>
 <th className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
 Total Invoices
 </th>
 <th onDoubleClick={() => onHeaderDblClick('status')} className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
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
 <th onDoubleClick={() => onHeaderDblClick('amount')} className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
 Amount
 </th>
 <th onDoubleClick={() => onHeaderDblClick('balance_due')} className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
 Balance Due
 </th>
 <th onDoubleClick={() => onHeaderDblClick('due_date')} className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
 <div className="inline-flex items-center gap-1">
 <span>Due Date</span>
 <span className="relative">
 <button
 type="button"
 className="p-0.5 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = headerFilterOpen !== 'due_date';
 if (isOpening) {
 const rect = e.currentTarget.getBoundingClientRect();
 setFilterButtonRect(rect);
 setPendingDueDateFrom(dueDateFrom || '');
 setPendingDueDateTo(dueDateTo || '');
 }
 setHeaderFilterOpen(isOpening ? 'due_date' : null);
 }}
 >
 <CalendarIcon className="w-3.5 h-3.5" />
 </button>
 </span>
 </div>
 </th>
 <th className="px-6 py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {displayedInvoices.map((invoice) => (
 <tr key={invoice.id} className="hover:bg-gray-50">
 <td className="px-6 py-2 whitespace-nowrap">
 <div className="text-base font-semibold text-black">
 {invoice.title}
 </div>
 <div className="text-sm text-gray-500">
 {invoice.invoice_type}
 </div>
 </td>
 <td className="px-6 py-2 whitespace-nowrap text-base text-black">
 {projects.find(p => p.id === invoice.project_id)?.name || 'Unknown Project'}
 </td>
 <td className="px-6 py-2 whitespace-nowrap text-base text-black">
 {customers.find(c => c.id === invoice.customer_id)?.display_name || 'Unknown Customer'}
 </td>
 <td className="px-6 py-2 whitespace-nowrap text-base text-black">
 <span className="inline-flex items-center px-2 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
 {getCustomerPendingInvoicesCount(invoice.customer_id)} pending
 </span>
 </td>
 <td className="px-6 py-2 whitespace-nowrap">
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
 <td className="px-6 py-2 whitespace-nowrap text-base text-black">
 ${typeof invoice.total_amount === 'number' ? (invoice.total_amount / 100).toFixed(2) : '0.00'}
 </td>
 <td className="px-6 py-2 whitespace-nowrap text-base text-black">
 ${typeof invoice.balance_due === 'number' ? (invoice.balance_due / 100).toFixed(2) : '0.00'}
 </td>
 <td className="px-6 py-2 whitespace-nowrap text-base text-black">
 {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'No due date'}
 </td>
 <td className="px-6 py-2 whitespace-nowrap text-sm font-medium">
 <div className="flex space-x-2">
 <button
 onClick={() => navigate(getTenantRoute(`/invoices/${invoice.id}`, user?.role, (user as any)?.organization))}
 className="inline-flex items-center justify-center p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
 title="View"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => navigate(getTenantRoute(`/invoices/${invoice.id}?tab=edit`, user?.role, (user as any)?.organization))}
 className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 text-black hover:bg-gray-200 transition-colors"
 title="Edit"
 >
 <PencilIcon className="h-4 w-4" />
 </button>
        <button
          onClick={async () => {
          try {
            // Call canonical endpoint path exactly to avoid 307 redirects that can drop headers
            const token = localStorage.getItem('access_token');
            const response = await apiClient.get<Blob>(`/invoices/${invoice.id}/pdf`, {
              responseType: 'blob',
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                Accept: 'application/pdf',
              },
            });

            // Determine filename from header when available
            const disposition = (response.headers as any)?.['content-disposition'] as string | undefined;
            let filename = `invoice_${invoice.invoice_number || invoice.id}.pdf`;
            if (disposition) {
              const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
              const rawName = decodeURIComponent(match?.[1] || match?.[2] || '').trim();
              if (rawName) filename = rawName;
            }

            const blob = response.data as Blob;
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
          } catch (e: any) {
            console.error('Failed to download invoice PDF:', e);
            try {
              const maybeBlob: any = e?.response?.data;
              let message = 'Failed to download invoice PDF';
              if (maybeBlob instanceof Blob) {
                const text = await maybeBlob.text();
                try {
                  const json = JSON.parse(text);
                  if (typeof json?.detail === 'string') message = json.detail;
                } catch {
                  if (text) message = text;
                }
              } else if (typeof e?.response?.data?.detail === 'string') {
                message = e.response.data.detail;
              } else if (typeof e?.message === 'string') {
                message = e.message;
              }
              dispatch(addNotification({ type: 'error', title: 'Error', message }));
            } catch {
              dispatch(addNotification({ type: 'error', title: 'Error', message: 'Failed to download invoice PDF' }));
            }
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
 onClick={async () => {
 setSelectedInvoiceForDelivery(invoice);
 try {
 const res = await apiClient.get(`/invoices/${invoice.id}`);
 const items = Array.isArray(res.data?.items) ? res.data.items : [];
 setSelectedInvoiceItems(items);
 } catch (e) {
 setSelectedInvoiceItems([]);
 }
 setShowDeliveryNotes(true);
 }}
 className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
 title="Delivery Notes"
 >
 <TruckIcon className="h-4 w-4" />
 </button>
 {invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.balance_due > 0 && (
 <button
 onClick={() => handleOpenPaymentModal(invoice)}
 className="inline-flex items-center justify-center p-2 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
 title="Record Payment"
 >
 <BanknotesIcon className="h-4 w-4" />
 </button>
 )}
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
 invoiceItems={selectedInvoiceItems}
 onClose={() => {
 setShowDeliveryNotes(false);
 setSelectedInvoiceForDelivery(null);
 setSelectedInvoiceItems([]);
 }}
 />
 )}

 {/* Filter Portals */}
 {headerFilterOpen === 'status' && (
 <FilterPortal buttonRect={filterButtonRect}>
 <div ref={headerFilterRef} className="w-40 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
 <div className="px-1.5 text-xs text-gray-800 font-medium">Filter status</div>
 <ul className="max-h-48 overflow-auto">
 {['draft', 'sent', 'viewed', 'pending', 'paid', 'overdue', 'cancelled'].map((status) => (
 <li key={status}>
 <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
 <input
 type="checkbox"
 className="h-4 w-4"
 checked={filterStatuses.includes(status)}
 onChange={(e) => {
 e.stopPropagation();
 if (e.target.checked) {
 setFilterStatuses([...filterStatuses, status]);
 } else {
 setFilterStatuses(filterStatuses.filter(s => s !== status));
 }
 }}
 />
 <span className="capitalize">{status}</span>
 </label>
 </li>
 ))}
 </ul>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); setFilterStatuses([]); }}>Clear</button>
 <button className="filter-popup-btn filter-popup-btn-close" onClick={(e) => { e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
 </div>
 </div>
 </FilterPortal>
 )}

 {headerFilterOpen === 'customer' && (
 <FilterPortal buttonRect={filterButtonRect}>
 <div ref={headerFilterRef} className="w-52 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
 <div className="px-1.5 text-xs text-gray-800 font-medium">Filter customer</div>
 <ul className="max-h-48 overflow-auto">
 {customers.map(customer => {
 const selected = filterCustomerId === customer.id;
 return (
 <li key={customer.id}>
 <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
 <input
 type="checkbox"
 className="h-4 w-4"
 checked={selected}
 onChange={(e) => {
 e.stopPropagation();
 setFilterCustomerId(selected ? '' : customer.id);
 }}
 />
 <span>{customer.display_name}</span>
 </label>
 </li>
 );
 })}
 </ul>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); setFilterCustomerId(''); }}>Clear</button>
 <button className="filter-popup-btn filter-popup-btn-close" onClick={(e) => { e.stopPropagation(); setHeaderFilterOpen(null); }}>Close</button>
 </div>
 </div>
 </FilterPortal>
 )}

 {headerFilterOpen === 'due_date' && (
 <FilterPortal buttonRect={filterButtonRect}>
 <div ref={headerFilterRef} className="w-64 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{borderRadius: '5px'}}>
 <div className="px-1 pb-1">
 <DateRangeCalendar 
 size="sm"
 initialFrom={pendingDueDateFrom || null}
 initialTo={pendingDueDateTo || null}
 onChange={(from, to) => {
 if (from && !to) {
 setPendingDueDateFrom(from);
 setPendingDueDateTo(from);
 } else {
 setPendingDueDateFrom(from || '');
 setPendingDueDateTo(to || '');
 }
 }}
 />
 </div>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => {
 e.stopPropagation();
 setDueDateFrom('');
 setDueDateTo('');
 setPendingDueDateFrom('');
 setPendingDueDateTo('');
 setHeaderFilterOpen(null);
 }}>Clear</button>
 <button className="filter-popup-btn filter-popup-btn-filter" onClick={(e) => {
 e.stopPropagation();
 setDueDateFrom(pendingDueDateFrom || '');
 setDueDateTo(pendingDueDateTo || '');
 setHeaderFilterOpen(null);
 }}>Filter</button>
 </div>
 </div>
 </FilterPortal>
 )}

 {/* Payment Modal */}
 {showPaymentModal && selectedInvoiceForPayment && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
 <div className="px-6 py-4 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
 <button
 onClick={() => setShowPaymentModal(false)}
 className="text-gray-400 hover:text-gray-600"
 >
 ×
 </button>
 </div>
 <p className="text-sm text-gray-600 mt-1">
 Invoice: {selectedInvoiceForPayment.title}
 </p>
 </div>
 
 <form onSubmit={handleRecordPayment} className="px-6 py-4 space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Balance Due
 </label>
 <div className="text-xl font-bold text-gray-900">
 ${typeof selectedInvoiceForPayment.balance_due === 'number' 
 ? (selectedInvoiceForPayment.balance_due / 100).toFixed(2) 
 : '0.00'}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Payment Amount *
 </label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
 <input
 type="number"
 required
 min="0.01"
 step="0.01"
 max={typeof selectedInvoiceForPayment.balance_due === 'number' 
 ? (selectedInvoiceForPayment.balance_due / 100).toFixed(2) 
 : '0.00'}
 value={paymentAmount}
 onChange={(e) => setPaymentAmount(e.target.value)}
 className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder="0.00"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Payment Date *
 </label>
 <input
 type="date"
 required
 value={paymentDate}
 onChange={(e) => setPaymentDate(e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>

 <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
 <button
 type="button"
 onClick={() => setShowPaymentModal(false)}
 className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
 disabled={isRecordingPayment}
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isRecordingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
 className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isRecordingPayment ? 'Recording...' : 'Record Payment'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};

export default InvoicesPage;
