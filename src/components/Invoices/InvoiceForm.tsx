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
      const payload: any = response.data;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload?.projects)
                ? payload.projects
                : [];
      setProjects(list);
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

 // Per-line computations in dollars (UI values)
 const calcLineNet = (si: SelectedItem) => {
 const subtotal = (Number(si.quantity) || 0) * (Number(si.unit_price) || 0);
 const discount = subtotal * ((Number(si.discount_rate) || 0) / 100);
 return subtotal - discount; // excl. VAT
 };
 const calcLineVat = (si: SelectedItem) => {
 const net = calcLineNet(si);
 return net * ((Number(si.tax_rate) || 0) / 100);
 };
 const calculateTotals = () => {
 const net = selectedItems.reduce((acc, si) => acc + calcLineNet(si), 0);
 const vat = selectedItems.reduce((acc, si) => acc + calcLineVat(si), 0);
 const gross = net + vat;
 return { net, vat, gross };
 };

 const formatCurrency = (amount: number) => amount.toFixed(2);

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
 <div className="bg-white rounded-lg shadow-lg">
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

 <form onSubmit={handleSubmit} className="px-6 py-6 space-y-8">
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
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
 onChange={(e) => {
 const val = e.target.value;
 const c = customers.find(cu => cu.id === val) as any;
 // Compute smart defaults from customer
 const termsRaw = (c?.payment_terms || 'NET 30') as string;
 const terms = termsRaw.toLowerCase().includes('net') ? termsRaw.toLowerCase().replace(/\s+/g,'_') : (termsRaw.toLowerCase().includes('receipt') ? 'due_on_receipt' : 'net_30');
 const days = terms === 'due_on_receipt' ? 0 : (parseInt((terms.match(/net_(\d+)/)||[])[1]||'30',10));
 const invDate = new Date(formData.invoice_date || new Date());
 const due = new Date(invDate); due.setDate(due.getDate() + days);
 setFormData(prev => ({ 
 ...prev, 
 customer_id: val,
 currency: (c?.currency || c?.default_currency || prev.currency || 'usd').toLowerCase(),
 payment_terms: terms,
 due_date: due.toISOString().split('T')[0],
 tax_rate: typeof c?.tax_rate === 'number' ? c.tax_rate : prev.tax_rate,
 }));
 }}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Payment Terms
 </label>
 <select
 value={formData.payment_terms}
 onChange={(e) => handlePaymentTermsChange(e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Currency
 </label>
 <select
 value={formData.currency}
 onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 placeholder="0.00"
 />
 </div>
 </div>
 </div>

 {/* Invoice Summary */}
 {selectedItems.length > 0 && (() => {
 const { net, vat, gross } = calculateTotals();
 return (
 <div className="bg-secondary-50 rounded-lg p-6">
 <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Summary</h3>
 <div className="space-y-2">
 <div className="flex justify-between">
 <span>Total (excl. VAT):</span>
 <span>${formatCurrency(net)}</span>
 </div>
 {vat > 0 && (
 <div className="flex justify-between">
 <span>VAT:</span>
 <span>${formatCurrency(vat)}</span>
 </div>
 )}
 <div className="border-t border-gray-300 pt-2">
 <div className="flex justify-between text-lg font-semibold">
 <span>Subtotal (incl. VAT):</span>
 <span className="text-user-blue">${formatCurrency(gross)}</span>
 </div>
 </div>
 </div>
 </div>
 );
 })()}

 {/* Terms and Notes */}
 <div className="space-y-6">
 <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Internal Notes
 </label>
 <textarea
 rows={3}
 value={formData.notes}
 onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
 placeholder="Internal notes (not visible to client)"
 />
 </div>
 <p className="text-sm text-gray-500">
 <strong>Note:</strong> Terms & Conditions are managed in Settings and will be applied automatically.
 </p>
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
 className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
