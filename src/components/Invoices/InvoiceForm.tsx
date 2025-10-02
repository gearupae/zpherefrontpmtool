import React, { useState, useEffect, useCallback } from 'react';
import {
  DocumentTextIcon,
  BanknotesIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TagIcon,
  CreditCardIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useAppDispatch } from '../../hooks/redux';
import { addNotification } from '../../store/slices/notificationSlice';
import { Customer, Item, Project } from '../../types';
import ItemSelector from '../Items/ItemSelector';

interface SelectedItem {
  item: Item;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_rate: number;
  description: string;
}

interface InvoiceFormData {
  title: string;
  description: string;
  customer_id: string;
  project_id?: string;
  invoice_type: string;
  status?: string;
  invoice_date: string;
  due_date?: string;
  payment_terms: string;
  currency: string;
  tax_rate: number;
  discount_rate: number;
  total_amount?: number;
  amount_paid?: number;
  balance_due?: number;
  payment_percentage?: number;
  items: Array<{
    item_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    item_type: string;
    tax_rate: number;
    discount_rate: number;
  }>;
  notes: string;
  terms_and_conditions: string;
  tags?: string[];
  payment_history?: Array<{
    amount: number;
    payment_date: string;
    payment_method: string;
    reference?: string;
    notes?: string;
  }>;
  sent_date?: string;
  viewed_date?: string;
  paid_date?: string;
  late_fees?: number;
  reminder_sent_count?: number;
  last_reminder_sent?: string;
}

interface InvoiceSubmissionData extends Omit<InvoiceFormData, 'due_date' | 'invoice_date'> {
  invoice_date: string;
  due_date?: string;
}

interface InvoiceFormProps {
  onSubmit: (data: InvoiceSubmissionData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<InvoiceFormData>;
  mode?: 'create' | 'edit';
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  initialData, 
  mode = 'create' 
}) => {
  const dispatch = useAppDispatch();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  
  const [formData, setFormData] = useState<InvoiceFormData>({
    title: '',
    description: '',
    customer_id: '',
    project_id: '',
    invoice_type: 'project',
    status: 'draft',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_terms: 'net_30',
    currency: 'usd',
    tax_rate: 0,
    discount_rate: 0,
    total_amount: 0,
    amount_paid: 0,
    balance_due: 0,
    payment_percentage: 0,
    items: [],
    notes: '',
    terms_and_conditions: '',
    tags: [],
    payment_history: [],
    sent_date: '',
    viewed_date: '',
    paid_date: '',
    late_fees: 0,
    reminder_sent_count: 0,
    last_reminder_sent: ''
  });

  const fetchCustomers = useCallback(async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/customers/');
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load customers',
        duration: 5000,
      }));
    }
  }, [dispatch]);

  const fetchProjects = useCallback(async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      const response = await apiClient.get('/projects/');
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchProjects();
    
    // Set default due date (30 days from now for net_30) only for new invoices
    if (mode === 'create') {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        due_date: futureDate.toISOString().split('T')[0]
      }));
    }
  }, [mode, fetchCustomers, fetchProjects]);

  // Populate form with initial data when editing
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        // Ensure arrays are properly handled
        tags: initialData.tags || [],
        payment_history: initialData.payment_history || [],
        items: initialData.items || []
      }));
    }
  }, [initialData, mode]);



  const handlePaymentTermsChange = (terms: string) => {
    setFormData(prev => ({ ...prev, payment_terms: terms }));
    
    // Update due date based on payment terms
    const invoiceDate = new Date(formData.invoice_date);
    let daysToAdd = 30; // default
    
    switch (terms) {
      case 'due_on_receipt':
        daysToAdd = 0;
        break;
      case 'net_15':
        daysToAdd = 15;
        break;
      case 'net_30':
        daysToAdd = 30;
        break;
      case 'net_60':
        daysToAdd = 60;
        break;
      case 'net_90':
        daysToAdd = 90;
        break;
    }
    
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    
    setFormData(prev => ({
      ...prev,
      due_date: dueDate.toISOString().split('T')[0]
    }));
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce((total, selectedItem) => {
      const subtotal = selectedItem.quantity * selectedItem.unit_price;
      const taxAmount = subtotal * (selectedItem.tax_rate / 100);
      const discountAmount = subtotal * (selectedItem.discount_rate / 100);
      return total + subtotal + taxAmount - discountAmount;
    }, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return Math.round((subtotal * formData.tax_rate) / 10000); // tax_rate is in basis points
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    return Math.round((subtotal * formData.discount_rate) / 10000); // discount_rate is in basis points
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const discount = calculateDiscount();
    return subtotal + tax - discount;
  };

  const formatCurrency = (cents: number) => (cents / 100).toFixed(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert selected items to invoice format
    const invoiceItems = selectedItems.map((selectedItem) => {
      const unitPriceCents = Math.round(selectedItem.unit_price * 100);
      const subtotal = selectedItem.quantity * unitPriceCents;
      const taxAmount = Math.round((subtotal * selectedItem.tax_rate) / 100);
      const discountAmount = Math.round((subtotal * selectedItem.discount_rate) / 100);
      const totalAmount = subtotal + taxAmount - discountAmount;
      
      return {
        item_id: selectedItem.item.id,
        description: selectedItem.description,
        quantity: selectedItem.quantity,
        unit_price: unitPriceCents, // Convert to cents
        amount: totalAmount, // Total amount in cents
        item_type: selectedItem.item.item_type.toString(), // Convert enum to string
        tax_rate: Math.round(selectedItem.tax_rate * 100), // Convert to basis points
        discount_rate: Math.round(selectedItem.discount_rate * 100) // Convert to basis points
      };
    });

    const submissionData: InvoiceSubmissionData = {
      ...formData,
      invoice_date: formData.invoice_date ? new Date(formData.invoice_date).toISOString() : new Date().toISOString(),
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
      items: invoiceItems
    };

    onSubmit(submissionData);
  };

  const filteredProjects = projects.filter(project => 
    !formData.customer_id || project.customer_id === formData.customer_id
  );

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <BanknotesIcon className="h-6 w-6 text-user-blue" />
            <span>{mode === 'edit' ? 'Edit Invoice' : 'Create Invoice'}</span>
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Basic Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-500" />
            <span>Invoice Details</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., Website Development - Phase 1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer *
              </label>
              <select
                required
                value={formData.customer_id}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select a customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name} {customer.company_name ? `(${customer.company_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project (Optional)
              </label>
              <select
                value={formData.project_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select a project</option>
                {filteredProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Type
              </label>
              <select
                value={formData.invoice_type}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="project">Project</option>
                <option value="recurring">Recurring</option>
                <option value="hourly">Hourly</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Date *
              </label>
              <input
                type="date"
                required
                value={formData.invoice_date}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <select
                value={formData.payment_terms}
                onChange={(e) => handlePaymentTermsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="due_on_receipt">Due on Receipt</option>
                <option value="net_15">Net 15</option>
                <option value="net_30">Net 30</option>
                <option value="net_60">Net 60</option>
                <option value="net_90">Net 90</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="usd">USD ($)</option>
                <option value="eur">EUR (€)</option>
                <option value="gbp">GBP (£)</option>
                <option value="cad">CAD ($)</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Brief description of the invoice"
            />
          </div>
        </div>

        {/* Items Selection */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
            <CurrencyDollarIcon className="h-5 w-5 text-gray-500" />
            <span>Invoice Items</span>
          </h3>
          
          <ItemSelector
            selectedItems={selectedItems}
            onItemsChange={setSelectedItems}
            className="border border-gray-200 rounded-lg p-4"
          />
        </div>

        {/* Tax and Discount */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Tax & Discount</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.tax_rate / 100}
                onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: Math.round(parseFloat(e.target.value || '0') * 100) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.discount_rate / 100}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_rate: Math.round(parseFloat(e.target.value || '0') * 100) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Invoice Summary */}
        {selectedItems.length > 0 && (
          <div className="bg-secondary-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${formatCurrency(calculateSubtotal())}</span>
              </div>
              {formData.discount_rate > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount ({(formData.discount_rate / 100).toFixed(2)}%):</span>
                  <span>-${formatCurrency(calculateDiscount())}</span>
                </div>
              )}
              {formData.tax_rate > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({(formData.tax_rate / 100).toFixed(2)}%):</span>
                  <span>${formatCurrency(calculateTax())}</span>
                </div>
              )}
              <div className="border-t border-gray-300 pt-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span className="text-user-blue">${formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status & Payment Management */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />
            <span>Status & Payment Management</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="pending">Pending</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
                <option value="void">Void</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount Paid
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount_paid ? (formData.amount_paid / 100).toFixed(2) : ''}
                onChange={(e) => {
                  const paid = parseFloat(e.target.value || '0') * 100;
                  const total = formData.total_amount || calculateTotal();
                  const balance = Math.max(0, total - paid);
                  const percentage = total > 0 ? (paid / total) * 100 : 0;
                  
                  setFormData(prev => ({ 
                    ...prev, 
                    amount_paid: paid,
                    balance_due: balance,
                    payment_percentage: percentage
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Balance Due
              </label>
              <input
                type="text"
                value={`$${((formData.balance_due || 0) / 100).toFixed(2)}`}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>
          </div>
          
          {formData.amount_paid && formData.amount_paid > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">
                    Payment Progress: {((formData.payment_percentage || 0)).toFixed(1)}%
                  </span>
                </div>
                <div className="text-green-700">
                  ${((formData.amount_paid || 0) / 100).toFixed(2)} paid of ${((formData.total_amount || calculateTotal()) / 100).toFixed(2)}
                </div>
              </div>
              <div className="mt-2 w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{width: `${Math.min(100, formData.payment_percentage || 0)}%`}}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Payment History */}
        {mode === 'edit' && formData.payment_history && formData.payment_history.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <CreditCardIcon className="h-5 w-5 text-gray-500" />
              <span>Payment History</span>
            </h3>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                {formData.payment_history.map((payment, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
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
                      <div className="mt-2 text-sm text-gray-600">
                        {payment.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add Payment Section */}
        {mode === 'edit' && formData.status && !['paid', 'cancelled', 'void'].includes(formData.status) && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <CreditCardIcon className="h-5 w-5 text-gray-500" />
              <span>Record Payment</span>
            </h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={((formData.balance_due || 0) / 100).toFixed(2)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder={`Max: $${((formData.balance_due || 0) / 100).toFixed(2)}`}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent">
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
                    Payment Date
                  </label>
                  <input
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Transaction ID, Check #, etc."
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Notes
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Optional notes about this payment..."
                />
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tags & Tracking */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
            <TagIcon className="h-5 w-5 text-gray-500" />
            <span>Tags & Tracking</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags?.join(', ') || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., urgent, monthly, recurring"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Late Fees
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.late_fees ? (formData.late_fees / 100).toFixed(2) : ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  late_fees: Math.round(parseFloat(e.target.value || '0') * 100)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>
          
          {mode === 'edit' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Sent
                </label>
                <input
                  type="date"
                  value={formData.sent_date ? new Date(formData.sent_date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, sent_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Viewed
                </label>
                <input
                  type="date"
                  value={formData.viewed_date ? new Date(formData.viewed_date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, viewed_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Paid
                </label>
                <input
                  type="date"
                  value={formData.paid_date ? new Date(formData.paid_date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, paid_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Terms and Notes */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Terms & Conditions
            </label>
            <textarea
              rows={4}
              value={formData.terms_and_conditions}
              onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Payment terms, late fees, etc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Internal Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Internal notes (not visible to client)"
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !formData.title || !formData.customer_id || selectedItems.length === 0}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading 
              ? (mode === 'edit' ? 'Updating...' : 'Creating...') 
              : (mode === 'edit' ? 'Update Invoice' : 'Create Invoice')
            }
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;
