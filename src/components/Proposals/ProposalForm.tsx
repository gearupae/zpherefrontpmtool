import React, { useState, useEffect, useCallback } from 'react';
import {
  DocumentTextIcon,
  UserIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  TagIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { useAppDispatch } from '../../hooks/redux';
import { addNotification } from '../../store/slices/notificationSlice';
import { Customer, Item } from '../../types';
import ItemSelector from '../Items/ItemSelector';

interface SelectedItem {
  item: Item;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_rate: number;
  description: string;
}

interface ProposalFormData {
  title: string;
  description: string;
  customer_id: string;
  proposal_type: string;
  status?: string;
  valid_until: string;
  total_amount?: number;
  currency: string;
  content: {
    sections: Array<{
      title: string;
      content: string;
    }>;
    items: Array<{
      item_id: string;
      name: string;
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
      unit: string;
    }>;
  };
  terms_and_conditions: string;
  notes: string;
  tags: string[];
  response_notes?: string;
  rejection_reason?: string;
  follow_up_date?: string;
  send_email?: boolean;
  email_subject?: string;
  email_message?: string;
}

interface ProposalFormProps {
  onSubmit: (data: ProposalFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<ProposalFormData>;
  mode?: 'create' | 'edit';
}

const ProposalForm: React.FC<ProposalFormProps> = ({ 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  initialData, 
  mode = 'create' 
}) => {
  const dispatch = useAppDispatch();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  
  const [formData, setFormData] = useState<ProposalFormData>({
    title: '',
    description: '',
    customer_id: '',
    proposal_type: 'project',
    status: 'draft',
    valid_until: '',
    total_amount: 0,
    currency: 'usd',
    content: {
      sections: [
        { title: 'Project Overview', content: '' },
        { title: 'Scope of Work', content: '' },
        { title: 'Timeline', content: '' },
        { title: 'Investment', content: '' },
        { title: 'Terms & Conditions', content: '' }
      ],
      items: []
    },
    terms_and_conditions: '',
    notes: '',
    tags: [],
    response_notes: '',
    rejection_reason: '',
    follow_up_date: '',
    send_email: false,
    email_subject: '',
    email_message: ''
  });

  const fetchCustomers = useCallback(async () => {
    try {
      const { default: apiClient } = await import('../../api/client');
      // Use trailing slash to avoid 307 redirect dropping headers
      const response = await apiClient.get('/customers/');
      const customersData = response.data?.customers || response.data?.items || response.data || [];
      setCustomers(Array.isArray(customersData) ? customersData : []);
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

  useEffect(() => {
    fetchCustomers();
    
    // Set default valid until date (30 days from now) only for new proposals
    if (mode === 'create') {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        valid_until: futureDate.toISOString().split('T')[0]
      }));
    }
  }, [fetchCustomers, mode]);

  // Ensure selected customer displays in edit mode even if not in initial list
  useEffect(() => {
    const currentId = (formData.customer_id || '').trim();
    if (!currentId) return;
    // If already present in list, set label from it
    const found = customers.find(c => c.id === currentId);
    if (found) {
      setSelectedCustomerLabel(found.display_name || (found as any).full_name || found.company_name || found.email || currentId);
      return;
    }
    // Fetch single customer as fallback
    (async () => {
      try {
        const { default: apiClient } = await import('../../api/client');
        const res = await apiClient.get(`/customers/${currentId}/`);
        const c = res.data || {};
        const label = c.display_name || c.full_name || c.company_name || c.email || currentId;
        setSelectedCustomerLabel(label);
      } catch (e) {
        setSelectedCustomerLabel(currentId);
      }
    })();
  }, [formData.customer_id, customers]);

  // Populate form with initial data when editing
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        // Ensure arrays and objects are properly handled
        tags: initialData.tags || [],
        content: {
          ...prev.content,
          ...initialData.content
        }
      }));
    }
  }, [initialData, mode]);



  const updateSection = (index: number, field: 'title' | 'content', value: string) => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        sections: prev.content.sections.map((section, i) => 
          i === index ? { ...section, [field]: value } : section
        )
      }
    }));
  };

  const addSection = () => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        sections: [...prev.content.sections, { title: '', content: '' }]
      }
    }));
  };

  const removeSection = (index: number) => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        sections: prev.content.sections.filter((_, i) => i !== index)
      }
    }));
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, selectedItem) => {
      const subtotal = selectedItem.quantity * selectedItem.unit_price;
      const taxAmount = subtotal * (selectedItem.tax_rate / 100);
      const discountAmount = subtotal * (selectedItem.discount_rate / 100);
      return total + subtotal + taxAmount - discountAmount;
    }, 0);
  };

  const formatCurrency = (cents: number) => (cents / 100).toFixed(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert selected items to proposal format
    const proposalItems = selectedItems.map((selectedItem) => ({
      item_id: selectedItem.item.id,
      name: selectedItem.item.name,
      description: selectedItem.description,
      quantity: selectedItem.quantity,
      unit_price: selectedItem.unit_price,
      total: selectedItem.quantity * selectedItem.unit_price,
      unit: selectedItem.item.unit
    }));

    const submissionData = {
      ...formData,
      content: {
        ...formData.content,
        items: proposalItems
      }
    };

    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposal Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Website Development Proposal"
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
              {/* Ensure current selection is visible even if not in list yet */}
              {formData.customer_id && !customers.some(c => c.id === formData.customer_id) && (
                <option value={formData.customer_id}>
                  {selectedCustomerLabel || `Selected customer (${formData.customer_id})`}
                </option>
              )}
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.display_name || (customer as any).full_name || customer.company_name || customer.email || customer.id}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposal Type
            </label>
            <select
              value={formData.proposal_type}
              onChange={(e) => setFormData(prev => ({ ...prev, proposal_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="project">Project</option>
              <option value="maintenance">Maintenance</option>
              <option value="support">Support</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valid Until
            </label>
            <input
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
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
              <option value="usd">USD - US Dollar</option>
              <option value="eur">EUR - Euro</option>
              <option value="gbp">GBP - British Pound</option>
              <option value="aud">AUD - Australian Dollar</option>
              <option value="cad">CAD - Canadian Dollar</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Brief description of the proposal"
          />
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <DocumentTextIcon className="h-5 w-5 text-gray-500" />
              <span>Proposal Content</span>
            </h3>
            <button
              type="button"
              onClick={addSection}
              className="text-user-blue hover:text-primary-700 text-sm font-medium"
            >
              + Add Section
            </button>
          </div>
          
          {formData.content.sections.map((section, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSection(index, 'title', e.target.value)}
                  className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0 flex-1"
                  placeholder="Section Title"
                />
                {formData.content.sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              <textarea
                rows={4}
                value={section.content}
                onChange={(e) => updateSection(index, 'content', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Section content..."
              />
            </div>
          ))}
        </div>

        {/* Items Selection */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
            <CurrencyDollarIcon className="h-5 w-5 text-gray-500" />
            <span>Items & Pricing</span>
          </h3>
          
          <ItemSelector
            selectedItems={selectedItems}
            onItemsChange={setSelectedItems}
            className="border border-gray-200 rounded-lg p-4"
          />
          
          {selectedItems.length > 0 && (
            <div className="bg-secondary-50 rounded-lg p-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Investment:</span>
                <span className="text-user-blue">${formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          )}
        </div>

        {/* Additional Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Follow-up Date
            </label>
            <input
              type="date"
              value={formData.follow_up_date}
              onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Amount (Optional)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.total_amount || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, total_amount: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Manual total amount override"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={formData.tags.join(', ')}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., urgent, website, design, development"
          />
        </div>



        {/* Terms and Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Terms & Conditions
            </label>
            <textarea
              rows={4}
              value={formData.terms_and_conditions}
              onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Payment terms, project timeline, cancellation policy, etc."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Internal Notes
            </label>
            <textarea
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Internal notes (not visible to client)"
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !formData.title || !formData.customer_id}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading 
              ? (mode === 'edit' ? 'Updating...' : 'Creating...') 
              : (mode === 'edit' ? 'Update Proposal' : 'Create Proposal')
            }
          </button>
        </div>
      </form>
  );
};

export default ProposalForm;
