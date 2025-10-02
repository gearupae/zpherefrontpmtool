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
  TruckIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, ClockIcon as ClockSolidIcon } from '@heroicons/react/24/solid';
import { useAppDispatch } from '../../hooks/redux';
import { addNotification } from '../../store/slices/notificationSlice';
import { apiClient } from '../../api/client';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import InvoiceForm from '../../components/Invoices/InvoiceForm';
import DeliveryNoteManagement from '../../components/Invoices/DeliveryNoteManagement';

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

const InvoiceDetailOverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'edit'>(
    searchParams.get('tab') === 'edit' ? 'edit' : 'overview'
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeliveryNotes, setShowDeliveryNotes] = useState(false);

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
        return 'bg-gray-100 text-gray-700';           // Gray for draft/neutral
      case 'sent':
        return 'bg-primary-100 text-primary-700';     // Blue for info/active
      case 'pending':
        return 'bg-warning-100 text-warning-700';     // Yellow for warning/in progress
      case 'paid':
        return 'bg-success-100 text-success-700';     // Green for completed/success
      case 'overdue':
        return 'bg-error-100 text-error-700';         // Red for urgent/error
      case 'viewed':
        return 'bg-primary-50 text-user-blue';      // Light blue for viewed
      case 'partially_paid':
        return 'bg-warning-50 text-warning-600';      // Light yellow for partial
      case 'cancelled':
        return 'bg-purple-100 text-purple-700';       // Purple for special/custom
      case 'void':
        return 'bg-gray-200 text-gray-600';           // Darker gray for void
      default:
        return 'bg-gray-100 text-gray-700';           // Gray for unknown status
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
      navigate('/invoices');
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete invoice'
      }));
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await apiClient.get(`/invoices/${id}/pdf`, {
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoice?.invoice_number || id}.pdf`);
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
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to download invoice PDF'
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

  if (error || !invoice) {
    return (
      <div className="text-center py-12">
        <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Invoice not found</h3>
        <p className="mt-1 text-sm text-gray-500">{error || 'The invoice you are looking for does not exist.'}</p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/invoices')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-500"
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
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/invoices')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                {getStatusIcon(invoice.status)}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{invoice.title}</h1>
                  <p className="text-sm text-gray-500">#{invoice.invoice_number}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                {invoice.status}
              </span>
              {invoice.is_overdue && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-100 text-error-700">
                  {invoice.days_overdue} days overdue
                </span>
              )}
              {/* Converted from proposal badge */}
              {(() => {
                const cf: any = (invoice as any).custom_fields || {};
                if (cf.source === 'proposal' && cf.source_proposal_id) {
                  return (
                    <button
                      onClick={() => navigate(`/proposals/${cf.source_proposal_id}`)}
                      className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200"
                      title="View source proposal"
                    >
                      From Proposal
                    </button>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleDownloadPDF}
                className="inline-flex items-center px-3 py-2 border border-secondary-300 shadow-sm text-sm leading-4 font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Download PDF
              </button>
              <button 
                onClick={() => setShowDeliveryNotes(true)}
                className="inline-flex items-center px-3 py-2 border border-secondary-300 shadow-sm text-sm leading-4 font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50"
              >
                <TruckIcon className="h-4 w-4 mr-2" />
                Delivery Notes
              </button>
              <button 
                onClick={() => setActiveTab('edit')}
                className="inline-flex items-center px-3 py-2 border border-secondary-300 shadow-sm text-sm leading-4 font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>

          {/* Payment Progress */}
          {invoice.payment_percentage > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Payment Progress</span>
                <span>{invoice.payment_percentage}%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${invoice.payment_percentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
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
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Invoice Details</h3>
              
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Edit Invoice</h3>
            <InvoiceForm
              onSubmit={handleUpdateInvoice}
              onCancel={() => setActiveTab('overview')}
              isLoading={isUpdating}
              initialData={prepareInitialData()}
              mode="edit"
            />
          </div>
        </div>
      )}
      
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
