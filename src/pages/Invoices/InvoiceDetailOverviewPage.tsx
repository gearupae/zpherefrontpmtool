import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
 ArrowLeftIcon, 
 PencilIcon, 
 TrashIcon,
 BanknotesIcon,
 CalendarIcon,
 UserIcon,
 BuildingOfficeIcon,
 ClockIcon,
 ExclamationTriangleIcon,
 DocumentArrowDownIcon,
 DocumentTextIcon,
 TruckIcon,
 EyeIcon,
 ChartBarIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, ClockIcon as ClockSolidIcon } from '@heroicons/react/24/solid';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { addNotification } from '../../store/slices/notificationSlice';
import { apiClient } from '../../api/client';
import InvoiceForm from '../../components/Invoices/InvoiceForm';
import DeliveryNoteManagement from '../../components/Invoices/DeliveryNoteManagement';
import ViewModeButton from '../../components/UI/ViewModeButton';
import { getTenantRoute } from '../../utils/tenantUtils';

interface InvoiceItem {
 item_id: string;
 item?: {
 name: string;
 description?: string;
 };
 quantity: number;
 unit_price: number;
 tax_rate: number;
 discount_rate: number;
 amount: number;
 item_type: string;
 description: string;
}

interface Invoice {
 id: string;
 title: string;
 description?: string;
 invoice_number: string;
 status: string;
 invoice_type: string;
 subtotal: number;
 tax_amount: number;
 discount_amount: number;
 total_amount: number;
 amount_paid: number;
 balance_due: number;
 currency: string;
 payment_terms: string;
 invoice_date: string;
 due_date: string;
 sent_date?: string;
 viewed_date?: string;
 paid_date?: string;
 notes?: string;
 terms_and_conditions?: string;
 items: InvoiceItem[];
 tax_rate?: number;
 discount_rate?: number;
 tags?: string[];
 payment_history?: Array<{
 amount: number;
 payment_date: string;
 payment_method: string;
 reference?: string;
 notes?: string;
 }>;
 late_fees?: number;
 reminder_sent_count?: number;
 last_reminder_sent?: string;
 customer?: {
 id: string;
 display_name: string;
 company_name?: string;
 email: string;
 };
 project?: {
 id: string;
 name: string;
 };
 is_overdue: boolean;
 days_overdue: number;
 payment_percentage: number;
 created_at: string;
 updated_at: string;
}

interface InvoiceOverviewMetrics {
 invoices_total: number;
 invoices_sent: number;
 invoices_pending: number;
 invoices_overdue: number;
 invoices_paid: number;
 invoices_unpaid: number;
 invoices_outstanding_amount: number;
 projects_total: number;
 projects_active: number;
}

const InvoiceDetailOverviewPage: React.FC = () => {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const dispatch = useAppDispatch();
 const user = useAppSelector((state) => state.auth.user);
 const [searchParams] = useSearchParams();
 
 const [invoice, setInvoice] = useState<Invoice | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'edit'>(
 searchParams.get('tab') === 'edit' ? 'edit' : 
 searchParams.get('tab') === 'payments' ? 'payments' : 
 'overview'
 );
 const [isUpdating, setIsUpdating] = useState(false);
 const [showDeliveryNotes, setShowDeliveryNotes] = useState(false);
 const [overviewMetrics, setOverviewMetrics] = useState<InvoiceOverviewMetrics | null>(null);
 const [overviewCustomer, setOverviewCustomer] = useState<{ id: string; display_name: string; email?: string; company_name?: string } | null>(null);
 const [paymentAmount, setPaymentAmount] = useState('');
 const [paymentMethod, setPaymentMethod] = useState('cash');
 const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
 const [paymentReference, setPaymentReference] = useState('');
 const [paymentNotes, setPaymentNotes] = useState('');
 const [isRecordingPayment, setIsRecordingPayment] = useState(false);
 const [isDownloadingPDF, setIsDownloadingPDF] = useState<boolean>(false);

 const fetchInvoice = useCallback(async () => {
 try {
 setLoading(true);
 setError(null);
 const response = await apiClient.get(`/invoices/${id}`);
 setInvoice(response.data);
 } catch (error: any) {
 console.error('Error fetching invoice:', error);
 setError('Failed to load invoice details');
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: 'Failed to load invoice details'
 }));
 } finally {
 setLoading(false);
 }
 }, [id, dispatch]);

 useEffect(() => {
 fetchInvoice();
 }, [fetchInvoice]);

 useEffect(() => {
 const loadOverview = async () => {
 if (!id) return;
 try {
 const res = await apiClient.get(`/invoices/${id}/overview`);
 const data = res.data || {};
 if (data.metrics) setOverviewMetrics(data.metrics);
 if (data.customer) setOverviewCustomer(data.customer);
 } catch (e) {
 // non-blocking overview
 }
 };
 loadOverview();
 }, [id]);

 const handleRecordPayment = async () => {
 if (!invoice || !paymentAmount || parseFloat(paymentAmount) <= 0) return;

 setIsRecordingPayment(true);
 try {
 const amountInCents = Math.round(parseFloat(paymentAmount) * 100);
 
 const paymentData = {
 amount: amountInCents,
 payment_date: new Date(paymentDate).toISOString(),
 payment_method: paymentMethod,
 reference: paymentReference || undefined,
 notes: paymentNotes || undefined
 };

 await apiClient.post(`/invoices/${id}/payments`, paymentData);
 
 // Refresh invoice data
 await fetchInvoice();
 
 // Clear form
 setPaymentAmount('');
 setPaymentMethod('cash');
 setPaymentDate(new Date().toISOString().split('T')[0]);
 setPaymentReference('');
 setPaymentNotes('');
 
 dispatch(addNotification({
 type: 'success',
 title: 'Success',
 message: 'Payment recorded successfully'
 }));
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

 const handleUpdateInvoice = async (formData: any) => {
 try {
 setIsUpdating(true);
 
 // Transform formData to match backend schema
 const updateData = {
 title: formData.title,
 description: formData.description,
 invoice_type: formData.invoice_type,
 status: formData.status,
 invoice_date: formData.invoice_date ? new Date(formData.invoice_date).toISOString() : undefined,
 due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
 payment_terms: formData.payment_terms,
 currency: formData.currency,
 items: formData.items,
 notes: formData.notes,
 terms_and_conditions: formData.terms_and_conditions,
 tags: formData.tags,
 amount_paid: formData.amount_paid,
 late_fees: formData.late_fees,
 sent_date: formData.sent_date ? new Date(formData.sent_date).toISOString() : undefined,
 viewed_date: formData.viewed_date ? new Date(formData.viewed_date).toISOString() : undefined,
 paid_date: formData.paid_date ? new Date(formData.paid_date).toISOString() : undefined
 };

 const response = await apiClient.put(`/invoices/${id}`, updateData);
 setInvoice(response.data);
 setActiveTab('overview');
 dispatch(addNotification({
 type: 'success',
 title: 'Success',
 message: 'Invoice updated successfully'
 }));
 } catch (error: any) {
 console.error('Error updating invoice:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: 'Failed to update invoice'
 }));
 } finally {
 setIsUpdating(false);
 }
 };

 const prepareInitialData = () => {
 if (!invoice) return undefined;
 
 return {
 title: invoice.title,
 description: invoice.description || '',
 customer_id: invoice.customer?.id || '',
 project_id: invoice.project?.id || '',
 invoice_type: invoice.invoice_type,
 status: invoice.status,
 invoice_date: invoice.invoice_date ? new Date(invoice.invoice_date).toISOString().split('T')[0] : '',
 due_date: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : '',
 payment_terms: invoice.payment_terms,
 currency: invoice.currency,
 tax_rate: invoice.tax_rate || 0,
 discount_rate: invoice.discount_rate || 0,
 total_amount: invoice.total_amount,
 amount_paid: invoice.amount_paid,
 balance_due: invoice.balance_due,
 payment_percentage: invoice.payment_percentage,
 items: invoice.items || [],
 notes: invoice.notes || '',
 terms_and_conditions: invoice.terms_and_conditions || '',
 tags: invoice.tags || [],
 payment_history: invoice.payment_history || [],
 sent_date: invoice.sent_date ? new Date(invoice.sent_date).toISOString().split('T')[0] : '',
 viewed_date: invoice.viewed_date ? new Date(invoice.viewed_date).toISOString().split('T')[0] : '',
 paid_date: invoice.paid_date ? new Date(invoice.paid_date).toISOString().split('T')[0] : '',
 late_fees: invoice.late_fees || 0,
 reminder_sent_count: invoice.reminder_sent_count || 0,
 last_reminder_sent: invoice.last_reminder_sent ? new Date(invoice.last_reminder_sent).toISOString().split('T')[0] : ''
 };
 };

 const getStatusColor = (status: string) => {
 switch (status.toLowerCase()) {
 case 'draft':
 return 'bg-gray-100 text-gray-700'; // Gray for draft/neutral
 case 'sent':
 return 'bg-primary-100 text-primary-700'; // Blue for info/active
 case 'pending':
 return 'bg-warning-100 text-warning-700'; // Yellow for warning/in progress
 case 'paid':
 return 'bg-success-100 text-success-700'; // Green for completed/success
 case 'overdue':
 return 'bg-error-100 text-error-700'; // Red for urgent/error
 case 'viewed':
 return 'bg-primary-50 text-user-blue'; // Light blue for viewed
 case 'partially_paid':
 return 'bg-warning-50 text-warning-600'; // Light yellow for partial
 case 'cancelled':
 return 'bg-purple-100 text-purple-700'; // Purple for special/custom
 case 'void':
 return 'bg-gray-200 text-gray-600'; // Darker gray for void
 default:
 return 'bg-gray-100 text-gray-700'; // Gray for unknown status
 }
 };

 const getStatusIcon = (status: string) => {
 switch (status.toLowerCase()) {
 case 'paid':
 return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
 case 'overdue':
 return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
 case 'cancelled':
 return <XCircleIcon className="h-5 w-5 text-gray-500" />;
 case 'pending':
 return <ClockSolidIcon className="h-5 w-5 text-yellow-500" />;
 default:
 return <BanknotesIcon className="h-5 w-5 text-gray-500" />;
 }
 };

 const handleDelete = async () => {
 if (!invoice || !window.confirm('Are you sure you want to delete this invoice?')) {
 return;
 }

 try {
 await apiClient.delete(`/invoices/${invoice.id}`);
 dispatch(addNotification({
 type: 'success',
 title: 'Success',
 message: 'Invoice deleted successfully'
 }));
 navigate(getTenantRoute('/invoices', user?.role, (user as any)?.organization));
 } catch (error) {
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: 'Failed to delete invoice'
 }));
 }
 };

const handleViewPDF = async () => {
 try {
 const token = localStorage.getItem('access_token');
 const response = await apiClient.get<Blob>(`/invoices/${id}/pdf/view`, {
 responseType: 'blob',
 headers: {
 ...(token ? { Authorization: `Bearer ${token}` } : {}),
 Accept: 'application/pdf',
 },
 });
 const blob = response.data as Blob;
 const url = window.URL.createObjectURL(blob);
 window.open(url, '_blank');
 // Revoke after some delay to allow browser to load
 setTimeout(() => window.URL.revokeObjectURL(url), 30000);
 } catch (error) {
 console.error('Error opening PDF view:', error);
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message: 'Failed to open invoice PDF view',
 }));
 }
};

const handleDownloadPDF = async (): Promise<void> => {
 setIsDownloadingPDF(true);
 try {
 // Ensure we include auth header and avoid redirect that drops headers by using trailing slash
 const token = localStorage.getItem('access_token');
 const response = await apiClient.get<Blob>(`/invoices/${id}/pdf/`, {
 responseType: 'blob',
 headers: {
 ...(token ? { Authorization: `Bearer ${token}` } : {}),
 Accept: 'application/pdf',
 },
 });
 
 // If server accidentally returned JSON (e.g., error), try to detect
 const contentType = (response.headers as any)?.['content-type'] || '';
 if (typeof contentType === 'string' && contentType.includes('application/json')) {
 const text = await (response.data as any).text?.();
 let message = 'Failed to download invoice PDF';
 try {
 const json = text ? JSON.parse(text) : null;
 if (json?.detail) message = typeof json.detail === 'string' ? json.detail : message;
 } catch {}
 throw new Error(message);
 }
 
 // Derive filename from Content-Disposition when available
 const disposition = (response.headers as any)?.['content-disposition'] as string | undefined;
 let filename = `invoice_${invoice?.invoice_number || id}.pdf`;
 if (disposition) {
 const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
 const rawName = decodeURIComponent(match?.[1] || match?.[2] || '').trim();
 if (rawName) filename = rawName;
 }
 
 // Create blob link to download
 const blob = response.data as Blob;
 const url = window.URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.setAttribute('download', filename);
 document.body.appendChild(link);
 link.click();
 link.remove();
 window.URL.revokeObjectURL(url);
 
 dispatch(addNotification({
 type: 'success',
 title: 'Success',
 message: 'Invoice PDF downloaded successfully'
 }));
 } catch (error: any) {
 console.error('Error downloading PDF:', error);
 let message = 'Failed to download invoice PDF';
 try {
 const maybeBlob: any = error?.response?.data;
 if (maybeBlob instanceof Blob) {
 const text = await maybeBlob.text();
 try {
 const json = JSON.parse(text);
 if (typeof json?.detail === 'string') message = json.detail;
 } catch {
 if (text) message = text;
 }
 } else if (typeof error?.response?.data?.detail === 'string') {
 message = error.response.data.detail;
 } else if (typeof error?.message === 'string') {
 message = error.message;
 }
 } catch {}
 dispatch(addNotification({
 type: 'error',
 title: 'Error',
 message,
 }));
 } finally {
 setIsDownloadingPDF(false);
 }
};

 if (loading) {
 return <div />;
 }

 if (error || !invoice) {
 return (
 <div className="text-center2">
 <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
 <h3 className="mt-2 text-sm font-medium text-gray-900">Invoice not found</h3>
 <p className="mt-1 text-sm text-gray-500">{error || 'The invoice you are looking for does not exist.'}</p>
 <div className="mt-6">
 <button
 onClick={() => navigate(getTenantRoute('/invoices', user?.role, (user as any)?.organization))}
 className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
 >
 <ArrowLeftIcon className="h-4 w-4 mr-2" />
 Back to Invoices
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
 onClick={() => navigate(getTenantRoute('/invoices', user?.role, (user as any)?.organization))}
 className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <ArrowLeftIcon className="h-5 w-5" />
 </button>
 <div>
 <h1 className="text-3xl font-bold text-gray-900">{invoice.title}</h1>
 <p className="text-gray-600">
 #{invoice.invoice_number} • {invoice.status} • Created {new Date(invoice.created_at).toLocaleDateString()}
 </p>
 {invoice.tags && invoice.tags.length > 0 && (
 <p className="text-sm text-gray-600 mt-1">
 Tags: {invoice.tags.join(', ')}
 </p>
 )}
 {invoice.is_overdue && (
 <div className="flex items-center space-x-2 mt-2">
 <div className="h-2 w-2 rounded-full bg-red-500"></div>
 <span className="text-sm text-red-600">
 Overdue by {invoice.days_overdue} days
 </span>
 </div>
 )}
 </div>
 </div>
 <div className="flex space-x-3">
 <button
 onClick={handleViewPDF}
 className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
 >
 <EyeIcon className="h-4 w-4" />
 View PDF
 </button>
 
<button
 onClick={handleDownloadPDF}
 disabled={isDownloadingPDF}
 className={`flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 ${isDownloadingPDF ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'}`}
>
 <DocumentArrowDownIcon className="h-4 w-4" />
 {isDownloadingPDF ? 'Downloading…' : 'Download PDF'}
</button>
 
 <button
 onClick={() => setShowDeliveryNotes(true)}
 className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
 >
 <TruckIcon className="h-4 w-4" />
 Delivery Notes
 </button>
 
 <button
 onClick={() => setActiveTab('edit')}
 className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
 >
 <PencilIcon className="h-4 w-4" />
 Edit
 </button>
 
 <button
 onClick={handleDelete}
 className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
 >
 <TrashIcon className="h-4 w-4" />
 Delete
 </button>
 </div>
 </div>

 {/* Navigation Tabs */}
 <div className="border-b border-gray-200">
 <nav className="flex space-x-8">
 <button
 onClick={() => setActiveTab('overview')}
 className={`py-2 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
 activeTab === 'overview' ? 'text-indigo-600' : 'text-black hover:text-gray-700'
 }`}
 >
 Overview
 </button>
 <button
 onClick={() => setActiveTab('payments')}
 className={`py-2 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
 activeTab === 'payments' ? 'text-indigo-600' : 'text-black hover:text-gray-700'
 }`}
 >
 Payments
 </button>
 <button
 onClick={() => setActiveTab('edit')}
 className={`py-2 font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-0 ${
 activeTab === 'edit' ? 'text-indigo-600' : 'text-black hover:text-gray-700'
 }`}
 >
 Edit
 </button>
 </nav>
 </div>

 {/* Split Layout */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Main Content */}
 <div className="lg:col-span-2 space-y-8">
 {/* Tab Content */}
 {activeTab === 'overview' && invoice && (
 <div className="space-y-6">
 {/* Key Metrics */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <div className="bg-white overflow-hidden shadow rounded-lg">
 <div className="p-5">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <DocumentTextIcon className="h-6 w-6 text-blue-400" />
 </div>
 <div className="ml-5 w-0 flex-1">
 <dl>
 <dt className="text-sm font-medium text-gray-500 truncate">Invoice #</dt>
 <dd className="text-lg font-medium text-gray-900">{invoice.invoice_number}</dd>
 </dl>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-white overflow-hidden shadow rounded-lg">
 <div className="p-5">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <UserIcon className="h-6 w-6 text-green-400" />
 </div>
 <div className="ml-5 w-0 flex-1">
 <dl>
 <dt className="text-sm font-medium text-gray-500 truncate">Client</dt>
 <dd className="text-lg font-medium text-gray-900 truncate">{invoice.customer?.display_name || 'N/A'}</dd>
 </dl>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-white overflow-hidden shadow rounded-lg">
 <div className="p-5">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <CalendarIcon className="h-6 w-6 text-orange-400" />
 </div>
 <div className="ml-5 w-0 flex-1">
 <dl>
 <dt className="text-sm font-medium text-gray-500 truncate">Due Date</dt>
 <dd className="text-lg font-medium text-gray-900">{new Date(invoice.due_date).toLocaleDateString()}</dd>
 </dl>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-white overflow-hidden shadow rounded-lg">
 <div className="p-5">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <BanknotesIcon className="h-6 w-6 text-purple-400" />
 </div>
 <div className="ml-5 w-0 flex-1">
 <dl>
 <dt className="text-sm font-medium text-gray-500 truncate">Total Amount</dt>
 <dd className="text-lg font-medium text-gray-900">${(invoice.total_amount / 100).toFixed(2)}</dd>
 </dl>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Invoice Details */}
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
 
 {invoice.description && (
 <div className="mb-6">
 <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
 <p className="text-sm text-gray-600">{invoice.description}</p>
 </div>
 )}

 {/* Items */}
 {invoice.items && invoice.items.length > 0 && (
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
 {invoice.items.map((item, index) => (
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
 ${(item.amount / 100).toFixed(2)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 
 {/* Totals */}
 <div className="mt-4 border-t border-gray-200 pt-4">
 <div className="space-y-2">
 <div className="flex justify-between text-sm">
 <span className="text-gray-600">Subtotal</span>
 <span className="text-gray-900">${(invoice.subtotal / 100).toFixed(2)}</span>
 </div>
 {invoice.discount_amount > 0 && (
 <div className="flex justify-between text-sm">
 <span className="text-gray-600">Discount</span>
 <span className="text-gray-900">-${(invoice.discount_amount / 100).toFixed(2)}</span>
 </div>
 )}
 <div className="flex justify-between text-sm">
 <span className="text-gray-600">Tax</span>
 <span className="text-gray-900">${(invoice.tax_amount / 100).toFixed(2)}</span>
 </div>
 <div className="flex justify-between text-base font-medium border-t border-gray-200 pt-2">
 <span className="text-gray-900">Total</span>
 <span className="text-gray-900">${(invoice.total_amount / 100).toFixed(2)}</span>
 </div>
 {invoice.amount_paid > 0 && (
 <div className="flex justify-between text-sm">
 <span className="text-gray-600">Amount Paid</span>
 <span className="text-green-600">${(invoice.amount_paid / 100).toFixed(2)}</span>
 </div>
 )}
 {invoice.balance_due > 0 && (
 <div className="flex justify-between text-base font-medium">
 <span className="text-gray-900">Balance Due</span>
 <span className={`${invoice.is_overdue ? 'text-red-600' : 'text-gray-900'}`}>
 ${(invoice.balance_due / 100).toFixed(2)}
 </span>
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {invoice.notes && (
 <div className="mt-6">
 <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
 <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Payments Tab */}
 {activeTab === 'payments' && invoice && (
 <div className="space-y-6">
 {/* Payment Status Overview */}
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Status</h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Total Amount
 </label>
 <div className="text-2xl font-bold text-gray-900">
 ${(invoice.total_amount / 100).toFixed(2)}
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Amount Paid
 </label>
 <div className="text-2xl font-bold text-green-600">
 ${(invoice.amount_paid / 100).toFixed(2)}
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Balance Due
 </label>
 <div className={`text-2xl font-bold ${invoice.is_overdue ? 'text-red-600' : 'text-gray-900'}`}>
 ${(invoice.balance_due / 100).toFixed(2)}
 </div>
 </div>
 </div>
 
 {invoice.payment_percentage > 0 && (
 <div className="mt-6">
 <div className="flex justify-between text-sm text-gray-600 mb-2">
 <span>Payment Progress</span>
 <span>{invoice.payment_percentage.toFixed(1)}%</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-3">
 <div 
 className="bg-green-600 h-3 rounded-full transition-all duration-300" 
 style={{width: `${Math.min(100, invoice.payment_percentage)}%`}}
 ></div>
 </div>
 </div>
 )}
 </div>

 {/* Record New Payment */}
 {invoice.status && !['paid', 'cancelled', 'void'].includes(invoice.status) && invoice.balance_due > 0 && (
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Record Payment</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Payment Amount *
 </label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
 <input
 type="number"
 min="0.01"
 step="0.01"
 max={(invoice.balance_due / 100).toFixed(2)}
 value={paymentAmount}
 onChange={(e) => setPaymentAmount(e.target.value)}
 className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 placeholder={`Max: $${(invoice.balance_due / 100).toFixed(2)}`}
 />
 </div>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Payment Method *
 </label>
 <select 
 value={paymentMethod}
 onChange={(e) => setPaymentMethod(e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 >
 <option value="cash">Cash</option>
 <option value="check">Check</option>
 <option value="credit_card">Credit Card</option>
 <option value="bank_transfer">Bank Transfer</option>
 <option value="paypal">PayPal</option>
 <option value="stripe">Stripe</option>
 <option value="other">Other</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Payment Date *
 </label>
 <input
 type="date"
 value={paymentDate}
 onChange={(e) => setPaymentDate(e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Reference Number
 </label>
 <input
 type="text"
 value={paymentReference}
 onChange={(e) => setPaymentReference(e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 placeholder="Transaction ID, Check #, etc."
 />
 </div>
 </div>
 
 <div className="mt-6">
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Payment Notes
 </label>
 <textarea
 rows={3}
 value={paymentNotes}
 onChange={(e) => setPaymentNotes(e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 placeholder="Optional notes about this payment..."
 />
 </div>
 
 <div className="mt-6 flex justify-end space-x-3 pt-6 border-t border-gray-200">
 <button
 type="button"
 onClick={() => {
 setPaymentAmount('');
 setPaymentMethod('cash');
 setPaymentDate(new Date().toISOString().split('T')[0]);
 setPaymentReference('');
 setPaymentNotes('');
 }}
 className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-50 transition-colors"
 disabled={isRecordingPayment}
 >
 Clear
 </button>
 <button
 type="button"
 onClick={handleRecordPayment}
 disabled={isRecordingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
 className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isRecordingPayment ? 'Recording...' : 'Record Payment'}
 </button>
 </div>
 </div>
 )}

 {/* Payment History */}
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
 {invoice.payment_history && invoice.payment_history.length > 0 ? (
 <div className="space-y-3">
 {invoice.payment_history.map((payment, index) => (
 <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-3">
 <div className="w-3 h-3 bg-green-500 rounded-full"></div>
 <div>
 <div className="font-medium text-gray-900">
 ${(payment.amount / 100).toFixed(2)}
 </div>
 <div className="text-sm text-gray-500">
 {payment.payment_method} • {new Date(payment.payment_date).toLocaleDateString()}
 </div>
 </div>
 </div>
 {payment.reference && (
 <div className="text-sm text-gray-600">
 Ref: {payment.reference}
 </div>
 )}
 </div>
 {payment.notes && (
 <div className="mt-2 text-sm text-gray-600 ml-6">
 {payment.notes}
 </div>
 )}
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-8 text-gray-500">
 <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
 <p>No payment history yet</p>
 </div>
 )}
 </div>

 {/* Tracking Information */}
 <div className="bg-white shadow rounded-lg detail-card">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Tracking Information</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Tags
 </label>
 <div className="flex flex-wrap gap-2">
 {invoice.tags && invoice.tags.length > 0 ? (
 invoice.tags.map((tag, index) => (
 <span key={index} className="inline-flex items-center rounded-full text-sm bg-gray-100 text-gray-700">
 {tag}
 </span>
 ))
 ) : (
 <span className="text-sm text-gray-500">No tags</span>
 )}
 </div>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Late Fees
 </label>
 <div className="text-lg font-medium text-gray-900">
 ${invoice.late_fees ? (invoice.late_fees / 100).toFixed(2) : '0.00'}
 </div>
 </div>
 </div>
 
 <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
 {invoice.sent_date && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Date Sent
 </label>
 <div className="text-sm text-gray-900">
 {new Date(invoice.sent_date).toLocaleDateString()}
 </div>
 </div>
 )}
 
 {invoice.viewed_date && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Date Viewed
 </label>
 <div className="text-sm text-gray-900">
 {new Date(invoice.viewed_date).toLocaleDateString()}
 </div>
 </div>
 )}
 
 {invoice.paid_date && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Date Paid
 </label>
 <div className="text-sm text-gray-900">
 {new Date(invoice.paid_date).toLocaleDateString()}
 </div>
 </div>
 )}
 </div>
 
 {invoice.reminder_sent_count && invoice.reminder_sent_count > 0 && (
 <div className="mt-6 pt-6 border-t border-gray-200">
 <div className="text-sm text-gray-600">
 <span className="font-medium">Reminders Sent:</span> {invoice.reminder_sent_count}
 {invoice.last_reminder_sent && (
 <span> • Last sent: {new Date(invoice.last_reminder_sent).toLocaleDateString()}</span>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Edit Tab */}
 {activeTab === 'edit' && invoice && (
 <InvoiceForm
 onSubmit={handleUpdateInvoice}
 onCancel={() => setActiveTab('overview')}
 isLoading={isUpdating}
 initialData={prepareInitialData()}
 mode="edit"
 />
 )}
 </div>

 {/* Sidebar */}
 <div className="space-y-8">
 {/* Customer Overview */}
 {overviewCustomer && (
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:p-6">
 <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Customer</h3>
 <div className="flex items-center space-x-3 mb-2">
 <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
 <UserIcon className="h-5 w-5 text-user-blue" />
 </div>
 <div>
 <p className="text-sm font-medium text-gray-900">{overviewCustomer.display_name}</p>
 {overviewCustomer.email && <p className="text-xs text-gray-500">{overviewCustomer.email}</p>}
 </div>
 </div>
 {overviewCustomer.company_name && (
 <div className="flex items-center space-x-2 text-sm text-gray-600">
 <BuildingOfficeIcon className="h-4 w-4" />
 <span>{overviewCustomer.company_name}</span>
 </div>
 )}
 {overviewMetrics && (
 <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
 <div className="p-2 bg-gray-50 rounded">
 <div className="text-gray-600">Projects</div>
 <div className="text-gray-900 font-semibold">{overviewMetrics.projects_total} total • {overviewMetrics.projects_active} active</div>
 </div>
 <div className="p-2 bg-gray-50 rounded">
 <div className="text-gray-600">Unpaid Invoices</div>
 <div className="text-gray-900 font-semibold">{overviewMetrics.invoices_unpaid}</div>
 </div>
 <div className="p-2 bg-gray-50 rounded">
 <div className="text-gray-600">Outstanding</div>
 <div className="text-gray-900 font-semibold">${(overviewMetrics.invoices_outstanding_amount/100).toFixed(2)}</div>
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Summary */}
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:p-6">
 <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Summary</h3>
 <dl className="space-y-3">
 <div className="flex justify-between">
 <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
 <dd className="text-lg font-bold text-gray-900">
 ${(invoice.total_amount / 100).toFixed(2)} {invoice.currency?.toUpperCase()}
 </dd>
 </div>
 <div className="flex justify-between">
 <dt className="text-sm font-medium text-gray-500">Amount Paid</dt>
 <dd className="text-sm font-medium text-green-600">
 ${(invoice.amount_paid / 100).toFixed(2)}
 </dd>
 </div>
 <div className="flex justify-between">
 <dt className="text-sm font-medium text-gray-500">Balance Due</dt>
 <dd className={`text-sm font-medium ${invoice.is_overdue ? 'text-red-600' : 'text-gray-900'}`}>
 ${(invoice.balance_due / 100).toFixed(2)}
 </dd>
 </div>
 <div className="flex justify-between">
 <dt className="text-sm font-medium text-gray-500">Type</dt>
 <dd className="text-sm text-gray-900 capitalize">{invoice.invoice_type}</dd>
 </div>
 <div className="flex justify-between">
 <dt className="text-sm font-medium text-gray-500">Payment Terms</dt>
 <dd className="text-sm text-gray-900">{invoice.payment_terms}</dd>
 </div>
 </dl>
 </div>
 </div>

 {/* Customer & Project Info */}
 {(invoice.customer || invoice.project) && (
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:p-6">
 <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Customer & Project</h3>
 
 {invoice.customer && (
 <div className="mb-4">
 <div className="flex items-center space-x-3 mb-2">
 <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
 <UserIcon className="h-5 w-5 text-user-blue" />
 </div>
 <div>
 <p className="text-sm font-medium text-gray-900">{invoice.customer.display_name}</p>
 <p className="text-xs text-gray-500">{invoice.customer.email}</p>
 </div>
 </div>
 {invoice.customer.company_name && (
 <div className="flex items-center space-x-2 text-sm text-gray-600">
 <BuildingOfficeIcon className="h-4 w-4" />
 <span>{invoice.customer.company_name}</span>
 </div>
 )}
 </div>
 )}

 {invoice.project && (
 <div className="pt-4 border-t border-gray-200">
 <p className="text-sm font-medium text-gray-700">Project</p>
 <p className="text-sm text-gray-900">{invoice.project.name}</p>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Important Dates */}
 <div className="bg-white shadow rounded-lg">
 <div className="px-4 py-5 sm:p-6">
 <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Important Dates</h3>
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-2">
 <CalendarIcon className="h-4 w-4 text-gray-400" />
 <span className="text-sm text-gray-600">Invoice Date</span>
 </div>
 <span className="text-sm text-gray-900">
 {new Date(invoice.invoice_date).toLocaleDateString()}
 </span>
 </div>
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-2">
 <CalendarIcon className="h-4 w-4 text-gray-400" />
 <span className="text-sm text-gray-600">Due Date</span>
 </div>
 <span className={`text-sm ${invoice.is_overdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
 {new Date(invoice.due_date).toLocaleDateString()}
 </span>
 </div>
 {invoice.sent_date && (
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-2">
 <ClockIcon className="h-4 w-4 text-blue-400" />
 <span className="text-sm text-gray-600">Sent Date</span>
 </div>
 <span className="text-sm text-gray-900">
 {new Date(invoice.sent_date).toLocaleDateString()}
 </span>
 </div>
 )}
 {invoice.paid_date && (
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-2">
 <CheckCircleIcon className="h-4 w-4 text-green-400" />
 <span className="text-sm text-gray-600">Paid Date</span>
 </div>
 <span className="text-sm text-gray-900">
 {new Date(invoice.paid_date).toLocaleDateString()}
 </span>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 
 {/* Delivery Note Management Modal */}
 {showDeliveryNotes && invoice && (
 <DeliveryNoteManagement
 invoiceId={invoice.id}
 invoiceNumber={invoice.invoice_number}
 invoiceItems={invoice.items || []}
 onClose={() => setShowDeliveryNotes(false)}
 />
 )}
 </div>
 );
};

export default InvoiceDetailOverviewPage;
